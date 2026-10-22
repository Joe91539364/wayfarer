import type { Candidate, Day, ItineraryItem, Meta } from '../domain/schema';
import { PACES } from '../domain/schema';
import {
  estimateTransitMinutes,
  nearestNeighborOrder,
  pickMode,
  roadKm,
  haversine,
  type LatLng,
} from '../domain/geo';
import { addMin, fromMin, toMin, weekdayLabel } from '../domain/time';
import { recomputeDaySummary } from '../domain/summary';
import { poisByCity, type PoiSeed } from '../data/pois';
import { pickLodging, type ResearchResult } from './research';
import type { DayPlan } from './outline';

const PACE_DURATION_FACTOR = { relaxed: 1.15, moderate: 1, packed: 0.9 } as const;

export interface ScheduleResult {
  days: Day[];
  unscheduled: Candidate[];
  skipped: { poi_id: string; name: string; reason: string }[];
}

function transitCost(mode: string, km: number): number {
  switch (mode) {
    case 'walk':
      return 0;
    case 'taxi':
      return Math.round(10 + km * 2.6);
    case 'subway':
    case 'bus':
      return 4;
    case 'train':
      return Math.round(20 + km * 0.45);
    default:
      return 0;
  }
}

function money(amount: number, type: 'ticket' | 'meal' | 'lodging' | 'transit' | 'other') {
  return { amount: Math.round(amount), currency: 'CNY', type } as const;
}

function toItemBase(seed: PoiSeed, adults: number) {
  return {
    poi_id: seed.poi_id,
    name: seed.name,
    lat: seed.lat,
    lng: seed.lng,
    category: seed.category,
    opening_hours: {
      open: seed.open,
      close: seed.close,
      closed_days: seed.closed_days,
      confidence: seed.hours_confidence,
    },
    booking_required: seed.booking_required,
    booked: false,
    locked: false,
    mode: null,
    from_item_id: null,
    to_item_id: null,
    distance_m: null,
    notes: seed.blurb,
    weather_sensitive: !seed.indoor,
    cost: money(seed.price * adults, seed.category === 'restaurant' || seed.category === 'cafe' ? 'meal' : 'ticket'),
  };
}

