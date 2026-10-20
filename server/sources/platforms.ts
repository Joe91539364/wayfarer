/**
 * 商业点评平台的「接入状态探测」。
 *
 * 说白了：这几个平台没有公开接口，我不做违规抓取。但「不抓」不等于「不告诉用户为什么」，
 * 所以每次运行都真实探一次他们的公开页，把拿到的状态码记下来：
 *
 *   200 + 页面里有验证码/登录墙  → need_auth（能访问，但要人）
 *   200 + 评分在客户端异步渲染    → empty（服务端拿不到，不是被拒）
 *   302 / 403 / robots 禁止      → blocked（明确拒绝）
 *
 * 每轮每个平台只发 1 个请求，间隔 2 秒。这不是抓取，是一次握手。
 * 界面上会原样显示「携程 · HTTP 200 · 页面要求登录」，比写一句「暂不支持」有用得多。
 */

import type { PlatformGate, PlatformId } from '../../src/data/catalog';
import { mkRun, type SourceCtx, type SourceOutput } from './types';

const META = {
  id: 'platform-probe',
  name: '点评平台接入探测',
  kind: 'platform' as const,
  access: 'partner' as const,
  license: '仅探测公开页可达性，不采集内容',
  homepage: 'https://you.ctrip.com/',
  note: '携程 / 大众点评 / 马蜂窝 / 小红书：探测可达性，不抓正文',
};

interface Probe {
  platform: PlatformId;
  url: string;
  /** 页面里出现这些词，说明挡在了登录/验证码 */
  walls: RegExp;
}

const PROBES: Probe[] = [
  {
    platform: 'ctrip',
    url: 'https://you.ctrip.com/sight/chengdu104.html',
    walls: /(验证码|请登录|安全验证|滑动|人机)/,
  },
  {
    platform: 'dianping',
    url: 'https://www.dianping.com/chengdu/ch0',
    walls: /(验证码|请登录|安全验证|访问异常|滑动)/,
  },
  {
    platform: 'mafengwo',
    url: 'https://www.mafengwo.cn/jd/10065/gonglve.html',
    walls: /(验证码|请登录|访问异常)/,
  },
  {
    platform: 'xiaohongshu',
    url: 'https://www.xiaohongshu.com/explore',
    walls: /(验证码|登录|安全验证)/,
  },
];

export const platformProbeSource = {
  meta: META,
  async run(ctx: SourceCtx): Promise<SourceOutput> {
    const started = Date.now();
    const gates: PlatformGate[] = [];
    const reqBefore = ctx.net.requests;
    const bytesBefore = ctx.net.bytes;
    const logs: string[] = [];

    for (const probe of PROBES) {
      const res = await ctx.net.get(probe.url, {
        headers: { Accept: 'text/html,application/xhtml+xml' },
        gapMs: 2000,
      });

      if (res.status === 451) {
        gates.push({
          platform: probe.platform,
          status: 'blocked',
          note: 'robots.txt 明确禁止抓取该路径，直接放弃',
          url: probe.url,
          at: Date.now(),
        });
        logs.push(`[robots] ${probe.platform}：不允许`);
        continue;
      }

      if (res.status >= 300 && res.status < 400) {
        gates.push({
          platform: probe.platform,
          status: 'blocked',
          note: `HTTP ${res.status} 重定向，通常是要登录或地区校验`,
          http: res.status,
          url: probe.url,
          at: Date.now(),
        });
        logs.push(`[${res.status}] ${probe.platform}：重定向`);
        continue;
      }

      if (res.status < 200 || res.status >= 300) {
        gates.push({
          platform: probe.platform,
          status: 'blocked',
          note: `HTTP ${res.status}，被服务端拒绝`,
          http: res.status,
          url: probe.url,
          at: Date.now(),
        });
        logs.push(`[${res.status}] ${probe.platform}：被拒`);
        continue;
      }

      const wall = probe.walls.test(res.body.slice(0, 20_000));
      gates.push({
        platform: probe.platform,
        status: wall ? 'need_auth' : 'empty',
        note: wall
          ? '公开页能打开，但内容被登录/验证码挡住；自动化采集违反其服务条款，不做'
          : '公开页能打开，但评分与点评在客户端异步加载，服务端 HTML 里没有；正文需官方授权',
        http: 200,
        url: probe.url,
        at: Date.now(),
      });
      logs.push(`[200] ${probe.platform}：${wall ? '登录/验证墙' : '内容异步渲染'}`);
    }

    const reachable = gates.filter((g) => g.status !== 'blocked').length;
    return {
      run: mkRun(META, reachable > 0 ? 'empty' : 'blocked', {
        items: gates.length,
        requests: ctx.net.requests - reqBefore,
        bytes: ctx.net.bytes - bytesBefore,
        ms: Date.now() - started,
        note: `${gates.length} 个平台已探测；均无公开数据接口，正文需授权或导出`,
      }),
      gates,
    };
  },
};

export const PROBE_TARGETS = PROBES;
