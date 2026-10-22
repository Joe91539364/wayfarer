/**
 * 本地服务：静态站点 + 爬虫 API。
 *
 * 为什么需要它：
 *   浏览器有同源策略，前端不可能自己去抓别人的页面，也不该把 Key 放在页面里。
 *   所以抓取放在 Node 侧，前端只调本地接口读结果。
 *
 * 接口：
 *   GET  /api/health             存活检查 + 常驻调度状态（uptime / 上次刷新 / 下轮时间）
 *   GET  /api/now                权威时钟（epoch / ISO / 时区），前端据此校准本机钟
 *   GET  /api/catalog            最新事实层（catalog.json）
 *   GET  /api/report             最近一轮的运行报告（含日志）
 *   GET  /api/keys               看 Key 配没配（不回传明文）
 *   POST /api/keys               写 Key        { amap?, baidu?, glm? }
 *   POST /api/crawl              手动触发一轮，返回报告（同一时间只跑一轮）
 *   POST /api/refresh            同上，但返回调度状态
 *   GET  /api/sources            数据源登记表（含许可与接入方式）
 *   GET  /api/moments            幸福时刻列表（照片元数据）
 *   POST /api/moments            存一张照片（base64 dataURL，落盘到 data/moments）
 *   PATCH/DELETE /api/moments/:id  改一句话 / 天数 / 幸福指数，或删掉
 *   GET  /api/moments/file/:name 取照片字节
 *
 * 常驻：服务自带 30 分钟定时刷新（CRAWL_INTERVAL_MIN 可调），
 *      配合 scripts/keepalive.mjs 做进程守护，start.cmd 一键拉起。
 *
 * 用法： npm run serve  →  http://127.0.0.1:8787
 */

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { existsSync, mkdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, normalize, resolve } from 'node:path';
import { networkInterfaces } from 'node:os';
import { ROOT, allSourceMeta, loadKeys, loadSettings, runCrawl, saveKeys, saveSettings } from './crawler';
import { ping, json } from './llm';
import { listMoments, momentFile, momentSize, removeMoment, saveMoment, updateMoment } from './moments';
import { buildCityPack } from './sources/citypack';
import { PLATFORM_MAP } from '../src/data/catalog';
import type { Catalog } from '../src/data/catalog';

const PORT = Number(process.env.PORT ?? 8787);
// 默认监听全部网卡：手机/平板在同一网络下才能通过局域网地址访问。
// 想只给自己看，设 HOST=127.0.0.1。
const HOST = process.env.HOST ?? '0.0.0.0';
const DIST = resolve(ROOT, 'dist');
const PUBLIC = resolve(ROOT, 'public');
const PID_FILE = resolve(ROOT, 'data/server.pid');

/**
 * 常驻模式：服务自己在后台每 30 分钟刷一轮数据。
 * 之所以放在服务里而不是另起一个 crawl:watch 进程 ——
 * 常驻网页只该占用一个进程，多开一个就多一个会挂掉的东西。
 */
const AUTO_MIN = Number(process.env.CRAWL_INTERVAL_MIN ?? 30);
const AUTO_MS = Math.max(1, AUTO_MIN) * 60 * 1000;

type SchedState = {
  lastRunAt: number | null;
  lastOk: boolean | null;
  lastSummary: string | null;
  nextRunAt: number | null;
  running: boolean;
  rounds: number;
};
const sched: SchedState = {
  lastRunAt: null,
  lastOk: null,
  lastSummary: null,
  nextRunAt: Date.now() + AUTO_MS,
  running: false,
  rounds: 0,
};
const bootedAt = Date.now();

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
};

let crawlPromise: Promise<{ catalog: Catalog; report: unknown }> | null = null;
const crawlLog: string[] = [];

/** 跑一轮抓取并记录调度状态；同一时间只会有一轮在跑 */
async function triggerCrawl(why: string): Promise<number> {
  if (crawlPromise) return 0;
  const t0 = Date.now();
  sched.running = true;
  crawlLog.length = 0;
  crawlLog.push(`[${new Date().toLocaleTimeString('zh-CN')}] ${why}触发`);
  crawlPromise = runCrawl({ onLog: (line) => crawlLog.push(line) })
    .then((r) => {
      const st = (r.report as { stats?: { pois?: number; facts?: number } }).stats;
      sched.lastOk = true;
      sched.lastSummary = st ? `${st.pois ?? '?'} 个地点 / ${st.facts ?? '?'} 条事实` : '完成';
      return r;
    })
    .catch((e: unknown) => {
      sched.lastOk = false;
      sched.lastSummary = e instanceof Error ? e.message : String(e);
      crawlLog.push(`[error] ${sched.lastSummary}`);
      throw e;
    })
    .finally(() => {
      sched.running = false;
      sched.lastRunAt = Date.now();
      sched.rounds += 1;
      sched.nextRunAt = Date.now() + AUTO_MS;
      crawlPromise = null;
    });
  try {
    await crawlPromise;
  } catch {
    /* 失败也照常进入下一轮，不因此停服 */
  }
  return Date.now() - t0;
}

