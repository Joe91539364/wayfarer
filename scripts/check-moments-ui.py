# -*- coding: utf-8 -*-
"""幸福时刻：真上传一张图，看它有没有落到「第 N 天」上，再生成回忆长页。

跑之前服务要在（start.cmd / npm run serve），并且已经 dist 构建过。
"""
import json
import os
import sys
import time
import urllib.request

for k in ('HTTP_PROXY', 'HTTPS_PROXY', 'http_proxy', 'https_proxy'):
    os.environ.pop(k, None)
os.environ['NO_PROXY'] = '*'
sys.path.insert(0, os.path.dirname(__file__))

from selenium import webdriver
from selenium.webdriver.edge.options import Options
from selenium.webdriver.common.by import By

BASE = 'http://127.0.0.1:8787/'
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.realpath(os.path.join(HERE, '..', 'shots'))
os.makedirs(OUT, exist_ok=True)

# 拿一张真图来传（就是之前存下来的截图，1440x900 的真 PNG）
CANDIDATES = ['dock-1-hero.png', 'discover-1-hero.png', 'mm-1-wall.png']
IMG = None
for name in CANDIDATES:
    p = os.path.join(OUT, name)
    if os.path.exists(p) and os.path.getsize(p) > 10000:
        IMG = p
        break
if not IMG:
    for f in os.listdir(OUT):
        p = os.path.join(OUT, f)
        if f.endswith('.png') and os.path.getsize(p) > 10000:
            IMG = p
            break
assert IMG, 'shots 里没有可用的大图'
print('用这张当测试照片:', IMG)

SET_TEXT = """
const el = arguments[0], val = arguments[1];
const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
setter.call(el, val);
el.dispatchEvent(new Event('input', { bubbles: true }));
"""

ok, bad = [], []


def check(name, cond, extra=''):
    (ok if cond else bad).append(name)
    print(('  [ok]   ' if cond else '  [FAIL] ') + name + (f' — {extra}' if extra else ''))


o = Options()
o.add_argument('--headless=new')
o.add_argument('--window-size=1440,980')
o.add_argument('--disable-gpu')
o.add_argument('--log-level=3')
d = webdriver.Edge(options=o)
d.set_window_size(1440, 980)


def api(path, method='GET'):
    """测试要往真库里写东西，前后都用这个接口对账 / 收拾干净"""
    req = urllib.request.Request(BASE.rstrip('/') + path, method=method)
    with urllib.request.urlopen(req, timeout=10) as r:
        return json.loads(r.read().decode('utf-8'))


baseline = {m['id'] for m in api('/api/moments')['items']}

