import { describe, expect, it } from 'vitest';
import { solarTimes } from '../src/domain/solar';
import { clockInTz, minutesUntil, toMin, tripPhase, tzOffsetMin } from '../src/domain/time';

/** 把 HH:MM 换成分钟，方便比误差 */
const m = (s: string) => toMin(s);

describe('SOLAR > 日出日落', () => {
  it('北京 5 月 1 日：日出 05:16 日落 19:07 左右（实测口径）', () => {
    const s = solarTimes('2026-05-01', 39.9042, 116.4074, 480);
    expect(s).not.toBeNull();
    expect(Math.abs(m(s!.sunrise) - m('05:16'))).toBeLessThanOrEqual(4);
    expect(Math.abs(m(s!.sunset) - m('19:07'))).toBeLessThanOrEqual(4);
    expect(s!.goldenStart).toBe('18:09');
  });

  it('东京用 JST(+9)：日出 04:48 日落 18:29 左右', () => {
    const s = solarTimes('2026-05-01', 35.68, 139.65, 540);
    expect(Math.abs(m(s!.sunrise) - m('04:48'))).toBeLessThanOrEqual(4);
    expect(Math.abs(m(s!.sunset) - m('18:29'))).toBeLessThanOrEqual(4);
  });

  it('同一时区里，靠西的拉萨日出明显更晚', () => {
    const bj = solarTimes('2026-05-01', 39.9, 116.4, 480)!;
    const ls = solarTimes('2026-05-01', 29.65, 91.1, 480)!;
    expect(m(ls.sunrise) - m(bj.sunrise)).toBeGreaterThan(90);
  });

  it('极昼没有日出日落，返回 null 而不是瞎算', () => {
    expect(solarTimes('2026-06-21', 78.2, 15.6, 60)).toBeNull();
  });

  it('坐标或日期非法时不炸', () => {
    expect(solarTimes('2026-05-01', NaN, 116, 480)).toBeNull();
    expect(solarTimes('bad-date', 30, 104, 480)).toBeNull();
  });
});

describe('CLOCK > 时区与行程阶段', () => {
  it('东八区偏移是 480 分钟', () => {
    expect(tzOffsetMin(new Date('2026-05-01T16:30:00Z'), 'Asia/Shanghai')).toBe(480);
    expect(tzOffsetMin(new Date('2026-05-01T16:30:00Z'), 'Asia/Tokyo')).toBe(540);
  });

  it('跨日换算：UTC 16:30 在东八区是次日 00:30', () => {
    const f = clockInTz(new Date('2026-05-01T16:30:00Z'), 'Asia/Shanghai');
    expect(f.date).toBe('2026-05-02');
    expect(f.hhmm).toBe('00:30');
    expect(f.weekday).toBe('周六');
  });

  it('行程阶段：出发前 / 进行中第几天 / 已结束', () => {
    expect(tripPhase('2026-05-01', '2026-05-04', '2026-04-28')).toEqual({ phase: 'before', days: 3, dayIndex: 0 });
    expect(tripPhase('2026-05-01', '2026-05-04', '2026-05-02')).toEqual({ phase: 'during', days: 0, dayIndex: 2 });
    expect(tripPhase('2026-05-01', '2026-05-04', '2026-05-06')).toEqual({ phase: 'after', days: 2, dayIndex: 0 });
  });

  it('距下一项还有多少分钟', () => {
    expect(minutesUntil('14:32', '15:00')).toBe(28);
    expect(minutesUntil('14:32', '14:00')).toBe(-32);
  });
});
