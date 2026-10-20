/**
 * 政务 / 景区官网公告 + 景区官网正文。
 *
 * 三级来源，按可靠性排序：
 *   1. 景区自己的官网（POI_SITES 登记表）—— 票价、开放时间、预约须知最准；
 *   2. 城市文旅局首页；
 *   3. 文旅局首页里挑出来的公告链接（最多追 2 个，同域，限速）。
 *
 * 现实是：大部分市级文旅局首页是 SPA 或有反爬（成都文旅局直接 412），
 * 所以「景区官网」才是真正能出数据的那一层。遇到 412 / SPA 就把原因记下来，不硬刚。
 *
 * 不做：不追分页、不抓 PDF、不绕登录、不伪造 UA。
 */

import { SOURCES } from '../../src/data/official';
import { htmlToText } from '../net';
import { mkRun, type FactPatch, type SourceCtx, type SourceOutput } from './types';

const META = {
  id: 'gov',
  name: '景区官网 / 文旅局',
  kind: 'official' as const,
  access: 'open' as const,
  license: '政府与事业单位公开信息',
  homepage: 'https://www.mct.gov.cn/',
  note: '票价、开放时间、预约限流；无需 Key',
};

const KEYWORDS = /(门票|票价|预约|限流|闭园|闭馆|开放时间|检修|施工|暂停|恢复|延时|延长|实名)/;
const LINK_WORDS = /(公告|通知|公示|票价|门票|预约|限流|开放|调整|须知)/;

const CITY_OF_SOURCE: Record<string, string> = {
  'cd-wlj': 'chengdu',
  'cd-panda': 'chengdu',
  'xa-wlj': 'xian',
  'bj-wlj': 'beijing',
  'hz-wlj': 'hangzhou',
  'xm-wlj': 'xiamen',
};

/**
 * 景区官网登记表。
 * 这里只放**人工确认过是官网**的地址（抓到 200 且页面有正文）。
 * 想加更多点位就往下加一行 —— 爬虫会自动带上票价/开放时间/简介抽取。
 */
const POI_SITES: { poi_id: string; name: string; url: string }[] = [
  { poi_id: 'CD02', name: '武侯祠', url: 'https://www.wuhouci.net.cn/' },
  { poi_id: 'CD11', name: '金沙遗址博物馆', url: 'https://www.jinshasitemuseum.com/' },
  { poi_id: 'CD09', name: '大熊猫繁育研究基地', url: 'https://www.panda.org.cn/' },
  { poi_id: 'BJ01', name: '故宫博物院', url: 'https://www.dpm.org.cn/' },
];

const JUNK = /(-->|<!--|星期[一二三四五六日]|登录|注册|版权所有|ICP\s*备|网站地图|无障碍|无障碍浏览|返回顶部|上一页|下一页)/;

function extractNotices(text: string, cap = 3): string[] {
  return text
    .split(/[。；;!?！？]/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 8 && s.length <= 120)
    .filter((s) => KEYWORDS.test(s))
    // 导航条、日历控件、页脚也会被切成「句子」，这些不是公告
    .filter((s) => !JUNK.test(s))
    .filter((s) => (s.match(/·/g)?.length ?? 0) <= 3)
    .filter((s) => (s.match(/[，,]/g)?.length ?? 0) <= 6)
    .slice(0, cap);
}

function pickNoticeLinks(html: string, base: string, n = 2): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const re = /<a\s[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]{0,80}?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const label = htmlToText(m[2] ?? '');
    if (!label || !LINK_WORDS.test(label)) continue;
    let abs: URL;
    try {
      abs = new URL(m[1], base);
    } catch {
      continue;
    }
    if (abs.host !== new URL(base).host) continue;
    if (/\.(pdf|docx?|xlsx?|zip|jpe?g|png)$/i.test(abs.pathname)) continue;
    const key = abs.pathname + abs.search;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(abs.toString());
    if (out.length >= n) break;
  }
  return out;
}

/** 从官网正文里抠开放时间与票价。抠不到就不写 —— 不猜。 */
function extractFacts(html: string): Pick<FactPatch, 'field' | 'v'>[] {
  const out: Pick<FactPatch, 'field' | 'v'>[] = [];
  const text = htmlToText(html);

  const hours = /(?:开放时间|开馆时间|营业时间)[^0-9]{0,12}(\d{1,2}[:：]\d{2})\s*[-–—~至到]+\s*(\d{1,2}[:：]\d{2})/.exec(text);
  if (hours) {
    out.push({
      field: 'hours',
      v: `${hours[1].replace('：', ':')}–${hours[2].replace('：', ':')}`,
    });
  }

  const price = /(?:门票|票价)[^0-9]{0,10}(\d{1,4})\s*元/.exec(text);
  if (price) {
    const n = Number(price[1]);
    if (Number.isFinite(n) && n >= 0 && n <= 2000) out.push({ field: 'price', v: n });
  }
  return out;
}

