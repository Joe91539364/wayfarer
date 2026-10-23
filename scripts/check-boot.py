"""端到端：有存档行程时，打开就进工作台，首页（首屏视频）不许闪一下。

做法：在页面加载前装一个 MutationObserver，记录 `.hero-scene` 有没有出现过；
然后写入一份存档行程、重新加载，断言它从头到尾没出现过。
"""
import json
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

with open(os.path.join(ROOT, "scripts", "iti-fixture.json"), encoding="utf-8") as f:
    FIXTURE = f.read()

opts = Options()
opts.add_argument("--headless=new")
opts.add_argument("--window-size=1440,900")
opts.add_argument("--no-proxy-server")
drv = webdriver.Edge(options=opts)

fails, passes = [], []


def check(name, cond, detail=""):
    (passes if cond else fails).append(f"{name} {detail}")
    print(f"  {'OK  ' if cond else 'FAIL'} {name} {detail}")


try:
    # 页面加载前就挂观察器：首帧渲染也逃不掉
    drv.execute_cdp_cmd(
        "Page.addScriptToEvaluateOnNewDocument",
        {
            "source": """
              window.__heroSeen = false;
              window.__bootAt = performance.now();
              const note = () => { if (document.querySelector('.hero-scene')) window.__heroSeen = true; };
              document.addEventListener('DOMContentLoaded', () => {
                note();
                new MutationObserver(note).observe(document.documentElement, { childList: true, subtree: true });
              });
            """
        },
    )

    # 先落地一次，拿到 origin 才能写 localStorage
    drv.get(BASE + "/")
    time.sleep(1.5)
    drv.execute_script("localStorage.setItem('wayfarer.itinerary.v3', arguments[0])", FIXTURE)

    drv.get(BASE + "/")
    time.sleep(2.5)

    seen = bool(drv.execute_script("return window.__heroSeen"))
    check("有存档时不渲染首页（video 不闪）", not seen, f"heroSeen={seen}")
    check("直接进入工作台", len(drv.find_elements("css selector", ".workspace")) == 1)
    title = drv.find_element("css selector", ".workspace").text[:40].replace("\n", " ")
    check("工作台是存档那趟行程", "临汾" in drv.find_element("css selector", "body").text, title)
    drv.get_screenshot_as_file(os.path.join(OUT, "boot-restored.png"))

    # 反过来：清掉存档，首屏视频应该在
    drv.execute_script("localStorage.removeItem('wayfarer.itinerary.v3')")
    drv.get(BASE + "/")
    time.sleep(2.5)
    check("没存档时首屏是视频", len(drv.find_elements("css selector", ".hero-video")) == 1)
    check("没存档时没有工作台", len(drv.find_elements("css selector", ".workspace")) == 0)

    print(f"\n{len(passes)} passed, {len(fails)} failed")
    for f in fails:
        print("  -", f)
    if fails:
        sys.exit(1)
finally:
    drv.quit()
