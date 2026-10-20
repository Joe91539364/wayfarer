/**
 * 幸福时刻：前端一侧的上传 / 更新 / 删除。
 *
 * 手机原图动辄 5–8MB，直接 base64 传过去既慢又占内存，
 * 所以先在本机用 canvas 缩到长边 1600、质量 0.82 再发。
 * 16MP 的照片这一步能压到 300–500KB，肉眼看不出差别。
 */

import type { Moment } from '../domain/moments';

const MAX_SIDE = 1600;
const QUALITY = 0.82;
const KEEP_RAW_UNDER = 320_000;

export function momentUrl(m: Moment): string {
  return `/api/moments/file/${encodeURIComponent(m.file)}`;
}

export function humanSize(bytes: number): string {
  if (!bytes) return '0 KB';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((ok, bad) => {
    const fr = new FileReader();
    fr.onload = () => ok(String(fr.result));
    fr.onerror = () => bad(new Error('读不了这个文件'));
    fr.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((ok, bad) => {
    const img = new Image();
    img.onload = () => ok(img);
    img.onerror = () => bad(new Error('这个格式浏览器解不开'));
    img.src = src;
  });
}

/** 把 File 变成可直接发给服务端的 dataURL（尽量小，但别糊） */
export async function fileToDataUrl(file: File): Promise<string> {
  const raw = await readAsDataUrl(file);

  // 动图交给 canvas 就变静帧了，小于 4MB 原样送
  if (file.type === 'image/gif' && file.size <= 4_000_000) return raw;

  let img: HTMLImageElement;
  try {
    img = await loadImage(raw);
  } catch {
    // HEIC 这类浏览器解不开的，原样发，服务端也只负责存
    return raw;
  }

  const long = Math.max(img.width, img.height);
  if (!long) return raw;
  if (long <= MAX_SIDE && raw.length <= KEEP_RAW_UNDER) return raw;

  const scale = Math.min(1, MAX_SIDE / long);
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return raw;
  ctx.drawImage(img, 0, 0, w, h);

  const out = canvas.toDataURL('image/jpeg', QUALITY);
  // 本来就小的 png 压完可能反而更大（磨砂/纯色图），这时留原图
  return out.length < raw.length ? out : raw;
}

export interface UploadMeta {
  trip_id: string | null;
  day: number | null;
  poi_id?: string;
  poi_name?: string;
  caption?: string;
  stars?: number;
  taken_at?: string;
}

async function asJson<T>(r: Response): Promise<T> {
  const j = (await r.json().catch(() => ({}))) as { error?: string };
  if (!r.ok) throw new Error(j.error ?? `服务端返回 ${r.status}`);
  return j as T;
}

export async function fetchMoments(): Promise<Moment[]> {
  try {
    const r = await fetch('/api/moments', { cache: 'no-store' });
    if (!r.ok) return [];
    const j = (await r.json()) as { items?: Moment[] };
    return Array.isArray(j.items) ? j.items : [];
  } catch {
    // 服务没起来时不要让整个页面报错，静静当没有
    return [];
  }
}

export async function uploadMoment(file: File, meta: UploadMeta): Promise<Moment> {
  const dataUrl = await fileToDataUrl(file);
  const r = await fetch('/api/moments', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...meta, dataUrl }),
  });
  return asJson<Moment>(r);
}

export async function patchMoment(
  id: string,
  patch: Partial<Pick<Moment, 'caption' | 'stars' | 'day' | 'poi_id' | 'poi_name' | 'trip_id'>>,
): Promise<Moment> {
  const r = await fetch(`/api/moments/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(patch),
  });
  return asJson<Moment>(r);
}

export async function deleteMoment(id: string): Promise<boolean> {
  try {
    const r = await fetch(`/api/moments/${encodeURIComponent(id)}`, { method: 'DELETE' });
    return r.ok;
  } catch {
    return false;
  }
}
