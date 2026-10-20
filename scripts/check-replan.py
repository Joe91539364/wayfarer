"""端到端：行程生成后，侧栏需求可直接编辑并就地重新规划，全程不点「新建」。"""
import os, time
for k in ("HTTP_PROXY","HTTPS_PROXY","http_proxy","https_proxy","ALL_PROXY","all_proxy"):
    os.environ.pop(k, None)
os.environ["NO_PROXY"] = "*"
from selenium import webdriver
from selenium.webdriver.edge.options import Options
from selenium.webdriver.common.keys import Keys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
opts = Options()
opts.add_argument("--headless=new"); opts.add_argument("--window-size=1360,1000"); opts.add_argument("--no-proxy-server")
drv = webdriver.Edge(options=opts)

def set_text(el, value):
    drv.execute_script("""
      const el=arguments[0], v=arguments[1];
      const set=Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype,'value').set;
      set.call(el,v);
      el.dispatchEvent(new Event('input',{bubbles:true}));
    """, el, value)

try:
    drv.get("http://127.0.0.1:8787/"); time.sleep(3.5)

    ta = drv.find_element("css selector", "textarea")
    set_text(ta, "我从宿迁出发 一个人去景德镇玩三天 预算两千 主要去吃美食")
    drv.find_element("xpath", "//button[contains(., '开始规划')]").click()
    time.sleep(2.5)
    drv.find_element("xpath", "//button[contains(., '确认，开始规划')]").click()
    ok = False
    for _ in range(40):
        time.sleep(3)
        if drv.find_elements("css selector", ".workspace"):
            ok = True
            break
    print("ROUND1_ITINERARY", ok)
    if not ok:
        raise SystemExit(1)

    # 侧栏应该有可编辑的需求框
    box = drv.find_element("css selector", "#req-input")
    print("EDITABLE_BOX", box.is_displayed(), repr(box.get_attribute("value")[:24]))
    print("NO_NEW_CLICKED", True)  # 全程没碰过顶栏「新建」

    # 改需求：换成两天
    set_text(box, "我从宿迁出发 一个人去景德镇玩两天 预算两千 主要去吃美食")
    time.sleep(0.5)
    btn = drv.find_element("xpath", "//button[contains(., '重新规划')]")
    print("RERUN_BTN", btn.is_displayed() and btn.is_enabled())
    btn.click()

    ok2 = False
    for _ in range(40):
        time.sleep(3)
        if drv.find_elements("css selector", ".workspace"):
            ok2 = True
            break
    print("ROUND2_ITINERARY", ok2)
    if ok2:
        box2 = drv.find_element("css selector", "#req-input")
        meta = drv.find_element("css selector", ".meta-grid").text.replace("\n", " ")
        print("META_AFTER", meta[:110])
        print("DAYS_2_OK", "2 天" in meta)

    # ROUND3：复现用户场景 —— 换城市+换天数+不写日期，应继承日期并正确出 5 天
    box3 = drv.find_element("css selector", "#req-input")
    set_text(box3, "从宿迁去安顺玩5天，两个人，预算5000，一定要见龙宫")
    time.sleep(0.5)
    drv.find_element("xpath", "//button[contains(., '重新规划')]").click()
    ok3 = False
    modal_popped = False
    for _ in range(50):
        time.sleep(3)
        if drv.find_elements("css selector", ".workspace .modal, .overlay .req-card"):
            modal_popped = True
            break
        if drv.find_elements("css selector", ".workspace"):
            ok3 = True
            break
    print("ROUND3_MODAL", modal_popped)
    if modal_popped:
        card = drv.find_element("css selector", ".req-card").text.replace("\n", " ")
        print("CARD_TEXT", card[:180])
        drv.find_element("xpath", "//button[contains(., '确认，开始规划')]").click()
        for _ in range(50):
            time.sleep(3)
            if drv.find_elements("css selector", ".workspace"):
                ok3 = True
                break
    print("ROUND3_ITINERARY", ok3)
    if ok3:
        meta3 = drv.find_element("css selector", ".meta-grid").text.replace("\n", " ")
        print("META3", meta3[:120])
        print("DAYS_5_OK", "5 天" in meta3)
        print("DEST_OK", "安顺" in meta3)
    drv.save_screenshot(os.path.join(ROOT, "shots", "replan-round3.png"))
    drv.save_screenshot(os.path.join(ROOT, "shots", "replan-inline.png"))
finally:
    drv.quit()
