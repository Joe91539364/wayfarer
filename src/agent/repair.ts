import type { Candidate, Itinerary, ItineraryItem, Violation } from '../domain/schema';
import { PACES } from '../domain/schema';
import { itineraryTotalCost, recomputeItinerary } from '../domain/summary';
import { toMin, weekdayOf } from '../domain/time';
import { roadKm } from '../domain/geo';
import { HOSTELS } from '../data/pois';
import { reflowDay } from './reflow';
import { verify, type VerifyContext } from '../verifier';

export interface RepairAction {
  kind: 'auto' | 'strategic';
  code: string;
  description: string;
  item_ids: string[];
}

export interface RepairRound {
  round: number;
  errorsBefore: number;
  errorsAfter: number;
  actions: RepairAction[];
}

export interface RepairResult {
  itinerary: Itinerary;
  rounds: RepairRound[];
  unresolved: Violation[];
  stopped: 'clean' | 'max_rounds' | 'no_progress';
}

type FixPass = (itin: Itinerary) => { itin: Itinerary; actions: RepairAction[] };

function cloneItin(itin: Itinerary): Itinerary {
  return JSON.parse(JSON.stringify(itin)) as Itinerary;
}

function reflowFor(itin: Itinerary, dayIndex: number): Itinerary {
  const day = itin.days[dayIndex];
  const lodging = day.lodging ?? { name: '住宿', lat: 30.657, lng: 104.066 };
  const next = cloneItin(itin);
  next.days[dayIndex] = reflowDay(day, {
    startClock: dayIndex === 0 ? '09:30' : '08:30',
    lodging,
  });
  return recomputeItinerary(next);
}

function toCandidate(item: ItineraryItem, reason: string, adults = 1): Candidate {
  return {
    poi_id: item.poi_id ?? item.id,
    name: item.name,
    lat: item.lat ?? 0,
    lng: item.lng ?? 0,
    category: item.category ?? 'sight',
    reason,
    suggested_duration_min: item.duration_min,
    // 候选里一律存「单价」：插回行程时再乘人数，避免来回加一次翻一倍
    cost: { ...item.cost, amount: Math.round(item.cost.amount / Math.max(1, adults)) },
    indoor: !item.weather_sensitive,
    interest_tags: [],
    rating: 0,
    opening_hours: item.opening_hours ?? null,
    booking_required: item.booking_required,
  };
}

export function removeItem(itin: Itinerary, itemId: string, reason: string): { itin: Itinerary; removed: boolean } {
  const next = cloneItin(itin);
  for (let d = 0; d < next.days.length; d++) {
    const idx = next.days[d].items.findIndex((i) => i.id === itemId);
    if (idx < 0) continue;
    const item = next.days[d].items[idx];
    if (item.locked) return { itin, removed: false };
    next.days[d].items.splice(idx, 1);
    if (item.poi_id) {
      const rest = next.unscheduled.filter((c) => c.poi_id !== item.poi_id);
      next.unscheduled = [toCandidate(item, reason, next.meta.travelers.adults), ...rest];
    }
    return { itin: reflowFor(next, d), removed: true };
  }
  return { itin, removed: false };
}

export function insertCandidate(
  itin: Itinerary,
  dayIndex: number,
  candidate: Candidate,
  position: number,
): Itinerary {
  const next = cloneItin(itin);
  const day = next.days[dayIndex];
  if (!day) return itin;
  const item: ItineraryItem = {
    id: `d${day.day_index}-i${day.items.length + 1}-x`,
    type: 'activity',
    poi_id: candidate.poi_id,
    name: candidate.name,
    lat: candidate.lat,
    lng: candidate.lng,
    category: candidate.category,
    start_time: '09:00',
    end_time: '10:00',
    duration_min: candidate.suggested_duration_min,
    cost: { ...candidate.cost, amount: Math.round(candidate.cost.amount * Math.max(1, itin.meta.travelers.adults)) },
    opening_hours: candidate.opening_hours,
    booking_required: candidate.booking_required,
    booked: false,
    locked: false,
    mode: null,
    from_item_id: null,
    to_item_id: null,
    distance_m: null,
    notes: candidate.reason,
    weather_sensitive: !candidate.indoor,
  };
  const activities = day.items.filter((i) => i.type !== 'transit');
  const anchor = activities[Math.min(position, activities.length)];
  const insertAt = anchor ? day.items.findIndex((i) => i.id === anchor.id) : day.items.length;
  day.items.splice(insertAt < 0 ? day.items.length : insertAt, 0, item);
  next.unscheduled = next.unscheduled.filter((c) => c.poi_id !== candidate.poi_id);
  return reflowFor(next, dayIndex);
}