export function scheduleDays(meta: Meta, plans: DayPlan[], research: ResearchResult, lodgingOverride?: { name: string; lat: number; lng: number; price: number }): ScheduleResult {
  const lodging = lodgingOverride ?? pickLodging(meta.city_code);
  const all = poisByCity(meta.city_code);
  const byId = new Map(all.map((p) => [p.poi_id, p]));
  const dining = all.filter((p) => p.category === 'restaurant' || p.category === 'cafe');
  // 正餐只认真正的餐厅：咖啡店再近再高分也不能当午饭晚饭 —— 用户说过「想吃好吃的」
  const restaurants = dining.filter((p) => p.category !== 'cafe');
  const cafes = dining.filter((p) => p.category === 'cafe');
  const cap = PACES[meta.pace].max_active_min_per_day;
  const factor = PACE_DURATION_FACTOR[meta.pace];
  const adults = meta.travelers.adults;
  const rooms = Math.max(1, Math.ceil(adults / 2));
  // 预算宽裕（人均每天 ≥ ¥300）：3km 以上的公共交通升级打车，把预算花在舒适上。
  // 这笔钱本来就是「余出来没处花」的，与其躺着不如少挤两趟地铁。
  const comfort = meta.budget.amount / Math.max(1, plans.length * adults) >= 250;
  const pickModeFor = (km: number) => {
    const mode = pickMode(km);
    // 预算宽裕时 1.2km 以上的市内移动都打车（城际火车除外）—— 少走路，多玩
    return comfort && km >= 1.2 && mode !== 'train' ? 'taxi' : mode;
  };
  const unscheduled: Candidate[] = [];
  const skipped: { poi_id: string; name: string; reason: string }[] = [];
  const days: Day[] = [];
  // 跨天去重：三天午饭都吃同一家火锅，再好吃也腻
  const usedRestaurants = new Set<string>();

  plans.forEach((plan, planIdx) => {
    const items: ItineraryItem[] = [];
    let seq = 1;
    let tseq = 1;
    let cursor = toMin(planIdx === 0 ? '09:30' : '08:30');
    let prev: LatLng & { name: string } = { lat: lodging.lat, lng: lodging.lng, name: lodging.name };
    let activityMin = 0;
    let poiCount = 0;
    let lunchDone = false;
    let dinnerDone = false;

    const seeds = plan.poi_ids
      .map((id) => byId.get(id))
      .filter((x): x is PoiSeed => !!x)
      .sort((a, b) => {
        const aNight = toMin(a.open) >= toMin('17:00') ? 1 : 0;
        const bNight = toMin(b.open) >= toMin('17:00') ? 1 : 0;
        return aNight - bNight;
      });

    const dayGroup = seeds.filter((s) => toMin(s.open) < toMin('17:00'));
    const nightGroup = seeds.filter((s) => toMin(s.open) >= toMin('17:00'));
    const ordered = [...nearestNeighborOrder(dayGroup, prev), ...nearestNeighborOrder(nightGroup, prev)];

    const pushTransit = (from: LatLng & { name: string }, to: LatLng & { name: string }, departMin: number) => {
      const km = roadKm(from, to);
      const mode = pickModeFor(km);
      const mins = estimateTransitMinutes(km, mode);
      items.push({
        id: `d${plan.day_index}-t${tseq++}`,
        type: 'transit',
        poi_id: null,
        name: `${from.name} → ${to.name}`,
        lat: null,
        lng: null,
        category: null,
        start_time: fromMin(departMin),
        end_time: fromMin(departMin + mins),
        duration_min: mins,
        cost: money(transitCost(mode, km) * (mode === 'taxi' ? rooms : adults), 'transit'),
        opening_hours: null,
        booking_required: false,
        booked: false,
        locked: false,
        mode,
        from_item_id: null,
        to_item_id: null,
        distance_m: Math.round(km * 1000),
        notes: null,
        weather_sensitive: mode === 'walk',
      });
      return mins;
    };

    // 这趟饭的钱怎么花：餐饮按总预算的 32% 摊到每一顿（晚餐 ×1.25），
    // 选「人均最接近目标」且评分高的店 —— 说了想吃好的，就别排最近的一家沙县。
    const mealTarget = Math.max(30, Math.round((meta.budget.amount * 0.40) / Math.max(1, plans.length * 3 * adults)));
    const pickRestaurant = (at: LatLng, clock: number, meal: 'lunch' | 'dinner', maxKm = 5): PoiSeed | null => {
      const dur = meal === 'lunch' ? 60 : 75;
      const windowStart = meal === 'lunch' ? toMin('11:00') : toMin('17:00');
      const windowEnd = meal === 'lunch' ? toMin('14:30') : toMin('21:30');
      // 晚饭有个硬底线：玩到 22:30 也得吃饭，只是不再挑挑拣拣
      if (clock < windowStart || clock > toMin('22:30')) return null;
      const late = clock > windowEnd;
      const target = mealTarget * (meal === 'dinner' ? 1.25 : 1);
      const candidates = restaurants
        .filter((r) => !usedRestaurants.has(r.poi_id))
        .filter((r) => haversine(at, { lat: r.lat, lng: r.lng }) <= maxKm)
        .filter((r) => {
          const o = toMin(r.open);
          const c = toMin(r.close);
          const closeMin = c < o ? c + 1440 : c;
          // 必须按真实用餐时长校验，否则「差 45 分钟打烊」的店会被排进去然后判 error
          return clock >= o && clock + dur <= closeMin;
        })
        .map((r) => {
          const d = haversine(at, { lat: r.lat, lng: r.lng });
          // 人均越接近「这顿该花的钱」越好；¥0 的脏数据（酒店餐厅挂成餐厅）天然垫底
          const priceFit = r.price <= 0 ? 0 : 1 - Math.min(1, Math.abs(r.price - target) / target);
          const hotelish = /酒店|宾馆/.test(r.name) ? -2.5 : 0;
          const score = r.rating * 1.6 + priceFit * 3.4 - Math.min(d, 6) * 0.35 + hotelish - (late ? 1 : 0);
          return { r, d, score };
        })
        .sort((a, b) => b.score - a.score);
      return candidates[0]?.r ?? null;
    };

    const insertCafe = (): boolean => {
      const dur = 45;
      if (cursor < toMin('13:30') || cursor > toMin('16:45')) return false;
      const nearby = cafes.filter((r) => !usedRestaurants.has(r.poi_id) && haversine(prev, { lat: r.lat, lng: r.lng }) <= 3.5);
      const candidates = nearby
        .filter((r) => {
          const o = toMin(r.open);
          const c = toMin(r.close);
          const closeMin = c < o ? c + 1440 : c;
          return cursor >= o && cursor + dur <= closeMin;
        })
        .map((r) => {
          const d = haversine(prev, { lat: r.lat, lng: r.lng });
          const priceFit = r.price <= 0 ? 0 : 1 - Math.min(1, Math.abs(r.price - mealTarget * 0.6) / (mealTarget * 0.6));
          return { r, score: r.rating * 1.8 + priceFit * 2.6 - Math.min(d, 5) * 0.4 };
        })
        .sort((a, b) => b.score - a.score);
      const r = candidates[0]?.r;
      if (!r) return false;
      const km = roadKm(prev, r);
      const travel = estimateTransitMinutes(km, pickModeFor(km));
      // 喝完得留出晚饭窗口（17:30 起），否则这杯咖啡侵吞晚餐
      if (cursor + travel + dur > toMin('17:15')) return false;
      pushTransit(prev, { lat: r.lat, lng: r.lng, name: r.name }, cursor);
      const start = cursor + travel;
      items.push({
        id: `d${plan.day_index}-i${seq++}`,
        type: 'meal',
        ...toItemBase(r, adults),
        start_time: fromMin(start),
        end_time: fromMin(start + dur),
        duration_min: dur,
        cost: money((r.price > 0 ? r.price : Math.round(mealTarget * 0.7)) * adults, 'meal'),
      } as ItineraryItem);
      usedRestaurants.add(r.poi_id);
      cursor = start + dur;
      activityMin += travel + dur;
      prev = { lat: r.lat, lng: r.lng, name: r.name };
      return true;
    };

    /**
     * 插一顿饭。anchor 用来处理「郊区数据荒漠」：大学城/展馆周边一家餐厅都没有时，
     * 晚饭就落在酒店附近 —— 反正总得回去，回酒店楼下吃比空着这天好。
     */
    const insertMeal = (meal: 'lunch' | 'dinner', maxKm = 5, anchor?: LatLng) => {
      const from = anchor ?? prev;
      const want = meal === 'lunch' ? Math.max(cursor, toMin('11:30')) : Math.max(cursor, toMin('17:30'));
      const r = pickRestaurant(from, want, meal, maxKm);
      if (!r) return false;
      const travel = estimateTransitMinutes(roadKm(prev, r), pickModeFor(roadKm(prev, r)));
      const start = want + travel;
      const dur = meal === 'lunch' ? 60 : 75;
      // 加上通勤后可能已经打烊，宁可不排这家
      const o = toMin(r.open);
      const c = toMin(r.close);
      const closeMin = c < o ? c + 1440 : c;
      if (start + dur > closeMin) return false;
      pushTransit(prev, { lat: r.lat, lng: r.lng, name: r.name }, want);
      items.push({
        id: `d${plan.day_index}-i${seq++}`,
        type: 'meal',
        ...toItemBase(r, adults),
        start_time: fromMin(start),
        end_time: fromMin(start + dur),
        duration_min: dur,
        cost: money((r.price > 0 ? r.price : Math.round(mealTarget * 0.7)) * adults, 'meal'),
      } as ItineraryItem);
      usedRestaurants.add(r.poi_id);
      cursor = start + dur;
      activityMin += travel + dur;
      prev = { lat: r.lat, lng: r.lng, name: r.name };
      return true;
    };

    for (const seed of ordered) {
      const dur = Math.round(seed.duration_min * factor);
      const openMin = toMin(seed.open);
      const closeMin = toMin(seed.close) < openMin ? toMin(seed.close) + 1440 : toMin(seed.close);

      if (!lunchDone && cursor >= toMin('11:20') && cursor <= toMin('14:00')) {
        if (insertMeal('lunch')) lunchDone = true;
      }
      // 晚上那场之前必须把晚饭解决：夜景观完 22 点再找饭，好店全打烊了
      if (!dinnerDone && cursor >= toMin('16:30') && toMin(seed.open) >= toMin('17:00')) {
        if (insertMeal('dinner')) dinnerDone = true;
      }

      // 通勤必须在插入午餐之后计算：午餐会改变出发点
      const km = roadKm(prev, seed);
      const mode = pickMode(km);
      const travel = estimateTransitMinutes(km, mode);

      let depart = cursor;
      let arrive = depart + travel;
      if (arrive < openMin) {
        const wait = openMin - arrive;
        depart += wait;
        arrive = openMin;
      }

      if (activityMin + travel + dur > cap) {
        skipped.push({ poi_id: seed.poi_id, name: seed.name, reason: '超出当天体力上限' });
        continue;
      }
      if (poiCount >= PACES[meta.pace].max_poi_per_day) {
        skipped.push({ poi_id: seed.poi_id, name: seed.name, reason: `超过「${PACES[meta.pace].label}」每天 ${PACES[meta.pace].max_poi_per_day} 个点的上限` });
        continue;
      }
      if (arrive + dur > closeMin) {
        skipped.push({ poi_id: seed.poi_id, name: seed.name, reason: `打烊前放不下（${seed.open}–${seed.close}）` });
        continue;
      }

      pushTransit(prev, seed, depart);
      items.push({
        id: `d${plan.day_index}-i${seq++}`,
        type: 'activity',
        ...toItemBase(seed, adults),
        start_time: fromMin(arrive),
        end_time: fromMin(arrive + dur),
        duration_min: dur,
      } as ItineraryItem);
      cursor = arrive + dur;
      activityMin += travel + dur;
      poiCount += 1;
      prev = { lat: seed.lat, lng: seed.lng, name: seed.name };
    }

    if (!lunchDone) {
      // 数据荒漠里 5km 一家店都没有：逐级放宽半径，14km 内总有一家能吃的
      for (const km of [5, 9, 14]) {
        if (insertMeal('lunch', km)) {
          lunchDone = true;
          break;
        }
      }
    }
    // 说了想吃好的且预算宽裕：收工早就插一间高分咖啡馆当下午茶，把下午的空档填上
    if (meta.interests.includes('food') && comfort) {
      insertCafe();
    }
    // 晚饭是刚需，不是「玩到 16:30 才顺路吃」的optional项：
    // 一天玩得再早收工，17:30 也得开饭（insertMeal 内部会把 want 抬到 17:30）；
    // 玩到郊区（展馆/山里）附近没店时，半径放宽到 14km —— 回城路上那顿也算数
    if (!dinnerDone) {
      for (const km of [5, 9, 14]) {
        if (insertMeal('dinner', km)) {
          dinnerDone = true;
          break;
        }
      }
    }
    // 最后一招：人还在荒漠里但今晚要回酒店，那就回酒店附近吃，别让这天没晚饭
    if (!dinnerDone) {
      insertMeal('dinner', 6, { lat: lodging.lat, lng: lodging.lng });
    }

    const day: Day = {
      date: plan.date,
      day_index: plan.day_index,
      base_area: { name: plan.base_area, lat: plan.centroid.lat, lng: plan.centroid.lng },
      lodging: {
        name: lodging.name,
        lat: lodging.lat,
        lng: lodging.lng,
        cost: money(lodging.price * rooms, 'lodging'),
      },
      items,
      summary: {
        activity_min: 0,
        transit_min: 0,
        active_min: 0,
        cost: { amount: 0, currency: 'CNY', by_type: {} },
        poi_count: 0,
        max_leg_km: 0,
      },
    };
    days.push(recomputeDaySummary(day));
  });

  for (const s of skipped) {
    const seed = byId.get(s.poi_id);
    if (!seed) continue;
    unscheduled.push({
      poi_id: seed.poi_id,
      name: seed.name,
      lat: seed.lat,
      lng: seed.lng,
      category: seed.category,
      reason: s.reason,
      suggested_duration_min: seed.duration_min,
      cost: money(seed.price, 'ticket'),
      indoor: seed.indoor,
      interest_tags: seed.tags,
      rating: seed.rating,
      opening_hours: {
        open: seed.open,
        close: seed.close,
        closed_days: seed.closed_days,
        confidence: seed.hours_confidence,
      },
      booking_required: seed.booking_required,
    });
  }

  for (const left of research.pool.slice(0, 40)) {
    if (unscheduled.some((u) => u.poi_id === left.seed.poi_id)) continue;
    if (days.some((d) => d.items.some((i) => i.poi_id === left.seed.poi_id))) continue;
    const seed = left.seed;
    unscheduled.push({
      poi_id: seed.poi_id,
      name: seed.name,
      lat: seed.lat,
      lng: seed.lng,
      category: seed.category,
      reason:
        seed.category === 'restaurant' || seed.category === 'cafe'
          ? '备选餐厅'
          : left.reasons[0] ?? '备选景点',
      suggested_duration_min: seed.duration_min,
      cost: money(seed.price, seed.category === 'restaurant' ? 'meal' : 'ticket'),
      indoor: seed.indoor,
      interest_tags: seed.tags,
      rating: seed.rating,
      opening_hours: {
        open: seed.open,
        close: seed.close,
        closed_days: seed.closed_days,
        confidence: seed.hours_confidence,
      },
      booking_required: seed.booking_required,
    });
  }

  return { days, unscheduled: dedupe(unscheduled), skipped };
}

function dedupe(list: Candidate[]): Candidate[] {
  const seen = new Set<string>();
  return list.filter((c) => {
    if (seen.has(c.poi_id)) return false;
    seen.add(c.poi_id);
    return true;
  });
}

export function dayLabel(day: Day): string {
  return `第 ${day.day_index} 天 · ${weekdayLabel(day.date)}`;
}
