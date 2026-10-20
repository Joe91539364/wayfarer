import { describe, expect, it } from 'vitest';
import { verify, buildCertificate } from '../src/verifier';
import { recomputeItinerary } from '../src/domain/summary';
import { makeDay, makeItem, makeItinerary, makeMeta, NO_WEATHER } from './fixtures';

const prep = (itin: ReturnType<typeof makeItinerary>) => recomputeItinerary(itin);

describe('verifier: TIME_OVERLAP', () => {
  it('detects overlapping items', () => {
    const itin = prep(
      makeItinerary({
        days: [
          makeDay({
            items: [
              makeItem({ id: 'd1-i1', name: 'A', start_time: '09:00', end_time: '11:00', duration_min: 120 }),
              makeItem({ id: 'd1-i2', name: 'B', lat: 30.67, start_time: '10:30', end_time: '12:00', duration_min: 90 }),
            ],
          }),
        ],
      }),
    );
    const res = verify(itin, NO_WEATHER);
    const overlap = res.errors.filter((v) => v.code === 'TIME_OVERLAP');
    expect(overlap.length).toBe(1);
    expect(overlap[0].item_ids).toContain('d1-i2');
    expect(overlap[0].auto_fixable).toBe(true);
  });

  it('passes a contiguous timeline', () => {
    const itin = prep(
      makeItinerary({
        days: [
          makeDay({
            items: [
              makeItem({ id: 'd1-i1', start_time: '09:00', end_time: '11:00', duration_min: 120 }),
              makeItem({ id: 'd1-i2', lat: 30.67, start_time: '11:00', end_time: '12:00', duration_min: 60 }),
            ],
          }),
        ],
      }),
    );
    const res = verify(itin, NO_WEATHER);
    expect(res.errors.filter((v) => v.code === 'TIME_OVERLAP')).toHaveLength(0);
  });
});

describe('verifier: OUTSIDE_OPENING', () => {
  it('flags activities outside opening hours', () => {
    const itin = prep(
      makeItinerary({
        days: [
          makeDay({
            items: [
              makeItem({
                start_time: '09:00',
                end_time: '11:00',
                opening_hours: { open: '10:00', close: '17:00', closed_days: [], confidence: 'verified' },
              }),
            ],
          }),
        ],
      }),
    );
    const res = verify(itin, NO_WEATHER);
    const hit = res.errors.filter((v) => v.code === 'OUTSIDE_OPENING');
    expect(hit).toHaveLength(1);
    expect(hit[0].auto_fixable).toBe(true);
  });

  it('flags closed days', () => {
    const itin = prep(
      makeItinerary({
        days: [
          makeDay({
            date: '2026-05-04',
            items: [
              makeItem({
                start_time: '09:00',
                end_time: '11:00',
                opening_hours: { open: '00:00', close: '23:59', closed_days: [1], confidence: 'verified' },
              }),
            ],
          }),
        ],
      }),
    );
    const res = verify(itin, NO_WEATHER);
    expect(res.errors.filter((v) => v.code === 'OUTSIDE_OPENING')).toHaveLength(1);
  });

  it('does not flag venues that close after midnight', () => {
    const itin = prep(
      makeItinerary({
        days: [
          makeDay({
            date: '2026-05-01',
            items: [
              makeItem({
                name: '九眼桥',
                start_time: '19:30',
                end_time: '21:00',
                duration_min: 90,
                opening_hours: { open: '18:00', close: '02:00', closed_days: [], confidence: 'estimated' },
              }),
            ],
          }),
        ],
      }),
    );
    expect(verify(itin, NO_WEATHER).errors.filter((v) => v.code === 'OUTSIDE_OPENING')).toHaveLength(0);
  });

  it('flags a night venue scheduled in the morning', () => {
    const itin = prep(
      makeItinerary({
        days: [
          makeDay({
            items: [
              makeItem({
                name: '九眼桥',
                start_time: '10:00',
                end_time: '11:30',
                duration_min: 90,
                opening_hours: { open: '18:00', close: '02:00', closed_days: [], confidence: 'estimated' },
              }),
            ],
          }),
        ],
      }),
    );
    expect(verify(itin, NO_WEATHER).errors.filter((v) => v.code === 'OUTSIDE_OPENING')).toHaveLength(1);
  });

  it('treats unknown hours as unchecked instead of passing silently', () => {
    const itin = prep(
      makeItinerary({
        days: [
          makeDay({
            items: [
              makeItem({
                start_time: '03:00',
                end_time: '04:00',
                opening_hours: { open: '10:00', close: '17:00', closed_days: [], confidence: 'unknown' },
              }),
            ],
          }),
        ],
      }),
    );
    const res = verify(itin, NO_WEATHER);
    expect(res.errors.filter((v) => v.code === 'OUTSIDE_OPENING')).toHaveLength(0);
    const cert = buildCertificate(itin, NO_WEATHER, res);
    expect(cert.evidence.data_coverage.hours_known).toBe(0);
    expect(cert.evidence.data_coverage.hours_total).toBe(1);
  });
});

describe('verifier: GEO_SCATTER', () => {
  it('warns when a day spans too far', () => {
    const itin = prep(
      makeItinerary({
        days: [
          makeDay({
            items: [
              makeItem({ id: 'd1-i1', lat: 30.669, lng: 104.0533, start_time: '09:00', end_time: '11:00' }),
              makeItem({ id: 'd1-i2', lat: 31.0, lng: 103.6, start_time: '13:00', end_time: '15:00' }),
            ],
          }),
        ],
      }),
    );
    const res = verify(itin, NO_WEATHER);
    const hit = res.violations.filter((v) => v.code === 'GEO_SCATTER');
    expect(hit.length).toBeGreaterThan(0);
    expect(hit[0].suggestion).toContain('d1-i2');
    // 超过阈值两倍（市内 50km）应升级为 error，而不是仅仅提醒
    expect(hit[0].severity).toBe('error');
  });
});

