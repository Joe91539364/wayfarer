import { useEffect, useMemo, useRef, useState } from 'react';
import type { Itinerary, ItineraryItem } from '../domain/schema';
import { CATEGORY_CN, TRANSIT_CN } from '../domain/schema';
import { POIS } from '../data/pois';
import { crowdColor, liveStatus } from '../domain/live';
import { cnMoney } from '../domain/summary';
import { formatDateCN, weekdayLabel } from '../domain/time';
import { STEP_SUGGESTIONS } from '../agent/replanStep';
import { IconAlert, IconArrow, IconCar, IconCheck, IconLock, IconPin, IconSpark } from './icons';
import CommentSection from './CommentSection';
import SceneryArt from './SceneryArt';
import { dayColor } from '../domain/palette';
import { BOOKING_CN, STATUS_CN, type OfficialInfo } from '../data/official';
import type { Catalog, PlatformGate } from '../data/catalog';
import { PLATFORM_MAP } from '../data/catalog';
import ReviewBoard from './ReviewBoard';
import { formatAgo, formatCountdown } from '../hooks/useOfficialFeed';

interface Props {
  itinerary: Itinerary;
  itemId: string;
  clock: Date;
  onClose: () => void;
  onSave: (itemId: string, patch: { duration_min?: number; notes?: string; locked?: boolean }) => void;
  onAsk: (itemId: string, text: string) => { reply: string; changed: boolean; itemId?: string | null };
  onOpenItem: (itemId: string) => void;
  onShowOnMap: (dayIndex: number) => void;
  onTaxi: (itemId: string) => void;
  catalog: Catalog;
  gates: PlatformGate[];
  official?: {
    items: Record<string, OfficialInfo>;
    mode: 'live' | 'cached' | 'offline';
    lastAt: number;
    nextIn: number;
    refreshing: boolean;
    onRefresh: () => void;
  };
}

function Stars({ value }: { value: number }) {
  return (
    <span className="stars">
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={`star ${i <= Math.round(value) ? 'on' : ''}`}>
          ★
        </span>
      ))}
    </span>
  );
}

/**
 * 静态地图快照：按真实坐标出图（服务端 /api/staticmap 代理，Key 不落前端）。
 * 加载失败（没 Key / 离线）就退回程序化示意图，保证格子永远是满的。
 */
