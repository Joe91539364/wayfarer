import { POIS } from './pois';
import { HOTELS } from './hotels';
import { allCities } from './pois';

/**
 * 爬虫产物契约。
 *
 * 一条铁律：**每个字段都必须带来源**（src / at / url）。
 * 界面上凡是展示「地址 / 电话 / 评分 / 照片」，都能点开看到它是谁给的、什么时候给的。
 * 拿不到就是拿不到 —— 不填假值，而是把数据源状态标成 need_key / blocked。
 *
 * 这份文件同时被浏览器端（渲染）和 Node 端（抓取、合并）引用，
 * 所以只放纯类型与纯函数，不碰 DOM、不碰 fs。
 */

export type SourceStatus = 'ok' | 'empty' | 'need_key' | 'need_auth' | 'blocked' | 'error' | 'skipped';

export type SourceKind = 'official' | 'weather' | 'map' | 'platform' | 'export' | 'llm' | 'seed';

export interface SourceRun {
  id: string;
  name: string;
  kind: SourceKind;
  access: 'open' | 'key' | 'partner' | 'export';
  license: string;
  homepage: string;
  status: SourceStatus;
  items: number;
  requests: number;
  bytes: number;
  ms: number;
  error?: string;
  /** 这条源是干什么的、为什么是现在这个状态 */
  note: string;
  at: number;
}

export interface Fact<V = string | number> {
  v: V;
  /** 来源 id，对应 SourceRun.id */
  src: string;
  at: number;
  url?: string;
}

export interface Photo {
  url: string;
  caption?: string;
  credit?: string;
  src: string;
}

export type PlatformId =
  | 'amap'
  | 'baidu'
  | 'ctrip'
  | 'dianping'
  | 'mafengwo'
  | 'xiaohongshu'
  | 'tripadvisor'
  | 'local';

export interface ReviewSample {
  text: string;
  author?: string;
  date?: string;
  score?: number;
  likes?: number;
}

export interface PlatformReview {
  platform: PlatformId;
  /** ok=有数据；need_key/need_auth=要授权；blocked=被拒；empty=抓到了但没有 */
  status: 'ok' | 'need_key' | 'need_auth' | 'blocked' | 'empty';
  score?: number;
  count?: number;
  rank?: string;
  samples?: ReviewSample[];
  url?: string;
  note?: string;
  at?: number;
}

/** 平台级接入状态：这个平台现在能不能拿到数据、为什么 */
export interface PlatformGate {
  platform: PlatformId;
  status: 'ok' | 'need_key' | 'need_auth' | 'blocked' | 'empty';
  note: string;
  /** 探测时真实拿到的 HTTP 码，用来证明「不是我不想抓」 */
  http?: number;
  url?: string;
  at: number;
}

export interface PoiFact {
  id: string;
  name: string;
  address?: Fact<string>;
  phone?: Fact<string>;
  website?: Fact<string>;
  hours?: Fact<string>;
  price?: Fact<number>;
  rating?: Fact<number>;
  rating_count?: Fact<number>;
  intro?: Fact<string>;
  photos: Photo[];
  platforms: PlatformReview[];
  updated_at: number;
}

export interface HotelFact {
  id: string;
  name: string;
  address?: Fact<string>;
  phone?: Fact<string>;
  area?: Fact<string>;
  stars?: Fact<number>;
  price?: Fact<number>;
  rating?: Fact<number>;
  rating_count?: Fact<number>;
  intro?: Fact<string>;
  photos: Photo[];
  platforms: PlatformReview[];
  updated_at: number;
}

export interface DayWeather {
  date: string;
  text: string;
  high: number;
  low: number;
  /** 降水概率，0–100；抓不到就是 undefined，不拿 0 冒充「不下雨」 */
  precip?: number;
}

export interface CityWeather {
  city: string;
  cityName: string;
  station: string;
  now?: {
    temp: number;
    text: string;
    humidity?: number;
    wind?: string;
    aqi?: number;
    observedAt?: string;
  };
  daily: DayWeather[];
  src: string;
  at: number;
  url?: string;
}

export interface CatalogStats {
  pois: number;
  hotels: number;
  photos: number;
  platforms: number;
  reviews: number;
  facts: number;
}

