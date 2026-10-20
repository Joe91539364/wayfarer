import { useState } from 'react';
import { TICKET_LINKS, estimateLegs, fmtHours, fmtMoney, planIntercity } from '../domain/intercity';
import { copyText } from '../domain/taxi';
import { IconAlert, IconArrow, IconCar, IconCheck } from './icons';

interface Props {
  origin: string;
  originPoint: { lat: number; lng: number } | null;
  destName: string;
  destPoint: { lat: number; lng: number } | null;
  startDate: string;
  travelers: number;
  onToast: (msg: string) => void;
}

/**
 * 城际交通卡。
 *
 * 回答三件事：怎么去、要多久、在哪买票。
 * 时长和票价都是估算（高铁 200km/h、飞机 700km/h、自驾 85km/h），
 * 界面上写明了「估算」，不假装是实时票价。
 */
export default function IntercityCard(props: Props) {
  const { origin, originPoint, destName, destPoint, startDate, travelers, onToast } = props;
  const [copied, setCopied] = useState<string | null>(null);

  if (!origin) {
    return (
      <div className="ic-card is-missing">
        <div className="ic-head">
          <b>怎么去 {destName}</b>
          <span className="ic-badge">缺出发地</span>
        </div>
        <p className="ic-note">
          <IconAlert size={11} /> 你没说从哪里出发，所以这里算不了交通。在输入框里补一句「从XX出发」，
          或者说「我出发地是XX」，City 会重新算。
        </p>
      </div>
    );
  }

  if (!originPoint || !destPoint) {
    const km = 0;
    return (
      <div className="ic-card">
        <div className="ic-head">
          <b>
            {origin} → {destName}
          </b>
          <span className="ic-badge warn">坐标缺失</span>
        </div>
        <p className="ic-note">
          <IconAlert size={11} /> 拿不到「{originPoint ? destName : origin}」的坐标（需要本地服务在线），
          交通估算暂时跳过。{km}
        </p>
      </div>
    );
  }

  const plan = planIntercity({ name: origin, ...originPoint }, { name: destName, ...destPoint }, travelers);
  if (!plan) return null;
  const legs = plan.legs;

  return (
    <div className="ic-card">
      <div className="ic-head">
        <div>
          <b>
            {origin} → {destName}
          </b>
          <span className="ic-sub">
            直线 {plan.km} km · {travelers} 人 · 建议第 1 天 {plan.firstDayStart} 开始逛
          </span>
        </div>
        <span className="ic-badge">估算</span>
      </div>

      <div className="ic-legs">
        {legs.map((l) => (
          <div key={l.mode} className={`ic-leg ${l.fit}`}>
            <div className="ic-leg-top">
              <b>{l.label}</b>
              {l.fit === 'best' && <span className="ic-best">推荐</span>}
              <span className="ic-hours">{fmtHours(l.hours)}</span>
            </div>
            <div className="ic-leg-price">
              {fmtMoney(l.priceLow)} – {fmtMoney(l.priceHigh)}
              <span>/{travelers} 人</span>
            </div>
            <div className="ic-leg-note">{l.note}</div>
          </div>
        ))}
      </div>

      <div className="ic-links">
        {TICKET_LINKS.map((t) => (
          <div key={t.id} className="ic-link-row">
            <span className="ic-link-name">
              <i style={{ background: t.color }} />
              {t.name}
            </span>
            <span className="ic-link-note">{t.note}</span>
            <div className="ic-link-actions">
              {t.copy && (
                <button
                  className="btn btn-sm"
                  onClick={async () => {
                    const ok = await copyText(t.copy!(plan, startDate));
                    setCopied(ok ? t.id : null);
                    onToast(ok ? `已复制「${t.copy!(plan, startDate)}」` : '复制失败，手动输入吧');
                    window.setTimeout(() => setCopied(null), 1600);
                  }}
                >
                  {copied === t.id ? <IconCheck size={11} /> : <IconCar size={11} />}
                  {copied === t.id ? '已复制' : '复制行程'}
                </button>
              )}
              <a className="btn btn-sm btn-accent" href={t.url(plan, startDate)} target="_blank" rel="noreferrer">
                打开 <IconArrow size={10} />
              </a>
            </div>
          </div>
        ))}
      </div>

      <p className="ic-fine">
        高铁按 200km/h、飞机按 700km/h（含 2 小时候机）、自驾按 85km/h 估算，票价取常见区间。
        真实班次和余票要去 12306 / 航司查 —— 这几个平台都没有公开的「城市对+日期」深链，所以只给检索入口 + 复制。
      </p>
    </div>
  );
}
