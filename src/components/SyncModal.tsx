import { useEffect, useState } from 'react';
import type { Itinerary } from '../domain/schema';
import { buildIcs, downloadFile, encodeItinerary, itineraryToText } from '../utils/share';
import { IconCheck, IconDownload, IconUpload, IconX } from './icons';

interface Props {
  open: boolean;
  onClose: () => void;
  itinerary: Itinerary;
  onToast: (msg: string) => void;
}

type Tab = 'calendar' | 'link' | 'text';

export default function SyncModal({ open, onClose, itinerary, onToast }: Props) {
  const [tab, setTab] = useState<Tab>('calendar');
  const [link, setLink] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCopied(false);
    let alive = true;
    setBusy(true);
    encodeItinerary(itinerary)
      .then((token) => {
        if (!alive) return;
        const base = `${location.origin}${location.pathname}`;
        setLink(`${base}#plan=${token}`);
      })
      .finally(() => alive && setBusy(false));
    return () => {
      alive = false;
    };
  }, [open, itinerary]);

  if (!open) return null;

  const text = itineraryToText(itinerary);
  const isFile = location.protocol === 'file:';

  async function copy(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      onToast(`${label}已复制`);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      onToast('浏览器拒绝了剪贴板权限，请手动选中复制');
    }
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" style={{ width: 'min(720px, 100%)' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <h3>同步到你的日程</h3>
            <div className="tiny muted" style={{ marginTop: 2 }}>
              三种方式：导进日历、发一条链接、复制成文字。都不需要登录。
            </div>
          </div>
          <button className="icon-btn" onClick={onClose}>
            <IconX size={16} />
          </button>
        </div>

        <div className="tabs" style={{ margin: '12px 18px 0' }}>
          <button className={`tab ${tab === 'calendar' ? 'active' : ''}`} onClick={() => setTab('calendar')}>
            日历
          </button>
          <button className={`tab ${tab === 'link' ? 'active' : ''}`} onClick={() => setTab('link')}>
            分享链接
          </button>
          <button className={`tab ${tab === 'text' ? 'active' : ''}`} onClick={() => setTab('text')}>
            纯文本
          </button>
        </div>

        <div className="modal-body">
          {tab === 'calendar' && (
            <>
              <div className="sync-hero">
                <IconDownload size={18} />
                <div>
                  <b>下载 .ics，导入任何日历</b>
                  <p>每条行程都带「提前 30 分钟」提醒，导入后手机上会自动通知。</p>
                </div>
                <button
                  className="btn btn-accent"
                  onClick={() => {
                    downloadFile(`${itinerary.meta.destination}-行程.ics`, buildIcs(itinerary), 'text/calendar');
                    onToast('已下载 .ics，接着导入日历即可');
                  }}
                >
                  下载 .ics
                </button>
              </div>
              <div className="sync-steps">
                <div>
                  <span className="step-no">1</span>
                  <b>Google 日历</b>
                  <p>网页版「设置 → 导入和导出 → 导入」，选刚下载的 .ics。</p>
                </div>
                <div>
                  <span className="step-no">2</span>
                  <b>Apple 日历 / iPhone</b>
                  <p>双击 .ics 即可加入；手机上用「文件」打开后选「添加到日历」。</p>
                </div>
                <div>
                  <span className="step-no">3</span>
                  <b>Outlook</b>
                  <p>「文件 → 打开和导出 → 导入/导出」，选「从 iCalendar 导入」。</p>
                </div>
              </div>
              <p className="d-note" style={{ marginTop: 12 }}>
                时区固定为 Asia/Shanghai，全天时间按行程里的本地时间写入，不做换算。
              </p>
            </>
          )}

          {tab === 'link' && (
            <>
              <div className="sync-hero">
                <IconUpload size={18} />
                <div>
                  <b>把整份行程塞进一条链接</b>
                  <p>数据压缩后放在 # 后面，不经过任何服务器；对方打开就是可交互的行程。</p>
                </div>
                <button className="btn btn-accent" onClick={() => copy(link, '链接')} disabled={busy || !link}>
                  {copied ? <IconCheck size={13} /> : null}
                  {copied ? '已复制' : '复制链接'}
                </button>
              </div>
              <textarea readOnly value={busy ? '正在压缩…' : link} rows={4} className="sync-link" />
              <div className="sync-meta">
                <span>链接长度 {(link.length / 1024).toFixed(1)} KB</span>
                <span>压缩方式 deflate-raw + base64url</span>
                {isFile && <span className="warn-text">当前用本地文件打开，链接只在同一台电脑有效</span>}
              </div>
              <p className="d-note">
                链接里包含完整行程（含可行性凭证）。行程改动后要重新复制一次，旧链接不会自动更新。
              </p>
            </>
          )}

          {tab === 'text' && (
            <>
              <div className="sync-hero">
                <IconDownload size={18} />
                <div>
                  <b>复制成文字</b>
                  <p>适合发到微信、备忘录，或者贴进聊天让朋友看。</p>
                </div>
                <button className="btn btn-accent" onClick={() => copy(text, '行程文本')}>
                  {copied ? <IconCheck size={13} /> : null}
                  {copied ? '已复制' : '复制文字'}
                </button>
              </div>
              <textarea readOnly value={text} rows={14} className="sync-link" />
            </>
          )}
        </div>

        <div className="modal-foot">
          <span className="tiny muted">导入或分享都不会改变当前这份行程。</span>
          <button className="btn btn-sm" style={{ marginLeft: 'auto' }} onClick={onClose}>
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
