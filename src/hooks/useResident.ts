import { useEffect, useState } from 'react';

export type ResidentState = {
  online: boolean;
  uptimeSec: number | null;
  lastRunAt: number | null;
  nextRunAt: number | null;
  everyMin: number | null;
  lastOk: boolean | null;
  running: boolean;
  catalogAgeMin: number | null;
};

const EMPTY: ResidentState = {
  online: false,
  uptimeSec: null,
  lastRunAt: null,
  nextRunAt: null,
  everyMin: null,
  lastOk: null,
  running: false,
  catalogAgeMin: null,
};

type Health = {
  ok?: boolean;
  uptimeSec?: number;
  catalogAgeMin?: number | null;
  schedule?: {
    everyMin?: number;
    lastRunAt?: number | null;
    nextRunAt?: number | null;
    lastOk?: boolean | null;
    running?: boolean;
  };
};

/**
 * 读本地常驻服务的健康状态。
 * 只读 /api/health，60 秒一次 —— 顶栏那个「常驻」小标就靠它。
 */
export function useResident(): ResidentState {
  const [state, setState] = useState<ResidentState>(EMPTY);

  useEffect(() => {
    let alive = true;
    let timer: number | undefined;

    const tick = async () => {
      try {
        const r = await fetch('/api/health', { signal: AbortSignal.timeout(2500) });
        if (!r.ok) throw new Error(String(r.status));
        const h = (await r.json()) as Health;
        if (!alive) return;
        setState({
          online: Boolean(h.ok),
          uptimeSec: h.uptimeSec ?? null,
          lastRunAt: h.schedule?.lastRunAt ?? null,
          nextRunAt: h.schedule?.nextRunAt ?? null,
          everyMin: h.schedule?.everyMin ?? null,
          lastOk: h.schedule?.lastOk ?? null,
          running: Boolean(h.schedule?.running),
          catalogAgeMin: h.catalogAgeMin ?? null,
        });
      } catch {
        if (alive) setState((prev) => (prev.online ? { ...EMPTY, online: false } : prev));
      } finally {
        if (alive) timer = window.setTimeout(tick, 60_000);
      }
    };

    void tick();
    return () => {
      alive = false;
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  return state;
}

export function fmtUptime(sec: number | null): string {
  if (sec == null) return '';
  if (sec < 60) return `${sec} 秒`;
  if (sec < 3600) return `${Math.floor(sec / 60)} 分钟`;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return m ? `${h} 小时 ${m} 分` : `${h} 小时`;
}

export function fmtCountdown(at: number | null): string {
  if (!at) return '';
  const ms = at - Date.now();
  if (ms <= 0) return '即将刷新';
  const min = Math.ceil(ms / 60_000);
  return min <= 1 ? '不到 1 分钟后刷新' : `${min} 分钟后刷新`;
}
