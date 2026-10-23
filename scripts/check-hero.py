"""端到端：首屏滚动下潜。

检查：canvas 存在 → 顶部是标题屏（输入框在首屏外）→ 滚动后 --hero-p 增大、
标题淡出 → 滚到底时整屏是水下、输入卡片可见。
"""
import os, sys, time

for k in ("HTTP_PROXY", "HTTPS_PROXY", "http_proxy", "https_proxy", "ALL_PROXY", "all_proxy"):
    os.environ.pop(k, None)
os.environ["NO_PROXY"] = "*"

from selenium import webdriver
from selenium.webdriver.edge.options import Options

BASE = os.environ.get("BASE", "http://127.0.0.1:8788")
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "shots")
os.makedirs(OUT, exist_ok=True)

opts = Options()
opts.add_argument("--headless=new")
opts.add_argument("--window-size=1440,900")
opts.add_argument("--no-proxy-server")
drv = webdriver.Edge(options=opts)

fails, passes = [], []


def check(name, cond, detail=""):
    (passes if cond else fails).append(f"{name} {detail}")
    print(f"  {'OK  ' if cond else 'FAIL'} {name} {detail}")


def p_value():
    return float(drv.execute_script("return getComputedStyle(document.documentElement).getPropertyValue('--hero-p') || 0"))


def scroll_to(ratio):
    drv.execute_script("window.scrollTo({top: innerHeight * 1.15 * arguments[0], behavior:'instant'})", ratio)
    time.sleep(1.2)


try:
    drv.get(BASE + "/")
    time.sleep(3.2)

    videos = drv.find_elements("css selector", ".hero-video")
    check("首屏是视频（不是画布）", len(videos) == 1)
    if not videos:
        print("no video element; abort")
        raise SystemExit(1)
    video = videos[0]
    for _ in range(20):
        rs = int(drv.execute_script("return arguments[0].readyState", video))
        if rs >= 2:
            break
        time.sleep(0.6)
    check("视频已能解码（readyState>=2）", rs >= 2, f"readyState={rs}")
    dur = float(drv.execute_script("return arguments[0].duration || 0", video))
    check("拿到时长", dur > 1, f"{dur:.2f}s")
    check("有滚动提示", "沉进这次旅行" in drv.find_element("css selector", ".scene-hint").text)

    h1 = drv.find_element("css selector", ".scene-lede h1")
    color = drv.execute_script("return getComputedStyle(arguments[0]).color", h1)
    check("标题是浅色（压在图上有对比）", color.replace(" ", "").startswith("rgb(255"), color)

    # 首屏：输入框应在视口之外（首屏只放标题）
    box = drv.find_element("css selector", ".composer").rect
    check("首屏看不到输入框", box["y"] > 700, f"composer y={int(box['y'])}")
    p0 = p_value()
    check("进度从 0 开始", abs(p0) < 0.02, f"{p0:.3f}")
    drv.get_screenshot_as_file(os.path.join(OUT, "hero-1-surface.png"))

    # 滚到 45%：镜头开始下潜，视频时间轴跟着走
    scroll_to(0.45)
    p1 = p_value()
    check("滚动后进度上升", p1 > p0 + 0.25, f"{p0:.3f} → {p1:.3f}")
    t1 = float(drv.execute_script("return arguments[0].currentTime", video))
    check("视频跟着滚动擦洗", t1 > dur * 0.25, f"currentTime={t1:.2f}s / {dur:.2f}s")
    drv.get_screenshot_as_file(os.path.join(OUT, "hero-2-dive.png"))

    # 滚到底：进水，输入卡片可见
    scroll_to(0.98)
    p2 = p_value()
    check("滚到底接近 1", p2 > 0.88, f"{p2:.3f}")
    op = float(drv.execute_script("return getComputedStyle(document.querySelector('.scene-lede')).opacity"))
    check("标题已淡出", op < 0.12, f"opacity={op:.2f}")
    visible = drv.execute_script(
        "const r=document.querySelector('.composer').getBoundingClientRect();"
        "return r.top < innerHeight && r.bottom > 0;"
    )
    check("输入卡片进入视口", bool(visible))
    time.sleep(1.2)
    paused = bool(drv.execute_script("return arguments[0].paused", video))
    reduce = bool(drv.execute_script("return matchMedia('(prefers-reduced-motion: reduce)').matches"))
    if reduce:
        # 减少动效偏好下就该停在最后一帧，不许自己动
        check("减少动效：沉底后停在末帧", paused and p2 > 0.95, f"paused={paused}")
    else:
        check("沉底后视频转为循环播放", not paused, f"paused={paused}")
    drv.get_screenshot_as_file(os.path.join(OUT, "hero-3-underwater.png"))

    print(f"\n{len(passes)} passed, {len(fails)} failed")
    for f in fails:
        print("  -", f)
finally:
    drv.quit()
