/**
 * 幸福时刻：旅行里拍下的照片 + 当时的一句话。
 *
 * 和别的地方不一样，这里**一张图都不上传云端**：原图落在 data/moments/，
 * 只有一份 index.json 记元数据。断网、换城市、服务器关掉都还在。
 *
 * 设计上刻意不做「相册」：照片必须挂在某一趟行程的某一天上，
 * 所以接口围绕 day / poi 组织 —— 它的用途是「把这次旅行复习一遍」，
 * 不是又一个图床。
 */

import { existsSync, mkdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

const DIR = resolve(process.cwd(), 'data', 'moments');
const INDEX = join(DIR, 'index.json');

export interface Moment {
  id: string;
  /** 磁盘文件名（不含目录） */
  file: string;
  /** 属于哪一趟行程（Itinerary.id）。换了目的地就不会混进「第 1 天」 */
  trip_id: string | null;
  caption: string;
  /** 幸福指数 1–5，默认 3 */
  stars: number;
  /** 行程第几天；null 表示没归属 */
  day: number | null;
  poi_id?: string;
  poi_name?: string;
  /** 拍摄时间（照片自带的修改时间兜底），ISO 字符串 */
  taken_at: string;
  created_at: number;
  size: number;
}

const ALLOWED: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.heic': 'image/heic',
};

function ensureDir() {
  if (!existsSync(DIR)) mkdirSync(DIR, { recursive: true });
}

export function listMoments(): Moment[] {
  try {
    if (!existsSync(INDEX)) return [];
    const raw = JSON.parse(readFileSync(INDEX, 'utf8')) as Moment[];
    return Array.isArray(raw) ? raw.filter((m) => m && m.file && existsSync(join(DIR, m.file))) : [];
  } catch {
    return [];
  }
}

function writeIndex(list: Moment[]) {
  ensureDir();
  writeFileSync(INDEX, JSON.stringify(list, null, 2), 'utf8');
}

/** 保存一张照片。ext 由前端按 MIME 给出，服务端只认白名单 */
export function saveMoment(
  bytes: Buffer,
  ext: string,
  meta: {
    trip_id?: string | null;
    caption?: string;
    stars?: number;
    day?: number | null;
    poi_id?: string;
    poi_name?: string;
    taken_at?: string;
  },
): Moment {
  ensureDir();
  const safeExt = ALLOWED[ext.toLowerCase()] ? ext.toLowerCase() : '.jpg';
  const id = `m${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const file = `${id}${safeExt}`;
  writeFileSync(join(DIR, file), bytes);

  const moment: Moment = {
    id,
    file,
    trip_id: meta.trip_id ?? null,
    caption: (meta.caption ?? '').slice(0, 80),
    stars: Math.min(5, Math.max(1, Math.round(Number(meta.stars) || 3))),
    day: meta.day === undefined || meta.day === null ? null : Number(meta.day),
    poi_id: meta.poi_id,
    poi_name: meta.poi_name,
    taken_at: meta.taken_at ?? new Date().toISOString(),
    created_at: Date.now(),
    size: bytes.length,
  };

  const list = listMoments();
  list.unshift(moment);
  writeIndex(list);
  return moment;
}

export function updateMoment(id: string, patch: Partial<Omit<Moment, 'id' | 'file'>>): Moment | null {
  const list = listMoments();
  const hit = list.find((m) => m.id === id);
  if (!hit) return null;
  if (typeof patch.caption === 'string') hit.caption = patch.caption.slice(0, 80);
  if (typeof patch.trip_id === 'string' || patch.trip_id === null) hit.trip_id = patch.trip_id;
  if (patch.stars != null) hit.stars = Math.min(5, Math.max(1, Math.round(Number(patch.stars))));
  if (patch.day !== undefined) hit.day = patch.day === null ? null : Number(patch.day);
  if (patch.poi_id !== undefined) hit.poi_id = patch.poi_id;
  if (patch.poi_name !== undefined) hit.poi_name = patch.poi_name;
  writeIndex(list);
  return hit;
}

export function removeMoment(id: string): boolean {
  const list = listMoments();
  const hit = list.find((m) => m.id === id);
  if (!hit) return false;
  try {
    unlinkSync(join(DIR, hit.file));
  } catch {
    /* 文件已经不在了也当删成功 */
  }
  writeIndex(list.filter((m) => m.id !== id));
  return true;
}

/** 给静态服务用：只允许 data/moments 里的白名单图片 */
export function momentFile(name: string): { path: string; mime: string } | null {
  if (!/^[a-z0-9]+\.[a-z0-9]+$/i.test(name)) return null;
  const ext = extname(name).toLowerCase();
  if (!ALLOWED[ext]) return null;
  const path = join(DIR, name);
  if (!path.startsWith(DIR) || !existsSync(path)) return null;
  return { path, mime: ALLOWED[ext] };
}

export function momentSize(name: string): number {
  try {
    return statSync(join(DIR, name)).size;
  } catch {
    return 0;
  }
}
