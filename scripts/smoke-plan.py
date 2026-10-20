"""端到端 smoke（两个用例）：

A. 信息齐全的一句话 -> 不弹确认卡，直接出行程（含城际交通、吃什么）
B. 缺出发地/日期的一句话 -> 必须弹需求确认卡，且出发地/日期标「待补」

用法： python scripts/smoke-plan.py [url]
输出： shots/smoke-plan.json（utf-8），shots/smoke-*.png
"""
import json
import os
import sys
import time

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
PARTIAL = "去景德镇玩三天 主要吃美食"
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "shots")
os.makedirs(OUT, exist_ok=True)

SET_TEXT = """
const el = arguments[0], val = arguments[1];
const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
setter.call(el, val);
el.dispatchEvent(new Event('input', { bubbles: true }));
"""

opts = Options()
opts.binary_location = r"C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
opts.add_argument("--headless=new")
opts.add_argument("--window-size=1720,1180")
opts.add_argument("--no-sandbox")
opts.add_argument("--disable-gpu")

result = {"url": URL, "cases": {}}
d = webdriver.Edge(options=opts)
w = WebDriverWait(d, 40)

def log(msg):
    print(msg, flush=True)

def type_and_run(text):
    ta = w.until(EC.presence_of_element_located((By.TAG_NAME, "textarea")))
    d.execute_script(SET_TEXT, ta, text)
    time.sleep(0.3)
    w.until(EC.element_to_be_clickable((By.XPATH, "//button[contains(., '开始规划')]"))).click()

def read_req_card():
    cells = []
    for c in d.find_elements(By.CSS_SELECTOR, ".req-cell"):
        label = c.find_element(By.CSS_SELECTOR, ".req-label").text.strip()
        try:
            val = c.find_element(By.CSS_SELECTOR, ".req-value").text.strip()
        except Exception:
            val = "(editing)"
        cells.append({"label": label, "value": val, "missing": "is-missing" in c.get_attribute("class")})
    return cells

try:
    # ---------- 用例 B：信息不全 -> 必须弹确认卡 ----------
    d.get(URL)
    time.sleep(2.5)
    type_and_run(PARTIAL)
    try:
        w.until(EC.presence_of_element_located((By.CSS_SELECTOR, ".req-card")))
        time.sleep(0.8)
        cells = read_req_card()
        result["cases"]["partial"] = {
            "card": True,
            "requirements": cells,
            "hint": d.find_element(By.CSS_SELECTOR, ".req-hint").text.strip(),
        }
        d.save_screenshot(os.path.join(OUT, "smoke-1-requirements.png"))
        log("B: req-card ok | " + json.dumps(cells, ensure_ascii=False))
        # 取消，别真跑
        d.find_element(By.XPATH, "//button[contains(., '重说一遍')]").click()
        time.sleep(0.6)
    except Exception as e:
        d.save_screenshot(os.path.join(OUT, "smoke-B-fail.png"))
        result["cases"]["partial"] = {"card": False, "error": repr(e)}
        log("B: FAIL no req-card")

    # ---------- 用例 A：信息齐全 -> 直接排 ----------
    type_and_run(FULL)
    deadline = time.time() + 150
    got = False
    while time.time() < deadline:
        if d.find_elements(By.CSS_SELECTOR, ".ic-card") and d.find_elements(By.CSS_SELECTOR, ".item-name"):
            got = True
            break
        time.sleep(1.5)
    caseA = {"direct": got}
    if got:
        time.sleep(1.0)
        ics = [e.text.strip() for e in d.find_elements(By.CSS_SELECTOR, ".ic-card")]
        caseA["intercity"] = ics[0] if ics else None
        caseA["intercity_links"] = [a.get_attribute("href") for a in d.find_elements(By.CSS_SELECTOR, ".ic-links a")][:6]
        caseA["items"] = len(d.find_elements(By.CSS_SELECTOR, ".item-name"))
        caseA["item_names"] = [e.text.strip() for e in d.find_elements(By.CSS_SELECTOR, ".item-name")][:12]
        caseA["food"] = len(d.find_elements(By.CSS_SELECTOR, ".food-list .food-body"))
        caseA["food_names"] = [e.text.strip().split("\n")[0] for e in d.find_elements(By.CSS_SELECTOR, ".food-body")][:8]
        caseA["resident_pill"] = [e.text.strip() for e in d.find_elements(By.CSS_SELECTOR, ".resident-pill")][:1]
        d.save_screenshot(os.path.join(OUT, "smoke-2-plan.png"))
        h = d.execute_script("return Math.min(document.body.scrollHeight, 6000)")
        d.set_window_size(1720, min(int(h) + 100, 4000))
        time.sleep(0.8)
        d.save_screenshot(os.path.join(OUT, "smoke-3-full.png"))
        log("A: ok | items %s | food %s | resident %s" % (caseA["items"], caseA["food"], caseA["resident_pill"]))
        log("A names: " + json.dumps(caseA["item_names"], ensure_ascii=False))
        log("A food : " + json.dumps(caseA["food_names"], ensure_ascii=False))
    else:
        d.save_screenshot(os.path.join(OUT, "smoke-A-fail.png"))
        log("A: FAIL timeout")
    result["cases"]["full"] = caseA
finally:
    d.quit()

with open(os.path.join(OUT, "smoke-plan.json"), "w", encoding="utf-8") as f:
    json.dump(result, f, ensure_ascii=False, indent=1)
print("done")
