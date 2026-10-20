// 零依赖生成 PWA 图标：SDF 画「行程路径」（折线 + 起点圆点 + 终点定位环），
// 4x 超采样抗锯齿，纯 Node 手写 PNG 编码（zlib 内置）。
// 用法：node scripts/make-icons.mjs  →  public/icons/*.png
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public', 'icons');
mkdirSync(OUT, { recursive: true });

// ---------- PNG ----------
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}
function chunk(type, data) {
  const out = Buffer.alloc(8 + data.length + 4);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}
function png(w, h, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------- SDF ----------
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
function sdSegment(px, py, ax, ay, bx, by) {
  const pax = px - ax, pay = py - ay, bax = bx - ax, bay = by - ay;
  const h = clamp((pax * bax + pay * bay) / (bax * bax + bay * bay || 1), 0, 1);
  const dx = pax - bax * h, dy = pay - bay * h;
  return Math.hypot(dx, dy);
}
function sdCircle(px, py, cx, cy, r) {
  return Math.hypot(px - cx, py - cy) - r;
}
// 折线距离 = 各段最小值
function sdPath(px, py, pts) {
  let d = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    d = Math.min(d, sdSegment(px, py, ...pts[i], ...pts[i + 1]));
  }
  return d;
}
const cov = (d, size) => clamp(0.5 - d * size, 0, 1); // d 为归一坐标距离，1px 内过渡

// ---------- 图案 ----------
const BG = [0xad, 0x45, 0x26]; // --accent 陶土红
const FG = [0xf6, 0xf2, 0xea]; // --paper 米白

// 路径点（画布归一坐标），maskable 版整体缩到中心 72%，留安全区
const PATH = [
  [0.20, 0.76],
  [0.38, 0.48],
  [0.56, 0.62],
  [0.80, 0.24],
];
const START = [0.20, 0.76];
const END = [0.80, 0.24];

// 渲染：每个输出像素采 4x4=16 个子样本求平均覆盖率（超采样抗锯齿）
function render2(size, { scale = 1 }) {
  const img = Buffer.alloc(size * size * 4);
  const pt = ([x, y]) => [0.5 + (x - 0.5) * scale, 0.5 + (y - 0.5) * scale];
  const P = PATH.map(pt);
  const A = pt(START), B = pt(END);
  const lw = 0.052 * scale;
  const dotR = 0.06 * scale;
  const ringR = 0.078 * scale;
  const ringW = 0.032 * scale;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let acc = 0;
      for (let sy = 0; sy < 4; sy++) {
        for (let sx = 0; sx < 4; sx++) {
          const px = (x + (sx + 0.5) / 4) / size;
          const py = (y + (sy + 0.5) / 4) / size;
          let a = 0;
          a = Math.max(a, cov(sdPath(px, py, P) - lw / 2, size));
          a = Math.max(a, cov(sdCircle(px, py, A[0], A[1], dotR), size));
          a = Math.max(a, cov(Math.abs(sdCircle(px, py, B[0], B[1], ringR)) - ringW / 2, size));
          acc += clamp(a, 0, 1);
        }
      }
      const t = acc / 16;
      const i = (y * size + x) * 4;
      img[i] = Math.round(BG[0] + (FG[0] - BG[0]) * t);
      img[i + 1] = Math.round(BG[1] + (FG[1] - BG[1]) * t);
      img[i + 2] = Math.round(BG[2] + (FG[2] - BG[2]) * t);
      img[i + 3] = 255;
    }
  }
  return img;
}

const targets = [
  { file: 'icon-192.png', size: 192, scale: 1 },
  { file: 'icon-512.png', size: 512, scale: 1 },
  { file: 'maskable-512.png', size: 512, scale: 0.72 },
  { file: 'apple-touch-icon.png', size: 180, scale: 0.92 },
];
for (const t of targets) {
  const buf = png(t.size, t.size, render2(t.size, { scale: t.scale }));
  writeFileSync(join(OUT, t.file), buf);
  console.log(`${t.file}  ${t.size}x${t.size}  ${(buf.length / 1024).toFixed(1)} KB`);
}
console.log('icons done');
