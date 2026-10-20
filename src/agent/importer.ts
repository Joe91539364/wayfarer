import type { Day, Itinerary, ItineraryItem, Meta } from '../domain/schema';
import { addDays, fromMin, parseFlexibleTime, toMin, weekdayLabel } from '../domain/time';
import { recomputeDaySummary, recomputeItinerary } from '../domain/summary';
import { poisByCity, type PoiSeed } from '../data/pois';
import { pickLodging } from './research';
import { reflowDay } from './reflow';
import type { VerifyResult } from '../verifier';
import type { Violation } from '../domain/schema';

export interface ImportReport {
  total: number;
  matched: number;
  unmatched: { name: string; day: number }[];
  days: number;
  issues: Violation[];
}

export interface ImportResult {
  itinerary: Itinerary;
  report: ImportReport;
  verifyResult: VerifyResult;
}

function similarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.92;
  const setA = new Set(a.split(''));
  const setB = new Set(b.split(''));
  let hit = 0;
  for (const c of setA) if (setB.has(c)) hit += 1;
  return hit / Math.max(setA.size, setB.size);
}

export function matchPoi(name: string, city: string): PoiSeed | null {
  const pool = poisByCity(city);
  const cleaned = name.replace(/[（(].*?[)）]/g, '').trim();
  let best: PoiSeed | null = null;
  let bestScore = 0;
  for (const p of pool) {
    const score = Math.max(similarity(cleaned, p.name), similarity(name, p.name));
    if (score > bestScore) {
      bestScore = score;
      best = p;
    }
  }
  return bestScore >= 0.55 ? best : null;
}

export interface ParsedLine {
  day: number;
  start?: string;
  end?: string;
  name: string;
  duration?: number;
}

export function parseLines(text: string): ParsedLine[] {
  const out: ParsedLine[] = [];
  let day = 1;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const dayMatch = /^(?:day\s*(\d+)|第\s*(\d+)\s*天|d\s*(\d+))/i.exec(line);
    if (dayMatch) {
      day = Number(dayMatch[1] ?? dayMatch[2] ?? dayMatch[3]);
      const rest = line.replace(dayMatch[0], '').replace(/^[：:·\-\s]+/, '');
      if (rest) {
        const t = /(\d{1,2}[:：]\d{2})/.exec(rest);
        if (t) {
          out.push({ day, start: parseFlexibleTime(t[1]) ?? undefined, name: rest.replace(t[1], '').trim() });
        }
      }
      continue;
    }
    const timeMatch = /^(\d{1,2}[:：.]\d{2})\s*(?:[-–~至]\s*(\d{1,2}[:：.]\d{2}))?\s*(.*)$/.exec(line);
    let name = line;
    let start: string | undefined;
    let end: string | undefined;
    if (timeMatch) {
      start = parseFlexibleTime(timeMatch[1]) ?? undefined;
      end = timeMatch[2] ? parseFlexibleTime(timeMatch[2]) ?? undefined : undefined;
      name = timeMatch[3] ?? '';
    }
    name = name.replace(/^[-*•·\d.、)\s]+/, '').trim();
    const durMatch = /[（(]?\s*(\d+)\s*(分钟|min|小时|h)\s*[)）]?\s*$/i.exec(name);
    let duration: number | undefined;
    if (durMatch) {
      duration = durMatch[2].startsWith('小时') || durMatch[2].toLowerCase() === 'h'
        ? Number(durMatch[1]) * 60
        : Number(durMatch[1]);
      name = name.slice(0, durMatch.index).trim();
    }
    if (!name) continue;
    out.push({ day, start, end, name, duration });
  }
  return out;
}