try:
    d.get(BASE)
    time.sleep(2.2)

    print('[1] 先规划一趟行程（不然照片没地方挂）')
    ta = d.find_element(By.CSS_SELECTOR, 'textarea')
    d.execute_script(SET_TEXT, ta, '十一月二号从深圳出发 去成都玩三天 两个人 预算六千 主要想吃和拍照')
    time.sleep(0.3)
    d.find_element(By.CSS_SELECTOR, '.btn-accent').click()
    # 等确认卡或直接出结果
    for _ in range(40):
        time.sleep(1)
        if d.find_elements(By.CSS_SELECTOR, '.req-modal'):
            break
        if d.find_elements(By.CSS_SELECTOR, '.col-left') and d.find_elements(By.CSS_SELECTOR, '.timeline-head'):
            break
    if d.find_elements(By.CSS_SELECTOR, '.req-modal'):
        btn = d.find_elements(By.CSS_SELECTOR, '.req-modal .btn-accent')
        if btn:
            btn[0].click()
            time.sleep(4)
    for _ in range(30):
        if d.find_elements(By.CSS_SELECTOR, '.timeline-head'):
            break
        time.sleep(1)
    check('行程出来了', bool(d.find_elements(By.CSS_SELECTOR, '.timeline-head')))

    print('[2] 打开幸福时刻')
    heart = None
    for b in d.find_elements(By.CSS_SELECTOR, '.dock-btn'):
        if b.find_element(By.CSS_SELECTOR, '.dock-label').text.strip() == '幸福时刻':
            heart = b
            break
    check('Dock 上有「幸福时刻」', heart is not None)
    heart.click()
    time.sleep(1.2)
    check('面板打开了', bool(d.find_elements(By.CSS_SELECTOR, '.mm-modal')))
    body_text = d.find_element(By.CSS_SELECTOR, '.mm-body').text
    check('空状态给了引导语', '最值得记住' in body_text or '拖' in body_text, body_text[:60])
    d.get_screenshot_as_file(os.path.join(OUT, 'mm-0-empty.png'))

    print('[3] 上传一张')
    inp = d.find_element(By.CSS_SELECTOR, '.mm-modal input[type=file]')
    d.execute_script("arguments[0].removeAttribute('hidden');arguments[0].style.cssText='position:fixed;left:-9999px'", inp)
    inp.send_keys(IMG)
    for _ in range(30):
        time.sleep(1)
        if d.find_elements(By.CSS_SELECTOR, '.mm-card'):
            break
    cards = d.find_elements(By.CSS_SELECTOR, '.mm-card')
    check('卡片出现了', len(cards) >= 1, f'{len(cards)} 张')
    check('图片真的加载出来', d.execute_script(
        "const i=document.querySelector('.mm-card img');return !!(i&&i.complete&&i.naturalWidth>0)"))
    day_head = d.find_element(By.CSS_SELECTOR, '.mm-day header').text
    check('归到了某一天', '第' in day_head or '还没归' in day_head, day_head.replace('\n', ' '))
    stat = d.find_element(By.CSS_SELECTOR, '.mm-bar').text
    check('统计条有数字', '1' in stat, stat.replace('\n', ' ')[:70])

    print('[4] 写一句话 + 点 5 颗心')
    cap = d.find_element(By.CSS_SELECTOR, '.mm-cap')
    d.execute_script("""
const el = arguments[0], val = arguments[1];
const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
s.call(el, val); el.dispatchEvent(new Event('input', { bubbles: true }));
""", cap, '面端上来的一刻')
    cap.send_keys('\n')  # 回车 = blur，提交
    time.sleep(1.5)
    stars = d.find_elements(By.CSS_SELECTOR, '.mm-card:nth-of-type(1) .mm-stars button') or \
        d.find_elements(By.CSS_SELECTOR, '.mm-stars button')
    check('有 5 颗心', len(stars) == 5, str(len(stars)))
    stars[4].click()
    time.sleep(1.5)
    on = d.find_elements(By.CSS_SELECTOR, '.mm-stars button.on')
    check('点完之后 5 颗全亮', len(on) == 5, f'{len(on)} 亮')

    # 刷新看有没有真的存进去（不是只存在内存里）
    d.refresh()
    time.sleep(3)
    for b in d.find_elements(By.CSS_SELECTOR, '.dock-btn'):
        if b.find_element(By.CSS_SELECTOR, '.dock-label').text.strip() == '幸福时刻':
            b.click()
            break
    time.sleep(1.5)
    check('刷新后照片还在', bool(d.find_elements(By.CSS_SELECTOR, '.mm-card')))
    # 文案在 <input> 的 value 里，不在 innerText 里
    caps = [e.get_attribute('value') for e in d.find_elements(By.CSS_SELECTOR, '.mm-cap')]
    check('刷新后那句话还在', '面端上来的一刻' in caps, str(caps))
    check('刷新后 5 颗心还在', len(d.find_elements(By.CSS_SELECTOR, '.mm-stars button.on')) == 5)
    d.get_screenshot_as_file(os.path.join(OUT, 'mm-1-wall.png'))

    print('[5] 看大图')
    d.find_element(By.CSS_SELECTOR, '.mm-shot').click()
    time.sleep(1)
    check('大图打开', bool(d.find_elements(By.CSS_SELECTOR, '.mm-peek')))
    check('大图里有「当时在」的点位快选', '当时在' in d.find_element(By.CSS_SELECTOR, '.mm-peek').text)
    d.get_screenshot_as_file(os.path.join(OUT, 'mm-2-peek.png'))
    if d.find_elements(By.CSS_SELECTOR, '.mm-peek-pois button'):
        d.find_elements(By.CSS_SELECTOR, '.mm-peek-pois button')[0].click()
        time.sleep(1.5)
        check('点了点位后仍然开着大图', bool(d.find_elements(By.CSS_SELECTOR, '.mm-peek')))
    d.execute_script("document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))")
    time.sleep(0.8)

    print('[6] 回忆长页')
    main_win = d.current_window_handle
    before_handles = set(d.window_handles)
    for b in d.find_elements(By.CSS_SELECTOR, '.mm-head-actions .btn'):
        if '回忆长页' in b.text:
            b.click()
            break
    time.sleep(2.5)
    new = set(d.window_handles) - before_handles
    check('新开了一页', len(new) == 1, f'{len(new)} 个新窗口')
    if new:
        d.switch_to.window(new.pop())
        time.sleep(1.5)
        txt = d.find_element(By.TAG_NAME, 'body').text
        check('长页里写了目的地', '成都' in txt, txt[:50].replace('\n', ' '))
        check('长页里带上那句原话', '面端上来的一刻' in txt)
        check('长页里的图也加载得出来', d.execute_script(
            "const i=document.querySelector('figure img');return !!(i&&i.complete&&i.naturalWidth>0)"))
        d.get_screenshot_as_file(os.path.join(OUT, 'mm-3-letter.png'))
        d.close()
        d.switch_to.window(main_win)

    print('[7] 关面板')
    d.execute_script("document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))")
    time.sleep(0.8)
    check('Esc 能关掉', not d.find_elements(By.CSS_SELECTOR, '.mm-modal'))
finally:
    d.quit()

# 收拾现场：只删这一轮新加的，用户自己的照片一张不动
try:
    leaked = [m['id'] for m in api('/api/moments')['items'] if m['id'] not in baseline]
    for mid in leaked:
        api('/api/moments/' + mid, 'DELETE')
    if leaked:
        print(f'[cleanup] 删掉本轮测试产生的 {len(leaked)} 张')
except Exception as e:  # noqa: BLE001
    print('[cleanup] 没收拾干净，手动清一下 data/moments：', e)

print(f'\n{len(ok)} 通过 / {len(bad)} 失败')
if bad:
    for b in bad:
        print('  未通过:', b)
    sys.exit(1)
