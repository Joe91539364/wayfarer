"""端到端：宿迁→景德镇 三天，验证天数=3、城市包建成、无报错条。"""
import os, time
for k in ("HTTP_PROXY","HTTPS_PROXY","http_proxy","https_proxy","ALL_PROXY","all_proxy"):
    os.environ.pop(k, None)
os.environ["NO_PROXY"] = "*"
from selenium import webdriver
from selenium.webdriver.edge.options import Options

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
opts = Options()
opts.add_argument("--headless=new"); opts.add_argument("--window-size=1360,1000"); opts.add_argument("--no-proxy-server")
drv = webdriver.Edge(options=opts)
try:
    drv.get("http://127.0.0.1:8787/"); time.sleep(3.5)
    print("SERVER_WARN_SHOWN", len(drv.find_elements("css selector", ".server-warn")) > 0)

    ta = drv.find_element("css selector", "textarea")
    drv.execute_script("""
      const el=arguments[0];
      const set=Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype,'value').set;
      set.call(el,'我从宿迁出发 一个人去景德镇玩三天 预算两千 主要去吃美食');
      el.dispatchEvent(new Event('input',{bubbles:true}));
    """, ta)
    drv.find_element("xpath", "//button[contains(., '开始规划')]").click()
    time.sleep(2.5)

    cells = drv.find_elements("css selector", ".req-cell")
    vals = {}
    for c in cells:
        lab = c.find_element("css selector", ".req-label").text
        vals[lab] = c.text.replace(lab, "").strip().replace("\n", " ")
    print("CELLS", {k: v[:24] for k, v in vals.items()})
    print("DAYS_OK", vals.get("天数", "").startswith("3"))
    print("ORIGIN_OK", "宿迁" in vals.get("出发地", ""))
    drv.save_screenshot(os.path.join(ROOT, "shots", "confirm-jdz.png"))

    drv.find_element("xpath", "//button[contains(., '确认，开始规划')]").click()
    ok = False
    for _ in range(40):
        time.sleep(3)
        if drv.find_elements("css selector", ".req-pack.fail"):
            print("PACK_FAIL", drv.find_element("css selector", ".req-pack").text[:120])
            break
        if drv.find_elements("css selector", ".timeline, .workspace, .iti-head"):
            ok = True
            break
    print("ITINERARY_SHOWN", ok)
    drv.save_screenshot(os.path.join(ROOT, "shots", "plan-jdz.png"))
finally:
    drv.quit()
