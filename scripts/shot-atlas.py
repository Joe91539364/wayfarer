import os, time
for k in ("HTTP_PROXY","HTTPS_PROXY","http_proxy","https_proxy","ALL_PROXY","all_proxy"):
    os.environ.pop(k, None)
os.environ["NO_PROXY"] = "*"
from selenium import webdriver
from selenium.webdriver.edge.options import Options
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
opts = Options()
opts.add_argument("--headless=new"); opts.add_argument("--window-size=1360,2600"); opts.add_argument("--no-proxy-server")
drv = webdriver.Edge(options=opts)
try:
    drv.get("http://127.0.0.1:8787/"); time.sleep(3)
    drv.find_element("xpath", "//nav[contains(@class,'dock')]//button[contains(., '发现')]").click(); time.sleep(3)
    drv.execute_script("document.querySelector('.atlas').scrollIntoView({block:'end'})"); time.sleep(1.2)
    drv.execute_script("""
      const btns=[...document.querySelectorAll('.atlas-prov')];
      btns.find(b=>b.textContent==='陕西')?.click();
    """); time.sleep(1)
    drv.save_screenshot(os.path.join(ROOT, "shots", "atlas-shaanxi.png"))
    print("SPOTS_SHOWN", len(drv.find_elements("css selector", ".atlas-spot")),
          "PROVS", len(drv.find_elements("css selector", ".atlas-prov")))
finally:
    drv.quit()
