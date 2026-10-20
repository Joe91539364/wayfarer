import { useMemo } from 'react';
import type { Itinerary } from '../domain/schema';
import { hotelsByCity, type HotelSeed } from '../data/hotels';
import { hotelLive } from '../domain/live';
import { haversine } from '../domain/geo';
import { cnMoney } from '../domain/summary';
import { IconCheck, IconPin, IconX } from './icons';
import SceneryArt from './SceneryArt';

interface Props {
  itinerary: Itinerary;
  dayIndex: number;
  clock: Date;
  onClose: () => void;
  onChange: (hotel: HotelSeed) => void;
}

export default function HotelModal({ itinerary, dayIndex, clock, onClose, onChange }: Props) {
  const day = itinerary.days.find((d) => d.day_index === dayIndex) ?? itinerary.days[0];
  const city = itinerary.meta.city_code;
  const all = useMemo(() => hotelsByCity(city), [city]);
  const currentName = day?.lodging?.name ?? '';
  const current = all.find((h) => h.name === currentName);
  const live = current ? hotelLive(current.id, current.price, current.roomsLeft, clock) : null;
  const firstPoi = day?.items.find((i) => i.type !== 'transit' && i.lat != null);

  const distance = (h: HotelSeed) => {
    if (!firstPoi?.lat || !firstPoi?.lng) return null;
    return haversine({ lat: h.lat, lng: h.lng }, { lat: firstPoi.lat, lng: firstPoi.lng });
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" style={{ width: 'min(680px, 100%)' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <h3>住宿</h3>
            <div className="tiny muted" style={{ marginTop: 2 }}>
              第 {day?.day_index} 天 · 换酒店会重算当晚房费与次日出发时间
            </div>
          </div>
          <button className="icon-btn" onClick={onClose}>
            <IconX size={16} />
          </button>
        </div>

        <div className="modal-body">
          {current && live ? (
            <div className="hotel-hero">
              <div className="hotel-art">
                <SceneryArt seed={current.id} category="hotel" name={current.name} height={132} rounded={10} variant="night" />
                <span className="art-chip">酒店示意</span>
              </div>
              <div className="hotel-hero-top">
                <div>
                  <div className="hotel-tier">{current.tier === 'premium' ? '品质' : current.tier === 'budget' ? '经济' : '舒适'}</div>
                  <h4>{current.name}</h4>
                  <div className="hotel-sub">
                    {current.area} · ★ {current.rating.toFixed(1)}
                    {distance(current) != null && ` · 距首站 ${distance(current)!.toFixed(1)}km`}
                  </div>
                </div>
                <div className="hotel-price">
                  <b>{cnMoney(live.priceNow)}</b>
                  <span>/ 晚</span>
                </div>
              </div>
              <div className="hotel-tags">
                {current.tags.map((t) => (
                  <span className="chip" key={t}>
                    {t}
                  </span>
                ))}
              </div>
              <div className="hotel-live">
                <span className={live.roomsLeft <= 2 ? 'warn-text' : ''}>
                  {live.roomsLeft > 0 ? `今日剩余 ${live.roomsLeft} 间` : '今日已满'}
                </span>
                <span>{live.breakfast ? '含早餐' : '不含早'}</span>
                <span className="tiny muted">模拟实时房态</span>
              </div>
              <p className="hotel-blurb">{current.blurb}</p>
            </div>
          ) : (
            <div className="hotel-hero">
              <div className="hotel-hero-top">
                <div>
                  <h4>{currentName || '未设置住宿'}</h4>
                  <div className="hotel-sub">这份行程的住宿不在本地数据集里</div>
                </div>
              </div>
            </div>
          )}

          <div className="hotel-list">
            {all.map((h) => {
              const l = hotelLive(h.id, h.price, h.roomsLeft, clock);
              const active = h.name === currentName;
              return (
                <div className={`hotel-row ${active ? 'active' : ''}`} key={h.id}>
                  <div>
                    <div className="hotel-row-name">
                      {h.name}
                      {active && <span className="chip teal">当前</span>}
                    </div>
                    <div className="hotel-row-sub">
                      {h.area} · ★ {h.rating.toFixed(1)} · {h.tags.slice(0, 2).join(' / ')}
                      {distance(h) != null && ` · 距首站 ${distance(h)!.toFixed(1)}km`}
                    </div>
                  </div>
                  <div className="hotel-row-right">
                    <b>{cnMoney(l.priceNow)}</b>
                    <span className="tiny muted">剩 {l.roomsLeft} 间</span>
                    {active ? (
                      <span className="hotel-check">
                        <IconCheck size={12} />
                      </span>
                    ) : (
                      <button
                        className="btn btn-sm"
                        onClick={() => {
                          onChange(h);
                          onClose();
                        }}
                      >
                        换这家
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <p className="d-note" style={{ marginTop: 12 }}>
            <IconPin size={11} /> 房态与价格是本地模拟（周末上浮 12%），接入酒店 API 后替换 `hotelLive`。
          </p>
        </div>
      </div>
    </div>
  );
}
