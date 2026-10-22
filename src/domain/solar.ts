/**
 * 日出 / 日落 —— NOAA 简化太阳位置算法，零依赖。
 *
 * 行程里「现实时间」最有用的三个数：几点天亮、几点天黑、黄金时刻从哪开始。
 * 公式与 GitHub 上的 suncalc（mourner/suncalc）同源，这里只保留旅行需要的部分，
 * 不做太阳高度角、月相那些。
 */

const RAD = Math.PI / 180;

const wrap360 = (x: number) => ((x % 360) + 360) % 360;
const wrapMin = (x: number) => ((x % 1440) + 1440) % 1440;

function hhmm(min: number): string {
  const v = wrapMin(Math.round(min));
  return `${String(Math.floor(v / 60)).padStart(2, '0')}:${String(v % 60).padStart(2, '0')}`;
}

export interface SolarTimes {
  /** 日出 HH:MM（目的地的钟） */
  sunrise: string;
  /** 日落 HH:MM */
  sunset: string;
  /** 黄金时刻起点（日落前 1 小时） */
  goldenStart: string;
  /** 白昼时长（分钟） */
  dayLengthMin: number;
}

/**
 * @param dateISO      当地日期 YYYY-MM-DD
 * @param lat / lng    目的地坐标
 * @param tzOffsetMin  目的地时区偏移（分钟，东八区 = 480）
 * @returns 极昼/极夜时返回 null（一天没有日出日落）
 */
export function solarTimes(
  dateISO: string,
  lat: number,
  lng: number,
  tzOffsetMin = 480,
): SolarTimes | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const [y, m, d] = dateISO.split('-').map(Number);
  if (!y || !m || !d) return null;

  // 距 J2000 的天数（取当日 12:00 UTC，避开跨日）
  const days = (Date.UTC(y, m - 1, d, 12) - Date.UTC(2000, 0, 1, 12)) / 86400000;

  const meanLon = wrap360(280.46 + 0.9856474 * days); // 平黄经
  const anomaly = wrap360(357.528 + 0.9856003 * days) * RAD; // 平近点角
  const eclLon = (meanLon + 1.915 * Math.sin(anomaly) + 0.02 * Math.sin(2 * anomaly)) * RAD;
  const eps = (23.439 - 4e-7 * days) * RAD; // 黄赤交角
  const dec = Math.asin(Math.sin(eps) * Math.sin(eclLon)); // 赤纬
  let raDeg = Math.atan2(Math.cos(eps) * Math.sin(eclLon), Math.cos(eclLon)) / RAD;
  raDeg = wrap360(raDeg);

  // 时差（分钟）：平太阳时与真太阳时之差，范围 ±16 分钟
  let eot = 4 * (((meanLon - raDeg + 180) % 360 + 360) % 360 - 180);

  // 太阳正午（UTC 分钟）
  const noonUTC = 720 - 4 * lng - eot;

  // 日出时角：-0.833° = 大气折射 + 太阳视半径
  const cosH =
    (Math.sin(-0.833 * RAD) - Math.sin(lat * RAD) * Math.sin(dec)) / (Math.cos(lat * RAD) * Math.cos(dec));
  if (!Number.isFinite(cosH) || cosH < -1 || cosH > 1) return null;
  const hourAngleMin = (Math.acos(cosH) / RAD) * 4; // 每度 4 分钟

  const rise = noonUTC - hourAngleMin;
  const set = noonUTC + hourAngleMin;
  const toLocal = (utcMin: number) => hhmm(utcMin + tzOffsetMin);

  return {
    sunrise: toLocal(rise),
    sunset: toLocal(set),
    goldenStart: toLocal(set - 60),
    dayLengthMin: Math.round(set - rise),
  };
}
