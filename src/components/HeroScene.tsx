import { useEffect, useRef, useState } from 'react';
import { drawScene } from './heroScenePaint';

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/**
 * 首屏：一段真实镜头 + 滚动擦洗。
 *
 * 视频本身是「暮色山海 → 镜头下潜穿过水面 → 水下」的连续镜头（public/hero/dive.mp4）。
 * 交互照搬那类滚动驱动的电影感首屏：
 *   - 没滚到时停在第一帧，滚动多少就走多少（currentTime = p × duration），
 *     手指和画面是同一根轴，不会出现「滚了半天水还没上来」；
 *   - 滚到底（p ≥ 0.985）自动切回播放并循环，水下那段继续缓缓流动；
 *   - 视频缺失或解码失败时退回 Canvas 手绘版，首屏不会白屏。
 */
export default function HeroScene({ active }: { active: boolean }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const progress = useRef(0);
  const target = useRef(0);
  const [fallback, setFallback] = useState(false);

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

    const onScroll = () => {
      // 分母用真实可滚动高度：页面多高就潜多久，滚到底必然 p = 1
      const scrollable = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const span = clamp(scrollable, window.innerHeight * 0.8, window.innerHeight * 1.7);
      target.current = clamp(window.scrollY / span, 0, 1);
    };

    /**
     * 视频**只做滚动的画面**，任何情况下都不 play()。
     *
     * 之前沉底会自播、整片 loop，两次都被反馈「闪一下就没」—— 播放和滚动是
     * 两根不同的时间轴，只要它自己动，就一定会和手指打架。现在：
     * 滚动到哪一帧就是哪一帧，滚到底停在末帧（水下），
     * 画面「活着」的感觉交给 CSS 的极慢推近，而不是播放。
     */
    const paintVideo = (p: number) => {
      if (!video) return;
      const duration = video.duration;
      if (!Number.isFinite(duration) || duration <= 0) {
        video.pause();
        return;
      }
      if (!video.paused) video.pause();
      const want = p >= 0.985 ? duration - 0.04 : p * (duration - 0.05);
      // 每帧都写 currentTime 会让解码器忙于 seek，差得不够多就不写
      if (Math.abs(video.currentTime - want) > 0.02) {
        try {
          video.currentTime = want;
        } catch {
          /* 元数据还没到 */
        }
      }
    };

    const loop = (now: number) => {
      const step = (target.current - progress.current) * 0.12;
      // 限速：一次滚轮/惯性跳很远时，画面最多前进 0.035/帧，看得见地「沉」下去
      progress.current += Math.max(-0.05, Math.min(0.026, step));
      const p = progress.current;
      root.style.setProperty('--hero-p', p.toFixed(4));
      if (fallback) {
        if (ctx) drawScene(ctx, width, height, p, reduce ? 0 : now / 1000);
      } else {
        paintVideo(p);
      }
      raf = requestAnimationFrame(loop);
    };

    resize();
    // 启动时**直接对到当前滚动位置**（刷新会恢复滚动）：
    // 从 0 追过去会让整段下潜在半秒内放完，看起来就是「闪一下」
    onScroll();
    progress.current = target.current;
    if (video) {
      video.pause();
      if (video.readyState >= 1) video.currentTime = 0;
      else video.addEventListener('loadedmetadata', () => {
        video.currentTime = 0;
      }, { once: true });
    }
    raf = requestAnimationFrame(loop);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', resize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', resize);
      root.style.removeProperty('--hero-p');
      if (video) {
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
      <div className="scene-hint">
        <span>向下滚动，沉进这次旅行</span>
        <i />
      </div>
    </div>
  );
}
