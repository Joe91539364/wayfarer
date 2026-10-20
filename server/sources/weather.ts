/**
 * 天气源：中国天气网 + 天气网。
 *
 * 只用「浏览器正常访问就能拿到」的公开页面，不伪装成别的客户端。
 * 测试中 d1.weather.com.cn 的 JSON 接口对我们的 UA 返回 403，那就换一条路：
 *
 *   www.weather.com.cn/weather/{站号}.shtml   七天预报（服务端渲染）+ hidden_title（今天实况与高低温）
 *   www.tianqi.com/{拼音}/                    实况温度、湿度、风向
 *
 * 降水概率是**按天气现象映射的估计值**，不是数值预报 —— 这一点会一路带到校验器的 detail 里。
 */

import { CITY_STATIONS } from '../../src/data/catalog';
import type { CityWeather, DayWeather } from '../../src/data/catalog';
import { mkRun, type SourceCtx, type SourceOutput } from './types';

const META = {
  id: 'weather',
  name: '中国天气网 / 天气网',
  kind: 'weather' as const,
  access: 'open' as const,
  license: '公共气象服务数据，仅作展示与校验参考',
  homepage: 'https://www.weather.com.cn/',
  note: '实况 + 七天预报；无需 Key',
};

const REFERER = 'http://www.weather.com.cn/';

/** 天气现象 → 降水概率。公开页面不给数值降水概率，这是映射推断，界面上会注明。 */
export function precipOf(text: string): number | undefined {
  if (!text) return undefined;
  const pick = (t: string): number => {
    if (/暴雨|大暴雨/.test(t)) return 95;
    if (/大雨/.test(t)) return 90;
    if (/中雨/.test(t)) return 82;
    if (/雷阵雨/.test(t)) return 78;
    if (/阵雨/.test(t)) return 72;
    if (/小雨|雨夹雪/.test(t)) return 68;
    if (/雪/.test(t)) return 75;
    if (/阴/.test(t)) return 25;
    if (/多云/.test(t)) return 15;
    if (/晴/.test(t)) return 5;
    if (/雾|霾|浮尘|沙尘/.test(t)) return 10;
    return 30;
  };
  return Math.max(...text.split(/转|到|至/).map(pick));
}

function addDays(base: Date, n: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** hidden_title：10月18日20时 周日  多云转晴  14/22°C → 实况文本 + 今日低温/高温 */
function parseHiddenTitle(html: string): { text: string; low: number; high: number; hour: number } | null {
  const raw = /id="hidden_title"\s+value="([^"]*)"/.exec(html)?.[1];
  if (!raw) return null;
  const temps = /(-?\d+)\s*\/\s*(-?\d+)\s*°?\s*C/i.exec(raw);
  const text = /(\d{1,2}时)\s*(?:周[一二三四五六日天])?\s*([^\d]*?)\s*(?:-?\d+\s*\/|$)/.exec(raw)?.[2]?.trim();
  const hour = Number(/(\d{1,2})时/.exec(raw)?.[1] ?? NaN);
  if (!temps) return null;
  return {
    text: (text || '').replace(/\s+/g, ''),
    low: Number(temps[1]),
    high: Number(temps[2]),
    hour: Number.isFinite(hour) ? hour : new Date().getHours(),
  };
}

