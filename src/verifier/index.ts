import type { Certificate, Itinerary, Violation } from '../domain/schema';
import { costBreakdown, itineraryTotalCost, totalTransitMin } from '../domain/summary';
import { RULES, type RuleOutcome, type VerifyContext } from './rules';

export interface VerifyResult {
  violations: Violation[];
  byCode: Record<string, RuleOutcome>;
  errors: Violation[];
  warnings: Violation[];
  infos: Violation[];
}

export function verify(itin: Itinerary, ctx: VerifyContext): VerifyResult {
  const byCode: Record<string, RuleOutcome> = {};
  const violations: Violation[] = [];
  for (const rule of RULES) {
    const outcome = rule.run(itin, ctx);
    byCode[rule.code] = outcome;
    violations.push(...outcome.violations);
  }
  return {
    violations,
    byCode,
    errors: violations.filter((x) => x.severity === 'error'),
    warnings: violations.filter((x) => x.severity === 'warning'),
    infos: violations.filter((x) => x.severity === 'info'),
  };
}

export function buildCertificate(itin: Itinerary, ctx: VerifyContext, result: VerifyResult): Certificate {
  const rules = RULES.map((rule) => {
    const outcome = result.byCode[rule.code] ?? { violations: [], checked: 0, covered: 0 };
    const failed = outcome.violations.filter((x) => x.severity === 'error');
    const warns = outcome.violations.filter((x) => x.severity === 'warning');
    return {
      code: rule.code,
      title: rule.title,
      description: rule.description,
      passed: failed.length === 0,
      severity: rule.severity,
      checked: outcome.checked,
      covered: outcome.covered ?? 0,
      detail: outcome.detail ?? (warns.length ? `${warns.length} 项提醒` : '通过'),
      warnings: warns.length,
      infos: outcome.violations.filter((x) => x.severity === 'info').length,
    };
  });

  const allPois = itin.days.flatMap((d) => d.items).filter((i) => i.poi_id);
  const isLocalId = (id: string | null | undefined) => !!id && /^[A-Z]{2}\d{2}$/.test(id);
  const verifiedPois = allPois.filter((i) => isLocalId(i.poi_id));
  const hoursItems = itin.days
    .flatMap((d) => d.items)
    .filter((i) => i.type === 'activity' || i.type === 'meal');
  const hoursKnown = hoursItems.filter((i) => i.opening_hours && i.opening_hours.confidence !== 'unknown');

  return {
    verified_at: new Date().toISOString(),
    verifier_version: '1.0',
    rules,
    evidence: {
      poi_sources: allPois.map((i) => ({
        poi_id: i.poi_id as string,
        provider: isLocalId(i.poi_id) ? 'local-dataset' : 'amap',
        fetched_at: '2026-10-18T00:00:00Z',
      })),
      cost_breakdown: costBreakdown(itin),
      max_leg_km: Math.max(...itin.days.map((d) => d.summary.max_leg_km), 0),
      total_transit_min: totalTransitMin(itin),
      assumptions: itin.assumptions,
      data_coverage: {
        poi_verified: verifiedPois.length,
        poi_total: allPois.length,
        hours_known: hoursKnown.length,
        hours_total: hoursItems.length,
      },
    },
    summary: {
      passed: rules.filter((r) => r.passed).length,
      total: rules.length,
      errors: result.errors.length,
      warnings: result.warnings.length,
    },
  };
}

export function totalBudget(itin: Itinerary): number {
  return itineraryTotalCost(itin);
}

export * from './rules';
