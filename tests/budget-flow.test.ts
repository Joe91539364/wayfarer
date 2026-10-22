import { describe, expect, it } from 'vitest';
import { registerCityPack } from '../src/data/pois';
import chongqing from '../data/city-packs/重庆.json';
import { makeOutline } from '../src/agent/outline';
import { scheduleDays } from '../src/agent/schedule';
import { applyBudget, setBudget, totalSpend } from '../src/agent/budget';
import type { Meta } from '../src/domain/schema';

const pack = chongqing as unknown as { city: Parameters<typeof registerCityPack>[0]; pois: Parameters<typeof registerCityPack>[1] };
registerCityPack(pack.city, pack.pois);

function makeMeta(): Meta {
  return {
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
    interests: ['food', 'nature'],
    mobility: 'normal',
    must_visit: [],
    avoid: [],
    source: { type: 'chat', file_ref: null },
  } as unknown as Meta;
}

describe('BUDGET > 预算要花完，意愿要当真', () => {
  it('说了想吃好的：每天至少两顿正餐，且不是 ¥0 的酒店餐厅充数', () => {
    const meta = makeMeta();
    const outline = makeOutline(meta);
    const sched = scheduleDays(meta, outline.plans, outline.research);
    for (const d of sched.days) {
      const meals = d.items.filter((i) => i.type === 'meal');
      expect(meals.length, `D${d.day_index} 正餐数`).toBeGreaterThanOrEqual(2);
      for (const m of meals) {
        // 数据缺价时按餐标估算，不能显示 ¥0
        expect(m.cost.amount, `${m.name} 不该是 0 元饭`).toBeGreaterThan(0);
      }
      // 市区两天不该拿酒店餐厅凑数；郊区（D3 铁山坪）实在没店才允许兜底
      const urbanMeals = sched.days.slice(0, 2).flatMap((d) => d.items.filter((i) => i.type === 'meal'));
      expect(urbanMeals.some((m) => /酒店|宾馆/.test(m.name)), '市区不该排酒店餐厅').toBe(false);
    }
  });

  it('餐厅跨天不重样：三天别顿顿同一家火锅', () => {
    const meta = makeMeta();
    const outline = makeOutline(meta);
    const sched = scheduleDays(meta, outline.plans, outline.research);
    const lunches = sched.days.map((d) => d.items.find((i) => i.type === 'meal')?.poi_id ?? '');
    expect(new Set(lunches).size, `午餐重复: ${lunches.join(',')}`).toBe(lunches.length);
  });

  it('预算利用率 ≥ 65%：住宿升档 + 用餐升级把大头花掉', () => {
    const meta = makeMeta();
    const outline = makeOutline(meta);
    const sched = scheduleDays(meta, outline.plans, outline.research);
    const { spent } = applyBudget(meta, sched.days);
    expect(spent / meta.budget.amount).toBeGreaterThanOrEqual(0.65);
  });

  it('升档绝不超预算，且住宿确实变贵了', () => {
    const meta = makeMeta();
    const outline = makeOutline(meta);
    const sched = scheduleDays(meta, outline.plans, outline.research);
    const before = sched.days[0].lodging?.cost.amount ?? 0;
    const { days, spent } = applyBudget(meta, sched.days);
    expect(spent).toBeLessThanOrEqual(meta.budget.amount);
    expect(days[0].lodging?.cost.amount ?? 0).toBeGreaterThan(before);
    expect(days[0].lodging?.name ?? '').toContain('行政楼层');
  });
});

describe('BUDGET > 手动改预算档位', () => {
  function budgetedDays() {
    const meta = makeMeta();
    const outline = makeOutline(meta);
    const sched = scheduleDays(meta, outline.plans, outline.research);
    applyBudget(meta, sched.days);
    return { meta, days: sched.days };
  }

  it('升档：预算调大后重新升住宿，仍不超新预算', () => {
    const { meta, days } = budgetedDays();
    const before = totalSpend(days).total;
    const res = setBudget(meta, days, 9000);
    expect(res.spent).toBeGreaterThan(before);
    expect(res.spent).toBeLessThanOrEqual(9000);
    expect(meta.budget.amount).toBe(9000);
  });

  it('降档：住宿让出多出来的钱，摘掉「行政楼层」，不超新预算', () => {
    const { meta, days } = budgetedDays();
    const res = setBudget(meta, days, 4000);
    const { total } = totalSpend(days);
    expect(total).toBeLessThanOrEqual(4000);
    expect(days[0].lodging?.name ?? '').not.toContain('行政楼层');
    expect(res.notes.join('；')).toContain('预算下调');
  });

  it('砍到连票饭钱都盖不住：明说超支，不动既成开销', () => {
    const { meta, days } = budgetedDays();
    const { other } = totalSpend(days);
    const res = setBudget(meta, days, Math.floor(other * 0.5));
    expect(res.notes.join('；')).toContain('盖不住');
    // 餐饮门票没被偷偷删掉
    expect(totalSpend(days).other).toBe(other);
  });
});
