/**
 * 多源合并。
 *
 * 冲突裁决只有一个规则：**看来源优先级**（见 SOURCE_RANK）。
 *   gov（官方公告） > amap > baidu > 导入的导出文件 > 内置数据集
 *
 * 同优先级先到先得。合并后每个字段仍然是 { v, src, at, url }，
 * 界面上点开任意一条信息都能看到「谁说的、什么时候说的」。
 */

import {
  computeStats,
  rankOf,
  seedCatalog,
  type Catalog,
  type Fact,
  type HotelFact,
  type PlatformGate,
  type PlatformReview,
  type PoiFact,
} from '../src/data/catalog';
import type { FactPatch, PhotoPatch, PlatformPatch, Retraction, SourceOutput } from './sources/types';
import type { SourceRun } from '../src/data/catalog';
import { POIS } from '../src/data/pois';
import { HOTELS } from '../src/data/hotels';

const POI_IDS = new Set(POIS.map((p) => p.poi_id));
const HOTEL_IDS = new Set(HOTELS.map((h) => h.id));

type Holder = PoiFact | HotelFact;

const FIELD_KEYS = [
  'address',
  'phone',
  'website',
  'hours',
  'price',
  'rating',
  'rating_count',
  'intro',
  'stars',
  'area',
] as const;

function applyFacts(c: Catalog, patches: FactPatch[], at: number) {
  for (const p of patches) {
    const holder: Holder | undefined = p.target === 'poi' ? c.pois[p.id] : c.hotels[p.id];
    if (!holder) continue;
    if (!FIELD_KEYS.includes(p.field as (typeof FIELD_KEYS)[number])) continue;

    const rec = holder as unknown as Record<string, Fact | undefined>;
    const existing = rec[p.field];
    if (existing && rankOf(existing.src) >= rankOf(p.src)) continue;
    rec[p.field] = { v: p.v, src: p.src, at, url: p.url };
    holder.updated_at = Math.max(holder.updated_at, at);
  }
}

function applyPhotos(c: Catalog, patches: PhotoPatch[], at: number) {
  for (const p of patches) {
    const holder: Holder | undefined = p.target === 'poi' ? c.pois[p.id] : c.hotels[p.id];
    if (!holder) continue;
    if (holder.photos.some((x) => x.url === p.url)) continue;
    if (holder.photos.length >= 4) continue;
    holder.photos.push({ url: p.url, caption: p.caption, credit: p.credit, src: p.src });
    holder.updated_at = Math.max(holder.updated_at, at);
  }
}

function applyPlatforms(c: Catalog, patches: PlatformPatch[], at: number) {
  for (const p of patches) {
    const holder: Holder | undefined = p.target === 'poi' ? c.pois[p.id] : c.hotels[p.id];
    if (!holder) continue;
    const existing = holder.platforms.find((x) => x.platform === p.review.platform);
    if (!existing) {
      holder.platforms.push({ ...p.review, at: p.review.at ?? at });
      continue;
    }
    // 数据库评分不覆盖有正文的导入结果；其它情况下补齐缺失字段即可
    const merged: PlatformReview = {
      ...existing,
      score: p.review.score ?? existing.score,
      count: p.review.count ?? existing.count,
      rank: p.review.rank ?? existing.rank,
      url: p.review.url ?? existing.url,
      status: p.review.status === 'ok' ? 'ok' : existing.status,
      note: p.review.note ?? existing.note,
      samples: [...(existing.samples ?? []), ...(p.review.samples ?? [])]
        .filter((s, i, arr) => arr.findIndex((x) => x.text === s.text) === i)
        .slice(0, 8),
      at: p.review.at ?? existing.at,
    };
    Object.assign(existing, merged);
    holder.updated_at = Math.max(holder.updated_at, at);
  }
}

function applyGates(c: Catalog, gates: PlatformGate[]) {
  for (const g of gates) {
    const idx = c.gates.findIndex((x) => x.platform === g.platform);
    if (idx < 0) c.gates.push(g);
    // ok 的优先级最高：能拿到数据就别被「探测失败」覆盖
    else if (c.gates[idx].status !== 'ok' && g.status === 'ok') c.gates[idx] = g;
    else if (c.gates[idx].status === 'blocked' && g.status !== 'blocked') c.gates[idx] = g;
  }
}

/**
 * 增量合并。
 *
 * 传 base（上一轮的 catalog）时，会在已有结果上叠加，而不是从内置数据集重来 ——
 * 否则 `npm run crawl -- --only=glm` 这种局部重跑会把上次抓到的官网/地图数据全冲掉。
 * 字段级优先级仍然生效：gov 的数据不会被 glm 覆盖。
 */
/**
 * 把上一轮结果折成「补丁」重新参与裁决。
 *
 * 不能直接拷一份 catalog 当底 —— 那样改了优先级规则（比如把人工核实的开放时间提到 glm 之上）
 * 老数据永远不会被重新评估。折成补丁、按原 src 再走一遍 rank 比较，规则一改立刻生效。
 */
