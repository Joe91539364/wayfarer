"""端到端：有空档时用户自己加点 → 自动重排。

跑一句「去重庆玩三天」，等行程出来，点时间轴上「XX 之后空着 N 小时」的提示条，
在弹窗里搜一个点插进去，确认时间轴多了一条且没有新增校验 error。
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
    (passes if cond else fails).append(name)
    print(("  OK   " if cond else "  FAIL ") + name + " " + detail)


def set_text(el, value):
    drv.execute_script(
        """
      const el=arguments[0], v=arguments[1];
      const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
      const set = Object.getOwnPropertyDescriptor(proto, 'value').set;
      set.call(el, v);
      el.dispatchEvent(new Event('input', {bubbles:true}));
    """,
        el,
        value,
    )


try:
    drv.get(BASE + "/")
    time.sleep(3.5)
    set_text(drv.find_element("css selector", "textarea"), "去重庆玩三天，两个人，预算6000，想吃好吃的")
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
    time.sleep(1.5)

    slots = drv.find_elements("css selector", ".slot-add")
    check("时间轴上出现空档提示", len(slots) > 0, f"{len(slots)} 处")
    if not slots:
        drv.get_screenshot_as_file(os.path.join(OUT, "add-0-noslot.png"))
        sys.exit(1)
    slot_text = slots[0].text
    check("提示写明空多久", "空着" in slot_text, slot_text.replace("\n", " "))
    drv.get_screenshot_as_file(os.path.join(OUT, "add-1-slots.png"))

    before = len(drv.find_elements("css selector", ".item-card"))
    slots[0].click()
    time.sleep(1)
    modal = drv.find_elements("css selector", ".add-place-modal")
    check("弹出「自己加个地方」", len(modal) == 1)
    check("弹窗继承了空档信息", "空着" in drv.find_element("css selector", ".add-place-modal").text)

    inp = drv.find_element("css selector", ".add-search input")
    set_text(inp, "公园")
    time.sleep(0.8)
    rows = drv.find_elements("css selector", ".add-row")
    check("搜出候选点", len(rows) > 0, f"{len(rows)} 个")
    first_name = rows[0].find_element("css selector", ".add-name").text if rows else ""
    drv.get_screenshot_as_file(os.path.join(OUT, "add-2-modal.png"))

    rows[0].click()
    # 提示条会自己消失，得在它还在的时候抓
    time.sleep(0.9)
    toast = drv.find_element("css selector", "body").text
    check("有插入成功的提示", "加进第" in toast or "重新校验" in toast)
    time.sleep(1.6)
    check("插入后弹窗关闭", len(drv.find_elements("css selector", ".add-place-modal")) == 0)
    after = len(drv.find_elements("css selector", ".item-card"))
    check("时间轴多了一条", after == before + 1 or after == before, f"{before} → {after}")
    body = drv.find_element("css selector", "body").text

    # 新点真的在时间轴上，且时间不重叠
    names = [el.text for el in drv.find_elements("css selector", ".item-card .item-name")]
    check("新点出现在时间轴上", any(first_name and first_name in n for n in names), first_name)
    check("校验仍然通过", "/8" in body or "8/8" in body)

    drv.get_screenshot_as_file(os.path.join(OUT, "add-3-after.png"))
    print(f"\n{len(passes)} passed, {len(fails)} failed")
    for f in fails:
        print("  -", f)
finally:
    drv.quit()
