/**
 * 高德开放平台（Web 服务 API）。
 *
 * 这是国内唯一能稳定拿到「评分 / 点评数 / 营业时间 / 电话 / 地址 / 实景图」的合法通道：
 * 官方 API、有文档、有配额、允许商用（按协议）。代价是要一个免费 Key。
 *
 * 用的是 v3/place/text：
 *   https://restapi.amap.com/v3/place/text?key=..&keywords=..&city=..&citylimit=true&extensions=all
 *
 * 注意：高德的 biz_ext.rating 是「高德自己的评分」，不是携程/点评的评分。
 * 界面上必须写清楚是哪家的分，不能混着说「综合评分」。
 */

import { looseMatch, mkRun, nameMatch, type FactPatch, type PhotoPatch, type PlatformPatch, type SourceCtx, type SourceOutput } from './types';

const META = {
  id: 'amap',
  name: '高德开放平台',
  kind: 'map' as const,
  access: 'key' as const,
  license: '高德开放平台服务条款（免费 Key，有日配额）',
  homepage: 'https://lbs.amap.com/',
  note: 'POI 详情：地址 / 电话 / 营业时间 / 评分 / 点评数 / 实景图',
};

const ENDPOINT = 'https://restapi.amap.com/v3/place/text';

interface AmapPoi {
  name?: string;
  address?: string | unknown[];
  tel?: string | unknown[];
  location?: string;
  cityname?: string;
  adname?: string;
  type?: string;
  photos?: { title?: string; url?: string }[];
  biz_ext?: {
    rating?: string | unknown[];
    cost?: string | unknown[];
    open_time?: string | unknown[];
    opentime2?: string | unknown[];
    tag?: string;
  };
}

interface AmapResp {
  status?: string;
  info?: string;
  infocode?: string;
  count?: string;
  pois?: AmapPoi[];
}

function str(v: unknown): string | undefined {
  if (typeof v === 'string' && v.trim() && v !== '[]') return v.trim();
  if (Array.isArray(v) && v.length === 0) return undefined;
  return undefined;
}

