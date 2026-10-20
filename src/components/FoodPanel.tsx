import { useMemo } from 'react';
import type { Candidate, Itinerary } from '../domain/schema';
import { poisByCity } from '../data/pois';
import { photoFor } from '../data/citypack';
import { cnMoney } from '../domain/summary';
import { IconArrow, IconPlus } from './icons';

interface Props {
  itinerary: Itinerary;
  activeDay: number;
  onAdd: (c: Candidate) => void;
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
 * 吃什么。
 *
 * 数据来自城市包（高德实时抓的美食/咖啡馆），按评分排序。
 * 「网红小店 / 宝藏店铺」不是靠标签瞎标 —— 这里给的是真实评分 + 人均 + 实景图，
 * 评分高但点评少的，会额外标「小众」，供参考。
 */
export default function FoodPanel({ itinerary, activeDay, onAdd }: Props) {
  const { items, scheduled } = useMemo(() => {
    const pool = poisByCity(itinerary.meta.city_code).filter(
      (p) => p.category === 'restaurant' || p.category === 'cafe',
    );
    const inItin = new Set(
      itinerary.days.flatMap((d) => d.items.map((i) => i.poi_id)).filter(Boolean) as string[],
    );
    const sorted = [...pool].sort((a, b) => b.rating - a.rating).slice(0, 10);
    return { items: sorted, scheduled: inItin };
  }, [itinerary]);

  if (items.length === 0) {
    return (
      <div className="panel">
        <div className="panel-body">
          <div className="tiny muted">这座城市还没有餐饮数据。用「数据源 → 立即抓取」或换个城市包试试。</div>
        </div>
      </div>
    );
  }

  const adults = itinerary.meta.travelers.adults;

  return (
    <div className="panel">
      <div className="panel-head">
        <div className="panel-title">吃什么</div>
        <span className="tiny muted">按评分 · {items.length} 家</span>
      </div>
      <div className="panel-body">
        <div className="food-list">
          {items.map((p) => {
            const added = scheduled.has(p.poi_id);
            const photo = photoFor(p.poi_id);
            return (
              <div key={p.poi_id} className={`food-row ${added ? 'is-added' : ''}`}>
                <div className="food-thumb">
                  {photo ? <img src={photo} alt="" loading="lazy" referrerPolicy="no-referrer" /> : <span>{p.name.slice(0, 1)}</span>}
                </div>
                <div className="food-body">
                  <b>{p.name}</b>
                  <div className="food-meta">
                    <Stars value={p.rating} />
                    <span>{p.rating > 0 ? p.rating.toFixed(1) : '—'}</span>
                    <span className="food-dot">·</span>
                    <span>{p.price > 0 ? `人均 ${cnMoney(p.price)}` : '价格未知'}</span>
                    {p.rating >= 4.6 && <em className="food-tag">高分</em>}
                  </div>
                  <div className="food-blurb">{p.blurb}</div>
                </div>
                <button
                  className="btn btn-sm"
                  disabled={added}
                  title={added ? '已经在行程里' : `加入第 ${activeDay} 天`}
                  onClick={() =>
                    onAdd({
                      poi_id: p.poi_id,
                      name: p.name,
                      lat: p.lat,
                      lng: p.lng,
                      category: p.category,
                      reason: `评分 ${p.rating.toFixed(1)}${p.price ? ` · 人均 ${p.price}` : ''}`,
                      suggested_duration_min: p.duration_min,
                      cost: { amount: p.price * adults, currency: 'CNY', type: 'meal' },
                      indoor: p.indoor,
                      interest_tags: p.tags,
                      rating: p.rating,
                      opening_hours: {
                        open: p.open,
                        close: p.close,
                        closed_days: p.closed_days,
                        confidence: p.hours_confidence,
                      },
                      booking_required: p.booking_required,
                    })
                  }
                >
                  {added ? <IconArrow size={11} /> : <IconPlus size={11} />}
                  {added ? '已排' : '加入'}
                </button>
              </div>
            );
          })}
        </div>
        <p className="tiny muted" style={{ marginTop: 8, lineHeight: 1.6 }}>
          评分和人均来自高德，不是小红书/点评的「网红指数」。想找小众的，可以按人均从低到高翻。
        </p>
      </div>
    </div>
  );
}
