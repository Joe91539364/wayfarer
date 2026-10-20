import os, time, json, sys

for k in ("HTTP_PROXY", "HTTPS_PROXY", "http_proxy", "https_proxy", "ALL_PROXY", "all_proxy"):
    os.environ.pop(k, None)
os.environ["NO_PROXY"] = "*"
os.environ["no_proxy"] = "*"

from selenium import webdriver
from selenium.webdriver.edge.options import Options
from selenium.webdriver.common.by import By

URL = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:4173/"
EDGE = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
OUT = r"C:\Users\huangziyuan\WorkBuddy\2026-10-18-20-03-42\shots"
os.makedirs(OUT, exist_ok=True)

opts = Options()
opts.binary_location = EDGE
opts.add_argument("--headless=new")
opts.add_argument("--window-size=1680,1050")
opts.add_argument("--force-device-scale-factor=1")
opts.add_argument("--hide-scrollbars")
opts.add_argument("--no-sandbox")
opts.set_capability("goog:loggingPrefs", {"browser": "ALL"})

driver = webdriver.Edge(options=opts)
logs = []
try:
    driver.get(URL)
    time.sleep(2.0)
    driver.save_screenshot(os.path.join(OUT, "01-hero.png"))

    # 澄清流程
    ta = driver.find_element(By.TAG_NAME, "textarea")
    ta.clear()
    ta.send_keys("下周出去玩")
    driver.find_element(By.XPATH, "//button[contains(., '开始规划')]").click()
    time.sleep(1.6)
    driver.save_screenshot(os.path.join(OUT, "02-clarify.png"))

    # 补上目的地 → 自动重跑
    driver.find_element(By.XPATH, "//button[normalize-space()='成都']").click()
    time.sleep(5.0)
    driver.save_screenshot(os.path.join(OUT, "03-workspace.png"))

    # 验算明细
    driver.find_element(By.XPATH, "//button[contains(., '验算明细')]").click()
    time.sleep(1.2)
    driver.save_screenshot(os.path.join(OUT, "04-certificate.png"))

    # 切到第 2 天看地图
    driver.find_element(By.XPATH, "//button[normalize-space()='D2']").click()
    time.sleep(1.0)
    driver.save_screenshot(os.path.join(OUT, "05-map-day2.png"))

    # what-if 预算
    driver.find_element(By.XPATH, "//button[contains(., '砍预算')]").click()
    time.sleep(3.0)
    driver.save_screenshot(os.path.join(OUT, "06-whatif.png"))
except Exception as e:
    logs.append(f"STEP FAILED: {type(e).__name__} {e}")
    try:
        driver.save_screenshot(os.path.join(OUT, "99-error.png"))
    except Exception:
        pass

for entry in driver.get_log("browser"):
    if entry["level"] in ("SEVERE", "WARNING"):
        logs.append(f'{entry["level"]} {entry["message"][:300]}')

driver.quit()
print("\n".join(logs) if logs else "no console errors")
print("shots done")
