import type { Itinerary, Meta } from '../domain/schema';
import { dateList } from '../domain/time';
import { makeOutline } from './outline';
import { scheduleDays } from './schedule';
import { intake, type IntakeResult } from './intake';
import { repair, type RepairResult } from './repair';
import { simulatedWeather } from '../providers/weather';
import { buildCertificate, verify, type VerifyResult } from '../verifier';
import type { VerifyContext } from '../verifier/rules';
import { recomputeItinerary } from '../domain/summary';

export type Stage = 'intake' | 'research' | 'outline' | 'schedule' | 'verify' | 'repair' | 'render';

export interface StageEvent {
  stage: Stage;
  status: 'start' | 'done';
  message: string;
  detail?: string;
}

export interface AgentResult {
  itinerary: Itinerary;
  intake: IntakeResult;
  verifyResult: VerifyResult;
  repairResult: RepairResult;
  log: { stage: Stage; message: string; detail?: string }[];
  elapsedMs: number;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * 默认不注入天气：没有真实天气 API 时，用模拟数据去改写行程是不诚实的。
 * 需要演示天气规则时，用 What-if 里的「第 2 天暴雨」显式触发。
 */
export function buildContext(meta: Meta, weatherMode: 'simulated' | 'none' = 'none'): VerifyContext {
  if (weatherMode === 'none') {
    return { weather: [], weatherSource: 'none' };
  }
  return {
    weather: simulatedWeather(meta.city_code, dateList(meta.start_date, meta.end_date)),
    weatherSource: 'simulated',
  };
}

export class NeedsClarification extends Error {
  constructor(
    public missing: string[],
    public notes: string[],
  ) {
    super('needs clarification');
    this.name = 'NeedsClarification';
  }
}

export async function runAgent(
  request: string,
  onEvent?: (e: StageEvent) => void,
  options?: { metaOverride?: Partial<Meta>; animate?: boolean },
): Promise<AgentResult> {
  const t0 = performance.now();
  const log: AgentResult['log'] = [];
  const emit = (e: StageEvent) => {
    onEvent?.(e);
    if (e.status === 'done') log.push({ stage: e.stage, message: e.message, detail: e.detail });
  };
  const tick = options?.animate === false ? 0 : 140;

  emit({ stage: 'intake', status: 'start', message: '解析需求' });
  const parsed = intake(request, options?.metaOverride);
  const meta: Meta = { ...parsed.meta, ...(options?.metaOverride ?? {}) };
  if (options?.metaOverride) {
    meta.start_date = options.metaOverride.start_date ?? parsed.meta.start_date;
    meta.end_date = options.metaOverride.end_date ?? parsed.meta.end_date;
    meta.budget = options.metaOverride.budget ?? parsed.meta.budget;
    meta.travelers = options.metaOverride.travelers ?? parsed.meta.travelers;
  }
  await sleep(tick);
  emit({
    stage: 'intake',
    status: 'done',
    message: `需求解析完成：${meta.destination} · ${dateList(meta.start_date, meta.end_date).length} 天`,
    detail: meta.interests.join(' / ') || '未指定偏好',
  });

  // 目的地是唯一不能猜的字段：猜错整个行程都是废的。缺了就停下来问。
  if (parsed.missing.includes('destination') && !options?.metaOverride?.city_code) {
    emit({
      stage: 'intake',
      status: 'done',
      message: '缺少目的地，先问你一句',
      detail: '其他字段可以先按默认值估算',
    });
    throw new NeedsClarification(parsed.missing, parsed.notes);
  }

  emit({ stage: 'research', status: 'start', message: '检索 POI 与通勤' });
  const outline = makeOutline(meta);
  await sleep(tick);
  emit({
    stage: 'research',
    status: 'done',
    message: `POI 池 ${outline.research.pool.length} 条，可用 ${outline.plans.reduce((s, p) => s + p.poi_ids.length, 0)} 个进主行程`,
    detail: `${outline.research.cityName} · 数据源 local-dataset`,
  });

  emit({ stage: 'outline', status: 'start', message: '分天分区' });
  await sleep(tick);
  emit({
    stage: 'outline',
    status: 'done',
    message: outline.plans.map((p) => `D${p.day_index} ${p.base_area}`).join(' · '),
  });

  emit({ stage: 'schedule', status: 'start', message: '排时间轴' });
  const scheduled = scheduleDays(meta, outline.plans, outline.research);
  const scheduledNames = scheduled.days.flatMap((d) => d.items).map((i) => i.name);
  const droppedMusts = meta.must_visit.filter(
    (m) => m && !scheduledNames.some((n) => n.includes(m) || m.includes(n)),
  );
  await sleep(tick);
  emit({
    stage: 'schedule',
    status: 'done',
    message: `时间由程序累加，已生成 ${scheduled.days.reduce((s, d) => s + d.items.length, 0)} 个条目`,
    detail: `${scheduled.unscheduled.length} 个备选进入候选池`,
  });

  const ctx = buildContext(meta);
  let itin: Itinerary = {
    id: `itin_${meta.start_date.replace(/-/g, '')}_${meta.city_code}`,
    version: 1,
    parent_id: null,
    variant_label: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    meta,
    days: scheduled.days,
    unscheduled: scheduled.unscheduled,
    warnings: [],
    feasibility: null,
    assumptions: [
      '预算不含往返大交通（机票/高铁）',
      '营业时间来自本地数据集，出行前请以官方公告为准',
      '通勤时间按直线距离 × 1.32 绕路系数估算，未计入实时路况',
      '未接入实时天气 API，天气维度默认不参与校验；可用 What-if 显式推演雨天方案',
      ...droppedMusts.map((m) => `你点名的「${m}」未排进主行程（多半在郊县或需要单独一天），已放进候选池`),
      ...parsed.notes,
    ],
  };
  itin = recomputeItinerary(itin);

  emit({ stage: 'verify', status: 'start', message: '跑 8 条可行性规则' });
  const first = verify(itin, ctx);
  await sleep(tick);
  emit({
    stage: 'verify',
    status: 'done',
    message: `${first.errors.length} 个 error · ${first.warnings.length} 个 warning`,
    detail: first.errors[0]?.message,
  });

  emit({ stage: 'repair', status: 'start', message: '定向修复' });
  const repaired = repair(itin, ctx, 3);
  await sleep(tick);
  emit({
    stage: 'repair',
    status: 'done',
    message:
      repaired.rounds.length === 0
        ? '首次生成即通过，无需修复'
        : `${repaired.rounds.length} 轮修复，剩余 ${repaired.unresolved.length} 个 error`,
    detail: repaired.rounds.flatMap((r) => r.actions.map((a) => a.description)).slice(0, 3).join('；'),
  });

  itin = repaired.itinerary;
  const finalVerify = verify(itin, ctx);
  itin.feasibility = buildCertificate(itin, ctx, finalVerify);
  itin.warnings = [...finalVerify.errors, ...finalVerify.warnings, ...finalVerify.infos];

  emit({ stage: 'render', status: 'start', message: '渲染' });
  await sleep(Math.max(60, tick / 2));
  emit({
    stage: 'render',
    status: 'done',
    message: `可行性 ${itin.feasibility.summary.passed}/${itin.feasibility.summary.total} 通过`,
  });

  return {
    itinerary: itin,
    intake: parsed,
    verifyResult: finalVerify,
    repairResult: repaired,
    log,
    elapsedMs: Math.round(performance.now() - t0),
  };
}

export function revalidate(itin: Itinerary, ctx: VerifyContext): Itinerary {
  const result = verify(itin, ctx);
  const next = recomputeItinerary({
    ...itin,
    warnings: [...result.errors, ...result.warnings, ...result.infos],
  });
  next.feasibility = buildCertificate(next, ctx, result);
  return next;
}
