import { useEffect, useState, type ReactNode } from 'react';
import { IconBell, IconCar, IconChevron, IconCompass, IconHeart, IconRefresh, IconSpark } from './icons';

interface Props {
  hasIti: boolean;
  alertCount: number;
  momentCount: number;
  sourceOk: number;
  sourceTotal: number;
  onPlan: () => void;
  onAlert: () => void;
  onTaxi: () => void;
  onSources: () => void;
  onDiscover: () => void;
  onMoments: () => void;
}

/**
 * 底部悬浮 Dock：常驻快捷入口。
 * 参考「手机管家」底部 Dock 的形态——玻璃质感胶囊 + 中央高亮主按钮。
 */
export default function FloatingDock({
  hasIti,
  alertCount,
  momentCount,
  sourceOk,
  sourceTotal,
  onPlan,
  onAlert,
  onTaxi,
  onSources,
  onDiscover,
  onMoments,
}: Props) {
  const [shown, setShown] = useState(false);
  const [toTop, setToTop] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setShown(true), 450);
    const onScroll = () => setToTop(window.scrollY > 480 || document.querySelector('.workspace') !== null);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  const left = [
    { key: 'discover', icon: <IconCompass size={17} />, label: '发现', onClick: onDiscover },
    {
      key: 'moments',
      icon: <IconHeart size={17} />,
      label: '幸福时刻',
      badge: momentCount > 0 ? momentCount : undefined,
      onClick: onMoments,
    },
  ] as const;

  const right = [
    {
      key: 'alert',
      icon: <IconBell size={17} />,
      label: '下一站',
      badge: alertCount > 0 ? alertCount : undefined,
      onClick: onAlert,
      disabled: !hasIti,
    },
    { key: 'taxi', icon: <IconCar size={17} />, label: '叫车', onClick: onTaxi, disabled: !hasIti },
    {
      key: 'sources',
      icon: <IconRefresh size={17} />,
      label: '数据源',
      badge: sourceTotal > 0 ? `${sourceOk}/${sourceTotal}` : undefined,
      onClick: onSources,
    },
  ] as const;

  return (
    <nav className={`dock ${shown ? 'is-shown' : ''}`} aria-label="快捷操作">
      <DockBtn {...left[0]} />
      <DockBtn {...left[1]} />
      <button className="dock-main" onClick={onPlan} title="开始规划一趟旅程">
        <IconSpark size={20} />
        <span>智能规划</span>
      </button>
      <DockBtn {...right[0]} />
      <DockBtn {...right[1]} />
      <DockBtn {...right[2]} />
      {toTop && (
        <button className="dock-top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} title="回到顶部">
          <IconChevron size={14} />
        </button>
      )}
    </nav>
  );
}

function DockBtn({
  icon,
  label,
  badge,
  onClick,
  disabled,
}: {
  icon: ReactNode;
  label: string;
  badge?: string | number;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button className={`dock-btn ${disabled ? 'is-off' : ''}`} onClick={onClick} disabled={disabled} title={label}>
      <span className="dock-ico">
        {icon}
        {badge != null && <i className="dock-badge">{badge}</i>}
      </span>
      <span className="dock-label">{label}</span>
    </button>
  );
}