function send(res: ServerResponse, status: number, body: string, type = 'application/json; charset=utf-8') {
  res.writeHead(status, {
    'Content-Type': type,
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'content-type',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  });
  res.end(body);
}

/** 读请求体。limit 是字符数上限：普通 JSON 1MB 够用，传照片（base64）要放宽 */
function readBody(req: IncomingMessage, limit = 1_000_000): Promise<string> {
  return new Promise((resolveBody) => {
    let data = '';
    req.on('data', (c) => {
      data += c;
      if (data.length > limit) req.destroy();
    });
    req.on('end', () => resolveBody(data));
  });
}

function serveFile(res: ServerResponse, base: string, pathname: string): boolean {
  const rel = normalize(pathname).replace(/^(\.\.[/\\])+/, '');
  const file = join(base, rel === '/' || rel === '\\' ? 'index.html' : rel);
  if (!file.startsWith(base)) return false;
  if (!existsSync(file)) return false;
  const st = statSync(file);
  if (st.isDirectory()) {
    const idx = join(file, 'index.html');
    if (!existsSync(idx)) return false;
    const body = readFileSync(idx);
    send(res, 200, body.toString('utf8'), MIME['.html']);
    return true;
  }
  const body = readFileSync(file);
  const type = MIME[extname(file)] ?? 'application/octet-stream';
  // 图标等二进制直接回 Buffer；send 只收字符串，utf8 往返会把字节打碎
  if (type.startsWith('image/') || type === 'font/woff2' || type === 'application/octet-stream') {
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' });
    res.end(body);
    return true;
  }
  send(res, 200, body.toString('utf8'), type);
  return true;
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://${HOST}:${PORT}`);

  if (req.method === 'OPTIONS') {
    send(res, 204, '');
    return;
  }

  // 权威时钟：本机时间可能不准（时区错、手动改过、虚拟机漂移），
  // 前端拿它算一次漂移再自己走秒，避免「今天」被算错一天。
  if (url.pathname === '/api/now') {
    const d = new Date();
    send(
      res,
      200,
      JSON.stringify({
        epoch: d.getTime(),
        iso: d.toISOString(),
        tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
        offsetMin: -d.getTimezoneOffset(),
      }),
    );
    return;
  }

  if (url.pathname === '/api/health') {
    const cat = resolve(PUBLIC, 'catalog.json');
    const catAt = existsSync(cat) ? statSync(cat).mtimeMs : null;
    send(
      res,
      200,
      JSON.stringify({
        ok: true,
        keys: mask(loadKeys()),
        port: PORT,
        pid: process.pid,
        uptimeSec: Math.round((Date.now() - bootedAt) / 1000),
        catalogAt: catAt,
        catalogAgeMin: catAt ? Math.round((Date.now() - catAt) / 60000) : null,
        schedule: { everyMin: AUTO_MIN, ...sched, nextRunAt: sched.nextRunAt },
      }),
    );
    return;
  }

  if (url.pathname === '/api/refresh') {
    // 页面上「立刻刷新」按钮打这里：不等定时器
    if (req.method !== 'POST') {
      send(res, 405, JSON.stringify({ error: '用 POST' }));
      return;
    }
    const r = await triggerCrawl('手动');
    send(res, 200, JSON.stringify({ ok: true, ...sched, took: r }));
    return;
  }

  if (url.pathname === '/api/catalog') {
    const f = resolve(PUBLIC, 'catalog.json');
    if (!existsSync(f)) {
      send(res, 503, JSON.stringify({ error: 'catalog 还没生成，先跑一次抓取' }));
      return;
    }
    send(res, 200, readFileSync(f, 'utf8'));
    return;
  }

  if (url.pathname === '/api/report') {
    const f = resolve(PUBLIC, 'crawl-report.json');
    if (!existsSync(f)) {
      send(res, 404, JSON.stringify({ error: '还没有运行报告' }));
      return;
    }
    send(res, 200, readFileSync(f, 'utf8'));
    return;
  }

  if (url.pathname === '/api/sources') {
    send(
      res,
      200,
      JSON.stringify({
        platforms: PLATFORM_MAP,
        note: '开放源见 /api/report 里的 runs；商业平台见 platforms',
      }),
    );
    return;
  }

  // 数据源启停（目前用来关掉会烧 token 的智谱模型补全）
  if (url.pathname === '/api/settings') {
    if (req.method === 'GET') {
      send(res, 200, JSON.stringify({ ...loadSettings(), sources: allSourceMeta() }));
      return;
    }
    if (req.method === 'POST') {
      try {
        const body = JSON.parse(await readBody(req)) as { disabledSources?: unknown };
        const list = Array.isArray(body.disabledSources)
          ? [...new Set(body.disabledSources.filter((x): x is string => typeof x === 'string'))]
          : [];
        const known = new Set(allSourceMeta().map((s) => s.id));
        const clean = list.filter((id) => known.has(id));
        saveSettings({ disabledSources: clean });
        send(res, 200, JSON.stringify({ ok: true, disabledSources: clean }));
      } catch (e) {
        send(res, 400, JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }));
      }
      return;
    }
  }

  if (url.pathname === '/api/keys') {
    if (req.method === 'GET') {
      send(res, 200, JSON.stringify(mask(loadKeys())));
      return;
    }
    if (req.method === 'POST') {
      const raw = await readBody(req);
      let body: { amap?: string; baidu?: string; glm?: string } = {};
      try {
        body = JSON.parse(raw || '{}') as { amap?: string; baidu?: string; glm?: string };
      } catch {
        send(res, 400, JSON.stringify({ error: 'bad json' }));
        return;
      }
      const cur = loadKeys();
      const next = {
        amap: (body.amap ?? '').trim() || cur.amap,
        baidu: (body.baidu ?? '').trim() || cur.baidu,
        glm: (body.glm ?? '').trim() || cur.glm,
      };
      // 传空字符串表示清除
      if (body.amap === '') next.amap = undefined as unknown as string;
      if (body.baidu === '') next.baidu = undefined as unknown as string;
      if (body.glm === '') next.glm = undefined as unknown as string;
      saveKeys({
        amap: next.amap || undefined,
        baidu: next.baidu || undefined,
        glm: next.glm || undefined,
      });
      send(res, 200, JSON.stringify(mask(loadKeys())));
      return;
    }
  }

  // 任意城市现场建包（景点/餐饮/购物/住宿），带 24h 磁盘缓存
  if (url.pathname === '/api/city-pack') {
    const city = (url.searchParams.get('city') ?? '').trim();
    const k = loadKeys().amap;
    if (!city) {
      send(res, 400, JSON.stringify({ error: '缺少 city 参数' }));
      return;
    }
    if (!k) {
      send(res, 503, JSON.stringify({ error: '没有高德 Key，无法现建城市包', needKey: 'amap' }));
      return;
    }
    try {
      const pack = await buildCityPack(city, k);
      send(res, 200, JSON.stringify(pack));
    } catch (e) {
      send(res, 502, JSON.stringify({ error: e instanceof Error ? e.message : String(e) }));
    }
    return;
  }

  // 城市坐标（城际交通要用）
  if (url.pathname === '/api/geocode') {
    const name = (url.searchParams.get('name') ?? '').trim();
    const k = loadKeys().amap;
    if (!name) {
      send(res, 400, JSON.stringify({ error: '缺少 name 参数' }));
      return;
    }
    if (!k) {
      send(res, 503, JSON.stringify({ error: '没有高德 Key' }));
      return;
    }
    interface GeoItem {
      location?: string;
      adcode?: string;
      city?: string;
      province?: string;
    }
    const r = await fetch(
      `https://restapi.amap.com/v3/geocode/geo?key=${k}&address=${encodeURIComponent(name)}&output=json`,
    )
      .then((x) => x.json() as Promise<{ geocodes?: GeoItem[] }>)
      .catch(() => ({ geocodes: [] as GeoItem[] }));
    const g = r.geocodes?.[0];
    if (!g?.location) {
      send(res, 404, JSON.stringify({ error: `找不到「${name}」` }));
      return;
    }
    const [lng, lat] = g.location.split(',').map(Number);
    send(res, 200, JSON.stringify({ name, lat, lng, adcode: g.adcode, city: g.city, province: g.province }));
    return;
  }

  // 静态地图快照：给没抓到实景图的点位兜底配图。
  // 浏览器拿到的只是 /api/staticmap?lng=..&lat=..，Key 只待在服务端，302 跳到高德出图。
  if (url.pathname === '/api/staticmap') {
    const k = loadKeys().amap;
    if (!k) {
      send(res, 503, JSON.stringify({ error: '没有高德 Key，配不了静态地图' }));
      return;
    }
    const lng = Number(url.searchParams.get('lng'));
    const lat = Number(url.searchParams.get('lat'));
    const zoom = Math.min(20, Math.max(3, Number(url.searchParams.get('zoom') ?? 16) || 16));
    const w = Math.min(750, Math.max(60, Number(url.searchParams.get('w') ?? 750) || 750));
    const h = Math.min(350, Math.max(60, Number(url.searchParams.get('h') ?? 300) || 300));
    if (!Number.isFinite(lng) || !Number.isFinite(lat) || Math.abs(lng) > 180 || Math.abs(lat) > 90) {
      send(res, 400, JSON.stringify({ error: '经纬度不合法' }));
      return;
    }
    const loc = `${lng.toFixed(6)},${lat.toFixed(6)}`;
    const target =
      `https://restapi.amap.com/v3/staticmap?location=${loc}&zoom=${zoom}` +
      `&size=${w}*${h}&scale=2&markers=mid,0xFF5252,:${loc}&key=${k}`;
    res.writeHead(302, { Location: target, 'Cache-Control': 'public, max-age=86400' });
    res.end();
    return;
  }

  if (url.pathname === '/api/glm/test') {
    const k = loadKeys().glm;
    if (!k) {
      send(res, 200, JSON.stringify({ ok: false, error: '没有配置智谱 Key' }));
      return;
    }
    const result = await ping(k);
    send(res, 200, JSON.stringify(result));
    return;
  }

  // 表达推算：用户说的小白句有没有会带偏规划的歧义（「三天」是三天两晚还是三晚？地名写错？）
  if (url.pathname === '/api/llm/understand' && req.method === 'POST') {
    const k = loadKeys().glm;
    if (!k) {
      send(res, 200, JSON.stringify({ checked: false, reason: '没有配置智谱 Key，跳过表达推算' }));
      return;
    }
    try {
      const body = JSON.parse(await readBody(req)) as {
        text?: string;
        parsed?: Record<string, unknown>;
        debug?: boolean;
      };
      const text = (body.text ?? '').slice(0, 300);
      if (!text) {
        send(res, 200, JSON.stringify({ checked: false, reason: '空文本' }));
        return;
      }
      type CheckItem = { item?: string; suspect?: boolean; quote?: string; reason?: string; suggestion?: string };
      const system =
        '你是旅游规划系统的表达审查器，只检查一件事：地名混淆。' +
        '对下面两项逐一判断：' +
        '1) origin_place 用户写的出发地是否可能实际是另一个名字（同音、近形、一字之差：宿州/宿迁、宜兴/宜兴市、太行山附近的泰安）；' +
        '2) dest_place 目的地同理（泰山是市还是山、台州/泰州、颍上/颖上）。' +
        '判断标准：用户写的地名能对上真实存在的城市、且没有明显更可能的替代名，就 suspect=false。' +
        '成都、景德镇、杭州、西安这类清晰城市名永远 suspect=false。' +
        'quote 必须逐字出现在用户原话里。只输出 JSON：' +
        '{"checks":[{"item":"origin_place","suspect":false,"quote":"","reason":"","suggestion":""},{"item":"dest_place","suspect":false,"quote":"","reason":"","suggestion":""}]}，恰好 2 项。';
      const user = `用户原话：${text}\n程序解析结果：${JSON.stringify(body.parsed ?? {})}`;
      const r = await json<{ checks?: CheckItem[] } | CheckItem[]>(system, user, { apiKey: k });
      if (!r.value) {
        send(res, 200, JSON.stringify({ checked: false, reason: '模型返回不可解析' }));
        return;
      }
      // 模型有时会把清单直接输出成顶层数组，有时包在 {"checks": [...]} 里，两种都接
      const checks = Array.isArray(r.value) ? r.value : (r.value.checks ?? []);
      // quote 必须逐字出现在原话里，否则这条不可信，丢
      const issues = checks
        .filter((c) => c.suspect === true && c.reason)
        .filter((c) => !c.quote || text.includes(c.quote))
        .slice(0, 3)
        .map((c) => ({ quote: c.quote, problem: c.reason, suggestion: c.suggestion }));
      send(
        res,
        200,
        JSON.stringify({
          checked: true,
          affected: issues.length > 0,
          issues,
          ...(body.debug ? { debug: r.value } : {}),
        }),
      );
    } catch (e) {
      send(res, 200, JSON.stringify({ checked: false, reason: e instanceof Error ? e.message : String(e) }));
    }
    return;
  }

  if (url.pathname === '/api/crawl' && req.method === 'POST') {
    if (crawlPromise) {
      send(res, 202, JSON.stringify({ running: true, message: '已有任务在跑，稍等' }));
      return;
    }
    try {
      await triggerCrawl('手动');
      const f = resolve(PUBLIC, 'crawl-report.json');
      send(res, 200, existsSync(f) ? readFileSync(f, 'utf8') : JSON.stringify({ ok: true, ...sched }));
    } catch (e) {
      send(res, 500, JSON.stringify({ error: e instanceof Error ? e.message : String(e) }));
    }
    return;
  }

  if (url.pathname === '/api/log') {
    send(res, 200, JSON.stringify({ running: Boolean(crawlPromise), lines: crawlLog.slice(-80) }));
    return;
  }

  // ---------- 幸福时刻 ----------
  // 照片只落在本机 data/moments/，这类接口没有云端备份，删了就没了。
  if (url.pathname.startsWith('/api/moments/file/')) {
    const name = decodeURIComponent(url.pathname.slice('/api/moments/file/'.length));
    const f = momentFile(name);
    if (!f) {
      send(res, 404, JSON.stringify({ error: '没有这张照片' }));
      return;
    }
    const size = momentSize(name);
    res.writeHead(200, {
      'Content-Type': f.mime,
      // 文件名带唯一 id，内容永不改变，可以长缓存
      'Cache-Control': 'public, max-age=31536000, immutable',
      ...(size ? { 'Content-Length': String(size) } : {}),
    });
    res.end(readFileSync(f.path));
    return;
  }

  if (url.pathname === '/api/moments' && req.method === 'GET') {
    send(res, 200, JSON.stringify({ items: listMoments() }));
    return;
  }

  if (url.pathname === '/api/moments' && req.method === 'POST') {
    try {
      // 一张手机照片 base64 后能有十几 MB，普通 JSON 的 1MB 上限不够
      const body = JSON.parse(await readBody(req, 24_000_000)) as {
        dataUrl?: string;
        trip_id?: string | null;
        caption?: string;
        stars?: number;
        day?: number | null;
        poi_id?: string;
        poi_name?: string;
        taken_at?: string;
      };
      const m = /^data:image\/([a-z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/i.exec(String(body.dataUrl ?? ''));
      if (!m) {
        send(res, 400, JSON.stringify({ error: '照片格式不认，只收 jpg/png/webp/gif' }));
        return;
      }
      const EXT: Record<string, string> = {
        jpeg: '.jpg',
        jpg: '.jpg',
        png: '.png',
        webp: '.webp',
        gif: '.gif',
        heic: '.heic',
        heif: '.heic',
      };
      const ext = EXT[m[1].toLowerCase()];
      if (!ext) {
        send(res, 415, JSON.stringify({ error: `不支持 ${m[1]} 格式` }));
        return;
      }
      const bytes = Buffer.from(m[2], 'base64');
      if (bytes.length === 0) {
        send(res, 400, JSON.stringify({ error: '照片是空的' }));
        return;
      }
      if (bytes.length > 16_000_000) {
        send(res, 413, JSON.stringify({ error: '照片太大了（超过 16MB）' }));
        return;
      }
      const moment = saveMoment(bytes, ext, {
        trip_id: body.trip_id ?? null,
        caption: body.caption,
        stars: body.stars,
        day: body.day,
        poi_id: body.poi_id,
        poi_name: body.poi_name,
        taken_at: body.taken_at,
      });
      send(res, 200, JSON.stringify(moment));
    } catch (e) {
      send(res, 400, JSON.stringify({ error: e instanceof Error ? e.message : String(e) }));
    }
    return;
  }

  if (url.pathname.startsWith('/api/moments/')) {
    const id = decodeURIComponent(url.pathname.slice('/api/moments/'.length));
    if (req.method === 'PATCH') {
      try {
        const patch = JSON.parse(await readBody(req)) as Record<string, unknown>;
        const hit = updateMoment(id, patch as never);
        if (!hit) send(res, 404, JSON.stringify({ error: '没有这条记录' }));
        else send(res, 200, JSON.stringify(hit));
      } catch (e) {
        send(res, 400, JSON.stringify({ error: e instanceof Error ? e.message : String(e) }));
      }
      return;
    }
    if (req.method === 'DELETE') {
      const ok = removeMoment(id);
      send(res, ok ? 200 : 404, JSON.stringify({ ok }));
      return;
    }
  }

  // 静态资源：先 dist，再 public
  if (serveFile(res, DIST, url.pathname)) return;
  if (serveFile(res, PUBLIC, url.pathname)) return;

  // SPA 兜底
  const index = resolve(DIST, 'index.html');
  if (existsSync(index)) {
    send(res, 200, readFileSync(index, 'utf8'), MIME['.html']);
    return;
  }
  send(res, 404, 'dist 还没构建，先 npm run build', 'text/plain; charset=utf-8');
});

