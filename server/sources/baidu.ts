/**
 * 百度地图开放平台（Place API v2）。
 *
 * 能拿到：综合评分 overall_rating、评论数 comment_num、标签 tag、人均 price、营业时间 shop_hours。
 * 同样拿不到点评正文 —— 百度没有开放这个字段。
 *
 * 注意坐标系：百度是 BD09，高德/我们的数据是 GCJ02。这里只用它做「有没有这个点、评分多少」，
 * 不拿它的坐标回写行程，避免把行程整体挪偏几百米。
 */

import { mkRun, nameMatch, type FactPatch, type PlatformPatch, type SourceCtx, type SourceOutput } from './types';

const META = {
  id: 'baidu',
  name: '百度地图开放平台',
  kind: 'map' as const,
  access: 'key' as const,
  license: '百度地图开放平台服务条款（免费 AK，有日配额）',
  homepage: 'https://lbsyun.baidu.com/',
  note: '综合评分 / 评论数 / 标签 / 人均 / 营业时间',
};

const ENDPOINT = 'https://api.map.baidu.com/place/v2/search';

interface BaiduResult {
  name?: string;
  address?: string;
  telephone?: string;
  detail_info?: {
    tag?: string;
    price?: string;
    overall_rating?: string;
    comment_num?: string;
    shop_hours?: string;
    detail_url?: string;
  };
}

interface BaiduResp {
  status?: number;
  message?: string;
  results?: BaiduResult[];
}

function nonEmpty(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() && v !== '暂无' ? v.trim() : undefined;
}

export const baiduSource = {
  meta: META,
  async run(ctx: SourceCtx): Promise<SourceOutput> {
    const started = Date.now();
    const ak = ctx.keys.baidu;
    if (!ak) {
      return {
        run: mkRun(META, 'need_key', {
          note: '没有百度 AK。去 lbsyun.baidu.com 申请「服务端」AK，粘到数据源面板即可',
        }),
      };
    }

    const facts: FactPatch[] = [];
    const platforms: PlatformPatch[] = [];
    const reqBefore = ctx.net.requests;
    const bytesBefore = ctx.net.bytes;
    const logs: string[] = [];
    let hits = 0;
    let fatal: string | undefined;

    const query = async (keyword: string, region: string) => {
      const url =
        `${ENDPOINT}?query=${encodeURIComponent(keyword)}&region=${encodeURIComponent(region)}` +
        `&city_limit=true&output=json&scope=2&page_size=5&page_num=0&ak=${encodeURIComponent(ak)}`;
      const res = await ctx.net.get(url, { gapMs: 260, allowRobots: false });
      if (res.status !== 200) return null;
      let data: BaiduResp;
      try {
        data = JSON.parse(res.body) as BaiduResp;
      } catch {
        return null;
      }
      if (data.status !== 0) {
        fatal = `${data.message ?? ''}（status=${data.status}）`;
        return null;
      }
      const list = data.results ?? [];
      return list.find((r) => r.name && nameMatch(r.name, keyword)) ?? list[0] ?? null;
    };

    const handle = async (target: 'poi' | 'hotel', id: string, name: string, cityName: string) => {
      const hit = await query(name, cityName);
      if (!hit) return;
      hits += 1;
      const url = hit.detail_info?.detail_url ?? `https://map.baidu.com/search/${encodeURIComponent(name)}`;
      if (nonEmpty(hit.address)) facts.push({ target, id, field: 'address', v: hit.address as string, src: 'baidu', url });
      else if (hit.address === '') facts.push({ target, id, field: 'address', v: `${cityName}（百度未给详细地址）`, src: 'baidu', url });
      if (nonEmpty(hit.telephone)) facts.push({ target, id, field: 'phone', v: hit.telephone as string, src: 'baidu', url });
      if (nonEmpty(hit.detail_info?.shop_hours))
        facts.push({ target, id, field: 'hours', v: hit.detail_info?.shop_hours as string, src: 'baidu', url });

      const rating = Number(hit.detail_info?.overall_rating);
      const count = Number(hit.detail_info?.comment_num);
      if (Number.isFinite(rating) && rating > 0) facts.push({ target, id, field: 'rating', v: rating, src: 'baidu', url });
      if (Number.isFinite(count) && count > 0) facts.push({ target, id, field: 'rating_count', v: count, src: 'baidu', url });

      platforms.push({
        target,
        id,
        review: {
          platform: 'baidu',
          status: Number.isFinite(rating) && rating > 0 ? 'ok' : 'empty',
          score: Number.isFinite(rating) && rating > 0 ? rating : undefined,
          count: Number.isFinite(count) && count > 0 ? count : undefined,
          url,
          note: nonEmpty(hit.detail_info?.tag) ? `百度标签：${hit.detail_info?.tag}` : '百度评分（不含正文）',
          at: Date.now(),
        },
      });
    };

    for (const poi of ctx.pois) {
      if (fatal) break;
      const city = ctx.cities.find((c) => c.code === poi.city);
      await handle('poi', poi.poi_id, poi.name, city?.name ?? '');
    }
    for (const hotel of ctx.hotels) {
      if (fatal) break;
      const city = ctx.cities.find((c) => c.code === hotel.city);
      await handle('hotel', hotel.id, hotel.name, city?.name ?? '');
    }

    if (fatal) ctx.log(`[api] ${fatal}`);
    return {
      run: mkRun(META, fatal ? 'blocked' : hits > 0 ? 'ok' : 'empty', {
        items: hits,
        requests: ctx.net.requests - reqBefore,
        bytes: ctx.net.bytes - bytesBefore,
        ms: Date.now() - started,
        error: fatal,
        note: fatal ? 'AK 无效、未开通 Place API 或配额用尽' : `命中 ${hits} 个点位`,
      }),
      facts,
      platforms,
    };
  },
};
