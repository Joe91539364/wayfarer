import type { Net } from '../net';
import type { CityWeather, PlatformGate, PlatformReview, SourceRun } from '../../src/data/catalog';
import type { PoiSeed, CitySeed } from '../../src/data/pois';
import type { HotelSeed } from '../../src/data/hotels';

export interface Keys {
  amap?: string;
  baidu?: string;
  glm?: string;
}

export interface SourceCtx {
  net: Net;
  now: number;
  keys: Keys;
  pois: PoiSeed[];
  hotels: HotelSeed[];
  cities: CitySeed[];
  log: (msg: string) => void;
}

export interface FactPatch {
  target: 'poi' | 'hotel';
  id: string;
  field: 'address' | 'phone' | 'website' | 'hours' | 'price' | 'rating' | 'rating_count' | 'intro' | 'stars' | 'area';
  v: string | number;
  src: string;
  url?: string;
}

export interface PhotoPatch {
  target: 'poi' | 'hotel';
  id: string;
  url: string;
  caption?: string;
  credit?: string;
  src: string;
}

export interface PlatformPatch {
  target: 'poi' | 'hotel';
  id: string;
  review: PlatformReview;
}

export interface Retraction {
  target: 'poi' | 'hotel';
  id: string;
  /** 不填表示这个源写过的全部字段 */
  fields?: FactPatch['field'][];
}

export interface SourceOutput {
  run: SourceRun;
  /** 这次明确判定「不是我」，撤掉上次自己写的字段（宁可没有，也不要错的） */
  retract?: Retraction[];
  facts?: FactPatch[];
  photos?: PhotoPatch[];
  platforms?: PlatformPatch[];
  weather?: CityWeather[];
  gates?: PlatformGate[];
  notices?: { city: string; text: string; url: string; source: string; poi_id?: string }[];
}

export type SourceMeta = Omit<SourceRun, 'status' | 'items' | 'requests' | 'bytes' | 'ms' | 'at' | 'error'>;

export interface SourceDef {
  meta: SourceMeta;
  run(ctx: SourceCtx): Promise<SourceOutput>;
}

export function mkRun(
  meta: SourceMeta,
  status: SourceRun['status'],
  extra: Partial<SourceRun> = {},
): SourceRun {
  return {
    ...meta,
    status,
    items: 0,
    requests: 0,
    bytes: 0,
    ms: 0,
    at: Date.now(),
    ...extra,
  };
}

/** 名称归一：去掉空格、括号、中英标点，方便跨源匹配同名 POI */
export function normName(s: string): string {
  return s
    .replace(/[（(].*?[)）]/g, '')
    .replace(/[\s·・\-—_,，。.、]/g, '')
    .toLowerCase();
}

/**
 * 退一步的相似度。三条能过：
 *   1. 公共段 ≥ 3 个字（「小酒馆」「君悦酒店」）；
 *   2. 公共段 = 较短名字的全部（「西湖」这种两字名，被完整包含就算）；
 *   3. 纯英文名公共段 ≥ 4 个字母（「Arabica」）。
 *
 * 为什么不是「≥2 个字就算」：那样「龙井·茶园民宿」会认成「西湖栖岸民宿」，
 * 「湖滨·青旅床位」会认成「旅小二青旅酒店」—— 靠「民宿」「青旅」这种泛词撞上的，
 * 都不是同一个地方。
 */
export function looseMatch(a: string, b: string): boolean {
  const x = normName(a);
  const y = normName(b);
  const run = commonRun(a, b);
  const shorter = Math.min(x.length, y.length);
  if (run >= 3) return true;
  if (run >= 2 && run === shorter) return true;
  const ascii = /^[\x00-\x7f]+$/.test(x) || /^[\x00-\x7f]+$/.test(y);
  return ascii && run >= 4;
}

/** 先找完全相等的，再找包含关系里最短的那个 —— 避免「钟楼美居酒店」被判成「钟楼」 */
export function findByName<T extends { name: string }>(list: T[], name: string): T | undefined {
  const n = normName(name);
  const exact = list.find((x) => normName(x.name) === n);
  if (exact) return exact;
  const cands = list
    .filter((x) => nameMatch(x.name, name))
    .map((x) => ({ x, d: Math.abs(normName(x.name).length - n.length) }))
    .sort((a, b) => a.d - b.d);
  return cands[0]?.x;
}

/** 最长公共子串长度（去标点后按字符比）。用来判断「名字不一样但确实是同一个东西」。 */
export function commonRun(a: string, b: string, cap = 6): number {
  const x = normName(a);
  const y = normName(b);
  if (!x || !y) return 0;
  let best = 0;
  const dp = new Array(y.length + 1).fill(0);
  for (let i = 1; i <= x.length; i++) {
    let prev = 0;
    for (let j = 1; j <= y.length; j++) {
      const tmp = dp[j];
      dp[j] = x[i - 1] === y[j - 1] ? prev + 1 : 0;
      if (dp[j] > best) best = dp[j];
      prev = tmp;
    }
  }
  return Math.min(best, cap);
}

/** 用两个名字判断是否是同一个地方：完全相等 / 互相包含且长度差不大 */
export function nameMatch(a: string, b: string): boolean {
  const x = normName(a);
  const y = normName(b);
  if (!x || !y) return false;
  if (x === y) return true;
  if (x.includes(y) || y.includes(x)) {
    // 长度差放宽到 4 会把「钟楼美居酒店」认成「钟楼」，收到 2 更稳
    const diff = Math.abs(x.length - y.length);
    return diff <= 2;
  }
  return false;
}
