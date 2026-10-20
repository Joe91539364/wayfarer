import { useState } from 'react';
import type { Meta } from '../domain/schema';
import { INTEREST_CN } from '../domain/schema';
import { addDays } from '../domain/time';
import type { ExprCheck } from '../agent/understand';
import { IconAlert, IconArrow, IconCheck } from './icons';

interface Props {
  draft: Meta;
  missing: string[];
  packState: { status: 'idle' | 'loading' | 'ok' | 'fail'; name?: string; message?: string };
  exprWarn?: ExprCheck | null;
  onPatch: (patch: Partial<Meta>) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

const FIELD_CN: Record<string, string> = {
  destination: '目的地',
  origin: '出发地',
  start_date: '出发日期',
  days: '天数',
  budget: '预算',
  travelers: '人数',
};

const INTERESTS = Object.keys(INTEREST_CN);

/**
 * 需求确认卡。
 *
 * 这张卡的存在就是为了「不替用户决定」：
 *   出发地没说 → 空着并标红，不默认深圳；
 *   日期没说 → 显示推算值但标注「估算」，可以改；
 *   目的地不在内置城市里 → 明说要用高德现建，而不是让你从五个城市里挑。
 */
export default function RequirementsCard({ draft, missing, packState, exprWarn, onPatch, onConfirm, onCancel }: Props) {
  const [editing, setEditing] = useState<string | null>(null);
  const days = Math.max(
    1,
    Math.round((new Date(draft.end_date).getTime() - new Date(draft.start_date).getTime()) / 86400000) + 1,
  );

  const setDays = (n: number) => {
    // 别用 toISOString：东八区里本地午夜会被 UTC 倒退一天
    onPatch({ end_date: addDays(draft.start_date, Math.max(1, n) - 1) });
  };

  const toggleInterest = (t: string) => {
    const has = draft.interests.includes(t);
    onPatch({ interests: has ? draft.interests.filter((x) => x !== t) : [...draft.interests, t] });
  };

  const cell = (key: string, label: string, value: string, editor: React.ReactNode, warn = false) => (
    <div className={`req-cell ${warn ? 'is-missing' : ''} ${editing === key ? 'is-editing' : ''}`}>
      <span className="req-label">
        {label}
        {warn && <em>待补</em>}
      </span>
      {editing === key ? (
        <div className="req-editor" onBlur={() => setEditing(null)}>
          {editor}
        </div>
      ) : (
        <button className="req-value" onClick={() => setEditing(key)} title="点一下改">
          {value}
        </button>
      )}
    </div>
  );

  return (
    <div className="req-card">
      <div className="req-head">
        <div>
          <div className="req-title">我理解成这样，对吗？</div>
          <div className="req-sub">
            模型只负责理解，时间和距离全部由程序计算。任何一项不对就点它改。
          </div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onCancel}>
          重说一遍
        </button>
      </div>

      <div className="req-grid">
        {cell(
          'destination',
          '目的地',
          draft.destination || '未识别',
          <input
            autoFocus
            defaultValue={draft.destination}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onPatch({ destination: (e.target as HTMLInputElement).value.trim() });
                setEditing(null);
              }
            }}
          />,
          missing.includes('destination'),
        )}

        {cell(
          'origin',
          '出发地',
          draft.origin_city || '未说',
          <input
            autoFocus
            defaultValue={draft.origin_city}
            placeholder="比如 宿迁"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onPatch({ origin_city: (e.target as HTMLInputElement).value.trim() });
                setEditing(null);
              }
            }}
          />,
          missing.includes('origin'),
        )}

        {cell(
          'start_date',
          '出发日期',
          `${draft.start_date}${missing.includes('start_date') ? '（推算）' : ''}`,
          <input
            type="date"
            defaultValue={draft.start_date}
            onChange={(e) => {
              const v = e.target.value;
              if (!v) return;
              onPatch({ start_date: v, end_date: addDays(v, days - 1) });
              setEditing(null);
            }}
          />,
          missing.includes('start_date'),
        )}

        {cell(
          'days',
          '天数',
          `${days} 天`,
          <input
            type="number"
            min={1}
            max={15}
            defaultValue={days}
            onChange={(e) => {
              setDays(Number(e.target.value));
              setEditing(null);
            }}
          />,
          missing.includes('days'),
        )}

        {cell(
          'travelers',
          '人数',
          `${draft.travelers.adults} 人`,
          <input
            type="number"
            min={1}
            max={12}
            defaultValue={draft.travelers.adults}
            onChange={(e) => {
              onPatch({ travelers: { adults: Math.max(1, Number(e.target.value)), children: 0 } });
              setEditing(null);
            }}
          />,
        )}

        {cell(
          'budget',
          '预算',
          `¥${draft.budget.amount.toLocaleString('zh-CN')}`,
          <input
            type="number"
            step={500}
            defaultValue={draft.budget.amount}
            onChange={(e) => {
              onPatch({ budget: { amount: Number(e.target.value), currency: 'CNY', includes_flights: false } });
              setEditing(null);
            }}
          />,
          missing.includes('budget'),
        )}
      </div>

      {exprWarn?.checked && exprWarn.affected && exprWarn.issues.length > 0 && (
        <div className="req-expr">
          <span className="req-expr-tag">
            <IconAlert size={11} /> 表达推算
          </span>
          {exprWarn.issues.map((it, i) => (
            <div key={i} className="req-expr-item">
              {it.quote && <code>「{it.quote}」</code>}
              <span>{it.problem}</span>
              {it.suggestion && <em>建议：{it.suggestion}</em>}
            </div>
          ))}
          <span className="tiny muted">大模型只提醒，不替你改 —— 不对就点上面的格子改。</span>
        </div>
      )}

      <div className="req-interests">
        <span className="req-label">想玩什么</span>
        <div className="req-chips">
          {INTERESTS.map((t) => (
            <button
              key={t}
              className={`chip ${draft.interests.includes(t) ? 'on' : ''}`}
              onClick={() => toggleInterest(t)}
            >
              {INTEREST_CN[t as keyof typeof INTEREST_CN] ?? t}
            </button>
          ))}
        </div>
      </div>

      {packState.status !== 'idle' && (
        <div className={`req-pack ${packState.status}`}>
          {packState.status === 'loading' && (
            <>
              <IconArrow size={11} /> 正在用高德现场抓「{packState.name}」的景点和餐馆…（约 5 秒，只抓一次）
            </>
          )}
          {packState.status === 'ok' && (
            <>
              <IconCheck size={11} /> 已为「{packState.name}」建好城市包：{packState.message}
            </>
          )}
          {packState.status === 'fail' && (
            <>
              <IconAlert size={11} /> {packState.message}
            </>
          )}
        </div>
      )}

      <div className="req-foot">
        <div className="req-hint">
          {missing.length > 0
            ? `还有 ${missing.map((m) => FIELD_CN[m] ?? m).join('、')} 没确定 —— 点上面那格改，或者直接开始（标「待补」的会用推算值）`
            : '都齐了，出发。'}
        </div>
        <button className="btn btn-accent" onClick={onConfirm} disabled={packState.status === 'loading'}>
          确认，开始规划 <IconArrow size={13} />
        </button>
      </div>
    </div>
  );
}
