import { useEffect, useState } from 'react';
import type { Catalog, CrawlReport, PlatformGate } from '../data/catalog';
import { PLATFORMS } from '../data/catalog';
import type { CatalogMode } from '../hooks/useCatalog';
import { formatAgo } from '../hooks/useOfficialFeed';
import { IconAlert, IconCheck, IconCopy, IconRefresh, IconX } from './icons';

interface Props {
  open: boolean;
  onClose: () => void;
  catalog: Catalog;
  report: CrawlReport | null;
  mode: CatalogMode;
  crawling: boolean;
  error: string | null;
  keys: { amap: string | null; baidu: string | null; glm: string | null };
  gates: Map<string, PlatformGate>;
  onCrawl: () => void;
  onSaveKeys: (k: { amap?: string; baidu?: string; glm?: string }) => Promise<boolean>;
  onToast: (msg: string) => void;
}

const STATUS_CN: Record<string, string> = {
  ok: '成功',
  empty: '无内容',
  need_key: '需 Key',
  need_auth: '需授权',
  blocked: '被拒',
  error: '出错',
  skipped: '跳过',
};

const ACCESS_CN: Record<string, string> = {
  open: '公开',
  key: '需 Key',
  partner: '需合作',
  export: '导入',
};

const MODE_CN: Record<CatalogMode, string> = {
  server: '本地服务',
  static: '静态快照',
  seed: '内置数据集',
};

/**
 * 数据源控制台。
 *
 * 这是「内置爬虫」的操作台：每个源想干什么、现在什么状态、抓了多少、被谁拒了，
 * 还有 Key 的配置与手动触发。没有 npm run serve 时，「立即抓取」是禁用的 ——
 * 因为浏览器自己抓不了别人的页面，这一点在界面上直接说清楚。
 */