function mask(keys: { amap?: string; baidu?: string; glm?: string }) {
  const m = (v?: string) => (v ? `${v.slice(0, 4)}…${v.slice(-2)}` : null);
  return {
    amap: m(keys.amap),
    baidu: m(keys.baidu),
    glm: m(keys.glm),
    hasAmap: Boolean(keys.amap),
    hasBaidu: Boolean(keys.baidu),
    hasGlm: Boolean(keys.glm),
  };
}

server.listen(PORT, HOST, () => {
  const hasCatalog = existsSync(resolve(PUBLIC, 'catalog.json'));
  console.log(`[serve] 监听 ${HOST}:${PORT}`);
  console.log(`[serve] 本机访问   http://127.0.0.1:${PORT}`);

  // 把每个网卡的地址都打出来，手机连同一网络后挑能通的访问
  try {
    const ifs = networkInterfaces();
    for (const [name, list] of Object.entries(ifs)) {
      for (const net of list ?? []) {
        if (net.family === 'IPv4' && !net.internal) {
          console.log(`[serve] 手机访问   http://${net.address}:${PORT}   （${name}）`);
        }
      }
    }
  } catch {
    /* 枚举网卡失败不影响服务 */
  }

  console.log(`[serve] 静态目录 ${DIST}`);
  console.log(`[serve] catalog ${hasCatalog ? '已就绪' : '未生成（页面上点「立即抓取」或跑 npm run crawl）'}`);
  const k = mask(loadKeys());
  console.log(
    `[serve] Key：高德 ${k.amap ?? '未配置'} · 百度 ${k.baidu ?? '未配置'} · 智谱 ${k.glm ?? '未配置'}`,
  );

  try {
    mkdirSync(dirname(PID_FILE), { recursive: true });
    writeFileSync(PID_FILE, String(process.pid), 'utf8');
  } catch {
    /* pid 文件只是给脚本判断服务在不在，写不了也不影响服务 */
  }

  // 常驻定时器：开机后先等 20 秒再跑第一轮，避免和冷启动抢资源
  const firstDelay = hasCatalog ? 20_000 : 2_000;
  sched.nextRunAt = Date.now() + firstDelay;
  console.log(`[serve] 常驻模式：每 ${AUTO_MIN} 分钟自动刷新一轮（首轮 ${Math.round(firstDelay / 1000)}s 后）`);

  let timer: NodeJS.Timeout | null = null;
  const loop = () => {
    void triggerCrawl(`定时(第 ${sched.rounds + 1} 轮)`).finally(() => {
      timer = setTimeout(loop, AUTO_MS);
      sched.nextRunAt = Date.now() + AUTO_MS;
    });
  };
  timer = setTimeout(loop, firstDelay);

  const bye = (sig: string) => {
    console.log(`[serve] 收到 ${sig}，退出`);
    if (timer) clearTimeout(timer);
    try {
      if (existsSync(PID_FILE) && readFileSync(PID_FILE, 'utf8').trim() === String(process.pid)) {
        unlinkSync(PID_FILE);
      }
    } catch {
      /* ignore */
    }
    server.close(() => process.exit(0));
    // 抓取任务可能卡在长请求上，最多再等 3 秒
    setTimeout(() => process.exit(0), 3000);
  };
  process.on('SIGINT', () => bye('SIGINT'));
  process.on('SIGTERM', () => bye('SIGTERM'));
});
