/**
 * 幸福时刻：纯计算部分（分组 / 统计 / 生成回忆长页）。
 *
 * 这里刻意不碰 DOM 和网络，所以能在 node 里直接测。
 * 上传、压缩、调接口那些事在 src/data/moments.ts。
 */

import type { Itinerary } from './schema';
import { formatDateCN, weekdayLabel } from './time';

/** 与服务端 server/moments.ts 的 Moment 保持一致 */
export interface Moment {
  id: string;
  file: string;
  trip_id: string | null;
  caption: string;
  /** 幸福指数 1–5 */
  stars: number;
  day: number | null;
  poi_id?: string;
  poi_name?: string;
  taken_at: string;
  created_at: number;
  size: number;
}

export const MAX_STARS = 5;

export interface MomentGroup {
  day: number | null;
  date: string | null;
  title: string;
  area: string | null;
  items: Moment[];
}

function byShotTime(list: Moment[]): Moment[] {
  return [...list].sort((a, b) => a.taken_at.localeCompare(b.taken_at) || a.created_at - b.created_at);
}

/**
 * 按行程天分组。
 * 先按天的序号排，没归到某一天的（拖进来忘了选）统一放最后，
 * 这样「第 3 天」不会插在「第 10 天」前面。
 */
export function groupByDay(moments: Moment[], iti: Itinerary | null): MomentGroup[] {
  const buckets = new Map<number | null, Moment[]>();
  for (const m of moments) {
    const k = m.day ?? null;
    const arr = buckets.get(k);
    if (arr) arr.push(m);
    else buckets.set(k, [m]);
  }

  const out: MomentGroup[] = [];
  const days = [...buckets.keys()]
    .filter((k): k is number => typeof k === 'number')
    .sort((a, b) => a - b);

  for (const day of days) {
    const d = iti?.days.find((x) => x.day_index === day) ?? null;
    out.push({
      day,
      date: d?.date ?? null,
      title: `第 ${day} 天`,
      area: d?.base_area?.name ?? null,
      items: byShotTime(buckets.get(day) ?? []),
    });
  }

  const loose = buckets.get(null);
  if (loose && loose.length) {
    out.push({ day: null, date: null, title: '还没归到哪一天', area: null, items: byShotTime(loose) });
  }
  return out;
}

export interface MomentStats {
  count: number;
  /** 平均幸福指数，一位小数；没有照片时为 0 */
  avg: number;
  /** 涉及几个点位 */
  spots: number;
  /** 平均分对应的说法，别在页面上干巴巴报数字 */
  word: string;
}

export function momentStats(moments: Moment[]): MomentStats {
  const n = moments.length;
  const avg = n ? moments.reduce((s, m) => s + (m.stars || 0), 0) / n : 0;
  const spots = new Set(moments.map((m) => m.poi_id).filter(Boolean)).size;
  const rounded = Math.round(avg * 10) / 10;
  return { count: n, avg: rounded, spots, word: moodWord(rounded) };
}

export function moodWord(avg: number): string {
  if (avg <= 0) return '还没开始';
  if (avg < 2.5) return '有点平淡';
  if (avg < 3.5) return '还不错';
  if (avg < 4.3) return '挺开心的';
  if (avg < 4.8) return '很幸福';
  return '想再去一次';
}

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);

function hearts(n: number): string {
  const k = Math.min(MAX_STARS, Math.max(1, Math.round(n)));
  return '♥'.repeat(k) + '<i>' + '♥'.repeat(MAX_STARS - k) + '</i>';
}

/**
 * 生成一张可以发出去的「回忆长页」。
 *
 * 不是把照片排成网格就完事 —— 它按天分段，每天带上那天走了哪儿，
 * 照片下面写当时那句话。看上去像一封信，不像相册。
 * 打印样式单独调过，Ctrl+P 存 PDF 就是一页页的。
 */
export function letterHtml(iti: Itinerary | null, groups: MomentGroup[], origin: string): string {
  const all = groups.flatMap((g) => g.items);
  const st = momentStats(all);
  const dest = iti?.meta.destination ?? '这趟旅行';
  const span =
    iti?.meta.start_date && iti.meta.end_date
      ? `${formatDateCN(iti.meta.start_date)} — ${formatDateCN(iti.meta.end_date)}`
      : '';
  const people = iti ? `${iti.meta.travelers.adults} 人` : '';
  const imgUrl = (m: Moment) => `${origin}/api/moments/file/${encodeURIComponent(m.file)}`;

  const dayHtml = groups
    .map((g) => {
      const dateLine = g.date ? `${formatDateCN(g.date)} · ${weekdayLabel(g.date)}` : '';
      const photos = g.items
        .map(
          (m) => `
        <figure>
          <img src="${imgUrl(m)}" alt="${esc(m.caption || '旅途照片')}" loading="lazy" />
          <figcaption>
            <span class="cap">${m.caption ? esc(m.caption) : '<i class="dim">没有写什么</i>'}</span>
            <span class="hh">${hearts(m.stars)}</span>
          </figcaption>
        </figure>`,
        )
        .join('');
      return `
      <section class="day">
        <header>
          <b>${esc(g.title)}</b>
          ${g.area ? `<span class="area">${esc(g.area)}</span>` : ''}
          ${dateLine ? `<span class="date">${esc(dateLine)}</span>` : ''}
          <span class="n">${g.items.length} 个时刻</span>
        </header>
        <div class="grid ${g.items.length === 1 ? 'one' : ''}">${photos}</div>
      </section>`;
    })
    .join('');

  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(dest)} · 回忆长页</title>
