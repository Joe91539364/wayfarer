import os, time, json

for k in ("HTTP_PROXY", "HTTPS_PROXY", "http_proxy", "https_proxy", "ALL_PROXY", "all_proxy"):
    os.environ.pop(k, None)
os.environ["NO_PROXY"] = "*"
os.environ["no_proxy"] = "*"

from selenium import webdriver
from selenium.webdriver.edge.options import Options

EDGE = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
opts = Options()
opts.binary_location = EDGE
opts.add_argument("--headless=new")
opts.add_argument("--window-size=1680,1050")
opts.add_argument("--no-sandbox")
opts.set_capability("goog:loggingPrefs", {"browser": "ALL"})

driver = webdriver.Edge(options=opts)
try:
    driver.get("http://127.0.0.1:5273/")
    time.sleep(3)
    for e in driver.get_log("browser"):
        print(e["level"], "|", e["message"][:600])
    print("---- HTML ----")
    print(driver.page_source[:1200])
finally:
    driver.quit()
