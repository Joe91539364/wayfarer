/**
 * 首屏场景的手绘版（视频加载失败时的兜底）。
 *
 * 主路径是视频（public/hero/dive.mp4）；这里保留一套 Canvas 画法：同样的
 * 「暮色天空 → 水面抬升 → 水下光柱」三段，断网或解码不支持时也不至于白屏。
 */

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/** 固定相位的山脊线：三个正弦叠起来，滚动时不会抖 */
function ridge(x: number, seed: number) {
  return (
    Math.sin(x * 1.1 + seed) * 0.5 +
    Math.sin(x * 2.3 + seed * 2.1) * 0.28 +
    Math.sin(x * 4.7 + seed * 3.3) * 0.12
  );
}

interface Bubble { x: number; r: number; off: number; speed: number; sway: number }
interface Fish { y: number; size: number; speed: number; dir: number; phase: number }

const BUBBLES: Bubble[] = Array.from({ length: 46 }, (_, i) => ({
  x: (((i * 137.5) % 1000) / 1000),
  r: 1.4 + ((i * 7) % 5) * 0.9,
  off: ((i * 97) % 100) / 100,
  speed: 0.02 + ((i * 13) % 7) * 0.008,
  sway: (i % 9) * 0.35,
}));

const FISHES: Fish[] = [
  { y: 0.42, size: 26, speed: 0.04, dir: 1, phase: 0.2 },
  { y: 0.58, size: 16, speed: 0.07, dir: -1, phase: 1.7 },
  { y: 0.7, size: 34, speed: 0.03, dir: 1, phase: 3.1 },
  { y: 0.33, size: 12, speed: 0.09, dir: -1, phase: 4.4 },
];


