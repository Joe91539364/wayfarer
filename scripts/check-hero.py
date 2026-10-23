"""端到端：首屏「先播一遍，再手动控制」。

1) 打开首页 → 视频自动从头播一遍（currentTime 在涨），标题跟着淡出；
2) 播完停在水下末帧，提示变成「播完了」；
3) 之后往下滚不会跳回开头（基准点记在接管那一刻）；
4) prefers-reduced-motion 下不自动播，直接靠滚动定位。
"""
import os
import sys
import time

for k in ("HTTP_PROXY", "HTTPS_PROXY", "http_proxy", "https_proxy", "ALL_PROXY", "all_proxy"):
    os.environ.pop(k, None)
os.environ["NO_PROXY"] = "*"

from selenium import webdriver
from selenium.webdriver.edge.options import Options

BASE = os.environ.get("BASE", "http://127.0.0.1:8788")
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "shots")
os.makedirs(OUT, exist_ok=True)

fails, passes = [], []


def check(name, cond, detail=""):
    (passes if cond else fails).append(f"{name} {detail}")
    print(f"  {'OK  ' if cond else 'FAIL'} {name} {detail}")


def make_driver(reduce=False):
    opts = Options()
    opts.add_argument("--headless=new")
    opts.add_argument("--window-size=1440,900")
    opts.add_argument("--no-proxy-server")
    drv = webdriver.Edge(options=opts)
    try:
        drv.execute_cdp_cmd(
            "Emulation.setEmulatedMedia",
            {"features": [{"name": "prefers-reduced-motion", "value": "reduce" if reduce else "no-preference"}]},
        )
    except Exception:
        pass
    return drv


def p_value(drv):
    return float(drv.execute_script("return getComputedStyle(document.documentElement).getPropertyValue('--hero-p') || 0"))


try:
    drv = make_driver(reduce=False)
    drv.get(BASE + "/")
    time.sleep(1.2)

    videos = drv.find_elements("css selector", ".hero-video")
    check("首屏是视频", len(videos) == 1)
    if not videos:
        raise SystemExit(1)
    video = videos[0]
    for _ in range(20):
        if int(drv.execute_script("return arguments[0].readyState", video)) >= 2:
            break
        time.sleep(0.4)
    dur = float(drv.execute_script("return arguments[0].duration || 0", video))
    check("视频可解码", dur > 1, f"{dur:.2f}s")

    t0 = float(drv.execute_script("return arguments[0].currentTime", video))
    paused0 = bool(drv.execute_script("return arguments[0].paused", video))
    check("进来就自动播", (not paused0) or t0 > 0.1, f"paused={paused0} t={t0:.2f}")
    p_early = p_value(drv)
    check("播放进度驱动画面（--hero-p 跟着走）", p_early > 0.02, f"p={p_early:.3f}")

    ended = False
    for _ in range(30):
        time.sleep(0.4)
        if drv.execute_script("return arguments[0].ended", video):
            ended = True
            break
    check("播完一遍", ended)
    time.sleep(0.5)
    t_end = float(drv.execute_script("return arguments[0].currentTime", video))
    check("停在末帧（水下）", t_end > dur * 0.95, f"t={t_end:.2f} / {dur:.2f}")
    p_end = p_value(drv)
    check("画面进度到 1", p_end > 0.97, f"p={p_end:.3f}")
    op = float(drv.execute_script("return getComputedStyle(document.querySelector('.scene-lede')).opacity"))
    check("标题已淡出", op < 0.12, f"opacity={op:.2f}")
    hint = drv.execute_script("return document.querySelector('.scene-hint').textContent")
    check("提示变成「播完了」", "播完了" in hint, hint.strip())
    drv.get_screenshot_as_file(os.path.join(OUT, "hero-autoplay.png"))

    drv.execute_script("window.scrollTo({top: 420, behavior:'instant'})")
    time.sleep(1.0)
    t_after = float(drv.execute_script("return arguments[0].currentTime", video))
    check("接管后往下滚不回放", t_after > dur * 0.9, f"t={t_after:.2f}")
    visible = drv.execute_script(
        "const r=document.querySelector('.composer').getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0;"
    )
    check("输入卡片进视口", bool(visible))
    drv.get_screenshot_as_file(os.path.join(OUT, "hero-manual.png"))

    drv2 = make_driver(reduce=True)
    try:
        drv2.get(BASE + "/")
        time.sleep(2.5)
        v2 = drv2.find_elements("css selector", ".hero-video")
        if v2:
            paused = bool(drv2.execute_script("return arguments[0].paused", v2[0]))
            ct = float(drv2.execute_script("return arguments[0].currentTime", v2[0]))
            check("减少动效：不自动播", paused and ct < 0.3, f"paused={paused} t={ct:.2f}")
            drv2.execute_script("window.scrollTo({top: 300, behavior:'instant'})")
            time.sleep(0.9)
            ct2 = float(drv2.execute_script("return arguments[0].currentTime", v2[0]))
            check("减少动效：滚动仍能定位", ct2 > 0.2, f"t={ct2:.2f}")
        else:
            check("减少动效下有视频", False)
    finally:
        drv2.quit()

    print(f"\n{len(passes)} passed, {len(fails)} failed")
    for f in fails:
        print("  -", f)
    if fails:
        sys.exit(1)
finally:
    drv.quit()
