/**
 * 动态城市包。
 *
 * 内置只有 5 个城市。用户说「去景德镇」时，不能让他从成都/西安里挑一个 ——
 * 那就等于把「去哪」推回给用户，还顺带把出发地、日期都猜了。
 *
 * 这里用高德开放平台现场抓一个城市包：景点、吃饭、咖啡、购物、住宿。
 * 抓到的东西全部落成 PoiSeed，注册进前端的内存表，后面的
 * research / outline / schedule 就当它是普通城市。
 *
 * 缓存 24 小时，避免重复烧配额。
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Category, Interest } from '../../src/domain/schema';
import type { CitySeed, PoiSeed } from '../../src/data/pois';

const ENDPOINT = 'https://restapi.amap.com/v3/place/text';
const GEO = 'https://restapi.amap.com/v3/geocode/geo';
const CACHE_DIR = resolve(process.cwd(), 'data', 'city-packs');
const TTL = 24 * 3600 * 1000;

export interface CityPack {
  city: CitySeed;
  pois: PoiSeed[];
  /** 图片：poi_id → 高德实景图 */
  photos: Record<string, string>;
  /** 地址：poi_id → 高德地址 */
  addresses: Record<string, string>;
  generated_at: number;
  source: 'amap' | 'cache';
  note: string;
}

interface AmapPoi {
  name?: string;
  type?: string;
  address?: string | unknown[];
  location?: string;
  adname?: string;
  cityname?: string;
  biz_ext?: { rating?: string; cost?: string; open_time?: string; opentime2?: string };
  photos?: { title?: string; url?: string }[];
}

const str = (v: unknown): string | undefined =>
  typeof v === 'string' && v.trim() && v !== '[]' ? v.trim() : undefined;

