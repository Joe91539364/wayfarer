import type { PlatformGate, PlatformReview } from '../data/catalog';
import { PLATFORMS } from '../data/catalog';
import { formatAgo } from '../hooks/useOfficialFeed';
import { IconAlert, IconArrow, IconCheck } from './icons';

interface Props {
  reviews: PlatformReview[];
  gates: PlatformGate[];
  poiName: string;
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

const STATUS_CN: Record<PlatformReview['status'], string> = {
  ok: '已接入',
  need_key: '需 Key',
  need_auth: '需授权',
  blocked: '被拒',
  empty: '无正文',
};

/**
 * 多平台评价板。
 *
 * 每一格都回答三个问题：谁说的（平台）、说了什么（评分/条数/正文）、
 * 为什么这里是空的（未授权 / 无公开接口 / 服务端拿不到）。
 *
 * 拿不到的就直说，绝不用其它平台的数据冒充。
 */
export default function ReviewBoard({ reviews, gates, poiName }: Props) {
  const gateOf = (id: string) => gates.find((g) => g.platform === id);
  const reviewOf = (id: string) => reviews.find((r) => r.platform === id);

  return (
    <section className="d-card review-board">
      <div className="d-card-head">
        <h3>各平台怎么说</h3>
        <span className="tiny muted">评分来自官方 API 或授权导出，正文不编造</span>
      </div>

      <div className="rb-grid">
        {PLATFORMS.map((p) => {
          const r = reviewOf(p.id);
          const gate = gateOf(p.id);
          const status = r?.status ?? gate?.status ?? (p.access === 'local' ? 'ok' : 'need_auth');
          const ok = status === 'ok' && (r?.score != null || r?.samples?.length);
          const note = r?.note ?? gate?.note ?? p.note;

          return (
            <div key={p.id} className={`rb-card ${ok ? 'is-ok' : ''}`}>
              <div className="rb-head">
                <span className="rb-mark" style={{ background: p.color }}>
                  {p.short.slice(0, 1)}
                </span>
                <div className="rb-name">
                  <b>{p.name}</b>
                  <span className={`rb-badge ${status}`}>{STATUS_CN[status]}</span>
                </div>
                {r?.url && (
                  <a className="rb-link" href={r.url} target="_blank" rel="noreferrer">
                    <IconArrow size={11} />
                  </a>
                )}
              </div>

              {r?.score != null ? (
                <div className="rb-score">
                  <b>{r.score.toFixed(1)}</b>
                  <div>
                    <Stars value={r.score} />
                    <small>
                      {r.count != null ? `${r.count.toLocaleString('zh-CN')} 条点评` : '条数未公开'}
                      {r.at ? ` · ${formatAgo(r.at)}` : ''}
                    </small>
                  </div>
                </div>
              ) : (
                <div className="rb-empty">
                  <IconAlert size={11} />
                  <span>{note}</span>
                </div>
              )}

              {r?.samples && r.samples.length > 0 && (
                <ul className="rb-samples">
                  {r.samples.slice(0, 3).map((s, i) => (
                    <li key={i}>
                      <div className="rb-sample-meta">
                        <span>{s.author ?? '匿名'}</span>
                        {s.date && <span>{s.date}</span>}
                        {s.score != null && <span className="rb-sample-score">{s.score} 分</span>}
                      </div>
                      <p>{s.text}</p>
                    </li>
                  ))}
                </ul>
              )}

              {r?.score != null && r.samples?.length === 0 && (
                <div className="rb-foot">
                  <IconCheck size={10} />
                  <span>该平台只开放评分与条数，正文需授权</span>
                </div>
              )}

              {!ok && (
                <div className="rb-howto">
                  <span>{p.howto}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="d-note">
        <IconAlert size={11} />
        {poiName} 的评价分平台展示，不同平台的口径、样本量、刷分情况都不一样，不要混着平均。
      </p>
    </section>
  );
}
