import { describe, expect, it } from 'vitest';
import { registerCityPack } from '../src/data/pois';
import chongqing from '../data/city-packs/重庆.json';
import { makeOutline } from '../src/agent/outline';
import { scheduleDays } from '../src/agent/schedule';
import { applyBudget } from '../src/agent/budget';
import { interestCoverage, mealPerDay, unmetInterests } from '../src/domain/coverage';
import { recomputeItinerary } from '../src/domain/summary';
import { buildContext } from '../src/agent/orchestrator';
import { repair } from '../src/agent/repair';
import type { Itinerary, Meta } from '../src/domain/schema';

const pack = chongqing as unknown as { city: Parameters<typeof registerCityPack>[0]; pois: Parameters<typeof registerCityPack>[1] };
registerCityPack(pack.city, pack.pois);

function makeItinerary(interests: string[]): Itinerary {
  const meta = {
    destination: '重庆',
    city_code: 'amap-500000',
    country: 'CN',
    start_date: '2026-11-06',
    end_date: '2026-11-08',
    timezone: 'Asia/Shanghai',
    travelers: { adults: 2, children: 0 },
    origin_city: '杭州',
    budget: { amount: 6000, currency: 'CNY', includes_flights: false },
    pace: 'moderate',
    interests,
    mobility: 'normal',
    must_visit: [],
    avoid: [],
    source: { type: 'chat', file_ref: null },
  } as unknown as Meta;
  const outline = makeOutline(meta);
  const sched = scheduleDays(meta, outline.plans, outline.research);
  applyBudget(meta, sched.days);
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

describe('COVERAGE > 说了想玩什么，面板上要对得上账', () => {
  it('说想吃好的：美食一栏至少 3 项且不算缺', () => {
    const itin = makeItinerary(['food']);
    const rows = interestCoverage(itin);
    const food = rows.find((r) => r.key === 'food');
    expect(food, '美食这一行应该在').toBeTruthy();
    expect(food!.want).toBe(true);
    expect(food!.count).toBeGreaterThanOrEqual(3);
    expect(food!.enough).toBe(true);
    expect(unmetInterests(rows)).toHaveLength(0);
  });

  it('用户点的兴趣排在没点的前面', () => {
    const rows = interestCoverage(makeItinerary(['food']));
    const firstUnwanted = rows.findIndex((r) => !r.want);
    if (firstUnwanted >= 0) {
      expect(rows.slice(firstUnwanted).every((r) => !r.want)).toBe(true);
    }
  });

  it('没提到的冷门兴趣不算「缺」', () => {
    const rows = interestCoverage(makeItinerary(['food']));
    const hot = rows.find((r) => r.key === 'hot_spring');
    if (hot) expect(hot.enough || !hot.want).toBe(true);
    expect(unmetInterests(rows).map((r) => r.key)).not.toContain('hot_spring');
  });

  it('每天正餐数是可查的账：至少 2 顿', () => {
    const perDay = mealPerDay(makeItinerary(['food']));
    expect(perDay).toHaveLength(3);
    for (const d of perDay) expect(d.meals, `D${d.day}`).toBeGreaterThanOrEqual(2);
  });

  it('一个饭都没排时会被判为「没落实」', () => {
    const itin = makeItinerary(['food']);
    itin.days = itin.days.map((d) => ({ ...d, items: d.items.filter((i) => i.type !== 'meal') }));
    const rows = interestCoverage(itin);
    expect(unmetInterests(rows).map((r) => r.key)).toContain('food');
  });

  it('修复器不许拿晚饭抵账：节奏/地理润色不能删饭', () => {
    const itin = makeItinerary(['food', 'nature']);
    const meta = itin.meta;
    const ctx = buildContext(meta);
    const before = mealPerDay(itin).map((m) => m.meals);
    const res = repair(itin, ctx, 3);
    const after = mealPerDay(res.itinerary).map((m) => m.meals);
    for (let i = 0; i < after.length; i++) {
      expect(after[i], `D${i + 1} 修复后正餐数`).toBeGreaterThanOrEqual(before[i]);
    }
  });
});
