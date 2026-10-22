import { describe, expect, it } from 'vitest';
import { intake } from '../src/agent/intake';
import { makeOutline } from '../src/agent/outline';
import { scheduleDays } from '../src/agent/schedule';
import { repair } from '../src/agent/repair';
import { whatIf, diffItineraries, totalOf } from '../src/agent/whatif';
import { importFromText, parseLines } from '../src/agent/importer';
import { localChecks } from '../src/agent/understand';
import { verify } from '../src/verifier';
import { recomputeItinerary } from '../src/domain/summary';
import { dateList } from '../src/domain/time';
import { makeDay, makeItem, makeItinerary, makeMeta, NO_WEATHER } from './fixtures';

describe('INTAKE', () => {
  it('parses a complete request', () => {
    const r = intake('五一想去成都玩4天，两个人，预算6000，喜欢吃的和自然风光，不想太赶');
    expect(r.meta.city_code).toBe('chengdu');
    expect(dateList(r.meta.start_date, r.meta.end_date)).toHaveLength(4);
    expect(r.meta.budget.amount).toBe(6000);
    expect(r.meta.travelers.adults).toBe(2);
    expect(r.meta.pace).toBe('relaxed');
    expect(r.meta.interests).toContain('food');
    expect(r.meta.interests).toContain('nature');
    // 没说出发地 → 必须标出来让用户补，不许默认「深圳出发」
    expect(r.missing).toContain('origin');
    expect(r.missing).not.toContain('destination');
    expect(r.missing).not.toContain('start_date');
  });

  it('reports missing fields instead of inventing them silently', () => {
    const r = intake('下周出去玩');
    expect(r.missing).toContain('destination');
    expect(r.missing).toContain('budget');
    expect(r.notes.length).toBeGreaterThan(0);
    expect(r.meta.budget.amount).toBe(5000);
  });

  it('detects packed pace and must-visit', () => {
    const r = intake('西安3天，一个人，3000块，能暴走，一定要去兵马俑');
    expect(r.meta.pace).toBe('packed');
    expect(r.meta.travelers.adults).toBe(1);
    expect(r.meta.must_visit.join('')).toContain('兵马俑');
  });

  it('handles 6k budget notation', () => {
    expect(intake('厦门3天预算6k').meta.budget.amount).toBe(6000);
  });

  it('「从 X 去 Y」句式能抓到出发地', () => {
    // 用户原话：从宿迁去成都 —— 旧版只认「从 X 出发」，漏掉后误报「缺出发地」
    const r = intake('五一想从宿迁去成都玩4天，两个人，预算6000，喜欢吃的和自然风光，不想太赶');
    expect(r.meta.origin_city).toBe('宿迁');
    expect(r.missing).not.toContain('origin');
  });

  it('出发地的各种说法都能识别', () => {
    expect(intake('从南京出发去苏州玩2天').meta.origin_city).toBe('南京');
    expect(intake('出发地是杭州，去厦门玩3天').meta.origin_city).toBe('杭州');
    expect(intake('从江苏宿迁去西安玩3天').meta.origin_city).toBe('宿迁');
    expect(intake('宿迁 → 成都，4天，两个人，预算6000').meta.origin_city).toBe('宿迁');
    expect(intake('我人在西安，想去成都玩3天，预算6000').meta.origin_city).toBe('西安');
    expect(intake('住在武汉，十一想去北京玩4天，预算8000').meta.origin_city).toBe('武汉');
  });

  it('时间状语和「自由行」不会被当成出发地', () => {
    expect(intake('从去年开始想去成都玩3天').meta.origin_city).toBe('');
    expect(intake('想自由行去成都玩3天，预算6000').meta.origin_city).toBe('');
    // 没抓到就老实报缺失，不许瞎猜
    expect(intake('从去年开始想去成都玩3天').missing).toContain('origin');
  });

  it('「去 X」的目的地优先于全文命中的内置城市（用户原话：从杭州去临汾）', () => {
    // 旧版 findCity(全文) 命中内置的杭州就把目的地定成杭州，临汾整个被丢掉 → 「杭州 → 杭州」
    const r = intake('五一想从杭州去临汾玩玩，四个人，预算10000，喜欢吃和自然');
    expect(r.meta.destination).toBe('临汾');
    expect(r.meta.city_code).toBe('dynamic:临汾');
    expect(r.meta.origin_city).toBe('杭州');
  });

  it('「去」内置城市仍走内置包，POI 名不抢城市位', () => {
    // 「去」的是内置城市 → 用内置包
    const r = intake('从南京出发去苏州玩2天');
    expect(r.meta.destination).toBe('苏州');
    // 「去西湖边玩」抓到的是景点不是城市 → 保留内置命中的杭州
    const r2 = intake('从杭州去西湖边玩3天');
    expect(r2.meta.destination).toBe('杭州');
  });
});

