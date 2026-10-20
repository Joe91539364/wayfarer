export interface LatLng {
  lat: number;
  lng: number;
}

const R = 6371.0088;

export function haversine(a: LatLng, b: LatLng): number {
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** 城市内导航距离通常比直线距离长 25%~45%，取 1.32 作为经验绕路系数。 */
export const DETOUR_FACTOR = 1.32;

export function roadKm(a: LatLng, b: LatLng): number {
  return haversine(a, b) * DETOUR_FACTOR;
}

export const SPEED_KMH: Record<string, number> = {
  walk: 4.4,
  bike: 12,
  subway: 28,
  bus: 17,
  taxi: 22,
  drive: 24,
  train: 120,
  flight: 700,
};

export function pickMode(km: number): string {
  if (km <= 1.4) return 'walk';
  if (km <= 22) return 'taxi';
  if (km <= 90) return 'train';
  return 'train';
}

export function estimateTransitMinutes(km: number, mode: string): number {
  const speed = SPEED_KMH[mode] ?? 20;
  const overhead = mode === 'walk' ? 0 : mode === 'taxi' ? 6 : 12;
  return Math.max(2, Math.round((km / speed) * 60 + overhead));
}

export function centroid(points: LatLng[]): LatLng {
  if (points.length === 0) return { lat: 0, lng: 0 };
  const lat = points.reduce((s, p) => s + p.lat, 0) / points.length;
  const lng = points.reduce((s, p) => s + p.lng, 0) / points.length;
  return { lat, lng };
}

export function bbox(points: LatLng[], padRatio = 0.12) {
  if (points.length === 0) {
    return { minLat: 0, maxLat: 1, minLng: 0, maxLng: 1 };
  }
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  for (const p of points) {
    minLat = Math.min(minLat, p.lat);
    maxLat = Math.max(maxLat, p.lat);
    minLng = Math.min(minLng, p.lng);
    maxLng = Math.max(maxLng, p.lng);
  }
  const spanLat = Math.max(maxLat - minLat, 0.01);
  const spanLng = Math.max(maxLng - minLng, 0.01);
  return {
    minLat: minLat - spanLat * padRatio,
    maxLat: maxLat + spanLat * padRatio,
    minLng: minLng - spanLng * padRatio,
    maxLng: maxLng + spanLng * padRatio,
  };
}

export type Box = ReturnType<typeof bbox>;

export function makeProjector(box: Box, width: number, height: number) {
  const latSpan = box.maxLat - box.minLat || 1;
  const lngSpan = box.maxLng - box.minLng || 1;
  const scale = Math.min(width / lngSpan, height / latSpan);
  const offsetX = (width - lngSpan * scale) / 2;
  const offsetY = (height - latSpan * scale) / 2;
  return (p: LatLng) => ({
    x: offsetX + (p.lng - box.minLng) * scale,
    y: offsetY + (box.maxLat - p.lat) * scale,
  });
}

/** 确定性 k-means（固定种子，保证同样输入产出同样结果，便于单测与 diff）。 */
export function kmeans<T extends LatLng>(items: T[], k: number, iterations = 24): T[][] {
  if (items.length === 0) return [];
  const groups = Math.max(1, Math.min(k, items.length));
  const sorted = [...items].sort((a, b) => a.lng - b.lng || a.lat - b.lat);
  const centers: LatLng[] = [];
  for (let i = 0; i < groups; i++) {
    const idx = Math.min(sorted.length - 1, Math.round(((i + 0.5) / groups) * sorted.length));
    centers.push({ lat: sorted[idx].lat, lng: sorted[idx].lng });
  }
  let assignment = new Array(items.length).fill(0);
  for (let iter = 0; iter < iterations; iter++) {
    let changed = false;
    items.forEach((item, i) => {
      let best = 0;
      let bestD = Infinity;
      centers.forEach((c, ci) => {
        const d = haversine(item, c);
        if (d < bestD) {
          bestD = d;
          best = ci;
        }
      });
      if (assignment[i] !== best) {
        assignment[i] = best;
        changed = true;
      }
    });
    for (let ci = 0; ci < centers.length; ci++) {
      const members = items.filter((_, i) => assignment[i] === ci);
      if (members.length > 0) centers[ci] = centroid(members);
    }
    if (!changed) break;
  }
  const out: T[][] = Array.from({ length: groups }, () => []);
  items.forEach((item, i) => out[assignment[i]].push(item));
  return out.filter((g) => g.length > 0);
}

/** 最近邻排序：从一个起点出发，每次去最近的未访问点。 */
export function nearestNeighborOrder<T extends LatLng>(items: T[], start: LatLng): T[] {
  const remaining = [...items];
  const ordered: T[] = [];
  let cursor = start;
  while (remaining.length > 0) {
    let bestIdx = 0;
    let bestD = Infinity;
    remaining.forEach((item, i) => {
      const d = haversine(cursor, item);
      if (d < bestD) {
        bestD = d;
        bestIdx = i;
      }
    });
    const next = remaining.splice(bestIdx, 1)[0];
    ordered.push(next);
    cursor = next;
  }
  return ordered;
}

export function maxPairwiseKm(points: LatLng[]): number {
  let max = 0;
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      max = Math.max(max, haversine(points[i], points[j]));
    }
  }
  return max;
}
