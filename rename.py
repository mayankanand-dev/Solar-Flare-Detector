import os

def replace_in_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            
        if "Solar Flare Detector" in content or "solar-flare-detector" in content:
            new_content = content.replace("Solar Flare Detector", "Solar Flare Detector")
            new_content = new_content.replace("solar-flare-detector", "solar-flare-detector")
            
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"Updated {filepath}")
    except Exception as e:
        pass

def main():
    root_dir = r"c:\Users\mayank\Desktop\Solar Flare Detector"
    for subdir, dirs, files in os.walk(root_dir):
        if 'node_modules' in dirs:
            dirs.remove('node_modules')
        if 'venv' in dirs:
            dirs.remove('venv')
        if '.git' in dirs:
            dirs.remove('.git')
        if '__pycache__' in dirs:
            dirs.remove('__pycache__')

        for file in files:
            if file.endswith(('.py', '.tsx', '.ts', '.html', '.json', '.md', '.bat', '.css', '.tsx')):
                replace_in_file(os.path.join(subdir, file))

if __name__ == "__main__":
    main()
