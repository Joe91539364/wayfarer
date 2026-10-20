"""宝藏小店冒烟：切 tab、按城市筛、搜索、点卡片回填。"""
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
    drv.get("http://127.0.0.1:8787/"); time.sleep(3)
    drv.find_element("xpath", "//nav[contains(@class,'dock')]//button[contains(., '发现')]").click(); time.sleep(2)
    drv.find_element("xpath", "//button[contains(@class,'dv-tab')][contains(., '宝藏小店')]").click(); time.sleep(1.5)
    n_all = len(drv.find_elements("css selector", ".shop-card"))
    print("SHOPS_ALL", n_all)
    drv.save_screenshot(os.path.join(ROOT, "shots", "treasure-all.png"))

    # 城市筛选：长沙
    drv.find_element("xpath", "//button[contains(@class,'atlas-prov')][normalize-space()='长沙']").click(); time.sleep(1)
    n_cs = len(drv.find_elements("css selector", ".shop-card"))
    names = [e.find_element("css selector", "b").text for e in drv.find_elements("css selector", ".shop-card")]
    print("SHOPS_CHANGSHA", n_cs, names[:6])

    # 搜索
    box = drv.find_element("css selector", ".atlas-search")
    drv.execute_script("""
      const el=arguments[0];
      const set=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;
      set.call(el,'咖啡'); el.dispatchEvent(new Event('input',{bubbles:true}));
    """, box); time.sleep(1)
    print("SEARCH_KAFEI", len(drv.find_elements("css selector", ".shop-card")))
    drv.save_screenshot(os.path.join(ROOT, "shots", "treasure-search.png"))

    # 点第一张
    drv.find_elements("css selector", ".shop-card")[0].click(); time.sleep(2)
    print("FILLED", drv.find_element("css selector", "textarea").get_attribute("value")[:70])
    print("CLOSED", len(drv.find_elements("css selector", ".discover-modal")) == 0)
finally:
    drv.quit()