describe('OUTLINE + SCHEDULE', () => {
  const meta = makeMeta({
    start_date: '2026-05-01',
    end_date: '2026-05-04',
    interests: ['food', 'nature', 'history'],
  });

  it('clusters days and fills a POI per day', () => {
    const outline = makeOutline(meta);
    expect(outline.plans).toHaveLength(4);
    expect(outline.plans.every((p) => p.poi_ids.length > 0)).toBe(true);
  });

  it('produces zero time overlaps by construction', () => {
    const outline = makeOutline(meta);
    const sched = scheduleDays(meta, outline.plans, outline.research);
    const itin = recomputeItinerary(
      makeItinerary({
        meta,
        days: sched.days,
        unscheduled: sched.unscheduled,
      }),
    );
    const res = verify(itin, NO_WEATHER);
    expect(res.errors.filter((v) => v.code === 'TIME_OVERLAP')).toHaveLength(0);
    expect(sched.days.every((d) => d.items.length > 0)).toBe(true);
  });

  it('inserts transit entries between activities', () => {
    const outline = makeOutline(meta);
    const sched = scheduleDays(meta, outline.plans, outline.research);
    for (const day of sched.days) {
      const activities = day.items.filter((i) => i.type !== 'transit');
      const transits = day.items.filter((i) => i.type === 'transit');
      expect(transits.length).toBe(Math.max(0, activities.length));
    }
  });

  it('keeps every item inside its opening hours when possible', () => {
    const outline = makeOutline(meta);
    const sched = scheduleDays(meta, outline.plans, outline.research);
    for (const day of sched.days) {
      for (const item of day.items) {
        if (!item.opening_hours || item.type === 'transit') continue;
        expect(item.start_time >= item.opening_hours.open || item.opening_hours.open === '00:00').toBe(true);
      }
    }
  });
});

describe('REPAIR', () => {
  it('fixes overlaps down to zero errors', () => {
    const itin = recomputeItinerary(
      makeItinerary({
        days: [
          makeDay({
            items: [
              makeItem({ id: 'd1-i1', start_time: '09:00', end_time: '11:00', duration_min: 120 }),
              makeItem({ id: 'd1-i2', lat: 30.67, start_time: '10:00', end_time: '11:30', duration_min: 90 }),
            ],
          }),
        ],
      }),
    );
    const res = repair(itin, NO_WEATHER, 3);
    expect(res.unresolved).toHaveLength(0);
    expect(verify(res.itinerary, NO_WEATHER).errors).toHaveLength(0);
  });

  it('never moves a locked item', () => {
    const itin = recomputeItinerary(
      makeItinerary({
        days: [
          makeDay({
            items: [
              makeItem({ id: 'd1-i1', locked: true, start_time: '09:00', end_time: '11:00', duration_min: 120 }),
              makeItem({ id: 'd1-i2', lat: 30.67, start_time: '10:00', end_time: '11:30', duration_min: 90 }),
            ],
          }),
        ],
      }),
    );
    const res = repair(itin, NO_WEATHER, 3);
    const locked = res.itinerary.days[0].items.find((i) => i.id === 'd1-i1');
    expect(locked?.start_time).toBe('09:00');
    expect(locked?.end_time).toBe('11:00');
  });

  it('cuts cost when over budget', () => {
    const itin = recomputeItinerary(
      makeItinerary({
        meta: makeMeta({ budget: { amount: 500, currency: 'CNY', includes_flights: false } }),
        days: [
          makeDay({
            items: [
              makeItem({ cost: { amount: 400, currency: 'CNY', type: 'ticket' } }),
              makeItem({ id: 'd1-i2', lat: 30.67, start_time: '11:30', end_time: '13:00', cost: { amount: 300, currency: 'CNY', type: 'ticket' } }),
            ],
          }),
        ],
      }),
    );
    const res = repair(itin, NO_WEATHER, 3);
    expect(totalOf(res.itinerary)).toBeLessThanOrEqual(totalOf(itin));
  });

  it('respects the round limit', () => {
    const itin = recomputeItinerary(makeItinerary());
    const res = repair(itin, NO_WEATHER, 1);
    expect(res.rounds.length).toBeLessThanOrEqual(1);
  });
});

