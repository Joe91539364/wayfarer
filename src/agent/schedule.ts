import type { Candidate, Day, ItineraryItem, Meta } from '../domain/schema';
import { PACES } from '../domain/schema';
import {
  estimateTransitMinutes,
  nearestNeighborOrder,
  pickMode,
  roadKm,
  haversine,
  type LatLng,
} from '../domain/geo';
import { addMin, fromMin, toMin, weekdayLabel } from '../domain/time';
import { recomputeDaySummary } from '../domain/summary';
import { poisByCity, type PoiSeed } from '../data/pois';
import { pickLodging, type ResearchResult } from './research';
import type { DayPlan } from './outline';

const PACE_DURATION_FACTOR = { relaxed: 1.15, moderate: 1, packed: 0.9 } as const;

export interface ScheduleResult {
  days: Day[];
  unscheduled: Candidate[];
  skipped: { poi_id: string; name: string; reason: string }[];
}

function transitCost(mode: string, km: number): number {
  switch (mode) {
    case 'walk':
      return 0;
    case 'taxi':
      return Math.round(10 + km * 2.6);
    case 'subway':
    case 'bus':
      return 4;
    case 'train':
      return Math.round(20 + km * 0.45);
    default:
      return 0;
  }
}

function money(amount: number, type: 'ticket' | 'meal' | 'lodging' | 'transit' | 'other') {
  return { amount: Math.round(amount), currency: 'CNY', type } as const;
}

function toItemBase(seed: PoiSeed, adults: number) {
  return {
    poi_id: seed.poi_id,
    name: seed.name,
    lat: seed.lat,
    lng: seed.lng,
    category: seed.category,
    opening_hours: {
      open: seed.open,
      close: seed.close,
      closed_days: seed.closed_days,
      confidence: seed.hours_confidence,
    },
    booking_required: seed.booking_required,
    booked: false,
    locked: false,
    mode: null,
    from_item_id: null,
    to_item_id: null,
    distance_m: null,
    notes: seed.blurb,
    weather_sensitive: !seed.indoor,
    cost: money(seed.price * adults, seed.category === 'restaurant' || seed.category === 'cafe' ? 'meal' : 'ticket'),
  };
}