function num(v: unknown): number | undefined {
  const s = str(v);
  if (!s) return undefined;
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

/** 高德的营业时间有两种写法：open_time 常是「24小时营业」，opentime2 才是「周一至周日 00:00-24:00」。
 *  优先取能解析出时间区间的那个，统一成 `HH:MM–HH:MM`；实在没有区间才保留原文。 */
function pickHours(a?: string, b?: string): string | undefined {
  const range = /(\d{1,2})[:：](\d{2})\s*[-–—~至到]+\s*(\d{1,2})[:：](\d{2})/;
  for (const raw of [b, a]) {
    if (!raw) continue;
    const m = range.exec(raw);
    if (m) {
      const pad = (h: string, mi: string) => `${h.padStart(2, '0')}:${mi}`;
      return `${pad(m[1], m[2])}–${pad(m[3], m[4])}`;
    }
  }
  return b ?? a;
}

function upgrade(url: string): string {
  return url.startsWith('http://') ? `https://${url.slice(7)}` : url;
}

export const amapSource = {
  meta: META,
  async run(ctx: SourceCtx): Promise<SourceOutput> {
    const started = Date.now();
    const key = ctx.keys.amap;
    if (!key) {
      return {
        run: mkRun(META, 'need_key', {
          note: '没有高德 Key。去 lbs.amap.com 免费申请「Web 服务」Key，粘到数据源面板即可开始抓取',
        }),
      };
    }

    const facts: FactPatch[] = [];
    const retract: { target: 'poi' | 'hotel'; id: string }[] = [];
    const photos: PhotoPatch[] = [];
    const platforms: PlatformPatch[] = [];
    const reqBefore = ctx.net.requests;
    const bytesBefore = ctx.net.bytes;
    let hits = 0;
    let quotaHit = false;
    let fatalHint: string | undefined;
    const logs: string[] = [];

    /**
     * 高德的错误码藏着最常见的坑：Key 的平台类型选错。
     * 10001 / 10009 / 10013 基本都是「这个 Key 不是 Web服务 类型」，
     * 直接把话说明白，比抛一个 INVALID_USER_KEY 有用。
     */
    const explain = (info: string, code?: string): string => {
      if (code === '10009' || /PLAT_NOMATCH/i.test(info)) {
        return 'Key 的平台类型不匹配：这个 Key 不是「Web服务」类型。去控制台给同一个应用再加一个 Key，服务平台选「Web服务」，不要选「Web端(JS API)」';
      }
      if (code === '10001' || /INVALID_USER_KEY/i.test(info)) {
        return 'Key 无效：确认复制完整（32 位），并且平台类型是「Web服务」。选成 Web端(JS API) 的 Key 在服务端调不通';
      }
      if (code === '10013' || /RECYCLED/i.test(info)) return 'Key 已被删除，控制台里换一个新的「Web服务」Key';
      if (code === '10003' || code === '10044' || /QUOTA|LIMIT|BUDGET/i.test(info)) {
        return '免费配额用完了（个人开发者 Web服务 日配额有限），明天再跑或去控制台提额';
      }
      if (code === '10004' || /TOO_FREQUENT/i.test(info)) return '请求太频繁，把间隔调大一点再跑';
      if (code === '10005' || /INVALID_USER_IP/i.test(info)) return '这个 Key 绑定了 IP 白名单，当前出口 IP 不在名单里';
      return info;
    };

    const query = async (
      keyword: string,
      cityName: string,
      types?: string,
    ): Promise<AmapPoi | null> => {
      const url =
        `${ENDPOINT}?key=${encodeURIComponent(key)}&keywords=${encodeURIComponent(keyword)}` +
        `&city=${encodeURIComponent(cityName)}&citylimit=true&extensions=all&offset=5&page=1` +
        (types ? `&types=${types}` : '');
      // 高德个人开发者 POI 搜索的常见限制是 3 QPS，间隔给到 400ms 更稳
      const res = await ctx.net.get(url, { gapMs: 400, allowRobots: false });
      if (res.status !== 200) return null;
      let data: AmapResp;
      try {
        data = JSON.parse(res.body) as AmapResp;
      } catch {
        return null;
      }
      if (data.status !== '1') {
        const info = data.info ?? '';
        const code = data.infocode;
        // 注意：10004 是「QPS 超限」，不是日配额，别把它当成配额用光直接收工
        const qps = code === '10004' || /QPS|TOO_FREQUENT|CALL_TOO_FREQUENT/i.test(info);
        const outOfQuota = !qps && (code === '10003' || code === '10044' || /QUOTA|OVER_LIMIT|BUDGET/i.test(info));
        const badKey = code === '10001' || code === '10009' || code === '10013';

        fatalHint = fatalHint || explain(info, code);
        ctx.log(`[api] ${keyword}：${explain(info, code)}`);

        if (qps) {
          // 被限速就退一步再试，别整轮报废
          await new Promise((r) => setTimeout(r, 1200));
          return null;
        }
        if (outOfQuota || badKey) quotaHit = true;
        return null;
      }
      const list = (data.pois ?? []).filter((p) => p.name);
      // 1) 名字对得上（完全相等，或包含且长度差 ≤2）
      const exact = list.find((p) => nameMatch(p.name as string, keyword));
      if (exact) return exact;
      // 2) 退一步：共享 2 个以上连续汉字 / 4 个以上连续字母才算同一个地方。
      //    否则会出现「演武大桥观景台 → 南普陀寺」这种串号，宁可这个点位没有数据。
      const near = list.find((p) => looseMatch(p.name as string, keyword));
      if (near) {
        ctx.log(`[near] 「${keyword}」→ 高德返回「${near.name}」（名称不完全一致，已按相似度采纳）`);
        return near;
      }
      if (list.length > 0) {
        ctx.log(`[skip] 「${keyword}」：高德只返回「${list[0].name}」，与它无关，不采用`);
      }
      return null;
    };

    for (const poi of ctx.pois) {
      if (quotaHit) break;
      const city = ctx.cities.find((c) => c.code === poi.city);
      const hit = await query(poi.name, city?.name ?? '');
      // 这次没查到（或查到的不是它）→ 撤掉上一轮可能写错的数据
      if (!hit) {
        retract.push({ target: 'poi', id: poi.poi_id });
        continue;
      }
      hits += 1;

      const url = `https://www.amap.com/search?query=${encodeURIComponent(poi.name)}`;
      const address = str(hit.address) ?? (hit.adname ? `${hit.cityname ?? ''}${hit.adname}` : undefined);
      if (address) facts.push({ target: 'poi', id: poi.poi_id, field: 'address', v: address, src: 'amap', url });
      const tel = str(hit.tel);
      if (tel) facts.push({ target: 'poi', id: poi.poi_id, field: 'phone', v: tel.split(';')[0], src: 'amap', url });
      const openTime = pickHours(str(hit.biz_ext?.open_time), str(hit.biz_ext?.opentime2));
      if (openTime) facts.push({ target: 'poi', id: poi.poi_id, field: 'hours', v: openTime, src: 'amap', url });

      const rating = num(hit.biz_ext?.rating);
      if (rating) facts.push({ target: 'poi', id: poi.poi_id, field: 'rating', v: rating, src: 'amap', url });

      for (const p of (hit.photos ?? []).slice(0, 3)) {
        if (p.url) photos.push({ target: 'poi', id: poi.poi_id, url: upgrade(p.url), caption: p.title, credit: '高德地图用户实景图', src: 'amap' });
      }

      platforms.push({
        target: 'poi',
        id: poi.poi_id,
        review: {
          platform: 'amap',
          status: rating ? 'ok' : 'empty',
          score: rating,
          url,
          note: rating ? '高德评分（不含正文，高德未开放点评正文接口）' : '高德有这个点位，但没有评分',
          at: Date.now(),
        },
      });
    }

    for (const hotel of ctx.hotels) {
      if (quotaHit) break;
      const city = ctx.cities.find((c) => c.code === hotel.city);
      const hit = await query(hotel.name, city?.name ?? '', '100000');
      if (!hit) {
        retract.push({ target: 'hotel', id: hotel.id });
        continue;
      }
      hits += 1;
      const url = `https://www.amap.com/search?query=${encodeURIComponent(hotel.name)}`;
      const address = str(hit.address) ?? (hit.adname ? `${hit.cityname ?? ''}${hit.adname}` : undefined);
      if (address) facts.push({ target: 'hotel', id: hotel.id, field: 'address', v: address, src: 'amap', url });
      const tel = str(hit.tel);
      if (tel) facts.push({ target: 'hotel', id: hotel.id, field: 'phone', v: tel.split(';')[0], src: 'amap', url });
      const rating = num(hit.biz_ext?.rating);
      if (rating) facts.push({ target: 'hotel', id: hotel.id, field: 'rating', v: rating, src: 'amap', url });
      for (const p of (hit.photos ?? []).slice(0, 2)) {
        if (p.url) photos.push({ target: 'hotel', id: hotel.id, url: upgrade(p.url), caption: p.title, credit: '高德地图用户实景图', src: 'amap' });
      }
      platforms.push({
        target: 'hotel',
        id: hotel.id,
        review: { platform: 'amap', status: rating ? 'ok' : 'empty', score: rating, url, note: '高德评分', at: Date.now() },
      });
    }

    const status = quotaHit ? 'blocked' : hits > 0 ? 'ok' : 'empty';
    return {
      run: mkRun(META, status, {
        items: hits,
        requests: ctx.net.requests - reqBefore,
        bytes: ctx.net.bytes - bytesBefore,
        ms: Date.now() - started,
        error: quotaHit ? fatalHint ?? '配额或 Key 有问题，本轮中止' : undefined,
        note: quotaHit ? fatalHint ?? '配额或 Key 有问题，本轮中止' : `命中 ${hits} 个点位`,
      }),
      facts,
      photos,
      platforms,
      retract,
    };
  },
};
