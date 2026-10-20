import { useMemo, useState } from 'react';
import { addUserComment, deleteUserComment, loadLiked, loadUserComments, saveLiked, seedComments, type PoiComment } from '../data/comments';
import { IconTrash } from './icons';

interface Props {
  poiId: string;
  poiName: string;
  category: string;
}

function Stars({ value, onChange, size = 13 }: { value: number; onChange?: (v: number) => void; size?: number }) {
  return (
    <span className="stars">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          className={`star ${i <= value ? 'on' : ''}`}
          style={{ fontSize: size }}
          onClick={onChange ? () => onChange(i) : undefined}
          disabled={!onChange}
        >
          ★
        </button>
      ))}
    </span>
  );
}

export default function CommentSection({ poiId, poiName, category }: Props) {
  const seeds = useMemo(() => seedComments(poiId, poiName, category), [poiId, poiName, category]);
  const [mine, setMine] = useState<PoiComment[]>(() => loadUserComments(poiId));
  const [liked, setLiked] = useState<string[]>(() => loadLiked());
  const [text, setText] = useState('');
  const [rating, setRating] = useState(5);

  // 兼容历史数据：老版本存下来的评论可能没有 author 字段
  const all = [...mine, ...seeds].map((c) => ({ ...c, author: c.author || '匿名旅行者' }));
  const avg = all.length ? all.reduce((s, c) => s + c.rating, 0) / all.length : 0;

  function submit() {
    if (!text.trim()) return;
    const c = addUserComment(poiId, text.trim(), rating);
    setMine((prev) => [c, ...prev]);
    setText('');
    setRating(5);
  }

  function toggleLike(id: string) {
    const next = liked.includes(id) ? liked.filter((x) => x !== id) : [...liked, id];
    setLiked(next);
    saveLiked(next);
  }

  return (
    <section className="comment-box">
      <div className="comment-head">
        <div>
          <h3>评论区</h3>
          <p>
            {all.length} 条 · 平均 {avg.toFixed(1)} 分
            <span className="muted">（示例评论为本地生成，你的评论只存在本机）</span>
          </p>
        </div>
        <div className="comment-avg">
          <b>{avg.toFixed(1)}</b>
          <Stars value={Math.round(avg)} />
        </div>
      </div>

      <div className="comment-form">
        <div className="comment-form-top">
          <span className="tiny muted">打个分</span>
          <Stars value={rating} onChange={setRating} size={16} />
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`说说 ${poiName} 的实际情况：人多不多、值不值得、有什么坑`}
          rows={3}
        />
        <div className="comment-form-foot">
          <span className="tiny muted">{text.length} / 300</span>
          <button className="btn btn-accent btn-sm" onClick={submit} disabled={!text.trim()}>
            发表评论
          </button>
        </div>
      </div>

      <div className="comment-list">
        {all.map((c) => (
          <article className="comment" key={c.id}>
            <div className="comment-avatar" style={{ background: c.mine ? 'var(--accent)' : undefined }}>
              {(c.author || '匿').slice(0, 1)}
            </div>
            <div className="comment-body">
              <div className="comment-meta">
                <b>{c.author}</b>
                {c.mine && <span className="chip accent" style={{ padding: '1px 6px' }}>我</span>}
                <Stars value={c.rating} size={11} />
                <span className="tiny muted">{c.date}</span>
                <div className="comment-tools">
                  <button className={`comment-like ${liked.includes(c.id) ? 'on' : ''}`} onClick={() => toggleLike(c.id)}>
                    ♡ {c.likes + (liked.includes(c.id) ? 1 : 0)}
                  </button>
                  {c.mine && (
                    <button
                      className="icon-btn"
                      title="删除"
                      onClick={() => {
                        deleteUserComment(poiId, c.id);
                        setMine((prev) => prev.filter((x) => x.id !== c.id));
                      }}
                    >
                      <IconTrash size={12} />
                    </button>
                  )}
                </div>
              </div>
              <p>{c.text}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
