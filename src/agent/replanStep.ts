import type { Candidate, Itinerary, ItineraryItem } from '../domain/schema';
import { recomputeItinerary } from '../domain/summary';
import { reflowDay } from './reflow';
import { insertCandidate, removeItem } from './repair';
import { buildCertificate, verify, type VerifyContext } from '../verifier';
import { dayColor } from '../domain/palette';
import { toMin, weekdayOf } from '../domain/time';

export interface StepReplanResult {
  itinerary: Itinerary;
  reply: string;
  changed: boolean;
  action: string;
  /** 操作后这一站的新 id（换掉后会变）；被删掉时为 null */
  itemId: string | null;
}

const CN_NUM: Record<string, number> = { 一: 1, 两: 2, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };

function clone(itin: Itinerary): Itinerary {
  return JSON.parse(JSON.stringify(itin)) as Itinerary;
}

function finalize(next: Itinerary, ctx: VerifyContext): Itinerary {
  const result = verify(next, ctx);
  const out = recomputeItinerary({
    ...next,
    warnings: [...result.errors, ...result.warnings, ...result.infos],
  });
  out.feasibility = buildCertificate(out, ctx, result);
  return out;
}

function reflowFor(itin: Itinerary, dayIndex: number): Itinerary {
  const day = itin.days.find((d) => d.day_index === dayIndex);
  if (!day) return itin;
  const next = clone(itin);
  const target = next.days.find((d) => d.day_index === dayIndex)!;
  const lodging = target.lodging ?? { name: '住宿', lat: 30.657, lng: 104.066 };
  target.items = reflowDay(target, {
    startClock: dayIndex === 1 ? '09:30' : '08:30',
    lodging,
  }).items;
  return next;
}

function toCandidate(item: ItineraryItem, reason: string): Candidate {
  return {
    poi_id: item.poi_id ?? item.id,
    name: item.name,
    lat: item.lat ?? 0,
    lng: item.lng ?? 0,
    category: item.category ?? 'sight',
    reason,
    suggested_duration_min: item.duration_min,
    cost: item.cost,
    indoor: !item.weather_sensitive,
    interest_tags: [],
    rating: 0,
    opening_hours: item.opening_hours ?? null,
    booking_required: item.booking_required,
  };
}

function find(itin: Itinerary, id: string) {
  for (const day of itin.days) {
    const item = day.items.find((i) => i.id === id);
    if (item) return { day, item };
  }
  return null;
}

function swapInDay(itin: Itinerary, dayIndex: number, aId: string, bId: string): Itinerary {
  const next = clone(itin);
  const day = next.days.find((d) => d.day_index === dayIndex);
  if (!day) return itin;
  const acts = day.items.filter((i) => i.type !== 'transit');
  const ai = acts.findIndex((x) => x.id === aId);
  const bi = acts.findIndex((x) => x.id === bId);
  if (ai < 0 || bi < 0) return itin;
  [acts[ai], acts[bi]] = [acts[bi], acts[ai]];
  day.items = acts;
  return reflowFor(next, dayIndex);
}

function pickReplacement(
  itin: Itinerary,
  item: ItineraryItem,
  intent: 'cheap' | 'indoor' | 'near' | 'any',
  dayDate: string,
): Candidate | null {
  const dow = weekdayOf(dayDate);
  const all = itin.unscheduled;
  // 1) 当天闭馆的直接排除；2) 替换项必须在原时段附近能开门，
  //    否则一个 19:00 才开的酒吧会把整天的节奏拖到半夜。
  const startMin = toMin(item.start_time);
  const fitsSlot = (c: Candidate) => {
    if (!c.opening_hours) return true;
    const o = toMin(c.opening_hours.open);
    let cl = toMin(c.opening_hours.close);
    if (cl < o) cl += 1440;
    const openGap = o - startMin;
    return openGap <= 90 && startMin + 30 <= cl;
  };
  const filtered = all.filter(
    (c) => c.poi_id !== item.poi_id && !c.opening_hours?.closed_days.includes(dow) && fitsSlot(c),
  );
  const score = (c: Candidate) => {
    let s = 0;
    if (intent === 'cheap') s += (c.cost.amount === 0 ? 100 : 60 - c.cost.amount / 10);
    if (intent === 'indoor' && c.indoor) s += 80;
    if (intent === 'near' && item.lat != null && item.lng != null) {
      s += 100 - Math.hypot(c.lat - item.lat, c.lng - item.lng) * 100;
    }
    if (c.category === item.category) s += 40;
    if (c.category === 'restaurant' || c.category === 'cafe') s -= 30;
    return s + c.rating * 4;
  };
  return [...filtered].sort((a, b) => score(b) - score(a))[0] ?? null;
}

