import type { ExprCheck } from '../agent/understand';
import { IconAlert, IconX } from './icons';

/**
 * 表达歧义提醒条。
 *
 * 大模型只负责「指出来」，不负责「替用户改」：
 * 每条 issue 都是 原话片段 → 为什么可能跑偏 → 建议怎么澄清，改不改由用户决定。
 */
export default function ExpressionWarnBar({
  check,
  onDismiss,
  onRewrite,
}: {
  check: ExprCheck;
  onDismiss: () => void;
  onRewrite: () => void;
}) {
  if (!check.checked || !check.affected || check.issues.length === 0) return null;

  return (
    <div className="expr-bar" role="alert">
      <div className="expr-head">
        <span className="expr-tag">
          <IconAlert size={11} /> 表达推算
        </span>
        <b>你这句话有 {check.issues.length} 处可能被理解偏，看看是不是你的意思</b>
        <button className="expr-close" onClick={onDismiss} title="知道了">
          <IconX size={12} />
        </button>
      </div>
      <ul className="expr-list">
        {check.issues.map((it, i) => (
          <li key={i}>
            {it.quote && <code>「{it.quote}」</code>}
            <span>{it.problem}</span>
            {it.suggestion && <em>建议：{it.suggestion}</em>}
          </li>
        ))}
      </ul>
      <div className="expr-foot">
        <button className="btn btn-sm" onClick={onRewrite}>
          重新描述一下
        </button>
        <span className="tiny muted">判断来自大模型，只提醒不替你改行程；觉得没问题就忽略。</span>
      </div>
    </div>
  );
}
