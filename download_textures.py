import os
import urllib.request

def download_texture(url, dest_path):
    print(f"Downloading {url} to {dest_path}...")
    try:
        # Some servers reject default python user agents
        req = urllib.request.Request(
            url, 
            headers={'User-Agent': 'Mozilla/5.0'}
        )
        with urllib.request.urlopen(req) as response, open(dest_path, 'wb') as out_file:
            out_file.write(response.read())
        print("Success.")
    except Exception as e:
        print(f"Failed to download {url}: {e}")

if __name__ == '__main__':
    dest_dir = os.path.join("frontend", "public", "textures")
    os.makedirs(dest_dir, exist_ok=True)
    
    textures = [
        ("https://www.solarsystemscope.com/textures/download/2k_sun.jpg", "2k_sun.jpg"),
        ("https://www.solarsystemscope.com/textures/download/2k_earth_daymap.jpg", "2k_earth_daymap.jpg"),
    ]
    
    for url, filename in textures:
        download_texture(url, os.path.join(dest_dir, filename))
