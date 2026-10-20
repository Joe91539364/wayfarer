"""把 docs/agent-workflow.html 里的 SVG 截成 2 倍高清 PNG（供 Word 嵌入）。

输出：docs/agent-workflow.png（1900x2780）
"""
import os

for k in ("HTTP_PROXY", "HTTPS_PROXY", "http_proxy", "https_proxy", "ALL_PROXY", "all_proxy"):
    os.environ.pop(k, None)
os.environ["NO_PROXY"] = "*"
os.environ["no_proxy"] = "*"

from selenium import webdriver
from selenium.webdriver.edge.options import Options
from selenium.webdriver.common.by import By

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(HERE, "docs", "agent-workflow.html")
DST = os.path.join(HERE, "docs", "agent-workflow.png")

opts = Options()
opts.binary_location = r"C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
opts.add_argument("--headless=new")
opts.add_argument("--no-sandbox")
opts.add_argument("--disable-gpu")
opts.add_argument("--allow-file-access-from-files")
opts.add_argument("--log-level=3")

d = webdriver.Edge(options=opts)
try:
    d.execute_cdp_cmd(
        "Emulation.setDeviceMetricsOverride",
        {"width": 950, "height": 1390, "deviceScaleFactor": 2, "mobile": False},
    )
    d.get("file:///" + SRC.replace("\\", "/"))
    d.implicitly_wait(1)
    d.set_window_size(960, 1400)
    el = d.find_element(By.ID, "flow")
    el.screenshot(DST)
finally:
    d.quit()

import struct

with open(DST, "rb") as f:
    head = f.read(24)
w, h = struct.unpack(">II", head[16:24])
print(f"saved {DST}  {w}x{h}  {os.path.getsize(DST) / 1024:.0f} KB")
