"""跑一次规划并把生成的行程 JSON 存下来，供离线分析。"""
import os, time, json
for k in ("HTTP_PROXY","HTTPS_PROXY","http_proxy","https_proxy","ALL_PROXY","all_proxy"):
    os.environ.pop(k, None)
os.environ["NO_PROXY"] = "*"
from selenium import webdriver
from selenium.webdriver.edge.options import Options
BASE = os.environ.get("BASE", "http://127.0.0.1:8788")
OUT = os.environ.get("OUT", "shots/iti-dump.json")
opts = Options()
opts.add_argument("--headless=new"); opts.add_argument("--window-size=1500,1400"); opts.add_argument("--no-proxy-server")
drv = webdriver.Edge(options=opts)
def set_text(el, v):
    drv.execute_script("""
      const el=arguments[0], v=arguments[1];
      const set=Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype,'value').set;
      set.call(el,v); el.dispatchEvent(new Event('input',{bubbles:true}));
    """, el, v)
try:
    drv.get(BASE + "/"); time.sleep(3.5)
    ta = drv.find_element("css selector", "textarea")
    set_text(ta, "十一想去重庆玩三天，两个人，预算6000，主要想吃好吃的，也想看自然风光")
    drv.find_element("xpath", "//button[contains(., '开始规划')]").click()
    time.sleep(2.5)
    try:
        drv.find_element("xpath", "//button[contains(., '确认，开始规划')]").click()
    except Exception: pass
    for _ in range(90):
        time.sleep(3)
        if drv.find_elements("css selector", ".workspace"): break
    time.sleep(2)
    raw = drv.execute_script("return localStorage.getItem('wayfarer.itinerary.v3')")
    with open(OUT, "w", encoding="utf-8") as f:
        f.write(raw or "")
    print("DUMPED", len(raw or ""))
finally:
    drv.quit()
