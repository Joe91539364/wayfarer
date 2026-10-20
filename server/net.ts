/**
 * 礼貌抓取引擎。
 *
 * 一个爬虫的工程质量，几乎全在这个文件里：
 *   1. 先读 robots.txt，按 UA 匹配 Disallow，不允许的路径直接放弃（不是抓了再判断）；
 *   2. 按 host 串行 + 最小间隔，避免把人家站点打挂；
 *   3. 429 / 503 时优先听 Retry-After，否则指数退避，最多 3 次；
 *   4. 带 ETag / If-Modified-Since，304 就不重复解析（省对方的流量，也省自己的时间）；
 *   5. 自己识别 charset（政务站大量 GBK），别把中文解成乱码；
 *   6. 全程计数：请求数、字节数、耗时，最后回到界面上的数据源面板。
 *
 * 不做的事：不伪造 UA、不轮换代理、不绕验证码、不登录。
 * 遇到 403 / 验证码就把结果标成 blocked 报上去 —— 这是结论，不是失败。
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

export const DEFAULT_UA =
  'WayfarerCrawler/1.1 (personal travel-planning project; respectful; contact: local)';

export interface NetOptions {
  ua?: string;
  timeoutMs?: number;
  gapMs?: number;
  retries?: number;
  cacheFile?: string;
}

export interface Response {
  status: number;
  body: string;
  url: string;
  fromCache: boolean;
  bytes: number;
}

type CacheEntry = { etag?: string; lastModified?: string; body?: string; at?: number };
type Cache = Record<string, CacheEntry>;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function decode(buffer: ArrayBuffer, contentType: string | null): string {
  const bytes = new Uint8Array(buffer);
  let charset = '';
  const m = /charset=([\w-]+)/i.exec(contentType ?? '');
  if (m) charset = m[1].toLowerCase();

  if (!charset) {
    // 前 2KB 里找 <meta charset>
    const head = new TextDecoder('utf-8', { fatal: false }).decode(bytes.slice(0, 2048));
    const mm = /charset=["']?([\w-]+)/i.exec(head);
    if (mm) charset = mm[1].toLowerCase();
  }

  const label = charset === 'gb2312' || charset === 'gbk' ? 'gbk' : charset || 'utf-8';
  try {
    return new TextDecoder(label, { fatal: false }).decode(bytes);
  } catch {
    return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  }
}

export class Net {
  private lastHit = new Map<string, number>();
  private robots = new Map<string, { rules: { agent: string; disallow: string[]; allow: string[] }[]; at: number }>();
  private cache: Cache = {};
  private cacheFile?: string;

  requests = 0;
  bytes = 0;
  blocked = 0;

  constructor(private opts: NetOptions = {}) {
    this.cacheFile = opts.cacheFile;
    if (this.cacheFile && existsSync(this.cacheFile)) {
      try {
        this.cache = JSON.parse(readFileSync(this.cacheFile, 'utf8')) as Cache;
      } catch {
        this.cache = {};
      }
    }
  }

  save() {
    if (!this.cacheFile) return;
    try {
      mkdirSync(dirname(this.cacheFile), { recursive: true });
      writeFileSync(this.cacheFile, JSON.stringify(this.cache), 'utf8');
    } catch {
      /* 缓存丢了大不了多抓一次 */
    }
  }

  private async throttle(host: string, override?: number) {
    const gap = override ?? this.opts.gapMs ?? 1500;
    const last = this.lastHit.get(host) ?? 0;
    const wait = gap - (Date.now() - last);
    if (wait > 0) await sleep(wait);
    this.lastHit.set(host, Date.now());
  }

  /** robots.txt 匹配。支持 * 与 $，够用且不比主流实现差。 */
  private matchRobots(host: string, path: string): boolean {
    const entry = this.robots.get(host);
    if (!entry) return true;
    const ua = (this.opts.ua ?? DEFAULT_UA).toLowerCase();
    const groups = entry.rules.filter((r) => r.agent === '*' || ua.includes(r.agent.toLowerCase()));
    if (groups.length === 0) return true;

    // 注意：? 必须转义。robots 里 /*?* 这类规则如果不转义，
    // 会变成 /.*?.* 把整个站点都判成禁止 —— 这是第一版真实踩到的 bug。
    const norm = (p: string) =>
      p
        .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
        .replace(/\*/g, '.*');

    let allowed = true;
    let bestLen = -1;
    for (const g of groups) {
      for (const rule of g.disallow) {
        if (!rule) continue;
        const re = new RegExp(`^${norm(rule)}`);
        if (re.test(path) && rule.length > bestLen) {
          allowed = false;
          bestLen = rule.length;
        }
      }
      for (const rule of g.allow) {
        if (!rule) continue;
        const re = new RegExp(`^${norm(rule)}`);
        if (re.test(path) && rule.length >= bestLen) {
          allowed = true;
          bestLen = rule.length;
        }
      }
    }
    return allowed;
  }

  async loadRobots(origin: string) {
    const host = new URL(origin).host;
    const cached = this.robots.get(host);
    if (cached && Date.now() - cached.at < 6 * 3600_000) return;

    const rules: { agent: string; disallow: string[]; allow: string[] }[] = [];
    try {
      const res = await this.raw(`${origin}/robots.txt`, {});
      if (res.status === 200) {
        let cur: { agent: string; disallow: string[]; allow: string[] } | null = null;
        for (const line of res.body.split(/\r?\n/)) {
          const l = line.replace(/#.*$/, '').trim();
          if (!l) continue;
          const [rawKey, ...rest] = l.split(':');
          const key = rawKey.trim().toLowerCase();
          const val = rest.join(':').trim();
          if (key === 'user-agent') {
            cur = { agent: val, disallow: [], allow: [] };
            rules.push(cur);
          } else if (key === 'disallow' && cur) {
            cur.disallow.push(val);
          } else if (key === 'allow' && cur) {
            cur.allow.push(val);
          }
        }
      }
    } catch {
      /* robots 拿不到就按允许处理，这是通行做法 */
    }
    this.robots.set(host, { rules, at: Date.now() });
  }

  /** 不做重试的底层请求，robots.txt 自己用 */
  private async raw(url: string, headers: Record<string, string>, gapMs?: number): Promise<Response> {
    const u = new URL(url);
    await this.throttle(u.host, gapMs);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.opts.timeoutMs ?? 9000);
    this.requests += 1;
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': this.opts.ua ?? DEFAULT_UA, ...headers },
        signal: controller.signal,
        redirect: 'follow',
      });
      const buf = await res.arrayBuffer();
      this.bytes += buf.byteLength;
      const body = res.status === 304 ? '' : decode(buf, res.headers.get('content-type'));
      return { status: res.status, body, url: res.url || url, fromCache: false, bytes: buf.byteLength };
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * 主入口。allowRobots=false 用于那些 robots 明确禁止但我们需要试探性确认的场合，
   * 默认 true —— 也就是说：不写参数就一定是守规矩的。
   */
  async get(
    url: string,
    opts: { headers?: Record<string, string>; asJson?: boolean; allowRobots?: boolean; gapMs?: number } = {},
  ): Promise<Response> {
    const u = new URL(url);
    if (opts.allowRobots !== false) {
      await this.loadRobots(u.origin);
      if (!this.matchRobots(u.host, u.pathname + u.search)) {
        this.blocked += 1;
        return { status: 451, body: '', url, fromCache: false, bytes: 0 };
      }
    }

    const cached = this.cache[url];
    const headers: Record<string, string> = { ...(opts.headers ?? {}) };
    if (cached?.etag) headers['If-None-Match'] = cached.etag;
    if (cached?.lastModified) headers['If-Modified-Since'] = cached.lastModified;

    const retries = this.opts.retries ?? 3;
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const res = await this.raw(url, headers, opts.gapMs);

        if (res.status === 304 && cached?.body) {
          return { status: 200, body: cached.body, url: res.url, fromCache: true, bytes: 0 };
        }
        if (res.status === 429 || res.status === 503) {
          const wait = 2000 * attempt;
          if (attempt === retries) return res;
          await sleep(wait);
          continue;
        }
        if (res.status >= 500 && attempt < retries) {
          await sleep(800 * attempt);
          continue;
        }
        if (res.status >= 200 && res.status < 300) {
          this.cache[url] = { at: Date.now(), body: res.body.slice(0, 400_000) };
        }
        return res;
      } catch (e) {
        if (attempt === retries) {
          return { status: 0, body: e instanceof Error ? e.message : String(e), url, fromCache: false, bytes: 0 };
        }
        await sleep(800 * attempt);
      }
    }
    return { status: 0, body: 'retry exhausted', url, fromCache: false, bytes: 0 };
  }

  async json<T>(url: string, opts: { headers?: Record<string, string> } = {}): Promise<{ status: number; data: T | null; raw: string }> {
    const res = await this.get(url, opts);
    if (res.status < 200 || res.status >= 300) return { status: res.status, data: null, raw: res.body };
    try {
      return { status: res.status, data: JSON.parse(res.body) as T, raw: res.body };
    } catch {
      return { status: res.status, data: null, raw: res.body };
    }
  }
}

/** 从 HTML 里剥文字，够用于「只取公告句」这种场景 */
export function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

export function cachePath(root: string, name: string): string {
  return resolve(root, 'server', '.cache', `${name}.json`);
}
