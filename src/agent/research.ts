import type { Meta, Pace } from '../domain/schema';
import { PACES } from '../domain/schema';
import { CITIES, cityByCode, poisByCity, type PoiSeed } from '../data/pois';
import { dateList, weekdayOf } from '../domain/time';

export interface ScoredPoi {
  seed: PoiSeed;
  score: number;
  reasons: string[];
}

export interface ResearchResult {
  city: string;
  cityName: string;
  pool: ScoredPoi[];
  dates: string[];
  closedOn: Record<string, string[]>;
}

const INTEREST_WEIGHT: Record<string, number> = {
  food: 1.0,
  nature: 1.0,
  history: 1.0,
  museum: 0.95,
  art: 0.85,
  shopping: 0.7,
  nightlife: 0.8,
  photography: 0.85,
  theme_park: 0.9,
  hot_spring: 0.9,
  hiking: 1.0,
  local_life: 0.85,
};

export function buildPoiPool(meta: Meta): ResearchResult {
  const dates = dateList(meta.start_date, meta.end_date);
  const seedList = poisByCity(meta.city_code);
  const interests = meta.interests.length > 0 ? meta.interests : ['food', 'nature'];
  const closedOn: Record<string, string[]> = {};

  const scored: ScoredPoi[] = seedList.map((seed) => {
    const reasons: string[] = [];
    let score = seed.rating;
    for (const tag of seed.tags) {
      const w = INTEREST_WEIGHT[tag] ?? 0.6;
      if (interests.includes(tag)) {
        score += 2.2 * w;
        reasons.push(`匹配偏好「${tag}」`);
      }
    }
    if (meta.must_visit.some((m) => seed.name.includes(m) || m.includes(seed.name))) {
      score += 8;
      reasons.push('你点名要去');
    }
    if (meta.avoid.some((a) => seed.tags.includes(a as never) || seed.name.includes(a))) {
      score -= 10;
      reasons.push('命中避雷清单');
    }
    if (seed.category === 'restaurant' || seed.category === 'cafe') {
      score -= 1.2;
    }
    if (seed.hours_confidence === 'verified') score += 0.3;

    const closed = dates.filter((d) => seed.closed_days.includes(weekdayOf(d)));
    closedOn[seed.poi_id] = closed;
    if (closed.length === dates.length) score -= 100;

    return { seed, score, reasons };
  });

  scored.sort((a, b) => b.score - a.score || a.seed.poi_id.localeCompare(b.seed.poi_id));

  return {
    city: meta.city_code,
    cityName: cityByCode(meta.city_code)?.name ?? meta.destination,
    pool: scored,
    dates,
    closedOn,
  };
}

export function maxPoisPerDay(pace: Pace): number {
  return PACES[pace].max_poi_per_day;
}

export function pickLodging(city: string) {
  return cityByCode(city)?.lodging ?? CITIES[0].lodging;
}

export function cityOf(code: string) {
  return cityByCode(code) ?? CITIES[0];
}

export function outdoorCandidates(pool: ScoredPoi[], exclude: string[]): ScoredPoi[] {
  return pool.filter(
    (p) =>
      !exclude.includes(p.seed.poi_id) &&
      p.seed.category !== 'restaurant' &&
      p.seed.category !== 'cafe',
  );
}

export function indoorCandidates(pool: ScoredPoi[], exclude: string[]): ScoredPoi[] {
  return pool.filter(
    (p) => !exclude.includes(p.seed.poi_id) && p.seed.indoor && p.seed.category !== 'restaurant',
  );
}
