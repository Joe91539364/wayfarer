import type { Day, Itinerary, ItineraryItem } from './schema';
import { maxPairwiseKm } from './geo';
import { durationMin } from './time';

export function itemCost(item: ItineraryItem): number {
  return item.cost?.amount ?? 0;
}

export function recomputeDaySummary(day: Day): Day {
  const byType: Record<string, number> = {};
  let activity = 0;
  let transit = 0;
  let poiCount = 0;
  let maxLeg = 0;
  for (const item of day.items) {
    const dur = item.duration_min || durationMin(item.start_time, item.end_time);
    if (item.type === 'transit') {
      transit += dur;
      if (item.distance_m) maxLeg = Math.max(maxLeg, item.distance_m / 1000);
    } else {
      activity += dur;
      if (item.poi_id && item.type === 'activity') poiCount += 1;
    }
    const amount = itemCost(item);
    if (amount > 0) {
      const key = item.cost.type || 'other';
      byType[key] = (byType[key] ?? 0) + amount;
    }
  }
  if (day.lodging?.cost?.amount) {
    byType.lodging = (byType.lodging ?? 0) + day.lodging.cost.amount;
    activity += 0;
  }
  const total =
    Object.values(byType).reduce((s, v) => s + v, 0) + 0;
  const geoPoints = day.items
    .filter((i) => i.lat != null && i.lng != null)
    .map((i) => ({ lat: i.lat as number, lng: i.lng as number }));
  const geoMax = geoPoints.length > 1 ? maxPairwiseKm(geoPoints) : 0;
  return {
    ...day,
    summary: {
      activity_min: activity,
      transit_min: transit,
      active_min: activity + transit,
      cost: { amount: total, currency: 'CNY', by_type: byType },
      poi_count: poiCount,
      max_leg_km: Math.max(maxLeg, Number(geoMax.toFixed(2))),
    },
  };
}

export function recomputeItinerary(itin: Itinerary): Itinerary {
  return {
    ...itin,
    days: itin.days.map(recomputeDaySummary),
    updated_at: new Date().toISOString(),
  };
}

export function itineraryTotalCost(itin: Itinerary): number {
  return itin.days.reduce((sum, day) => {
    const dayTotal = day.items.reduce((s, i) => s + itemCost(i), 0);
    const lodging = day.lodging?.cost?.amount ?? 0;
    return sum + dayTotal + lodging;
  }, 0);
}

export function costBreakdown(itin: Itinerary): Record<string, number> {
  const out: Record<string, number> = {};
  for (const day of itin.days) {
    for (const item of day.items) {
      const amount = itemCost(item);
      if (amount <= 0) continue;
      const key = item.cost.type || 'other';
      out[key] = (out[key] ?? 0) + amount;
    }
    if (day.lodging?.cost?.amount) {
      out.lodging = (out.lodging ?? 0) + day.lodging.cost.amount;
    }
  }
  return out;
}

export function totalTransitMin(itin: Itinerary): number {
  return itin.days.reduce(
    (s, d) => s + d.items.filter((i) => i.type === 'transit').reduce((a, i) => a + i.duration_min, 0),
    0,
  );
}

export function allItems(itin: Itinerary): ItineraryItem[] {
  return itin.days.flatMap((d) => d.items);
}

export function findItem(itin: Itinerary, id: string): { day: Day; item: ItineraryItem; index: number } | null {
  for (const day of itin.days) {
    const index = day.items.findIndex((i) => i.id === id);
    if (index >= 0) return { day, item: day.items[index], index };
  }
  return null;
}

export function cnMoney(n: number): string {
  return `¥${Math.round(n).toLocaleString('zh-CN')}`;
}
