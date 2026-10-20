import { useEffect, useState } from 'react';
import type { ImportResult } from '../agent/importer';
import { sampleImportText } from '../agent/importer';
import { IconAlert, IconUpload, IconX } from './icons';

interface Props {
  open: boolean;
  onClose: () => void;
  onImport: (text: string) => void;
  result: ImportResult | null;
  onAdopt: () => void;
}

export default function ImportModal({ open, onClose, onImport, result, onAdopt }: Props) {
  const [text, setText] = useState(sampleImportText());

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <h3>导入一份现成行程</h3>
            <div className="tiny muted" style={{ marginTop: 2 }}>
              粘贴攻略文本或朋友发来的行程，系统会反查 POI、重算通勤，并告诉你原计划哪里走不通
            </div>
          </div>
          <button className="icon-btn" onClick={onClose}>
            <IconX size={16} />
          </button>
        </div>
        <div className="modal-body">
          <textarea value={text} onChange={(e) => setText(e.target.value)} spellCheck={false} />
          <div className="tiny muted" style={{ marginTop: 6 }}>
            支持格式：<code>Day 1</code> / <code>第1天</code> 分天，<code>09:00 宽窄巷子 120分钟</code> 或 <code>09:00-11:00 武侯祠</code>
          </div>
          {result && (
            <div className="import-report">
              <div className="report-row">
                <b>解析结果</b>
                <span>
                  {result.report.days} 天 · 识别 {result.report.total} 条 · 匹配 {result.report.matched} 条
                </span>
              </div>
              {result.report.unmatched.length > 0 && (
                <div className="report-row">
                  <b>未匹配</b>
                  <div className="report-list">
                    {result.report.unmatched.map((u, i) => (
                      <span className="chip" key={i}>
                        {u.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div className="report-row" style={{ alignItems: 'flex-start' }}>
                <b>发现问题</b>
                <div style={{ display: 'grid', gap: 4 }}>
                  {result.report.issues.length === 0 && <span className="tiny muted">这份行程通过了全部规则</span>}
                  {result.report.issues.slice(0, 6).map((iss, i) => (
                    <span key={i} className="tiny" style={{ display: 'flex', gap: 5, color: iss.severity === 'error' ? 'var(--red)' : 'var(--amber)' }}>
                      <IconAlert size={11} />
                      {iss.message}
                    </span>
                  ))}
                  {result.report.issues.length > 6 && <span className="tiny muted">还有 {result.report.issues.length - 6} 条…</span>}
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="modal-foot">
          <button className="btn btn-primary" onClick={() => onImport(text)}>
            <IconUpload size={13} /> 解析并校验
          </button>
          {result && (
            <button className="btn btn-accent" onClick={onAdopt}>
              载入到工作台
            </button>
          )}
          <span className="tiny muted" style={{ marginLeft: 'auto' }}>
            导入后可以继续编辑、修复、导出
          </span>
        </div>
      </div>
    </div>
  );
}