const fixOverlap: FixPass = (itin) => {
  const actions: RepairAction[] = [];
  let cur = itin;
  const overlaps = (day: (typeof itin.days)[number]) => {
    for (let i = 1; i < day.items.length; i++) {
      if (toMin(day.items[i].start_time) < toMin(day.items[i - 1].end_time)) return true;
    }
    return false;
  };
  for (let d = 0; d < itin.days.length; d++) {
    const day = cur.days[d];
    if (!day || !overlaps(day)) continue;
    cur = reflowFor(cur, d);
    actions.push({
      kind: 'auto',
      code: 'TIME_OVERLAP',
      description: `第 ${day.day_index} 天按顺序重排时间，消除时间重叠`,
      item_ids: [],
    });
  }
  return { itin: cur, actions };
};

const fixClosedDays: FixPass = (itin) => {
  const actions: RepairAction[] = [];
  let cur = itin;
  for (const day of itin.days) {
    const dow = weekdayOf(day.date);
    for (const item of day.items) {
      if (!item.opening_hours || item.locked) continue;
      if (!item.opening_hours.closed_days.includes(dow)) continue;
      const res = removeItem(cur, item.id, '当天闭馆，已移入候选池');
      if (res.removed) {
        cur = res.itin;
        actions.push({
          kind: 'auto',
          code: 'OUTSIDE_OPENING',
          description: `${item.name} 在 ${day.date} 闭馆，移入候选池`,
          item_ids: [item.id],
        });
      }
    }
  }
  return { itin: cur, actions };
};

const fixTooLong: FixPass = (itin) => {
  const actions: RepairAction[] = [];
  let cur = itin;
  for (const day of itin.days) {
    for (const item of day.items) {
      if (item.type !== 'activity' && item.type !== 'meal') continue;
      if (!item.opening_hours || item.locked) continue;
      const open = toMin(item.opening_hours.open);
      const closeRaw = toMin(item.opening_hours.close);
      const close = closeRaw < open ? closeRaw + 1440 : closeRaw;
      if (close - open < item.duration_min) {
        const res = removeItem(cur, item.id, '开放时长不足以容纳计划停留');
        if (res.removed) {
          cur = res.itin;
          actions.push({
            kind: 'strategic',
            code: 'OUTSIDE_OPENING',
            description: `${item.name} 营业时段装不下 ${item.duration_min} 分钟，移入候选池`,
            item_ids: [item.id],
          });
        }
      }
    }
  }
  return { itin: cur, actions };
};

const fixOpeningClamp: FixPass = (itin) => {
  const actions: RepairAction[] = [];
  let cur = recomputeItinerary(itin);
  for (let round = 0; round < 2; round++) {
    for (let d = 0; d < cur.days.length; d++) {
      const day = cur.days[d];
      const needsFix = day.items.some((item) => {
        if (!item.opening_hours || item.opening_hours.confidence === 'unknown') return false;
        const open = toMin(item.opening_hours.open);
        const closeRaw = toMin(item.opening_hours.close);
        const close = closeRaw < open ? closeRaw + 1440 : closeRaw;
        const start = toMin(item.start_time);
        return start < open || start + item.duration_min > close;
      });
      if (!needsFix) continue;
      cur = reflowFor(cur, d);
      actions.push({
        kind: 'auto',
        code: 'OUTSIDE_OPENING',
        description: `第 ${day.day_index} 天按营业时间重排时间轴`,
        item_ids: [],
      });
    }
  }
  return { itin: cur, actions };
};

const fixGeo = (threshold: number): FixPass => (itin) => {
  const actions: RepairAction[] = [];
  let cur = itin;
  for (const baseDay of itin.days) {
    let guard = 0;
    while (guard++ < 4) {
      const day = cur.days.find((d) => d.day_index === baseDay.day_index);
      if (!day || day.summary.max_leg_km <= threshold) break;
      const pts = day.items.filter((i) => i.lat != null && i.lng != null) as (ItineraryItem & {
        lat: number;
        lng: number;
      })[];
      if (pts.length < 2) break;
      const center = {
        lat: pts.reduce((s, p) => s + p.lat, 0) / pts.length,
        lng: pts.reduce((s, p) => s + p.lng, 0) / pts.length,
      };
      // 一顿饭「远」是有意的：郊区没店时晚饭本来就落在回城/酒店方向，
      // 把它当「离片区太远」删掉，用户这天就没晚饭了
      const far = [...pts]
        .filter((p) => !p.locked && p.type !== 'meal')
        .sort((a, b) => roadKm(center, b) - roadKm(center, a))[0];
      if (!far) break;
      const res = removeItem(cur, far.id, `离当天片区太远（>${threshold}km）`);
      if (!res.removed) break;
      cur = res.itin;
      actions.push({
        kind: 'auto',
        code: 'GEO_SCATTER',
        description: `${far.name} 距当天中心过远，移入候选池`,
        item_ids: [far.id],
      });
    }
  }
  return { itin: cur, actions };
};

