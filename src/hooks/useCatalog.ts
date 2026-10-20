import { useCallback, useEffect, useMemo, useState } from 'react';
import { seedCatalog, type Catalog, type CrawlReport } from '../data/catalog';

export const CATALOG_REFRESH_MS = 30 * 60 * 1000;

export type CatalogMode = 'server' | 'static' | 'seed';

async function getJson<T>(url: string, init?: RequestInit, timeoutMs = 6000): Promise<T | null> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { cache: 'no-store', signal: controller.signal, ...init });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    window.clearTimeout(timer);
  }
}

/**
 * 爬虫产物的前端入口。
 *
 * 三种来源，按可用性降级，界面上会明示是哪一种：
 *   server  —— 本地服务（npm run serve）在跑，可以点「立即抓取」
 *   static  —— 托管的是构建产物，只能读最近一次抓的文件
 *   seed    —— 什么都没有（比如 file:// 打开单文件），用内置数据集
 */
export function useCatalog() {
  const [catalog, setCatalog] = useState<Catalog>(() => seedCatalog());
  const [report, setReport] = useState<CrawlReport | null>(null);
  const [mode, setMode] = useState<CatalogMode>('seed');
  const [loading, setLoading] = useState(true);
  const [crawling, setCrawling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [keys, setKeys] = useState<{ amap: string | null; baidu: string | null; glm: string | null }>({
    amap: null,
    baidu: null,
    glm: null,
  });

  const load = useCallback(async () => {
    const live = await getJson<Catalog>('/api/catalog', undefined, 4000);
    const usable = (c?: Catalog | null) => Boolean(c?.pois && Object.keys(c.pois).length > 0);
    if (usable(live)) {
      setCatalog(live as Catalog);
      setMode('server');
      setReport(await getJson<CrawlReport>('/api/report', undefined, 4000));
      const k = await getJson<{ amap: string | null; baidu: string | null; glm: string | null }>('/api/keys', undefined, 3000);
      if (k) setKeys(k);
      setLoading(false);
      setError(null);
      return;
    }

    // 单文件 HTML 里没有同源服务器，爬虫结果由 bundle-single 注入成全局变量
    const injected = (window as unknown as { __CATALOG__?: Catalog; __CRAWL_REPORT__?: CrawlReport }).__CATALOG__;
    if (usable(injected)) {
      setCatalog(injected as Catalog);
      setMode('static');
      setReport((window as unknown as { __CRAWL_REPORT__?: CrawlReport }).__CRAWL_REPORT__ ?? null);
      setLoading(false);
      return;
    }

    const stat = await getJson<Catalog>('./catalog.json');
    if (usable(stat)) {
      setCatalog(stat as Catalog);
      setMode('static');
      setReport(await getJson<CrawlReport>('./crawl-report.json'));
      setLoading(false);
      return;
    }

    setCatalog(seedCatalog());
    setMode('seed');
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), CATALOG_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  const crawlNow = useCallback(async () => {
    setCrawling(true);
    setError(null);
    try {
      const res = await getJson<CrawlReport>('/api/crawl', { method: 'POST' }, 180_000);
      if (!res) {
        setError('抓取接口没有响应。只有 npm run serve 模式下才能手动触发。');
        return null;
      }
      setReport(res);
      await load();
      return res;
    } finally {
      setCrawling(false);
    }
  }, [load]);

  const saveKeys = useCallback(
    async (next: { amap?: string; baidu?: string; glm?: string }) => {
      const res = await getJson<{ amap: string | null; baidu: string | null; glm: string | null }>(
        '/api/keys',
        { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(next) },
        6000,
      );
      if (res) setKeys(res);
      return Boolean(res);
    },
    [],
  );

  const gates = useMemo(() => new Map(catalog.gates.map((g) => [g.platform, g])), [catalog]);

  return { catalog, report, mode, loading, crawling, error, keys, gates, refresh: load, crawlNow, saveKeys };
}