export interface Catalog {
  generated_at: number;
  /** 平台接入状态（与具体 POI 无关的那一层） */
  gates: PlatformGate[];
  /** live=至少一个真源成功；partial=部分成功；offline=只有内置数据集 */
  mode: 'live' | 'partial' | 'offline';
  sources: SourceRun[];
  pois: Record<string, PoiFact>;
  hotels: Record<string, HotelFact>;
  weather: Record<string, CityWeather>;
  stats: CatalogStats;
}

export interface CrawlReport {
  started_at: number;
  finished_at: number;
  ms: number;
  mode: Catalog['mode'];
  runs: SourceRun[];
  logs: string[];
  stats: CatalogStats;
  requests: number;
  bytes: number;
  keys: { amap: boolean; baidu: boolean; glm?: boolean };
}

/* ============================ 平台登记表 ============================ */

export interface PlatformMeta {
  id: PlatformId;
  name: string;
  short: string;
  color: string;
  access: 'key' | 'partner' | 'export' | 'local';
  /** 能不能拿到评分 / 能不能拿到正文 */
  gives: 'score+text' | 'score' | 'local';
  note: string;
  howto: string;
}

export const PLATFORMS: PlatformMeta[] = [
  {
    id: 'amap',
    name: '高德地图',
    short: '高德',
    color: '#1a73e8',
    access: 'key',
    gives: 'score',
    note: '开放平台 Web 服务，可拿评分、点评数、营业时间、电话、地址、实景图',
    howto: '在 高德开放平台 申请「Web 服务」Key，粘到数据源面板即可',
  },
  {
    id: 'baidu',
    name: '百度地图',
    short: '百度',
    color: '#2d6cdf',
    access: 'key',
    gives: 'score',
    note: 'Place API，可拿综合评分、评论数、标签、人均',
    howto: '在 百度地图开放平台 申请 AK（服务端），粘到数据源面板',
  },
  {
    id: 'ctrip',
    name: '携程',
    short: '携程',
    color: '#2577e3',
    access: 'partner',
    gives: 'score',
    note: '无公开数据接口；robots 允许部分页面，但服务条款禁止自动化采集，直连会被 302/验证码拦',
    howto: '走携程开放平台合作，或在商家后台导出评价后放进 data/inbox/',
  },
  {
    id: 'dianping',
    name: '大众点评',
    short: '点评',
    color: '#f60',
    access: 'partner',
    gives: 'score',
    note: '无公开接口，反爬强度高；robots 只对少数路径放开，正文不可抓',
    howto: '商家后台导出评价 → data/inbox/，或接美团开放平台',
  },
  {
    id: 'mafengwo',
    name: '马蜂窝',
    short: '马蜂窝',
    color: '#ffb400',
    access: 'partner',
    gives: 'score',
    note: '无公开接口；游记正文有明确版权，不做抓取',
    howto: '需要与马蜂窝商务合作，或人工导入',
  },
  {
    id: 'xiaohongshu',
    name: '小红书',
    short: '小红书',
    color: '#ff2442',
    access: 'partner',
    gives: 'score',
    note: '无公开接口，且内容以个人笔记为主，抓取涉及个人信息与著作权',
    howto: '只做手动导入，不做自动抓取',
  },
  {
    id: 'local',
    name: '本机评价',
    short: '本机',
    color: '#8a7761',
    access: 'local',
    gives: 'local',
    note: '你在详情页写的评价，存在本机浏览器里',
    howto: '直接在景区详情页底部打分留言',
  },
];

export const PLATFORM_MAP: Record<string, PlatformMeta> = Object.fromEntries(
  PLATFORMS.map((p) => [p.id, p]),
);

/* ============================ 天气站号 ============================ */

/** 中国天气网城市站号 + 天气网 slug（两个站各用一套） */
export const CITY_STATIONS: Record<string, { code: string; name: string; slug: string }> = {
  chengdu: { code: '101270101', name: '成都', slug: 'chengdu' },
  xian: { code: '101110101', name: '西安', slug: 'xian' },
  xiamen: { code: '101230201', name: '厦门', slug: 'xiamen' },
  beijing: { code: '101010100', name: '北京', slug: 'beijing' },
  hangzhou: { code: '101210101', name: '杭州', slug: 'hangzhou' },
};

/* ============================ 内置数据集兜底 ============================ */