const num = (v: unknown): number | undefined => {
  const s = str(v);
  const n = s ? Number(s) : NaN;
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

function categoryOf(type: string, name: string): Category {
  const t = `${type} ${name}`;
  if (/博物馆|展览|美术馆|纪念馆/.test(t)) return 'museum';
  if (/温泉/.test(t)) return 'hot_spring';
  if (/游乐|主题公园|水上乐园/.test(t)) return 'theme_park';
  if (/酒吧|夜总会|KTV|娱乐场所/.test(t)) return 'nightlife';
  if (/咖啡|茶座|甜品|饮品/.test(t)) return 'cafe';
  if (/餐饮|中餐|西餐|小吃|快餐|火锅|烧烤|面馆/.test(t)) return 'restaurant';
  if (/购物|商场|步行街|专卖|超市/.test(t)) return 'shopping';
  if (/公园|植物园|湿地|森林|山|湖|沙滩|温泉/.test(t)) return 'nature';
  if (/风景名胜|景点|寺|庙|古镇|古建|遗址|塔|城墙|观景/.test(t)) return 'sight';
  return 'sight';
}

const DURATION: Record<string, number> = {
  sight: 90,
  museum: 120,
  nature: 120,
  restaurant: 75,
  cafe: 50,
  shopping: 60,
  nightlife: 90,
  theme_park: 240,
  hot_spring: 150,
  hiking: 180,
  landmark: 60,
};

function tagsOf(cat: Category, type: string, name: string): Interest[] {
  const out = new Set<Interest>();
  const t = `${type} ${name}`;
  if (cat === 'restaurant' || cat === 'cafe') out.add('food');
  if (cat === 'nature' || cat === 'hiking') out.add('nature');
  if (cat === 'museum' || /寺|庙|古镇|遗址|博物/.test(t)) out.add('history');
  if (cat === 'shopping') out.add('shopping');
  if (cat === 'nightlife') out.add('nightlife');
  if (cat === 'theme_park') out.add('theme_park');
  if (/古镇|老街|市井/.test(t)) out.add('local_life');
  if (/风景|观景|塔|湖|山/.test(t)) out.add('photography');
  if (out.size === 0) out.add('sight' as Interest);
  return [...out];
}

/** 「周一至周日 09:00-22:00」→ {open, close}；「24小时营业」→ 00:00/23:59 */
function hoursOf(p: AmapPoi, cat: Category): { open: string; close: string; verified: boolean } {
  const raws = [str(p.biz_ext?.opentime2), str(p.biz_ext?.open_time)].filter(Boolean) as string[];
  for (const raw of raws) {
    if (/24\s*小时/.test(raw)) return { open: '00:00', close: '23:59', verified: true };
    const m = /(\d{1,2})[:：](\d{2})\s*[-–—~至到]+\s*(\d{1,2})[:：](\d{2})/.exec(raw);
    if (m) {
      const pad = (h: string, mi: string) => `${h.padStart(2, '0')}:${mi}`;
      return { open: pad(m[1], m[2]), close: pad(m[3], m[4]), verified: true };
    }
  }
  const fallback: Record<string, [string, string]> = {
    restaurant: ['11:00', '21:30'],
    cafe: ['10:00', '22:00'],
    nightlife: ['18:00', '02:00'],
    shopping: ['10:00', '22:00'],
    museum: ['09:00', '17:00'],
  };
  const [open, close] = fallback[cat] ?? ['08:30', '18:00'];
  return { open, close, verified: false };
}

function toSeed(p: AmapPoi, cityCode: string, i: number): PoiSeed | null {
  const name = str(p.name);
  const loc = str(p.location);
  if (!name || !loc) return null;
  const [lngS, latS] = loc.split(',');
  const lat = Number(latS);
  const lng = Number(lngS);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const type = str(p.type) ?? '';
  const cat = categoryOf(type, name);
  const h = hoursOf(p, cat);
  const rating = num(p.biz_ext?.rating) ?? 0;
  const cost = num(p.biz_ext?.cost);

  return {
    poi_id: `AM-${cityCode}-${String(i).padStart(3, '0')}`,
    name,
    city: cityCode,
    lat,
    lng,
    area: str(p.adname) ?? '',
    category: cat,
    tags: tagsOf(cat, type, name),
    duration_min: DURATION[cat] ?? 90,
    price: cost ? Math.round(cost) : 0,
    open: h.open,
    close: h.close,
    closed_days: [],
    hours_confidence: h.verified ? 'verified' : 'estimated',
    rating,
    indoor: ['museum', 'cafe', 'restaurant', 'shopping', 'nightlife'].includes(cat),
    booking_required: false,
    blurb: [str(p.address), type.split(';').pop()].filter(Boolean).join(' · ').slice(0, 60) || name,
  };
}

async function amapGet(url: string, timeoutMs = 12000): Promise<Record<string, unknown> | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface QuerySpec {
  types: string;
  pages: number;
}

const SPECS: QuerySpec[] = [
  { types: '110000', pages: 2 }, // 风景名胜
  { types: '050000', pages: 2 }, // 餐饮
  { types: '140000', pages: 1 }, // 科教文化（博物馆/美术馆）
  { types: '050500', pages: 1 }, // 咖啡
  { types: '060000', pages: 1 }, // 购物
  { types: '100000', pages: 1 }, // 住宿
];

function cacheFile(key: string) {
  return resolve(CACHE_DIR, `${key}.json`);
}

export function readPackCache(key: string): CityPack | null {
  try {
    const f = cacheFile(key);
    if (!existsSync(f)) return null;
    const pack = JSON.parse(readFileSync(f, 'utf8')) as CityPack;
    if (Date.now() - pack.generated_at > TTL) return null;
    return { ...pack, source: 'cache' };
  } catch {
    return null;
  }
}

export async function buildCityPack(name: string, key: string): Promise<CityPack> {
  const cached = readPackCache(name);
  if (cached) return cached;

  const geo = await amapGet(`${GEO}?key=${key}&address=${encodeURIComponent(name)}&output=json`);
  const geoList = (geo?.geocodes as { location?: string; adcode?: string; city?: string; province?: string }[]) ?? [];
  const g = geoList[0];
  if (!g?.location) throw new Error(`高德找不到「${name}」这个城市`);

  const [lngS, latS] = g.location.split(',');
  const adcode = g.adcode ?? '';
  const cityCode = `amap-${adcode || name}`;
  const cityName = (g.city || name).replace(/市$/, '');

  const pois: PoiSeed[] = [];
  const photos: Record<string, string> = {};
  const addresses: Record<string, string> = {};
  let lodging: CitySeed['lodging'] | null = null;
  let idx = 0;

  for (const spec of SPECS) {
    for (let page = 1; page <= spec.pages; page++) {
      const url =
        `${ENDPOINT}?key=${key}&types=${spec.types}&city=${encodeURIComponent(adcode || cityName)}` +
        `&citylimit=true&offset=25&page=${page}&extensions=all`;
      const data = await amapGet(url);
      const list = (data?.pois as AmapPoi[]) ?? [];
      for (const p of list) {
        const seed = toSeed(p, cityCode, idx);
        if (!seed) continue;
        if (pois.some((x) => x.name === seed.name)) continue;
        idx += 1;
        pois.push(seed);
        const photo = str(p.photos?.[0]?.url);
        if (photo) photos[seed.poi_id] = photo.startsWith('http://') ? `https://${photo.slice(7)}` : photo;
        const addr = str(p.address);
        if (addr) addresses[seed.poi_id] = addr;
        if (spec.types === '100000' && !lodging && seed.lat) {
          lodging = { name: seed.name, lat: seed.lat, lng: seed.lng, price: seed.price || 300, area: seed.area };
        }
      }
      await sleep(400);
      if (list.length < 25) break;
    }
  }

  if (pois.length === 0) throw new Error(`高德没有返回「${name}」的点位`);

  const city: CitySeed = {
    code: cityCode,
    name: cityName,
    center: { lat: Number(latS), lng: Number(lngS) },
    lodging:
      lodging ?? {
        name: `${cityName}市区 · 商务酒店`,
        lat: Number(latS),
        lng: Number(lngS),
        price: 320,
        area: '市区',
      },
    aliases: [name, cityName, `${cityName}市`],
  };

  const pack: CityPack = {
    city,
    pois,
    photos,
    addresses,
    generated_at: Date.now(),
    source: 'amap',
    note: `高德实时抓取：${pois.length} 个点位（${pois.filter((p) => p.category === 'restaurant' || p.category === 'cafe').length} 个吃饭的地方）`,
  };

  try {
    mkdirSync(CACHE_DIR, { recursive: true });
    writeFileSync(cacheFile(name), JSON.stringify(pack, null, 2), 'utf8');
  } catch {
    /* 缓存写不进去不影响使用 */
  }

  return pack;
}
