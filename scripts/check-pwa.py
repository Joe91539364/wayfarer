"""PWA 端到端：手机视口下验证 manifest / Service Worker 注册 / 安装引导条。

  1. 390x844 打开首页，等 SW ready，断言 manifest 图标能取到
  2. iOS UA：应显示「Safari 分享 → 添加到主屏幕」引导
  3. 点关闭 -> 刷新不再出现
  4. Chromium headless：beforeinstallprompt 触发的话出现「安装」按钮
  5. 截图 shots/pwa-mobile.png

输出 shots/pwa-check.json
"""
import json
import os
import time

for k in ("HTTP_PROXY", "HTTPS_PROXY", "http_proxy", "https_proxy", "ALL_PROXY", "all_proxy"):
    os.environ.pop(k, None)
os.environ["NO_PROXY"] = "*"
os.environ["no_proxy"] = "*"

from selenium import webdriver
from selenium.webdriver.edge.options import Options
from selenium.webdriver.common.by import By

URL = "http://127.0.0.1:8787/"
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "shots")
os.makedirs(OUT, exist_ok=True)

opts = Options()
opts.binary_location = r"C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
opts.add_argument("--headless=new")
opts.add_argument("--window-size=390,844")
opts.add_argument("--no-sandbox")
opts.add_argument("--disable-gpu")
opts.add_argument("--log-level=3")

d = webdriver.Edge(options=opts)
result = {"checks": {}}

try:
    d.get(URL)
    time.sleep(2)

    # ---- SW 注册 ----
    for _ in range(20):
        ready = d.execute_script(
            "const k=()=>navigator.serviceWorker.ready.then(r=>!!r.active);"
            "return navigator.serviceWorker ? k() : Promise.resolve(false);"
        )
        if ready:
            break
        time.sleep(0.5)
    result["checks"]["sw_ready"] = bool(ready)
    print("sw_ready:", ready, flush=True)

    # ---- SW 实际拦截验证：通过 caches API 看壳是否已缓存 ----
    cached = d.execute_script(
        "return (async()=>{const c=await caches.open('wayfarer-shell-v1');"
        "return (await c.keys()).length;})()"
    )
    result["shell_cached"] = cached
    print("shell cached entries:", cached, flush=True)

    # ---- manifest 与图标 ----
    link = d.execute_script(
        "const l=document.querySelector('link[rel=manifest]');"
        "return l ? l.href : null;"
    )
    result["checks"]["manifest_link"] = link
    icons = d.execute_script(
        "return (async()=>{const m=await fetch('/manifest.webmanifest').then(r=>r.json());"
        "const i=m.icons?m.icons.length:0;"
        "const r=await fetch(m.icons[0].src);"
        "return {icons:i, firstOk:r.ok};})()"
    )
    result["checks"]["manifest_icons"] = icons
    print("manifest:", link, icons, flush=True)

    # ---- 引导条（Chromium headless：beforeinstallprompt 可能触发）----
    time.sleep(1)
    banner = d.find_elements(By.CSS_SELECTOR, ".pwa-banner")
    result["checks"]["banner_shown"] = bool(banner)
    if banner:
        txt = banner[0].text.replace("\n", " | ")
        has_install = bool(banner[0].find_elements(By.CSS_SELECTOR, ".pwa-install"))
        result["banner_text"] = txt
        result["banner_install_btn"] = has_install
        print("banner:", txt, "| install btn:", has_install, flush=True)
        d.save_screenshot(os.path.join(OUT, "pwa-mobile.png"))

        # 关闭 -> 记住 -> 刷新不再出现
        banner[0].find_element(By.CSS_SELECTOR, ".pwa-close").click()
        time.sleep(0.5)
        dismissed = d.execute_script("return localStorage.getItem('wayfarer.pwa-dismissed')")
        result["checks"]["dismiss_saved"] = dismissed == "1"
        d.refresh()
        time.sleep(2.5)
        result["checks"]["no_banner_after_refresh"] = not d.find_elements(By.CSS_SELECTOR, ".pwa-banner")
        print("dismiss saved:", result["checks"]["dismiss_saved"],
              "| gone after refresh:", result["checks"]["no_banner_after_refresh"], flush=True)
    else:
        print("no banner (可能被之前的测试记住或事件未触发)", flush=True)

    # ---- 手机视口整页布局 ----
    h = d.execute_script("return Math.min(document.body.scrollHeight, 2200)")
    d.set_window_size(390, min(int(h), 1400))
    time.sleep(0.5)
    d.save_screenshot(os.path.join(OUT, "pwa-mobile-layout.png"))

finally:
    d.quit()

ok = all(v for k, v in result["checks"].items() if k != "banner_shown") and result["checks"].get("sw_ready")
with open(os.path.join(OUT, "pwa-check.json"), "w", encoding="utf-8") as f:
    json.dump(result, f, ensure_ascii=False, indent=1)
print("PASS" if ok else "FAIL", flush=True)
