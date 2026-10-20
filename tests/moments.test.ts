import { describe, expect, it } from 'vitest';
import { groupByDay, letterHtml, momentStats, moodWord, type Moment } from '../src/domain/moments';
import { makeDay, makeItinerary } from './fixtures';

function m(over: Partial<Moment> = {}): Moment {
  return {
    id: over.id ?? 'm1',
    file: `${over.id ?? 'm1'}.jpg`,
    trip_id: over.trip_id ?? 't1',
    caption: over.caption ?? '',
    stars: over.stars ?? 3,
    day: over.day ?? null,
    poi_id: over.poi_id,
    poi_name: over.poi_name,
    taken_at: over.taken_at ?? '2026-11-02T10:00:00.000Z',
    created_at: over.created_at ?? 1,
    size: over.size ?? 1000,
  };
}

const iti = makeItinerary({
  id: 't1',
  days: [makeDay({ day_index: 1, date: '2026-11-02' }), makeDay({ day_index: 2, date: '2026-11-03' })],
});

describe('MOMENTS 分组', () => {
  it('按天的序号升序排，不按字符串', () => {
    const list = [m({ id: 'c', day: 10 }), m({ id: 'a', day: 2 }), m({ id: 'b', day: 9 })];
    expect(groupByDay(list, null).map((g) => g.day)).toEqual([2, 9, 10]);
  });

  it('没归到某一天的放最后', () => {
    const list = [m({ id: 'loose', day: null }), m({ id: 'x', day: 1 })];
    const g = groupByDay(list, iti);
    expect(g.map((x) => x.day)).toEqual([1, null]);
    expect(g[1].title).toContain('还没归');
  });

  it('同一天内按拍摄时间排', () => {
    const list = [
      m({ id: 'late', day: 1, taken_at: '2026-11-02T18:00:00.000Z' }),
      m({ id: 'early', day: 1, taken_at: '2026-11-02T08:00:00.000Z' }),
    ];
    expect(groupByDay(list, iti)[0].items.map((x) => x.id)).toEqual(['early', 'late']);
  });

  it('空列表不炸', () => {
    expect(groupByDay([], iti)).toEqual([]);
  });
});

describe('MOMENTS 统计', () => {
  it('平均分保留一位小数', () => {
    const s = momentStats([m({ stars: 5 }), m({ stars: 4 }), m({ stars: 4 })]);
    expect(s.count).toBe(3);
    expect(s.avg).toBe(4.3);
    expect(s.word).toBe('很幸福');
  });

  it('没有照片时平均分是 0，不显示 NaN', () => {
    const s = momentStats([]);
    expect(s.avg).toBe(0);
    expect(s.count).toBe(0);
    expect(Number.isNaN(s.avg)).toBe(false);
  });

  it('点位去重计数', () => {
    const s = momentStats([m({ poi_id: 'P1' }), m({ poi_id: 'P1' }), m({ poi_id: 'P2' }), m({ poi_id: undefined })]);
    expect(s.spots).toBe(2);
  });

  it('分数说法随分数变', () => {
    expect(moodWord(0)).toBe('还没开始');
    expect(moodWord(2)).toBe('有点平淡');
    expect(moodWord(5)).toBe('想再去一次');
  });
});

describe('MOMENTS 回忆长页', () => {
  const groups = groupByDay(
    [m({ id: 'p1', day: 1, stars: 5, caption: '面端上来的一刻' }), m({ id: 'p2', day: 2, stars: 3 })],
    iti,
  );
  const html = letterHtml(iti, groups, 'http://127.0.0.1:8787');

  it('图片用绝对地址，新标签页里才加载得到', () => {
    expect(html).toContain('http://127.0.0.1:8787/api/moments/file/p1.jpg');
  });

  it('带上城市、日期区间和一句原话', () => {
    expect(html).toContain(iti.meta.destination);
    expect(html).toContain('面端上来的一刻');
    expect(html).toContain('11月2日');
  });

  it('按天分段，两天各一段', () => {
    expect(html).toContain('第 1 天');
    expect(html).toContain('第 2 天');
  });

  it('转义 <script>，不至于把用户写的一句话当代码跑', () => {
    const bad = groupByDay([m({ id: 'x', day: 1, caption: '<script>alert(1)</script>' })], iti);
    const out = letterHtml(iti, bad, 'http://x');
    expect(out).not.toContain('<script>alert(1)</script>');
    expect(out).toContain('&lt;script&gt;');
  });

  it('没有照片也出得了一张空页，不是白屏', () => {
    const out = letterHtml(iti, [], 'http://x');
    expect(out).toContain('还没有照片');
  });
});
