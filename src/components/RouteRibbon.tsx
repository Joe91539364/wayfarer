import { useMemo } from 'react';
import type { Itinerary } from '../domain/schema';
import { dayColor } from '../domain/palette';
import { formatDateShort, toMin } from '../domain/time';

interface Props {
  itinerary: Itinerary;
  clock: Date;
  onSeek: (value: number) => void;
  followReal: boolean;
  onToggleFollow: () => void;
  onOpenItem: (itemId: string) => void;
}

const DAY_START = 8 * 60;
const DAY_END = 23 * 60;
const DAY_SPAN = DAY_END - DAY_START;

function tripStart(itin: Itinerary): number {
  const [y, m, d] = itin.meta.start_date.split('-').map(Number);
  return new Date(y, m - 1, d, 8, 0, 0).getTime();
}

export function clockFromSlider(itin: Itinerary, value: number): Date {
  const totalDays = Math.max(1, itin.days.length);
  const minutes = value * totalDays * DAY_SPAN;
  return new Date(tripStart(itin) + minutes * 60000);
}

export function totalSteps(itin: Itinerary): number {
  return itin.days.reduce((s, d) => s + d.items.filter((i) => i.type !== 'transit').length, 0);
}

export default function RouteRibbon({ itinerary, clock, onSeek, followReal, onToggleFollow, onOpenItem }: Props) {
  const days = itinerary.days;
  const totalMinutes = Math.max(1, days.length * DAY_SPAN);
  const start = tripStart(itinerary);
  const elapsed = (clock.getTime() - start) / 60000;
  const progress = Math.min(1, Math.max(0, elapsed / totalMinutes));

  const nodes = useMemo(() => {
    return days.flatMap((day, di) => {
      const dayOffset = di * DAY_SPAN;
      return day.items
        .filter((i) => i.type !== 'transit')
        .map((item) => {
          const startMin = toMin(item.start_time);
          const offset = dayOffset + Math.max(0, Math.min(DAY_SPAN, startMin - DAY_START));
          return {
            item,
            dayIndex: day.day_index,
            dayDate: day.date,
            pct: (offset / totalMinutes) * 100,
            time: item.start_time,
          };
        });
    });
  }, [days, totalMinutes]);

  const current = useMemo(() => {
    const dayIdx = Math.min(days.length - 1, Math.max(0, Math.floor(elapsed / DAY_SPAN)));
    const minuteInDay = DAY_START + (((elapsed % DAY_SPAN) + DAY_SPAN) % DAY_SPAN);
    const day = days[dayIdx];
    if (!day) return null;
    const items = day.items.filter((i) => i.type !== 'transit');
    const active = items.find((i) => toMin(i.start_time) <= minuteInDay && toMin(i.end_time) >= minuteInDay);
    return { day, minuteInDay, active, items };
  }, [days, elapsed]);

  const stepAtOrBefore = nodes.filter((n) => n.pct <= progress * 100).length;
  const statusText = elapsed < 0 ? '还没出发' : progress >= 1 ? '行程已结束' : current?.active ? `正在 ${current.active.name}` : '路上 / 休息中';

  return (
    <div className="ribbon">
      <div className="ribbon-head">
        <div>
          <div className="ribbon-title">
            行程主线
            <span className="ribbon-step">
              {Math.min(stepAtOrBefore, totalSteps(itinerary))} / {totalSteps(itinerary)} 步
            </span>
          </div>
          <div className="ribbon-sub">
            {statusText}
            {current && elapsed >= 0 && progress < 1 && (
              <>
                {' · '}第 {current.day.day_index} 天 {String(Math.floor(current.minuteInDay / 60)).padStart(2, '0')}:
                {String(Math.floor(current.minuteInDay % 60)).padStart(2, '0')}
              </>
            )}
          </div>
        </div>
        <button className={`ribbon-follow ${followReal ? 'on' : ''}`} onClick={onToggleFollow}>
          <span className="dot" />
          {followReal ? '跟随真实时间' : '手动拨动'}
        </button>
      </div>

      <div className="ribbon-track">
        <div className="ribbon-line" />
        <div className="ribbon-fill" style={{ width: `${progress * 100}%` }} />

        {days.map((day, di) => (
          <div
            key={`sep-${day.day_index}`}
            className="ribbon-day-mark"
            style={{ left: `${Math.min(96, Math.max(4, (di * DAY_SPAN * 100) / totalMinutes))}%` }}
          >
            <span style={{ color: dayColor(day.day_index) }}>D{day.day_index}</span>
            <small>{formatDateShort(day.date)}</small>
          </div>
        ))}

        {nodes.map((n) => {
          const done = elapsed >= 0 && n.pct <= progress * 100;
          const isNow = current?.active?.id === n.item.id;
          return (
            <button
              key={n.item.id}
              className={`ribbon-node ${done ? 'done' : ''} ${isNow ? 'now' : ''}`}
              style={{ left: `${n.pct}%`, ['--c' as string]: dayColor(n.dayIndex) }}
              title={`第 ${n.dayIndex} 天 ${n.time} · ${n.item.name}`}
              onClick={() => onOpenItem(n.item.id)}
            >
              <i />
              {isNow && <span className="ribbon-now">{n.item.name}</span>}
            </button>
          );
        })}

        <div className="ribbon-cursor" style={{ left: `${progress * 100}%` }}>
          <span />
        </div>
      </div>

      <input
        className="ribbon-slider"
        type="range"
        min={0}
        max={1000}
        value={Math.round(progress * 1000)}
        onChange={(e) => onSeek(Number(e.target.value) / 1000)}
        aria-label="拖动查看行程进度"
      />
    </div>
  );
}
