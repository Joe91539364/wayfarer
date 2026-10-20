"""端到端：用户原话「五一想从杭州去临汾玩玩…」必须解析出 杭州 → 临汾，不再是 杭州 → 杭州。"""
import os, time
for k in ("HTTP_PROXY","HTTPS_PROXY","http_proxy","https_proxy","ALL_PROXY","all_proxy"):
    os.environ.pop(k, None)
os.environ["NO_PROXY"] = "*"
from selenium import webdriver
from selenium.webdriver.edge.options import Options

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "shots")
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
    drv.get("http://127.0.0.1:8787/"); time.sleep(3.5)
    ta = drv.find_element("css selector", "textarea")
    set_text(ta, "五一想从杭州去临汾玩玩，四个人，预算10000，喜欢吃和自然")
    drv.find_element("xpath", "//button[contains(., '开始规划')]").click()
    time.sleep(2.5)

    # 确认卡上的目的地描述：应为「临汾 · …」而不是「杭州 → 杭州」
    body = drv.find_element("css selector", "body").text
    print("CONFIRM_HAS_LINFEN", "临汾" in body)
    print("CONFIRM_HAS_HZ_ORIGIN", "杭州" in body)
    drv.get_screenshot_as_file(os.path.join(OUT, "linfen-1-confirm.png"))

    drv.find_element("xpath", "//button[contains(., '确认，开始规划')]").click()
    ok = False
    for _ in range(90):
        time.sleep(3)
        if drv.find_elements("css selector", ".workspace"):
            ok = True
            break
    print("ITINERARY", ok)
    if ok:
        body = drv.find_element("css selector", "body").text
        print("WORKSPACE_HAS_LINFEN", "临汾" in body)
        print("NOT_HZ_TO_HZ", "杭州 → 杭州" not in body)
        drv.get_screenshot_as_file(os.path.join(OUT, "linfen-2-workspace.png"))
finally:
    drv.quit()
