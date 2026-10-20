"""发现页冒烟：截图 + 断言主推/卡片/点击回填。"""
import os, time

for k in ("HTTP_PROXY", "HTTPS_PROXY", "http_proxy", "https_proxy", "ALL_PROXY", "all_proxy"):
    os.environ.pop(k, None)
os.environ["NO_PROXY"] = "*"

from selenium import webdriver
from selenium.webdriver.edge.options import Options

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "shots")
os.makedirs(OUT, exist_ok=True)

opts = Options()
opts.add_argument("--headless=new")
opts.add_argument("--window-size=1360,940")
opts.add_argument("--no-proxy-server")
drv = webdriver.Edge(options=opts)
try:
    drv.get("http://127.0.0.1:8787/")
    time.sleep(3)
    # 等 Dock 出现后点「发现」
    drv.find_element("xpath", "//nav[contains(@class,'dock')]//button[contains(., '发现')]").click()
    time.sleep(3)

    hero = drv.find_element("css selector", ".hero-card")
    cards = drv.find_elements("css selector", ".promo-card")
    imgs = drv.find_elements("css selector", ".hero-card img, .promo-card img")
    print("HERO", hero.is_displayed(), "CARDS", len(cards), "IMGS", len(imgs))
    print("HERO_TEXT", hero.text.replace("\n", " | ")[:160])
    for c in cards:
        print("CARD", c.text.replace("\n", " | ")[:110])
    drv.save_screenshot(os.path.join(OUT, "discover.png"))

    drv.set_window_size(390, 844)
    time.sleep(1.5)
    drv.save_screenshot(os.path.join(OUT, "discover-mobile.png"))

    drv.set_window_size(1360, 940)
    time.sleep(1)
    # 名录：搜「黄山」→ 点第一个结果 → 输入框应带上「一定要去黄山」
    box = drv.find_element("css selector", ".atlas-search")
    drv.execute_script(
        """
        const el = arguments[0];
        const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        set.call(el, '黄山');
        el.dispatchEvent(new Event('input', { bubbles: true }));
        """,
        box,
    )
    time.sleep(1)
    res = drv.find_elements("css selector", ".atlas-results .atlas-spot")
    print("SEARCH_HUANGSHAN", len(res))
    drv.save_screenshot(os.path.join(OUT, "discover-search.png"))
    if res:
        res[0].click()
        time.sleep(2)
        ta = drv.find_element("css selector", "textarea")
        print("FILLED_SPOT", ta.get_attribute("value")[:70])
        print("MODAL_CLOSED", len(drv.find_elements("css selector", ".discover-modal")) == 0)
        print("OK")
finally:
    drv.quit()
