import { useState } from 'react';
import { TAXI_APPS, copyText, launchApp, type TaxiPoint } from '../domain/taxi';
import { IconCar, IconCopy, IconX } from './icons';

interface Props {
  open: boolean;
  onClose: () => void;
  from: TaxiPoint;
  to: TaxiPoint;
  distanceKm?: number;
  onToast: (msg: string) => void;
}

/**
 * 打车面板。
 *
 * 每个平台一行：唤起协议 + 网页兜底。有公开协议的才给「直接打开」，
 * 没有的就只给官网 —— 不编一个假的 scheme 骗点击。
 */
export default function TaxiSheet({ open, onClose, from, to, distanceKm, onToast }: Props) {
  const [copied, setCopied] = useState(false);

  if (!open) return null;
  const destination = `${to.name ?? '目的地'}（${to.lat.toFixed(5)}, ${to.lng.toFixed(5)}）`;

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal taxi-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <h3>
              <IconCar size={15} /> 叫车去 {to.name ?? '这一站'}
            </h3>
            <p className="tiny muted">
              {from.name ? `从 ${from.name} 出发` : '从当前位置出发'} · 直线约 {distanceKm ? distanceKm.toFixed(1) : '—'} km
              {distanceKm != null && distanceKm < 1.2
                ? ' · 不到 1.2 公里，走过去可能更快，别跟司机互相找'
                : ' · 打车是兜底，市内建议优先地铁'}
            </p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            <IconX size={14} />
          </button>
        </div>

        <div className="modal-body">
          <div className="taxi-dest">
            <div>
              <span className="tiny muted">目的地</span>
              <b>{to.name ?? '未命名'}</b>
              <small className="mono">
                {to.lat.toFixed(5)}, {to.lng.toFixed(5)} · GCJ-02
              </small>
            </div>
            <button
              className="btn btn-sm"
              onClick={async () => {
                const ok = await copyText(destination);
                setCopied(ok);
                onToast(ok ? '目的地已复制，粘到打车 App 的终点栏' : '复制失败，手动输入地址吧');
                window.setTimeout(() => setCopied(false), 1800);
              }}
            >
              {copied ? <IconCopy size={11} /> : <IconCopy size={11} />} {copied ? '已复制' : '复制'}
            </button>
          </div>

          <div className="taxi-list">
            {TAXI_APPS.map((app) => (
              <div key={app.id} className="taxi-row">
                <span className="taxi-glyph" style={{ background: app.color }}>
                  {app.glyph}
                </span>
                <div className="taxi-body">
                  <b>
                    {app.name}
                    {app.scheme ? <span className="taxi-tag">可唤起 App</span> : <span className="taxi-tag dim">仅网页</span>}
                  </b>
                  <span>{app.note}</span>
                </div>
                <div className="taxi-actions">
                  <button
                    className="btn btn-sm"
                    onClick={() => {
                      const how = launchApp(app, from, to);
                      onToast(how === 'scheme' ? `正在唤起${app.name}…` : `已打开${app.name}网页版`);
                    }}
                  >
                    打开
                  </button>
                  <a
                    className="btn btn-sm btn-ghost"
                    href={app.web(from, to)}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="不唤起 App，直接开网页版"
                  >
                    网页版
                  </a>
                </div>
              </div>
            ))}
          </div>

          <p className="d-note">
            唤起失败会自动回落到网页版。iOS 上部分 App 不支持 scheme 跳转，会直接打开网页。
            坐标是 GCJ-02，与高德/腾讯一致；百度那一行已经在 URL 里写了 coord_type=gcj02。
          </p>
        </div>
      </div>
    </div>
  );
}
