import type { Itinerary, ItineraryItem, Violation } from '../domain/schema';
import { OUTDOOR_CATEGORIES, PACES } from '../domain/schema';
import { durationMin, fromMin, toMin, weekdayOf, weekdayLabel } from '../domain/time';
import { itineraryTotalCost, totalTransitMin } from '../domain/summary';
import { maxPairwiseKm } from '../domain/geo';

export interface WeatherDay {
  date: string;
  precip_prob: number;
  temp_max: number;
  temp_min: number;
  text: string;
  source: 'api' | 'simulated';
}

export interface VerifyContext {
  weather: WeatherDay[];
  weatherSource: 'none' | 'simulated' | 'api';
  thresholds?: {
    geoScatterKm: number;
    transitBurstMin: number;
    maxLegMin: number;
    maxLegKm: number;
  };
}

export const DEFAULT_THRESHOLDS = {
  geoScatterKm: 25,
  transitBurstMin: 90,
  maxLegMin: 120,
  maxLegKm: 60,
};

export interface RuleOutcome {
  violations: Violation[];
  checked: number;
  covered: number;
  detail?: string;
}

export interface RuleDef {
  code: string;
  title: string;
  description: string;
  severity: 'error' | 'warning' | 'info';
  run(itin: Itinerary, ctx: VerifyContext): RuleOutcome;
}

function v(
  code: string,
  severity: 'error' | 'warning' | 'info',
  item_ids: string[],
  message: string,
  suggestion: string,
  auto_fixable: boolean,
  day_index?: number,
): Violation {
  return { code, severity, day_index, item_ids, message, suggestion, auto_fixable };
}

const TIME_OVERLAP: RuleDef = {
  code: 'TIME_OVERLAP',
  title: '时间连续性',
  description: '后一项的开始时间必须晚于前一项的结束时间，含通勤条目',
  severity: 'error',
  run(itin) {
    const violations: Violation[] = [];
    let checked = 0;
    let covered = 0;
    for (const day of itin.days) {
      for (let i = 1; i < day.items.length; i++) {
        const prev = day.items[i - 1];
        const cur = day.items[i];
        checked += 1;
        covered += 1;
        const prevEnd = toMin(prev.end_time);
        const curStart = toMin(cur.start_time);
        if (curStart < prevEnd) {
          violations.push(
            v(
              'TIME_OVERLAP',
              'error',
              [prev.id, cur.id],
              `第 ${day.day_index} 天：${cur.name} 于 ${cur.start_time} 开始，早于上一项「${prev.name}」的结束时间 ${prev.end_time}`,
              `将 ${cur.id} 及其后续条目整体顺延至 ${prev.end_time} 之后`,
              true,
              day.day_index,
            ),
          );
        }
      }
    }
    return { violations, checked, covered };
  },
};

const OUTSIDE_OPENING: RuleDef = {
  code: 'OUTSIDE_OPENING',
  title: '营业时间',
  description: '活动必须落在开放时段内，且当天不是闭馆日',
  severity: 'error',
  run(itin) {
    const violations: Violation[] = [];
    let checked = 0;
    let covered = 0;
    for (const day of itin.days) {
      const dow = weekdayOf(day.date);
      for (const item of day.items) {
        if (item.type !== 'activity' && item.type !== 'meal') continue;
        if (!item.opening_hours) continue;
        checked += 1;
        if (item.opening_hours.confidence === 'unknown') continue;
        covered += 1;
        const { open, close, closed_days } = item.opening_hours;
        const openMin = toMin(open);
        const closeRaw = toMin(close);
        // 夜市 / 酒吧会跨零点（如 19:00–02:00），必须把 close 归一到「同一天内的分钟数」
        const closeMin = closeRaw < openMin ? closeRaw + 1440 : closeRaw;
        if (closed_days.includes(dow)) {
          violations.push(
            v(
              'OUTSIDE_OPENING',
              'error',
              [item.id],
              `第 ${day.day_index} 天（${weekdayLabel(day.date)}）${item.name} 闭馆`,
              `把 ${item.id} 换到其他天，或换成当天开放的同类景点`,
              false,
              day.day_index,
            ),
          );
          continue;
        }
        const dur = item.duration_min || durationMin(item.start_time, item.end_time);
        const startMin = toMin(item.start_time);
        if (startMin < openMin || startMin + dur > closeMin) {
          violations.push(
            v(
              'OUTSIDE_OPENING',
              'error',
              [item.id],
              `${item.name} 计划 ${item.start_time}–${item.end_time}，营业时间 ${open}–${close}`,
              `把 ${item.id} 调整到 ${open}–${fromMin(closeMin - dur)} 之间`,
              true,
              day.day_index,
            ),
          );
        }
      }
    }
    return { violations, checked, covered };
  },
};

