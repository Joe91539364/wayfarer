import os, sys, time, json

for k in ("HTTP_PROXY", "HTTPS_PROXY", "http_proxy", "https_proxy", "ALL_PROXY", "all_proxy"):
    os.environ.pop(k, None)
os.environ["NO_PROXY"] = "*"
os.environ["no_proxy"] = "*"

from selenium import webdriver
from selenium.webdriver.edge.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8787/"
QUERY = sys.argv[2] if len(sys.argv) > 2 else "成都4天，两个人，预算6000，喜欢吃的和自然"
CITY = sys.argv[3] if len(sys.argv) > 3 else "成都"
PREFIX = sys.argv[4] if len(sys.argv) > 4 else "x"
OUT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "shots"))
os.makedirs(OUT, exist_ok=True)


def shot(driver, name):
    path = os.path.join(OUT, name)
    driver.save_screenshot(path)
    print("shot", name, os.path.getsize(path) // 1024, "KB")


opts = Options()
opts.binary_location = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
opts.add_argument("--headless=new")
opts.add_argument("--window-size=1680,1080")
opts.add_argument("--no-sandbox")
opts.add_argument("--force-device-scale-factor=1")
opts.set_capability("goog:loggingPrefs", {"browser": "ALL"})

driver = webdriver.Edge(options=opts)
wait = WebDriverWait(driver, 30)
try:
    driver.get(BASE)
    time.sleep(2.5)

    ta = wait.until(EC.presence_of_element_located((By.TAG_NAME, "textarea")))
    ta.clear()
    ta.send_keys(QUERY)
    driver.find_element(By.XPATH, "//button[contains(., '开始规划')]").click()
    time.sleep(6)

    # 澄清（如果出现城市选择）
    try:
        btn = driver.find_element(By.XPATH, f"//button[normalize-space()='{CITY}']")
        btn.click()
        time.sleep(6)
    except Exception:
        pass

    wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, ".item-name")))
    time.sleep(1.5)
    shot(driver, f"{PREFIX}1-workspace.png")

    wx = driver.find_elements(By.CSS_SELECTOR, ".wx-bar")
    print("wx-bar:", len(wx), (wx[0].text[:120].replace("\n", " | ") if wx else "none"))
    alerts = driver.find_elements(By.CSS_SELECTOR, ".wx-list li")
    print("alerts:", len(alerts))
    for a in alerts[:3]:
        print("  -", a.text[:110].replace("\n", " | "))

    # 数据源面板
    driver.find_element(By.CSS_SELECTOR, ".ds-entry").click()
    time.sleep(1.2)
    shot(driver, f"{PREFIX}2-sources.png")
    rows = driver.find_elements(By.CSS_SELECTOR, ".ds-row")
    print("ds rows:", len(rows))
    for r in rows[:4]:
        print("  *", r.text[:110].replace("\n", " | "))
    driver.find_element(By.CSS_SELECTOR, ".ds-modal .modal-head button").click()
    time.sleep(0.6)

    # 详情页
    driver.find_elements(By.CSS_SELECTOR, ".item-name")[1].click()
    time.sleep(1.5)
    shot(driver, f"{PREFIX}3-detail.png")
    # 滚到多平台评价
    driver.execute_script("document.querySelector('.review-board')?.scrollIntoView({block:'start'})")
    time.sleep(0.8)
    shot(driver, f"{PREFIX}5-reviews.png")

    rb = driver.find_elements(By.CSS_SELECTOR, ".rb-card")
    print("review cards:", len(rb))
    for c in rb[:3]:
        print("  !", c.text[:90].replace("\n", " | "))

    # 打车
    btns = driver.find_elements(By.XPATH, "//button[contains(., '打车')]")
    print("taxi buttons:", len(btns), [b.text for b in btns][:3])
    btns[0].click()
    time.sleep(1.2)
    print("taxi modal:", len(driver.find_elements(By.CSS_SELECTOR, ".taxi-modal")))
    shot(driver, f"{PREFIX}4-taxi.png")
    print("taxi rows:", len(driver.find_elements(By.CSS_SELECTOR, ".taxi-row")))

    for e in driver.get_log("browser"):
        if e["level"] in ("SEVERE",):
            print("SEVERE:", e["message"][:300])
finally:
    driver.quit()
print("done")