export function emptyCatalog(now = Date.now()): Catalog {
  return {
    generated_at: now,
    mode: 'offline',
    gates: [],
    sources: [],
    pois: {},
    hotels: {},
    weather: {},
    stats: { pois: 0, hotels: 0, photos: 0, platforms: 0, reviews: 0, facts: 0 },
  };
}

/**
 * 内置数据集版本。爬虫没跑过 / 离线打开时用它，
 * 所有字段 src 都是 'seed'，界面上会显示「内置数据集」而不是「实时」。
 */
export function seedCatalog(now = Date.now()): Catalog {
  const pois: Record<string, PoiFact> = {};
  for (const p of POIS) {
    const city = allCities().find((c) => c.code === p.city);
    pois[p.poi_id] = {
      id: p.poi_id,
      name: p.name,
      address: { v: `${city?.name ?? ''} · ${p.area}`, src: 'seed', at: now },
      hours: { v: `${p.open}–${p.close}`, src: p.hours_confidence === 'verified' ? 'seed-verified' : 'seed', at: now },
      price: { v: p.price, src: p.hours_confidence === 'verified' ? 'seed-verified' : 'seed', at: now },
      rating: { v: p.rating, src: 'seed', at: now },
      intro: { v: p.blurb, src: 'seed', at: now },
      photos: [],
      platforms: [
        {
          platform: 'local',
          status: 'ok',
          note: '本机评价还在等你写第一条；上面那个分数是内置数据集里的参考值，不是任何平台的真实评分',
        },
      ],
      updated_at: now,
    };
  }

  const hotels: Record<string, HotelFact> = {};
  for (const h of HOTELS) {
    hotels[h.id] = {
      id: h.id,
      name: h.name,
      area: { v: h.area, src: 'seed', at: now },
      price: { v: h.price, src: 'seed', at: now },
      rating: { v: h.rating, src: 'seed', at: now },
      intro: { v: h.blurb, src: 'seed', at: now },
      photos: [],
      platforms: [{ platform: 'local', status: 'ok', note: '本机还没有这家酒店的评价' }],
      updated_at: now,
    };
  }

  return {
    generated_at: now,
    mode: 'offline',
    gates: [],
    sources: [],
    pois,
    hotels,
    weather: {},
    stats: {
      pois: Object.keys(pois).length,
      hotels: Object.keys(hotels).length,
      photos: 0,
      platforms: 0,
      reviews: 0,
      facts: 0,
    },
  };
}

export function computeStats(c: Omit<Catalog, 'stats'>): CatalogStats {
  let photos = 0;
  let platforms = 0;
  let reviews = 0;
  let facts = 0;
  for (const p of Object.values(c.pois)) {
    photos += p.photos.length;
    platforms += p.platforms.length;
    for (const pr of p.platforms) reviews += pr.samples?.length ?? 0;
    facts += ['address', 'phone', 'website', 'hours', 'price', 'rating', 'rating_count', 'intro'].filter(
      (k) => (p as unknown as Record<string, unknown>)[k],
    ).length;
  }
  for (const h of Object.values(c.hotels)) {
    photos += h.photos.length;
    platforms += h.platforms.length;
    for (const pr of h.platforms) reviews += pr.samples?.length ?? 0;
    facts += ['address', 'phone', 'area', 'stars', 'price', 'rating', 'rating_count', 'intro'].filter(
      (k) => (h as unknown as Record<string, unknown>)[k],
    ).length;
  }
  return { pois: Object.keys(c.pois).length, hotels: Object.keys(c.hotels).length, photos, platforms, reviews, facts };
}

/** 字段优先级：官方 > 地图 API > 导入 > 内置 */
export const SOURCE_RANK: Record<string, number> = {
  gov: 50,
  amap: 40,
  baidu: 35,
  'platform-export': 30,
  // 人工核对过开放时间的点位，不让模型凭记忆的 GLM 结果盖掉（西湖全天开放被攻略站写成 07:00-18:30 就是教训）
  'seed-verified': 28,
  // GLM 是「模型先想一遍再两轮互证」，没有网页依据，比结构化 API 弱，但比内置数据集新
  glm: 25,
  weather: 10,
  seed: 0,
};

export function rankOf(src: string): number {
  return SOURCE_RANK[src] ?? 10;
}
