import os, time, sys

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


def shot(name):
    driver.save_screenshot(os.path.join(OUT, name))


try:
    driver.get(URL)
    time.sleep(2.0)

    # 登录
    driver.find_element(By.XPATH, "//button[normalize-space()='登录']").click()
    time.sleep(1.0)
    shot("v1-login.png")
    driver.find_element(By.XPATH, "//button[contains(., '本机访客模式')]").click()
    time.sleep(0.8)
    shot("v2-logged-in.png")

    # 绑定
    driver.find_element(By.XPATH, "//button[normalize-space()='绑定']").click()
    time.sleep(1.0)
    shot("v3-bindings.png")
    driver.find_element(By.XPATH, "//button[contains(., '去绑定')]").click()
    time.sleep(0.8)
    shot("v4-bind-auth.png")
    inputs = driver.find_elements(By.CSS_SELECTOR, ".bind-form input")
    inputs[0].send_keys("13800138000")
    inputs[1].send_keys("123456")
    driver.find_element(By.XPATH, "//button[contains(., '确认授权')]").click()
    time.sleep(1.2)
    shot("v5-bind-done.png")
    driver.find_element(By.CSS_SELECTOR, ".modal-head .icon-btn").click()
    time.sleep(0.6)

    # 生成行程
    driver.find_element(By.XPATH, "//button[contains(., '开始规划')]").click()
    time.sleep(5.0)
    driver.find_element(By.CSS_SELECTOR, ".item-name").click()
    time.sleep(1.0)
    shot("v6-detail-art.png")
    driver.execute_script("document.querySelector('.detail').scrollTop = 420")
    time.sleep(0.6)
    shot("v7-scenery.png")
    driver.execute_script("document.querySelector('.detail').scrollTop = 0")
    time.sleep(0.4)
    driver.execute_script("document.querySelector('.detail').scrollTop = 120")
    time.sleep(0.4)
    shot("v8-official.png")

    # 换成另一站看不同构图
    driver.find_elements(By.CSS_SELECTOR, ".mini-item")[-1].click()
    time.sleep(0.9)
    shot("v10-detail-other.png")

    # 酒店
    driver.find_element(By.XPATH, "//button[contains(., '返回行程')]").click()
    time.sleep(0.8)
    driver.find_element(By.XPATH, "//button[contains(., '查看 / 换')]").click()
    time.sleep(1.0)
    shot("v9-hotel-art.png")
except Exception as e:
    logs.append(f"STEP FAILED: {type(e).__name__} {e}")
    try:
        shot("v99-error.png")
    except Exception:
        pass

for entry in driver.get_log("browser"):
    if entry["level"] in ("SEVERE", "WARNING"):
        logs.append(f'{entry["level"]} {entry["message"][:300]}')

driver.quit()
print("\n".join(logs) if logs else "no console errors")
print("shots done")