function basePatches(base: Catalog): {
  facts: FactPatch[];
  photos: PhotoPatch[];
  platforms: PlatformPatch[];
  gates: PlatformGate[];
} {
  const NO_TICKET = new Set(['restaurant', 'cafe', 'shopping', 'nightlife']);
  const catOf = new Map(POIS.map((p) => [p.poi_id, p.category]));

  const facts: FactPatch[] = [];
  for (const [id, poi] of Object.entries(base.pois)) {
    if (!POI_IDS.has(id)) continue;
    for (const f of FIELD_KEYS) {
      const rec = (poi as unknown as Record<string, Fact | undefined>)[f];
      if (!rec) continue;
      // 清掉历史上写错的「餐厅门票价」：GLM 从攻略站抽来的数字，对餐饮来说语义就不对
      if (f === 'price' && rec.src === 'glm' && NO_TICKET.has(catOf.get(id) ?? '')) continue;
      facts.push({ target: 'poi', id, field: f, v: rec.v, src: rec.src, url: rec.url });
    }
  }
  for (const [id, hotel] of Object.entries(base.hotels)) {
    if (!HOTEL_IDS.has(id)) continue;
    for (const f of FIELD_KEYS) {
      const rec = (hotel as unknown as Record<string, Fact | undefined>)[f];
      if (rec) facts.push({ target: 'hotel', id, field: f, v: rec.v, src: rec.src, url: rec.url });
    }
  }

  const photos: PhotoPatch[] = [];
  const platforms: PlatformPatch[] = [];
  for (const [target, list] of [
    ['poi', Object.entries(base.pois)],
    ['hotel', Object.entries(base.hotels)],
  ] as const) {
    for (const [id, holder] of list) {
      for (const ph of holder.photos ?? []) {
        photos.push({ target, id, url: ph.url, caption: ph.caption, credit: ph.credit, src: ph.src });
      }
      for (const pr of holder.platforms ?? []) platforms.push({ target, id, review: pr });
    }
  }
  return { facts, photos, platforms, gates: base.gates ?? [] };
}

/** 撤回：只删「这个源自己写过的」字段，别人写的（官网、导入、内置）不动 */
function applyRetract(c: Catalog, items: Retraction[], src: string) {
  for (const r of items) {
    const holder: Holder | undefined = r.target === 'poi' ? c.pois[r.id] : c.hotels[r.id];
    if (!holder) continue;
    const rec = holder as unknown as Record<string, Fact | undefined>;
    for (const f of r.fields ?? (FIELD_KEYS as unknown as FactPatch['field'][])) {
      if (rec[f]?.src === src) delete rec[f];
    }
  }
}

export function mergeCatalog(outputs: SourceOutput[], now = Date.now(), base?: Catalog): Catalog {
  const c = seedCatalog(now);
  const fresh = outputs.map((o) => o.run);

  if (base) {
    const prev = basePatches(base);
    applyFacts(c, prev.facts, now);
    applyPhotos(c, prev.photos, now);
    applyPlatforms(c, prev.platforms, now);
    applyGates(c, prev.gates);
    for (const [city, w] of Object.entries(base.weather ?? {})) c.weather[city] = w;
    // 源列表先继承上一轮的，稍后本轮跑过的覆盖掉
    c.sources = base.sources ?? [];
  }

  for (const o of outputs) {
    const at = o.run.at;
    if (o.retract?.length) applyRetract(c, o.retract, o.run.id);
    if (o.facts?.length) applyFacts(c, o.facts, at);
    if (o.photos?.length) applyPhotos(c, o.photos, at);
    if (o.platforms?.length) applyPlatforms(c, o.platforms, at);
    if (o.gates?.length) applyGates(c, o.gates);
    if (o.weather?.length) for (const w of o.weather) c.weather[w.city] = w;
  }

  // 地图 API 的接入状态由它自己的 run 决定
  for (const run of fresh) {
    if (run.id !== 'amap' && run.id !== 'baidu') continue;
    const gate: PlatformGate =
      run.status === 'ok'
        ? { platform: run.id, status: 'ok', note: run.note, at: run.at }
        : run.status === 'need_key'
          ? { platform: run.id, status: 'need_key', note: run.note, at: run.at }
          : { platform: run.id, status: 'blocked', note: run.error ?? run.note, at: run.at };
    applyGates(c, [gate]);
  }

  // 本机评价永远可用
  applyGates(c, [
    { platform: 'local', status: 'ok', note: '你在详情页写的评价，存本机', at: now },
  ]);

  // 源列表按 id 合并：这轮跑过的更新，没跑的保留上次状态
  const byId = new Map<string, SourceRun>();
  for (const r of c.sources ?? []) byId.set(r.id, r);
  for (const r of fresh) byId.set(r.id, r);
  const merged = [...byId.values()];
  c.sources = merged;

  const okRuns = fresh.filter((r) => r.status === 'ok');
  const badRuns = fresh.filter((r) => r.status === 'error' || r.status === 'blocked');
  c.mode = okRuns.length === 0 ? 'offline' : badRuns.length > 0 ? 'partial' : 'live';
  c.generated_at = now;
  c.stats = computeStats(c);

  // 平台列表排序：有数据的在前，未接入的在后，本机放最后
  for (const holder of [...Object.values(c.pois), ...Object.values(c.hotels)]) {
    holder.platforms.sort((a, b) => {
      const w = (r: PlatformReview) => (r.platform === 'local' ? 2 : r.status === 'ok' ? 0 : 1);
      return w(a) - w(b);
    });
  }

  return c;
}
