"""端到端：预算要花完 + 侧重用户意愿。

跑一句「去重庆玩三天，两个人预算6000，主要想吃好吃的」，
检查右栏的「预算」与「意愿落实」两块是不是真的对得上账：
预算利用率、每天正餐数、美食这一栏的条目数。
"""
import os, sys, time

for k in ("HTTP_PROXY", "HTTPS_PROXY", "http_proxy", "https_proxy", "ALL_PROXY", "all_proxy"):
    os.environ.pop(k, None)
os.environ["NO_PROXY"] = "*"

from selenium import webdriver
from selenium.webdriver.edge.options import Options

BASE = os.environ.get("BASE", "http://127.0.0.1:8788")
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "shots")
os.makedirs(OUT, exist_ok=True)

opts = Options()
opts.add_argument("--headless=new")
opts.add_argument("--window-size=1500,1400")
opts.add_argument("--no-proxy-server")
drv = webdriver.Edge(options=opts)

fails, passes = [], []


def check(name, cond, detail=""):
    if cond:
        passes.append(name)
        print(f"  OK   {name} {detail}")
    else:
        fails.append(f"{name} {detail}")
        print(f"  FAIL {name} {detail}")


def set_text(el, value):
    drv.execute_script(
        """
      const el=arguments[0], v=arguments[1];
      const set=Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype,'value').set;
      set.call(el,v);
      el.dispatchEvent(new Event('input',{bubbles:true}));
    """,
        el,
        value,
    )


try:
    drv.get(BASE + "/")
    time.sleep(3.5)
    ta = drv.find_element("css selector", "textarea")
    set_text(ta, "十一想去重庆玩三天，两个人，预算6000，主要想吃好吃的，也想看自然风光")
    drv.find_element("xpath", "//button[contains(., '开始规划')]").click()
    time.sleep(2.5)
    try:
        drv.find_element("xpath", "//button[contains(., '确认，开始规划')]").click()
    except Exception:
        pass

    ok = False
    for _ in range(90):
        time.sleep(3)
        if drv.find_elements("css selector", ".workspace"):
            ok = True
            break
    check("生成行程", ok)
    if not ok:
        drv.get_screenshot_as_file(os.path.join(OUT, "budget-0-fail.png"))
        sys.exit(1)

    time.sleep(2)
    body = drv.find_element("css selector", "body").text

    # 1. 意愿落实面板存在，且美食一栏有数
    want_rows = drv.find_elements("css selector", ".want-row")
    check("有意愿落实面板", len(want_rows) > 0, f"{len(want_rows)} 行")
    food_row = None
    for r in want_rows:
        if "美食" in r.text:
            food_row = r
            break
    check("有美食这一行", food_row is not None)
    if food_row:
        n = int(food_row.find_element("css selector", ".want-count").text)
        check("美食条目 ≥ 6（不只是「一顿饭」）", n >= 6, f"{n} 项")
        check("美食没被判缺", "miss" not in (food_row.get_attribute("class") or ""))

    # 2. 每天至少两顿正餐（时间轴上数餐厅条目，咖啡不算正餐）
    meal_counts = []
    for day in drv.find_elements("css selector", ".day"):
        cnt = 0
        for item in day.find_elements("css selector", ".item-card"):
            txt = item.text
            if "餐厅" in txt:
                cnt += 1
        meal_counts.append(cnt)
    check("每天 ≥2 顿正餐", len(meal_counts) > 0 and all(c >= 2 for c in meal_counts), str(meal_counts))

    # 3. 预算利用率
    total_txt = drv.find_element("css selector", ".budget-total b").text
    spent = int("".join(ch for ch in total_txt if ch.isdigit()))
    ratio = spent / 6000
    check("预算利用率 ≥ 65%", ratio >= 0.65, f"{total_txt} = {ratio:.0%}")
    check("没超预算", spent <= 6000, f"{spent}")

    # 4. 预算面板按类别分账
    rows = drv.find_elements("css selector", ".spend-row")
    check("预算按类别分账", len(rows) >= 3, f"{len(rows)} 类")
    check("住宿已升档", "行政楼层" in body)

    # 5. 平均正餐数提示
    check("显示出每天几顿", "顿正餐" in body)

    # 6. 预算档位按钮：点「宽裕」预算变 1.5 倍并重新升档，点「节俭」降回来
    tier_btns = drv.find_elements("css selector", ".tier-btn")
    check("有预算档位按钮", len(tier_btns) >= 3, f"{len(tier_btns)} 个")

    def read_budget():
        t = drv.find_element("css selector", ".budget-total span").text
        return int("".join(ch for ch in t if ch.isdigit()))

    b0 = read_budget()
    lush = next((b for b in tier_btns if "宽裕" in b.text), None)
    eco = next((b for b in tier_btns if "节俭" in b.text), None)
    if lush and eco:
        lush.click()
        time.sleep(1.5)
        b1 = read_budget()
        check("点宽裕 → 预算变为 1.5 倍", b1 == int(b0 * 1.5 / 100) * 100, f"{b0} → {b1}")
        total1 = int("".join(ch for ch in drv.find_element("css selector", ".budget-total b").text if ch.isdigit()))
        check("宽裕档重新安排了预算", total1 > spent, f"{spent} → {total1}")

        eco.click()
        time.sleep(1.5)
        b2 = read_budget()
        check("点节俭 → 预算降为当前档的 0.7 倍", b2 == int(b1 * 0.7 / 100) * 100, f"{b1} → {b2}")
        total2 = int("".join(ch for ch in drv.find_element("css selector", ".budget-total b").text if ch.isdigit()))
        check("节俭档不超新预算", total2 <= b2, f"{total2} / {b2}")
        body2 = drv.find_element("css selector", "body").text
        check("降档后住宿摘掉行政楼层", "行政楼层" not in body2, "")
    else:
        check("找到宽裕/节俭按钮", False)

    drv.get_screenshot_as_file(os.path.join(OUT, "budget-1-full.png"))
    # 单独截右栏
    rail = drv.find_element("css selector", ".col-right")
    drv.execute_script("arguments[0].scrollIntoView({block:'start'})", rail)
    time.sleep(0.6)
    drv.get_screenshot_as_file(os.path.join(OUT, "budget-2-rail-top.png"))

    print(f"\n{len(passes)} passed, {len(fails)} failed")
    for f in fails:
        print("  -", f)
finally:
    drv.quit()
