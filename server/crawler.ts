/**
 * 爬虫主调度。
 *
 * 一轮 = 依次跑所有数据源 → 合并 → 落盘。
 * 落三个文件：
 *   public/catalog.json        事实层（景点/酒店/天气/平台评价），前端读它
 *   public/official.json       政务公告层（原有格式不变，官网动态面板继续用）
 *   public/crawl-report.json   运行报告（每个源的状态、请求数、耗时、日志）
 *
 * 用法：
 *   npm run crawl                 抓一轮
 *   npm run crawl:watch           常驻，每 30 分钟一轮
 *   npm run crawl -- --only=weather,gov
 *   npm run crawl -- --offline    不联网，只出内置快照（用于离线打包）
 *
 * Key 从两个地方读，环境变量优先：
 *   AMAP_KEY=xxx BAIDU_KEY=yyy npm run crawl
 *   server/.keys.json  { "amap": "xxx", "baidu": "yyy" }
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { CITIES, POIS } from '../src/data/pois';
import { HOTELS } from '../src/data/hotels';
import { buildOfficialSnapshot, type OfficialSnapshot } from '../src/data/official';
import type { Catalog, CrawlReport } from '../src/data/catalog';
import { Net, cachePath } from './net';
import { mergeCatalog } from './merge';
import { govSource } from './sources/gov';
import { weatherSource } from './sources/weather';
import { platformProbeSource } from './sources/platforms';
import { amapSource } from './sources/amap';
import { baiduSource } from './sources/baidu';
import { inboxSource } from './sources/inbox';
import { glmSource } from './sources/glm';
import type { Keys, SourceCtx, SourceDef, SourceOutput } from './sources/types';
import { mkRun } from './sources/types';

const here = dirname(fileURLToPath(import.meta.url));
export const ROOT = resolve(here, '..');
const PUBLIC = resolve(ROOT, 'public');
const KEYS_FILE = resolve(here, '.keys.json');
const REPORT_FILE = resolve(here, '.cache', 'report.json');
const SETTINGS_FILE = resolve(ROOT, 'data', 'settings.json');

export interface Settings {
  /** 面板上被停用的数据源 id（例如 glm：检索按次计费，没余额时先关掉） */
  disabledSources: string[];
}

export function loadSettings(): Settings {
  try {
    if (!existsSync(SETTINGS_FILE)) return { disabledSources: [] };
    const raw = JSON.parse(readFileSync(SETTINGS_FILE, 'utf8')) as Partial<Settings>;
    return { disabledSources: Array.isArray(raw.disabledSources) ? raw.disabledSources.filter((x) => typeof x === 'string') : [] };
  } catch {
    return { disabledSources: [] };
  }
}

export function saveSettings(next: Settings) {
  mkdirSync(dirname(SETTINGS_FILE), { recursive: true });
  writeFileSync(SETTINGS_FILE, JSON.stringify(next, null, 2), 'utf8');
}

export function allSourceMeta() {
  return ALL_SOURCES.map((s) => s.meta);
}


export function loadKeys(): Keys {
  let fromFile: Keys = {};
  try {
    if (existsSync(KEYS_FILE)) fromFile = JSON.parse(readFileSync(KEYS_FILE, 'utf8')) as Keys;
  } catch {
    /* 配置文件坏了就当没有 */
  }
  return {
    amap: process.env.AMAP_KEY || fromFile.amap || undefined,
    baidu: process.env.BAIDU_KEY || fromFile.baidu || undefined,
    glm: process.env.GLM_KEY || fromFile.glm || undefined,
  };
}

export function saveKeys(keys: Keys) {
  mkdirSync(dirname(KEYS_FILE), { recursive: true });
  writeFileSync(KEYS_FILE, JSON.stringify(keys, null, 2), 'utf8');
}

const ALL_SOURCES: SourceDef[] = [
  govSource,
  weatherSource,
  platformProbeSource,
  amapSource,
  baiduSource,
  glmSource,
  inboxSource,
] as SourceDef[];

function writeOfficial(notices: NonNullable<SourceOutput['notices']>, now: number) {
  const base: OfficialSnapshot = buildOfficialSnapshot(now, notices.length > 0 ? 'live' : 'offline');
  for (const note of notices) {
    const targets = note.poi_id ? POIS.filter((p) => p.poi_id === note.poi_id) : POIS.filter((p) => p.city === note.city);
    for (const poi of targets) {
      const item = base.items[poi.poi_id];
      if (!item) continue;
      item.notice = note.text;
      item.source = note.source;
      item.source_url = note.url;
      item.fetched_at = now;
      item.synthetic = false;
    }
  }
  mkdirSync(PUBLIC, { recursive: true });
  writeFileSync(resolve(PUBLIC, 'official.json'), JSON.stringify(base, null, 2), 'utf8');
}

export interface CrawlOptions {
  only?: string[];
  offline?: boolean;
  onLog?: (line: string) => void;
}

