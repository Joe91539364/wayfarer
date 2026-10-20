export type CrowdLevel = '空闲' | '舒适' | '较挤' | '爆满';

export interface LiveStatus {
  open: boolean;
  crowd: CrowdLevel;
  crowdPct: number;
  queueMin: number;
  priceNow: number;
  ticketLeft: number | null;
  updatedAt: number;
  source: string;
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function minutesOfDay(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

/**
 * 「实时」数据是本地确定性模拟：同一分钟同一 POI 结果稳定，刷新会随时间轻微变化。
 * 界面上必须标注数据源，不能假装是真实接口。
 */
export function liveStatus(
  poiId: string,
  opening: { open: string; close: string } | null,
  ticket: number,
  now: Date,
): LiveStatus {
  const [oh, om] = (opening?.open ?? '00:00').split(':').map(Number);
  const [ch, cm] = (opening?.close ?? '23:59').split(':').map(Number);
  const openMin = oh * 60 + om;
  let closeMin = ch * 60 + cm;
  if (closeMin < openMin) closeMin += 1440;
  const cur = minutesOfDay(now);
  const open = cur >= openMin && cur <= closeMin;

  const hour = now.getHours();
  const basin = hour < 9 ? 0.1 : hour < 11 ? 0.85 : hour < 13 ? 0.55 : hour < 16 ? 0.9 : hour < 18 ? 0.6 : hour < 21 ? 0.45 : 0.15;
  const jitter = ((hash(`${poiId}:${now.getHours()}:${now.getMinutes()}`) % 100) / 100 - 0.5) * 0.3;
  const pct = Math.round(Math.min(99, Math.max(2, (basin + jitter) * 100)));

  const crowd: CrowdLevel = pct > 82 ? '爆满' : pct > 60 ? '较挤' : pct > 32 ? '舒适' : '空闲';
  const queueMin = pct > 80 ? 15 + (pct % 20) : pct > 60 ? 5 + (pct % 8) : 0;
  const priceNow = ticket === 0 ? 0 : Math.round(ticket * (now.getDay() === 0 || now.getDay() === 6 ? 1 : 1));

  return {
    open,
    crowd,
    crowdPct: pct,
    queueMin,
    priceNow,
    ticketLeft: ticket > 0 ? Math.max(0, 200 + (hash(poiId) % 300) - Math.round(pct * 2.4)) : null,
    updatedAt: now.getTime(),
    source: 'local-simulation',
  };
}

export interface HotelLive {
  roomsLeft: number;
  priceNow: number;
  breakfast: boolean;
  updatedAt: number;
}

export function hotelLive(hotelId: string, basePrice: number, roomsLeft: number, now: Date): HotelLive {
  const weekend = now.getDay() === 5 || now.getDay() === 6;
  const jitter = (hash(`${hotelId}:${now.getDate()}`) % 12) - 6;
  return {
    roomsLeft: Math.max(0, roomsLeft - (weekend ? 1 : 0)),
    priceNow: Math.round(basePrice * (weekend ? 1.12 : 1) + jitter * 5),
    breakfast: basePrice > 200,
    updatedAt: now.getTime(),
  };
}

export function crowdColor(pct: number): string {
  if (pct > 82) return '#a03428';
  if (pct > 60) return '#a8761c';
  if (pct > 32) return '#2c6459';
  return '#3f6b45';
}
