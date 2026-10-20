import type { WeatherDay } from '../verifier/rules';

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const CITY_CLIMATE: Record<string, { temp: number; rain: number }> = {
  chengdu: { temp: 24, rain: 42 },
  xian: { temp: 23, rain: 26 },
  xiamen: { temp: 27, rain: 34 },
  beijing: { temp: 22, rain: 18 },
  hangzhou: { temp: 25, rain: 38 },
};

/**
 * 确定性天气模拟。真实部署时应替换为 Open-Meteo 调用；
 * 这里保留同样的输出形状，并在 UI 上明确标注「模拟数据」，不假装是真实预报。
 */
export function simulatedWeather(city: string, dates: string[]): WeatherDay[] {
  const climate = CITY_CLIMATE[city] ?? { temp: 24, rain: 30 };
  return dates.map((date) => {
    const h = hash(`${city}:${date}`);
    const r = (h % 1000) / 1000;
    const rain = Math.round(Math.min(95, Math.max(0, climate.rain + (r - 0.5) * 70)));
    const temp = Math.round(climate.temp + (r - 0.5) * 10);
    const text = rain > 60 ? '有雨' : rain > 35 ? '多云' : '晴';
    return {
      date,
      precip_prob: rain,
      temp_max: temp + 4,
      temp_min: temp - 4,
      text,
      source: 'simulated' as const,
    };
  });
}
