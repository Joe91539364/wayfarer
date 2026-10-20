import { haversine } from './geo';

/**
 * 城际交通估算。
 *
 * 目的不是给准数，而是给「量级」：到底是高铁半天、飞机两小时，还是自驾一整天。
 * 有了这个量级，第一天的行程才知道从几点开始 —— 早上 6 点出发的人不该被排在 9 点半逛景点。
 *
 * 三个数字都标了「估算」，票价按常见区间给，界面不假装是实时票价。
 */

export type LegMode = 'rail' | 'air' | 'drive';

export interface Leg {
  mode: LegMode;
  label: string;
  hours: number;
  priceLow: number;
  priceHigh: number;
  note: string;
  fit: 'best' | 'ok' | 'meh';
}

export interface IntercityPlan {
  from: string;
  to: string;
  km: number;
  legs: Leg[];
  /** 建议的第 1 天开始时间（到达后留 1 小时安顿） */
  firstDayStart: string;
  summary: string;
}

const round = (n: number, step = 10) => Math.round(n / step) * step;

export function estimateLegs(km: number, travelers: number): Leg[] {
  const legs: Leg[] = [];

  // 高铁：约 200km/h 均速（含停站），加 40 分钟进站候车
  const railH = km / 200 + 0.7;
  legs.push({
    mode: 'rail',
    label: '高铁 / 动车',
    hours: railH,
    priceLow: round(Math.max(25, km * 0.32) * travelers),
    priceHigh: round(Math.max(40, km * 0.5) * travelers),
    note: `约 ${Math.round(km * 1.22)} 公里车程，可能要中转一次`,
    fit: km <= 1200 ? 'best' : km < 1800 ? 'ok' : 'meh',
  });

  // 飞机：800 公里以内不如高铁，超过才划算
  const airH = km / 700 + 2.2;
  legs.push({
    mode: 'air',
    label: '飞机',
    hours: airH,
    priceLow: round((280 + km * 0.35) * travelers, 50),
    priceHigh: round((520 + km * 0.75) * travelers, 50),
    note: km < 700 ? '太近了，加上往返机场和安检不一定比高铁快' : `空中 ${Math.round(km / 700 * 60)} 分钟，其余是候机`,
    fit: km >= 900 ? 'best' : 'meh',
  });

  // 自驾：按 85km/h 均速，油费 + 过路约 0.85 元/公里
  const driveH = (km * 1.25) / 85 + 0.2;
  legs.push({
    mode: 'drive',
    label: '自驾',
    hours: driveH,
    priceLow: round(km * 1.25 * 0.55),
    priceHigh: round(km * 1.25 * 0.95),
    note: driveH > 8 ? '单程超过 8 小时，建议中途住一晚或换高铁' : '含油费与过路费，不含停车',
    fit: km <= 300 ? 'ok' : driveH > 8 ? 'meh' : 'ok',
  });

  return legs;
}

export function planIntercity(
  from: { name: string; lat: number; lng: number } | null,
  to: { name: string; lat: number; lng: number },
  travelers: number,
): IntercityPlan | null {
  if (!from) return null;
  const km = haversine(from, to);
  const legs = estimateLegs(km, travelers);
  const best = [...legs].sort((a, b) => (a.fit === 'best' ? -1 : 0) - (b.fit === 'best' ? -1 : 0))[0];
  const arriveHour = 9 + best.hours; // 假设 9 点出发
  const startMin = Math.min(15 * 60, Math.max(10 * 60, Math.round((arriveHour + 1) * 60)));
  const hh = String(Math.floor(startMin / 60)).padStart(2, '0');
  const mm = String(startMin % 60).padStart(2, '0');

  return {
    from: from.name,
    to: to.name,
    km: Math.round(km),
    legs,
    firstDayStart: `${hh}:${mm}`,
    summary:
      km < 200
        ? `${from.name}→${to.name} 约 ${Math.round(km)} 公里，高铁一小时出头`
        : `${from.name}→${to.name} 直线 ${Math.round(km)} 公里，${
            best.mode === 'rail' ? '建议高铁' : best.mode === 'air' ? '建议飞机' : '自驾更灵活'
          }`,
  };
}

export const fmtHours = (h: number): string => {
  const total = Math.round(h * 60);
  const hh = Math.floor(total / 60);
  const mm = total % 60;
  return hh > 0 ? `${hh} 小时${mm > 0 ? ` ${mm} 分` : ''}` : `${mm} 分钟`;
};

export const fmtMoney = (v: number): string => `¥${v.toLocaleString('zh-CN')}`;

/* ------------------------------ 跳转 ------------------------------ */

export interface TicketLink {
  id: string;
  name: string;
  color: string;
  url: (p: IntercityPlan, date: string) => string;
  copy?: (p: IntercityPlan, date: string) => string;
  note: string;
}

export const TICKET_LINKS: TicketLink[] = [
  {
    id: '12306',
    name: '铁路 12306',
    color: '#3b82f6',
    url: () => 'https://www.12306.cn/index/',
    copy: (p, d) => `${p.from} → ${p.to} ${d} 高铁`,
    note: '没有公开的「城市对+日期」跳转参数，打开官网后把复制的行程粘到出发地/目的地',
  },
  {
    id: 'ctrip-rail',
    name: '携程火车票',
    color: '#2577e3',
    url: (p, d) => `https://trains.ctrip.com/TrainBooking/Search.aspx?from=${encodeURIComponent(p.from)}&to=${encodeURIComponent(p.to)}&day=${d}`,
    copy: (p, d) => `${p.from} → ${p.to} ${d}`,
    note: '携程的搜索页支持 from/to/day 参数，能不能直达看它自己',
  },
  {
    id: 'fliggy',
    name: '飞猪机票',
    color: '#ff6a00',
    url: () => 'https://www.fliggy.com/',
    copy: (p, d) => `${p.from} → ${p.to} ${d} 机票`,
    note: '机票按「出发城市-到达城市-日期」查，通常要用三字码',
  },
  {
    id: 'amap-drive',
    name: '高德驾车',
    color: '#1a73e8',
    url: () => 'https://www.amap.com/',
    note: '在「打车」面板里可以直接唤起高德 App 规划长途路线',
  },
];
