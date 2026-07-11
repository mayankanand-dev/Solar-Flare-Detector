"""
Script to extract all nested ZIP files from HEL1OS and SoLEXS raw archives.
Run once after downloading from PRADAN.
"""
import zipfile
import os
import sys
from pathlib import Path

def extract_hel1os(outer_zip_path: str, out_dir: str):
    """Extract nested HEL1OS ZIPs, pulling out only lightcurve FITS files.
    Each file is prefixed with the date from the inner ZIP name to avoid collisions.
    """
    outer_zip_path = Path(outer_zip_path)
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    print(f"Opening outer archive: {outer_zip_path.name}")
    with zipfile.ZipFile(outer_zip_path, 'r') as outer:
        entries = outer.namelist()
        print(f"  Found {len(entries)} inner ZIPs")
        for inner_name in entries:
            if not inner_name.endswith('.zip'):
                continue
            # Extract date prefix from inner zip name e.g. HLS_20260710_120002_...
            # → prefix = "20260710_120002"
            parts = Path(inner_name).stem.split('_')
            date_prefix = '_'.join(parts[1:3]) if len(parts) >= 3 else parts[1] if len(parts) >= 2 else 'unknown'

            print(f"  Extracting inner: {inner_name} (prefix: {date_prefix})")
            with outer.open(inner_name) as inner_bytes:
                with zipfile.ZipFile(inner_bytes, 'r') as inner:
                    for item in inner.namelist():
                        fname = Path(item).name
                        # Extract lightcurve FITS files only to keep it manageable
                        if fname.startswith('lightcurve_') and fname.endswith('.fits'):
                            # Add date prefix: 20260710_120002_lightcurve_czt1.fits
                            unique_name = f"{date_prefix}_{fname}"
                            dest = out_dir / unique_name
                            with inner.open(item) as src, open(dest, 'wb') as dst:
                                dst.write(src.read())
                            print(f"    → {dest.name}")

def extract_solexs(outer_zip_path: str, out_dir: str):
    """Extract SoLEXS FITS files."""
    outer_zip_path = Path(outer_zip_path)
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    print(f"Opening SoLEXS archive: {outer_zip_path.name}")
    try:
        with zipfile.ZipFile(outer_zip_path, 'r') as z:
            entries = z.namelist()
            print(f"  Found {len(entries)} entries")
            for name in entries:
                fname = Path(name).name
                if fname.endswith('.fits'):
                    dest = out_dir / fname
                    with z.open(name) as src, open(dest, 'wb') as dst:
                        dst.write(src.read())
                    print(f"    → {dest.name}")
                elif name.endswith('.zip'):
                    # Handle nested zips like HEL1OS
                    print(f"  Found nested ZIP: {name}")
                    with z.open(name) as inner_bytes:
                        with zipfile.ZipFile(inner_bytes, 'r') as inner:
                            for item in inner.namelist():
                                ifname = Path(item).name
                                if ifname.endswith('.fits'):
                                    dest = out_dir / ifname
                                    with inner.open(item) as src, open(dest, 'wb') as dst:
                                        dst.write(src.read())
                                    print(f"      → {dest.name}")
    except zipfile.BadZipFile as e:
        print(f"  ERROR: {e}")
        print("  The SoLEXS ZIP may be corrupted or use an unsupported format.")
        print("  Please re-download from PRADAN and try again.")
        return False
    return True


if __name__ == '__main__':
    base = Path(__file__).parent.parent
    
    hel1os_zip = base / "hel1os_2026Jul11T183342090.zip"
    solexs_zip = base / "solexs_2026Jul11T175747534.zip"
    
    if hel1os_zip.exists():
        extract_hel1os(str(hel1os_zip), str(base / "data/raw/hel1os"))
    else:
        print(f"HEL1OS archive not found: {hel1os_zip}")
    
    if solexs_zip.exists():
        extract_solexs(str(solexs_zip), str(base / "data/raw/solexs"))
    else:
        print(f"SoLEXS archive not found: {solexs_zip}")
    
    print("\nExtraction complete!")
