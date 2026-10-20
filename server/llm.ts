/**
 * 智谱 GLM 客户端（服务端专用）。
 *
 * 全部只走 chat completions —— 按 token 计费，不碰 web_search（那是独立计费的，
 * search_std 0.01 元/次，一趟全量几十次，账单一涨就没人敢点了）。
 *
 * 两步走，故意分开：
 *
 *   1. think() —— 让模型先「想」：凭自己的知识把开放时间 / 票价 / 简介说一遍，
 *                 并且必须把话说成【确定】或【不确定】。思考过程是纯文本，不要 JSON，
 *                 否则模型会一边组织格式一边编数字。
 *
 *   2. json()  —— 把它刚说的那段话收成严格 JSON，不许新增事实。
 *
 * 没有网页片段了，也就没法再做「逐字校验」。替代方案是**双通道复核**：
 * 硬字段（时间 / 票价 / 电话 / 地址）让模型在看不到上一轮答案的前提下再独立答一次，
 * 两轮一致才写，不一致就丢。凭印象编的数字两轮几乎不可能对上，真记得的东西会稳定复现。
 *
 * 历史教训留档：2026-10 之前同一轮里既要 JSON 又要联网时，模型会在「搜索结果为空」的
 * 情况下直接用记忆编答案（西安钟楼被说成门票 0 元）—— 所以宁可多一轮，也不要一次到位。
 */

const BASE = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';

export interface GlmUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}

export interface GlmConfig {
  apiKey: string;
  /** 第一步「想」用的模型（便宜、够用） */
  thinkModel?: string;
  /** 第二步整理成 JSON 用的模型 */
  extractModel?: string;
}

export const GLM_DEFAULTS = {
  thinkModel: 'glm-4-flash',
  extractModel: 'glm-4-flash',
} as const;

async function post(body: unknown, apiKey: string, timeoutMs = 60_000): Promise<Record<string, unknown>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(BASE, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await res.text();
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(text) as Record<string, unknown>;
    } catch {
      throw new Error(`GLM 返回非 JSON（HTTP ${res.status}）：${text.slice(0, 160)}`);
    }
    if (!res.ok || data.error) {
      const err = data.error as { message?: string; code?: string } | undefined;
      const msg = err?.message ?? text.slice(0, 160);
      if (err?.code === '1113' || /余额不足|无可用资源包|欠费/.test(msg)) {
        throw new Error('智谱账户余额不足（token 计费也一样要余额）：到 open.bigmodel.cn 充值，或先在数据源面板停用智谱源');
      }
      throw new Error(`GLM HTTP ${res.status}${err?.code ? ` ${err.code}` : ''}：${msg}`);
    }
    return data;
  } finally {
    clearTimeout(timer);
  }
}

/** 第一步：让模型把已知的信息先想一遍，纯文本，不走 JSON */
export async function think(
  system: string,
  user: string,
  cfg: GlmConfig,
  maxTokens = 400,
): Promise<{ text: string; usage: GlmUsage }> {
  const data = await post(
    {
      model: cfg.thinkModel ?? GLM_DEFAULTS.thinkModel,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.4,
      max_tokens: maxTokens,
    },
    cfg.apiKey,
    45_000,
  );

  const choices = data.choices as { message?: { content?: string } }[] | undefined;
  return { text: choices?.[0]?.message?.content ?? '', usage: (data.usage as GlmUsage) ?? {} };
}

/** 第二步：只要 JSON，不要解释；也不许新增上面没有的事实 */
export async function json<T>(
  system: string,
  user: string,
  cfg: GlmConfig,
  opts: { maxTokens?: number; temperature?: number } = {},
): Promise<{ value: T | null; raw: string; usage: GlmUsage }> {
  const data = await post(
    {
      model: cfg.extractModel ?? GLM_DEFAULTS.extractModel,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      response_format: { type: 'json_object' },
      // 独立复核那一轮故意把温度调高：两个通道要和而不同，
      // 温度都压到 0.1 的话第二轮会「懒得想」直接抄第一轮的词，互证就失效了。
      temperature: opts.temperature ?? 0.1,
      max_tokens: opts.maxTokens ?? 500,
    },
    cfg.apiKey,
    45_000,
  );

  const choices = data.choices as { message?: { content?: string } }[] | undefined;
  const raw = choices?.[0]?.message?.content ?? '';
  try {
    return { value: JSON.parse(raw) as T, raw, usage: (data.usage as GlmUsage) ?? {} };
  } catch {
    return { value: null, raw, usage: (data.usage as GlmUsage) ?? {} };
  }
}

/** 连通性自检：几个 token 的寒暄，用于「这把 Key 到底能不能用」 */
export async function ping(apiKey: string): Promise<{
  ok: boolean;
  model?: string;
  error?: string;
  ms: number;
}> {
  const started = Date.now();
  try {
    const data = await post(
      { model: GLM_DEFAULTS.thinkModel, messages: [{ role: 'user', content: 'ping' }], max_tokens: 4 },
      apiKey,
      20_000,
    );
    return { ok: true, model: String(data.model ?? ''), ms: Date.now() - started };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e), ms: Date.now() - started };
  }
}

/** 去掉空白和标点，用来比两轮答案是不是同一个东西 */
export function normText(s: string): string {
  return s.replace(/[\s\u3000，。、；：（）()【】「」"'’‘·\-—…,.!?！？]/g, '');
}

/** 只留数字，用来比电话 */
export function normDigits(s: string): string {
  return s.replace(/\D/g, '');
}
