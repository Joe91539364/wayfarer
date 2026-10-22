import type { Day, Itinerary, ItineraryItem } from '../domain/schema';
import { estimateTransitMinutes, pickMode, roadKm } from '../domain/geo';
import { addMin, fromMin, toMin } from '../domain/time';
import { recomputeDaySummary } from '../domain/summary';

export interface ReflowOptions {
  startClock: string;
  lodging: { name: string; lat: number; lng: number };
  keepTransit?: boolean;
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

/**
 * 重排一天：按现有顺序，从住宿出发重新计算每一段通勤与时间。
 * 这是「时间由程序算」的唯一入口 —— 任何结构性改动后都必须走这里。
 */
export function reflowDay(day: Day, opts: ReflowOptions): Day {
  const activities = day.items.filter((i) => i.type !== 'transit');
  const items: ItineraryItem[] = [];
  let cursor = toMin(opts.startClock);
  let prev = { lat: opts.lodging.lat, lng: opts.lodging.lng, name: opts.lodging.name };
  let tseq = 1;

  for (const item of activities) {
    const lat = item.lat ?? prev.lat;
    const lng = item.lng ?? prev.lng;
    const km = roadKm(prev, { lat, lng });
    const mode = item.mode && item.type !== 'activity' ? item.mode : pickMode(km);
    const travel = estimateTransitMinutes(km, mode);
    const dur = item.duration_min || 30;

    if (item.locked) {
      const lockStart = toMin(item.start_time);
      if (lockStart > cursor) {
        items.push({
          id: `d${day.day_index}-t${tseq++}`,
          type: 'transit',
          poi_id: null,
          name: `${prev.name} → ${item.name}`,
          lat: null,
          lng: null,
          category: null,
          start_time: fromMin(cursor),
          end_time: fromMin(lockStart),
          duration_min: lockStart - cursor,
          cost: { amount: 0, currency: 'CNY', type: 'transit' },
          opening_hours: null,
          booking_required: false,
          booked: false,
          locked: false,
          mode,
          from_item_id: null,
          to_item_id: null,
          distance_m: Math.round(km * 1000),
          notes: null,
          weather_sensitive: false,
        });
      }
      items.push({ ...item });
      cursor = lockStart + dur;
      prev = { lat, lng, name: item.name };
      continue;
    }

    let start = cursor + travel;
    // 饭点是**时间锚**：重排只许把它往后推，不许提前。
    // 否则删掉上午一个点，晚饭会被压到 13:45 —— 那不是「重算了时间」，那是把饭点弄丢了。
    if (item.type === 'meal') {
      const anchor = toMin(item.start_time);
      if (start < anchor) start = anchor;
    }
    if (item.opening_hours && item.opening_hours.confidence !== 'unknown') {
      const openMin = toMin(item.opening_hours.open);
      if (start < openMin) start = openMin;
    }

    items.push({
      id: `d${day.day_index}-t${tseq++}`,
      type: 'transit',
      poi_id: null,
      name: `${prev.name} → ${item.name}`,
      lat: null,
      lng: null,
      category: null,
      start_time: fromMin(Math.max(cursor, start - travel)),
      end_time: fromMin(start),
      duration_min: travel,
      cost: { amount: transitCost(mode, km), currency: 'CNY', type: 'transit' },
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

    items.push({
      ...item,
      start_time: fromMin(start),
      end_time: fromMin(start + dur),
      duration_min: dur,
    });
    cursor = start + dur;
    prev = { lat, lng, name: item.name };
  }

  return recomputeDaySummary({ ...day, items });
}

export function reflowItinerary(itin: Itinerary): Itinerary {
  const lodgingOf = (day: Day) =>
    day.lodging ?? { name: '住宿', lat: 30.657, lng: 104.066 };
  return {
    ...itin,
    days: itin.days.map((day, i) =>
      reflowDay(day, {
        startClock: i === 0 ? '09:30' : '08:30',
        lodging: lodgingOf(day),
      }),
    ),
  };
}
