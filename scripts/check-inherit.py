"""端到端：当前行程是「杭州 → 临汾」，侧栏改成「想去成都」（没说出发地）——
确认卡必须弹出来问出发地，而不是拿着「杭州 → 成都」直接排。"""
import json, os, time
for k in ("HTTP_PROXY","HTTPS_PROXY","http_proxy","https_proxy","ALL_PROXY","all_proxy"):
    os.environ.pop(k, None)
os.environ["NO_PROXY"] = "*"
from selenium import webdriver
from selenium.webdriver.edge.options import Options

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "shots")
ITI = json.load(open(os.path.join(ROOT, "scripts", "iti-fixture.json"), encoding="utf-8"))

opts = Options()
opts.add_argument("--headless=new"); opts.add_argument("--window-size=1360,1000"); opts.add_argument("--no-proxy-server")
drv = webdriver.Edge(options=opts)

def set_text(el, value):
    drv.execute_script("""
      const el=arguments[0], v=arguments[1];
      const set=Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype,'value').set;
      set.call(el,v);
      el.dispatchEvent(new Event('input',{bubbles:true}));
    """, el, value)

try:
    drv.get("http://127.0.0.1:8787/"); time.sleep(3)
    drv.execute_script("localStorage.setItem('wayfarer.itinerary.v3', arguments[0]);", json.dumps(ITI, ensure_ascii=False))
    drv.get("http://127.0.0.1:8787/"); time.sleep(3.5)
    body = drv.find_element("css selector", "body").text
    print("SEEDED_LINFEN", "临汾" in body)

    # 侧栏需求框改成新需求：目的地变了、没说出发地
    box = drv.find_element("css selector", "#req-input")
    set_text(box, "五一想去成都玩4天，两个人，预算6000，喜欢吃和自然风光，不想太赶")
    time.sleep(0.5)
    drv.find_element("xpath", "//button[contains(., '重新规划')]").click()
    time.sleep(3)

    body = drv.find_element("css selector", "body").text
    confirm_up = "出发" in body and ("未说" in body or "出发地" in body)
    print("CONFIRM_ASKS_ORIGIN", confirm_up)
    # 出发地输入框应为空（不继承杭州）
    vals = [i.get_attribute("value") for i in drv.find_elements("css selector", ".modal input")]
    print("ORIGIN_INPUT_EMPTY", all((v or "").strip() != "杭州" for v in vals), vals)
    drv.get_screenshot_as_file(os.path.join(OUT, "inherit-1-ask-origin.png"))
finally:
    drv.quit()