describe('verifier: BUDGET_EXCEEDED', () => {
  it('flags over-budget itineraries', () => {
    const itin = prep(
      makeItinerary({
        meta: makeMeta({ budget: { amount: 100, currency: 'CNY', includes_flights: false } }),
        days: [
          makeDay({
            lodging: null,
            items: [makeItem({ cost: { amount: 300, currency: 'CNY', type: 'ticket' } })],
          }),
        ],
      }),
    );
    const res = verify(itin, NO_WEATHER);
    expect(res.errors.filter((v) => v.code === 'BUDGET_EXCEEDED')).toHaveLength(1);
  });

  it('passes when within budget', () => {
    const itin = prep(
      makeItinerary({
        days: [makeDay({ lodging: null, items: [makeItem({ cost: { amount: 10, currency: 'CNY', type: 'ticket' } })] })],
      }),
    );
    expect(verify(itin, NO_WEATHER).errors.filter((v) => v.code === 'BUDGET_EXCEEDED')).toHaveLength(0);
  });
});

describe('verifier: OVER_PACE', () => {
  it('warns when the day is too long', () => {
    const itin = prep(
      makeItinerary({
        days: [
          makeDay({
            items: [makeItem({ start_time: '08:00', end_time: '19:00', duration_min: 660 })],
          }),
        ],
      }),
    );
    const res = verify(itin, NO_WEATHER);
    expect(res.warnings.some((v) => v.code === 'OVER_PACE')).toBe(true);
  });

  it('respects relaxed pace limits', () => {
    const itin = prep(
      makeItinerary({
        meta: makeMeta({ pace: 'relaxed' }),
        days: [makeDay({ items: [makeItem({ start_time: '08:00', end_time: '15:00', duration_min: 420 })] })],
      }),
    );
    expect(verify(itin, NO_WEATHER).warnings.some((v) => v.code === 'OVER_PACE')).toBe(true);
  });
});

describe('verifier: BOOKING_RISK / WEATHER / TRANSIT', () => {
  it('emits booking info without failing the rule', () => {
    const itin = prep(
      makeItinerary({
        days: [makeDay({ items: [makeItem({ booking_required: true, booked: false })] })],
      }),
    );
    const res = verify(itin, NO_WEATHER);
    expect(res.infos.some((v) => v.code === 'BOOKING_RISK')).toBe(true);
    const cert = buildCertificate(itin, NO_WEATHER, res);
    expect(cert.rules.find((r) => r.code === 'BOOKING_RISK')?.passed).toBe(true);
  });

  it('flags outdoor items on rainy days', () => {
    const itin = prep(
      makeItinerary({
        days: [
          makeDay({
            date: '2026-05-01',
            items: [makeItem({ weather_sensitive: true, category: 'nature' })],
          }),
        ],
      }),
    );
    const ctx = {
      weather: [{ date: '2026-05-01', precip_prob: 90, temp_max: 24, temp_min: 18, text: '暴雨', source: 'simulated' as const }],
      weatherSource: 'simulated' as const,
    };
    expect(verify(itin, ctx).warnings.some((v) => v.code === 'WEATHER_CONFLICT')).toBe(true);
  });

  it('skips weather rule entirely without data', () => {
    const itin = prep(makeItinerary());
    const cert = buildCertificate(itin, NO_WEATHER, verify(itin, NO_WEATHER));
    expect(cert.rules.find((r) => r.code === 'WEATHER_CONFLICT')?.checked).toBe(0);
  });

  it('flags unreachable legs', () => {
    const itin = prep(
      makeItinerary({
        days: [
          makeDay({
            items: [
              makeItem({ id: 'd1-i1' }),
              {
                ...makeItem({ id: 'd1-t1', name: 'A → B' }),
                type: 'transit' as const,
                poi_id: null,
                start_time: '11:00',
                end_time: '13:30',
                duration_min: 150,
                distance_m: 80000,
                cost: { amount: 0, currency: 'CNY', type: 'transit' as const },
                weather_sensitive: false,
              },
            ],
          }),
        ],
      }),
    );
    expect(verify(itin, NO_WEATHER).warnings.some((v) => v.code === 'TRANSIT_UNREACHABLE')).toBe(true);
  });
});

describe('certificate', () => {
  it('always reports the full rule set', () => {
    const itin = prep(makeItinerary());
    const res = verify(itin, NO_WEATHER);
    const cert = buildCertificate(itin, NO_WEATHER, res);
    expect(cert.rules).toHaveLength(8);
    expect(cert.summary.total).toBe(8);
    expect(cert.rules.every((r) => typeof r.checked === 'number')).toBe(true);
  });

  it('counts errors in the summary', () => {
    const itin = prep(
      makeItinerary({
        meta: makeMeta({ budget: { amount: 1, currency: 'CNY', includes_flights: false } }),
        days: [makeDay({ lodging: null, items: [makeItem({ cost: { amount: 200, currency: 'CNY', type: 'ticket' } })] })],
      }),
    );
    const cert = buildCertificate(itin, NO_WEATHER, verify(itin, NO_WEATHER));
    expect(cert.summary.errors).toBeGreaterThan(0);
    expect(cert.summary.passed).toBeLessThan(8);
  });
});