export default function DataSourcesModal(props: Props) {
  const { open, onClose, catalog, report, mode, crawling, error, keys, gates, onCrawl, onSaveKeys, onToast } = props;
  const [amap, setAmap] = useState('');
  const [baidu, setBaidu] = useState('');
  const [glm, setGlm] = useState('');
  const [testing, setTesting] = useState(false);
  const [disabled, setDisabled] = useState<string[]>([]);

  // 打开面板时同步服务端的启停设置
  useEffect(() => {
    if (!open || mode !== 'server') return;
    void fetch('/api/settings')
      .then((r) => r.json() as Promise<{ disabledSources?: string[] }>)
      .then((j) => setDisabled(Array.isArray(j.disabledSources) ? j.disabledSources : []))
      .catch(() => {
        /* 没有本地服务就用空列表 */
      });
  }, [open, mode]);

  async function toggleSource(id: string, name: string) {
    const next = disabled.includes(id) ? disabled.filter((x) => x !== id) : [...disabled, id];
    setDisabled(next);
    try {
      const r = (await fetch('/api/settings', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ disabledSources: next }),
      }).then((x) => x.json())) as { ok?: boolean; error?: string };
      onToast(
        r.ok
          ? next.includes(id)
            ? `已停用「${name}」，下一轮不再抓取`
            : `已启用「${name}」，下一轮恢复抓取`
          : `保存失败：${r.error ?? '未知原因'}`,
      );
    } catch {
      onToast('保存失败，确认本地服务在运行');
    }
  }

  if (!open) return null;

  const runs = report?.runs ?? catalog.sources;
  const totalReq = report?.requests ?? runs.reduce((s, r) => s + r.requests, 0);
  const totalBytes = report?.bytes ?? runs.reduce((s, r) => s + r.bytes, 0);

  const copyLog = async () => {
    const text = (report?.logs ?? []).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      onToast('日志已复制');
    } catch {
      onToast('复制失败，可以直接看下面的列表');
    }
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal ds-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <h3>数据源</h3>
            <p className="tiny muted">
              {MODE_CN[mode]} · 更新于 {formatAgo(catalog.generated_at)} ·{' '}
              {catalog.stats.pois} 景点 / {catalog.stats.hotels} 酒店 / {catalog.stats.photos} 张图 /{' '}
              {catalog.stats.platforms} 条平台记录
            </p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            <IconX size={14} />
          </button>
        </div>

        <div className="modal-body">
          <div className={`ds-run ${catalog.mode}`}>
            <div>
              <b>
                {catalog.mode === 'live' ? '有源跑通了' : catalog.mode === 'partial' ? '部分源失败' : '只有内置数据集'}
              </b>
              <p>
                近一轮 {totalReq} 个请求 / {(totalBytes / 1024).toFixed(0)}KB
                {report ? ` · 用时 ${(report.ms / 1000).toFixed(1)}s` : ''}
                {report?.finished_at ? ` · ${formatAgo(report.finished_at)}` : ''}
              </p>
            </div>
            <div className="ds-run-actions">
              <button
                className="btn btn-accent btn-sm"
                onClick={onCrawl}
                disabled={crawling || mode !== 'server'}
                title={mode !== 'server' ? '需要 npm run serve 才能在页面里触发抓取' : '跑一轮'}
              >
                <IconRefresh size={12} /> {crawling ? '抓取中…' : '立即抓取'}
              </button>
            </div>
          </div>

          {mode !== 'server' && (
            <div className="ds-hint">
              <IconAlert size={11} />
              <span>
                当前是{MODE_CN[mode]}模式，页面里不能触发抓取（浏览器有同源策略，也不该把 Key 放进页面）。
                跑 <code>npm run serve</code> 后刷新，这里就能一键抓。
              </span>
            </div>
          )}

          {error && (
            <div className="ds-hint danger">
              <IconAlert size={11} />
              <span>{error}</span>
            </div>
          )}

          <div className="ds-sec">
            <div className="ds-sec-head">
              <h4>开放数据源</h4>
              <span className="tiny muted">不需要授权，每轮真抓</span>
            </div>
            <div className="ds-table">
              {runs.length === 0 && <div className="ds-empty">还没有运行记录，跑一次抓取就有。</div>}
              {runs.map((r) => (
                <div key={r.id} className={`ds-row ${disabled.includes(r.id) ? 'is-off' : ''}`}>
                  <div className="ds-name">
                    <b>
                      {r.name}
                      {mode === 'server' && r.id !== 'platform-export' && (
                        <button
                          className={`ds-sw ${disabled.includes(r.id) ? 'off' : ''}`}
                          onClick={() => void toggleSource(r.id, r.name)}
                          title={disabled.includes(r.id) ? '点击重新启用' : '点击停用这个源'}
                        >
                          {disabled.includes(r.id) ? '已停用' : '启用中'}
                        </button>
                      )}
                    </b>
                    <span>{ACCESS_CN[r.access]} · {r.license}</span>
                  </div>
                  <div className={`ds-status ${r.status}`}>
                    {r.status === 'ok' ? <IconCheck size={10} /> : <IconAlert size={10} />}
                    {STATUS_CN[r.status] ?? r.status}
                  </div>
                  <div className="ds-nums">
                    <span>{r.items} 项</span>
                    <span>{r.requests} 请求</span>
                    <span>{(r.ms / 1000).toFixed(1)}s</span>
                  </div>
                  <div className="ds-note">{r.error ?? r.note}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="ds-sec">
            <div className="ds-sec-head">
              <h4>点评平台</h4>
              <span className="tiny muted">能拿评分的拿评分，拿不到的写清楚为什么</span>
            </div>
            <div className="ds-table">
              {PLATFORMS.filter((p) => p.access !== 'local').map((p) => {
                const g = gates.get(p.id);
                const status = g?.status ?? 'need_auth';
                return (
                  <div key={p.id} className="ds-row">
                    <div className="ds-name">
                      <b>
                        <span className="ds-dot" style={{ background: p.color }} />
                        {p.name}
                      </b>
                      <span>{ACCESS_CN[p.access]} · {p.gives === 'score' ? '评分/条数' : p.gives === 'score+text' ? '评分/正文' : '本机'}</span>
                    </div>
                    <div className={`ds-status ${status}`}>
                      {status === 'ok' ? <IconCheck size={10} /> : <IconAlert size={10} />}
                      {STATUS_CN[status] ?? status}
                      {g?.http ? ` ${g.http}` : ''}
                    </div>
                    <div className="ds-note">{g?.note ?? p.note}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="ds-sec">
            <div className="ds-sec-head">
              <h4>Key 配置</h4>
              <span className="tiny muted">存在服务端 server/.keys.json，不进页面、不进仓库</span>
            </div>
            <div className="ds-keys">
              <label>
                <span>高德 Web 服务 Key {keys.amap ? `· 已配置 ${keys.amap}` : '· 未配置'}</span>
                <input
                  value={amap}
                  onChange={(e) => setAmap(e.target.value)}
                  placeholder="粘贴 key，留空表示不改"
                  disabled={mode !== 'server'}
                />
              </label>
              <label>
                <span>百度地图服务端 AK {keys.baidu ? `· 已配置 ${keys.baidu}` : '· 未配置'}</span>
                <input
                  value={baidu}
                  onChange={(e) => setBaidu(e.target.value)}
                  placeholder="粘贴 ak，留空表示不改"
                  disabled={mode !== 'server'}
                />
              </label>
              <label>
                <span>智谱 GLM Key {keys.glm ? `· 已配置 ${keys.glm}` : '· 未配置'}</span>
                <input
                  value={glm}
                  onChange={(e) => setGlm(e.target.value)}
                  placeholder="形如 xxxxx.yyyyy，用于模型补全（按 token 计费）"
                  disabled={mode !== 'server'}
                />
              </label>
              <button
                className="btn btn-primary btn-sm"
                disabled={mode !== 'server' || (!amap.trim() && !baidu.trim() && !glm.trim())}
                onClick={async () => {
                  const ok = await onSaveKeys({ amap: amap.trim(), baidu: baidu.trim(), glm: glm.trim() });
                  if (ok) {
                    setAmap('');
                    setBaidu('');
                    setGlm('');
                    onToast('Key 已保存，下一轮抓取会用上');
                  } else {
                    onToast('保存失败：需要 npm run serve');
                  }
                }}
              >
                保存 Key
              </button>
              <button
                className="btn btn-sm"
                disabled={mode !== 'server' || testing}
                title="验证 Key 是否可用（只发几个 token，不消耗联网检索次数）"
                onClick={async () => {
                  setTesting(true);
                  try {
                    const r = await fetch('/api/glm/test').then((x) =>
                      x.json() as Promise<{ ok: boolean; model?: string; ms?: number; error?: string }>,
                    );
                    if (!r.ok) {
                      onToast(`智谱 Key 不可用：${r.error ?? '未知错误'}`);
                      return;
                    }
                    onToast(`智谱 Key 可用：${r.model ?? 'glm-4-flash'} · ${r.ms}ms · 按 token 计费`);
                  } catch {
                    onToast('测试请求失败，确认 npm run serve 在跑');
                  } finally {
                    setTesting(false);
                  }
                }}
              >
                {testing ? '测试中…' : '测试'}
              </button>
            </div>
            <p className="ds-fine">
              高德免费 Key：lbs.amap.com → 应用管理 → 新建应用 → 添加 Key →
              <b>服务平台选「Web 服务」，不要选「Web端(JS API)」</b>（后者只能在浏览器里用，服务端调不通）；
              域名白名单留空。配好之后园区地址、电话、营业时间、评分、实景图都能抓到。<br />
              智谱 Key：open.bigmodel.cn → API Keys。用于「先让模型想一遍、再整理」的字段补全，
              补上没官网也没地图数据的点位；<b>不联网、不消耗检索次数，只按 token 计费</b>。
              每个点位问两轮，两轮答案对不上的字段直接丢弃。
            </p>
          </div>

          <div className="ds-sec">
            <div className="ds-sec-head">
              <h4>运行日志</h4>
              <button className="btn btn-sm btn-ghost" onClick={copyLog} disabled={!report?.logs?.length}>
                <IconCopy size={11} /> 复制
              </button>
            </div>
            <pre className="ds-log">{(report?.logs ?? ['还没有日志，跑一次抓取。']).join('\n')}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}
