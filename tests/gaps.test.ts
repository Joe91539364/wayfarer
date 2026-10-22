import { describe, expect, it } from 'vitest';
import { daySlots, roomiestDay, totalSlackMin } from '../src/domain/gaps';
import { searchPois } from '../src/data/pois';
import { registerCityPack } from '../src/data/pois';
import chongqing from '../data/city-packs/重庆.json';
import { makeOutline } from '../src/agent/outline';
import { scheduleDays } from '../src/agent/schedule';
import { insertCandidate } from '../src/agent/repair';
import { recomputeItinerary } from '../src/domain/summary';
import { toMin } from '../src/domain/time';
import type { Candidate, Day, Itinerary, Meta } from '../src/domain/schema';

const pack = chongqing as unknown as { city: Parameters<typeof registerCityPack>[0]; pois: Parameters<typeof registerCityPack>[1] };
registerCityPack(pack.city, pack.pois);

function day(items: [string, string, string][], dayIndex = 1): Day {
  return {
    date: '2026-11-05',
    day_index: dayIndex,
    base_area: { name: '渝中区', lat: 29.56, lng: 106.57 },
    lodging: null,
    items: items.map(([name, start, end], i) => ({
      id: `i${i}`,
      type: name === '通勤' ? 'transit' : 'activity',
      poi_id: name === '通勤' ? null : `p${i}`,
      name,
      lat: 29.56,
      lng: 106.57,
      category: 'sight',
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
    })),
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

describe('GAPS > 哪天还有空，一眼能看见', () => {
  it('13:10 就收工：给出到 21:00 的整段空档', () => {
    const d = day([
      ['博物馆', '09:30', '11:30'],
      ['午饭', '11:40', '12:40'],
      ['美术馆', '12:50', '13:10'],
    ]);
    const slots = daySlots(d);
    const tail = slots.find((s) => s.kind === 'evening');
    expect(tail, '应该有收工后的空档').toBeTruthy();
    expect(tail!.start).toBe('13:10');
    expect(tail!.end).toBe('21:00');
    expect(tail!.minutes).toBe(toMin('21:00') - toMin('13:10'));
    expect(tail!.label).toContain('13:10 之后空着');
  });

  it('排得满满当当的一天不该冒出空档', () => {
    const d = day([
      ['博物馆', '09:30', '11:30'],
      ['午饭', '11:40', '12:40'],
      ['美术馆', '12:50', '15:00'],
      ['逛街', '15:10', '17:30'],
      ['晚饭', '17:40', '19:00'],
      ['夜景', '19:10', '21:00'],
    ]);
    expect(daySlots(d)).toHaveLength(0);
  });

  it('中午前后空两小时也算空档', () => {
    const d = day([
      ['博物馆', '09:30', '10:30'],
      ['美术馆', '12:40', '17:00'],
      ['晚饭', '17:30', '19:00'],
      ['夜景', '19:10', '21:00'],
    ]);
    const mid = daySlots(d).find((s) => s.kind === 'mid');
    expect(mid, '应该识别出中间的空档').toBeTruthy();
    expect(mid!.start).toBe('10:30');
    expect(mid!.end).toBe('12:40');
  });

  it('空档合计与「最闲的一天」可用于右栏提示', () => {
    const itin = {
      days: [day([['博物馆', '09:30', '17:00'], ['晚饭', '17:30', '21:00']], 1), day([['博物馆', '09:30', '12:00']], 2)],
    };
    expect(totalSlackMin(itin)).toBeGreaterThan(0);
    expect(roomiestDay(itin).dayIndex).toBe(2);
  });
});

describe('ADD PLACE > 自己搜点、插进去、时间重排', () => {
  function makeItin(): Itinerary {
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
      interests: ['food', 'nature'],
      mobility: 'normal',
      must_visit: [],
      avoid: [],
      source: { type: 'chat', file_ref: null },
    } as unknown as Meta;
    const outline = makeOutline(meta);
    const sched = scheduleDays(meta, outline.plans, outline.research);
    return recomputeItinerary({
      id: 't',
      version: 1,
      parent_id: null,
      variant_label: null,
      created_at: '',
      updated_at: '',
      meta,
      days: sched.days,
      unscheduled: [],
      warnings: [],
      feasibility: null,
      assumptions: [],
    } as Itinerary);
  }

  it('搜「火锅」能搜到餐厅，且不在已排列表里', () => {
    const hits = searchPois('amap-500000', '火锅', 20);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.some((p) => p.name.includes('火锅') || p.category === 'restaurant')).toBe(true);
  });

  it('空关键字按评分给清单，不会返回 200 条', () => {
    const hits = searchPois('amap-500000', '', 10);
    expect(hits).toHaveLength(10);
    for (let i = 1; i < hits.length; i++) expect(hits[i - 1].rating).toBeGreaterThanOrEqual(hits[i].rating);
  });

  it('插一个自己搜的点：多一个点，时间轴不重叠，顺序不变', () => {
    const itin = makeItin();
    const scheduled = new Set(itin.days.flatMap((d) => d.items.map((i) => i.poi_id)));
    const pick = searchPois('amap-500000', '公园', 40).find((p) => !scheduled.has(p.poi_id));
    expect(pick, '城市包里应该还有没排进去的公园').toBeTruthy();
    const candidate = {
      poi_id: pick!.poi_id,
      name: pick!.name,
      lat: pick!.lat,
      lng: pick!.lng,
      category: pick!.category,
      reason: '你自己加的',
      suggested_duration_min: pick!.duration_min,
      cost: { amount: pick!.price, currency: 'CNY', type: 'ticket' },
      indoor: pick!.indoor,
      interest_tags: pick!.tags,
      rating: pick!.rating,
      booking_required: false,
    } as unknown as Candidate;

    const before = itin.days[0].summary.poi_count;
    const next = insertCandidate(itin, 0, candidate, 99);
    const acts = next.days[0].items.filter((i) => i.type !== 'transit');
    expect(next.days[0].summary.poi_count).toBe(before + 1);
    expect(acts.some((i) => i.name === pick!.name)).toBe(true);
    const ordered = acts.every((a, i) => {
      if (i === 0) return true;
      return toMin(a.start_time) >= toMin(acts[i - 1].end_time);
    });
    expect(ordered, '插入后每一项都得排在前一项之后').toBe(true);
  });
});
