import type { Candidate, Day, Itinerary, ItineraryItem } from '../domain/schema';
import { fromMin, toMin } from '../domain/time';
import { roadKm } from '../domain/geo';
import { poisByCity } from '../data/pois';
import { reflowDay } from './reflow';

/**
 * 手动改完一天之后的「定盘」：把用户改出来的冲突按固定顺序收拾掉。
 *
 * 为什么需要它：把「磁器口」从上午拖到晚上 18:30，时间轴本身不重叠，
 * 但它 18:00 就闭园了；把一天塞进 5 个点，最后一项会排到 23:10；把午饭删了，
 * 这一天就没有饭点。这些不是一个「顺延」能解决的，要分开处理。
 *
 * 规则顺序（每一步都会重排当天时间，再做下一步）：
 *   ① 撞闭园 → 挪到次日（没次日就回候选池）
 *   ② 收工晚于 22:30 → 把最后一项挪到次日
 *   ③ 午饭 / 晚饭被挤没了 → 就近补一家（不补咖啡，正餐才叫饭）
 *   ④ 当天跨度太散 → 只提示，不擅自搬（搬错方向比不搬更烦人）
 *
 * 所有自动动作都写成一条人话，回给界面显示，用户可以撤销。
 */
export interface EditFix {
  /** closed=撞闭园 late=收工太晚 meal=补饭 geo=跨区提示 */
  code: 'closed' | 'late' | 'meal' | 'geo' | 'budget';
  /** 给人看的一句话 */
  text: string;
  /** 程序真的动了行程（false 表示只是提示） */
  auto: boolean;
}

export interface EditResolution {
  itin: Itinerary;
  fixes: EditFix[];
}

const LATE_LIMIT = toMin('22:30');
const LUNCH_RANGE: [number, number] = [toMin('10:45'), toMin('14:30')];
const DINNER_RANGE: [number, number] = [toMin('16:30'), toMin('21:30')];

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

function hhmm(min: number): string {
  return fromMin(((min % 1440) + 1440) % 1440);
}

function closeMinute(item: ItineraryItem): number | null {
  const oh = item.opening_hours;
  if (!oh || oh.confidence === 'unknown' || !oh.close) return null;
  const open = toMin(oh.open);
  const close = toMin(oh.close);
  return close <= open ? close + 1440 : close;
}

function dayCenter(day: Day): { lat: number; lng: number } | null {
  const pts = day.items.filter((i) => i.type !== 'transit' && i.lat != null && i.lng != null);
  if (pts.length === 0) return day.lodging ? { lat: day.lodging.lat, lng: day.lodging.lng } : null;
  return {
    lat: pts.reduce((s, p) => s + (p.lat as number), 0) / pts.length,
    lng: pts.reduce((s, p) => s + (p.lng as number), 0) / pts.length,
  };
}

function reflow(itin: Itinerary, dayIndex: number) {
  const day = itin.days.find((d) => d.day_index === dayIndex);
  if (!day) return;
  const lodging = day.lodging ?? { name: '住宿', lat: dayCenter(day)?.lat ?? 30.657, lng: dayCenter(day)?.lng ?? 104.066 };
  const flowed = reflowDay(day, { startClock: dayIndex === 1 ? '09:30' : '08:30', lodging });
  itin.days = itin.days.map((d) => (d.day_index === dayIndex ? flowed : d));
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
    cost: { ...item.cost, amount: Math.round(item.cost.amount / Math.max(1, adults)) },
    indoor: !item.weather_sensitive,
    interest_tags: [],
    rating: 0,
    opening_hours: item.opening_hours ?? null,
    booking_required: item.booking_required,
  };
}

/** 把某项挪到次日；没有次日就退回候选池。返回挪去哪里了 */
function pushToNextDay(itin: Itinerary, dayIndex: number, itemId: string): 'next' | 'pool' | 'none' {
  const day = itin.days.find((d) => d.day_index === dayIndex);
  const next = itin.days.find((d) => d.day_index === dayIndex + 1);
  if (!day) return 'none';
  const idx = day.items.findIndex((i) => i.id === itemId);
  if (idx < 0) return 'none';
  const [item] = day.items.splice(idx, 1);
  if (next) {
    next.items.push({ ...item, id: `${item.id}-moved${next.items.length}` });
    reflow(itin, next.day_index);
    reflow(itin, dayIndex);
    return 'next';
  }
  if (item.poi_id) {
    const rest = itin.unscheduled.filter((c) => c.poi_id !== item.poi_id);
    itin.unscheduled = [toCandidate(item, '改完后这一天放不下', itin.meta.travelers.adults), ...rest];
  }
  reflow(itin, dayIndex);
  return 'pool';
}

function hasMeal(day: Day, meal: 'lunch' | 'dinner'): boolean {
  const [from, to] = meal === 'lunch' ? LUNCH_RANGE : DINNER_RANGE;
  return day.items.some((i) => i.type === 'meal' && toMin(i.start_time) >= from && toMin(i.start_time) <= to);
}