export function scheduleDays(meta: Meta, plans: DayPlan[], research: ResearchResult, lodgingOverride?: { name: string; lat: number; lng: number; price: number }): ScheduleResult {
  const lodging = lodgingOverride ?? pickLodging(meta.city_code);
  const all = poisByCity(meta.city_code);
  const byId = new Map(all.map((p) => [p.poi_id, p]));
  const restaurants = all.filter((p) => p.category === 'restaurant' || p.category === 'cafe');
  const cap = PACES[meta.pace].max_active_min_per_day;
  const factor = PACE_DURATION_FACTOR[meta.pace];
  const adults = meta.travelers.adults;
  const rooms = Math.max(1, Math.ceil(adults / 2));
  const unscheduled: Candidate[] = [];
  const skipped: { poi_id: string; name: string; reason: string }[] = [];
  const days: Day[] = [];

  plans.forEach((plan, planIdx) => {
    const items: ItineraryItem[] = [];
    let seq = 1;
    let tseq = 1;
    let cursor = toMin(planIdx === 0 ? '09:30' : '08:30');
    let prev: LatLng & { name: string } = { lat: lodging.lat, lng: lodging.lng, name: lodging.name };
    let activityMin = 0;
    let poiCount = 0;
    let lunchDone = false;
    let dinnerDone = false;
    const usedRestaurants = new Set<string>();

    const seeds = plan.poi_ids
      .map((id) => byId.get(id))
      .filter((x): x is PoiSeed => !!x)
      .sort((a, b) => {
        const aNight = toMin(a.open) >= toMin('17:00') ? 1 : 0;
        const bNight = toMin(b.open) >= toMin('17:00') ? 1 : 0;
        return aNight - bNight;
      });

    const dayGroup = seeds.filter((s) => toMin(s.open) < toMin('17:00'));
    const nightGroup = seeds.filter((s) => toMin(s.open) >= toMin('17:00'));
    const ordered = [...nearestNeighborOrder(dayGroup, prev), ...nearestNeighborOrder(nightGroup, prev)];

    const pushTransit = (from: LatLng & { name: string }, to: LatLng & { name: string }, departMin: number) => {
      const km = roadKm(from, to);
      const mode = pickMode(km);
      const mins = estimateTransitMinutes(km, mode);
      items.push({
        id: `d${plan.day_index}-t${tseq++}`,
        type: 'transit',
        poi_id: null,
        name: `${from.name} → ${to.name}`,
        lat: null,
        lng: null,
        category: null,
        start_time: fromMin(departMin),
        end_time: fromMin(departMin + mins),
        duration_min: mins,
        cost: money(transitCost(mode, km) * (mode === 'taxi' ? rooms : adults), 'transit'),
        opening_hours: null,
        booking_required: false,
        booked: false,
        locked: false,
        mode,
        from_item_id: null,
        to_item_id: null,
        distance_m: Math.round(km * 1000),
        notes: null,
        weather_sensitive: mode === 'walk',
      });
      return mins;
    };

    const pickRestaurant = (at: LatLng, clock: number, meal: 'lunch' | 'dinner'): PoiSeed | null => {
      const dur = meal === 'lunch' ? 60 : 75;
      const windowStart = meal === 'lunch' ? toMin('11:00') : toMin('17:00');
      const windowEnd = meal === 'lunch' ? toMin('14:30') : toMin('21:30');
      if (clock < windowStart || clock > windowEnd) return null;
      const candidates = restaurants
        .filter((r) => !usedRestaurants.has(r.poi_id))
        .filter((r) => {
          const o = toMin(r.open);
          const c = toMin(r.close);
          const closeMin = c < o ? c + 1440 : c;
          // 必须按真实用餐时长校验，否则「差 45 分钟打烊」的店会被排进去然后判 error
          return clock >= o && clock + dur <= closeMin;
        })
        .map((r) => ({ r, d: haversine(at, { lat: r.lat, lng: r.lng }) }))
        .sort((a, b) => a.d - b.d);
      return candidates[0]?.r ?? null;
    };

    const insertMeal = (meal: 'lunch' | 'dinner') => {
      const want = meal === 'lunch' ? Math.max(cursor, toMin('11:30')) : Math.max(cursor, toMin('17:30'));
      const r = pickRestaurant(prev, want, meal);
      if (!r) return false;
      const travel = estimateTransitMinutes(roadKm(prev, r), pickMode(roadKm(prev, r)));
      const start = want + travel;
      const dur = meal === 'lunch' ? 60 : 75;
      // 加上通勤后可能已经打烊，宁可不排这家
      const o = toMin(r.open);
      const c = toMin(r.close);
      const closeMin = c < o ? c + 1440 : c;
      if (start + dur > closeMin) return false;
      pushTransit(prev, { lat: r.lat, lng: r.lng, name: r.name }, want);
      items.push({
        id: `d${plan.day_index}-i${seq++}`,
        type: 'meal',
        ...toItemBase(r, adults),
        start_time: fromMin(start),
        end_time: fromMin(start + dur),
        duration_min: dur,
        cost: money(r.price * adults, 'meal'),
      } as ItineraryItem);
      usedRestaurants.add(r.poi_id);
      cursor = start + dur;
      activityMin += travel + dur;
      prev = { lat: r.lat, lng: r.lng, name: r.name };
      return true;
    };

    for (const seed of ordered) {
      const dur = Math.round(seed.duration_min * factor);
      const openMin = toMin(seed.open);
      const closeMin = toMin(seed.close) < openMin ? toMin(seed.close) + 1440 : toMin(seed.close);

      if (!lunchDone && cursor >= toMin('11:20') && cursor <= toMin('14:00')) {
        if (insertMeal('lunch')) lunchDone = true;
      }

      // 通勤必须在插入午餐之后计算：午餐会改变出发点
      const km = roadKm(prev, seed);
      const mode = pickMode(km);
      const travel = estimateTransitMinutes(km, mode);

      let depart = cursor;
      let arrive = depart + travel;
      if (arrive < openMin) {
        const wait = openMin - arrive;
        depart += wait;
        arrive = openMin;
      }

      if (activityMin + travel + dur > cap) {
        skipped.push({ poi_id: seed.poi_id, name: seed.name, reason: '超出当天体力上限' });
        continue;
      }
      if (poiCount >= PACES[meta.pace].max_poi_per_day) {
        skipped.push({ poi_id: seed.poi_id, name: seed.name, reason: `超过「${PACES[meta.pace].label}」每天 ${PACES[meta.pace].max_poi_per_day} 个点的上限` });
        continue;
      }
      if (arrive + dur > closeMin) {
        skipped.push({ poi_id: seed.poi_id, name: seed.name, reason: `打烊前放不下（${seed.open}–${seed.close}）` });
        continue;
      }

      pushTransit(prev, seed, depart);
      items.push({
        id: `d${plan.day_index}-i${seq++}`,
        type: 'activity',
        ...toItemBase(seed, adults),
        start_time: fromMin(arrive),
        end_time: fromMin(arrive + dur),
        duration_min: dur,
      } as ItineraryItem);
      cursor = arrive + dur;
      activityMin += travel + dur;
      poiCount += 1;
      prev = { lat: seed.lat, lng: seed.lng, name: seed.name };
    }

    if (!lunchDone) {
      if (insertMeal('lunch')) lunchDone = true;
    }
    if (!dinnerDone && cursor >= toMin('16:30')) {
      if (insertMeal('dinner')) dinnerDone = true;
    }

    const day: Day = {
      date: plan.date,
      day_index: plan.day_index,
      base_area: { name: plan.base_area, lat: plan.centroid.lat, lng: plan.centroid.lng },
      lodging: {
        name: lodging.name,
        lat: lodging.lat,
        lng: lodging.lng,
        cost: money(lodging.price * rooms, 'lodging'),
      },
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
    days.push(recomputeDaySummary(day));
  });

  for (const s of skipped) {
    const seed = byId.get(s.poi_id);
    if (!seed) continue;
    unscheduled.push({
      poi_id: seed.poi_id,
      name: seed.name,
      lat: seed.lat,
      lng: seed.lng,
      category: seed.category,
      reason: s.reason,
      suggested_duration_min: seed.duration_min,
      cost: money(seed.price, 'ticket'),
      indoor: seed.indoor,
      interest_tags: seed.tags,
      rating: seed.rating,
      opening_hours: {
        open: seed.open,
        close: seed.close,
        closed_days: seed.closed_days,
        confidence: seed.hours_confidence,
      },
      booking_required: seed.booking_required,
    });
  }

  for (const left of research.pool.slice(0, 40)) {
    if (unscheduled.some((u) => u.poi_id === left.seed.poi_id)) continue;
    if (days.some((d) => d.items.some((i) => i.poi_id === left.seed.poi_id))) continue;
    const seed = left.seed;
    unscheduled.push({
      poi_id: seed.poi_id,
      name: seed.name,
      lat: seed.lat,
      lng: seed.lng,
      category: seed.category,
      reason:
        seed.category === 'restaurant' || seed.category === 'cafe'
          ? '备选餐厅'
          : left.reasons[0] ?? '备选景点',
      suggested_duration_min: seed.duration_min,
      cost: money(seed.price, seed.category === 'restaurant' ? 'meal' : 'ticket'),
      indoor: seed.indoor,
      interest_tags: seed.tags,
      rating: seed.rating,
      opening_hours: {
        open: seed.open,
        close: seed.close,
        closed_days: seed.closed_days,
        confidence: seed.hours_confidence,
      },
      booking_required: seed.booking_required,
    });
  }

  return { days, unscheduled: dedupe(unscheduled), skipped };
}

function dedupe(list: Candidate[]): Candidate[] {
  const seen = new Set<string>();
  return list.filter((c) => {
    if (seen.has(c.poi_id)) return false;
    seen.add(c.poi_id);
    return true;
  });
}

export function dayLabel(day: Day): string {
  return `第 ${day.day_index} 天 · ${weekdayLabel(day.date)}`;
}
