import { useEffect, useMemo, useRef, useState } from 'react';
import type { Candidate, Itinerary } from '../domain/schema';
import { CATEGORY_CN } from '../domain/schema';
import type { DaySlot } from '../domain/gaps';
import { searchPois, type PoiSeed } from '../data/pois';
import { haversine } from '../domain/geo';
import { cnMoney } from '../domain/summary';
import { IconPlus, IconSearch, IconSpark, IconX } from './icons';

interface Props {
  itinerary: Itinerary;
  dayIndex: number;
  slot?: DaySlot | null;
  onClose: () => void;
  onAdd: (candidate: Candidate, dayIndex: number) => void;
}

/** PoiSeed → 候选卡：插入后走的还是 insertCandidate 那条路 */
function toCandidate(p: PoiSeed, why: string): Candidate {
  return {
    poi_id: p.poi_id,
    name: p.name,
    lat: p.lat,
    lng: p.lng,
    category: p.category,
    reason: why,
    suggested_duration_min: p.duration_min,
    cost: { amount: p.price, currency: 'CNY', type: /餐厅|咖啡/.test(CATEGORY_CN[p.category] ?? '') ? 'meal' : 'ticket' },
    indoor: p.indoor,
    interest_tags: p.tags,
    rating: p.rating,
    opening_hours: {
      open: p.open,
      close: p.close,
      closed_days: p.closed_days ?? [],
      confidence: p.hours_confidence,
    },
    booking_required: p.booking_required,
  } as Candidate;
}

export default function AddPlaceModal({ itinerary, dayIndex, slot, onClose, onAdd }: Props) {
  const [kw, setKw] = useState('');
  const [day, setDay] = useState(dayIndex);
  const [remote, setRemote] = useState<PoiSeed[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const scheduled = useMemo(
    () => new Set(itinerary.days.flatMap((d) => d.items.map((i) => i.poi_id)).filter(Boolean) as string[]),
    [itinerary],
  );
  const target = itinerary.days.find((d) => d.day_index === day) ?? itinerary.days[0];
  const anchor = (() => {
    const acts = target?.items.filter((i) => i.type !== 'transit' && i.lat != null) ?? [];
    if (acts.length > 0) return { lat: acts[0].lat as number, lng: acts[0].lng as number };
    return target?.base_area ? { lat: target.base_area.lat, lng: target.base_area.lng } : null;
  })();

  const local = useMemo(() => {
    const hit = searchPois(itinerary.meta.city_code, kw, 40, anchor ?? undefined);
    // 已经排进去的不再列；高德现搜出来的（AM- 但不在池里）单独排在前面
    return hit.filter((p) => !scheduled.has(p.poi_id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itinerary.meta.city_code, kw, scheduled, anchor?.lat, anchor?.lng]);

  const merged = useMemo(() => {
    const seen = new Set(local.map((p) => p.name));
    const extra = remote.filter((p) => !seen.has(p.name) && !scheduled.has(p.poi_id));
    return [...extra, ...local];
  }, [local, remote, scheduled]);

  async function searchRemote() {
    if (!kw.trim()) return;
    setBusy(true);
    setErr('');
    try {
      const res = await fetch(
        `/api/place-search?kw=${encodeURIComponent(kw.trim())}&city=${encodeURIComponent(itinerary.meta.destination)}`,
        { cache: 'no-store' },
      );
      const data = (await res.json()) as { pois?: PoiSeed[]; error?: string };
      if (!res.ok || data.error) {
        setErr(data.error ?? `搜索失败（HTTP ${res.status}）`);
        return;
      }
      setRemote(data.pois ?? []);
      if ((data.pois ?? []).length === 0) setErr(`高德也没找到「${kw.trim()}」，换个词试试`);
    } catch {
      setErr('连不上本地服务（127.0.0.1:8787），无法现搜');
    } finally {
      setBusy(false);
    }
  }

  const km = (p: PoiSeed) => (anchor ? haversine(anchor, { lat: p.lat, lng: p.lng }) : null);

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal add-place-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <h3>自己加个地方</h3>
            <div className="tiny muted" style={{ marginTop: 2 }}>
              {slot ? `第 ${slot.dayIndex} 天 ${slot.label} —— 补在这里正好` : '从城市里搜一个点，插进去后时间轴自动重排'}
            </div>
          </div>
          <button className="icon-btn" onClick={onClose}>
            <IconX size={16} />
          </button>
        </div>

        <div className="modal-body">
          <div className="add-search">
            <IconSearch size={14} />
            <input
              ref={inputRef}
              value={kw}
              placeholder="搜地名 / 店名：磁器口、洪崖洞、火锅、美术馆…"
              onChange={(e) => setKw(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && merged.length === 0) void searchRemote();
              }}
            />
            <button className="btn btn-sm" onClick={searchRemote} disabled={busy || !kw.trim()}>
              {busy ? '搜索中…' : '到高德搜'}
            </button>
          </div>

          <div className="add-day">
            <span className="tiny muted">加到</span>
            <div className="add-day-chips">
              {itinerary.days.map((d) => (
                <button
                  key={d.day_index}
                  className={`chip ${d.day_index === day ? 'on' : ''}`}
                  onClick={() => setDay(d.day_index)}
                >
                  第 {d.day_index} 天
                </button>
              ))}
            </div>
            <span className="tiny muted">{target?.base_area?.name ?? ''}</span>
          </div>

          {err && <div className="add-err">{err}</div>}

          <div className="add-list">
            {merged.length === 0 && !busy && (
              <div className="add-empty">
                <IconSpark size={13} />
                <span>
                  {kw.trim()
                    ? `城市数据里没有「${kw.trim()}」，点「到高德搜」现场查一个`
                    : '输入关键字开始搜；留空则按评分列出这座城市值得去的地方'}
                </span>
              </div>
            )}
            {merged.map((p) => {
              const d = km(p);
              return (
                <button
                  key={p.poi_id}
                  className="add-row"
                  onClick={() =>
                    onAdd(toCandidate(p, p.blurb || '你自己加的'), day)
                  }
                >
                  <div className="add-row-main">
                    <div className="add-name">
                      {p.name}
                      {remote.some((r) => r.poi_id === p.poi_id) && <span className="add-tag">高德现搜</span>}
                    </div>
                    <div className="add-sub">
                      {CATEGORY_CN[p.category] ?? p.category} · {p.duration_min} 分钟 ·{' '}
                      {p.price > 0 ? cnMoney(p.price) : '免费'}
                      {p.rating > 0 && ` · ★ ${p.rating.toFixed(1)}`}
                      {d != null && ` · 距首站 ${d.toFixed(1)}km`}
                      {p.open && p.close ? ` · ${p.open}-${p.close}` : ''}
                    </div>
                  </div>
                  <span className="add-plus">
                    <IconPlus size={14} />
                  </span>
                </button>
              );
            })}
          </div>

          <div className="tiny muted" style={{ marginTop: 8 }}>
            点一下就直接插进第 {day} 天，程序会重算通勤与时间；不合适再拖回去或删掉。
          </div>
        </div>
      </div>
    </div>
  );
}
