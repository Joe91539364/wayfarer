import { describe, expect, it } from 'vitest';
import { resolveDayEdits } from '../src/agent/conflict';
import { registerCityPack } from '../src/data/pois';
import chongqing from '../data/city-packs/重庆.json';
import { toMin } from '../src/domain/time';
import type { Day, Itinerary, ItineraryItem, Meta } from '../src/domain/schema';

const pack = chongqing as unknown as { city: Parameters<typeof registerCityPack>[0]; pois: Parameters<typeof registerCityPack>[1] };
registerCityPack(pack.city, pack.pois);

function item(
  name: string,
  start: string,
  end: string,
  extra: Partial<ItineraryItem> = {},
): ItineraryItem {
  return {
    id: `i-${name}`,
    type: 'meal' === extra.type ? 'meal' : 'activity',
    poi_id: `p-${name}`,
    name,
    lat: 29.56,
    lng: 106.57,
    category: (extra.category as ItineraryItem['category']) ?? 'sight',
    start_time: start,
    end_time: end,
    duration_min: toMin(end) - toMin(start),
    cost: { amount: 0, currency: 'CNY', type: 'ticket' },
    opening_hours: null,
    booking_required: false,
    booked: false,
    locked: false,
    mode: null,
    from_item_id: null,
    to_item_id: null,
    distance_m: null,
    notes: null,
    weather_sensitive: false,
    ...extra,
  } as ItineraryItem;
}

function day(items: ItineraryItem[], dayIndex = 1): Day {
  return {
    date: `2026-11-0${dayIndex + 4}`,
    day_index: dayIndex,
    base_area: { name: '渝中区', lat: 29.56, lng: 106.57 },
    lodging: { name: '测试酒店', lat: 29.56, lng: 106.57, cost: { amount: 600, currency: 'CNY', type: 'lodging' } },
    items,
    summary: {
      activity_min: 0,
      transit_min: 0,
      active_min: 0,
      cost: { amount: 0, currency: 'CNY', by_type: {} },
      poi_count: 0,
      max_leg_km: 0,
    },
  } as unknown as Day;
}

function itin(days: Day[]): Itinerary {
  const meta = {
    destination: '重庆',
    city_code: 'amap-500000',
    country: 'CN',
    start_date: '2026-11-05',
    end_date: '2026-11-07',
    timezone: 'Asia/Shanghai',
    travelers: { adults: 2, children: 0 },
    origin_city: '成都',
    budget: { amount: 6000, currency: 'CNY', includes_flights: false },
    pace: 'moderate',
    interests: ['food'],
    mobility: 'normal',
    must_visit: [],
    avoid: [],
    source: { type: 'chat', file_ref: null },
  } as unknown as Meta;
  return {
    id: 't',
    version: 1,
    parent_id: null,
    variant_label: null,
    created_at: '',
    updated_at: '',
    meta,
    days,
    unscheduled: [],
    warnings: [],
    feasibility: null,
    assumptions: [],
  } as unknown as Itinerary;
}

describe('CONFLICT > 手动改完之后把冲突收拾掉', () => {
  it('撞闭园：18:30 到博物馆但 18:00 关门 → 挪到次日并说明', () => {
    const trip = itin([
      day([item('博物馆', '18:30', '19:30', { opening_hours: { open: '09:00', close: '18:00', closed_days: [], confidence: 'verified' } })], 1),
      day([item('解放碑', '09:30', '10:30')], 2),
    ]);
    const { itin: fixed, fixes } = resolveDayEdits(trip, 1);
    const closed = fixes.find((f) => f.code === 'closed');
    expect(closed?.auto).toBe(true);
    expect(closed?.text).toContain('闭园');
    expect(fixed.days[0].items.some((i) => i.name === '博物馆')).toBe(false);
    expect(fixed.days[1].items.some((i) => i.name === '博物馆')).toBe(true);
  });

  it('收工太晚：排到 23:10 → 把最后一项挪走', () => {
    const trip = itin([
      day([item('晚饭', '18:00', '19:00', { type: 'meal', category: 'restaurant' }), item('洪崖洞', '22:00', '23:10')], 1),
      day([item('解放碑', '09:30', '10:30')], 2),
    ]);
    const { itin: fixed, fixes } = resolveDayEdits(trip, 1);
    expect(fixes.some((f) => f.code === 'late')).toBe(true);
    expect(fixed.days[0].items.some((i) => i.name === '洪崖洞')).toBe(false);
    expect(fixed.days[1].items.some((i) => i.name === '洪崖洞')).toBe(true);
  });

  it('饭点被挤掉：删了午饭 → 就近补一顿正经餐厅，不是咖啡', () => {
    const trip = itin([day([item('磁器口', '09:30', '12:10'), item('晚饭', '17:30', '18:40', { type: 'meal', category: 'restaurant' })])]);
    const { itin: fixed, fixes } = resolveDayEdits(trip, 1);
    const mealFix = fixes.find((f) => f.code === 'meal');
    expect(mealFix?.auto).toBe(true);
    const meals = fixed.days[0].items.filter((i) => i.type === 'meal');
    expect(meals.length).toBe(2);
    expect(meals.every((m) => m.category === 'restaurant')).toBe(true);
    // 补的这顿是两个人的钱，不是一个人的
    const added = meals.find((m) => m.notes?.includes('补上'))!;
    expect(added.cost.amount).toBeGreaterThan(40);
  });

  it('跨度太散：只提示，不擅自搬东西', () => {
    const far = item('铁山坪', '15:00', '17:00', { lat: 29.86, lng: 106.7 });
    const trip = itin([day([item('解放碑', '09:30', '11:00'), item('午饭', '11:30', '12:30', { type: 'meal', category: 'restaurant' }), far])]);
    const { itin: fixed, fixes } = resolveDayEdits(trip, 1);
    const hint = fixes.find((f) => f.code === 'geo');
    expect(hint?.auto).toBe(false);
    expect(fixed.days[0].items.some((i) => i.name === '铁山坪')).toBe(true);
  });

  it('没冲突：一行说明都不生成', () => {
    const trip = itin([
      day([
        item('解放碑', '09:30', '11:00'),
        item('午饭', '11:40', '12:40', { type: 'meal', category: 'restaurant' }),
        item('晚饭', '17:40', '18:40', { type: 'meal', category: 'restaurant' }),
      ]),
    ]);
    const { fixes } = resolveDayEdits(trip, 1);
    expect(fixes.filter((f) => f.auto)).toHaveLength(0);
  });
});