/** 就近补一顿饭：只在有空隙的位置插，插完靠 reflow 排时间 */
function insertMealFix(itin: Itinerary, dayIndex: number, meal: 'lunch' | 'dinner'): ItineraryItem | null {
  const day = itin.days.find((d) => d.day_index === dayIndex);
  if (!day) return null;
  const adults = Math.max(1, itin.meta.travelers.adults);
  const used = new Set(itin.days.flatMap((d) => d.items.filter((i) => i.poi_id).map((i) => i.poi_id as string)));
  const center = dayCenter(day);
  if (!center) return null;
  const target = meal === 'lunch' ? toMin('12:00') : toMin('18:00');

  const pool = poisByCity(itin.meta.city_code)
    .filter((p) => p.category === 'restaurant' && !used.has(p.poi_id) && p.rating >= 4 && p.price > 0)
    .map((p) => ({ p, km: roadKm(center, { lat: p.lat, lng: p.lng }) }))
    .filter((x) => x.km <= 6)
    .sort((a, b) => a.km - b.km || b.p.rating - a.p.rating);
  if (pool.length === 0) return null;

  const seed = pool[0].p;
  const dur = meal === 'lunch' ? 60 : 75;
  const item: ItineraryItem = {
    id: `d${day.day_index}-fix-${meal}`,
    type: 'meal',
    poi_id: seed.poi_id,
    name: seed.name,
    lat: seed.lat,
    lng: seed.lng,
    category: 'restaurant',
    start_time: hhmm(target),
    end_time: hhmm(target + dur),
    duration_min: dur,
    cost: { amount: seed.price * adults, currency: 'CNY', type: 'meal' },
    opening_hours: { open: seed.open, close: seed.close, closed_days: seed.closed_days, confidence: seed.hours_confidence },
    booking_required: false,
    booked: false,
    locked: false,
    mode: null,
    from_item_id: null,
    to_item_id: null,
    distance_m: null,
    notes: '手动改动后补上的一顿',
    weather_sensitive: false,
  };

  // 插在「第一个开始时间晚于目标时刻」的项之前，保证它落在饭点附近
  const at = day.items.findIndex((i) => i.type !== 'transit' && toMin(i.start_time) > target);
  day.items.splice(at < 0 ? day.items.length : at, 0, item);
  reflow(itin, dayIndex);
  return item;
}

export function resolveDayEdits(itin: Itinerary, dayIndex: number): EditResolution {
  const next = clone(itin);
  const fixes: EditFix[] = [];
  const day = next.days.find((d) => d.day_index === dayIndex);
  if (!day) return { itin, fixes };

  // ① 撞闭园：结束时间已经过了闭园时刻
  for (const item of [...day.items]) {
    if (item.type === 'transit' || item.locked) continue;
    const close = closeMinute(item);
    if (close == null) continue;
    if (toMin(item.end_time) <= close) continue;
    const where = pushToNextDay(next, dayIndex, item.id);
    if (where === 'none') continue;
    fixes.push({
      code: 'closed',
      auto: true,
      text: `「${item.name}」${hhmm(close % 1440)} 就闭园，已${where === 'next' ? `挪到第 ${dayIndex + 1} 天` : '放回候选池'}`,
    });
  }

  // ② 收工晚于 22:30：把最后一项（不动饭）挪走
  for (let guard = 0; guard < 2; guard++) {
    const cur = next.days.find((d) => d.day_index === dayIndex);
    if (!cur) break;
    const acts = cur.items.filter((i) => i.type !== 'transit');
    const last = acts[acts.length - 1];
    if (!last || last.type === 'meal' || last.locked) break;
    if (toMin(last.end_time) <= LATE_LIMIT) break;
    const where = pushToNextDay(next, dayIndex, last.id);
    if (where === 'none') break;
    fixes.push({
      code: 'late',
      auto: true,
      text: `收工排到 ${last.end_time} 太晚，把「${last.name}」${where === 'next' ? `挪到第 ${dayIndex + 1} 天` : '放回候选池'}`,
    });
  }

  // ③ 饭点被挤掉：补一顿
  for (const meal of ['lunch', 'dinner'] as const) {
    const cur = next.days.find((d) => d.day_index === dayIndex);
    if (!cur || hasMeal(cur, meal)) continue;
    const added = insertMealFix(next, dayIndex, meal);
    if (!added) continue;
    fixes.push({
      code: 'meal',
      auto: true,
      text: `${meal === 'lunch' ? '午饭' : '晚饭'}被挤没了，补了「${added.name}」（¥${(added.cost.amount / Math.max(1, next.meta.travelers.adults)).toFixed(0)}/人）`,
    });
  }

  // ④ 跨度太散：只提示
  const cur = next.days.find((d) => d.day_index === dayIndex);
  if (cur) {
    const pts = cur.items.filter((i) => i.type !== 'transit' && i.lat != null && i.lng != null) as (ItineraryItem & {
      lat: number;
      lng: number;
    })[];
    let span = 0;
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        span = Math.max(span, roadKm({ lat: pts[i].lat, lng: pts[i].lng }, { lat: pts[j].lat, lng: pts[j].lng }));
      }
    }
    if (span > 30) {
      fixes.push({
        code: 'geo',
        auto: false,
        text: `这一天最远两点相距 ${Math.round(span)}km，来回跑比较散 —— 可以把远的那项拖到别的天`,
      });
    }
  }

  return { itin: next, fixes };
}
