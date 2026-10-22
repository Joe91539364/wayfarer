import type { Day, ItineraryItem } from './schema';
import { durationMin, toMin } from './time';

/**
 * 空档识别：哪天几点以后就没事干了。
 *
 * 排程有保守的一面（营业时间、通勤、节奏上限），经常 13:10 就收工。
 * 与其让用户自己数时间轴，不如直接把「这里空着 X 小时」摆出来，
 * 让他一键补个点 —— 补完由 reflow 重排，时间还是程序算的。
 */

/** 一天的收尾时间：晚于这个点就不该再推荐加点（商店也要关门） */
const DAY_END = '21:00';
/** 小于这个长度的缝隙不值得提，塞不下任何一个点 */
const MIN_SLOT_MIN = 60;

export interface DaySlot {
  dayIndex: number;
  /** 建议开始时间（空档起点） */
  start: string;
  /** 空档结束时间 */
  end: string;
  minutes: number;
  kind: 'morning' | 'mid' | 'evening';
  /** 给用户看的一句话 */
  label: string;
}

function firstStart(dayIndex: number): string {
  return dayIndex === 1 ? '09:30' : '08:30';
}

function hhmm(min: number): string {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function humanSpan(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m} 分钟`;
  if (m === 0) return `${h} 小时`;
  return `${h} 小时 ${m} 分`;
}

/** 一天里可以塞东西的空档，按时间先后 */
export function daySlots(day: Day): DaySlot[] {
  const acts = day.items
    .filter((i) => i.type !== 'transit')
    .slice()
    .sort((a, b) => toMin(a.start_time) - toMin(b.start_time));
  const out: DaySlot[] = [];
  const dayStart = toMin(firstStart(day.day_index));
  let cursor = dayStart;

  const push = (from: number, to: number, kind: DaySlot['kind']) => {
    const minutes = to - from;
    if (minutes < MIN_SLOT_MIN) return;
    out.push({
      dayIndex: day.day_index,
      start: hhmm(from),
      end: hhmm(to),
      minutes,
      kind,
      label: `${hhmm(from)} 之后空着 ${humanSpan(minutes)}`,
    });
  };

  for (const item of acts) {
    const start = toMin(item.start_time);
    if (start - cursor >= MIN_SLOT_MIN) {
      // 只有「从当天出发时间一直空到第一个点」才算早上；其余都是夹在中间的缝
      push(cursor, start, cursor === dayStart ? 'morning' : 'mid');
    }
    cursor = Math.max(cursor, toMin(item.end_time) || start + durationMin(item.start_time, item.end_time));
  }
  const end = toMin(DAY_END);
  if (end - cursor >= MIN_SLOT_MIN) push(cursor, end, 'evening');
  return out;
}

/** 整趟行程的空档合计（分钟），右栏拿它写「还有 6.5 小时没安排」 */
export function totalSlackMin(itin: { days: Day[] }): number {
  return itin.days.reduce((s, d) => s + daySlots(d).reduce((a, g) => a + g.minutes, 0), 0);
}

/** 空档最多的那天，作为「加点」弹窗的默认目标 */
export function roomiestDay(itin: { days: Day[] }): { dayIndex: number; minutes: number } {
  let best = { dayIndex: itin.days[0]?.day_index ?? 1, minutes: 0 };
  for (const d of itin.days) {
    const m = daySlots(d).reduce((a, g) => a + g.minutes, 0);
    if (m > best.minutes) best = { dayIndex: d.day_index, minutes: m };
  }
  return best;
}

/** 当天最后一个活动项（用来判断「几点收工」） */
export function lastActivity(day: Day): ItineraryItem | null {
  const acts = day.items.filter((i) => i.type !== 'transit');
  if (acts.length === 0) return null;
  return acts.reduce((a, b) => (toMin(a.end_time) >= toMin(b.end_time) ? a : b));
}
