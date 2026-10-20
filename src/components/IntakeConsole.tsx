import type { Itinerary } from '../domain/schema';
import { INTEREST_CN, PACES } from '../domain/schema';
import { formatDateShort } from '../domain/time';
import { cnMoney } from '../domain/summary';
import type { StageEvent } from '../agent/orchestrator';
import type { RepairResult } from '../agent/repair';
import { IconCheck, IconRefresh, IconSpark } from './icons';

const STAGE_META: { key: string; label: string; code: string }[] = [
  { key: 'intake', label: '需求澄清', code: 'INTAKE' },
  { key: 'research', label: '检索事实', code: 'RESEARCH' },
  { key: 'outline', label: '分天分区', code: 'OUTLINE' },
  { key: 'schedule', label: '累加时间', code: 'SCHEDULE' },
  { key: 'verify', label: '可行性校验', code: 'VERIFY' },
  { key: 'repair', label: '定向修复', code: 'REPAIR' },
  { key: 'render', label: '渲染视图', code: 'RENDER' },
];

interface Props {
  request: string;
  stages: StageEvent[];
  itinerary: Itinerary | null;
  repair: RepairResult | null;
  running: boolean;
  /** 传入即可编辑需求并就地重跑；不传则维持旧的只读展示 */
  editable?: boolean;
  dirty?: boolean;
  onRequestChange?: (v: string) => void;
  onRerun?: () => void;
}

export default function IntakeConsole({
  request,
  stages,
  itinerary,
  repair,
  running,
  editable = false,
  dirty = false,
  onRequestChange,
  onRerun,
}: Props) {
  const statusOf = (key: string) => {
    const done = stages.some((s) => s.stage === key && s.status === 'done');
    const started = stages.some((s) => s.stage === key && s.status === 'start');
    if (done) return 'done';
    if (started) return 'running';
    return 'pending';
  };
  const msgOf = (key: string) => {
    const done = [...stages].reverse().find((s) => s.stage === key && s.status === 'done');
    if (done) return done;
    const started = [...stages].reverse().find((s) => s.stage === key);
    return started;
  };

  return (
    <div>
      <div className="panel">
        <div className="request-card">
          <div className="who">
            <span className="avatar">你</span> 需求
            {editable && dirty && <span className="chip accent" style={{ marginLeft: 'auto' }}>已改动</span>}
          </div>
          {editable && onRequestChange ? (
            <>
              <textarea
                id="req-input"
                className="req-edit"
                value={request}
                rows={2}
                spellCheck={false}
                placeholder="直接改这句话，比如换个城市、加两天、改人数 —— 改完点下面的按钮"
                onChange={(e) => onRequestChange(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') onRerun?.();
                }}
              />
              <div className="req-actions">
                <span className="tiny muted">{dirty ? '改完就重跑，不用新建' : '随时改，改完点右边'}</span>
                <button
                  className="btn btn-accent btn-sm"
                  disabled={running || !request.trim()}
                  onClick={() => onRerun?.()}
                  title="按当前需求重新规划（Ctrl+Enter）"
                >
                  <IconSpark size={12} /> 重新规划
                </button>
              </div>
            </>
          ) : (
            <p>{request}</p>
          )}
        </div>
        <div className="panel-head" style={{ borderTop: '1px solid var(--line)' }}>
          <div className="panel-title">
            <IconRefresh size={12} /> Agent 运行轨迹
          </div>
          <span className="tiny muted mono">{running ? 'running' : itinerary ? 'done' : 'idle'}</span>
        </div>
        <div className="stages">
          {STAGE_META.map((s) => {
            const status = statusOf(s.key);
            const ev = msgOf(s.key);
            return (
              <div className={`stage ${status}`} key={s.key}>
                <div className="stage-dot">{status === 'done' ? <IconCheck size={9} /> : null}</div>
                <div>
                  <div className="stage-name">
                    {s.label}
                    <code>{s.code}</code>
                  </div>
                  {ev && <div className="stage-msg">{ev.message}</div>}
                  {ev?.detail && <div className="stage-detail">{ev.detail}</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {itinerary && (
        <>
          <div className="panel">
            <div className="panel-head">
              <div className="panel-title">行程参数</div>
              <span className="tiny muted">结构化 meta</span>
            </div>
            <div className="meta-grid">
              <div className="meta-cell">
                <span>目的地</span>
                <b>{itinerary.meta.destination}</b>
              </div>
              <div className="meta-cell">
                <span>日期</span>
                <b>
                  {formatDateShort(itinerary.meta.start_date)}–{formatDateShort(itinerary.meta.end_date)}
                </b>
              </div>
              <div className="meta-cell">
                <span>人数</span>
                <b>{itinerary.meta.travelers.adults} 人</b>
              </div>
              <div className="meta-cell">
                <span>预算</span>
                <b>{cnMoney(itinerary.meta.budget.amount)}</b>
              </div>
              <div className="meta-cell">
                <span>节奏</span>
                <b>{PACES[itinerary.meta.pace].label}</b>
              </div>
              <div className="meta-cell">
                <span>天数</span>
                <b>{itinerary.days.length} 天</b>
              </div>
            </div>
            <div className="chips">
              {itinerary.meta.interests.map((i) => (
                <span className="chip accent" key={i}>
                  {(INTEREST_CN as Record<string, string>)[i] ?? i}
                </span>
              ))}
              {itinerary.meta.must_visit.map((m) => (
                <span className="chip teal" key={m}>
                  必去 · {m}
                </span>
              ))}
              {itinerary.meta.mobility === 'limited' && <span className="chip teal">行动不便</span>}
            </div>
          </div>

          {repair && repair.rounds.length > 0 && (
            <div className="panel">
              <div className="panel-head">
                <div className="panel-title">修复记录</div>
                <span className="tiny muted">
                  {repair.stopped === 'clean' ? '已收敛' : repair.stopped === 'no_progress' ? '无改善即停' : '达轮数上限'}
                </span>
              </div>
              <div className="panel-body" style={{ display: 'grid', gap: 9 }}>
                {repair.rounds.map((r) => (
                  <div key={r.round} style={{ fontSize: 11.5 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--ink-2)' }}>
                      <span>第 {r.round} 轮</span>
                      <span className="mono" style={{ color: r.errorsAfter < r.errorsBefore ? 'var(--green)' : 'var(--red)' }}>
                        {r.errorsBefore} → {r.errorsAfter} error
                      </span>
                    </div>
                    <div style={{ display: 'grid', gap: 2, marginTop: 4 }}>
                      {r.actions.slice(0, 4).map((a, i) => (
                        <div key={i} className="tiny muted">
                          · {a.description}
                        </div>
                      ))}
                      {r.actions.length > 4 && <div className="tiny muted">· 还有 {r.actions.length - 4} 条</div>}
                    </div>
                  </div>
                ))}
                {repair.unresolved.length > 0 && (
                  <div className="tiny" style={{ color: 'var(--red)' }}>
                    仍有 {repair.unresolved.length} 个 error 无法自动解决，已保留在提示里
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="panel">
            <div className="panel-head">
              <div className="panel-title">显式假设</div>
              <span className="tiny muted">{itinerary.assumptions.length} 条</span>
            </div>
            <div className="assumption-list">
              {itinerary.assumptions.map((a, i) => (
                <div className="assumption" key={i}>
                  <i>{String(i + 1).padStart(2, '0')}</i>
                  <span>{a}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
