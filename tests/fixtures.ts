import type { Day, Itinerary, ItineraryItem, Meta } from '../src/domain/schema';

export function makeItem(over: Partial<ItineraryItem> = {}): ItineraryItem {
  return {
    id: 'd1-i1',
    type: 'activity',
    poi_id: 'CD01',
    name: '宽窄巷子',
    lat: 30.669,
    lng: 104.0533,
    category: 'sight',
    start_time: '09:00',
    end_time: '11:00',
    duration_min: 120,
    cost: { amount: 0, currency: 'CNY', type: 'ticket' },
    opening_hours: { open: '00:00', close: '23:59', closed_days: [], confidence: 'verified' },
    booking_required: false,
    booked: false,
    locked: false,
    mode: null,
    from_item_id: null,
    to_item_id: null,
    distance_m: null,
    notes: null,
    weather_sensitive: true,
    ...over,
  };
}

export function makeMeta(over: Partial<Meta> = {}): Meta {
  return {
    destination: '成都',
    city_code: 'chengdu',
    country: 'CN',
    start_date: '2026-05-01',
    end_date: '2026-05-02',
    timezone: 'Asia/Shanghai',
    travelers: { adults: 2, children: 0 },
    origin_city: '深圳',
    budget: { amount: 6000, currency: 'CNY', includes_flights: false },
    pace: 'moderate',
    interests: ['food', 'nature'],
    mobility: 'normal',
    must_visit: [],
    avoid: [],
    source: { type: 'chat', file_ref: null },
    ...over,
  };
}

export function makeDay(over: Partial<Day> = {}): Day {
  const items = over.items ?? [makeItem()];
  return {
    date: '2026-05-01',
    day_index: 1,
    base_area: { name: '宽窄巷子', lat: 30.669, lng: 104.0533 },
    lodging: { name: '春熙路酒店', lat: 30.6571, lng: 104.0802, cost: { amount: 420, currency: 'CNY', type: 'lodging' } },
    items,
    summary: {
      activity_min: items.filter((i) => i.type !== 'transit').reduce((s, i) => s + i.duration_min, 0),
      transit_min: items.filter((i) => i.type === 'transit').reduce((s, i) => s + i.duration_min, 0),
      active_min: items.reduce((s, i) => s + i.duration_min, 0),
      cost: { amount: items.reduce((s, i) => s + i.cost.amount, 0) + 420, currency: 'CNY', by_type: {} },
      poi_count: items.filter((i) => i.poi_id && i.type !== 'transit').length,
      max_leg_km: 0,
    },
    ...over,
  };
}

export function makeItinerary(over: Partial<Itinerary> = {}): Itinerary {
  const days = over.days ?? [makeDay()];
  return {
    id: 'itin_test',
    version: 1,
    parent_id: null,
    variant_label: null,
    created_at: '2026-04-01T00:00:00Z',
    updated_at: '2026-04-01T00:00:00Z',
    meta: makeMeta(),
    days,
    unscheduled: [],
    warnings: [],
    feasibility: null,
    assumptions: [],
    ...over,
  };
}

export const NO_WEATHER = { weather: [], weatherSource: 'none' as const };
