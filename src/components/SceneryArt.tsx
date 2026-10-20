interface Props {
  seed: string;
  category?: string | null;
  name?: string;
  height?: number | string;
  variant?: 'day' | 'dusk' | 'night';
  rounded?: number;
  className?: string;
}

type Archetype = 'mountain' | 'water' | 'oldtown' | 'museum' | 'city' | 'food' | 'hotel' | 'park' | 'pagoda';

const W = 1200;
const H = 320;

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const PALETTES: Record<Archetype, [string, string, string, string]> = {
  mountain: ['#e3ece7', '#b9cfc6', '#7f9f93', '#3f5f55'],
  water: ['#e8eff2', '#bcd5dd', '#7fa8b8', '#3e6274'],
  oldtown: ['#f6e8d5', '#e2c5a1', '#b98d62', '#6b4a31'],
  museum: ['#e9e4d9', '#d2c9b8', '#a1957f', '#544b3d'],
  city: ['#eae4ec', '#c9c0d3', '#8d82a1', '#4a4358'],
  food: ['#faead0', '#efd0a0', '#c99a5e', '#7a5326'],
  hotel: ['#f0e8dc', '#dccdb8', '#a98f6c', '#5c4a34'],
  park: ['#e6efe2', '#c6dcc2', '#87a97f', '#41603c'],
  pagoda: ['#f2e6d8', '#dfc4a6', '#b08a63', '#6a4a30'],
};

function archetypeOf(category: string | null | undefined, name = ''): Archetype {
  if (category === 'hotel') return 'hotel';
  if (category === 'museum' || category === 'art') return 'museum';
  if (category === 'restaurant' || category === 'cafe') return 'food';
  if (/寺|塔|祠|宫|观|庙|庵/.test(name)) return 'pagoda';
  if (/公园|草堂|湿地|植物园|茶园|村|山居/.test(name)) return 'park';
  if (category === 'shopping' || category === 'nightlife' || category === 'theme_park') return 'city';
  if (category === 'nature' || category === 'hiking') {
    return /湖|海|江|溪|湿|滩|岛|湾|泉/.test(name) ? 'water' : 'mountain';
  }
  if (category === 'landmark' || category === 'sight' || category === 'history') {
    return /夜|酒吧|桥|街/.test(name) ? 'city' : 'oldtown';
  }
  return 'oldtown';
}

/**
 * 程序化景点「风景图」：宽幅 1200×320，按种子稳定生成。
 * 不依赖任何外链图片，离线也能渲染。
 */
