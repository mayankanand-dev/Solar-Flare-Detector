"""
capture_screenshots.py — Automated Visual Asset Generator for Solar Sentinel
=============================================================================
Spawns headless Chromium via Playwright, navigates all 6 production pages of
Solar Sentinel (including the new Research & Figures gallery), and generates
high-resolution screenshots for README.md and documentation.
"""

import os
import time
import subprocess
import urllib.request
import urllib.error
from playwright.sync_api import sync_playwright

FRONTEND_URL = "http://localhost:5173"
SCREENSHOT_DIR = "screenshots"

PAGES_TO_SCREENSHOT = [
    {"path": "/", "name": "dashboard", "title": "Interactive 3D Mission Dashboard"},
    {"path": "/flares", "name": "flare_timeline", "title": "Flare Event Logs"},
    {"path": "/research", "name": "research_figures", "title": "Research Paper & Publication Figures"},
    {"path": "/metrics", "name": "metrics", "title": "Model Performance & Skill Scores"},
    {"path": "/how-it-works", "name": "how_it_works", "title": "Orbital & ML Architecture"},
    {"path": "/about", "name": "about_mission", "title": "Aditya-L1 Spacecraft & Team"},
]

def is_server_running(url):
    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=2):
            return True
    except Exception:
        return False

def wait_for_server(url, timeout=30):
    start_time = time.time()
    print(f"Waiting for {url} to become available...")
    while time.time() - start_time < timeout:
        if is_server_running(url):
            print(f"✓ {url} is up and running!")
            return True
        time.sleep(1)
    print(f"✗ Timeout waiting for {url}")
    return False

def main():
    os.makedirs(SCREENSHOT_DIR, exist_ok=True)
    frontend_process = None

    if not is_server_running(FRONTEND_URL):
        print("Frontend not running. Starting vite dev server on port 5173...")
        frontend_process = subprocess.Popen(
            ["npm", "run", "dev", "--", "--port", "5173", "--host"],
            cwd="frontend",
            shell=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL
        )

    if not wait_for_server(FRONTEND_URL, 45):
        print("Frontend server failed to respond.")
        return

    print("Launching headless Chromium browser via Playwright...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1440, "height": 900},
            device_scale_factor=1.5
        )
        page = context.new_page()

        for page_info in PAGES_TO_SCREENSHOT:
            url = f"{FRONTEND_URL}{page_info['path']}"
            print(f"Capturing: {page_info['title']} ({url})...")
            try:
                page.goto(url, wait_until="networkidle", timeout=30000)
            except Exception:
                page.goto(url, wait_until="load", timeout=30000)

            # Allow 3D canvas, recharts, and framer-motion animations to settle
            time.sleep(3)

            output_path = os.path.join(SCREENSHOT_DIR, f"{page_info['name']}.png")
            page.screenshot(path=output_path, full_page=False)
            print(f"  ✓ Saved viewport screenshot to: {output_path}")

        browser.close()

    if frontend_process:
        print("Stopping temporary frontend background server...")
        subprocess.call(["taskkill", "/F", "/T", "/PID", str(frontend_process.pid)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    print("✓ All screenshots captured and updated successfully.")

if __name__ == "__main__":
    main()
