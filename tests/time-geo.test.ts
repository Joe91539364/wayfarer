import { describe, expect, it } from 'vitest';
import {
  addDays,
  addMin,
  dateList,
  durationMin,
  fromMin,
  parseFlexibleTime,
  toMin,
  weekdayOf,
} from '../src/domain/time';
import { estimateTransitMinutes, haversine, kmeans, pickMode, roadKm } from '../src/domain/geo';

describe('time', () => {
  it('toMin/fromMin roundtrip', () => {
    for (const t of ['00:00', '08:30', '11:45', '23:59']) {
      expect(fromMin(toMin(t))).toBe(t);
    }
  });

  it('fromMin wraps around midnight', () => {
    expect(fromMin(1440)).toBe('00:00');
    expect(fromMin(1500)).toBe('01:00');
    expect(fromMin(-30)).toBe('23:30');
  });

  it('durationMin handles cross-midnight', () => {
    expect(durationMin('09:00', '11:30')).toBe(150);
    expect(durationMin('23:30', '00:30')).toBe(60);
  });

  it('addMin clamps into a day', () => {
    expect(addMin('23:00', 120)).toBe('01:00');
  });

  it('weekdayOf is correct', () => {
    expect(weekdayOf('2026-05-01')).toBe(5);
    expect(weekdayOf('2026-05-04')).toBe(1);
  });

  it('dateList is inclusive', () => {
    expect(dateList('2026-05-01', '2026-05-04')).toEqual([
      '2026-05-01',
      '2026-05-02',
      '2026-05-03',
      '2026-05-04',
    ]);
  });

  it('addDays crosses months', () => {
    expect(addDays('2026-05-31', 1)).toBe('2026-06-01');
  });

  it('parseFlexibleTime accepts common formats', () => {
    expect(parseFlexibleTime('9:30')).toBe('09:30');
    expect(parseFlexibleTime('09：30')).toBe('09:30');
    expect(parseFlexibleTime('9点30')).toBe('09:30');
    expect(parseFlexibleTime('0930')).toBe('09:30');
    expect(parseFlexibleTime('abc')).toBeNull();
  });
});

describe('geo', () => {
  it('haversine gives plausible city distance', () => {
    const d = haversine({ lat: 30.657, lng: 104.066 }, { lat: 34.261, lng: 108.945 });
    expect(d).toBeGreaterThan(580);
    expect(d).toBeLessThan(700);
  });

  it('roadKm applies detour factor', () => {
    const a = { lat: 30.657, lng: 104.066 };
    const b = { lat: 30.669, lng: 104.0533 };
    expect(roadKm(a, b)).toBeCloseTo(haversine(a, b) * 1.32, 5);
  });

  it('pickMode prefers walking for short hops', () => {
    expect(pickMode(0.8)).toBe('walk');
    expect(pickMode(6)).toBe('taxi');
    expect(pickMode(50)).toBe('train');
  });

  it('transit estimate grows monotonically', () => {
    expect(estimateTransitMinutes(1, 'walk')).toBeLessThan(estimateTransitMinutes(3, 'walk'));
    expect(estimateTransitMinutes(10, 'taxi')).toBeLessThan(estimateTransitMinutes(30, 'taxi'));
  });

  it('kmeans is deterministic for the same input', () => {
    const pts = [
      { lat: 30.66, lng: 104.05, id: 'a' },
      { lat: 30.67, lng: 104.06, id: 'b' },
      { lat: 30.9, lng: 103.57, id: 'c' },
      { lat: 30.91, lng: 103.58, id: 'd' },
    ];
    const a = kmeans(pts, 2).map((g) => g.map((x) => x.id).sort());
    const b = kmeans(pts, 2).map((g) => g.map((x) => x.id).sort());
    expect(a).toEqual(b);
  });
});
