import { useMemo, useState } from 'react';
import type { Itinerary } from '../domain/schema';
import { bbox, makeProjector } from '../domain/geo';
import { DAY_COLORS, dayColor } from '../domain/palette';

export { DAY_COLORS };

interface Props {
  itinerary: Itinerary;
  activeDay: number;
  clock?: Date;
  onSelectDay: (n: number) => void;
}

const W = 320;
const H = 248;

/** 全览模式：暗底 + 红色地点，整趟行程一眼看完 */
function DarkOverview({ itinerary, currentId }: { itinerary: Itinerary; currentId: string | null }) {
  const stops = itinerary.days.flatMap((d) =>
    d.items
      .filter((i) => i.lat != null && i.lng != null && i.type !== 'transit')
      .map((i) => ({ ...i, dayIndex: d.day_index })),
  );
  if (stops.length === 0) return null;
  const box = bbox(stops.map((s) => ({ lat: s.lat as number, lng: s.lng as number })), 0.3);
  const project = makeProjector(box, W, H);
  const pts = stops.map((s) => ({ ...project({ lat: s.lat as number, lng: s.lng as number }), s }));
  const here = currentId ? pts.find((p) => p.s.id === currentId) : undefined;

  return (
    <svg className="map-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="行程全览图">
      <rect width={W} height={H} fill="#17181c" />
      {/* 经纬网，撑出「地图感」 */}
      <g stroke="rgba(255,255,255,0.045)" strokeWidth="1">
        {[0.2, 0.4, 0.6, 0.8].map((f) => (
          <line key={`v${f}`} x1={W * f} y1={0} x2={W * f} y2={H} />
        ))}
        {[0.2, 0.4, 0.6, 0.8].map((f) => (
          <line key={`h${f}`} x1={0} y1={H * f} x2={W} y2={H * f} />
        ))}
      </g>

      {/* 全程连线：暗红细线 */}
      {pts.slice(0, -1).map((p, i) => {
        const q = pts[i + 1];
        const cross = p.s.dayIndex !== q.s.dayIndex;
        return (
          <line
            key={i}
            x1={p.x}
            y1={p.y}
            x2={q.x}
            y2={q.y}
            stroke="rgba(225,75,75,0.5)"
            strokeWidth={cross ? 1 : 1.4}
            strokeDasharray={cross ? '2 4' : undefined}
          />
        );
      })}

      {/* 每一站一个红色光点 */}
      {pts.map((p, i) => (
        <g key={p.s.id}>
          <circle cx={p.x} cy={p.y} r={5.5} fill="rgba(225,75,75,0.22)">
            <animate attributeName="r" values="4;7;4" dur={`${2.2 + (i % 4) * 0.4}s`} repeatCount="indefinite" />
          </circle>
          <circle cx={p.x} cy={p.y} r={2.6} fill="#e14b4b" stroke="rgba(255,255,255,0.85)" strokeWidth={0.9} />
        </g>
      ))}

      {/* 当前位置：大号大头针 + 光晕 */}
      {here && (
        <g>
          <circle cx={here.x} cy={here.y} r={13} fill="rgba(225,75,75,0.18)">
            <animate attributeName="r" values="9;16;9" dur="2.4s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.5;0.08;0.5" dur="2.4s" repeatCount="indefinite" />
          </circle>
          <path
            d={`M${here.x} ${here.y - 13} c -5.2 0 -9 3.9 -9 8.6 c 0 6.2 9 15.4 9 15.4 c 0 0 9 -9.2 9 -15.4 c 0 -4.7 -3.8 -8.6 -9 -8.6 z`}
            fill="#e14b4b"
            stroke="#fff"
            strokeWidth={1.1}
            transform={`translate(0 -6)`}
          />
          <circle cx={here.x} cy={here.y - 10.5} r={2.6} fill="#fff" />
        </g>
      )}

      {/* 徽章：左上地点数、右上天数 */}
      <g>
        <rect x={8} y={8} rx={9} width={86} height={17} fill="rgba(20,21,25,0.78)" stroke="rgba(255,255,255,0.14)" />
        <circle cx={17} cy={16.5} r={2.6} fill="#e14b4b" />
        <text x={24} y={19.5} fontSize={8} fill="rgba(255,255,255,0.92)" fontFamily="Inter, sans-serif">
          {stops.length} 个行程地点
        </text>
      </g>
      <g>
        <rect x={W - 66} y={8} rx={9} width={58} height={17} fill="rgba(20,21,25,0.78)" stroke="rgba(255,255,255,0.14)" />
        <circle cx={W - 57} cy={16.5} r={2.6} fill="#e14b4b" />
        <text x={W - 51} y={19.5} fontSize={8} fill="rgba(255,255,255,0.92)" fontFamily="Inter, sans-serif">
          D1–D{itinerary.days.length} 全程
        </text>
      </g>
      <text x={10} y={H - 9} fontSize={7.5} fill="rgba(255,255,255,0.4)" fontFamily="Inter, sans-serif">
        全览 · 暗色底图，红点为行程地点，大头针是你现在所在的位置
      </text>
    </svg>
  );
}


