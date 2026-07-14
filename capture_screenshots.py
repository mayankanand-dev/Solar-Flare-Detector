import os
import time
import subprocess
import urllib.request
import urllib.error
from playwright.sync_api import sync_playwright

# Configuration
FRONTEND_URL = "http://localhost:5173"
SCREENSHOT_DIR = "screenshots"

PAGES_TO_SCREENSHOT = [
    {"path": "/", "name": "dashboard"},
    {"path": "/flares", "name": "flare_timeline"},
    {"path": "/how-it-works", "name": "how_it_works"},
    {"path": "/metrics", "name": "metrics"},
    {"path": "/about", "name": "about_mission"},
]

def is_server_running(url):
    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=2):
            return True
    except urllib.error.URLError:
        return False
    except Exception:
        return True

def wait_for_server(url, timeout=30):
    start_time = time.time()
    print(f"Waiting for {url} to become available...")
    while time.time() - start_time < timeout:
        if is_server_running(url):
            print(f"{url} is up!")
            return True
        time.sleep(1)
    print(f"Timeout waiting for {url}")
    return False

def main():
    os.makedirs(SCREENSHOT_DIR, exist_ok=True)
    
    frontend_process = None
    
    # Check if frontend is running
    if not is_server_running(FRONTEND_URL):
        print("Frontend not running. Starting frontend...")
        frontend_process = subprocess.Popen(
            ["npm", "run", "dev"],
            cwd="frontend",
            shell=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL
        )
        
    if not wait_for_server(FRONTEND_URL, 60):
        print("Frontend failed to start. Exiting.")
        return

    # Take screenshots
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1280, "height": 800})
        
        for page_info in PAGES_TO_SCREENSHOT:
            url = f"{FRONTEND_URL}{page_info['path']}"
            print(f"Capturing screenshot for {url}...")
            
            # Go to the page and wait for load
            page.goto(url, wait_until="load", timeout=60000)
            
            # Additional wait for animations/charts to render fully
            time.sleep(5) 
            
            # Save screenshot
            output_path = os.path.join(SCREENSHOT_DIR, f"{page_info['name']}.png")
            page.screenshot(path=output_path, full_page=True)
            print(f"Saved {output_path}")
            
        browser.close()
        
    # Cleanup processes if we started them
    if frontend_process:
        print("Stopping frontend...")
        subprocess.call(["taskkill", "/F", "/T", "/PID", str(frontend_process.pid)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        
    print("Done! Screenshots saved to the screenshots directory.")

if __name__ == "__main__":
    main()
