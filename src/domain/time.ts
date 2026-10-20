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
