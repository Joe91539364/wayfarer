import { useEffect, useMemo, useRef, useState } from 'react';
import type { Candidate, Itinerary } from '../domain/schema';
import { CATEGORY_CN } from '../domain/schema';
import { cnMoney } from '../domain/summary';
import { totalOf, type WhatIfKind, type WhatIfResult } from '../agent/whatif';
import CertificateCard from './Certificate';
import MapView from './MapView';
import { hotelsByCity } from '../data/hotels';
import FoodPanel from './FoodPanel';
import { hotelLive } from '../domain/live';
import { IconAlert, IconCheck, IconPlus, IconSpark } from './icons';

interface Props {
  itinerary: Itinerary;
  activeDay: number;
  clock: Date;
  onOpenHotel: (dayIndex: number) => void;
  onSelectDay: (n: number) => void;
  onAddCandidate: (c: Candidate) => void;
  onWhatIf: (kind: WhatIfKind, payload?: { budget?: number; dayIndex?: number }) => void;
  onApply: () => void;
  onDiscard: () => void;
  whatIfResult: WhatIfResult | null;
  busy: boolean;
}

const WHATIF_LABEL: Record<WhatIfKind, { title: string; sub: string }> = {
  budget: { title: '砍预算', sub: '贪心删减 + 重校验' },
  rain: { title: '第 2 天暴雨', sub: '户外换室内' },
  pace: { title: '带老人 / 走不动', sub: '节奏降为轻松' },
  halfday: { title: '每天只玩半天', sub: '只保留核心两点' },
};

function suggestedBudget(total: number): string {
  return String(Math.max(500, Math.round((total * 0.6) / 100) * 100));
}