export default function SceneryArt({
  seed,
  category,
  name = '',
  height = 220,
  variant = 'day',
  rounded = 0,
  className,
}: Props) {
  const h = hash(seed);
  const kind = archetypeOf(category, name);
  const [skyA, skyB, mid, dark] = PALETTES[kind];
  const night = variant === 'night';
  const dusk = variant === 'dusk';

  const skyTop = night ? '#2a3042' : dusk ? '#f2cfac' : skyA;
  const skyBottom = night ? '#4a4f63' : dusk ? '#ecb184' : skyB;
  const sun = night ? '#f2ecd8' : dusk ? '#f6a45e' : '#fff6dc';
  const sunX = 120 + (h % 620);
  const sunY = 60 + ((h >> 5) % 46);
  const gid = `sky-${h.toString(36)}`;
  const horizon = H * 0.68;

  const rand = (i: number) => ((h >> (i % 24)) % 1000) / 1000;

  const layers = (() => {
    switch (kind) {
      case 'mountain': {
        return (
          <>
            {[0, 1, 2].map((layer) => {
              const baseY = horizon - 20 + layer * 18;
              const amp = 62 - layer * 14;
              const points: string[] = [`-40,${H}`];
              for (let x = -40; x <= W + 40; x += 90) {
                const n = rand(x / 90 + layer * 7);
                points.push(`${x},${baseY - n * amp}`);
              }
              points.push(`${W + 40},${H}`);
              return (
                <polygon
                  key={layer}
                  points={points.join(' ')}
                  fill={layer === 2 ? dark : mid}
                  opacity={0.22 + layer * 0.2}
                />
              );
            })}
            <ellipse cx={W * 0.5} cy={horizon + 6} rx={W * 0.46} ry="12" fill="#fff" opacity="0.18" />
          </>
        );
      }
      case 'water': {
        return (
          <>
            <rect y={horizon} width={W} height={H - horizon} fill={mid} opacity="0.4" />
            {Array.from({ length: 12 }, (_, i) => (
              <rect
                key={i}
                x={rand(i) * W * 0.8}
                y={horizon + 14 + i * 9}
                width={60 + rand(i + 3) * 180}
                height="2"
                rx="1"
                fill={dark}
                opacity={0.12 + (i % 3) * 0.05}
              />
            ))}
            <path d={`M0 ${horizon} L ${W} ${horizon}`} stroke={dark} strokeWidth="1.4" opacity="0.35" />
            <ellipse cx={sunX} cy={horizon + 8} rx="70" ry="7" fill={sun} opacity="0.25" />
            <path d={`M${W * 0.72} ${horizon - 2} l38 0 -6 10 -26 0 z`} fill={dark} opacity="0.45" />
          </>
        );
      }
      case 'oldtown': {
        const count = 9;
        return (
          <>
            {Array.from({ length: count }, (_, i) => {
              const w = W / count - 8;
              const x = i * (W / count) + 4;
              const top = horizon - 70 - rand(i) * 46;
              return (
                <g key={i} opacity={0.42 + (i % 3) * 0.14}>
                  <rect x={x} y={top} width={w} height={H - top} fill={i % 2 ? mid : dark} />
                  <polygon
                    points={`${x - 10},${top} ${x + w / 2},${top - 22} ${x + w + 10},${top}`}
                    fill={dark}
                    opacity="0.92"
                  />
                  {[0, 1, 2, 3].map((k) => (
                    <rect
                      key={k}
                      x={x + 12 + k * (w / 4.4)}
                      y={top + 26}
                      width="12"
                      height="16"
                      fill={night ? '#f6d79a' : skyB}
                      opacity={night ? 0.9 : 0.55}
                    />
                  ))}
                </g>
              );
            })}
            <rect y={H - 26} width={W} height="26" fill={dark} opacity="0.18" />
          </>
        );
      }
      case 'museum': {
        const bw = W * 0.5;
        const bx = (W - bw) / 2;
        return (
          <>
            <rect x={bx} y={horizon - 96} width={bw} height={H - horizon + 96} fill={mid} opacity="0.55" />
            <polygon
              points={`${bx - 34},${horizon - 96} ${W / 2},${horizon - 150} ${bx + bw + 34},${horizon - 96}`}
              fill={dark}
              opacity="0.72"
            />
            {Array.from({ length: 9 }, (_, i) => (
              <rect
                key={i}
                x={bx + 30 + i * ((bw - 60) / 8.6)}
                y={horizon - 78}
                width="18"
                height={78}
                fill={dark}
                opacity="0.55"
              />
            ))}
            <rect x={bx - 16} y={horizon} width={bw + 32} height="14" fill={dark} opacity="0.3" />
            <rect x={bx - 34} y={horizon + 14} width={bw + 68} height="12" fill={dark} opacity="0.18" />
          </>
        );
      }
      case 'city': {
        return (
          <>
            {Array.from({ length: 11 }, (_, i) => {
              const w = W / 11 - 10;
              const x = i * (W / 11) + 5;
              const top = horizon - 40 - rand(i) * 120;
              const rows = Math.max(2, Math.floor((H - top) / 26));
              return (
                <g key={i}>
                  <rect x={x} y={top} width={w} height={H - top} fill={i % 2 ? mid : dark} opacity={0.36 + (i % 4) * 0.1} />
                  {Array.from({ length: rows }, (_, r) =>
                    Array.from({ length: Math.max(1, Math.floor(w / 16)) }, (_, c) => (
                      <rect
                        key={`${r}-${c}`}
                        x={x + 6 + c * 15}
                        y={top + 12 + r * 24}
                        width="7"
                        height="10"
                        fill={night ? '#f7dca8' : skyB}
                        opacity={night ? 0.9 : 0.4}
                      />
                    )),
                  )}
                </g>
              );
            })}
            <rect y={H - 18} width={W} height="18" fill={dark} opacity="0.2" />
          </>
        );
      }
      case 'food': {
        return (
          <>
            <rect y={horizon - 30} width={W} height={H - horizon + 30} fill={mid} opacity="0.28" />
            <path d={`M0 ${horizon - 30} L ${W} ${horizon - 30}`} stroke={dark} strokeWidth="10" opacity="0.16" />
            {Array.from({ length: 6 }, (_, i) => {
              const x = 40 + i * 190;
              return (
                <g key={i}>
                  <rect x={x} y={horizon - 120} width="120" height="8" rx="4" fill={dark} opacity="0.4" />
                  <rect x={x + 8} y={horizon - 112} width="104" height="46" fill={i % 2 ? '#c9573a' : '#d98a3d'} opacity="0.5" />
                  <circle cx={x + 60} cy={horizon - 140} r="11" fill="#e8b25a" opacity={night ? 0.95 : 0.75} />
                  <rect x={x + 52} y={horizon - 129} width="16" height="9" fill={dark} opacity="0.35" />
                  <rect x={x + 18} y={horizon - 66} width="86" height="10" rx="4" fill={dark} opacity="0.22" />
                </g>
              );
            })}
            <rect y={H - 30} width={W} height="30" fill={dark} opacity="0.14" />
          </>
        );
      }
      case 'park': {
        return (
          <>
            <path d={`M0 ${horizon + 6} Q ${W * 0.3} ${horizon - 18} ${W * 0.55} ${horizon + 4} T ${W} ${horizon - 2} L ${W} ${H} L 0 ${H} Z`} fill={mid} opacity="0.4" />
            {Array.from({ length: 7 }, (_, i) => {
              const x = 70 + i * 165 + rand(i) * 40;
              const scale = 0.8 + rand(i + 5) * 0.6;
              return (
                <g key={i} opacity={0.55 + (i % 2) * 0.2}>
                  <rect x={x - 4 * scale} y={horizon - 18} width={8 * scale} height={26} fill={dark} opacity="0.7" />
                  <ellipse cx={x} cy={horizon - 40 * scale} rx={34 * scale} ry={30 * scale} fill={dark} opacity="0.55" />
                  <ellipse cx={x - 20 * scale} cy={horizon - 26 * scale} rx={22 * scale} ry={20 * scale} fill={mid} opacity="0.7" />
                  <ellipse cx={x + 22 * scale} cy={horizon - 28 * scale} rx={24 * scale} ry={22 * scale} fill={mid} opacity="0.62" />
                </g>
              );
            })}
            <path d={`M${W * 0.42} ${H} Q ${W * 0.48} ${horizon + 20} ${W * 0.52} ${horizon + 4}`} stroke="#fff" strokeWidth="10" fill="none" opacity="0.18" />
            <rect y={H - 16} width={W} height="16" fill={dark} opacity="0.18" />
          </>
        );
      }
      case 'pagoda': {
        const cx = W * 0.5;
        const tiers = 5;
        return (
          <>
            <rect y={horizon + 12} width={W} height={H - horizon - 12} fill={mid} opacity="0.28" />
            {Array.from({ length: tiers }, (_, i) => {
              const w = 210 - i * 34;
              const y = horizon - 18 - i * 44;
              return (
                <g key={i}>
                  <polygon
                    points={`${cx - w / 2 - 16},${y} ${cx},${y - 26} ${cx + w / 2 + 16},${y}`}
                    fill={dark}
                    opacity={0.62 + i * 0.04}
                  />
                  <rect x={cx - w / 2 + 8} y={y} width={w - 16} height={44} fill={mid} opacity="0.6" />
                  <rect x={cx - 6} y={y + 12} width="12" height="22" fill={dark} opacity="0.45" />
                </g>
              );
            })}
            <rect x={cx - 3} y={horizon - 18 - tiers * 44 - 24} width="6" height="30" fill={dark} opacity="0.7" />
            <rect x={cx - 74} y={horizon + 6} width="148" height="18" fill={dark} opacity="0.3" />
            {Array.from({ length: 4 }, (_, i) => (
              <g key={`t-${i}`} opacity="0.35">
                <rect x={130 + i * 250} y={horizon - 6} width="6" height="26" fill={dark} />
                <ellipse cx={133 + i * 250} cy={horizon - 16} rx="26" ry="20" fill={dark} opacity="0.55" />
              </g>
            ))}
            <rect y={H - 20} width={W} height="20" fill={dark} opacity="0.22" />
          </>
        );
      }
      case 'hotel':
      default: {
        const bw = W * 0.42;
        const bx = W * 0.2;
        return (
          <>
            <rect x={bx} y={horizon - 130} width={bw} height={H - horizon + 130} fill={mid} opacity="0.5" />
            <rect x={bx + 26} y={horizon - 172} width={bw - 52} height="42" fill={dark} opacity="0.38" />
            {Array.from({ length: 5 }, (_, r) =>
              Array.from({ length: 7 }, (_, c) => (
                <rect
                  key={`${r}-${c}`}
                  x={bx + 26 + c * ((bw - 40) / 7)}
                  y={horizon - 112 + r * 26}
                  width="20"
                  height="13"
                  fill={night ? '#f7dca8' : skyB}
                  opacity={night ? 0.85 : 0.5}
                />
              )),
            )}
            <rect x={bx + bw / 2 - 34} y={horizon + 6} width="68" height="46" fill={dark} opacity="0.5" />
            <rect x={W * 0.72} y={horizon - 74} width={W * 0.18} height={H - horizon + 74} fill={dark} opacity="0.18" />
            <circle cx={W * 0.66} cy={horizon - 30} r="20" fill={dark} opacity="0.22" />
            <circle cx={W * 0.93} cy={horizon - 24} r="16" fill={dark} opacity="0.18" />
            <rect x={W * 0.1} y={H - 20} width={W * 0.8} height="8" fill={dark} opacity="0.2" />
          </>
        );
      }
    }
  })();

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice"
      className={className}
      style={{ display: 'block', width: '100%', height, borderRadius: rounded }}
      role="img"
      aria-label={`${name || '景点'}示意图`}
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={skyTop} />
          <stop offset="100%" stopColor={skyBottom} />
        </linearGradient>
        <radialGradient id={`${gid}-sun`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={sun} stopOpacity="0.95" />
          <stop offset="100%" stopColor={sun} stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width={W} height={H} fill={`url(#${gid})`} />
      <circle cx={sunX} cy={sunY} r="86" fill={`url(#${gid}-sun)`} />
      <circle cx={sunX} cy={sunY} r={night ? 15 : 21} fill={sun} opacity="0.9" />

      {Array.from({ length: 4 }, (_, i) => (
        <ellipse
          key={`c-${i}`}
          cx={((sunX + 220 + i * 210) % (W + 200)) - 80}
          cy={42 + rand(i + 2) * 60}
          rx={70 + rand(i) * 70}
          ry={9 + rand(i + 1) * 8}
          fill="#ffffff"
          opacity={night ? 0.05 : 0.26}
        />
      ))}

      {layers}

      {kind !== 'museum' && kind !== 'city' && (
        <path
          d={`M${W * 0.16} 72 q 9 -9 18 0 q 9 -9 18 0 M${W * 0.22} 92 q 7 -7 14 0 q 7 -7 14 0`}
          stroke={dark}
          strokeWidth="1.6"
          fill="none"
          opacity="0.3"
        />
      )}
    </svg>
  );
}
