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

    // 只有真实的滚动动作（滚轮 / 触摸 / 键盘）才允许进入续播：
    // 刷新后浏览器会把滚动位置恢复到上次的位置，那次 scroll 不是用户操作，
    // 一开播就会从片尾「嗖」一下 —— 用户说的「启动时一闪而过」就是它
    let userScrolled = false;
    const markUser = () => {
      userScrolled = true;
    };

    const onScroll = () => {
      // 分母用真实可滚动高度：页面多高就潜多久，滚到底必然 p = 1
      const scrollable = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const span = clamp(scrollable, window.innerHeight * 0.8, window.innerHeight * 1.7);
      target.current = clamp(window.scrollY / span, 0, 1);
    };

    // 沉底后的「续播」只循环最后一小段水下镜头，不回到片头的天空 ——
    // 否则整片 loop 会从片尾跳回 0 秒，看上去就是「一闪而过」
    const TAIL_SECONDS = 1.6;
    let holdSince = 0;

    const paintVideo = (p: number, now: number) => {
      if (!video) return;
      const duration = video.duration;
      if (!Number.isFinite(duration) || duration <= 0) {
        video.pause();
        return;
      }

      if (p < 0.985) {
        holdSince = 0;
        video.loop = false;
        if (!video.paused) video.pause();
        const want = p * (duration - 0.05);
        // 每帧都写 currentTime 会让解码器忙于 seek，差得不够多就不写
        if (Math.abs(video.currentTime - want) > 0.02) {
          try {
            video.currentTime = want;
          } catch {
            /* 元数据还没到 */
          }
        }
        return;
      }

      if (!userScrolled) {
        video.pause();
        return;
      }
      if (!holdSince) holdSince = now;
      if (now - holdSince < 240) {
        video.pause();
        return;
      }
      const tailStart = Math.max(0, duration - TAIL_SECONDS);
      if (reduce) {
        // 减少动效：停在尾巴的第一帧，不自己动
        video.pause();
        if (Math.abs(video.currentTime - tailStart) > 0.05) video.currentTime = tailStart;
        return;
      }
      video.loop = false;
      if (video.currentTime < tailStart || video.currentTime > duration - 0.06) {
        video.currentTime = tailStart;
      }
      if (video.paused) void video.play().catch(() => undefined);
    };

    // 尾部循环：播到片尾就退回 tailStart，而不是 loop 到 0
    const onTimeUpdate = () => {
      if (!video) return;
      const duration = video.duration;
      if (!Number.isFinite(duration) || duration <= 0) return;
      if (video.paused) return;
      const tailStart = Math.max(0, duration - TAIL_SECONDS);
      if (video.currentTime > duration - 0.12) video.currentTime = tailStart;
    };

    const loop = (now: number) => {
      progress.current += (target.current - progress.current) * 0.12;
      const p = progress.current;
      root.style.setProperty('--hero-p', p.toFixed(4));
      if (fallback) {
        if (ctx) drawScene(ctx, width, height, p, reduce ? 0 : now / 1000);
      } else {
        paintVideo(p, now);
      }
      raf = requestAnimationFrame(loop);
    };

    resize();
    // 启动时先钉在第一帧：浏览器的滚动恢复会在稍后触发一次 scroll，
    // 那次才算「真的滚过」，也只有那时才允许进入续播
    target.current = 0;
    progress.current = 0;
    if (video) {
      video.pause();
      if (video.readyState >= 1) video.currentTime = 0;
      else video.addEventListener('loadedmetadata', () => {
        video.currentTime = 0;
      }, { once: true });
      video.addEventListener('timeupdate', onTimeUpdate);
    }
    raf = requestAnimationFrame(loop);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('wheel', markUser, { passive: true });
    window.addEventListener('touchmove', markUser, { passive: true });
    window.addEventListener('keydown', markUser);
    window.addEventListener('resize', resize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('wheel', markUser);
      window.removeEventListener('touchmove', markUser);
      window.removeEventListener('keydown', markUser);
      window.removeEventListener('resize', resize);
      root.style.removeProperty('--hero-p');
      if (video) {
        video.removeEventListener('timeupdate', onTimeUpdate);
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
