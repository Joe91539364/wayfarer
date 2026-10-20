import { useEffect, useRef, useState } from 'react';
import type { User } from '../auth';
import { login, loginAsGuest, loginByCode, register } from '../auth';
import { IconX } from './icons';

interface Props {
  open: boolean;
  onClose: () => void;
  onLogin: (user: User) => void;
  onToast: (msg: string) => void;
}

type Mode = 'code' | 'password' | 'register';

export default function LoginModal({ open, onClose, onLogin, onToast }: Props) {
  const [mode, setMode] = useState<Mode>('code');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [sent, setSent] = useState(false);

  // onClose 每次父渲染都是新引用，只把它放进依赖会让下面的 setError('') 反复执行，
  // 用户看到的报错会在一秒内自己消失。拆成「打开时重置」和「Esc 关闭」两件事。
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    setError('');
    setBusy(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = window.setTimeout(() => setCountdown((v) => v - 1), 1000);
    return () => window.clearTimeout(t);
  }, [countdown]);

  if (!open) return null;

  async function submit() {
    setError('');
    setBusy(true);
    try {
      let user: User;
      if (mode === 'code') user = await loginByCode(phone, code);
      else if (mode === 'password') user = await login(phone, password);
      else {
        if (password !== password2) throw new Error('两次输入的密码不一致');
        user = await register(phone, password, name);
      }
      onLogin(user);
      onToast(mode === 'register' ? `欢迎，${user.name}` : `已登录：${user.name}`);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : '登录失败');
    } finally {
      setBusy(false);
    }
  }

  async function guest() {
    const user = await loginAsGuest();
    onLogin(user);
    onClose();
    onToast('已进入本机访客模式，数据只存在这台电脑');
  }

  function sendCode() {
    if (!/^1\d{10}$/.test(phone)) {
      setError('先填 11 位手机号');
      return;
    }
    setError('');
    setSent(true);
    setCountdown(60);
    onToast('验证码已发送（演示环境：任意 6 位数字都可用）');
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal login-modal" onClick={(e) => e.stopPropagation()}>
        <button className="icon-btn login-close" onClick={onClose}>
          <IconX size={16} />
        </button>

        <div className="login-hero">
          <div className="login-mark">行</div>
          <h3>登录行迹</h3>
          <p>登录后，行程、评论与绑定关系会跟着你的账号走。</p>
        </div>

        <div className="tabs" style={{ margin: '0 20px' }}>
          <button className={`tab ${mode === 'code' ? 'active' : ''}`} onClick={() => { setMode('code'); setError(''); }}>
            验证码
          </button>
          <button className={`tab ${mode === 'password' ? 'active' : ''}`} onClick={() => { setMode('password'); setError(''); }}>
            密码
          </button>
          <button className={`tab ${mode === 'register' ? 'active' : ''}`} onClick={() => { setMode('register'); setError(''); }}>
            注册
          </button>
        </div>

        <div className="login-body">
          <label className="login-field">
            <span>手机号</span>
            <div className="login-input-row">
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/[^\d]/g, '').slice(0, 11))}
                placeholder="11 位手机号"
                inputMode="numeric"
              />
              {mode === 'code' && (
                <button className="btn btn-sm" onClick={sendCode} disabled={countdown > 0}>
                  {countdown > 0 ? `${countdown}s` : '发送验证码'}
                </button>
              )}
            </div>
          </label>

          {mode === 'code' && (
            <label className="login-field">
              <span>验证码</span>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/[^\d]/g, '').slice(0, 6))}
                placeholder={sent ? '6 位数字（演示：随便填）' : '先点发送验证码'}
                inputMode="numeric"
              />
            </label>
          )}

          {mode === 'password' && (
            <label className="login-field">
              <span>密码</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="至少 6 位"
              />
            </label>
          )}

          {mode === 'register' && (
            <>
              <label className="login-field">
                <span>昵称（可选）</span>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="怎么称呼你" />
              </label>
              <label className="login-field">
                <span>设置密码</span>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="至少 6 位" />
              </label>
              <label className="login-field">
                <span>再输一次</span>
                <input type="password" value={password2} onChange={(e) => setPassword2(e.target.value)} placeholder="确认密码" />
              </label>
            </>
          )}

          {error && <div className="login-error">{error}</div>}

          <button className="btn btn-accent login-submit" onClick={submit} disabled={busy}>
            {busy ? '处理中…' : mode === 'register' ? '注册并登录' : '登录'}
          </button>

          <div className="login-alt">
            <button className="login-link" onClick={guest}>
              先用本机访客模式看看 →
            </button>
          </div>

          <p className="login-foot">
            演示环境：账号只存在这台电脑的 localStorage，密码做 SHA-256 摘要后保存，不会上传。
            真实上线时应换成服务端鉴权 + 短信服务商。
          </p>
        </div>
      </div>
    </div>
  );
}
