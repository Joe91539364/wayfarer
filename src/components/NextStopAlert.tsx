import { useEffect, useMemo, useRef } from 'react';
import type { Itinerary, ItineraryItem } from '../domain/schema';
import { toMin } from '../domain/time';
import { IconArrow, IconBell, IconLink } from './icons';

/**
 * 下一站出发提醒。
 *
 * 「到点前主动提醒」要成立，必须回答三个问题：
 *   下一站是哪 → 几点该出发 → 怎么去最合适。
 * 前两个由程序算（活动开始时间 - 前一段通勤时长），第三个按距离给建议，
 * 并直接给高德导航和叫车入口 —— 不让用户提醒完了还得自己找按钮。
 */

const LEAD_MIN = 30;
const MODE_CN: Record<string, string> = {
  walk: '步行',
  taxi: '打车',
  subway: '地铁',
  bus: '公交',
  train: '火车',
};

export interface NextDeparture {
  item: ItineraryItem;
  /** 前一段通勤（住宿/上一站 → 下一站），可能没有（首站紧挨着） */
  transit: ItineraryItem | null;
  from: { lat: number; lng: number; name: string } | null;
  km: number;
  /** 距活动开始还有多少分钟（负数=已经开始） */
  minLeft: number;
  /** 建议 N 分钟后出发 */
  departInMin: number;
  plannedMode: string | null;
  advice: { mode: string; why: string };
}

export function findNextDeparture(itinerary: Itinerary, clock: Date, leadMin = LEAD_MIN): NextDeparture | null {
  const dateStr = `${clock.getFullYear()}-${String(clock.getMonth() + 1).padStart(2, '0')}-${String(
    clock.getDate(),
  ).padStart(2, '0')}`;
  const day = itinerary.days.find((d) => d.date === dateStr);
  if (!day) return null;
  const nowMin = clock.getHours() * 60 + clock.getMinutes();

  for (let i = 0; i < day.items.length; i++) {
    const item = day.items[i];
    if (item.type === 'transit' || item.type === 'rest') continue;
    const startMin = toMin(item.start_time);
    const minLeft = startMin - nowMin;
    if (minLeft < 0 || minLeft > leadMin) continue;

    const transit = i > 0 && day.items[i - 1].type === 'transit' ? day.items[i - 1] : null;
    const prevAct = [...day.items.slice(0, i)].reverse().find((x) => x.type !== 'transit' && x.type !== 'rest');
    const from =
      prevAct?.lat != null && prevAct?.lng != null
        ? { lat: prevAct.lat, lng: prevAct.lng, name: prevAct.name }
        : day.lodging
          ? { lat: day.lodging.lat, lng: day.lodging.lng, name: day.lodging.name }
          : null;
    const km =
      transit?.distance_m != null
        ? transit.distance_m / 1000
        : from && item.lat != null && item.lng != null
          ? Math.hypot((item.lat - from.lat) * 111, (item.lng - from.lng) * 111 * Math.cos((item.lat * Math.PI) / 180))
          : 0;
    const travelMin = transit?.duration_min ?? 0;
    const plannedMode = transit?.mode ?? null;
    const advice = advise(km, plannedMode);
    return {
      item,
      transit,
      from,
      km,
      minLeft,
      departInMin: Math.max(0, minLeft - travelMin),
      plannedMode,
      advice,
    };
  }
  return null;
}

function advise(km: number, planned: string | null): { mode: string; why: string } {
  if (km < 0.9) return { mode: '步行', why: `${km.toFixed(1)}km，步行比等车快` };
  if (km < 3) {
    return planned === 'subway' || planned === 'bus'
      ? { mode: '地铁/公交', why: `${km.toFixed(1)}km，公共交通够用，打车反而要等` }
      : { mode: '打车或公交', why: `${km.toFixed(1)}km，不赶时间坐公交，赶时间打车` };
  }
  if (km < 10) return { mode: '打车', why: `${km.toFixed(1)}km，打车 20 分钟上下，公交要倒车` };
  return { mode: '打车/网约车', why: `${km.toFixed(1)}km，建议直接叫车，预算大约 ¥${Math.round(10 + km * 2.6)}` };
}

/** 高德网页导航：起终点都带名字，步行/驾车按建议来 */
export function amapNavUrl(dep: NextDeparture): string | null {
  if (!dep.from || dep.item.lat == null || dep.item.lng == null) return null;
  const f6 = (n: number) => n.toFixed(6);
  const enc = encodeURIComponent;
  const mode = dep.km < 0.9 ? 'walk' : 'car';
  return (
    `https://uri.amap.com/navigation?from=${f6(dep.from.lng)},${f6(dep.from.lat)},${enc(dep.from.name)}` +
    `&to=${f6(dep.item.lng)},${f6(dep.item.lat)},${enc(dep.item.name)}&via=&mode=${mode}` +
    `&policy=&src=wayfarer&coordinate=gaode&callnative=0`
  );
}

interface Props {
  itinerary: Itinerary;
  clock: Date;
  /** 实时模式才弹系统通知；拖时间轴预演时只显示不吵人 */
  realTime: boolean;
  notifyState: 'default' | 'granted' | 'denied' | 'unsupported';
  onOpenItem: (id: string) => void;
  onTaxi: (id: string) => void;
}

export default function NextStopAlert({ itinerary, clock, realTime, notifyState, onOpenItem, onTaxi }: Props) {
  const dep = useMemo(() => findNextDeparture(itinerary, clock), [itinerary, clock]);
  const fired = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!dep || !realTime || notifyState !== 'granted') return;
    const key = `${dep.item.id}@${clock.toDateString()}`;
    if (fired.current.has(key)) return;
    fired.current.add(key);
    try {
      new Notification(`该出发了 · ${dep.item.start_time} ${dep.item.name}`, {
        body: `建议${dep.advice.mode}：${dep.advice.why}。建议 ${dep.item.start_time} 前到。`,
        tag: `depart-${dep.item.id}`,
      });
    } catch {
      /* 浏览器拒绝就算了，横幅还在 */
    }
  }, [dep, realTime, notifyState, clock]);

  if (!dep) return null;

  const nav = amapNavUrl(dep);
  const timeLeft = dep.departInMin <= 0 ? '现在就该出发' : `${dep.departInMin} 分钟后出发`;

  return (
    <div className="dep-bar" role="alert">
      <div className="dep-icon">
        <IconBell size={14} />
      </div>
      <div className="dep-body">
        <b>
          下一站 {dep.item.start_time} {dep.item.name}
        </b>
        <p>
          {dep.transit ? (
            <>
              通勤 {dep.transit.duration_min} 分钟
              {dep.km ? ` · ${dep.km.toFixed(1)}km` : ''}
              {dep.plannedMode && MODE_CN[dep.plannedMode] ? `（原计划${MODE_CN[dep.plannedMode]}）` : ''}
            </>
          ) : (
            '就在旁边，抬脚就到'
          )}
          {' · '}
          <em>{timeLeft}</em>
          {' · '}
          建议{dep.advice.mode}：{dep.advice.why}
        </p>
      </div>
      <div className="dep-actions">
        {nav && (
          <a className="btn btn-sm btn-accent" href={nav} target="_blank" rel="noopener noreferrer">
            <IconLink size={12} /> 高德导航
          </a>
        )}
        {dep.km >= 0.9 && (
          <button className="btn btn-sm" onClick={() => onTaxi(dep.item.id)}>
            叫车 <IconArrow size={11} />
          </button>
        )}
        <button className="btn btn-sm btn-ghost" onClick={() => onOpenItem(dep.item.id)}>
          看这一站
        </button>
      </div>
    </div>
  );
}
