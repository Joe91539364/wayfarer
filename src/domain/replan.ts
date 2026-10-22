import type { Itinerary, Meta } from './schema';
import { addDays, diffDays } from './time';

export interface ParsedIntake {
  meta: Meta;
  missing: string[];
}

/**
 * 就地改需求：没重新说的地方沿用当前行程的设定 ——
 * 只改天数不该被追问「哪天出发」，只改预算也不该把天数重置回默认 3 天。
 * 继承出发日期时必须连着把结束日期平移过去，否则 start > end，确认卡会算出「1 天」。
 *
 * 出发地是唯一的例外：只在「目的地没换」时才沿用。换了一座城市（临汾 → 成都），
 * 旧出发地就作不了数 —— 宁可回确认卡问一句，也不能拿着「杭州 → 成都」直接排。
 */
export function inheritParsed(parsed: ParsedIntake, iti: Itinerary | null): void {
  if (!iti) return;
  let span = Math.max(1, diffDays(parsed.meta.start_date, parsed.meta.end_date) + 1);
  if (parsed.missing.includes('days') && iti.days.length > 0) {
    span = iti.days.length;
    parsed.meta.end_date = addDays(parsed.meta.start_date, span - 1);
    parsed.missing = parsed.missing.filter((k) => k !== 'days');
  }
  if (parsed.missing.includes('start_date') && iti.meta.start_date) {
    parsed.meta.start_date = iti.meta.start_date;
    parsed.meta.end_date = addDays(iti.meta.start_date, span - 1);
    parsed.missing = parsed.missing.filter((k) => k !== 'start_date');
  }
  if (parsed.missing.includes('destination') && iti.meta.destination) {
    parsed.meta.destination = iti.meta.destination;
    parsed.meta.city_code = iti.meta.city_code;
    parsed.missing = parsed.missing.filter((k) => k !== 'destination');
  }
  // 出发地继承必须放在 destination 之后：目的地是继承来的 = 还是这一趟，才轮得到沿用出发地
  const sameTrip = parsed.meta.destination === iti.meta.destination;
  if (parsed.missing.includes('origin') && sameTrip && iti.meta.origin_city) {
    parsed.meta.origin_city = iti.meta.origin_city;
    parsed.missing = parsed.missing.filter((k) => k !== 'origin');
  }
}
