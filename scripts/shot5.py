import os, sys, time

for k in ("HTTP_PROXY", "HTTPS_PROXY", "http_proxy", "https_proxy", "ALL_PROXY", "all_proxy"):
    os.environ.pop(k, None)
os.environ["NO_PROXY"] = "*"
os.environ["no_proxy"] = "*"

from selenium import webdriver
from selenium.webdriver.edge.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

BASE = "http://127.0.0.1:8787/"
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
opts.set_capability("googling", None) if False else None

driver = webdriver.Edge(options=opts)
wait = WebDriverWait(driver, 30)
try:
    driver.get(BASE)
    time.sleep(2.5)
    ta = wait.until(EC.presence_of_element_located((By.TAG_NAME, "textarea")))
    ta.clear()
    ta.send_keys("成都3天，两个人，想吃小吃和逛老街")
    driver.find_element(By.XPATH, "//button[contains(., '开始规划')]").click()
    time.sleep(6)
    try:
        driver.find_element(By.XPATH, "//button[normalize-space()='成都']").click()
        time.sleep(6)
    except Exception:
        pass

    # 数据源面板（GLM 已配置）
    driver.find_element(By.CSS_SELECTOR, ".ds-entry").click()
    time.sleep(1.2)
    driver.execute_script("document.querySelector('.ds-keys')?.scrollIntoView({block:'center'})")
    time.sleep(0.6)
    shot(driver, "g1-sources-glm.png")
    rows = driver.find_elements(By.CSS_SELECTOR, ".ds-row")
    for r in rows[:4]:
        print("  *", r.text[:110].replace("\n", " | "))
    driver.find_element(By.CSS_SELECTOR, ".ds-modal .modal-head button").click()
    time.sleep(0.6)

    # 首站详情：确认实景图真的加载出来了
    driver.execute_script("document.querySelector('.item-name')?.click()")
    time.sleep(2.0)
    imgs = driver.find_elements(By.CSS_SELECTOR, ".hero-photo img")
    print("hero img:", len(imgs), imgs[0].get_attribute("src")[:70] if imgs else "none")
    if imgs:
        print("naturalWidth:", driver.execute_script("return arguments[0].naturalWidth", imgs[0]))
    shot(driver, "h1-detail-real.png")
    driver.find_element(By.XPATH, "//button[contains(., '返回行程')]").click()
    time.sleep(0.8)

    # 把首日第一站换成「建设路小吃街」（这条点位的数据来自智谱 GLM），再打开详情
    driver.execute_script('''
      const raw = localStorage.getItem('wayfarer.itinerary.v1') || localStorage.getItem('wayfarer-itinerary');
      let key = 'wayfarer.itinerary.v1';
      if (!raw) {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          const v = localStorage.getItem(k);
          if (v && v.includes('"days"') && v.includes('"meta"')) { key = k; break; }
        }
      }
      const it = JSON.parse(localStorage.getItem(key));
      const day = it.days[0];
      const item = day.items.find((x) => x.type !== 'transit');
      if (item) {
        item.poi_id = 'CD16';
        item.name = '建设路小吃街';
        item.lat = 30.6688;
        item.lng = 104.1065;
        localStorage.setItem(key, JSON.stringify(it));
      }
      return key;
    ''')
    driver.refresh()
    time.sleep(4)
    names = driver.find_elements(By.CSS_SELECTOR, ".item-name")
    print("items after swap:", len(names), [n.text for n in names[:3]])
    names[0].click()
    time.sleep(1.4)
    chips = [c.text for c in driver.find_elements(By.CSS_SELECTOR, ".fact-src")]
    print("chips:", chips)
    driver.execute_script("document.querySelector('.detail-side')?.scrollIntoView({block:'start'})")
    time.sleep(0.7)
    shot(driver, "g2-detail-glm.png")
    driver.find_element(By.XPATH, "//button[contains(., '返回行程')]").click()
    time.sleep(0.8)

    # 找一个带「智谱 GLM」来源的站点并截图
    names = driver.find_elements(By.CSS_SELECTOR, ".item-name")
    print("items:", len(names))
    found = False
    for i in range(min(len(names), 8)):
        driver.find_elements(By.CSS_SELECTOR, ".item-name")[i].click()
        time.sleep(1.2)
        chips = [c.text for c in driver.find_elements(By.CSS_SELECTOR, ".fact-src")]
        if any("智谱" in c for c in chips):
            print("found glm on item", i, chips)
            driver.execute_script("document.querySelector('.detail-side')?.scrollIntoView({block:'start'})")
            time.sleep(0.6)
            shot(driver, "g2-detail-glm.png")
            found = True
            break
        driver.find_element(By.XPATH, "//button[contains(., '返回行程')]").click()
        time.sleep(0.8)
    if not found:
        print("no glm chip found in first items")
finally:
    driver.quit()
print("done")
