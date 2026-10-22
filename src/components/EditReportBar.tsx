import type { EditFix } from '../agent/conflict';
import { IconAlert, IconCheck, IconX } from './icons';

/**
 * 改动说明条：你手动挪/删/加完，程序顺手处理的冲突摊开给你看。
 * 自动处理（auto）用勾，只提示没动手的用感叹号 —— 别让人猜「刚才发生了什么」。
 */
export default function EditReportBar({
  title,
  fixes,
  onUndo,
  onDismiss,
}: {
  title: string;
  fixes: EditFix[];
  onUndo: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="edit-bar">
      <div className="edit-bar-head">
        <IconCheck size={12} />
        <b>{title}</b>
        <button className="edit-bar-x" onClick={onDismiss} title="收起">
          <IconX size={11} />
        </button>
      </div>
      <ul className="edit-bar-list">
        {fixes.map((f, i) => (
          <li key={i} className={f.auto ? 'auto' : 'hint'}>
            {f.auto ? <IconCheck size={10} /> : <IconAlert size={10} />}
            <span>{f.text}</span>
          </li>
        ))}
      </ul>
      <div className="edit-bar-foot">
        <button className="btn btn-sm" onClick={onUndo}>
          撤销这次改动
        </button>
        <span className="tiny muted">时间、通勤、校验都已按新顺序重算</span>
      </div>
    </div>
  );
}
