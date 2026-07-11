import urllib.request
import os
import re

FONTS = {
    "Space Grotesk": "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;700&display=swap",
    "Inter": "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
    "IBM Plex Mono": "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;700&display=swap"
}

USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

out_dir = os.path.join("frontend", "public", "fonts")
os.makedirs(out_dir, exist_ok=True)
css_lines = []

for name, url in FONTS.items():
    print(f"Fetching CSS for {name}...")
    req = urllib.request.Request(url, headers={'User-Agent': USER_AGENT})
    with urllib.request.urlopen(req) as response:
        css = response.read().decode('utf-8')
        
        # Find all url(...) statements
        urls = re.findall(r'url\((https://[^)]+)\)', css)
        for i, font_url in enumerate(urls):
            filename = f"{name.replace(' ', '_').lower()}_{i}.woff2"
            filepath = os.path.join(out_dir, filename)
            
            # Download the woff2 file
            print(f"  Downloading {filename}...")
            font_req = urllib.request.Request(font_url, headers={'User-Agent': USER_AGENT})
            with urllib.request.urlopen(font_req) as font_res, open(filepath, 'wb') as f:
                f.write(font_res.read())
            
            # Replace URL in CSS with local path
            css = css.replace(font_url, f"/fonts/{filename}")
            
        css_lines.append(css)

with open(os.path.join("frontend", "public", "fonts.css"), "w") as f:
    f.write("\n".join(css_lines))

print("Fonts downloaded successfully.")
