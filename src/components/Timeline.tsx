import { Fragment, useState } from 'react';
import type { Day, Itinerary, ItineraryItem, Violation } from '../domain/schema';
import { CATEGORY_CN, TRANSIT_CN } from '../domain/schema';
import { weekdayLabel, formatDateCN, toMin, durationMin } from '../domain/time';
import { solarTimes } from '../domain/solar';
import { cnMoney } from '../domain/summary';
import { DAY_COLORS } from './MapView';
import {
  IconAlert,
  IconCar,
  IconChevron,
  IconHeart,
  IconLock,
  IconMenu,
  IconSun,
  IconSwap,
  IconTrain,
  IconTrash,
  IconUnlock,
  IconWalk,
} from './icons';

interface Props {
  itinerary: Itinerary;
  activeDay: number;
  onSelectDay: (n: number) => void;
  warnings: Violation[];
  onToggleLock: (itemId: string) => void;
  onSwap: (itemId: string) => void;
  onDelete: (itemId: string) => void;
  onMove: (dayIndex: number, fromId: string, toId: string) => void;
  onOpenDetail: (itemId: string) => void;
  /** 每个点位挂了几张幸福时刻，没有就不传 */
  momentByPoi?: Map<string, number>;
  /** 现实中的「此刻」（目的地的日期与钟点），用于画现在游标 */
  nowInfo?: { date: string; hhmm: string } | null;
  /** 目的地时区偏移（分钟），算日出日落用 */
  tzOffsetMin?: number;
}

function ModeIcon({ mode }: { mode: string | null }) {
  if (mode === 'walk') return <IconWalk size={12} />;
  if (mode === 'train' || mode === 'flight') return <IconTrain size={12} />;
  return <IconCar size={12} />;
}