export function importFromText(
  text: string,
  meta: Meta,
  verifyFn: (itin: Itinerary) => VerifyResult,
): ImportResult {
  const lines = parseLines(text);
  const city = meta.city_code;
  const lodging = pickLodging(city);
  const unmatched: { name: string; day: number }[] = [];
  const byDay = new Map<number, { seed: PoiSeed; start?: string; end?: string; duration?: number }[]>();

  for (const line of lines) {
    const seed = matchPoi(line.name, city);
    if (!seed) {
      unmatched.push({ name: line.name, day: line.day });
      continue;
    }
    const arr = byDay.get(line.day) ?? [];
    arr.push({ seed, start: line.start, end: line.end, duration: line.duration });
    byDay.set(line.day, arr);
  }

  const dayNumbers = [...byDay.keys()].sort((a, b) => a - b);
  const days: Day[] = dayNumbers.map((dayNo, idx) => {
    const entries = byDay.get(dayNo) ?? [];
    let cursor = toMin('09:00');
    const items: ItineraryItem[] = [];
    entries.forEach((entry, i) => {
      const dur =
        entry.duration ??
        (entry.start && entry.end ? toMin(entry.end) - toMin(entry.start) : entry.seed.duration_min);
      const start = entry.start ? toMin(entry.start) : cursor;
      items.push({
        id: `d${idx + 1}-i${i + 1}`,
        type: entry.seed.category === 'restaurant' || entry.seed.category === 'cafe' ? 'meal' : 'activity',
        poi_id: entry.seed.poi_id,
        name: entry.seed.name,
        lat: entry.seed.lat,
        lng: entry.seed.lng,
        category: entry.seed.category,
        start_time: fromMin(start),
        end_time: fromMin(start + dur),
        duration_min: dur,
        cost: {
          amount: entry.seed.price,
          currency: 'CNY',
          type: entry.seed.category === 'restaurant' || entry.seed.category === 'cafe' ? 'meal' : 'ticket',
        },
        opening_hours: {
          open: entry.seed.open,
          close: entry.seed.close,
          closed_days: entry.seed.closed_days,
          confidence: entry.seed.hours_confidence,
        },
        booking_required: entry.seed.booking_required,
        booked: false,
        locked: false,
        mode: null,
        from_item_id: null,
        to_item_id: null,
        distance_m: null,
        notes: entry.seed.blurb,
        weather_sensitive: !entry.seed.indoor,
      });
      cursor = start + dur;
    });
    const raw: Day = {
      date: addDays(meta.start_date, idx),
      day_index: idx + 1,
      base_area: { name: lodging.area, lat: lodging.lat, lng: lodging.lng },
      lodging: { name: lodging.name, lat: lodging.lat, lng: lodging.lng, cost: { amount: lodging.price, currency: 'CNY', type: 'lodging' } },
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
    // 导入时保留原计划的时间，不重排 —— 否则原行程里的冲突会被自动抹平，
    // 用户就看不到「朋友的行程哪里走不通」了。
    return recomputeDaySummary(raw);
  });

  const matched = lines.length - unmatched.length;
  const itin: Itinerary = recomputeItinerary({
    id: `itin_import_${Date.now()}`,
    version: 1,
    parent_id: null,
    variant_label: '导入行程',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    meta: { ...meta, source: { type: 'import', file_ref: null } },
    days,
    unscheduled: [],
    warnings: [],
    feasibility: null,
    assumptions: [
      '本行程来自你粘贴的文本，已做 POI 反查',
      unmatched.length > 0 ? `${unmatched.length} 个名称未能匹配到真实 POI，已列出待确认` : '全部条目匹配成功',
    ],
  });

  const result = verifyFn(itin);
  itin.warnings = [...result.errors, ...result.warnings];

  return {
    itinerary: itin,
    report: {
      total: lines.length,
      matched,
      unmatched,
      days: days.length,
      issues: [...result.errors, ...result.warnings],
    },
    verifyResult: result,
  };
}

export function sampleImportText(): string {
  return `Day 1 5/1 ${weekdayLabel('2026-05-01')}
09:00 宽窄巷子 120分钟
11:30 马旺子川菜馆
14:00 武侯祠 90分钟
16:00 锦里古街 90分钟
19:00 九眼桥

Day 2 5/2
09:30 大熊猫繁育研究基地 180分钟
13:30 陈麻婆豆腐
15:00 成都博物馆 120分钟
18:00 春熙路`;
}
