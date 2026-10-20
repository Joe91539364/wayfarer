import type { Meta } from '../domain/schema';
import { PACES } from '../domain/schema';
import { haversine, kmeans, centroid } from '../domain/geo';
import { dateList, toMin, weekdayOf } from '../domain/time';
import { buildPoiPool, cityOf, pickLodging, type ResearchResult, type ScoredPoi } from './research';

export interface DayPlan {
  date: string;
  day_index: number;
  poi_ids: string[];
  base_area: string;
  centroid: { lat: number; lng: number };
}

export interface OutlineResult {
  plans: DayPlan[];
  leftovers: ScoredPoi[];
  research: ResearchResult;
}

/**
 * OUTLINE 阶段：只决定「哪一天在哪一片区、去哪些点」，不排时间。
 * 这一步纯算法（地理聚类 + 偏好打分），不需要 LLM —— 比让模型输出结构更稳。
 */
export function makeOutline(meta: Meta): OutlineResult {
  const research = buildPoiPool(meta);
  const dates = dateList(meta.start_date, meta.end_date);
  const days = dates.length;
  const perDay = PACES[meta.pace].max_poi_per_day;
  const lodging = pickLodging(meta.city_code);

  const attractions = research.pool.filter(
    (p) =>
      p.seed.category !== 'restaurant' &&
      p.seed.category !== 'cafe' &&
      p.score > -50 &&
      !(research.closedOn[p.seed.poi_id]?.length === dates.length),
  );

  // 郊县（>30km）不进自动排程：它需要独立一天，硬塞进市区那天会变成 50km 跨区。
  // 这类点统一沉到候选池，由用户决定要不要为它单开一天。
  const cityCenter = cityOf(meta.city_code).center;
  const dayTrips = attractions.filter((p) => haversine(p.seed, cityCenter) > 30);
  const inCity = attractions.filter((p) => haversine(p.seed, cityCenter) <= 30);

  const target = Math.min(inCity.length, days * perDay + 6);
  const shortlist = inCity.slice(0, target);

  const musts = shortlist.filter((p) => meta.must_visit.some((m) => p.seed.name.includes(m) || m.includes(p.seed.name)));
  const rest = shortlist.filter((p) => !musts.includes(p));

  const clusters = kmeans(
    rest.map((p) => ({ ...p, lat: p.seed.lat, lng: p.seed.lng })),
    days,
  );

  type Cluster = { items: ScoredPoi[]; center: { lat: number; lng: number } };
  const clustersTyped: Cluster[] = clusters.map((group) => ({
    items: group as ScoredPoi[],
    center: centroid(group.map((g) => ({ lat: g.seed.lat, lng: g.seed.lng }))),
  }));

  // 必去点并入最近的簇
  for (const m of musts) {
    if (clustersTyped.length === 0) {
      clustersTyped.push({ items: [m], center: { lat: m.seed.lat, lng: m.seed.lng } });
      continue;
    }
    let best = 0;
    let bestD = Infinity;
    clustersTyped.forEach((c, i) => {
      const d = Math.hypot(c.center.lat - m.seed.lat, c.center.lng - m.seed.lng);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    clustersTyped[best].items.unshift(m);
  }

  // 按离住宿的远近排序：最近的一片放第一天（抵达日不宜远行）
  clustersTyped.sort(
    (a, b) =>
      Math.hypot(a.center.lat - lodging.lat, a.center.lng - lodging.lng) -
      Math.hypot(b.center.lat - lodging.lat, b.center.lng - lodging.lng),
  );

  const plans: DayPlan[] = [];
  const used = new Set<string>();
  const leftovers: ScoredPoi[] = [];

  for (let i = 0; i < days; i++) {
    const cluster = clustersTyped[i % Math.max(1, clustersTyped.length)];
    const pool = cluster ? cluster.items : [];
    const picked: ScoredPoi[] = [];
    const catCount: Record<string, number> = {};
    for (const item of pool) {
      if (picked.length >= perDay) break;
      if (used.has(item.seed.poi_id)) continue;
      const closedToday = research.closedOn[item.seed.poi_id]?.includes(dates[i]);
      if (closedToday) continue;
      const cat = item.seed.category;
      if ((catCount[cat] ?? 0) >= 2) continue;
      catCount[cat] = (catCount[cat] ?? 0) + 1;
      picked.push(item);
      used.add(item.seed.poi_id);
    }
    // 某天点不够时，从全局按分数补
    if (picked.length < 2) {
      for (const item of inCity) {
        if (picked.length >= 2) break;
        if (used.has(item.seed.poi_id)) continue;
        if (research.closedOn[item.seed.poi_id]?.includes(dates[i])) continue;
        picked.push(item);
        used.add(item.seed.poi_id);
      }
    }

    // 保底：一天不能只有夜市。凑够 2 个白天可去的点，否则这一天会从傍晚才开始。
    const refCenter = picked.length
      ? centroid(picked.map((p) => ({ lat: p.seed.lat, lng: p.seed.lng })))
      : cluster?.center ?? { lat: lodging.lat, lng: lodging.lng };
    const daytime = () => picked.filter((p) => toMin(p.seed.open) < toMin('17:00'));
    if (daytime().length < 2) {
      const backup = inCity
        .filter((p) => !used.has(p.seed.poi_id))
        .filter((p) => !research.closedOn[p.seed.poi_id]?.includes(dates[i]))
        .filter((p) => toMin(p.seed.open) < toMin('17:00'))
        .map((p) => ({ p, d: Math.hypot(p.seed.lat - refCenter.lat, p.seed.lng - refCenter.lng) }))
        .sort((a, b) => a.d - b.d);
      for (const { p } of backup) {
        if (daytime().length >= 2 || picked.length >= perDay) break;
        picked.push(p);
        used.add(p.seed.poi_id);
      }
    }
    const area = picked.length > 0 ? picked[0].seed.area : cityOf(meta.city_code).lodging.area;
    plans.push({
      date: dates[i],
      day_index: i + 1,
      poi_ids: picked.map((p) => p.seed.poi_id),
      base_area: area,
      centroid: picked.length
        ? centroid(picked.map((p) => ({ lat: p.seed.lat, lng: p.seed.lng })))
        : cluster?.center ?? { lat: lodging.lat, lng: lodging.lng },
    });
  }

  for (const item of dayTrips) {
    leftovers.push({ ...item, reasons: ['郊县一日游 · 需要单独安排一天', ...item.reasons] });
  }
  for (const item of inCity) {
    if (!used.has(item.seed.poi_id)) leftovers.push(item);
  }

  return { plans, leftovers, research };
}

export function dayWeekday(date: string): number {
  return weekdayOf(date);
}