function minutesOf(d: Date) {
  return d.getHours() * 60 + d.getMinutes();
}

function toMinutes(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export default function MapView({ itinerary, activeDay, clock, onSelectDay }: Props) {
  const [mode, setMode] = useState<'day' | 'all'>('day');
  const data = useMemo(() => {
    const all = itinerary.days.flatMap((d) =>
      d.items
        .filter((i) => i.lat != null && i.lng != null)
        .map((i) => ({ lat: i.lat as number, lng: i.lng as number })),
    );
    if (all.length === 0) return null;
    const box = bbox(all, 0.24);
    const project = makeProjector(box, W, H);
    return { box, project };
  }, [itinerary]);

  if (!data) {
    return (
      <div className="map-wrap" style={{ height: H, display: 'grid', placeItems: 'center', color: '#8a8377', fontSize: 12 }}>
        暂无坐标数据
      </div>
    );
  }

  const { project } = data;

  // 全程一条线：按天顺序把每一站串起来；跨天的那一段用虚线，表示「回酒店 / 第二天再出发」
  const ordered = itinerary.days.flatMap((d) =>
    d.items
      .filter((i) => i.lat != null && i.lng != null && i.type !== 'transit')
      .map((i) => ({ ...i, dayIndex: d.day_index })),
  );
  const current =
    clock && ordered.length > 0
      ? (() => {
          const day = itinerary.days.find((d) => {
            const [y, m, dd] = d.date.split('-').map(Number);
            return (
              new Date(y, m - 1, dd).toDateString() === new Date(clock.getFullYear(), clock.getMonth(), clock.getDate()).toDateString()
            );
          });
          if (!day) return null;
          const now = minutesOf(clock);
          const hit = day.items.find(
            (i) => i.type !== 'transit' && toMinutes(i.start_time) <= now && toMinutes(i.end_time) >= now,
          );
          return hit?.lat != null ? hit : null;
        })()
      : null;

  if (mode === 'all') {
    return (
      <div>
        <div className="map-wrap is-dark">
          <DarkOverview itinerary={itinerary} currentId={current?.id ?? null} />
        </div>
        <div className="map-legend">
          <button className="map-chip active" onClick={() => setMode('day')}>
            <i style={{ background: '#e14b4b' }} />全览
          </button>
          {itinerary.days.map((d) => (
            <button
              key={d.day_index}
              className="map-chip"
              onClick={() => {
                setMode('day');
                onSelectDay(d.day_index);
              }}
            >
              <i style={{ background: DAY_COLORS[(d.day_index - 1) % DAY_COLORS.length] }} />
              D{d.day_index}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="map-wrap">
        <svg className="map-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="行程地图">
          <defs>
            <pattern id="grid" width="26" height="26" patternUnits="userSpaceOnUse">
              <path d="M26 0H0V26" fill="none" stroke="rgba(27,26,23,0.05)" strokeWidth="1" />
            </pattern>
            <linearGradient id="fade" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="rgba(255,255,255,0.55)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </linearGradient>
          </defs>
          <rect width={W} height={H} fill="url(#grid)" />
          <path
            d={`M-10 ${H * 0.72} C ${W * 0.22} ${H * 0.6}, ${W * 0.4} ${H * 0.9}, ${W * 0.66} ${H * 0.66} S ${W + 10} ${H * 0.56}, ${W + 10} ${H * 0.62}`}
            fill="none"
            stroke="rgba(44,100,89,0.14)"
            strokeWidth="8"
            strokeLinecap="round"
          />
          <path
            d={`M-10 ${H * 0.72} C ${W * 0.22} ${H * 0.6}, ${W * 0.4} ${H * 0.9}, ${W * 0.66} ${H * 0.66} S ${W + 10} ${H * 0.56}, ${W + 10} ${H * 0.62}`}
            fill="none"
            stroke="rgba(44,100,89,0.28)"
            strokeWidth="1"
            strokeDasharray="3 5"
          />
          <rect width={W} height={H} fill="url(#fade)" />

          {/* 其它天的点，作为背景 */}
          {itinerary.days
            .filter((d) => d.day_index !== activeDay)
            .map((day) =>
              day.items
                .filter((i) => i.lat != null && i.lng != null && i.type !== 'transit')
                .map((i) => {
                  const p = project({ lat: i.lat as number, lng: i.lng as number });
                  return (
                    <circle
                      key={`bg-${i.id}`}
                      cx={p.x}
                      cy={p.y}
                      r={2.6}
                      fill={DAY_COLORS[(day.day_index - 1) % DAY_COLORS.length]}
                      opacity={0.32}
                    />
                  );
                }),
            )}

          {/* 全程一条线：跨天段虚线 */}
          {ordered.slice(0, -1).map((p, i) => {
            const q = ordered[i + 1];
            if (p.dayIndex !== activeDay && q.dayIndex !== activeDay) return null;
            const a = project({ lat: p.lat as number, lng: p.lng as number });
            const b = project({ lat: q.lat as number, lng: q.lng as number });
            const cross = p.dayIndex !== q.dayIndex;
            const onActive = p.dayIndex === activeDay && q.dayIndex === activeDay;
            // 全程一条线，但只有当前天是「实的」：其余天退成底图，跨天用虚线
            const stroke = cross ? 'rgba(76,72,64,0.3)' : dayColor(p.dayIndex);
            return (
              <line
                key={`seg-${i}`}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={stroke}
                strokeWidth={cross ? 1 : onActive ? 2 : 1}
                strokeDasharray={cross ? '3 4' : undefined}
                opacity={cross ? 0.55 : onActive ? 0.9 : 0.22}
              />
            );
          })}

          {/* 当前天：序号 */}
          {itinerary.days
            .filter((d) => d.day_index === activeDay)
            .map((day) => {
              const color = DAY_COLORS[(day.day_index - 1) % DAY_COLORS.length];
              const acts = day.items.filter((i) => i.lat != null && i.lng != null && i.type !== 'transit');
              const pts = acts.map((i) => ({
                ...project({ lat: i.lat as number, lng: i.lng as number }),
                name: i.name,
              }));
              return (
                <g key={`fg-${day.day_index}`}>
                  {pts.map((p, idx) => {
                    const anchorEnd = p.x > W - 86;
                    return (
                      <g key={idx}>
                        <circle cx={p.x} cy={p.y} r="8.5" fill="#fffdf8" stroke={color} strokeWidth="1.6" />
                        <text
                          x={p.x}
                          y={p.y + 3.2}
                          fontSize="8.5"
                          textAnchor="middle"
                          fill={color}
                          fontWeight="600"
                          fontFamily="Inter, Segoe UI, sans-serif"
                        >
                          {idx + 1}
                        </text>
                        <text
                          x={anchorEnd ? p.x - 12 : p.x + 12}
                          y={p.y + 3.2}
                          fontSize="8.5"
                          textAnchor={anchorEnd ? 'end' : 'start'}
                          fill="#4c4840"
                          fontFamily="Inter, Segoe UI, sans-serif"
                        >
                          {p.name.length > 9 ? `${p.name.slice(0, 9)}…` : p.name}
                        </text>
                      </g>
                    );
                  })}
                </g>
              );
            })}

          {current && (() => {
            const p = project({ lat: current.lat as number, lng: current.lng as number });
            return (
              <g>
                <circle cx={p.x} cy={p.y} r="11" fill="rgba(173,69,38,0.16)">
                  <animate attributeName="r" values="8;14;8" dur="2.4s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.35;0.05;0.35" dur="2.4s" repeatCount="indefinite" />
                </circle>
                <circle cx={p.x} cy={p.y} r="4.5" fill="#ad4526" stroke="#fffdf8" strokeWidth="1.6" />
                <text x={p.x + 8} y={p.y - 7} fontSize="7.5" fill="#ad4526" fontWeight="600" fontFamily="Inter, sans-serif">
                  你在这里
                </text>
              </g>
            );
          })()}

          <g opacity="0.5">
            <path d={`M${W - 24} 16 l0 16`} stroke="#4c4840" strokeWidth="1" />
            <path d={`M${W - 28} 20 l4 -4 4 4`} fill="none" stroke="#4c4840" strokeWidth="1" />
            <text x={W - 24} y={42} fontSize="7" textAnchor="middle" fill="#4c4840" fontFamily="Inter, sans-serif">
              N
            </text>
          </g>

          <text x={10} y={16} fontSize="8" fill="rgba(138,131,119,0.95)" letterSpacing="1.4" fontFamily="Inter, sans-serif">
            {itinerary.meta.destination.toUpperCase()} · DAY {activeDay}
          </text>
          <text x={10} y={H - 9} fontSize="7.5" fill="rgba(138,131,119,0.75)" fontFamily="Inter, sans-serif">
            示意地图 · 坐标来自 POI 数据集，非实时底图
          </text>
        </svg>
      </div>
      <div className="map-legend">
        <button className={`map-chip ${mode === 'day' ? '' : 'active'}`} onClick={() => setMode('all')} title="暗色全览图">
          <i style={{ background: '#e14b4b' }} />全览
        </button>
        {itinerary.days.map((d) => (
          <button
            key={d.day_index}
            className={`map-chip ${d.day_index === activeDay ? 'active' : ''}`}
            onClick={() => onSelectDay(d.day_index)}
          >
            <i style={{ background: DAY_COLORS[(d.day_index - 1) % DAY_COLORS.length] }} />
            D{d.day_index}
          </button>
        ))}
      </div>
    </div>
  );
}
