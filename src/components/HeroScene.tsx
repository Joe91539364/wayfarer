import { useEffect, useRef, useState } from 'react';
import { drawScene } from './heroScenePaint';

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/**
 * 首屏：先完整播一遍镜头，播完再交给你手动控制。
 *
 * 视频本身是「暮色山海 → 镜头下潜穿过水面 → 水下」的连续镜头（public/hero/dive.mp4）。
 * 两个阶段：
 *   ① auto   —— 进页面就从头播一次，进度由 `currentTime` 驱动，画面一定顺；
 *   ② manual —— 播完（或用户中途滚了一下）才接管：之后滚动只做**步进定位**，
 *               基准点记在切手动的瞬间，所以不会出现「刚看完又跳回开头」。
 * 中途滚轮/触摸 = 想自己来，立刻停机交给手指；滚到底的画面是水下，往上滚可以倒着看。
 * 视频缺失或解码失败时退回 Canvas 手绘版，首屏不会白屏。
 */
export default function HeroScene({ active }: { active: boolean }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const progress = useRef(0);
  const [fallback, setFallback] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!active) return;
    const root = document.documentElement;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d') ?? null;

    let width = window.innerWidth;
    let height = window.innerHeight;
    let raf = 0;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      if (!canvas || !ctx) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    /** 一屏能滚多远：滚到底必然 p = 1 */
    const scrollSpan = () =>
      clamp(Math.max(1, document.documentElement.scrollHeight - window.innerHeight), window.innerHeight * 0.8, window.innerHeight * 1.7);

    // ---- 两阶段状态 ----
    let phase: 'auto' | 'manual' = 'auto';
    /**
     * 手动的映射：p = baseP + (scrollY − originY) / span。
     * originY 是**进入页面时的滚动位置**，不是接管时的位置 ——
     * 否则「减少动效」下第一下滚轮会被当成基准吃掉，画面纹丝不动。
     */
    const originY = window.scrollY;
    let baseY = originY;
    let baseP = 0;

    const enterManual = (p: number) => {
      if (phase === 'manual') return;
      phase = 'manual';
      baseY = originY;
      baseP = p;
      if (video && !video.paused) video.pause();
    };

    const onScroll = () => {
      // 自动播放期间用户一滚，就当他不想看了，交还控制权
      if (phase === 'auto') {
        if (Math.abs(window.scrollY - originY) > 6) enterManual(progress.current);
        return;
      }
      const p = clamp(baseP + (window.scrollY - baseY) / scrollSpan(), 0, 1);
      progress.current = p;
    };

    const startAuto = () => {
      if (!video) return;
      if (reduce) {
        phase = 'manual';
        baseY = originY;
        baseP = 0;
        return;
      }
      phase = 'auto';
      setDone(false);
      try {
        video.currentTime = 0;
      } catch {
        /* 元数据还没到 */
      }
      void video.play().catch(() => {
        // 自动播放被浏览器拒绝：直接进手动模式，还能靠滚动看
        phase = 'manual';
        baseY = originY;
        baseP = 0;
      });
    };

    const onEnded = () => {
      phase = 'manual';
      baseY = originY;
      baseP = 1;
      progress.current = 1;
      setDone(true);
    };

    const paintVideo = () => {
      if (!video) return;
      const duration = video.duration;
      if (!Number.isFinite(duration) || duration <= 0) return;
      if (phase === 'auto') {
        progress.current = clamp(video.currentTime / duration, 0, 1);
        return;
      }
      // 手动阶段只定位，不播放；差得不够多不写 currentTime，省解码器
      if (!video.paused) video.pause();
      const want = clamp(progress.current, 0, 1) * (duration - 0.04);
      if (Math.abs(video.currentTime - want) > 0.02) {
        try {
          video.currentTime = want;
        } catch {
          /* 元数据还没到 */
        }
      }
    };

    const loop = (now: number) => {
      if (fallback) {
        // 兜底版没有自动播放：直接按滚动定位
        if (ctx) drawScene(ctx, width, height, progress.current, reduce ? 0 : now / 1000);
      } else {
        paintVideo();
      }
      root.style.setProperty('--hero-p', progress.current.toFixed(4));
      raf = requestAnimationFrame(loop);
    };

    resize();
    progress.current = 0;
    root.style.setProperty('--hero-p', '0');
    if (video) {
      video.pause();
      video.loop = false;
      video.addEventListener('ended', onEnded);
      if (video.readyState >= 1) startAuto();
      else video.addEventListener('loadedmetadata', startAuto, { once: true });
    } else {
      // 没有视频（或减少动效）：直接进手动模式，滚动看
      phase = 'manual';
      baseY = originY;
      baseP = 0;
    }
    raf = requestAnimationFrame(loop);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('wheel', () => enterManual(progress.current), { passive: true });
    window.addEventListener('touchmove', () => enterManual(progress.current), { passive: true });
    window.addEventListener('resize', resize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', resize);
      root.style.removeProperty('--hero-p');
      if (video) {
        video.removeEventListener('ended', onEnded);
        if (!video.paused) video.pause();
      }
    };
  }, [active, fallback]);

  if (!active) return null;

  return (
    <div className="hero-scene" aria-hidden="true">
      {fallback ? (
        <canvas ref={canvasRef} />
      ) : (
        <video
          ref={videoRef}
          className="hero-video"
          src="/hero/dive.mp4"
          muted
          playsInline
          preload="auto"
          disablePictureInPicture
          onError={() => setFallback(true)}
        />
      )}
      <div className={done ? 'scene-hint done' : 'scene-hint'}>
        <span>{done ? '播完了 · 往下滑继续' : '正在下潜…'}</span>
        <i />
      </div>
    </div>
  );
}
