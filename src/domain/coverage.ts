import type { Itinerary, ItineraryItem } from './schema';
import { INTEREST_CN, type Interest } from './schema';

/**
 * 「意愿落实」——用户说了想玩什么，就在面板上一条条对账。
 *
 * 之前只有内部打分权重，用户看到的只是行程列表，没法确认「我说要吃好的」
 * 到底被听进去了没有。这里把兴趣翻译成条目计数：说了美食就得看到十几顿饭，
 * 说了自然风光就得看到几个山水，对不上的直接标红。
 */

/** 兴趣 → 能算作「落实了」的 POI 分类 */
const INTEREST_CATEGORIES: Record<string, string[]> = {
  food: ['restaurant', 'cafe'],
  nature: ['nature', 'hiking', 'landmark'],
  history: ['sight', 'landmark'],
  museum: ['museum'],
  art: ['museum', 'sight'],
  shopping: ['shopping'],
  nightlife: ['nightlife'],
  photography: ['sight', 'landmark', 'nature'],
  theme_park: ['theme_park'],
  hot_spring: ['hot_spring'],
  hiking: ['hiking', 'nature'],
  local_life: ['shopping', 'restaurant', 'sight'],
};

/** 这些兴趣重复出现很正常（一天吃两顿），阈值按「至少几项」算 */
const MIN_COUNT: Record<string, number> = { food: 3 };

export interface CoverageRow {
  key: string;
  label: string;
  /** 用户是否明确点了这项 */
  want: boolean;
  count: number;
  /** 够不够：want 且 count < 阈值 时为 false */
  enough: boolean;
  samples: string[];
}

function itemMatches(item: ItineraryItem, cats: string[]): boolean {
  const cat = (item.category ?? '').toLowerCase();
  if (cat && cats.includes(cat)) return true;
  // 数据里餐厅偶尔只标成 meal，没有 category
  if (cats.includes('restaurant') && item.type === 'meal' && !cat) return true;
  return false;
}

export function countByInterest(itin: Itinerary): Record<string, ItineraryItem[]> {
  const all = itin.days.flatMap((d) => d.items).filter((i) => i.type !== 'transit');
  const out: Record<string, ItineraryItem[]> = {};
  for (const [key, cats] of Object.entries(INTEREST_CATEGORIES)) {
    out[key] = all.filter((i) => itemMatches(i, cats));
  }
  return out;
}

/** 用户点过的兴趣排在前面；没点过但实际排了不少的也给一行，方便对照 */
export function interestCoverage(itin: Itinerary): CoverageRow[] {
  const buckets = countByInterest(itin);
  const wants = itin.meta.interests.filter((i) => i in INTEREST_CATEGORIES);
  const keys = [...new Set([...wants, ...Object.keys(buckets).filter((k) => buckets[k].length >= 2)])];
  const rows: CoverageRow[] = keys.map((key) => {
    const items = buckets[key] ?? [];
    const min = MIN_COUNT[key] ?? 1;
    const want = wants.includes(key);
    return {
      key,
      label: INTEREST_CN[key as Interest] ?? key,
      want,
      count: items.length,
      enough: items.length >= min,
      samples: [...new Set(items.map((i) => i.name))].slice(0, 3),
    };
  });
  return rows.sort((a, b) => Number(b.want) - Number(a.want) || b.count - a.count);
}

/** 明确点了却没落实的兴趣，UI 拿它写提示 */
export function unmetInterests(rows: CoverageRow[]): CoverageRow[] {
  return rows.filter((r) => r.want && !r.enough);
}

/** 每天几顿正餐 —— 用户抱怨「整个行程只有一个吃的」时最直接的证据 */
export function mealPerDay(itin: Itinerary): { day: number; meals: number; cafes: number }[] {
  return itin.days.map((d) => ({
    day: d.day_index,
    meals: d.items.filter((i) => i.type === 'meal' && i.category !== 'cafe').length,
    cafes: d.items.filter((i) => i.type === 'meal' && i.category === 'cafe').length,
  }));
}
