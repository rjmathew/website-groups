"""Runs tests/test.html in headless Chrome and prints the results.

Usage: python tests/run.py
Set the CHROME environment variable if Chrome isn't in a usual place.
Exits with status 1 if any test fails.
"""

import os
import re
import shutil
import subprocess
import sys
from html import unescape
from pathlib import Path

CANDIDATES = [
    os.environ.get("CHROME"),
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    shutil.which("google-chrome"),
    shutil.which("chromium"),
    shutil.which("chrome"),
]
chrome = next((c for c in CANDIDATES if c and os.path.exists(c)), None)
if not chrome:
    sys.exit("Couldn't find Chrome. Set the CHROME environment variable to its path.")

page = (Path(__file__).parent / "test.html").resolve().as_uri()
dom = subprocess.run(
    [chrome, "--headless=new", "--disable-gpu", "--allow-file-access-from-files",
     "--virtual-time-budget=5000", "--dump-dom", page],
    capture_output=True, text=True, encoding="utf-8", timeout=120,
).stdout

results = re.search(r'<pre id="results">(.*?)</pre>', dom, re.S)
print(unescape(results.group(1)) if results else "No results found. Open tests/test.html in Chrome to see what happened.")
body = re.search(r"<body[^>]*>", dom)
sys.exit(0 if body and 'data-result="pass"' in body.group(0) else 1)
