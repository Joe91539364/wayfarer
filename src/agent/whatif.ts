import type { Itinerary } from '../domain/schema';
import { recomputeItinerary } from '../domain/summary';
import { reflowItinerary } from './reflow';
import { repair } from './repair';
import { revalidate } from './orchestrator';
import type { VerifyContext } from '../verifier/rules';

export type WhatIfKind = 'budget' | 'rain' | 'pace' | 'halfday';

export interface DiffEntry {
  type: 'same' | 'added' | 'removed' | 'changed';
  day_index: number;
  text: string;
  detail?: string;
}

export interface WhatIfResult {
  itinerary: Itinerary;
  diff: DiffEntry[];
  headline: string;
  satisfied: boolean;
  changed: number;
}

function namesOf(itin: Itinerary) {
  return itin.days.map((d) => ({
    day_index: d.day_index,
    items: d.items
      .filter((i) => i.type === 'activity' || i.type === 'meal')
      .map((i) => ({ name: i.name, cost: i.cost.amount, id: i.id, category: i.category })),
  }));
}

export function diffItineraries(before: Itinerary, after: Itinerary): DiffEntry[] {
  const a = namesOf(before);
  const b = namesOf(after);
  const out: DiffEntry[] = [];
  const days = Math.max(a.length, b.length);
  for (let d = 0; d < days; d++) {
    const left = a[d]?.items ?? [];
    const right = b[d]?.items ?? [];
    const dayIndex = d + 1;
    const n = left.length;
    const m = right.length;
    const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
    for (let i = n - 1; i >= 0; i--) {
      for (let j = m - 1; j >= 0; j--) {
        dp[i][j] =
          left[i].name === right[j].name
            ? dp[i + 1][j + 1] + 1
            : Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
    let i = 0;
    let j = 0;
    while (i < n && j < m) {
      if (left[i].name === right[j].name) {
        const costChanged = left[i].cost !== right[j].cost;
        out.push({
          type: costChanged ? 'changed' : 'same',
          day_index: dayIndex,
          text: right[j].name,
          detail: costChanged ? `¥${left[i].cost} → ¥${right[j].cost}` : undefined,
        });
        i++;
        j++;
      } else if (dp[i + 1][j] >= dp[i][j + 1]) {
        out.push({ type: 'removed', day_index: dayIndex, text: left[i].name, detail: `移除（¥${left[i].cost}）` });
        i++;
      } else {
        out.push({ type: 'added', day_index: dayIndex, text: right[j].name, detail: `新增（¥${right[j].cost}）` });
        j++;
      }
    }
    while (i < n) {
      out.push({ type: 'removed', day_index: dayIndex, text: left[i].name, detail: `移除（¥${left[i].cost}）` });
      i++;
    }
    while (j < m) {
      out.push({ type: 'added', day_index: dayIndex, text: right[j].name, detail: `新增（¥${right[j].cost}）` });
      j++;
    }
  }
  return out;
}

export function whatIf(
  base: Itinerary,
  kind: WhatIfKind,
  ctx: VerifyContext,
  payload?: { budget?: number; dayIndex?: number },
): WhatIfResult {
  const branch: Itinerary = JSON.parse(JSON.stringify(base));
  branch.id = `${base.id}_v${base.version + 1}_${kind}`;
  branch.parent_id = base.id;
  branch.version = base.version + 1;
  branch.updated_at = new Date().toISOString();

  let headline = '';
  let branchCtx = ctx;

  if (kind === 'budget') {
    const amount = payload?.budget ?? Math.round(base.meta.budget.amount * 0.67);
    branch.meta.budget.amount = amount;
    branch.variant_label = `预算 ¥${amount}`;
    headline = `预算压到 ¥${amount}`;
  } else if (kind === 'rain') {
    const dayIdx = payload?.dayIndex ?? 2;
    branchCtx = {
      ...ctx,
      weatherSource: 'simulated',
      weather: ctx.weather.map((w, i) =>
        i === dayIdx - 1 ? { ...w, precip_prob: 92, text: '暴雨', temp_max: Math.min(w.temp_max, 24) } : w,
      ),
    };
    branch.variant_label = `第 ${dayIdx} 天下雨`;
    headline = `假设第 ${dayIdx} 天暴雨`;
  } else if (kind === 'pace') {
    branch.meta.pace = 'relaxed';
    branch.variant_label = '节奏降为轻松';
    headline = '带老人 / 走不动，节奏降为轻松';
  } else {
    branch.variant_label = '只玩半天';
    headline = '每天只保留核心的半天';
    branch.days = branch.days.map((d) => ({
      ...d,
      items: d.items.filter((i, idx, arr) => {
        const nonTransitBefore = arr.slice(0, idx).filter((x) => x.type !== 'transit').length;
        return i.type === 'transit' || nonTransitBefore < 2;
      }),
    }));
    branch.days = reflowItinerary(branch).days;
  }

  let working = recomputeItinerary(branch);
  if (kind === 'pace') {
    working = reflowItinerary(working);
  }
  const repaired = repair(working, branchCtx, 3);
  const final = revalidate(repaired.itinerary, branchCtx);
  final.variant_label = branch.variant_label;

  const diff = diffItineraries(base, final);
  const changed = diff.filter((d) => d.type !== 'same').length;
  const satisfied =
    kind === 'budget' ? totalOf(final) <= (payload?.budget ?? branch.meta.budget.amount) : final.feasibility?.summary.errors === 0;

  return {
    itinerary: final,
    diff,
    headline,
    satisfied,
    changed,
  };
}

export function totalOf(itin: Itinerary): number {
  return itin.days.reduce((sum, d) => {
    const items = d.items.reduce((s, i) => s + i.cost.amount, 0);
    return sum + items + (d.lodging?.cost.amount ?? 0);
  }, 0);
}
