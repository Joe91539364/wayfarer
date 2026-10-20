import type { Meta } from '../domain/schema';
import { findCity } from '../data/pois';
import { addDays } from '../domain/time';

export interface LlmConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

const STORAGE_KEY = 'wayfarer.llm.config';

export const DEFAULT_LLM: LlmConfig = {
  apiKey: '',
  baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
  model: 'glm-5.3-flash',
};

export function loadLlmConfig(): LlmConfig | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LlmConfig;
    return parsed.apiKey ? parsed : null;
  } catch {
    return null;
  }
}

export function saveLlmConfig(config: LlmConfig | null) {
  if (!config) {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

/**
 * 静态前缀：内容固定不变，放在 messages 最前面以便命中上下文缓存。
 * 不要在这里拼接时间戳或随机数。
 */
export const INTAKE_SYSTEM_PROMPT = `你是「行迹」行程规划 Agent 的需求抽取器。
把用户的一句话需求解析为 JSON，不要输出任何解释性文字。

输出字段：
{
  "destination": string,          // 中文城市名，未提到则留空字符串
  "start_date": string,           // YYYY-MM-DD，未提到则留空字符串
  "days": number,                 // 天数，未提到填 0
  "budget": number,               // 总预算（人民币），未提到填 0
  "travelers": number,            // 成人数，未提到填 0
  "pace": "relaxed" | "moderate" | "packed",
  "interests": string[],          // 取值限定：food,nature,history,museum,art,shopping,nightlife,photography,theme_park,hot_spring,hiking,local_life
  "must_visit": string[],         // 用户点名一定要去的地方
  "avoid": string[]               // 用户明确要避开的
}

规则：
1. 不确定的字段留空（0 或 ""），绝对不要编造用户没说的信息。
2. 预算单位统一为元；「6千」「6k」都输出 6000。
3. 不要输出 Markdown 代码块，只输出 JSON 对象。`;

export interface LlmExtraction {
  destination?: string;
  start_date?: string;
  days?: number;
  budget?: number;
  travelers?: number;
  pace?: Meta['pace'];
  interests?: string[];
  must_visit?: string[];
  avoid?: string[];
}

export async function llmExtract(text: string, config: LlmConfig): Promise<LlmExtraction> {
  const res = await fetch(`${config.baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: 'system', content: INTAKE_SYSTEM_PROMPT },
        { role: 'user', content: text },
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' },
      stream: false,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`LLM ${res.status}: ${body.slice(0, 160)}`);
  }
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = data.choices?.[0]?.message?.content ?? '{}';
  const json = JSON.parse(content.replace(/^```json\s*|```$/g, '')) as LlmExtraction;
  return json;
}

export function extractionToMeta(x: LlmExtraction): Partial<Meta> {
  const out: Partial<Meta> = {};
  if (x.destination) {
    const city = findCity(x.destination);
    if (city) {
      out.destination = city.name;
      out.city_code = city.code;
    }
  }
  if (x.start_date) {
    out.start_date = x.start_date;
    if (x.days && x.days > 0) out.end_date = addDays(x.start_date, x.days - 1);
  }
  if (x.budget && x.budget > 0) {
    out.budget = { amount: x.budget, currency: 'CNY', includes_flights: false };
  }
  if (x.travelers && x.travelers > 0) {
    out.travelers = { adults: x.travelers, children: 0 };
  }
  if (x.pace) out.pace = x.pace;
  if (x.interests?.length) out.interests = x.interests;
  if (x.must_visit?.length) out.must_visit = x.must_visit;
  if (x.avoid?.length) out.avoid = x.avoid;
  return out;
}