function metaDescription(html: string): string | undefined {
  const m =
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']{15,200})["']/i.exec(html) ??
    /<meta[^>]+content=["']([^"']{15,200})["'][^>]+name=["']description["']/i.exec(html);
  return m?.[1]?.trim();
}

export const govSource = {
  meta: META,
  async run(ctx: SourceCtx): Promise<SourceOutput> {
    const started = Date.now();
    const notices: NonNullable<SourceOutput['notices']> = [];
    const facts: FactPatch[] = [];
    const reqBefore = ctx.net.requests;
    const bytesBefore = ctx.net.bytes;

    /* ---------- 1. 景区官网 ---------- */
    for (const site of POI_SITES) {
      const poi = ctx.pois.find((p) => p.poi_id === site.poi_id);
      if (!poi) continue;
      const res = await ctx.net.get(site.url, { headers: { Accept: 'text/html' } });
      if (res.status === 451) {
        ctx.log(`[robots] ${site.name}官网：robots 不允许`);
        continue;
      }
      if (res.status < 200 || res.status >= 300) {
        ctx.log(`[fail] ${site.name}官网：HTTP ${res.status}`);
        continue;
      }
      const text = htmlToText(res.body);
      const found = extractNotices(text, 2);
      for (const t of found) {
        notices.push({ city: poi.city, text: t, url: site.url, source: `${site.name}官网`, poi_id: poi.poi_id });
      }
      for (const f of extractFacts(res.body)) {
        facts.push({ target: 'poi', id: poi.poi_id, field: f.field, v: f.v, src: 'gov', url: site.url });
      }
      const desc = metaDescription(res.body);
      if (desc) facts.push({ target: 'poi', id: poi.poi_id, field: 'intro', v: desc, src: 'gov', url: site.url });

      const bits = [
        found.length > 0 ? `${found.length} 条公告` : '无公告句',
        desc ? '有简介' : '无简介',
        facts.filter((f) => f.id === poi.poi_id).length > 0 ? `${facts.filter((f) => f.id === poi.poi_id).length} 个字段` : '无字段',
      ];
      ctx.log(`[ok] ${site.name}官网：${bits.join(' · ')}`);
    }

    /* ---------- 2. 文旅局首页 + 一级公告页 ---------- */
    for (const src of SOURCES.filter((s) => s.kind !== '铁路')) {
      const city = CITY_OF_SOURCE[src.id];
      if (!city) continue;

      const home = await ctx.net.get(src.url, { headers: { Accept: 'text/html' } });
      if (home.status === 451) {
        ctx.log(`[robots] ${src.name}：robots 不允许`);
        continue;
      }
      if (home.status < 200 || home.status >= 300) {
        ctx.log(`[fail] ${src.name}：HTTP ${home.status}${home.status === 412 ? '（反爬前置条件，放弃）' : ''}`);
        continue;
      }

      const onHome = extractNotices(htmlToText(home.body));
      if (onHome.length > 0) {
        for (const t of onHome) notices.push({ city, text: t, url: src.url, source: src.name });
        ctx.log(`[ok] ${src.name}：首页 ${onHome.length} 条`);
        continue;
      }

      const links = pickNoticeLinks(home.body, src.url, 2);
      let found = 0;
      for (const link of links) {
        const page = await ctx.net.get(link, { headers: { Accept: 'text/html' } });
        if (page.status < 200 || page.status >= 300) continue;
        for (const t of extractNotices(htmlToText(page.body), 2)) {
          notices.push({ city, text: t, url: link, source: src.name });
          found += 1;
        }
      }
      ctx.log(
        found > 0
          ? `[ok] ${src.name}：追了 ${links.length} 个公告页，${found} 条`
          : `[empty] ${src.name}：首页与 ${links.length} 个公告页都没捞到票价/预约句`,
      );
    }

    const usable = notices.length > 0 || facts.length > 0;
    return {
      run: mkRun(META, usable ? 'ok' : 'empty', {
        items: notices.length + facts.length,
        requests: ctx.net.requests - reqBefore,
        bytes: ctx.net.bytes - bytesBefore,
        ms: Date.now() - started,
        note: usable
          ? `${notices.length} 条公告 · ${facts.length} 个官网字段`
          : '景区官网与文旅局都没捞到内容，官方动态退回内置快照',
      }),
      notices,
      facts,
    };
  },
};
