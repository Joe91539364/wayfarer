import { useCallback, useEffect, useState } from 'react';
import { buildOfficialSnapshot, type OfficialSnapshot } from '../data/official';

export const REFRESH_MS = 30 * 60 * 1000;

/**
 * 官网信息源。
 * 真实抓取由 server/crawler.mjs 每 30 分钟跑一次，产出 public/official.json；
 * 前端优先读它，读不到就退回本地确定性快照，并在界面上标明是「离线快照」。
 */
export function useOfficialFeed() {
  const [snapshot, setSnapshot] = useState<OfficialSnapshot>(() => buildOfficialSnapshot(Date.now(), 'offline'));
  const [lastAt, setLastAt] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    // 单文件 HTML（file://）下不可能 fetch 同源 JSON，用构建时注入的快照顶上
    const injected = (window as unknown as { __OFFICIAL__?: OfficialSnapshot }).__OFFICIAL__;
    if (injected?.items && Object.keys(injected.items).length > 0) {
      setSnapshot({ ...injected, mode: 'cached' });
      setLastAt(Date.now());
      setRefreshing(false);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 4000);
    try {
      const res = await fetch(`official.json?t=${Date.now()}`, {
        cache: 'no-store',
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`http ${res.status}`);
      const data = (await res.json()) as OfficialSnapshot;
      if (!data?.items || Object.keys(data.items).length === 0) throw new Error('empty');
      setSnapshot({ ...data, mode: 'live' });
    } catch {
      setSnapshot(buildOfficialSnapshot(Date.now(), 'offline'));
    } finally {
      window.clearTimeout(timer);
      setLastAt(Date.now());
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const tick = window.setInterval(() => setNow(Date.now()), 1000);
    const loop = window.setInterval(() => void refresh(), REFRESH_MS);
    return () => {
      window.clearInterval(tick);
      window.clearInterval(loop);
    };
  }, [refresh]);

  return {
    snapshot,
    mode: snapshot.mode,
    lastAt,
    nextIn: Math.max(0, REFRESH_MS - (now - lastAt)),
    refreshing,
    refresh,
  };
}

export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function formatAgo(ts: number, now = Date.now()): string {
  const diff = Math.max(0, now - ts);
  if (diff < 60_000) return '刚刚';
  const m = Math.floor(diff / 60_000);
  if (m < 60) return `${m} 分钟前`;
  return `${Math.floor(m / 60)} 小时前`;
}
