import { useEffect, useState } from 'react';
import { IconX } from './icons';

const DISMISS_KEY = 'wayfarer.pwa-dismissed';

/** 已经以 App 形态运行（装过了就不打扰） */
function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari 专有标记
    Boolean((navigator as unknown as { standalone?: boolean }).standalone)
  );
}

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * 「添加到主屏幕」引导条。
 * Android / 桌面 Chrome：监听 beforeinstallprompt，直接弹系统安装框；
 * iOS：没有该 API，只能告诉用户去 Safari 的分享菜单里点。
 */
export default function InstallBanner() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [gone, setGone] = useState(true);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (isStandalone() || localStorage.getItem(DISMISS_KEY) === '1') return;
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setGone(false);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    // iOS 没有 beforeinstallprompt，直接展示手动引导
    if (isIos()) {
      setIos(true);
      setGone(false);
    }
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  if (gone || done) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1');
    setGone(true);
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === 'accepted') {
      localStorage.setItem(DISMISS_KEY, '1');
      setDone(true);
    }
    setDeferred(null);
  };

  return (
    <div className="pwa-banner" role="note">
      <img src="/icons/icon-192.png" alt="" width={34} height={34} />
      <div className="pwa-banner-text">
        <b>把行迹装到桌面</b>
        {ios ? (
          <span>
            点 Safari 底部<b>分享</b>按钮 → 选择「添加到主屏幕」，下次一图标就开
          </span>
        ) : (
          <span>像小程序一样全屏打开，断网也能看已有行程</span>
        )}
      </div>
      {deferred && (
        <button className="pwa-install" onClick={() => void install()}>
          安装
        </button>
      )}
      <button className="pwa-close" onClick={dismiss} aria-label="不再提示">
        <IconX size={13} />
      </button>
    </div>
  );
}