function MapShot({
  lng,
  lat,
  zoom,
  w,
  h,
  rounded = 0,
  fallbackSeed,
  fallbackCategory,
  name = '',
}: {
  lng: number;
  lat: number;
  zoom: number;
  w: number;
  h: number;
  rounded?: number;
  fallbackSeed?: string;
  fallbackCategory?: string | null;
  name?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <SceneryArt
        seed={fallbackSeed ?? name}
        category={fallbackCategory}
        name={name}
        height={h}
        rounded={rounded}
      />
    );
  }
  return (
    <img
      className="map-shot"
      style={{ borderRadius: rounded }}
      src={`/api/staticmap?lng=${lng}&lat=${lat}&zoom=${zoom}&w=${w}&h=${h}`}
      alt={`${name || '点位'} 地图实景`}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

export default function PoiDetail({
  itinerary,
  itemId,
  clock,
  onClose,
  onSave,
  onAsk,
  onOpenItem,
  onShowOnMap,
  onTaxi,
  catalog,
  gates,
  official,
}: Props) {
  const found = useMemo(() => {
    for (const day of itinerary.days) {
      const idx = day.items.findIndex((i) => i.id === itemId);
      if (idx >= 0) return { day, item: day.items[idx], items: day.items.filter((x) => x.type !== 'transit') };
    }
    return null;
  }, [itinerary, itemId]);

  const [draftDuration, setDraftDuration] = useState(found?.item.duration_min ?? 60);
  const [draftNotes, setDraftNotes] = useState(found?.item.notes ?? '');
  const [ask, setAsk] = useState('');
  const [reply, setReply] = useState<{ text: string; changed: boolean } | null>(null);
  const [saved, setSaved] = useState(false);
  const lastItemId = useRef(itemId);
  const fromAsk = useRef(false);

  // 换站（比如刚把这一项替换掉）时只重置草稿，保留 Agent 的回复
  useEffect(() => {
    if (lastItemId.current === itemId) return;
    lastItemId.current = itemId;
    setDraftDuration(found?.item.duration_min ?? 60);
    setDraftNotes(found?.item.notes ?? '');
    setSaved(false);
    if (!fromAsk.current) setReply(null);
    fromAsk.current = false;
  }, [itemId, found]);

  if (!found) return null;
  const { day, item, items } = found;
  const seed = POIS.find((p) => p.poi_id === item.poi_id);
  const hasCoords = seed != null && Number.isFinite(seed.lat) && Number.isFinite(seed.lng);
  const fact = item.poi_id ? catalog.pois[item.poi_id] : undefined;
  const heroPhoto = fact?.photos?.[0];
  const SRC_CN: Record<string, string> = {
    gov: '景区官网',
    amap: '高德',
    baidu: '百度',
    glm: '智谱 GLM·模型记忆',
    seed: '内置数据集',
    'seed-verified': '内置·已核实',
    'platform-export': '导入',
  };
  const srcName = (id?: string) => (id ? (SRC_CN[id] ?? PLATFORM_MAP[id]?.name ?? id) : '');
  const srcChip = (src?: string, url?: string) => {
    if (!src) return null;
    const label = srcName(src);
    return url ? (
      <a className="fact-src link" href={url} target="_blank" rel="noreferrer" title={url}>
        {label} ↗
      </a>
    ) : (
      <em className="fact-src">{label}</em>
    );
  };
  const factRows = [
    { label: '地址', fact: fact?.address },
    { label: '电话', fact: fact?.phone },
    { label: '官网', fact: fact?.website },
    { label: '来源评分', fact: fact?.rating },
  ].filter((r) => r.fact);
  const live = liveStatus(item.poi_id ?? item.name, item.opening_hours, item.cost.amount, clock);
  const officialInfo = item.poi_id ? official?.items[item.poi_id] : undefined;
  const warnings = itinerary.warnings.filter((w) => w.item_ids.includes(item.id));
  const indexInDay = items.findIndex((i) => i.id === item.id);
  const prev = items[indexInDay - 1];
  const next = items[indexInDay + 1];
  const transitIn = day.items[day.items.findIndex((i) => i.id === item.id) - 1];
  const accent = dayColor(day.day_index);

  function send(text: string) {
    const t = text.trim();
    if (!t) return;
    const res = onAsk(item.id, t);
    setReply({ text: res.reply, changed: res.changed });
    setAsk('');
    if (res.changed) {
      if (!res.itemId) {
        window.setTimeout(onClose, 900);
        return;
      }
      if (res.itemId !== item.id) {
        fromAsk.current = true;
        onOpenItem(res.itemId);
      }
    }
  }

  return (
    <div className="detail">
      <header className="detail-top">
        <button className="btn btn-ghost" onClick={onClose}>
          ← 返回行程
        </button>
        <div className="detail-top-mid">
          <span className="chip" style={{ background: accent + '18', color: accent }}>
            第 {day.day_index} 天 · {formatDateCN(day.date)} {weekdayLabel(day.date)}
          </span>
          <span className="tiny muted">
            {item.start_time}–{item.end_time} · 第 {indexInDay + 1}/{items.length} 站
          </span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn btn-sm" onClick={() => onTaxi(item.id)}>
            <IconCar size={12} /> 打车
          </button>
          <button className="btn btn-sm" onClick={() => onShowOnMap(day.day_index)}>
            <IconPin size={12} /> 定位
          </button>
        </div>
      </header>

      <div className="detail-hero">
        <div className="hero-art">
          {heroPhoto ? (
            <div className="hero-photo">
              <img src={heroPhoto.url} alt={item.name} loading="lazy" referrerPolicy="no-referrer" />
              <span className="art-chip">
                实景图 · {heroPhoto.credit ?? srcName(heroPhoto.src)}
              </span>
            </div>
          ) : hasCoords ? (
            <>
              <div className="hero-photo">
                <MapShot
                  lng={seed!.lng}
                  lat={seed!.lat}
                  zoom={15}
                  w={750}
                  h={300}
                  rounded={16}
                  fallbackSeed={item.poi_id ?? item.name}
                  fallbackCategory={item.category}
                  name={item.name}
                />
              </div>
              <span className="art-chip">地图实景 · 高德静态地图（按真实坐标）</span>
            </>
          ) : (
            <>
              <SceneryArt
                seed={item.poi_id ?? item.name}
                category={item.category}
                name={item.name}
                height={232}
                rounded={16}
                variant={item.category === 'nightlife' ? 'night' : 'day'}
              />
              <span className="art-chip">示意图 · 未抓到实景图，由 POI 生成</span>
            </>
          )}
        </div>
        <div className="detail-hero-inner">
          <div className="detail-eyebrow">
            {CATEGORY_CN[(item.category ?? 'sight') as never] ?? '景点'} · {seed?.area ?? day.base_area?.name ?? itinerary.meta.destination}
          </div>
          <h1>{item.name}</h1>
          <div className="detail-meta">
            <span>
              <Stars value={seed?.rating ?? 4.4} /> {(seed?.rating ?? 4.4).toFixed(1)}
            </span>
            <span>{item.cost.amount > 0 ? cnMoney(item.cost.amount) : '免费'}</span>
            <span>建议 {item.duration_min} 分钟</span>
            {item.opening_hours && (
              <span>
                {item.opening_hours.open}–{item.opening_hours.close}
              </span>
            )}
            {item.booking_required && <span className="warn-text">需预约</span>}
          </div>
          <div className={`live-pill ${live.open ? 'open' : 'closed'}`}>
            <span className="live-dot" />
            {live.open ? '现在开放' : '当前不在开放时段'}
            <span className="live-sep" />
            {live.crowd} · 排队约 {live.queueMin} 分钟
            <span className="live-src">模拟实时</span>
          </div>
        </div>
      </div>

      <div className="detail-grid">
        <div className="detail-main">
          <section className="d-card">
            <div className="d-card-head">
              <h3>此刻</h3>
              <span className="tiny muted">
                {clock.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} 更新
              </span>
            </div>
            <div className="live-grid">
              <div className="live-tile">
                <span>人流</span>
                <b style={{ color: crowdColor(live.crowdPct) }}>{live.crowd}</b>
                <div className="live-bar">
                  <i style={{ width: `${live.crowdPct}%`, background: crowdColor(live.crowdPct) }} />
                </div>
              </div>
              <div className="live-tile">
                <span>排队</span>
                <b>{live.queueMin > 0 ? `${live.queueMin} 分钟` : '无需排队'}</b>
                <small>{live.queueMin > 10 ? '建议先逛旁边' : '可以直接进'}</small>
              </div>
              <div className="live-tile">
                <span>今日票价</span>
                <b>{live.priceNow > 0 ? cnMoney(live.priceNow) : '免费'}</b>
                <small>{live.ticketLeft != null ? `余票 ${live.ticketLeft}` : '无需门票'}</small>
              </div>
            </div>
            <p className="d-note">
              <IconAlert size={11} /> 这里的「实时」是本地确定性模拟（无外部 API）：同一时刻结果稳定，随时间和刷新轻微变化。
              接入高德 / Open-Meteo 后替换同一组件即可。
            </p>
          </section>

          <section className="d-card">
            <div className="d-card-head">
              <h3>风景</h3>
              <span className="tiny muted">
                {hasCoords ? '同一点位的三种尺度 · 高德静态地图' : '同一点位的三种时段'}
              </span>
            </div>
            <div className="scenery-strip">
              {hasCoords
                ? (
                  [
                    ['周边', 12],
                    ['街区', 14],
                    ['近景', 16],
                  ] as const
                ).map(([label, z]) => (
                  <figure key={label}>
                    <MapShot
                      lng={seed!.lng}
                      lat={seed!.lat}
                      zoom={z}
                      w={300}
                      h={92}
                      rounded={9}
                      fallbackSeed={`${item.poi_id ?? item.name}-${label}`}
                      fallbackCategory={item.category}
                      name={item.name}
                    />
                    <figcaption>{label}</figcaption>
                  </figure>
                ))
              : (
                (['day', 'dusk', 'night'] as const).map((v) => (
                  <figure key={v}>
                    <SceneryArt
                      seed={`${item.poi_id ?? item.name}-${v}`}
                      category={item.category}
                      name={item.name}
                      height={92}
                      rounded={9}
                      variant={v}
                    />
                    <figcaption>{v === 'day' ? '清晨 / 白天' : v === 'dusk' ? '傍晚' : '夜景'}</figcaption>
                  </figure>
                ))
              )}
            </div>
            {seed?.blurb && <p className="d-note">{seed.blurb}</p>}
          </section>

          <section className="d-card">
            <div className="d-card-head">
              <h3>你在这里的安排</h3>
              <span className="chip" style={{ background: accent + '18', color: accent }}>
                {item.start_time}–{item.end_time}
              </span>
            </div>

            <div className="plan-row">
              <div>
                <span className="tiny muted">到达方式</span>
                <b>
                  {transitIn?.type === 'transit'
                    ? `${TRANSIT_CN[transitIn.mode ?? 'walk'] ?? '步行'} · ${transitIn.duration_min} 分钟 · ${((transitIn.distance_m ?? 0) / 1000).toFixed(1)}km`
                    : '当天第一站'}
                </b>
              </div>
              <div>
                <span className="tiny muted">下一站</span>
                <b>{next ? `${next.name} · ${next.start_time}` : '当天结束'}</b>
              </div>
              <div>
                <span className="tiny muted">花费</span>
                <b>{item.cost.amount > 0 ? cnMoney(item.cost.amount) : '免费'}</b>
              </div>
            </div>

            {warnings.length > 0 && (
              <div className="d-warns">
                {warnings.map((w, i) => (
                  <div key={i} className={`warn-line ${w.severity}`}>
                    <IconAlert size={11} />
                    <span>{w.message}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="edit-grid">
              <label>
                <span>停留时长（分钟）</span>
                <input
                  type="number"
                  min={15}
                  max={300}
                  step={15}
                  value={draftDuration}
                  onChange={(e) => setDraftDuration(Number(e.target.value))}
                />
              </label>
              <label className="edit-wide">
                <span>备注</span>
                <input value={draftNotes} onChange={(e) => setDraftNotes(e.target.value)} placeholder="比如：从东门进，人少" />
              </label>
              <label className="edit-check">
                <input
                  type="checkbox"
                  checked={item.locked}
                  onChange={(e) => {
                    onSave(item.id, { locked: e.target.checked });
                  }}
                />
                <span>
                  <IconLock size={12} /> 锁定这一站，自动重排时不动它
                </span>
              </label>
            </div>

            <div className="edit-actions">
              <button
                className="btn btn-primary btn-sm"
                onClick={() => {
                  onSave(item.id, { duration_min: draftDuration, notes: draftNotes });
                  setSaved(true);
                  window.setTimeout(() => setSaved(false), 1800);
                }}
              >
                {saved ? (
                  <>
                    <IconCheck size={12} /> 已保存并重算
                  </>
                ) : (
                  '保存修改'
                )}
              </button>
              {prev && (
                <button className="btn btn-sm" onClick={() => onOpenItem(prev.id)}>
                  上一站 · {prev.name}
                </button>
              )}
              {next && (
                <button className="btn btn-sm" onClick={() => onOpenItem(next.id)}>
                  下一站 · {next.name}
                </button>
              )}
            </div>
          </section>

          <section className="d-card ask-card">
            <div className="d-card-head">
              <h3>
                <IconSpark size={13} /> 问问 Agent 怎么改
              </h3>
              <span className="tiny muted">只改这一站，其余不动</span>
            </div>
            <div className="ask-row">
              <input
                value={ask}
                onChange={(e) => setAsk(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') send(ask);
                }}
                placeholder="比如：这个点太赶了，缩短一点 / 换成室内的 / 晚点去 / 换到第 2 天"
              />
              <button className="btn btn-accent btn-sm" onClick={() => send(ask)} disabled={!ask.trim()}>
                <IconArrow size={12} />
              </button>
            </div>
            <div className="ask-chips">
              {STEP_SUGGESTIONS.map((s) => (
                <button key={s} className="chip" onClick={() => send(s)}>
                  {s}
                </button>
              ))}
            </div>
            {reply && (
              <div className={`ask-reply ${reply.changed ? 'ok' : ''}`}>
                <span className="avatar" style={{ width: 18, height: 18, fontSize: 9 }}>
                  行
                </span>
                <div>
                  <p>{reply.text}</p>
                  {reply.changed && <span className="tiny muted">行程已更新，右侧可行性凭证同步刷新。</span>}
                </div>
              </div>
            )}
          </section>

          <ReviewBoard
            reviews={fact?.platforms ?? []}
            gates={gates}
            poiName={item.name}
          />

          <CommentSection
            key={item.poi_id ?? item.id}
            poiId={item.poi_id ?? item.id}
            poiName={item.name}
            category={item.category ?? 'sight'}
          />
        </div>

        <aside className="detail-side">
          {official && (
            <section className="d-card official-card">
              <div className="d-card-head">
                <h3>官网动态</h3>
                <span className={`live-mode ${officialInfo?.synthetic === false ? 'live' : ''}`}>
                  {officialInfo?.synthetic === false ? '官网抓到' : '内置快照'}
                </span>
              </div>
              {officialInfo ? (
                <>
                  <div className={`official-status ${officialInfo.status}`}>
                    <b>{STATUS_CN[officialInfo.status]}</b>
                    <span>{BOOKING_CN[officialInfo.booking]}</span>
                  </div>
                  <div className="fact-list" style={{ marginTop: 8 }}>
                    <div>
                      <span>今日票价</span>
                      <b>{officialInfo.price != null ? (officialInfo.price > 0 ? `¥${officialInfo.price}` : '免费') : '—'}</b>
                    </div>
                    <div>
                      <span>开放时间</span>
                      <b>
                        {officialInfo.open}–{officialInfo.close}
                      </b>
                    </div>
                  </div>
                  <p className="official-notice">{officialInfo.notice}</p>
                  <div className="official-foot">
                    <span>{officialInfo.source}</span>
                    <span>{formatAgo(official.lastAt)}</span>
                  </div>
                </>
              ) : (
                <p className="tiny muted">这个点位还没有官网数据。</p>
              )}
              <div className="official-refresh">
                <span>下次刷新 {formatCountdown(official.nextIn)}</span>
                <button className="btn btn-sm" onClick={official.onRefresh} disabled={official.refreshing}>
                  {official.refreshing ? '刷新中…' : '立即刷新'}
                </button>
              </div>
            </section>
          )}

          <section className="d-card">
            <div className="d-card-head">
              <h3>基础信息</h3>
            </div>
            <div className="fact-list">
              <div>
                <span>地址</span>
                <b>
                  {fact?.address ? fact.address.v : `${itinerary.meta.destination} · ${seed?.area ?? day.base_area?.name ?? '市区'}`}
                </b>
                {srcChip(fact?.address?.src, fact?.address?.url)}
              </div>
              {factRows
                .filter((r) => r.label !== '地址')
                .map((r) => (
                  <div key={r.label}>
                    <span>{r.label}</span>
                    <b>{typeof r.fact?.v === 'number' ? r.fact.v.toFixed(1) : r.fact?.v}</b>
                    {srcChip(r.fact?.src, r.fact?.url)}
                  </div>
                ))}
              <div>
                <span>坐标</span>
                <b className="mono">
                  {item.lat?.toFixed(4)}, {item.lng?.toFixed(4)}
                </b>
              </div>
              <div>
                <span>开放时间</span>
                <b>
                  {fact?.hours
                    ? fact.hours.v
                    : item.opening_hours
                      ? `${item.opening_hours.open}–${item.opening_hours.close}`
                      : '未知'}
                  {item.opening_hours?.closed_days.length ? ` · 周${item.opening_hours.closed_days.join('、周')}闭馆` : ''}
                </b>
                {srcChip(fact?.hours?.src, fact?.hours?.url)}
              </div>
              <div>
                <span>门票</span>
                <b>{typeof fact?.price?.v === 'number' ? (fact.price.v > 0 ? cnMoney(fact.price.v) : '免费') : item.cost.amount > 0 ? cnMoney(item.cost.amount) : '免费'}</b>
                {srcChip(fact?.price?.src, fact?.price?.url)}
              </div>
              <div>
                <span>数据可信度</span>
                <b>
                  {item.opening_hours?.confidence === 'verified'
                    ? '已核实'
                    : item.opening_hours?.confidence === 'estimated'
                      ? '估算'
                      : '未知'}
                </b>
              </div>
              <div>
                <span>适合人群</span>
                <b>{seed?.tags.slice(0, 3).join(' · ') ?? '通用'}</b>
              </div>
            </div>
            {seed?.blurb && <p className="fact-blurb">{seed.blurb}</p>}
          </section>

          <section className="d-card">
            <div className="d-card-head">
              <h3>同一天的其他站</h3>
              <span className="tiny muted">{items.length} 站</span>
            </div>
            <div className="mini-list">
              {items.map((it: ItineraryItem, i) => (
                <button
                  key={it.id}
                  className={`mini-item ${it.id === item.id ? 'active' : ''}`}
                  onClick={() => onOpenItem(it.id)}
                >
                  <span className="mini-idx" style={{ color: accent }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="mini-body">
                    <b>{it.name}</b>
                    <small>
                      {it.start_time}–{it.end_time} · {it.duration_min} 分钟
                    </small>
                  </span>
                  {it.locked && <IconLock size={11} />}
                </button>
              ))}
            </div>
          </section>

          <section className="d-card">
            <div className="d-card-head">
              <h3>今日路线</h3>
            </div>
            <p className="tiny muted" style={{ lineHeight: 1.8 }}>
              {items.map((i) => i.name).join(' → ')}
            </p>
            <div className="tiny muted" style={{ marginTop: 8 }}>
              全程 {((day.summary.max_leg_km + 0) * 1).toFixed(1)} km 最大跨度 · 通勤 {day.summary.transit_min} 分钟
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
