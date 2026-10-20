import { useState } from 'react';
import type { User } from '../auth';
import { maskPhone } from '../auth';
import { connect, disconnect, SERVICES, touchSync, type Binding, type Service } from '../data/bindings';
import { IconCheck, IconX } from './icons';

interface Props {
  open: boolean;
  onClose: () => void;
  bindings: Record<string, Binding>;
  onChange: (next: Record<string, Binding>) => void;
  user: User | null;
  onToast: (msg: string) => void;
}

export default function BindingsModal({ open, onClose, bindings, onChange, user, onToast }: Props) {
  const [active, setActive] = useState<Service | null>(null);
  const [account, setAccount] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  function start(svc: Service) {
    setActive(svc);
    setAccount(user?.phone ?? '');
    setCode('');
  }

  function confirm() {
    if (!active) return;
    if (!/^1\d{10}$/.test(account) && active.id !== 'calendar') {
      onToast('填一个 11 位手机号，授权才有对象');
      return;
    }
    if (active.id !== 'calendar' && !/^\d{4,6}$/.test(code)) {
      onToast('授权码是 4–6 位数字（演示：随便填）');
      return;
    }
    setBusy(true);
    window.setTimeout(() => {
      onChange(connect(bindings, active.id, active.id === 'calendar' ? '本机日历' : account));
      onToast(`已绑定 ${active.name}${active.id === '12306' ? '（演示授权）' : ''}`);
      setBusy(false);
      setActive(null);
    }, 650);
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" style={{ width: 'min(640px, 100%)' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <h3>绑定行程软件</h3>
            <div className="tiny muted" style={{ marginTop: 2 }}>
              {user ? `${user.name} · ${user.guest ? '本机访客' : maskPhone(user.phone)}` : '未登录，绑定关系只保存在这台电脑'}
            </div>
          </div>
          <button className="icon-btn" onClick={onClose}>
            <IconX size={16} />
          </button>
        </div>

        <div className="modal-body">
          {!active && (
            <>
              <div className="bind-list">
                {SERVICES.map((svc) => {
                  const bound = bindings[svc.id];
                  return (
                    <div className={`bind-row ${bound ? 'on' : ''}`} key={svc.id}>
                      <div className="bind-glyph" style={{ background: svc.color }}>
                        {svc.glyph}
                      </div>
                      <div className="bind-main">
                        <div className="bind-name">
                          {svc.name}
                          <span className="chip">{svc.kind}</span>
                          {bound && (
                            <span className="chip teal">
                              <IconCheck size={10} /> 已绑定
                            </span>
                          )}
                        </div>
                        <div className="bind-desc">{svc.desc}</div>
                        {bound && (
                          <div className="bind-meta">
                            {bound.account} · 绑定于 {new Date(bound.since).toLocaleDateString('zh-CN')}
                            {bound.lastSync ? ` · 上次同步 ${new Date(bound.lastSync).toLocaleTimeString('zh-CN')}` : ' · 尚未同步'}
                          </div>
                        )}
                      </div>
                      <div className="bind-actions">
                        {bound ? (
                          <>
                            <button
                              className="btn btn-sm"
                              onClick={() => {
                                onChange(touchSync(bindings, svc.id));
                                onToast(`已从 ${svc.name} 同步一次（演示）`);
                              }}
                            >
                              同步
                            </button>
                            <button
                              className="btn btn-sm"
                              onClick={() => {
                                onChange(disconnect(bindings, svc.id));
                                onToast(`已解绑 ${svc.name}`);
                              }}
                            >
                              解绑
                            </button>
                          </>
                        ) : (
                          <button className="btn btn-sm btn-accent" onClick={() => start(svc)}>
                            去绑定
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <p className="d-note" style={{ marginTop: 12 }}>
                铁路 12306 没有公开的数据接口，任何「自动读你的车票」的做法都违反服务条款。
                这里做的是授权式绑定的界面与状态机：真实上线应走官方开放平台 / OAuth，由用户主动授权。
              </p>
            </>
          )}

          {active && (
            <div className="bind-auth">
              <button className="btn btn-ghost btn-sm" onClick={() => setActive(null)}>
                ← 返回列表
              </button>
              <div className="bind-auth-head">
                <div className="bind-glyph" style={{ background: active.color }}>
                  {active.glyph}
                </div>
                <div>
                  <h4>授权 {active.name}</h4>
                  <p>{active.desc}</p>
                </div>
              </div>

              <div className="bind-steps">
                <div>
                  <span>1</span>
                  <b>跳转到 {active.name} 的授权页</b>
                  <p>在官方页面登录并勾选「行程数据只读」权限。</p>
                </div>
                <div>
                  <span>2</span>
                  <b>把授权码填回来</b>
                  <p>授权成功后对方会给一串短码，粘贴到这里完成绑定。</p>
                </div>
              </div>

              <div className="bind-form">
                <label>
                  <span>{active.accountHint}</span>
                  <input
                    value={account}
                    onChange={(e) => setAccount(e.target.value.replace(/[^\d]/g, '').slice(0, 11))}
                    placeholder="11 位手机号"
                    inputMode="numeric"
                  />
                </label>
                <label>
                  <span>授权码</span>
                  <input
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/[^\d]/g, '').slice(0, 6))}
                    placeholder="4–6 位数字（演示）"
                    inputMode="numeric"
                  />
                </label>
              </div>

              <div className="bind-note">
                <b>这台是演示环境</b>
                <span>不跳转外部站点、不发任何请求；点确认只会在本机写入一条绑定记录。</span>
              </div>

              <div className="edit-actions">
                <button className="btn btn-accent" onClick={confirm} disabled={busy}>
                  {busy ? '授权中…' : '确认授权'}
                </button>
                <button className="btn" onClick={() => setActive(null)}>
                  取消
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="modal-foot">
          <span className="tiny muted">已绑定 {Object.keys(bindings).length} 个</span>
          <button className="btn btn-sm" style={{ marginLeft: 'auto' }} onClick={onClose}>
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