const fixPace: FixPass = (itin) => {
  const actions: RepairAction[] = [];
  let cur = itin;
  const pace = PACES[itin.meta.pace];
  let guard = 0;
  while (guard++ < 12) {
    const day = cur.days.find(
      (d) => d.summary.active_min > pace.max_active_min_per_day || d.summary.poi_count > pace.max_poi_per_day,
    );
    if (!day) break;
    // 只删景点，不动饭：晚饭是刚需，为压一条「节奏偏满」的提醒把晚饭删了，
    // 用户就饿着肚子看行程 —— 宁可留着这条提醒
    const candidate = [...day.items]
      .reverse()
      .find((i) => i.type === 'activity' && !i.locked && i.poi_id);
    if (!candidate) break;
    const res = removeItem(cur, candidate.id, '超出当天节奏上限');
    if (!res.removed) break;
    cur = res.itin;
    actions.push({
      kind: 'auto',
      code: 'OVER_PACE',
      description: `第 ${day.day_index} 天超出「${pace.label}」上限，${candidate.name} 移入候选池`,
      item_ids: [candidate.id],
    });
  }
  return { itin: cur, actions };
};

const fixBudget: FixPass = (itin) => {
  const actions: RepairAction[] = [];
  let cur = itin;
  let guard = 0;
  while (guard++ < 24) {
    if (itineraryTotalCost(cur) <= cur.meta.budget.amount) break;
    const removable = cur.days
      .flatMap((d) => d.items)
      .filter((i) => i.poi_id && !i.locked && i.type !== 'transit' && i.cost.amount > 0)
      .sort((a, b) => b.cost.amount - a.cost.amount);
    if (removable.length === 0) break;
    const target = removable[0];
    const res = removeItem(cur, target.id, '预算超支，被移除');
    if (!res.removed) break;
    cur = res.itin;
    actions.push({
      kind: 'strategic',
      code: 'BUDGET_EXCEEDED',
      description: `为压预算移除 ${target.name}（¥${target.cost.amount}）`,
      item_ids: [target.id],
    });
  }

  if (itineraryTotalCost(cur) > cur.meta.budget.amount) {
    const hostel = HOSTELS[cur.meta.city_code];
    if (hostel && !cur.days.every((d) => d.lodging?.name === hostel.name)) {
      cur = cloneItin(cur);
      cur.days = cur.days.map((d) =>
        d.lodging
          ? { ...d, lodging: { ...d.lodging, name: hostel.name, cost: { ...d.lodging.cost, amount: hostel.price } } }
          : d,
      );
      actions.push({
        kind: 'strategic',
        code: 'BUDGET_EXCEEDED',
        description: `住宿降档为 ${hostel.name}（¥${hostel.price}/晚）`,
        item_ids: [],
      });
    }
  }
  return { itin: recomputeItinerary(cur), actions };
};

const fixWeather = (ctx: VerifyContext): FixPass => (itin) => {
  const actions: RepairAction[] = [];
  let cur = itin;
  if (ctx.weather.length === 0) return { itin: cur, actions };
  const byDate = new Map(ctx.weather.map((w) => [w.date, w]));
  for (const day of itin.days) {
    const w = byDate.get(day.date);
    if (!w) continue;
    const bad = w.precip_prob > 60 || w.temp_max > 35 || w.temp_min < 0;
    if (!bad) continue;
    for (const item of day.items) {
      if (item.type !== 'activity' || !item.weather_sensitive || item.locked) continue;
      const indoor = cur.unscheduled
        .filter((c) => c.indoor && c.category !== 'restaurant')
        .map((c) => ({ c, d: roadKm({ lat: item.lat ?? 0, lng: item.lng ?? 0 }, c) }))
        .sort((a, b) => a.d - b.d)[0];
      const position = day.items.filter((i) => i.type !== 'transit').findIndex((i) => i.id === item.id);
      if (indoor) {
        const res = removeItem(cur, item.id, '天气不佳，换成室内备选');
        if (!res.removed) continue;
        cur = insertCandidate(res.itin, day.day_index - 1, indoor.c, Math.max(0, position));
        actions.push({
          kind: 'strategic',
          code: 'WEATHER_CONFLICT',
          description: `${item.name} 为户外项目，换成室内的 ${indoor.c.name}`,
          item_ids: [item.id],
        });
      } else {
        const res = removeItem(cur, item.id, '天气不佳且无室内备选');
        if (res.removed) {
          cur = res.itin;
          actions.push({
            kind: 'strategic',
            code: 'WEATHER_CONFLICT',
            description: `${item.name} 为户外项目且无室内备选，移入候选池`,
            item_ids: [item.id],
          });
        }
      }
    }
  }
  return { itin: cur, actions };
};

