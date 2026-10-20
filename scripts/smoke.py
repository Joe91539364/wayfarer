import os, sys, time
for k in ("HTTP_PROXY","HTTPS_PROXY","http_proxy","https_proxy","ALL_PROXY","all_proxy"):
    os.environ.pop(k, None)
os.environ["NO_PROXY"]="*"; os.environ["no_proxy"]="*"
from selenium import webdriver
from selenium.webdriver.edge.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
opts=Options(); opts.binary_location=r"C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
opts.add_argument("--headless=new"); opts.add_argument("--window-size=1680,1050"); opts.add_argument("--no-sandbox")
d=webdriver.Edge(options=opts); w=WebDriverWait(d,30)
try:
    d.get(sys.argv[1]); time.sleep(2.5)
    ta=w.until(EC.presence_of_element_located((By.TAG_NAME,"textarea")))
    ta.clear(); ta.send_keys("成都3天，两个人")
    d.find_element(By.XPATH,"//button[contains(., '开始规划')]").click(); time.sleep(6)
    try:
        d.find_element(By.XPATH,"//button[normalize-space()='成都']").click(); time.sleep(6)
    except Exception: pass
    d.execute_script("document.querySelector('.item-name')?.click()"); time.sleep(2)
    imgs=d.find_elements(By.CSS_SELECTOR,".hero-photo img")
    print("hero imgs",len(imgs), "naturalWidth", d.execute_script("return arguments[0].naturalWidth",imgs[0]) if imgs else 0)
    print("chips", [c.text for c in d.find_elements(By.CSS_SELECTOR,'.fact-src')][:5])
finally:
    d.quit()
print("ok")
