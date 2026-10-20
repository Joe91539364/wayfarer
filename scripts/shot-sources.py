# -*- coding: utf-8 -*-
import os, time
for k in ('HTTP_PROXY', 'HTTPS_PROXY', 'http_proxy', 'https_proxy', 'ALL_PROXY', 'all_proxy'):
    os.environ.pop(k, None)
os.environ['NO_PROXY'] = '*'

from selenium import webdriver
from selenium.webdriver.edge.options import Options
from selenium.webdriver.common.by import By

OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'shots')

o = Options()
o.binary_location = r'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
o.add_argument('--headless=new')
o.add_argument('--window-size=1400,900')
o.add_argument('--disable-gpu')

d = webdriver.Edge(options=o)
d.get('http://127.0.0.1:8787/')
time.sleep(2.5)

# 打开数据源面板
for b in d.find_elements(By.CSS_SELECTOR, '.topbar-actions .btn'):
    if '数据源' in b.text:
        b.click()
        break
time.sleep(1.5)
sws = d.find_elements(By.CSS_SELECTOR, '.ds-sw')
print('switches:', [(s.text) for s in sws])

# 滚动到 GLM 行
rows = d.find_elements(By.CSS_SELECTOR, '.ds-row')
for r in rows:
    if '智谱' in r.text:
        d.execute_script("arguments[0].scrollIntoView({block:'center'})", r)
        break
time.sleep(0.8)
d.save_screenshot(os.path.join(OUT, 'sources-toggle.png'))
print('saved sources-toggle.png')
d.quit()