/** 七天列表：<li class="sky…"> <h1>19日（明天）</h1> … <p class="wea">晴</p> <p class="tem"><span>22℃</span>/<i>14℃</i></p> */
function parseDaily(html: string, now: Date): DayWeather[] {
  const out: DayWeather[] = [];
  const ul = /<ul class="t clearfix">([\s\S]*?)<\/ul>/.exec(html)?.[1] ?? '';
  for (const [i, chunk] of ul.split(/<li class="sky/).slice(1).entries()) {
    const text = /<p[^>]*class="wea"[^>]*>([^<]*)</.exec(chunk)?.[1]?.trim() ?? '';
    if (!text) continue;
    const tem = /<p class="tem">([\s\S]*?)<\/p>/.exec(chunk)?.[1] ?? '';
    const nums = [...tem.matchAll(/(-?\d+)\s*℃/g)].map((x) => Number(x[1]));
    const high = nums.length >= 2 ? nums[0] : undefined;
    const low = nums.length >= 2 ? nums[1] : nums[0];
    if (low == null) continue;
    out.push({
      date: addDays(now, i),
      text,
      high: high ?? low,
      low,
      precip: precipOf(text),
    });
  }
  return out;
}

/** 天气网实况：<p class="now"><b>18</b><i>℃</i></p> + <span><b>阴</b>18 ~ 23℃</span> */
function parseTianqi(html: string): { temp: number; text: string; humidity?: number; wind?: string } | null {
  const temp = Number(/<p class="now"><b>(-?\d+)<\/b>/.exec(html)?.[1]);
  if (!Number.isFinite(temp)) return null;
  const text = /<span><b>([^<]+)<\/b>/.exec(html)?.[1]?.trim() ?? '';
  const humidity = Number(/(\d{1,3})%/.exec(/湿度：(\d{1,3}%)/.exec(html)?.[1] ?? '')?.[1]);
  const wind = /风向：([^<]{1,12})</.exec(html)?.[1]?.trim();
  return {
    temp,
    text,
    humidity: Number.isFinite(humidity) ? humidity : undefined,
    wind,
  };
}

export const weatherSource = {
  meta: META,
  async run(ctx: SourceCtx): Promise<SourceOutput> {
    const started = Date.now();
    const weather: CityWeather[] = [];
    const logs: string[] = [];
    const reqBefore = ctx.net.requests;
    const bytesBefore = ctx.net.bytes;
    let failures = 0;

    for (const city of ctx.cities) {
      const station = CITY_STATIONS[city.code];
      if (!station) continue;
      const today = new Date();

      const fcUrl = `https://www.weather.com.cn/weather/${station.code}.shtml`;
      const fc = await ctx.net.get(fcUrl, { headers: { Referer: REFERER } });

      let daily: DayWeather[] = [];
      let head: ReturnType<typeof parseHiddenTitle> = null;
      if (fc.status === 200) {
        daily = parseDaily(fc.body, today);
        head = parseHiddenTitle(fc.body);
      }

      // 今日高低温用 hidden_title 校正（列表里「今天」只有一个数，是低温）
      if (head && daily.length > 0) {
        daily[0] = {
          ...daily[0],
          low: head.low,
          high: head.high,
          text: head.text || daily[0].text,
          precip: precipOf(head.text || daily[0].text),
        };
      }

      const tqUrl = `https://www.tianqi.com/${station.slug}/`;
      const tq = await ctx.net.get(tqUrl, {});
      const live = tq.status === 200 ? parseTianqi(tq.body) : null;

      if (daily.length === 0 && !live) {
        failures += 1;
        logs.push(`[fail] ${station.name}：预报 ${fc.status} / 实况 ${tq.status}`);
        continue;
      }

      weather.push({
        city: city.code,
        cityName: station.name,
        station: station.code,
        now: live
          ? {
              temp: live.temp,
              text: live.text || daily[0]?.text || '',
              humidity: live.humidity,
              wind: live.wind,
              observedAt: head ? `${String(head.hour).padStart(2, '0')}:00` : undefined,
            }
          : head
            ? { temp: head.low, text: head.text, observedAt: `${String(head.hour).padStart(2, '0')}:00` }
            : undefined,
        daily,
        src: META.id,
        at: Date.now(),
        url: fcUrl,
      });

      logs.push(
        `[ok] ${station.name}：${live ? `${live.temp}℃ ${live.text}` : '实况缺'} · 预报 ${daily.length} 天` +
          (daily[0] ? `（今日 ${daily[0].low}~${daily[0].high}℃ ${daily[0].text}）` : ''),
      );
    }

    return {
      run: mkRun(META, weather.length > 0 ? 'ok' : 'error', {
        items: weather.length,
        requests: ctx.net.requests - reqBefore,
        bytes: ctx.net.bytes - bytesBefore,
        ms: Date.now() - started,
        error: failures > 0 ? `${failures} 个城市抓取失败` : undefined,
        note: META.note,
      }),
      weather,
    };
  },
};