<style>
  :root { --ink: #2b2721; --dim: #8c8377; --line: #ddd3c2; --warm: #b4552f; }
  * { box-sizing: border-box; }
  body {
    margin: 0; background: #f7f3ea; color: var(--ink);
    font: 15px/1.75 "Songti SC", "Noto Serif CJK SC", "Source Han Serif SC", Georgia, serif;
    -webkit-font-smoothing: antialiased;
  }
  .sheet { max-width: 760px; margin: 0 auto; padding: 64px 28px 96px; }
  .eyebrow {
    letter-spacing: .32em; font-size: 11px; text-transform: uppercase;
    color: var(--dim); margin-bottom: 18px;
  }
  h1 { font-size: 40px; line-height: 1.2; margin: 0 0 14px; font-weight: 600; letter-spacing: .02em; }
  .lead { color: var(--dim); font-size: 13.5px; margin: 0 0 10px; }
  .lead b { color: var(--ink); font-weight: 600; }
  hr.rule { border: 0; border-top: 1px solid var(--line); margin: 34px 0 8px; }
  .day { margin: 44px 0 0; page-break-inside: avoid; }
  .day header {
    display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap;
    padding-bottom: 10px; border-bottom: 1px solid var(--line); margin-bottom: 18px;
  }
  .day header b { font-size: 19px; letter-spacing: .04em; }
  .day header .area { color: var(--warm); font-size: 13px; }
  .day header .date { color: var(--dim); font-size: 12.5px; }
  .day header .n { margin-left: auto; color: var(--dim); font-size: 12px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
  .grid.one { grid-template-columns: 1fr; }
  figure { margin: 0; }
  figure img {
    width: 100%; display: block; border-radius: 3px; background: #e6ddcd;
    box-shadow: 0 8px 22px -12px rgba(60, 42, 20, .45);
  }
  figcaption { display: flex; gap: 10px; align-items: baseline; margin-top: 9px; font-size: 13px; }
  .cap { flex: 1; }
  .dim { color: var(--dim); font-style: normal; }
  .hh { color: var(--warm); letter-spacing: 2px; font-size: 11px; white-space: nowrap; }
  .hh i { color: #d8cbb6; font-style: normal; }
  .sign { margin-top: 64px; padding-top: 22px; border-top: 1px solid var(--line); color: var(--dim); font-size: 12.5px; }
  .sign b { color: var(--ink); }
  .empty { color: var(--dim); padding: 40px 0; }
  .print {
    position: fixed; right: 20px; top: 20px; z-index: 9;
    border: 1px solid var(--line); background: #fffdf8; color: var(--ink);
    padding: 9px 16px; border-radius: 999px; font: inherit; font-size: 13px; cursor: pointer;
    box-shadow: 0 6px 18px -10px rgba(60, 42, 20, .5);
  }
  .print:hover { border-color: var(--warm); color: var(--warm); }
  @media (max-width: 620px) {
    .sheet { padding: 44px 18px 72px; }
    h1 { font-size: 30px; }
    .grid { grid-template-columns: 1fr; }
  }
  @media print {
    body { background: #fff; }
    .print { display: none; }
    .sheet { padding: 0; max-width: none; }
    figure img { box-shadow: none; }
  }
</style>
</head>
<body>
<button class="print" onclick="window.print()">打印 / 存为 PDF</button>
<div class="sheet">
  <div class="eyebrow">行迹 · 旅途回忆</div>
  <h1>${esc(dest)}</h1>
  <p class="lead">${span ? esc(span) : ''}${span && people ? ' · ' : ''}${esc(people)}</p>
  <p class="lead">
    这一趟留下 <b>${st.count}</b> 个幸福时刻，平均幸福指数 <b>${st.avg || '—'}</b>
    （${esc(st.word)}）。
  </p>
  <hr class="rule" />
  ${dayHtml || '<p class="empty">还没有照片。回到「幸福时刻」，把这次旅行的照片拖进去试试。</p>'}
  <div class="sign">
    由行迹 Wayfarer 整理 · 照片只存在这台设备上，不上传云端
  </div>
</div>
</body>
</html>`;
}