function drawMountains(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const layers = [
    { base: 0.78, amp: 0.055, seed: 1.3, color: 'rgba(28,38,66,0.92)' },
    { base: 0.85, amp: 0.075, seed: 4.1, color: 'rgba(19,27,49,0.96)' },
    { base: 0.94, amp: 0.095, seed: 8.7, color: 'rgba(11,18,34,1)' },
  ];
  for (const layer of layers) {
    ctx.beginPath();
    ctx.moveTo(0, height);
    for (let x = 0; x <= width + 14; x += 14) {
      const y = height * layer.base - ridge((x / width) * 2.4, layer.seed) * height * layer.amp;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fillStyle = layer.color;
    ctx.fill();
  }
}

export function drawScene(ctx: CanvasRenderingContext2D, width: number, height: number, p: number, time: number) {
    ctx.clearRect(0, 0, width, height);

    // ---------- 天空 ----------
    const sky = ctx.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, '#080f22');
    sky.addColorStop(0.38, '#20325a');
    sky.addColorStop(0.64, '#6b5f7e');
    sky.addColorStop(0.82, '#c98a70');
    sky.addColorStop(1, '#f0bd8e');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);

    // 星点：越往下越暗，天没全黑但能看出是傍晚
    for (let i = 0; i < 54; i++) {
      const x = ((i * 271) % 997) / 997 * width;
      const y = ((i * 613) % 811) / 811 * height * 0.55;
      const twinkle = 0.55 + 0.45 * Math.sin(time * 0.9 + i);
      ctx.globalAlpha = (1 - p * 1.4) * 0.55 * twinkle;
      ctx.fillStyle = '#eaf2ff';
      ctx.fillRect(x, y, 1.4, 1.4);
    }
    ctx.globalAlpha = 1;

    // ---------- 落日 ----------
    const sunX = width * 0.74;
    const sunY = height * 0.66;
    const sunR = Math.max(80, height * 0.5);
    const glow = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunR);
    glow.addColorStop(0, `rgba(255,222,178,${0.75 * (1 - p)})`);
    glow.addColorStop(0.35, `rgba(255,186,132,${0.28 * (1 - p)})`);
    glow.addColorStop(1, 'rgba(255,170,120,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);
    ctx.beginPath();
    ctx.arc(sunX, sunY, height * 0.05, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,236,204,${0.95 * (1 - p * 1.2)})`;
    ctx.fill();

    // ---------- 山 ----------
    drawMountains(ctx, width, height);

    // ---------- 水面：随滚动抬升 ----------
    const surfaceY = height * (1.18 - 1.42 * p);
    if (surfaceY < height) {
      const top = Math.max(0, surfaceY);
      const water = ctx.createLinearGradient(0, top, 0, height);
      water.addColorStop(0, 'rgba(64,150,178,0.92)');
      water.addColorStop(0.22, 'rgba(24,86,124,0.96)');
      water.addColorStop(0.6, 'rgba(8,44,76,0.98)');
      water.addColorStop(1, 'rgba(3,18,34,1)');
      ctx.fillStyle = water;
      ctx.fillRect(0, top, width, height - top);

      // 水面亮边 + 波光
      if (surfaceY > -40) {
        ctx.save();
        ctx.beginPath();
        for (let x = 0; x <= width; x += 6) {
          const y =
            surfaceY +
            Math.sin(x * 0.006 + time * 0.7) * 9 +
            Math.sin(x * 0.017 - time * 1.1) * 5 +
            Math.sin(x * 0.045 + time * 1.9) * 1.8;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = 'rgba(214,242,255,0.85)';
        ctx.lineWidth = 1.6;
        ctx.stroke();

        // 余晖打在波纹上
        const shine = ctx.createLinearGradient(0, surfaceY - 60, width, surfaceY + 10);
        shine.addColorStop(0, 'rgba(255,214,166,0)');
        shine.addColorStop(0.6, 'rgba(255,214,166,0.30)');
        shine.addColorStop(1, 'rgba(255,214,166,0)');
        ctx.fillStyle = shine;
        ctx.fillRect(0, surfaceY - 10, width, 26);

        // 水面下方的柔光：不然「亮线 + 深色水」像是贴上去的
        const soft = ctx.createLinearGradient(0, surfaceY, 0, surfaceY + 90);
        soft.addColorStop(0, 'rgba(190,235,255,0.35)');
        soft.addColorStop(0.35, 'rgba(150,215,245,0.12)');
        soft.addColorStop(1, 'rgba(140,205,240,0)');
        ctx.fillStyle = soft;
        ctx.fillRect(0, surfaceY, width, 90);
        ctx.restore();
      }

      // ---------- 水下 ----------
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, Math.max(0, surfaceY), width, height - Math.max(0, surfaceY));
      ctx.clip();

      // 光柱
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 6; i++) {
        const baseX = width * (0.12 + i * 0.16);
        const sway = Math.sin(time * 0.35 + i) * width * 0.03;
        const spread = width * (0.035 + i * 0.006);
        const beam = ctx.createLinearGradient(baseX, surfaceY, baseX + sway, height);
        beam.addColorStop(0, 'rgba(186,228,255,0.16)');
        beam.addColorStop(0.55, 'rgba(150,210,245,0.055)');
        beam.addColorStop(1, 'rgba(120,190,235,0)');
        ctx.fillStyle = beam;
        ctx.beginPath();
        ctx.moveTo(baseX - spread * 0.35, surfaceY);
        ctx.lineTo(baseX + spread * 0.35, surfaceY);
        ctx.lineTo(baseX + sway + spread, height);
        ctx.lineTo(baseX + sway - spread, height);
        ctx.closePath();
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';

      // 气泡
      const column = height - Math.max(0, surfaceY);
      for (const b of BUBBLES) {
        const travel = (b.off + time * b.speed) % 1;
        const y = Math.max(0, surfaceY) + column * (1 - travel);
        const x = b.x * width + Math.sin(time * 0.8 + b.sway) * 8;
        ctx.beginPath();
        ctx.arc(x, y, b.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(206,238,255,${0.14 + travel * 0.3})`;
        ctx.fill();
      }

      // 鱼群剪影：只在潜得够深之后出现
      const fishAlpha = clamp((p - 0.42) * 2.4, 0, 0.62);
      if (fishAlpha > 0.01) {
        for (const f of FISHES) {
          const span = width + 240;
          const x = ((time * f.speed * 60 * f.dir + f.phase * 180) % span + span) % span - 120;
          const y = Math.max(0, surfaceY) + column * f.y + Math.sin(time * 0.9 + f.phase) * 6;
          const s = f.size * (0.8 + 0.2 * Math.sin(time + f.phase));
          ctx.save();
          ctx.translate(x, y);
          ctx.scale(f.dir < 0 ? -1 : 1, 1);
          ctx.beginPath();
          ctx.ellipse(0, 0, s * 0.9, s * 0.4, 0, 0, Math.PI * 2);
          ctx.moveTo(-s * 0.82, 0);
          ctx.lineTo(-s * 1.45, -s * 0.36);
          ctx.lineTo(-s * 1.45, s * 0.36);
          ctx.closePath();
          ctx.fillStyle = `rgba(6,26,42,${fishAlpha})`;
          ctx.fill();
          ctx.restore();
        }
      }
      ctx.restore();
    }

    // ---------- 暗角 ----------
    const vignette = ctx.createRadialGradient(
      width / 2, height * 0.45, Math.min(width, height) * 0.25,
      width / 2, height * 0.45, Math.max(width, height) * 0.78,
    );
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(2,8,16,0.55)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);
}