function ItemCard({
  item,
  dayColor,
  warns,
  shots,
  happening,
  remainMin,
  onToggleLock,
  onSwap,
  onDelete,
  onOpenDetail,
  onDragStart,
  onDrop,
}: {
  item: ItineraryItem;
  dayColor: string;
  warns: Violation[];
  shots: number;
  /** 此刻正在这一项里 */
  happening?: boolean;
  /** 还剩多少分钟结束 */
  remainMin?: number | null;
  onToggleLock: () => void;
  onSwap: () => void;
  onDelete: () => void;
  onOpenDetail: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
}) {
  const [open, setOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const hasError = warns.some((w) => w.severity === 'error');
  const hasWarn = warns.some((w) => w.severity === 'warning');

  return (
    <div
      id={`item-${item.id}`}
      className={`item-card ${item.locked ? 'is-locked' : ''} ${hasError ? 'is-error' : hasWarn ? 'is-warn' : ''} ${open ? 'is-open' : ''} ${dragOver ? 'drop-target' : ''}`}
      draggable
      onDragStart={onDragStart}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        setDragOver(false);
        onDrop(e);
      }}
    >
      <div className="item-top">
        <button className="item-name" onClick={onOpenDetail} title="查看详情 / 评论 / 修改">
          {item.name}
        </button>
        {happening && (
          <span className="item-happening">
            <i /> 进行中{remainMin != null ? ` · 还剩 ${remainMin} 分` : ''}
          </span>
        )}
        {item.category && <span className="item-cat">{CATEGORY_CN[item.category as never] ?? item.category}</span>}
        <span className="item-cost">{item.cost.amount > 0 ? cnMoney(item.cost.amount) : '免费'}</span>
      </div>
      <div className="item-meta">
        <span>
          {item.start_time}–{item.end_time}
        </span>
        <span>{item.duration_min} 分钟</span>
        {item.booking_required && <span style={{ color: '#a8761c' }}>需预约</span>}
        {item.locked && <span style={{ color: '#2c6459' }}>已锁定</span>}
        {shots > 0 && (
          <span className="item-shots" title={`这里有 ${shots} 个幸福时刻`}>
            <IconHeart size={10} />
            {shots}
          </span>
        )}
        {warns.length > 0 && (
          <span className={hasError ? 'rule-bad' : 'day-warn'} style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
            <IconAlert size={11} />
            {warns.length}
          </span>
        )}
        <div className="item-actions">
          <button className={`icon-btn ${item.locked ? 'active' : ''}`} title={item.locked ? '解锁' : '锁定此项'} onClick={onToggleLock}>
            {item.locked ? <IconLock size={13} /> : <IconUnlock size={13} />}
          </button>
          <button className="icon-btn" title="换一个" onClick={onSwap}>
            <IconSwap size={13} />
          </button>
          <button className="icon-btn" title="删除并移入候选池" onClick={onDelete}>
            <IconTrash size={13} />
          </button>
          <button className={`icon-btn ${open ? 'active' : ''}`} title="详情" onClick={() => setOpen((v) => !v)}>
            <IconMenu size={13} />
          </button>
        </div>
      </div>

      {open && (
        <div className="item-detail">
          {item.notes && <div>{item.notes}</div>}
          {item.opening_hours && (
            <div>
              <b>营业</b> {item.opening_hours.open}–{item.opening_hours.close}
              {item.opening_hours.closed_days.length > 0 && ` · 周${item.opening_hours.closed_days.join('、周')}闭馆`}
              {` · 数据${item.opening_hours.confidence === 'verified' ? '已核实' : item.opening_hours.confidence === 'estimated' ? '为估算' : '未知'}`}
            </div>
          )}
          {item.poi_id && (
            <div>
              <b>POI</b> <span className="mono">{item.poi_id}</span>
            </div>
          )}
          {item.cost.type && (
            <div>
              <b>费用类型</b> {item.cost.type} · ¥{item.cost.amount}
            </div>
          )}
        </div>
      )}

      {warns.length > 0 && (
        <div className="item-warnings">
          {warns.map((w, i) => (
            <div key={i} className={`warn-line ${w.severity}`}>
              <IconAlert size={12} />
              <span>
                {w.message}
                {w.suggestion && <span style={{ opacity: 0.75 }}> · {w.suggestion}</span>}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DayBlock({
  day,
  warns,
  collapsedDefault,
  onToggleLock,
  onSwap,
  onDelete,
  onMove,
  onSelectDay,
  onOpenDetail,
  momentByPoi,
  nowInfo,
  tzOffsetMin,
  active,
}: {
  day: Day;
  warns: Violation[];
  collapsedDefault: boolean;
  onToggleLock: (id: string) => void;
  onSwap: (id: string) => void;
  onDelete: (id: string) => void;
  onMove: (dayIndex: number, fromId: string, toId: string) => void;
  onSelectDay: (n: number) => void;
  onOpenDetail: (itemId: string) => void;
  momentByPoi?: Map<string, number>;
  nowInfo?: { date: string; hhmm: string } | null;
  tzOffsetMin?: number;
  active: boolean;
}) {
  const [collapsed, setCollapsed] = useState(collapsedDefault);
  const color = DAY_COLORS[(day.day_index - 1) % DAY_COLORS.length];
  const byItem: Record<string, Violation[]> = {};
  for (const w of warns) {
    for (const id of w.item_ids) {
      byItem[id] = byItem[id] ?? [];
      byItem[id].push(w);
    }
  }
  const transitCount = day.items.filter((i) => i.type === 'transit').length;
  const warnCount = warns.length;

  // 只有「今天」这一天画现在游标；其余日子不该出现假的现在
  const nowMin = nowInfo && nowInfo.date === day.date ? toMin(nowInfo.hhmm) : null;
  const isToday = nowMin != null;
  const solar = day.base_area ? solarTimes(day.date, day.base_area.lat, day.base_area.lng, tzOffsetMin ?? 480) : null;

  function renderRow(item: ItineraryItem) {
    if (item.type === 'transit') {
      return (
        <div className="transit-row" key={item.id}>
          <div className="time-col" style={{ paddingTop: 6 }}>
            {item.start_time}
          </div>
          <div className="rail">
            <div className="rail-dot" style={{ width: 5, height: 5, marginTop: 11, borderWidth: 1, opacity: 0.5 }} />
          </div>
          <div className="transit-card">
            <span className="mode">
              <ModeIcon mode={item.mode} />
              {TRANSIT_CN[item.mode ?? 'walk'] ?? item.mode}
            </span>
            <span>{item.duration_min} 分钟</span>
            {item.distance_m != null && <span className="dist">{((item.distance_m ?? 0) / 1000).toFixed(1)}km</span>}
            {item.cost.amount > 0 && <span className="dist">{cnMoney(item.cost.amount)}</span>}
          </div>
        </div>
      );
    }
    const startMin = toMin(item.start_time);
    const endMin = startMin + durationMin(item.start_time, item.end_time);
    const happening = nowMin != null && nowMin >= startMin && nowMin < endMin;
    const remainMin = happening ? endMin - nowMin : null;
    return (
      <div className={`item-row ${happening ? 'is-now' : ''}`} key={item.id}>
        <div className="time-col">
          {item.start_time}
          <small>{item.end_time}</small>
        </div>
        <div className="rail">
          <div className="rail-dot" style={{ borderColor: color }} />
        </div>
        <ItemCard
          item={item}
          dayColor={color}
          warns={byItem[item.id] ?? []}
          shots={item.poi_id ? (momentByPoi?.get(item.poi_id) ?? 0) : 0}
          happening={happening}
          remainMin={remainMin}
          onToggleLock={() => onToggleLock(item.id)}
          onSwap={() => onSwap(item.id)}
          onDelete={() => onDelete(item.id)}
          onOpenDetail={() => onOpenDetail(item.id)}
          onDragStart={(e) => {
            e.dataTransfer.setData('text/plain', item.id);
            e.dataTransfer.effectAllowed = 'move';
          }}
          onDrop={(e) => {
            const fromId = e.dataTransfer.getData('text/plain');
            if (fromId && fromId !== item.id) onMove(day.day_index, fromId, item.id);
          }}
        />
      </div>
    );
  }

  return (
    <section className="day" style={{ ['--day-color' as string]: color }}>
      <header className="day-head" onClick={() => { setCollapsed((v) => !v); onSelectDay(day.day_index); }}>
        <div className="day-index">DAY {String(day.day_index).padStart(2, '0')}</div>
        <div>
          <div className="day-date">
            {formatDateCN(day.date)} <span style={{ fontSize: 12, color: '#8a8377', marginLeft: 6 }}>{weekdayLabel(day.date)}</span>
          </div>
          {day.base_area && <div className="day-area">◍ {day.base_area.name}</div>}
          {(solar || isToday) && (
            <div className="day-solar">
              {isToday && <span className="day-now-tag">现在 {nowInfo?.hhmm}</span>}
              {solar && (
                <span title={`白昼 ${(solar.dayLengthMin / 60).toFixed(1)} 小时 · 黄金时刻 ${solar.goldenStart} 起`}>
                  <IconSun size={11} /> {solar.sunrise} 日出 · {solar.sunset} 日落
                </span>
              )}
            </div>
          )}
        </div>
        <div className="day-stats">
          <span>
            在外 <b>{(day.summary.active_min / 60).toFixed(1)}h</b>
          </span>
          <span>
            通勤 <b>{day.summary.transit_min}min</b>
          </span>
          <span>
            <b>{day.summary.poi_count}</b> 个点
          </span>
          <span>
            <b>{cnMoney(day.summary.cost.amount)}</b>
          </span>
          {warnCount > 0 && (
            <span className="day-warn">
              <IconAlert size={12} /> {warnCount}
            </span>
          )}
          <span style={{ transform: collapsed ? 'rotate(0deg)' : 'rotate(90deg)', transition: '0.2s' }}>
            <IconChevron size={13} />
          </span>
        </div>
      </header>

      {!collapsed && (
        <div className="items">
          {day.items.length === 0 && <div className="empty-day">这一天还没有安排</div>}
          {(() => {
            // 「现在」游标插在真实时刻应处的位置：第一个开始时间晚于现在的项之前
            let placed = false;
            const nowRow = (
              <div className="now-row" key="now-line">
                <div className="now-time">{nowInfo?.hhmm}</div>
                <div className="now-rail">
                  <span className="now-dot" />
                </div>
                <div className="now-label">现在</div>
              </div>
            );
            const rows = day.items.map((item) => {
              const insertNow = nowMin != null && !placed && nowMin < toMin(item.start_time);
              if (insertNow) placed = true;
              const body = renderRow(item);
              return insertNow ? (
                <Fragment key={`wrap-${item.id}`}>
                  {nowRow}
                  {body}
                </Fragment>
              ) : (
                body
              );
            });
            return (
              <>
                {rows}
                {nowMin != null && !placed && nowRow}
              </>
            );
          })()}
          <div className="tiny muted" style={{ marginTop: 8, paddingLeft: 72 }}>
            {transitCount} 段通勤由程序计算 · 可拖动卡片调整顺序
          </div>
        </div>
      )}
    </section>
  );
}

export default function Timeline(props: Props) {
  const { itinerary, warnings, activeDay, onSelectDay } = props;
  const totalWarnings = warnings.length;
  return (
    <div>
      <div className="timeline-head">
        <div>
          <h2>
            {itinerary.meta.destination} · {itinerary.days.length} 天行程
          </h2>
          <p>
            {itinerary.variant_label ? `${itinerary.variant_label} · ` : ''}
            版本 v{itinerary.version} · {totalWarnings} 条校验结果 · 时间轴由程序累加
          </p>
        </div>
        <div className="tiny muted mono">#{itinerary.id.slice(-18)}</div>
      </div>
      {itinerary.days.map((day) => (
        <DayBlock
          key={day.day_index}
          day={day}
          warns={warnings.filter((w) => w.day_index === day.day_index || w.item_ids.some((id) => day.items.some((i) => i.id === id)))}
          collapsedDefault={false}
          onToggleLock={props.onToggleLock}
          onSwap={props.onSwap}
          onDelete={props.onDelete}
          onMove={props.onMove}
          onSelectDay={onSelectDay}
          onOpenDetail={props.onOpenDetail}
          momentByPoi={props.momentByPoi}
          nowInfo={props.nowInfo}
          tzOffsetMin={props.tzOffsetMin}
          active={activeDay === day.day_index}
        />
      ))}
    </div>
  );
}
