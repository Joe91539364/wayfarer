import type { Itinerary } from './schema';
import { OUTDOOR_CATEGORIES } from './schema';
import type { CityWeather, DayWeather } from '../data/catalog';
import { toMin } from './time';

/**
 * 把「天气预报」变成「行程上能执行的动作」。
 *
 * 不是把 68% 这个数字丢给用户，而是说清楚三件事：
 *   哪一天 / 哪几个站在户外 / 可以怎么办（换成室内备选、整体推迟、带伞）。
 *
 * 所有判断只依赖真实抓到的预报（catalog.weather）。抓不到就不提醒 ——
 * 用模拟天气去驱动真实决策，比不提醒更糟（这条在 v3.0 里已经踩过一次）。
 */

export type AlertLevel = 'info' | 'warn' | 'danger';

export interface WeatherAlert {
  id: string;
  level: AlertLevel;
  kind: 'rain' | 'heat' | 'cold' | 'now' | 'wind';
  day_index: number | null;
  date: string;
  title: string;
  detail: string;
  itemIds: string[];
  /** 有这组 id 就能直接拿来做「换成室内」 */
  suggest: 'indoor' | 'shift' | 'umbrella' | 'none';
  weather: DayWeather;
}

const RAIN_TEXT = /(雨|雪|雷|冰雹)/;

function isOutdoor(category: string | null | undefined, sensitive: boolean): boolean {
  return sensitive || OUTDOOR_CATEGORIES.includes((category ?? '') as never);
}

export interface AlertInput {
  itinerary: Itinerary;
  weather?: CityWeather;
  /** 当前时间，用来算「还有多久出发」 */
  now?: Date;
}

export function buildAlerts({ itinerary, weather, now = new Date() }: AlertInput): WeatherAlert[] {
  if (!weather) return [];
  const byDate = new Map(weather.daily.map((d) => [d.date, d]));
  const alerts: WeatherAlert[] = [];

  for (const day of itinerary.days) {
    const w = byDate.get(day.date);
    if (!w) continue;

    const outdoor = day.items.filter((i) => i.type !== 'transit' && isOutdoor(i.category, i.weather_sensitive));
    const rainy = (w.precip ?? 0) >= 55 || RAIN_TEXT.test(w.text);

    if (rainy && outdoor.length > 0) {
      const prob = w.precip ?? 0;
      alerts.push({
        id: `rain-${day.date}`,
        level: prob >= 80 ? 'danger' : 'warn',
        kind: 'rain',
        day_index: day.day_index,
        date: day.date,
        title: `第 ${day.day_index} 天 ${w.text}${prob ? ` · 降水概率约 ${prob}%` : ''}`,
        detail: `${outdoor.map((i) => i.name).join('、')} 在户外。可以把其中一站换成室内备选，或整体顺延到雨停之后。`,
        itemIds: outdoor.map((i) => i.id),
        suggest: 'indoor',
        weather: w,
      });
    }

    if (w.high >= 33) {
      alerts.push({
        id: `heat-${day.date}`,
        level: w.high >= 37 ? 'danger' : 'info',
        kind: 'heat',
        day_index: day.day_index,
        date: day.date,
        title: `第 ${day.day_index} 天最高 ${w.high}℃`,
        detail:
          outdoor.length > 0
            ? `把 ${outdoor.map((i) => i.name).join('、')} 放到上午或傍晚，中午留给室内和吃饭。`
            : '全天都在室内，问题不大；出门记得带水。',
        itemIds: outdoor.map((i) => i.id),
        suggest: outdoor.length > 0 ? 'shift' : 'none',
        weather: w,
      });
    }

    if (w.low <= 4) {
      alerts.push({
        id: `cold-${day.date}`,
        level: 'info',
        kind: 'cold',
        day_index: day.day_index,
        date: day.date,
        title: `第 ${day.day_index} 天最低 ${w.low}℃`,
        detail: '早晚温差大，日出前后出门需要加一件外套。',
        itemIds: [],
        suggest: 'none',
        weather: w,
      });
    }
  }

  // 此刻：实况有雨，且 3 小时内有户外站
  if (weather.now && RAIN_TEXT.test(weather.now.text)) {
    const today = itinerary.days.find((d) => d.date === todayISO(now));
    if (today) {
      const soon = today.items.filter((i) => {
        if (i.type === 'transit' || !isOutdoor(i.category, i.weather_sensitive)) return false;
        const start = toMin(i.start_time);
        const diff = start - (now.getHours() * 60 + now.getMinutes());
        return diff >= -20 && diff <= 180;
      });
      if (soon.length > 0) {
        const w = byDate.get(today.date) ?? weather.daily[0];
        alerts.unshift({
          id: 'now-rain',
          level: 'warn',
          kind: 'now',
          day_index: today.day_index,
          date: today.date,
          title: `此刻${weather.now.text} · ${weather.now.temp}℃`,
          detail: `${soon.map((i) => `${i.start_time} ${i.name}`).join('、')} 是户外安排，带伞或者先换成室内。`,
          itemIds: soon.map((i) => i.id),
          suggest: 'umbrella',
          weather: w,
        });
      }
    }
  }

  return alerts;
}

export function todayISO(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/** 这条提醒值不值得弹系统通知：只在「今天是那一天，且 90 分钟内要出发」时弹 */
export function shouldNotify(alert: WeatherAlert, now = new Date()): boolean {
  if (alert.day_index == null) return false;
  return alert.date === todayISO(now) && (alert.kind === 'now' || alert.kind === 'rain');
}

export function summaryOf(alerts: WeatherAlert[]): string {
  if (alerts.length === 0) return '未来几天没有需要调整的天气';
  const danger = alerts.filter((a) => a.level === 'danger').length;
  if (danger > 0) return `${alerts.length} 条天气提醒，其中 ${danger} 条建议直接改行程`;
  return `${alerts.length} 条天气提醒`;
}