export default function RightRail(props: Props) {
  const { itinerary, activeDay, clock, onOpenHotel, onSelectDay, onAddCandidate, onWhatIf, onApply, onDiscard, whatIfResult, busy } = props;
  const [poolTab, setPoolTab] = useState<'sight' | 'food'>('sight');
  const [budgetDraft, setBudgetDraft] = useState(() => suggestedBudget(totalOf(itinerary)));
  const diffRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setBudgetDraft(suggestedBudget(totalOf(itinerary)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itinerary.id, itinerary.version]);

  useEffect(() => {
    if (!whatIfResult) return;
    diffRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [whatIfResult]);

  const pool = useMemo(() => {
    const isFood = (c: Candidate) => c.category === 'restaurant' || c.category === 'cafe';
    return itinerary.unscheduled.filter((c) => (poolTab === 'sight' ? !isFood(c) : isFood(c))).slice(0, 40);
  }, [itinerary.unscheduled, poolTab]);

  const activeDayData = itinerary.days.find((d) => d.day_index === activeDay) ?? itinerary.days[0];
  const hotelSeed = hotelsByCity(itinerary.meta.city_code).find((h) => h.name === activeDayData?.lodging?.name);
  const hotelNow = hotelSeed ? hotelLive(hotelSeed.id, hotelSeed.price, hotelSeed.roomsLeft, clock) : null;
  const total = totalOf(itinerary);
  const budget = itinerary.meta.budget.amount;
  const ratio = Math.min(1, total / Math.max(1, budget));
  const breakdown = itinerary.feasibility?.evidence.cost_breakdown ?? {};
  const TYPE_CN: Record<string, string> = { lodging: '住宿', meal: '餐饮', ticket: '门票', transit: '交通', other: '其他' };

  return (
    <div>
      {itinerary.feasibility && <CertificateCard certificate={itinerary.feasibility} />}

      <div className="panel">
        <div className="panel-head">
          <div className="panel-title">地图</div>
          <span className="tiny muted">按天高亮</span>
        </div>
        <div className="panel-body tight">
          <MapView itinerary={itinerary} activeDay={activeDay} clock={clock} onSelectDay={onSelectDay} />
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <div className="panel-title">预算</div>
          <span className="tiny muted">{total > budget ? '已超支' : `余 ${cnMoney(budget - total)}`}</span>
        </div>
        <div className="panel-body">
          <div className="budget-total">
            <b>{cnMoney(total)}</b>
            <span>/ {cnMoney(budget)}</span>
          </div>
          <div className={`bar ${total > budget ? 'over' : ''}`}>
            <i style={{ width: `${ratio * 100}%` }} />
          </div>
          <div className="breakdown">
            {Object.entries(breakdown)
              .sort((a, b) => b[1] - a[1])
              .map(([k, v]) => (
                <span key={k}>
                  {TYPE_CN[k] ?? k} {cnMoney(v)}
                </span>
              ))}
          </div>
          <div className="tiny muted" style={{ marginTop: 8 }}>
            住宿 {cnMoney((itinerary.days[0]?.lodging?.cost.amount ?? 0) * itinerary.days.length)} · 已含每日房费
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <div className="panel-title">住宿</div>
          <button className="btn btn-sm" onClick={() => onOpenHotel(activeDay)}>
            查看 / 换
          </button>
        </div>
        <div className="panel-body">
          <div className="hotel-mini">
            <div>
              <div className="hotel-mini-name">{activeDayData?.lodging?.name ?? '未设置住宿'}</div>
              <div className="tiny muted">
                {hotelSeed ? `${hotelSeed.area} · ★ ${hotelSeed.rating.toFixed(1)} · ${hotelSeed.tags[0] ?? ''}` : '第 ' + activeDay + ' 天'}
              </div>
            </div>
            <div className="hotel-mini-price">
              <b>{cnMoney(hotelNow?.priceNow ?? activeDayData?.lodging?.cost.amount ?? 0)}</b>
              <span>/ 晚</span>
            </div>
          </div>
          <div className="hotel-mini-live">
            <span className={(hotelNow?.roomsLeft ?? 9) <= 2 ? 'warn-text' : ''}>
              {hotelNow ? (hotelNow.roomsLeft > 0 ? `今日剩余 ${hotelNow.roomsLeft} 间` : '今日已满') : '房态未知'}
            </span>
            <span className="tiny muted">模拟实时</span>
          </div>
        </div>
      </div>

      <FoodPanel itinerary={itinerary} activeDay={activeDay} onAdd={onAddCandidate} />

      <div className="panel">
        <div className="panel-head">
          <div className="panel-title">候选池</div>
          <span className="tiny muted">{itinerary.unscheduled.length} 个备选</span>
        </div>
        <div className="tabs" style={{ marginBottom: 8 }}>
          <button className={`tab ${poolTab === 'sight' ? 'active' : ''}`} onClick={() => setPoolTab('sight')}>
            景点
          </button>
          <button className={`tab ${poolTab === 'food' ? 'active' : ''}`} onClick={() => setPoolTab('food')}>
            餐饮
          </button>
        </div>
        <div className="panel-body tight">
          <div className="pool">
            {pool.length === 0 && <div className="tiny muted" style={{ padding: 8 }}>候选池已空</div>}
            {pool.map((c) => (
              <div className="pool-card" key={c.poi_id}>
                <div>
                  <div className="pool-name">{c.name}</div>
                  <div className="pool-reason">
                    {CATEGORY_CN[c.category as never] ?? c.category} · {c.reason}
                  </div>
                </div>
                <button className="pool-add" title={`加入第 ${activeDay} 天`} onClick={() => onAddCandidate(c)}>
                  <IconPlus size={13} />
                </button>
              </div>
            ))}
          </div>
          <div className="tiny muted" style={{ marginTop: 6 }}>
            点 + 会插到第 {activeDay} 天，并立即重跑时间与校验
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <div className="panel-title">
            <IconSpark size={12} /> What-if 模拟器
          </div>
          <span className="tiny muted">增量重算</span>
        </div>
        <div className="panel-body">
          <div className="whatif-grid">
            {(Object.keys(WHATIF_LABEL) as WhatIfKind[]).map((k) => (
              <button
                key={k}
                className="whatif-btn"
                disabled={busy}
                onClick={() => {
                  if (k === 'budget') {
                    const n = Number(budgetDraft);
                    onWhatIf('budget', { budget: Number.isFinite(n) && n > 0 ? n : 4000 });
                  } else if (k === 'rain') {
                    onWhatIf('rain', { dayIndex: Math.min(2, itinerary.days.length) });
                  } else {
                    onWhatIf(k);
                  }
                }}
              >
                <b>{k === 'budget' ? `砍预算到 ¥${budgetDraft}` : WHATIF_LABEL[k].title}</b>
                <span>{WHATIF_LABEL[k].sub}</span>
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 8, alignItems: 'center' }}>
            <span className="tiny muted">预算目标</span>
            <input
              value={budgetDraft}
              onChange={(e) => setBudgetDraft(e.target.value.replace(/[^\d]/g, ''))}
              style={{
                width: 78,
                border: '1px solid var(--line)',
                borderRadius: 7,
                padding: '4px 7px',
                fontSize: 11.5,
                fontFamily: 'var(--font-mono)',
                background: '#fff',
                outline: 'none',
              }}
            />
            <span className="tiny muted">元 · 用于「预算」推演</span>
          </div>

          {whatIfResult && (
            <div className="diff-list" ref={diffRef}>
              <div className="diff-head">
                <IconSpark size={12} />
                <span>{whatIfResult.headline}</span>
                <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 3, color: whatIfResult.satisfied ? 'var(--green)' : 'var(--red)' }}>
                  {whatIfResult.satisfied ? <IconCheck size={11} /> : <IconAlert size={11} />}
                  {whatIfResult.satisfied ? '约束满足' : '仍有误差'}
                </span>
              </div>
              <div className="diff-body">
                {whatIfResult.diff.map((d, i) => (
                  <div className={`diff-row ${d.type}`} key={i}>
                    <span>{d.type === 'same' ? '·' : d.type === 'added' ? '+' : d.type === 'removed' ? '−' : '~'}</span>
                    <span className="diff-day">D{d.day_index}</span>
                    <span>{d.text}</span>
                    <span className="diff-detail">{d.detail ?? ''}</span>
                  </div>
                ))}
              </div>
              <div className="diff-actions">
                <button className="btn btn-accent btn-sm" onClick={onApply}>
                  采用这个分支
                </button>
                <button className="btn btn-sm" onClick={onDiscard}>
                  丢弃
                </button>
                <span className="tiny muted" style={{ marginLeft: 'auto', alignSelf: 'center' }}>
                  {whatIfResult.changed} 处变化
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
