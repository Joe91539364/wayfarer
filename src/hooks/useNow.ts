import { useEffect, useRef, useState } from 'react';

export interface NowState {
  /** 已按服务器漂移校准过的「此刻」 */
  now: Date;
  /** 与服务器的偏差（毫秒，正数=本机慢了） */
  driftMs: number;
  /** 是否成功对过表 */
  synced: boolean;
  /** 服务端所在时区（对不上时用来提示） */
  serverTz: string | null;
}

/**
 * 现实时钟。
 *
 * 本机时间并不可信：时区设错、手动改过、虚拟机休眠恢复都会漂。
 * 这里先用 /api/now 对一次表，把偏差存下来，之后自己走秒；
 * 每 10 分钟重新对一次，服务没起来就老实退回本机钟（不阻断任何功能）。
 */
export function useNow(tickMs = 1000): NowState {
  const drift = useRef(0);
  const [driftMs, setDriftMs] = useState(0);
  const [synced, setSynced] = useState(false);
  const [serverTz, setServerTz] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let alive = true;

    async function sync() {
      try {
        const sentAt = Date.now();
        const r = await fetch('/api/now', { cache: 'no-store' });
        if (!r.ok) return;
        const j = (await r.json()) as { epoch?: number; tz?: string };
        if (typeof j.epoch !== 'number') return;
        // 扣掉往返的一半，粗略算单向延迟
        const rtt = Date.now() - sentAt;
        drift.current = j.epoch + rtt / 2 - Date.now();
        if (!alive) return;
        setDriftMs(Math.round(drift.current));
        setSynced(true);
        setServerTz(j.tz ?? null);
      } catch {
        /* 服务没起来：本机钟继续用 */
      }
    }

    void sync();
    const tick = window.setInterval(() => setNow(new Date(Date.now() + drift.current)), tickMs);
    const resync = window.setInterval(() => void sync(), 600_000);
    return () => {
      alive = false;
      window.clearInterval(tick);
      window.clearInterval(resync);
    };
  }, [tickMs]);

  return { now, driftMs, synced, serverTz };
}
