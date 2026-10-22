import { describe, expect, it } from 'vitest';
import { inheritParsed, type ParsedIntake } from '../src/domain/replan';
import { makeDay, makeItinerary, makeMeta } from './fixtures';

function parsed(over: Partial<ParsedIntake['meta']> & { missing?: string[] }): ParsedIntake {
  const { missing, ...metaOver } = over;
  return {
    meta: makeMeta({ start_date: '2026-10-25', end_date: '2026-10-27', ...metaOver }),
    missing: missing ?? [],
  };
}

/** 当前行程：杭州 → 临汾，3 天（对应截图场景：改需求想去成都） */
function hangzhouLinfen() {
  return makeItinerary({
    meta: makeMeta({
      destination: '临汾',
      city_code: 'dynamic:临汾',
      origin_city: '杭州',
      start_date: '2026-10-20',
      end_date: '2026-10-22',
    }),
    days: [makeDay({ day_index: 1, date: '2026-10-20' }), makeDay({ day_index: 2, date: '2026-10-21' }), makeDay({ day_index: 3, date: '2026-10-22' })],
  });
}

describe('REPLAN > inheritParsed', () => {
  it('换了目的地：出发地不许悄悄沿用，回到缺失列表让确认卡问', () => {
    // 用户原话「五一想去成都玩4天」——没说出发地，不能拿上一趟的杭州来填
    const p = parsed({ destination: '成都', city_code: 'chengdu', origin_city: '', missing: ['origin'] });
    inheritParsed(p, hangzhouLinfen());
    expect(p.meta.origin_city).toBe('');
    expect(p.missing).toContain('origin');
  });

  it('同一趟行程改天数/日期：出发地沿用，不被追问', () => {
    const p = parsed({ destination: '', city_code: '', origin_city: '', missing: ['origin', 'destination', 'days'] });
    inheritParsed(p, hangzhouLinfen());
    expect(p.meta.destination).toBe('临汾');
    expect(p.meta.origin_city).toBe('杭州');
    expect(p.missing).not.toContain('origin');
    expect(p.missing).not.toContain('destination');
  });

  it('目的地显式重说且没换：出发地照样沿用', () => {
    const p = parsed({ destination: '临汾', city_code: 'dynamic:临汾', origin_city: '', missing: ['origin'] });
    inheritParsed(p, hangzhouLinfen());
    expect(p.meta.origin_city).toBe('杭州');
    expect(p.missing).not.toContain('origin');
  });

  it('天数继承：span 取当前行程天数并把结束日期平移对齐', () => {
    const p = parsed({ missing: ['days', 'start_date'] });
    inheritParsed(p, hangzhouLinfen());
    expect(p.meta.start_date).toBe('2026-10-20');
    expect(p.meta.end_date).toBe('2026-10-22');
  });

  it('没有当前行程时什么都不动', () => {
    const p = parsed({ origin_city: '', missing: ['origin', 'destination'] });
    inheritParsed(p, null);
    expect(p.meta.origin_city).toBe('');
    expect(p.missing).toContain('origin');
  });
});
