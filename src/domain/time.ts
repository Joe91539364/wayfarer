export const MIN_PER_DAY = 1440;

export function toMin(hhmm: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) throw new Error(`bad time: ${hhmm}`);
  const h = Number(m[1]);
  const mi = Number(m[2]);
  if (h > 47 || mi > 59) throw new Error(`bad time: ${hhmm}`);
  return h * 60 + mi;
}

export function fromMin(min: number): string {
  const wrapped = ((min % MIN_PER_DAY) + MIN_PER_DAY) % MIN_PER_DAY;
  const h = Math.floor(wrapped / 60);
  const m = wrapped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function addMin(hhmm: string, delta: number): string {
  return fromMin(toMin(hhmm) + delta);
}

export function durationMin(start: string, end: string): number {
  const raw = toMin(end) - toMin(start);
  return raw < 0 ? raw + MIN_PER_DAY : raw;
}

export function atOrAfter(time: string, floor: string): string {
  return toMin(time) >= toMin(floor) ? time : floor;
}

export function clampTime(time: string, open: string, close: string, dur: number): string {
  const t = toMin(time);
  const o = toMin(open);
  const c = toMin(close);
  if (t < o) return open;
  if (t + dur > c) return fromMin(Math.max(o, c - dur));
  return fromMin(t);
}

export function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  const as = toMin(aStart);
  const ae = as + durationMin(aStart, aEnd);
  const bs = toMin(bStart);
  const be = bs + durationMin(bStart, bEnd);
  return as < be && bs < ae;
}

export function weekdayOf(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

const WEEKDAY_CN = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

export function weekdayLabel(date: string): string {
  return WEEKDAY_CN[weekdayOf(date)];
}

export function addDays(date: string, n: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  t.setUTCDate(t.getUTCDate() + n);
  return t.toISOString().slice(0, 10);
}

export function diffDays(start: string, end: string): number {
  const a = new Date(`${start}T00:00:00Z`).getTime();
  const b = new Date(`${end}T00:00:00Z`).getTime();
  return Math.round((b - a) / 86400000);
}

export function dateList(start: string, end: string): string[] {
  const n = Math.max(0, diffDays(start, end));
  return Array.from({ length: n + 1 }, (_, i) => addDays(start, i));
}

export function formatDateCN(date: string): string {
  const [, m, d] = date.split('-');
  return `${Number(m)}月${Number(d)}日`;
}

export function formatDateShort(date: string): string {
  const [, m, d] = date.split('-');
  return `${Number(m)}/${Number(d)}`;
}

export function parseFlexibleTime(input: string): string | null {
  const s = input.trim();
  let m = /^(\d{1,2}):(\d{2})$/.exec(s);
  if (m) return fromMin(Number(m[1]) * 60 + Number(m[2]));
  m = /^(\d{1,2})[：.](\d{2})$/.exec(s);
  if (m) return fromMin(Number(m[1]) * 60 + Number(m[2]));
  m = /^(\d{1,2})\s*点\s*(\d{1,2})?$/.exec(s);
  if (m) return fromMin(Number(m[1]) * 60 + Number(m[2] ?? 0));
  m = /^(\d{3,4})$/.exec(s);
  if (m) {
    const v = m[1].padStart(4, '0');
    return fromMin(Number(v.slice(0, 2)) * 60 + Number(v.slice(2)));
  }
  return null;
}

/* ------------------------- 现实时钟 / 时区 ------------------------- */

/** 某个 IANA 时区在此刻相对 UTC 的偏移（分钟，东八区 = 480）。Intl 不可用时退回本机时区。 */
export function tzOffsetMin(now: Date, tz: string): number {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).formatToParts(now);
    const get = (k: string) => Number(parts.find((p) => p.type === k)?.value ?? NaN);
    const asUTC = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour') % 24, get('minute'), get('second'));
    if (!Number.isFinite(asUTC)) return -now.getTimezoneOffset();
    return Math.round((asUTC - Math.floor(now.getTime() / 1000) * 1000) / 60000);
  } catch {
    return -now.getTimezoneOffset();
  }
}

export interface ClockFace {
  /** 当地日期 YYYY-MM-DD */
  date: string;
  /** 当地时刻 HH:MM */
  hhmm: string;
  /** 当地时刻 HH:MM:SS */
  hhmmss: string;
  /** 当地星期（周四） */
  weekday: string;
  /** 时区偏移（分钟） */
  offsetMin: number;
}

const WEEKDAY_FULL = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

/** 把「此刻」换算成指定时区的钟面。 */
export function clockInTz(now: Date, tz: string): ClockFace {
  const offsetMin = tzOffsetMin(now, tz);
  const shifted = new Date(now.getTime() + offsetMin * 60000);
  const iso = shifted.toISOString();
  const date = iso.slice(0, 10);
  const hhmmss = iso.slice(11, 19);
  return {
    date,
    hhmm: hhmmss.slice(0, 5),
    hhmmss,
    weekday: WEEKDAY_FULL[shifted.getUTCDay()],
    offsetMin,
  };
}

/** 现在算行程的哪一段：出发前 / 进行中第几天 / 已结束。 */
export interface TripPhase {
  phase: 'before' | 'during' | 'after';
  /** before/after 时是相差天数；during 时是 0 */
  days: number;
  /** during 时是第几天（1 起），其余为 0 */
  dayIndex: number;
}

export function tripPhase(start: string, end: string, today: string): TripPhase {
  if (today < start) return { phase: 'before', days: diffDays(today, start), dayIndex: 0 };
  if (today > end) return { phase: 'after', days: diffDays(end, today), dayIndex: 0 };
  return { phase: 'during', days: 0, dayIndex: diffDays(start, today) + 1 };
}

/** 距某个时刻还有多少分钟（负数 = 已经过去）。 */
export function minutesUntil(nowHHMM: string, targetHHMM: string): number {
  return toMin(targetHHMM) - toMin(nowHHMM);
}