const GEO_SCATTER: RuleDef = {
  code: 'GEO_SCATTER',
  title: '地理聚集度',
  description: '同一天内任意两点直线距离与通勤总量需在阈值内',
  severity: 'warning',
  run(itin, ctx) {
    const th = { ...DEFAULT_THRESHOLDS, ...(ctx.thresholds ?? {}) };
    const violations: Violation[] = [];
    let checked = 0;
    let covered = 0;
    let worst = '';
    for (const day of itin.days) {
      const pts = day.items.filter((i) => i.lat != null && i.lng != null) as (ItineraryItem & {
        lat: number;
        lng: number;
      })[];
      if (pts.length < 2) continue;
      checked += 1;
      covered += 1;
      const span = maxPairwiseKm(pts);
      const transitMin = day.items.filter((i) => i.type === 'transit').reduce((s, i) => s + i.duration_min, 0);
      worst = `单日最大跨度 ${span.toFixed(1)}km，通勤合计 ${Math.round(transitMin)}min`;
      if (span > th.geoScatterKm) {
        const center = {
          lat: pts.reduce((s, p) => s + p.lat, 0) / pts.length,
          lng: pts.reduce((s, p) => s + p.lng, 0) / pts.length,
        };
        const far = pts
          .map((p) => ({ p, d: Math.hypot(p.lat - center.lat, p.lng - center.lng) }))
          .sort((a, b) => b.d - a.d)[0].p;
        // 超过阈值两倍（市内 50km）就不只是「提醒」了：这一天根本走不通。
        const severity = span > th.geoScatterKm * 2 ? ('error' as const) : ('warning' as const);
        violations.push(
          v(
            'GEO_SCATTER',
            severity,
            [far.id],
            `第 ${day.day_index} 天跨度 ${span.toFixed(1)}km，超过市内 ${th.geoScatterKm}km 阈值`,
            `把 ${far.id}（${far.name}）移到别的天，或下沉到候选池`,
            true,
            day.day_index,
          ),
        );
      }
      if (transitMin > th.transitBurstMin) {
        violations.push(
          v(
            'GEO_SCATTER',
            'warning',
            day.items.filter((i) => i.type === 'transit').map((i) => i.id),
            `第 ${day.day_index} 天通勤合计 ${Math.round(transitMin)} 分钟，超过 ${th.transitBurstMin} 分钟上限`,
            '减少当天的跨区移动，把相邻点排在一起',
            true,
            day.day_index,
          ),
        );
      }
    }
    return { violations, checked, covered, detail: worst };
  },
};

const BUDGET_EXCEEDED: RuleDef = {
  code: 'BUDGET_EXCEEDED',
  title: '预算约束',
  description: '全部花费（含住宿）不得超过预算',
  severity: 'error',
  run(itin) {
    const total = itineraryTotalCost(itin);
    const budget = itin.meta.budget.amount;
    const checked = 1;
    if (total > budget) {
      const over = total - budget;
      return {
        violations: [
          v(
            'BUDGET_EXCEEDED',
            'error',
            [],
            `总花费 ¥${Math.round(total)} 超出预算 ¥${budget}，超 ¥${Math.round(over)}`,
            `优先删除单价高、可替代性强的付费项目，或把住宿降档`,
            false,
          ),
        ],
        checked,
        covered: checked,
        detail: `¥${Math.round(total)} / ¥${budget}`,
      };
    }
    return { violations: [], checked, covered: checked, detail: `¥${Math.round(total)} / ¥${budget}` };
  },
};

const OVER_PACE: RuleDef = {
  code: 'OVER_PACE',
  title: '体力节奏',
  description: '每日活动时长与点位数不超过节奏档位上限',
  severity: 'warning',
  run(itin) {
    const pace = PACES[itin.meta.pace];
    const violations: Violation[] = [];
    let checked = 0;
    for (const day of itin.days) {
      checked += 1;
      const { active_min, poi_count } = day.summary;
      if (active_min > pace.max_active_min_per_day) {
        const last = [...day.items].reverse().find((i) => i.type !== 'transit');
        violations.push(
          v(
            'OVER_PACE',
            'warning',
            last ? [last.id] : [],
            `第 ${day.day_index} 天在外 ${(active_min / 60).toFixed(1)} 小时，超过「${pace.label}」上限 ${pace.max_active_min_per_day / 60} 小时`,
            `把最后一站移到候选池，或换到别的天`,
            true,
            day.day_index,
          ),
        );
      }
      if (poi_count > pace.max_poi_per_day) {
        violations.push(
          v(
            'OVER_PACE',
            'warning',
            [],
            `第 ${day.day_index} 天安排了 ${poi_count} 个点，超过「${pace.label}」上限 ${pace.max_poi_per_day} 个`,
            '减少一个点位，留出缓冲时间',
            true,
            day.day_index,
          ),
        );
      }
    }
    return { violations, checked, covered: checked, detail: `${itin.meta.pace} · 上限 ${pace.max_active_min_per_day / 60}h` };
  },
};

