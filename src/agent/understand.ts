/**
 * 表达推算。
 *
 * 分两层，各干各擅长的事：
 *   - 确定性检查（本地，永远执行）：预算量级、指代不明 —— 这类有明确判据，用规则算，
 *     不劳驾模型（模型连「预算三十块玩四天」都觉得合理）。
 *   - 地名混淆（远端，GLM）：同音/近形/一字之差需要世界知识，交给模型，但 quote
 *     必须逐字出现在原话里才收。
 *
 * 定位是「提醒」不是「拦截」：返回的 issues 只用来在确认卡 / 行程上方挂一条提示，
 * 不改任何字段 —— 改字段是用户点确认卡里那一格的事。
 */

export interface ExprIssue {
  quote?: string;
  problem?: string;
  suggestion?: string;
}

export interface ExprCheck {
  checked: boolean;
  reason?: string;
  affected: boolean;
  issues: ExprIssue[];
}

/** 确定性检查：预算量级 + 指代不明 */
export function localChecks(text: string, meta: Record<string, unknown>): ExprIssue[] {
  const out: ExprIssue[] = [];
  const days = Number(meta.days ?? 0) || 0;
  const adults = Number((meta.travelers as { adults?: number } | undefined)?.adults ?? 1) || 1;
  const amount = Number((meta.budget as { amount?: number } | undefined)?.amount ?? 0);

  if (amount > 0 && days > 0) {
    const per = amount / (days * adults);
    if (per < 80) {
      out.push({
        problem: `预算 ¥${amount} 平摊到 ${days} 天 ${adults} 人 ≈ 每天 ¥${Math.round(per)}，连吃住都不够 —— 是不是少写了个 0？`,
        suggestion: `一个人玩 ${days} 天，通常 ¥${(days * adults * 400).toLocaleString('zh-CN')} 上下比较现实`,
      });
    } else if (per > 20_000) {
      out.push({
        problem: `预算 ¥${amount.toLocaleString('zh-CN')} 平摊到 ${days} 天 ${adults} 人 ≈ 每天 ¥${Math.round(per).toLocaleString('zh-CN')}，量级大得反常 —— 是不是单位写错了？`,
        suggestion: '确认是「元」还是其它单位，或者是不是多人总预算',
      });
    }
  }

  const ref = text.match(/那边|那里|那个地方|那个城市|那儿/);
  if (ref) {
    out.push({
      quote: ref[0],
      problem: `「${ref[0]}」指代不明 —— 我按已识别的目的地在排，但如果你指的是别处，行程会整个跑偏`,
      suggestion: '直接把城市名打出来',
    });
  }
  return out;
}

async function remotePlaceCheck(text: string, parsed: Record<string, unknown>, timeoutMs = 30_000): Promise<ExprCheck> {
  try {
    const r = await fetch('/api/llm/understand', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text, parsed }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!r.ok) return { checked: false, reason: `HTTP ${r.status}`, affected: false, issues: [] };
    const data = (await r.json()) as ExprCheck;
    if (!data.checked) return { checked: false, reason: data.reason, affected: false, issues: [] };
    return { checked: true, affected: Boolean(data.affected), issues: Array.isArray(data.issues) ? data.issues : [] };
  } catch (e) {
    return { checked: false, reason: e instanceof Error ? e.message : String(e), affected: false, issues: [] };
  }
}

/** 合并本地确定性检查与远端地名检查。远端失败不影响本地结果。 */
export async function understandExpression(text: string, meta: Record<string, unknown>): Promise<ExprCheck> {
  const local = localChecks(text, meta);
  const remote = await remotePlaceCheck(text, meta);
  const issues = [...local, ...remote.issues].slice(0, 4);
  return {
    checked: true,
    reason: remote.checked ? undefined : `地名检查跳过（${remote.reason ?? '远端不可用'}），本地检查已生效`,
    affected: issues.length > 0,
    issues,
  };
}
