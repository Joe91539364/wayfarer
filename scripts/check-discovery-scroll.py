"""回归：发现页滚下去之后不能被自动拉回顶部。"""
import os, time
for k in ("HTTP_PROXY","HTTPS_PROXY","http_proxy","https_proxy","ALL_PROXY","all_proxy"):
    os.environ.pop(k, None)
os.environ["NO_PROXY"] = "*"
from selenium import webdriver
from selenium.webdriver.edge.options import Options

opts = Options()
opts.add_argument("--headless=new"); opts.add_argument("--window-size=1360,940"); opts.add_argument("--no-proxy-server")
drv = webdriver.Edge(options=opts)
try:
    drv.get("http://127.0.0.1:8787/"); time.sleep(3)
    drv.find_element("xpath", "//nav[contains(@class,'dock')]//button[contains(., '发现')]").click(); time.sleep(2)
    body = "document.querySelector('.modal-body.discover-body')"
    drv.execute_script(f"{body}.scrollTop = 900")
    time.sleep(0.5)
    a = drv.execute_script(f"return {body}.scrollTop")
    time.sleep(4)  # 期间主界面会被常驻轮询触发多次重渲染
    b = drv.execute_script(f"return {body}.scrollTop")
    print(f"SCROLL_AFTER_SET={a} AFTER_4S={b} STABLE={abs(a-b) < 20}")
    # 再滚到底看能不能停住
    drv.execute_script(f"{body}.scrollTop = 99999"); time.sleep(3)
    c = drv.execute_script(f"return {body}.scrollTop")
    mx = drv.execute_script(f"const e={body};return e.scrollHeight - e.clientHeight")
    print(f"BOTTOM={c} MAX={mx} AT_BOTTOM={abs(c-mx) < 20}")
finally:
    drv.quit()