export async function runCrawl(opts: CrawlOptions = {}): Promise<{ catalog: Catalog; report: CrawlReport }> {
  const startedAt = Date.now();
  const net = new Net({
    gapMs: 1500,
    timeoutMs: 9000,
    retries: 3,
    cacheFile: cachePath(ROOT, 'http'),
  });

  const keys = loadKeys();
  const logs: string[] = [];
  const outputs: SourceOutput[] = [];

  const push = (line: string) => {
    logs.push(line);
    opts.onLog?.(line);
  };

  push(
    `[start] ${opts.offline ? '离线模式' : '在线抓取'} · ${POIS.length} 个景点 / ${HOTELS.length} 家酒店 / ${CITIES.length} 个城市`,
  );
  push(
    `[keys] 高德 ${keys.amap ? '已配置' : '未配置'} · 百度 ${keys.baidu ? '已配置' : '未配置'} · ` +
      `智谱 ${keys.glm ? '已配置' : '未配置'}`,
  );

  if (!opts.offline) {
    const disabled = new Set(loadSettings().disabledSources);
    for (const src of ALL_SOURCES) {
      if (opts.only && opts.only.length > 0 && !opts.only.includes(src.meta.id)) continue;
      // 面板里停用的源直接跳过；但显式 --only=xxx 点名时照跑（调试用）
      if (disabled.has(src.meta.id) && !opts.only?.includes(src.meta.id)) {
        push(`[skip] ${src.meta.name} · 已在数据源面板停用`);
        outputs.push({
          run: mkRun(src.meta, 'skipped', { note: '已在数据源面板停用，随时可以在面板重新启用' }),
        });
        continue;
      }
      const ctx: SourceCtx = {
        net,
        now: Date.now(),
        keys,
        pois: POIS,
        hotels: HOTELS,
        cities: CITIES,
        log: push,
      };
      try {
        const out = await src.run(ctx);
        outputs.push(out);
        push(`[${out.run.status}] ${src.meta.name} · ${out.run.items} 项 · ${out.run.ms}ms`);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        push(`[error] ${src.meta.name}：${msg}`);
        outputs.push({
          run: {
            ...src.meta,
            status: 'error',
            items: 0,
            requests: 0,
            bytes: 0,
            ms: 0,
            at: Date.now(),
            error: msg,
          },
        });
      }
    }
  }

  net.save();

  const now = Date.now();
  // 读上一轮结果做增量：局部重跑（--only=xxx）不会把别的源的数据冲掉
  let base: Catalog | null = null;
  try {
    const prev = resolve(PUBLIC, 'catalog.json');
    if (existsSync(prev)) base = JSON.parse(readFileSync(prev, 'utf8')) as Catalog;
  } catch {
    base = null;
  }
  const catalog = mergeCatalog(outputs, now, base ?? undefined);
  const notices = outputs.flatMap((o) => o.notices ?? []);
  writeOfficial(notices, now);

  mkdirSync(PUBLIC, { recursive: true });
  writeFileSync(resolve(PUBLIC, 'catalog.json'), JSON.stringify(catalog, null, 2), 'utf8');

  const report: CrawlReport = {
    started_at: startedAt,
    finished_at: now,
    ms: now - startedAt,
    mode: catalog.mode,
    runs: catalog.sources,
    logs,
    stats: catalog.stats,
    requests: net.requests,
    bytes: net.bytes,
    keys: { amap: Boolean(keys.amap), baidu: Boolean(keys.baidu), glm: Boolean(keys.glm) },
  };

  mkdirSync(dirname(REPORT_FILE), { recursive: true });
  writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2), 'utf8');
  writeFileSync(resolve(PUBLIC, 'crawl-report.json'), JSON.stringify(report, null, 2), 'utf8');

  push(
    `[done] ${catalog.mode} · 景点 ${catalog.stats.pois} · 酒店 ${catalog.stats.hotels} · ` +
      `照片 ${catalog.stats.photos} · 平台评价 ${catalog.stats.platforms} · ` +
      `${net.requests} 请求 / ${(net.bytes / 1024).toFixed(0)}KB · ${report.ms}ms`,
  );

  return { catalog, report };
}

async function main() {
  const argv = process.argv.slice(2);
  const watch = argv.includes('--watch');
  const offline = argv.includes('--offline');
  const onlyArg = argv.find((a) => a.startsWith('--only='));
  const only = onlyArg ? onlyArg.slice(7).split(',').map((s) => s.trim()) : undefined;

  if (!watch) {
    const { report } = await runCrawl({ only, offline });
    for (const line of report.logs) console.log(line);
    console.log(`[out] ${resolve(PUBLIC, 'catalog.json')}`);
    return;
  }

  console.log('[watch] 每 30 分钟一轮，Ctrl+C 退出');
  const tick = async () => {
    try {
      const { report } = await runCrawl({ only });
      for (const line of report.logs) console.log(line);
    } catch (e) {
      console.error('[error]', e);
    }
  };
  await tick();
  setInterval(tick, 30 * 60 * 1000);
}

const invokedDirectly = process.argv[1]?.includes('crawler');
if (invokedDirectly) {
  main().catch((e) => {
    console.error('[fatal]', e);
    process.exitCode = 1;
  });
}
