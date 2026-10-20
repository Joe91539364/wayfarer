# -*- coding: utf-8 -*-
"""Dock 悬浮按键 + 基础 UI 优化验证截图"""
import os, sys, time
for k in ('HTTP_PROXY', 'HTTPS_PROXY', 'http_proxy', 'https_proxy'):
    os.environ.pop(k, None)
os.environ['NO_PROXY'] = '*'
sys.path.insert(0, os.path.dirname(__file__))
from selenium import webdriver
from selenium.webdriver.edge.options import Options
from selenium.webdriver.common.by import By

BASE = 'http://127.0.0.1:8787/'
OUT = os.path.join(os.path.dirname(__file__), '..', 'shots')
os.makedirs(OUT, exist_ok=True)


def make_driver(w, h, mobile=False):
    o = Options()
    o.add_argument('--headless=new')
    o.add_argument(f'--window-size={w},{h}')
    o.add_argument('--disable-gpu')
    o.add_argument('--log-level=3')
    if mobile:
        o.add_experimental_option('mobileEmulation', {'deviceMetrics': {'width': 390, 'height': 844, 'pixelRatio': 2}})
    d = webdriver.Edge(options=o)
    return d


def shot(driver, name):
    driver.get_screenshot_as_file(os.path.join(OUT, name))
    print('saved', name)


# 1) 桌面首页：Dock 出现在底部
d = make_driver(1440, 900)
d.get(BASE)
time.sleep(2.5)
d.execute_script("window.scrollTo(0, 300)")
time.sleep(1)
shot(d, 'dock-1-hero.png')
assert d.find_elements(By.CSS_SELECTOR, '.dock.is-shown'), 'Dock 未出现'
labels = [e.text for e in d.find_elements(By.CSS_SELECTOR, '.dock-label')]
print('dock labels:', labels)

# 2) 点「数据源」应弹模态
d.find_elements(By.CSS_SELECTOR, '.dock-btn')[2].click()
time.sleep(1.2)
shot(d, 'dock-2-sources.png')
d.find_elements(By.CSS_SELECTOR, '.overlay-close, [class*=close]')  # 尽量关
d.execute_script("document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}))")
time.sleep(0.6)
d.quit()

# 3) 规划一单，验证工作台里的 Dock（叫车/下一站可用）
SET_TEXT = """
const el = arguments[0], val = arguments[1];
const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
setter.call(el, val);
el.dispatchEvent(new Event('input', { bubbles: true }));
"""
d = make_driver(1440, 900)
d.get(BASE)
time.sleep(2)
ta = d.find_element(By.CSS_SELECTOR, 'textarea')
d.execute_script(SET_TEXT, ta, '十月二十五号我一个人从江苏宿迁出发 去江西景德镇玩三天 预算七千 主要去吃美食')
time.sleep(0.3)
d.find_element(By.CSS_SELECTOR, '.btn-accent').click()
time.sleep(14)
chip = d.find_element(By.CSS_SELECTOR, '.ic-route, [class*=ic-] b, .col-main b').text if d.find_elements(By.CSS_SELECTOR, '.col-main b') else '?'
print('首行文本:', chip)
d.execute_script("var el=document.querySelector('.dep-bar'); if(el) el.scrollIntoView({block:'center'}); window.scrollBy(0,120)")
time.sleep(1)
shot(d, 'dock-3-work.png')
assert d.find_elements(By.CSS_SELECTOR, '.dock.is-shown'), '工作台 Dock 未出现'

# 4) 点 Dock「叫车」应弹出打车面板
btns = d.find_elements(By.CSS_SELECTOR, '.dock-btn:not(:disabled)')
print('enabled dock buttons:', len(btns))
for b in btns:
    if b.find_element(By.CSS_SELECTOR, '.dock-label').text == '叫车':
        b.click()
        break
time.sleep(1.5)
taxi_open = d.find_elements(By.CSS_SELECTOR, '.taxi-sheet, .taxi-panel, [class*=taxi]')
shot(d, 'dock-4-taxi.png')
print('taxi panel elements:', len(taxi_open))
d.quit()

# 5) 手机端
d = make_driver(390, 844, mobile=True)
d.get(BASE)
time.sleep(2.5)
d.execute_script("window.scrollTo(0, 260)")
time.sleep(1)
shot(d, 'dock-5-mobile.png')
d.quit()
print('ALL OK')