describe('WHAT-IF', () => {
  const build = () => {
    const meta = makeMeta({ start_date: '2026-05-01', end_date: '2026-05-03', budget: { amount: 6000, currency: 'CNY', includes_flights: false } });
    const outline = makeOutline(meta);
    const sched = scheduleDays(meta, outline.plans, outline.research);
    return recomputeItinerary(makeItinerary({ meta, days: sched.days, unscheduled: sched.unscheduled }));
  };

  it('produces a cheaper branch when budget is cut', () => {
    const base = build();
    const r = whatIf(base, 'budget', NO_WEATHER, { budget: 2000 });
    expect(totalOf(r.itinerary)).toBeLessThanOrEqual(totalOf(base));
    expect(r.diff.some((d) => d.type !== 'same')).toBe(true);
  });

  it('swaps outdoor items when it rains', () => {
    const base = build();
    const r = whatIf(base, 'rain', {
      weather: base.days.map((d) => ({ date: d.date, precip_prob: 10, temp_max: 26, temp_min: 20, text: '晴', source: 'simulated' as const })),
      weatherSource: 'simulated',
    }, { dayIndex: 1 });
    expect(r.itinerary.days[0]).toBeTruthy();
    expect(r.headline).toContain('暴雨');
  });

  it('diff marks removed and added entries', () => {
    const before = makeItinerary({ days: [makeDay({ items: [makeItem({ name: 'A' }), makeItem({ id: 'd1-i2', name: 'B' })] })] });
    const after = makeItinerary({ days: [makeDay({ items: [makeItem({ name: 'A' }), makeItem({ id: 'd1-i2', name: 'C' })] })] });
    const diff = diffItineraries(before, after);
    expect(diff.find((d) => d.text === 'B')?.type).toBe('removed');
    expect(diff.find((d) => d.text === 'C')?.type).toBe('added');
  });
});

describe('IMPORT', () => {
  it('parses day headers and times', () => {
    const lines = parseLines(`Day 1 5/1
09:00 宽窄巷子 120分钟
14:00 武侯祠

Day 2
09:30 成都博物馆`);
    expect(lines).toHaveLength(3);
    expect(lines[0].start).toBe('09:00');
    expect(lines[0].duration).toBe(120);
    expect(lines[2].day).toBe(2);
  });

  it('matches POI names and reports unmatched entries', () => {
    const meta = makeMeta();
    const text = `Day 1
09:00 宽窄巷子 120分钟
11:30 马旺子川菜馆
14:00 武侯祠 90分钟
16:00 天空之镜`;
    const result = importFromText(text, meta, (x) => verify(x, NO_WEATHER));
    expect(result.report.total).toBe(4);
    expect(result.report.matched).toBe(3);
    expect(result.report.unmatched.map((u) => u.name)).toContain('天空之镜');
  });

  it('flags real problems in an imported plan', () => {
    const meta = makeMeta();
    const text = `Day 1
09:00 武侯祠 90分钟
10:00 宽窄巷子 120分钟`;
    const result = importFromText(text, meta, (x) => verify(x, NO_WEATHER));
    expect(result.report.issues.some((i) => i.code === 'TIME_OVERLAP')).toBe(true);
  });
});

describe('UNDERSTAND 表达推算（本地确定性部分）', () => {
  it('预算少个量级 + 指代不明，都要报', () => {
    const issues = localChecks('去成都玩四天 预算三十 主要去那边逛逛', {
      days: 4,
      travelers: { adults: 1 },
      budget: { amount: 30 },
    });
    expect(issues.length).toBe(2);
    expect(issues.some((i) => i.problem?.includes('少写了个 0'))).toBe(true);
    expect(issues.some((i) => i.quote === '那边')).toBe(true);
  });

  it('表达清楚就不打扰', () => {
    const issues = localChecks('预算七千 主要去吃美食', {
      days: 3,
      travelers: { adults: 1 },
      budget: { amount: 7000 },
    });
    expect(issues).toHaveLength(0);
  });

  it('预算大得反常也要报', () => {
    const issues = localChecks('一个人去成都玩两天 预算二十万', {
      days: 2,
      travelers: { adults: 1 },
      budget: { amount: 200000 },
    });
    expect(issues.length).toBe(1);
    expect(issues[0].problem!).toContain('单位写错');
  });
});
