import type { CitySeed, PoiSeed } from './pois';
import { registerCityPack } from './pois';

/**
 * 城市包（客户端）。
 *
 * 内置 5 个城市之外的任何地方，都在这里向本地服务要一份用高德现抓的数据，
 * 注册进内存后，规划和校验把它当普通城市用。
 */

export interface CityPackResponse {
  city: CitySeed;
  pois: PoiSeed[];
  photos: Record<string, string>;
  addresses: Record<string, string>;
  generated_at: number;
  source: 'amap' | 'cache';
  note: string;
}

const PHOTOS = new Map<string, string>();
const ADDRESSES = new Map<string, string>();
const PACKED = new Set<string>();

export function photoFor(poiId: string): string | undefined {
  return PHOTOS.get(poiId);
}

export function addressFor(poiId: string): string | undefined {
  return ADDRESSES.get(poiId);
}

export function isPacked(cityCode: string): boolean {
  return PACKED.has(cityCode);
}

export type PackResult =
  | { ok: true; pack: CityPackResponse; cached: boolean }
  | { ok: false; error: string; needKey?: boolean };

export async function ensureCityPack(name: string): Promise<PackResult> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 90_000);
  try {
    const res = await fetch(`/api/city-pack?city=${encodeURIComponent(name)}`, {
      cache: 'no-store',
      signal: controller.signal,
    });
    const data = (await res.json()) as CityPackResponse & { error?: string; needKey?: boolean };
    if (!res.ok || data.error) {
      return {
        ok: false,
        error: data.error ?? `城市包构建失败（HTTP ${res.status}）`,
        needKey: Boolean(data.needKey),
      };
    }
    registerCityPack(data.city, data.pois);
    for (const [id, url] of Object.entries(data.photos ?? {})) PHOTOS.set(id, url);
    for (const [id, addr] of Object.entries(data.addresses ?? {})) ADDRESSES.set(id, addr);
    PACKED.add(data.city.code);
    return { ok: true, pack: data, cached: data.source === 'cache' };
  } catch (e) {
    // 把浏览器那句没人看得懂的「Failed to fetch」翻译成人话：
    // 九成是本地服务压根没在跑，直接告诉用户怎么把它拉起来。
    const raw = e instanceof Error ? e.message : String(e);
    if (e instanceof DOMException && e.name === 'AbortError') {
      return { ok: false, error: '城市包构建超时（90 秒）。可能是网络问题，重试一次；还不行就重启本地服务。' };
    }
    if (/failed to fetch|fetch failed|networkerror|load failed/i.test(raw)) {
      return {
        ok: false,
        error:
          '连不上本地服务（127.0.0.1:8787）。双击项目文件夹里的 start.cmd 把它启动，然后回来再点一次「确认，开始规划」。',
      };
    }
    return { ok: false, error: raw };
  } finally {
    window.clearTimeout(timer);
  }
}