const BOOKING_RISK: RuleDef = {
  code: 'BOOKING_RISK',
  title: '预约风险',
  description: '需要预约且尚未预约的条目（提示，不阻断）',
  severity: 'info',
  run(itin) {
    const violations: Violation[] = [];
    let checked = 0;
    let covered = 0;
    for (const day of itin.days) {
      for (const item of day.items) {
        if (!item.booking_required) continue;
        checked += 1;
        covered += 1;
        if (!item.booked) {
          violations.push(
            v(
              'BOOKING_RISK',
              'info',
              [item.id],
              `${item.name} 需要提前预约`,
              '出行前 3–7 天完成预约，尤其是博物馆与热门餐厅',
              false,
              day.day_index,
            ),
          );
        }
      }
    }
    return {
      violations,
      checked,
      covered,
      detail: violations.length === 0 ? '全部已预约' : `${violations.length} 项待预约`,
    };
  },
};

const WEATHER_CONFLICT: RuleDef = {
  code: 'WEATHER_CONFLICT',
  title: '天气冲突',
  description: '恶劣天气下的户外活动会给出替换提示',
  severity: 'warning',
  run(itin, ctx) {
    const violations: Violation[] = [];
    let checked = 0;
    let covered = 0;
    if (ctx.weather.length === 0) {
      return { violations, checked: 0, covered: 0, detail: '无天气数据，未校验' };
    }
    const byDate = new Map(ctx.weather.map((w) => [w.date, w]));
    for (const day of itin.days) {
      const w = byDate.get(day.date);
      if (!w) continue;
      checked += 1;
      covered += 1;
      const bad = w.precip_prob > 60 || w.temp_max > 35 || w.temp_min < 0;
      if (!bad) continue;
      for (const item of day.items) {
        if (item.type !== 'activity') continue;
        const outdoor =
          item.weather_sensitive || OUTDOOR_CATEGORIES.includes((item.category ?? '') as never);
        if (!outdoor) continue;
        violations.push(
          v(
            'WEATHER_CONFLICT',
            'warning',
            [item.id],
            `第 ${day.day_index} 天${w.text}（降水 ${w.precip_prob}%，${w.temp_min}–${w.temp_max}℃），${item.name} 为户外项目`,
            `把 ${item.id} 换成候选池里的室内备选，或整体顺延`,
            true,
            day.day_index,
          ),
        );
      }
    }
    return {
      violations,
      checked,
      covered,
      detail: `${checked} 天有天气数据 · 来源 ${ctx.weatherSource}`,
    };
  },
};

const TRANSIT_UNREACHABLE: RuleDef = {
  code: 'TRANSIT_UNREACHABLE',
  title: '交通可达',
  description: '单段通勤不得超过 120 分钟或 60 公里',
  severity: 'warning',
  run(itin, ctx) {
    const th = { ...DEFAULT_THRESHOLDS, ...(ctx.thresholds ?? {}) };
    const violations: Violation[] = [];
    let checked = 0;
    let covered = 0;
    for (const day of itin.days) {
      for (const item of day.items) {
        if (item.type !== 'transit') continue;
        checked += 1;
        covered += 1;
        const km = (item.distance_m ?? 0) / 1000;
        if (item.duration_min > th.maxLegMin || km > th.maxLegKm) {
          violations.push(
            v(
              'TRANSIT_UNREACHABLE',
              'warning',
              [item.id, item.from_item_id ?? '', item.to_item_id ?? ''].filter(Boolean),
              `第 ${day.day_index} 天有一段通勤 ${item.duration_min} 分钟 / ${km.toFixed(0)}km`,
              '把这段行程拆到不同天，或改用更快的交通方式',
              false,
              day.day_index,
            ),
          );
        }
      }
    }
    return { violations, checked, covered, detail: `${checked} 段通勤已校验` };
  },
};

export const RULES: RuleDef[] = [
  TIME_OVERLAP,
  OUTSIDE_OPENING,
  GEO_SCATTER,
  BUDGET_EXCEEDED,
  OVER_PACE,
  BOOKING_RISK,
  WEATHER_CONFLICT,
  TRANSIT_UNREACHABLE,
];
