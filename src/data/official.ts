import { POIS, type PoiSeed } from './pois';

export type OfficialStatus = 'normal' | 'limited' | 'changed' | 'closed';

export interface OfficialInfo {
  poi_id: string;
  status: OfficialStatus;
  price: number | null;
  open: string | null;
  close: string | null;
  booking: 'none' | 'required' | 'limited';
  notice: string;
  source: string;
  source_url: string;
  fetched_at: number;
  /** true = 内置确定性快照（不是抓来的）；false = 真抓到的 */
  synthetic?: boolean;
}

export interface OfficialSnapshot {
  generated_at: number;
  mode: 'live' | 'cached' | 'offline';
  items: Record<string, OfficialInfo>;
}

export interface OfficialSource {
  id: string;
  name: string;
  url: string;
  kind: '文旅局' | '景区官网' | '铁路' | '平台';
  note: string;
}

/** 抓取目标登记表。真实抓取在 server/crawler.mjs 里跑（浏览器有 CORS，做不到）。 */
export const SOURCES: OfficialSource[] = [
  { id: 'cd-wlj', name: '成都市文化广电旅游局', url: 'https://cdwglj.chengdu.gov.cn/', kind: '文旅局', note: '景区公告 / 限流通知' },
  { id: 'cd-panda', name: '成都大熊猫繁育研究基地', url: 'https://www.panda.org.cn/', kind: '景区官网', note: '预约与开闭园时间' },
  { id: 'xa-wlj', name: '西安市文化和旅游局', url: 'https://wlj.xa.gov.cn/', kind: '文旅局', note: '景区公告' },
  { id: 'bj-wlj', name: '北京市文化和旅游局', url: 'https://whlyj.beijing.gov.cn/', kind: '文旅局', note: '预约 / 限流' },
  { id: 'hz-wlj', name: '杭州市文化广电旅游局', url: 'https://wgly.hangzhou.gov.cn/', kind: '文旅局', note: '景区公告' },
  { id: 'xm-wlj', name: '厦门市文化和旅游局', url: 'https://wlj.xm.gov.cn/', kind: '文旅局', note: '轮渡 / 景区公告' },
  { id: '12306', name: '中国铁路 12306', url: 'https://www.12306.cn/', kind: '铁路', note: '无公开数据接口，仅支持账号授权后同步（演示）' },
];

const NOTICES: { status: OfficialStatus; text: (p: PoiSeed, price: number) => string; booking: OfficialInfo['booking'] }[] = [
  {
    status: 'normal',
    booking: 'none',
    text: () => '运营正常，现场可直接入园。',
  },
  {
    status: 'changed',
    booking: 'required',
    text: (p) => `${p.name} 自本月起执行淡季票价，线上购票需实名预约。`,
  },
  {
    status: 'limited',
    booking: 'limited',
    text: () => '每日限流 12,000 人，建议提前 1 天在官方小程序预约。',
  },
  {
    status: 'limited',
    booking: 'required',
    text: () => '东门区域施工维护，建议从南门入园（预计持续至下月中旬）。',
  },
  {
    status: 'normal',
    booking: 'none',
    text: () => '节假日期间延长开放 1 小时，闭园前 30 分钟停止入场。',
  },
];

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function sourceFor(city: string): OfficialSource {
  const map: Record<string, string> = {
    chengdu: 'cd-wlj',
    xian: 'xa-wlj',
    beijing: 'bj-wlj',
    hangzhou: 'hz-wlj',
    xiamen: 'xm-wlj',
  };
  return SOURCES.find((s) => s.id === map[city]) ?? SOURCES[0];
}

export function buildOfficialSnapshot(now = Date.now(), mode: OfficialSnapshot['mode'] = 'offline'): OfficialSnapshot {
  const day = new Date(now).toISOString().slice(0, 10);
  const items: Record<string, OfficialInfo> = {};

  for (const poi of POIS) {
    const h = hash(`${poi.poi_id}:${day}`);
    const pick = NOTICES[h % NOTICES.length];
    const src = sourceFor(poi.city);
    const priceChanged = pick.status === 'changed';
    const price = priceChanged ? Math.max(0, Math.round(poi.price * 0.8)) : poi.price;
    const fetchedAt = now - (h % (28 * 60 * 1000));

    items[poi.poi_id] = {
      poi_id: poi.poi_id,
      status: pick.status,
      price,
      open: poi.open,
      close: poi.close,
      booking: pick.booking,
      notice: pick.text(poi, poi.price),
      source: src.name,
      source_url: src.url,
      fetched_at: fetchedAt,
      synthetic: true,
    };
  }

  return { generated_at: now, mode, items };
}

export const STATUS_CN: Record<OfficialStatus, string> = {
  normal: '正常开放',
  limited: '限流',
  changed: '有变更',
  closed: '暂停开放',
};

export const BOOKING_CN: Record<OfficialInfo['booking'], string> = {
  none: '无需预约',
  required: '需预约',
  limited: '限流预约',
};
