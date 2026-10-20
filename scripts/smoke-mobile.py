"""手机端冒烟：390x844 视口下跑完整流程，顺带测「下一站提醒」和所有跳转链接。

流程：
  1. 390x844 下输入完整需求 -> 等行程出来 -> 截图（验证手机布局）
  2. 拖旅程时钟到 D1 09:20 -> 应出现「下一站出发提醒」条 -> 截图，读高德导航链接
  3. 点「叫车」-> 打车面板应弹出 -> 收集 6 个平台的跳转链接 -> 截图
  4. 点地图「全览」-> 暗色行程图应出现 -> 截图
  5. 收集页面全部外链，逐个 HEAD/GET 测可达性（外站可能拒HEAD，只记录不判定失败）

输出： shots/smoke-mobile.json（utf-8）+ shots/mobile-*.png
"""
import json
import os
import ssl
import sys
import time
import urllib.request

for k in ("HTTP_PROXY", "HTTPS_PROXY", "http_proxy", "https_proxy", "ALL_PROXY", "all_proxy"):
    os.environ.pop(k, None)
os.environ["NO_PROXY"] = "*"
os.environ["no_proxy"] = "*"

from selenium import webdriver
from selenium.webdriver.edge.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

URL = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8787/"
FULL = "十月二十五号我一个人从江苏宿迁出发 去江西景德镇玩三天 预算七千 主要去吃美食"
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "shots")
os.makedirs(OUT, exist_ok=True)

SET_TEXT = """
const el = arguments[0], val = arguments[1];
const s = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
s.call(el, val);
el.dispatchEvent(new Event('input', { bubbles: true }));
"""

SET_SLIDER = """
const el = document.querySelector('.ribbon-slider');
if (!el) { return 'no-slider'; }
const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
s.call(el, String(arguments[0]));
el.dispatchEvent(new Event('input', { bubbles: true }));
return 'ok';
"""

opts = Options()
opts.binary_location = r"C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
opts.add_argument("--headless=new")
opts.add_argument("--window-size=390,844")
opts.add_argument("--no-sandbox")
opts.add_argument("--disable-gpu")
opts.add_argument("--user-agent=Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1")

result = {"viewport": "390x844", "checks": {}}
d = webdriver.Edge(options=opts)
w = WebDriverWait(d, 40)

def shot(name):
    d.save_screenshot(os.path.join(OUT, name))

def link_status(url, timeout=6):
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    for method in ("HEAD", "GET"):
        try:
            req = urllib.request.Request(url, method=method, headers={"User-Agent": "Mozilla/5.0 (iPhone; like Mac OS X)"})
            opener = urllib.request.build_opener(urllib.request.ProxyHandler({}), urllib.request.HTTPSHandler(context=ctx))
            r = opener.open(req, timeout=timeout)
            return r.status
        except urllib.error.HTTPError as e:
            return e.code
        except Exception:
            continue
    return None

try:
    d.get(URL)
    time.sleep(2.5)
    ta = w.until(EC.presence_of_element_located((By.TAG_NAME, "textarea")))
    d.execute_script(SET_TEXT, ta, FULL)
    time.sleep(0.3)
    w.until(EC.element_to_be_clickable((By.XPATH, "//button[contains(., '开始规划')]"))).click()

    deadline = time.time() + 150
    ok = False
    while time.time() < deadline:
        if d.find_elements(By.CSS_SELECTOR, ".ic-card") and d.find_elements(By.CSS_SELECTOR, ".item-name"):
            ok = True
            break
        time.sleep(1.5)
    result["checks"]["plan"] = ok
    print("plan:", ok, flush=True)
    time.sleep(1.2)

    # ---- 手机布局截图 ----
    h = d.execute_script("return Math.min(document.body.scrollHeight, 9000)")
    d.set_window_size(390, min(int(h), 2000))
    time.sleep(0.6)
    shot("mobile-1-plan.png")

    # ---- 下一站提醒：拖时钟到 D1 09:20（每盐所 09:47 前）----
    ret = d.execute_script(SET_SLIDER, 30)
    time.sleep(1.0)
    deps = d.find_elements(By.CSS_SELECTOR, ".dep-bar")
    result["checks"]["dep_bar"] = bool(deps)
    if deps:
        result["dep_text"] = deps[0].text.strip()
        navs = [a.get_attribute("href") for a in d.find_elements(By.CSS_SELECTOR, ".dep-actions a")]
        result["dep_nav"] = navs
        shot("mobile-2-depart.png")
        print("dep-bar:", result["dep_text"][:80], "| nav:", navs, flush=True)
        # 点「叫车」
        btns = [b for b in d.find_elements(By.CSS_SELECTOR, ".dep-actions button") if "叫车" in b.text]
        if btns:
            btns[0].click()
            time.sleep(1.2)
            overlays = d.find_elements(By.CSS_SELECTOR, ".overlay")
            result["checks"]["taxi_overlay"] = bool(overlays)
            if overlays:
                taxi_links = [
                    a.get_attribute("href") for a in overlays[0].find_elements(By.CSS_SELECTOR, "a[href]")
                ]
                result["taxi_links"] = taxi_links
                shot("mobile-3-taxi.png")
                print("taxi links:", len(taxi_links), flush=True)
                # 关掉
                close = overlays[0].find_elements(By.CSS_SELECTOR, "button")
                for b in close:
                    if not b.text:
                        b.click()
                        break
                time.sleep(0.6)

    # ---- 暗色全览图 ----
    chips = [c for c in d.find_elements(By.CSS_SELECTOR, ".map-chip") if "全览" in c.text]
    if chips:
        chips[0].click()
        time.sleep(1.2)
        result["checks"]["dark_map"] = bool(d.find_elements(By.CSS_SELECTOR, ".map-wrap.is-dark"))
        shot("mobile-4-darkmap.png")
        print("dark map:", result["checks"]["dark_map"], flush=True)
        back = [c for c in d.find_elements(By.CSS_SELECTOR, ".map-chip") if "全览" in c.text]
        if back:
            back[0].click()
            time.sleep(0.6)

    # ---- 全部外链可达性 ----
    hrefs = []
    for a in d.find_elements(By.CSS_SELECTOR, "a[href^='http']"):
        u = a.get_attribute("href")
        if u and u not in hrefs:
            hrefs.append(u)
    result["links"] = [{"url": u, "status": link_status(u)} for u in hrefs]
    print("links:", json.dumps(result["links"], ensure_ascii=False), flush=True)
finally:
    d.quit()

with open(os.path.join(OUT, "smoke-mobile.json"), "w", encoding="utf-8") as f:
    json.dump(result, f, ensure_ascii=False, indent=1)
print("done")