export function replanStep(
  itin: Itinerary,
  itemId: string,
  text: string,
  ctx: VerifyContext,
): StepReplanResult {
  const found = find(itin, itemId);
  if (!found) {
    return { itinerary: itin, reply: '这一项已经不在行程里了，刷新看看。', changed: false, action: 'none', itemId: null };
  }
  const { day, item } = found;
  const raw = text.trim();
  const t = raw.replace(/\s+/g, '');
  const dayNo = Number(/(?:第)?([一两二三四五六七八九\d]+)\s*天/.exec(t)?.[1]?.replace(/[一两二三四五六七八九]/, (m) => String(CN_NUM[m])) ?? '0');

  const finish = (next: Itinerary, reply: string, action: string, keepId: string | null = itemId): StepReplanResult => {
    const out = finalize(next, ctx);
    const cert = out.feasibility;
    const tail = cert ? ` 当前可行性 ${cert.summary.passed}/${cert.summary.total}${cert.summary.errors ? `（${cert.summary.errors} 个 error 待处理）` : ''}。` : '';
    return { itinerary: out, reply: reply + tail, changed: true, action, itemId: keepId };
  };

  // 换到第 N 天
  if (dayNo >= 1 && dayNo <= itin.days.length && dayNo !== day.day_index && /(换到|移到|放到|挪到|改到)/.test(t)) {
    const cand = toCandidate(item, '从其他天移入');
    const removed = removeItem(itin, itemId, '移出原计划');
    const next = insertCandidate(removed.itin, dayNo - 1, cand, 99);
    const newId = next.days.find((d) => d.day_index === dayNo)?.items.find((i) => i.poi_id === cand.poi_id)?.id ?? null;
    return finish(next, `把「${item.name}」从第 ${day.day_index} 天移到了第 ${dayNo} 天，两天的时间轴都重新算过了。`, 'move-day', newId);
  }

  // 删除
  if (/(删|去掉|取消|不想去|不要)/.test(t)) {
    const removed = removeItem(itin, itemId, '你手动移除');
    if (!removed.removed) return { itinerary: itin, reply: '这一项被锁定了，先解锁再删。', changed: false, action: 'none', itemId };
    return finish(removed.itin, `已把「${item.name}」移入候选池，第 ${day.day_index} 天的后续安排整体前移。`, 'remove', null);
  }

  // 锁定
  if (/(锁|别动|不要改|固定)/.test(t)) {
    const next = clone(itin);
    const t2 = find(next, itemId);
    if (t2) t2.item.locked = true;
    return finish(next, `已锁定「${item.name}」，之后的自动重排都不会动它。`, 'lock');
  }
  if (/(解锁|可以改)/.test(t)) {
    const next = clone(itin);
    const t2 = find(next, itemId);
    if (t2) t2.item.locked = false;
    return finish(next, `已解锁「${item.name}」。`, 'unlock');
  }

  // 换一个
  if (/(换|替代|换掉|换成)/.test(t)) {
    const intent = /(便宜|省钱|免费|贵)/.test(t)
      ? 'cheap'
      : /(室内|下雨|雨|不晒)/.test(t)
        ? 'indoor'
        : /(近|远|附近)/.test(t)
          ? 'near'
          : 'any';
    const cand = pickReplacement(itin, item, intent, day.date);
    if (!cand) {
      return {
        itinerary: itin,
        reply: '候选池里暂时没有合适的替代项，可以先把别的点移出去腾出位置。',
        changed: false,
        action: 'none',
        itemId,
      };
    }
    if (intent === 'indoor' && !cand.indoor) {
      return {
        itinerary: itin,
        reply: `第 ${day.day_index} 天这个时段没有开门的室内备选（周一不少博物馆闭馆）。可以试试「换到第 2 天」，或者换个时间再来。`,
        changed: false,
        action: 'none',
        itemId,
      };
    }
    if (intent === 'cheap' && cand.cost.amount >= item.cost.amount) {
      return {
        itinerary: itin,
        reply: '候选池里没有比它更便宜的可换项了。真要压预算，可以直接说「删掉」。',
        changed: false,
        action: 'none',
        itemId,
      };
    }
    const acts = day.items.filter((i) => i.type !== 'transit');
    const pos = acts.findIndex((a) => a.id === itemId);
    const removed = removeItem(itin, itemId, '被替换');
    const next = insertCandidate(removed.itin, day.day_index - 1, cand, Math.max(0, pos));
    const why = intent === 'cheap' ? '更便宜' : intent === 'indoor' ? '室内' : intent === 'near' ? '离得近' : '同类';
    const newId = next.days.find((d) => d.day_index === day.day_index)?.items.find((i) => i.poi_id === cand.poi_id)?.id ?? null;
    return finish(next, `把「${item.name}」换成了「${cand.name}」（${why}，${cand.cost.amount > 0 ? `¥${cand.cost.amount}` : '免费'}），时间轴已重排。`, 'swap', newId);
  }

  // 缩短 / 延长
  if (/(缩短|太赶|太累|少待|短一点|快点)/.test(t) || /(延长|多待|久一点|待久)/.test(t)) {
    const shrink = /(缩短|太赶|太累|少待|短一点|快点)/.test(t);
    const next = clone(itin);
    const t2 = find(next, itemId);
    if (!t2) return { itinerary: itin, reply: '找不到这一项了。', changed: false, action: 'none', itemId: null };
    const before = t2.item.duration_min;
    t2.item.duration_min = shrink
      ? Math.max(30, Math.round(before * 0.7))
      : Math.min(300, Math.round(before * 1.35));
    const reflowed = reflowFor(next, day.day_index);
    return finish(
      reflowed,
      `「${item.name}」的停留时长从 ${before} 分钟调到 ${t2.item.duration_min} 分钟，第 ${day.day_index} 天后面各项已顺延。`,
      shrink ? 'shrink' : 'extend',
    );
  }

  // 往后 / 往前（与相邻项交换顺序）
  if (/(晚点|晚一点|推迟|往后|不要那么早|早点|提前|往前)/.test(t)) {
    const later = /(晚点|晚一点|推迟|往后|不要那么早)/.test(t);
    const acts = day.items.filter((i) => i.type !== 'transit');
    const idx = acts.findIndex((a) => a.id === itemId);
    const neighbor = later ? acts[idx + 1] : acts[idx - 1];
    if (!neighbor) {
      return {
        itinerary: itin,
        reply: later ? '它已经是当天最后一项了。想更晚的话，可以把它换到别的天，或者直接改开始时间。' : '它已经是当天第一项了，再早就得改出发时间。',
        changed: false,
        action: 'none',
        itemId,
      };
    }
    const next = swapInDay(itin, day.day_index, itemId, neighbor.id);
    const t2 = find(next, itemId);
    return finish(
      next,
      `把「${item.name}」和「${neighbor.name}」对调了顺序，现在从 ${t2?.item.start_time} 开始。`,
      later ? 'later' : 'earlier',
    );
  }

  return {
    itinerary: itin,
    reply:
      '没太听懂。可以这样说：「换一个」「晚点去」「缩短到 60 分钟」「删掉」「锁住」「换到第 2 天」「换成室内的」「换便宜点的」。',
    changed: false,
    action: 'none',
    itemId,
  };
}

export const STEP_SUGGESTIONS = ['换一个', '晚点去', '缩短到 60 分钟', '换成室内的', '换便宜点的', '换到第 2 天', '锁住', '删掉'];

export function dayAccent(dayIndex: number): string {
  return dayColor(dayIndex);
}
