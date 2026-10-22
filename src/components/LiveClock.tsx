import { useMemo } from 'react';
import type { Itinerary } from '../domain/schema';
import { clockInTz, tripPhase } from '../domain/time';
import { solarTimes } from '../domain/solar';
import { IconClock } from './icons';

interface Props {
  now: Date;
  itinerary: Itinerary | null;
  /** 是否已跟服务器对过表 */
  synced: boolean;
  /** 与服务器的偏差（毫秒） */
  driftMs: number;
}

/**
 * 顶栏的现实时钟。
 *
 * 三件事：现在几点（每秒跳）、行程走到第几天、目的地此刻几点/几点天黑。
 * 跟服务器对过表会显示一个实心点；没对上（服务没开）就用本机钟，点变空。
 */
export default function LiveClock({ now, itinerary, synced, driftMs }: Props) {
  const localTz = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return 'Asia/Shanghai';
    }
  }, []);

  const destTz = itinerary?.meta.timezone ?? localTz;
  const local = clockInTz(now, localTz);
  const dest = clockInTz(now, destTz);
  const crossTz = dest.offsetMin !== local.offsetMin;

  const phase = itinerary ? tripPhase(itinerary.meta.start_date, itinerary.meta.end_date, local.date) : null;
  const phaseText =
    phase?.phase === 'before'
      ? `距出发 ${phase.days} 天`
      : phase?.phase === 'during'
        ? `行程第 ${phase.dayIndex} 天`
        : phase?.phase === 'after'
          ? `已结束 ${phase.days} 天`
          : null;

  // 今天在行程里才有意义
  const today = itinerary?.days.find((d) => d.date === dest.date) ?? null;
  const solar = today?.base_area
    ? solarTimes(today.date, today.base_area.lat, today.base_area.lng, dest.offsetMin)
    : null;

  const title = [
    `现在是 ${local.date} ${local.hhmmss}（${localTz}）`,
    synced ? `已与本地服务对表，本机偏差 ${driftMs > 0 ? '+' : ''}${driftMs} ms` : '没连上本地服务，用的是本机时间',
    crossTz ? `目的地 ${destTz} 此刻 ${dest.hhmm}` : null,
    solar ? `今天日落 ${solar.sunset}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  return (
    <div className={`live-clock ${synced ? 'is-synced' : ''}`} title={title}>
      <IconClock size={13} />
      <b>{local.hhmm}</b>
      <span className="lc-sec">{local.hhmmss.slice(6)}</span>
      <span className="lc-wd">{local.weekday}</span>
      {phaseText && <span className={`lc-phase ${phase?.phase ?? ''}`}>{phaseText}</span>}
      {crossTz && (
        <span className="lc-dest">
          当地 {dest.hhmm}
          <i>{destTz.split('/').pop()?.replace(/_/g, ' ')}</i>
        </span>
      )}
      {solar && phase?.phase === 'during' && <span className="lc-sun">日落 {solar.sunset}</span>}
    </div>
  );
}
