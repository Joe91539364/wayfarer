/**
 * 评价导入通道（data/inbox/）。
 *
 * 为什么需要这条：携程 / 大众点评 / 马蜂窝 / 小红书 都没有公开的评价接口，
 * 直接抓正文既违反条款也拿不稳。但**商家后台可以合法导出**自己的评价，
 * 平台方也会给合作方授权数据 —— 这两条路拿到的文件，放到 data/inbox/ 就能进系统。
 *
 * 支持：
 *   data/inbox/*.json   —— 单条对象 / 数组 / { items: [...] }
 *   data/inbox/*.csv    —— 表头：poi,platform,score,count,author,date,text,likes
 *
 * 文件名以 _ 开头或含 template 的会被跳过（模板本身不是数据）。
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { PlatformId, ReviewSample } from '../../src/data/catalog';
import { findByName, mkRun, type PlatformPatch, type SourceCtx, type SourceOutput } from './types';

const META = {
  id: 'platform-export',
  name: '评价导入（data/inbox）',
  kind: 'export' as const,
  access: 'export' as const,
  license: '由授权方导出，仅本机使用',
  homepage: 'https://you.ctrip.com/',
  note: '把合法导出的平台评价放进 data/inbox/，这里负责归一化',
};

const PLATFORM_IDS = new Set<string>(['amap', 'baidu', 'ctrip', 'dianping', 'mafengwo', 'xiaohongshu', 'local']);

interface RawRow {
  poi?: string;
  hotel?: string;
  platform?: string;
  score?: string | number;
  count?: string | number;
  url?: string;
  author?: string;
  date?: string;
  text?: string;
  likes?: string | number;
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') {
      out.push(cur);
      cur = '';
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

function parseCsv(text: string): RawRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const head = splitCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const cells = splitCsvLine(line);
    const row: Record<string, string> = {};
    head.forEach((h, i) => (row[h] = (cells[i] ?? '').trim()));
    return row as RawRow;
  });
}

export const inboxSource = {
  meta: META,
  async run(ctx: SourceCtx): Promise<SourceOutput> {
    const started = Date.now();
    const dir = resolve(process.cwd(), 'data/inbox');
    const platforms: PlatformPatch[] = [];
    const logs: string[] = [];

    if (!existsSync(dir)) {
      return {
        run: mkRun(META, 'skipped', {
          note: '没有 data/inbox 目录。要导入评价就建一个，把导出的 JSON/CSV 放进去',
        }),
      };
    }

    const files = readdirSync(dir).filter(
      (f) => /\.(json|csv)$/i.test(f) && !f.startsWith('_') && !/template/i.test(f),
    );
    if (files.length === 0) {
      return {
        run: mkRun(META, 'empty', { note: 'data/inbox 里没有待导入文件（模板见 data/inbox/_template.json）' }),
      };
    }

    for (const file of files) {
      let rows: RawRow[] = [];
      try {
        const raw = readFileSync(resolve(dir, file), 'utf8');
        if (/\.csv$/i.test(file)) rows = parseCsv(raw);
        else {
          const parsed = JSON.parse(raw) as unknown;
          if (Array.isArray(parsed)) rows = parsed as RawRow[];
          else if (parsed && Array.isArray((parsed as { items?: unknown[] }).items))
            rows = (parsed as { items: RawRow[] }).items;
          else rows = [parsed as RawRow];
        }
      } catch (e) {
        logs.push(`[fail] ${file}：${e instanceof Error ? e.message : '解析失败'}`);
        continue;
      }

      // 同一文件里多行指向同一个点位时合并
      const buckets = new Map<string, { patch: PlatformPatch; samples: ReviewSample[] }>();
      let matched = 0;

      for (const row of rows) {
        const name = row.poi ?? row.hotel ?? '';
        if (!name) continue;
        const platform = (row.platform ?? '').trim() as PlatformId;
        if (!PLATFORM_IDS.has(platform)) {
          logs.push(`[skip] ${file}：未知平台「${row.platform}」`);
          continue;
        }

        // 写了 hotel 字段就只找酒店，别拿「钟楼」这个景点去接「钟楼美居酒店」的评价
        const poi = row.hotel ? undefined : findByName(ctx.pois, name);
        const hotel = poi ? undefined : findByName(ctx.hotels, name);
        const target = poi ? 'poi' : hotel ? 'hotel' : null;
        const id = poi?.poi_id ?? hotel?.id;
        if (!target || !id) {
          logs.push(`[miss] ${file}：「${name}」不在数据集里，跳过`);
          continue;
        }
        matched += 1;

        const key = `${target}:${id}:${platform}`;
        let bucket = buckets.get(key);
        if (!bucket) {
          bucket = {
            patch: {
              target,
              id,
              review: {
                platform,
                status: 'ok',
                score: undefined,
                count: undefined,
                url: row.url,
                note: `由 ${file} 导入`,
                at: Date.now(),
                samples: [],
              },
            },
            samples: [],
          };
          buckets.set(key, bucket);
        }
        const score = Number(row.score);
        const count = Number(row.count);
        if (Number.isFinite(score) && score > 0) bucket.patch.review.score = score;
        if (Number.isFinite(count) && count > 0) bucket.patch.review.count = count;
        if (row.text && row.text.trim()) {
          bucket.samples.push({
            text: row.text.trim(),
            author: row.author,
            date: row.date,
            score: Number.isFinite(Number(row.score)) && Number(row.score) > 0 && Number(row.score) <= 5 ? Number(row.score) : undefined,
            likes: Number.isFinite(Number(row.likes)) ? Number(row.likes) : undefined,
          });
        }
      }

      for (const bucket of buckets.values()) {
        if (bucket.samples.length > 0) bucket.patch.review.samples = bucket.samples.slice(0, 8);
        platforms.push(bucket.patch);
      }
      logs.push(`[ok] ${file}：${rows.length} 行，匹配 ${matched} 行`);
    }

    return {
      run: mkRun(META, platforms.length > 0 ? 'ok' : 'empty', {
        items: platforms.length,
        requests: 0,
        bytes: 0,
        ms: Date.now() - started,
        note: `导入 ${platforms.length} 条平台评价`,
      }),
      platforms,
    };
  },
};
