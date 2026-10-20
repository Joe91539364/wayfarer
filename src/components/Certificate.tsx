import { useState } from 'react';
import type { Certificate } from '../domain/schema';
import { IconAlert, IconCheck, IconChevron, IconX } from './icons';

interface Props {
  certificate: Certificate;
  compact?: boolean;
}

export default function CertificateCard({ certificate, compact }: Props) {
  const [open, setOpen] = useState(false);
  const { passed, total, errors, warnings } = certificate.summary;
  const ratio = total === 0 ? 0 : passed / total;
  const R = 22;
  const C = 2 * Math.PI * R;
  const hasError = errors > 0;
  const cov = certificate.evidence.data_coverage;
  const poiRatio = cov.poi_total ? cov.poi_verified / cov.poi_total : 0;
  const hoursRatio = cov.hours_total ? cov.hours_known / cov.hours_total : 0;

  return (
    <div className={`cert ${hasError ? 'has-error' : ''}`}>
      <div className="cert-top">
        <div className="ring">
          <svg width="54" height="54" viewBox="0 0 54 54">
            <circle cx="27" cy="27" r={R} fill="none" stroke="rgba(27,26,23,0.08)" strokeWidth="4" />
            <circle
              cx="27"
              cy="27"
              r={R}
              fill="none"
              stroke={hasError ? '#a03428' : '#3f6b45'}
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={`${C * ratio} ${C}`}
              style={{ transition: 'stroke-dasharray 0.6s ease' }}
            />
          </svg>
          <div className="ring-txt">
            {passed}/{total}
          </div>
        </div>
        <div>
          <div className="cert-title">{hasError ? '存在未解决的约束' : '可行性证明已生成'}</div>
          <div className="cert-sub">
            {hasError ? `${errors} 个 error 无法自动修复` : `${total} 条硬规则全部通过`} · {warnings} 条提醒
          </div>
        </div>
        <button className={`cert-toggle ${open ? 'open' : ''}`} onClick={() => setOpen((v) => !v)}>
          {open ? '收起' : '验算明细'}
          <IconChevron size={12} />
        </button>
      </div>

      {open && (
        <>
          <div className="rule-list">
            {certificate.rules.map((rule) => (
              <div className="rule-row" key={rule.code}>
                <span className={rule.passed ? 'rule-ok' : 'rule-bad'} style={{ paddingTop: 1 }}>
                  {rule.passed ? <IconCheck size={13} /> : <IconX size={13} />}
                </span>
                <div>
                  <div className="r-title">{rule.title}</div>
                  <div className="r-detail">
                    {rule.detail ?? rule.description}
                    {rule.warnings > 0 ? ` · ${rule.warnings} 条提醒` : ''}
                  </div>
                </div>
                <div className="r-count">{rule.checked > 0 ? `${rule.checked} 次` : '—'}</div>
              </div>
            ))}
          </div>
          <div className="coverage">
            <div className="coverage-bar">
              <i style={{ width: `${poiRatio * 100}%`, background: '#3f6b45' }} />
              <i style={{ width: `${(1 - poiRatio) * 100}%`, background: '#d9d2c4' }} />
            </div>
            <div className="coverage-legend">
              <span>POI 可反查 {cov.poi_verified}/{cov.poi_total}</span>
              <span>营业时间已知 {cov.hours_known}/{cov.hours_total}</span>
            </div>
            <div className="tiny muted" style={{ marginTop: 8, lineHeight: 1.6 }}>
              {hoursRatio < 1
                ? `有 ${cov.hours_total - cov.hours_known} 个点缺少营业时间数据，这些条目标记为「数据未知」，不计入通过率 —— 未知不等于通过。`
                : '全部活动均有营业时间数据。'}
            </div>
            <div className="tiny muted mono" style={{ marginTop: 6 }}>
              verifier v{certificate.verifier_version} · {new Date(certificate.verified_at).toLocaleTimeString('zh-CN')}
            </div>
          </div>
        </>
      )}

      {!open && compact && (
        <div className="tiny muted" style={{ marginTop: 8 }}>
          点「验算明细」可以看到每条规则跑了多少次、卡在哪一项。
        </div>
      )}
      {!open && !compact && (
        <div className="tiny muted" style={{ marginTop: 8 }}>
          {certificate.evidence.assumptions.slice(0, 1).join(' ')}
        </div>
      )}
    </div>
  );
}
