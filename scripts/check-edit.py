"""端到端：手动改行程后的冲突定盘 + 改预算联动游玩地。

1) 删掉第 1 天的午饭 → 应该出现「改动说明条」，并且午饭被就近补回来
2) 点「撤销这次改动」→ 回到删之前的样子
3) 右栏点「宽裕」→ 说明条列出预算变动（可能加付费体验 / 升住宿），总额不超新预算
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
opts.add_argument("--window-size=1500,1500")
opts.add_argument("--no-proxy-server")
drv = webdriver.Edge(options=opts)

fails, passes = [], []


def check(name, cond, detail=""):
    (passes if cond else fails).append(f"{name} {detail}")
    print(f"  {'OK  ' if cond else 'FAIL'} {name} {detail}")


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
    set_text(drv.find_element("css selector", "textarea"), "十一想去重庆玩三天，两个人，预算6000，主要想吃好吃的")
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
        sys.exit(1)
    time.sleep(2)

    day1 = drv.find_elements("css selector", ".day")[0]
    cards_before = len(day1.find_elements("css selector", ".item-card"))
    meals_before = [c for c in day1.find_elements("css selector", ".item-card") if "餐厅" in c.text]
    check("第 1 天有两顿正餐", len(meals_before) >= 2, f"{len(meals_before)} 顿")

    # 删掉午饭
    lunch = meals_before[0]
    del_btn = lunch.find_element("css selector", ".icon-btn[title='删除并移入候选池']")
    drv.execute_script("arguments[0].scrollIntoView({block:'center'})", del_btn)
    time.sleep(0.4)
    del_btn.click()
    time.sleep(2.0)

    bar = drv.find_elements("css selector", ".edit-bar")
    check("出现改动说明条", len(bar) == 1)
    bar_text = bar[0].text if bar else ""
    check("说明写明补了饭", "挤没" in bar_text or "补了" in bar_text, bar_text.split("\n")[1][:40] if bar_text else "")
    check("说明条有撤销按钮", "撤销这次改动" in bar_text)

    day1 = drv.find_elements("css selector", ".day")[0]
    meals_after = [c for c in day1.find_elements("css selector", ".item-card") if "餐厅" in c.text]
    check("午饭被自动补回来（还是两顿）", len(meals_after) >= 2, f"{len(meals_after)} 顿")
    drv.get_screenshot_as_file(os.path.join(OUT, "edit-1-conflict.png"))

    # 撤销
    bar[0].find_element("xpath", ".//button[contains(., '撤销这次改动')]").click()
    time.sleep(1.6)
    day1 = drv.find_elements("css selector", ".day")[0]
    cards_after = len(day1.find_elements("css selector", ".item-card"))
    check("撤销后条目数还原", cards_after == cards_before, f"{cards_before} → {cards_after}")
    check("撤销后说明条消失", len(drv.find_elements("css selector", ".edit-bar")) == 0)

    # 改预算 → 联动游玩地
    def read_total():
        t = drv.find_element("css selector", ".budget-total b").text
        return int("".join(ch for ch in t if ch.isdigit()))

    def read_budget():
        t = drv.find_element("css selector", ".budget-total span").text
        return int("".join(ch for ch in t if ch.isdigit()))

    b0 = read_budget()
    t0 = read_total()
    lush = next(b for b in drv.find_elements("css selector", ".tier-btn") if "宽裕" in b.text)
    lush.click()
    time.sleep(2.2)

    b1 = read_budget()
    t1 = read_total()
    check("预算变成 1.5 倍", b1 == int(b0 * 1.5 / 100) * 100, f"{b0} → {b1}")
    check("不超新预算", t1 <= b1, f"{t1} / {b1}")
    bar = drv.find_elements("css selector", ".edit-bar")
    bar_text = bar[0].text if bar else ""
    check("说明条讲清预算怎么花的", "预算" in bar_text and ("加了" in bar_text or "住宿" in bar_text), bar_text.replace("\n", " / ")[:70])
    check("钱确实动过（总额或安排变了）", t1 != t0, f"{t0} → {t1}")
    drv.execute_script("window.scrollTo({top:0})")
    time.sleep(0.5)
    drv.get_screenshot_as_file(os.path.join(OUT, "edit-2-budget.png"))

    print(f"\n{len(passes)} passed, {len(fails)} failed")
    for f in fails:
        print("  -", f)
finally:
    drv.quit()