function minimalPlan(itin: Itinerary): Itinerary {
  let cur = itin;
  for (const day of itin.days) {
    const keep = day.items.filter((i) => i.type !== 'transit').slice(0, 2);
    for (const item of day.items) {
      if (item.type === 'transit' || item.locked) continue;
      if (keep.some((k) => k.id === item.id)) continue;
      const res = removeItem(cur, item.id, '降级为最小可行行程');
      if (res.removed) cur = res.itin;
    }
  }
  return cur;
}

export function repair(itin: Itinerary, ctx: VerifyContext, maxRounds = 3): RepairResult {
  const rounds: RepairRound[] = [];
  let cur = recomputeItinerary(itin);
  let stopped: RepairResult['stopped'] = 'max_rounds';

  for (let round = 1; round <= maxRounds; round++) {
    const before = verify(cur, ctx);
    if (before.errors.length === 0) {
      stopped = 'clean';
      break;
    }
    const errorsBefore = before.errors.length;
    const actions: RepairAction[] = [];

    let working = cur;
    const passes: FixPass[] = [
      fixOverlap,
      fixClosedDays,
      fixTooLong,
      fixOpeningClamp,
      fixGeo(ctx.thresholds?.geoScatterKm ?? 25),
      fixPace,
      fixBudget,
      fixWeather(ctx),
    ];
    for (const pass of passes) {
      const res = pass(working);
      working = res.itin;
      actions.push(...res.actions);
    }

    const after = verify(working, ctx);
    rounds.push({ round, errorsBefore, errorsAfter: after.errors.length, actions });

    if (after.errors.length < errorsBefore) {
      cur = working;
      if (after.errors.length === 0) {
        stopped = 'clean';
        break;
      }
    } else {
      stopped = 'no_progress';
      break;
    }
  }

  let final = verify(cur, ctx);
  if (final.errors.length > 0) {
    const minimal = minimalPlan(cur);
    const minimalRes = verify(minimal, ctx);
    if (minimalRes.errors.length < final.errors.length) {
      cur = minimal;
      final = minimalRes;
      rounds.push({
        round: rounds.length + 1,
        errorsBefore: verify(cur, ctx).errors.length,
        errorsAfter: minimalRes.errors.length,
        actions: [
          {
            kind: 'strategic',
            code: 'DEGRADE',
            description: '多轮未能收敛，降级为最小可行行程（每天 2 个点）',
            item_ids: [],
          },
        ],
      });
    }
  }

  // 润色轮：error 清零后，再顺手清掉「能自动修且值得修」的 warning。
  // 这一步不是必须的，但一天跑 50km 这种事不该留着当提醒。
  if (final.errors.length === 0 && final.warnings.some((w) => w.auto_fixable)) {
    let polished = cur;
    for (const pass of [fixGeo(ctx.thresholds?.geoScatterKm ?? 25), fixPace]) {
      polished = pass(polished).itin;
    }
    const polishedRes = verify(polished, ctx);
    if (polishedRes.errors.length === 0 && polishedRes.warnings.length < final.warnings.length) {
      rounds.push({
        round: rounds.length + 1,
        errorsBefore: 0,
        errorsAfter: 0,
        actions: [
          {
            kind: 'auto',
            code: 'POLISH',
            description: `清理 ${final.warnings.length - polishedRes.warnings.length} 条可自动修复的提醒（地理跨度过大 / 节奏超限）`,
            item_ids: [],
          },
        ],
      });
      cur = polished;
      final = polishedRes;
    }
  }

  const next = cloneItin(cur);
  next.warnings = [...final.errors, ...final.warnings, ...final.infos];
  return { itinerary: recomputeItinerary(next), rounds, unresolved: final.errors, stopped };
}
