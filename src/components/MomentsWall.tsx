import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Itinerary } from '../domain/schema';
import { MAX_STARS, groupByDay, letterHtml, momentStats, type Moment } from '../domain/moments';
import { humanSize, momentUrl, uploadMoment, patchMoment, deleteMoment } from '../data/moments';
import { IconChevron, IconHeart, IconPlus, IconTrash, IconUpload, IconX } from './icons';

interface Props {
  open: boolean;
  onClose: () => void;
  itinerary: Itinerary | null;
  /** 打开时默认归到哪一天 */
  activeDay: number;
  moments: Moment[];
  /** 有增删改后回调，父组件刷新 Dock 上的数字 */
  onChanged: () => void;
  onToast: (msg: string) => void;
}

/**
 * 「幸福时刻」—— 把这次旅行的照片按天挂回行程上。
 *
 * 不做通用相册，理由很简单：相册里那些照片你也不会再看第二遍。
 * 这里每张图都必须回答两个问题 —— 哪天拍的、当时有多开心，
 * 因为它的用途是「把这一趟复习一遍」，不是存图。
 *
 * 照片全程只落本机 data/moments/，一个字都不上云。
 */
export default function MomentsWall({ open, onClose, itinerary, activeDay, moments, onChanged, onToast }: Props) {
  const [busy, setBusy] = useState<{ done: number; total: number } | null>(null);
  const [drag, setDrag] = useState(false);
  const [peek, setPeek] = useState<number | null>(null);
  const [pickDay, setPickDay] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  // 父组件每次渲染都会传新的 onClose / onToast，放进依赖会让副作用反复重挂
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const toastRef = useRef(onToast);
  toastRef.current = onToast;

  const mine = useMemo(
    () => moments.filter((m) => !itinerary || m.trip_id === itinerary.id),
    [moments, itinerary],
  );
  const groups = useMemo(() => groupByDay(mine, itinerary), [mine, itinerary]);
  const st = useMemo(() => momentStats(mine), [mine]);
  const flat = useMemo(() => groups.flatMap((g) => g.items), [groups]);
  const totalBytes = useMemo(() => mine.reduce((s, m) => s + (m.size || 0), 0), [mine]);

  // 刚打开时把归属日对齐到当前正在看的那一天
  useEffect(() => {
    if (open) setPickDay(activeDay || 1);
  }, [open, activeDay]);

  const uploadFiles = useCallback(
    async (files: File[]) => {
      const imgs = files.filter((f) => f.type.startsWith('image/'));
      if (!imgs.length) {
        toastRef.current('只认图片，别的格式先放一边');
        return;
      }
      setBusy({ done: 0, total: imgs.length });
      let ok = 0;
      let lastErr = '';
      for (let i = 0; i < imgs.length; i += 1) {
        try {
          await uploadMoment(imgs[i], {
            trip_id: itinerary?.id ?? null,
            // 出发前就拖进来的照片没有「第几天」，先留空，之后可以再归
            day: itinerary ? (pickDay ?? activeDay ?? 1) : null,
            // 文件的修改时间比「现在」更接近真实拍摄时间
            taken_at: new Date(imgs[i].lastModified || Date.now()).toISOString(),
          });
          ok += 1;
        } catch (e) {
          lastErr = e instanceof Error ? e.message : String(e);
        }
        setBusy({ done: i + 1, total: imgs.length });
      }
      setBusy(null);
      if (ok) onChanged();
      toastRef.current(ok ? `存下 ${ok} 张，只在这台设备上` : `没存上：${lastErr || '未知原因'}`);
    },
    [itinerary, pickDay, activeDay, onChanged],
  );

  const uploadRef = useRef(uploadFiles);
  uploadRef.current = uploadFiles;

  // 截图后直接 Ctrl+V 最顺手，不用先去存成文件
  useEffect(() => {
    if (!open) return;
    const onPaste = (e: ClipboardEvent) => {
      const files = Array.from(e.clipboardData?.files ?? []);
      if (!files.some((f) => f.type.startsWith('image/'))) return;
      e.preventDefault();
      void uploadRef.current(files);
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [open]);

  // Esc：先关大图，再关面板
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPeek((p) => (p == null ? p : null));
        if (peek == null) closeRef.current();
      }
      if (peek != null && e.key === 'ArrowRight') setPeek((p) => (p == null ? p : Math.min(flat.length - 1, p + 1)));
      if (peek != null && e.key === 'ArrowLeft') setPeek((p) => (p == null ? p : Math.max(0, p - 1)));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, peek, flat.length]);

  const patch = async (id: string, p: Parameters<typeof patchMoment>[1]) => {
    try {
      await patchMoment(id, p);
      onChanged();
    } catch (e) {
      toastRef.current(e instanceof Error ? e.message : '改不动');
    }
  };

  const drop = async (id: string) => {
    if (!window.confirm('删掉这一张？本机上的文件会一起删掉，找不回来。')) return;
    const ok = await deleteMoment(id);
    toastRef.current(ok ? '删掉了' : '删不掉，服务可能没起来');
    if (ok) onChanged();
  };

  if (!open) return null;

  const dayOptions = itinerary?.days.map((d) => d.day_index) ?? [1, 2, 3];
  const current = peek != null ? flat[peek] : null;

  /** 那天行程里的点位，用来回答「这张是在哪拍的」 */
  const spotsOf = (day: number) =>
    itinerary?.days.find((d) => d.day_index === day)?.items.filter((i) => i.poi_id && i.type !== 'transit') ?? [];

  const setPoi = async (m: Moment, poiId: string, poiName: string) => {
    // 再点一次同一处 = 取消（用空串而不是 undefined —— JSON 里 undefined 会被丢掉，服务端收不到）
    const next =
      m.poi_id === poiId ? { poi_id: '', poi_name: '' } : { poi_id: poiId, poi_name: poiName };
    try {
      await patchMoment(m.id, next);
      onChanged();
    } catch (e) {
      toastRef.current(e instanceof Error ? e.message : '改不动');
    }
  };

  const openLetter = () => {
    if (!flat.length) {
      toastRef.current('一张照片都还没有，先拖几张进来');
      return;
    }
    const html = letterHtml(itinerary, groups, window.location.origin);
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
    const w = window.open(url, '_blank');
    if (!w) toastRef.current('浏览器拦了新窗口，允许弹窗后再点一次');
    else toastRef.current('回忆长页开在新标签页，Ctrl+P 可以存成 PDF');
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  return (
    <>
      <div
        className="overlay"
        onClick={onClose}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={(e) => {
          // 拖到子元素上也会触发 leave，只有真的出界才取消高亮
          if (e.currentTarget.contains(e.relatedTarget as Node)) return;
          setDrag(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          void uploadFiles(Array.from(e.dataTransfer.files ?? []));
        }}
      >
        <div className={`modal mm-modal ${drag ? 'is-drag' : ''}`} onClick={(e) => e.stopPropagation()}>
          <div className="modal-head">
            <div>
              <h3>
                幸福时刻 <i className="mm-count">{mine.length}</i>
              </h3>
              <p className="tiny muted">
                {itinerary
                  ? `${itinerary.meta.destination} · 按天挂回行程，回头能整趟复习一遍`
                  : '先规划一趟行程，照片就能按天归位'}
              </p>
            </div>
            <div className="mm-head-actions">
            <button className="btn btn-ghost btn-sm" onClick={openLetter} title="按天排好，可打印成 PDF">
              回忆长页
            </button>
            <button className="btn btn-sm" onClick={() => fileRef.current?.click()} disabled={Boolean(busy)}>
              <IconPlus size={13} /> 添加照片
            </button>
            <button className="icon-btn" onClick={onClose} title="关闭">
              <IconX size={15} />
            </button>
          </div>
        </div>

        <div className="modal-body mm-body">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              e.target.value = '';
              if (files.length) void uploadFiles(files);
            }}
          />

          <div className="mm-bar">
            <div className="mm-bar-l">
              <span className="mm-stat">
                <b>{st.count}</b> 个时刻
              </span>
              <span className="mm-stat">
                幸福指数 <b>{st.avg || '—'}</b>
                <em>{st.word}</em>
              </span>
              <span className="mm-stat">
                <b>{groups.filter((g) => g.day != null).length}</b> 天有记录
              </span>
              <span className="mm-stat mm-dim">共 {humanSize(totalBytes)}</span>
            </div>
            {itinerary && (
              <label className="mm-pick">
                新照片归到
                <select value={pickDay ?? ''} onChange={(e) => setPickDay(e.target.value ? Number(e.target.value) : null)}>
                  {dayOptions.map((d) => (
                    <option key={d} value={d}>
                      第 {d} 天
                    </option>
                  ))}
                  <option value="">先不归</option>
                </select>
              </label>
            )}
          </div>

          <div
            className="mm-drop"
            onClick={() => fileRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') fileRef.current?.click();
            }}
          >
            {busy ? (
              <>
                <span className="mm-ring" />
                <b>
                  正在存 {busy.done}/{busy.total}
                </b>
                <span className="tiny muted">压缩到长边 1600 再落盘，不会糊</span>
              </>
            ) : (
              <>
                <IconUpload size={18} />
                <b>把照片拖进来，或者点这里选</b>
                <span className="tiny muted">也可以截图后直接 Ctrl+V · 原图只存本机，不上传云端</span>
              </>
            )}
          </div>

          {groups.length === 0 && !busy && (
            <div className="mm-empty">
              <p>旅行里最值得记住的，往往不是景点本身。</p>
              <p className="tiny muted">
                是那碗面端上来的一刻、是走错路却撞见的巷子、是同行的人笑到说不出话的样子。
                拍下来，写一句，它就留在这趟行程的第几天上了。
              </p>
            </div>
          )}

          {groups.map((g) => (
            <section className="mm-day" key={g.day ?? 'loose'}>
              <header>
                <span className="mm-day-no">{g.title}</span>
                {g.area && <span className="mm-day-area">{g.area}</span>}
                {g.date && <span className="mm-day-date">{g.date}</span>}
                <span className="mm-day-n">{g.items.length} 张</span>
              </header>
              <div className="mm-grid">
                {g.items.map((m) => (
                  <MomentCard
                    key={m.id}
                    m={m}
                    dayOptions={dayOptions}
                    hasIti={Boolean(itinerary)}
                    onPatch={(p) => void patch(m.id, p)}
                    onDelete={() => void drop(m.id)}
                    onPeek={() => setPeek(flat.findIndex((x) => x.id === m.id))}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="modal-foot">
          <span className="tiny muted">
            幸福指数点一下就能改 · 照片存在 data/moments/，删了就是真没了
          </span>
        </div>
        </div>
      </div>

      {/* 大图放在 overlay 外面：overlay 有 backdrop-filter，会把 fixed 子元素关进它自己的盒子 */}
      {current && (
        <div className="mm-peek" onClick={(e) => { e.stopPropagation(); setPeek(null); }}>
          <button
            className="mm-peek-nav prev"
            onClick={(e) => {
              e.stopPropagation();
              setPeek((p) => (p == null ? p : Math.max(0, p - 1)));
            }}
            disabled={peek === 0}
            title="上一张"
          >
            <IconChevron size={18} style={{ transform: 'rotate(180deg)' }} />
          </button>
          <figure onClick={(e) => e.stopPropagation()}>
            <img src={momentUrl(current)} alt={current.caption || '旅途照片'} />
            <figcaption>
              <span className="mm-peek-cap">
                {current.caption || <i>这一张没写字</i>}
                {current.poi_name ? ` · ${current.poi_name}` : ''}
              </span>
              <span className="mm-peek-meta">
                {current.day != null ? `第 ${current.day} 天 · ` : ''}
                {new Date(current.taken_at).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
              {current.day != null && spotsOf(current.day).length > 0 && (
                <span className="mm-peek-pois">
                  <em>当时在</em>
                  {spotsOf(current.day).map((it) => (
                    <button
                      key={it.id}
                      className={current.poi_id === it.poi_id ? 'on' : ''}
                      onClick={() => void setPoi(current, it.poi_id as string, it.name)}
                      title={current.poi_id === it.poi_id ? '再点一次取消' : `标记在${it.name}拍的`}
                    >
                      {it.name}
                    </button>
                  ))}
                </span>
              )}
            </figcaption>
          </figure>
          <button
            className="mm-peek-nav next"
            onClick={(e) => {
              e.stopPropagation();
              setPeek((p) => (p == null ? p : Math.min(flat.length - 1, p + 1)));
            }}
            disabled={peek === flat.length - 1}
            title="下一张"
          >
            <IconChevron size={18} />
          </button>
        </div>
      )}
    </>
  );
}

function MomentCard({
  m,
  dayOptions,
  hasIti,
  onPatch,
  onDelete,
  onPeek,
}: {
  m: Moment;
  dayOptions: number[];
  hasIti: boolean;
  onPatch: (p: { caption?: string; stars?: number; day?: number | null }) => void;
  onDelete: () => void;
  onPeek: () => void;
}) {
  const [cap, setCap] = useState(m.caption);
  const [broken, setBroken] = useState(false);

  // 别人（或另一台窗）改了同一张，输入框要跟上
  useEffect(() => setCap(m.caption), [m.caption]);

  return (
    <figure className="mm-card">
      <button className="mm-shot" onClick={onPeek} title="点开看大图">
        {broken ? (
          <span className="mm-shot-bad">这张格式浏览器解不开</span>
        ) : (
          <img src={momentUrl(m)} alt={m.caption || '旅途照片'} loading="lazy" onError={() => setBroken(true)} />
        )}
        <span className="mm-shot-hh">
          {Array.from({ length: MAX_STARS }, (_, i) => (
            <IconHeart key={i} size={11} className={i < m.stars ? 'on' : 'off'} />
          ))}
        </span>
      </button>

      <input
        className="mm-cap"
        value={cap}
        maxLength={80}
        placeholder="这一张，当时在想什么？"
        onChange={(e) => setCap(e.target.value)}
        onBlur={() => {
          if (cap.trim() !== m.caption) onPatch({ caption: cap.trim() });
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        }}
      />

      <div className="mm-foot">
        <span className="mm-stars" title="幸福指数">
          {Array.from({ length: MAX_STARS }, (_, i) => (
            <button
              key={i}
              className={i < m.stars ? 'on' : 'off'}
              onClick={() => onPatch({ stars: i + 1 })}
              title={`${i + 1} 颗心`}
              aria-label={`幸福指数 ${i + 1}`}
            >
              <IconHeart size={13} />
            </button>
          ))}
        </span>

        {hasIti && (
          <select
            className="mm-day-sel"
            value={m.day ?? ''}
            onChange={(e) => onPatch({ day: e.target.value ? Number(e.target.value) : null })}
            title="归到第几天"
          >
            {dayOptions.map((d) => (
              <option key={d} value={d}>
                第{d}天
              </option>
            ))}
            <option value="">未归</option>
          </select>
        )}

        <button className="icon-btn mm-del" onClick={onDelete} title="删除这张">
          <IconTrash size={13} />
        </button>
      </div>
    </figure>
  );
}
