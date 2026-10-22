"""端到端：现实时钟。
1) /api/now 可用，顶栏时钟每秒跳动且与服务器对表
2) 今天是行程第 3 天 → 自动停到这天，出现「现在」游标
3) 正在进行的项打上「进行中 · 还剩 N 分」
4) 当天头部有日出 / 日落
"""
import json, os, time
from datetime import datetime, timedelta, timezone

for k in ("HTTP_PROXY", "HTTPS_PROXY", "http_proxy", "https_proxy", "ALL_PROXY", "all_proxy"):
    os.environ.pop(k, None)
os.environ["NO_PROXY"] = "*"

from selenium import webdriver
from selenium.webdriver.edge.options import Options

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "shots")
TZ = timezone(timedelta(hours=8))
now = datetime.now(TZ)
today = now.strftime("%Y-%m-%d")

iti = json.load(open(os.path.join(ROOT, "scripts", "iti-fixture.json"), encoding="utf-8"))
# 把最后一天挪到今天，并让第一项正好横跨此刻
day = iti["days"][-1]
day["date"] = today
iti["meta"]["start_date"] = iti["days"][0]["date"]
iti["meta"]["end_date"] = today
day["items"][0]["start_time"] = (now - timedelta(minutes=30)).strftime("%H:%M")
day["items"][0]["end_time"] = (now + timedelta(minutes=30)).strftime("%H:%M")

opts = Options()
opts.add_argument("--headless=new")
opts.add_argument("--window-size=1440,1000")
opts.add_argument("--no-proxy-server")
drv = webdriver.Edge(options=opts)

ok = []


def check(name, cond, extra=""):
    ok.append(bool(cond))
    print(("PASS " if cond else "FAIL ") + name + (f" | {extra}" if extra else ""))


try:
    drv.get("http://127.0.0.1:8787/")
    time.sleep(2)
    drv.execute_script("localStorage.setItem('wayfarer.itinerary.v3', arguments[0]);", json.dumps(iti, ensure_ascii=False))
    drv.get("http://127.0.0.1:8787/")
    time.sleep(3.5)

    clock = drv.find_element("css selector", ".live-clock")
    check("顶栏有时钟", clock.is_displayed(), clock.text.replace("\n", " ")[:40])
    t1 = clock.text
    time.sleep(1.6)
    t2 = drv.find_element("css selector", ".live-clock").text
    check("时钟在走秒", t1 != t2, f"{t1.split(chr(10))[0]} -> {t2.split(chr(10))[0]}")
    check("已与服务对表", "is-synced" in drv.find_element("css selector", ".live-clock").get_attribute("class"))
    check("显示行程阶段", "行程第" in t2, t2.replace("\n", " ")[:50])

    nowrows = drv.find_elements("css selector", ".now-row")
    check("时间轴有「现在」游标", len(nowrows) == 1, f"{len(nowrows)} 条")
    tags = drv.find_elements("css selector", ".day-now-tag")
    check("当天头部标了现在几点", len(tags) == 1, tags[0].text if tags else "")

    happening = drv.find_elements("css selector", ".item-happening")
    check("正在进行项有徽章", len(happening) == 1, happening[0].text if happening else "")

    solar = drv.find_elements("css selector", ".day-solar")
    txt = drv.find_element("css selector", "body").text
    check("显示日出日落", "日出" in txt and "日落" in txt)
    check("自动停在今天", "现在" in txt)

    drv.get_screenshot_as_file(os.path.join(OUT, "clock-1-workspace.png"))
    # 顶栏放大截一张
    drv.execute_script("document.querySelector('.live-clock').scrollIntoView({block:'center'});")
    box = drv.find_element("css selector", ".topbar")
    box.screenshot(os.path.join(OUT, "clock-2-topbar.png"))
finally:
    drv.quit()

print(f"{sum(ok)}/{len(ok)} passed")
