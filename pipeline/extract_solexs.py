"""
Final SoLEXS extractor - handles the nested ZIP structure correctly.
The outer ZIP (data-descriptor format) contains per-day inner ZIPs,
which contain .lc.gz gzipped FITS lightcurve files.

Strategy: Scan outer ZIP local headers for inner ZIP entries using
our own stream decompressor, then extract .lc.gz from each inner ZIP.
"""
import gzip
import io
import struct
import sys
import zlib
from pathlib import Path


LOCAL_SIG  = b'PK\x03\x04'
DATA_DESC  = b'PK\x07\x08'
CD_SIG     = b'PK\x01\x02'
EOCD_SIG   = b'PK\x05\x06'


def read_local_header(data: bytes, pos: int):
    """Parse a local file header and return (fname, data_start, flags, compression)."""
    if data[pos:pos+4] != LOCAL_SIG:
        return None
    flags        = struct.unpack_from('<H', data, pos + 6)[0]
    compression  = struct.unpack_from('<H', data, pos + 8)[0]
    comp_size    = struct.unpack_from('<I', data, pos + 18)[0]
    fname_len    = struct.unpack_from('<H', data, pos + 26)[0]
    extra_len    = struct.unpack_from('<H', data, pos + 28)[0]
    fname        = data[pos+30:pos+30+fname_len].decode('utf-8', errors='replace')
    data_start   = pos + 30 + fname_len + extra_len
    return fname, data_start, flags, compression, comp_size


def decompress_entry(data: bytes, data_start: int, compression: int,
                     comp_size: int, has_dd: bool) -> bytes:
    """
    Decompress a single ZIP entry.
    Returns raw (decompressed) bytes of the entry.
    """
    if has_dd or comp_size == 0:
        # Stream decompress until decompressor says done
        if compression == 8:
            dec = zlib.decompressobj(-zlib.MAX_WBITS)
            CHUNK = 131072
            pos = data_start
            n = len(data)
            out = b''
            while pos < n:
                chunk = data[pos:pos+CHUNK]
                try:
                    out += dec.decompress(chunk)
                except zlib.error:
                    break
                if dec.unused_data:
                    break
                pos += CHUNK
            return out
        elif compression == 0:
            # Stored: scan for next PK header
            next_pk = data.find(b'PK', data_start)
            if next_pk != -1:
                return data[data_start:next_pk]
            return data[data_start:]
    else:
        raw = data[data_start:data_start + comp_size]
        if compression == 8:
            return zlib.decompress(raw, -zlib.MAX_WBITS)
        return raw


def extract_inner_zip_lc(inner_bytes: bytes, day_prefix: str, out_dir: Path) -> int:
    """Extract .lc.gz files from an inner day ZIP and save as .fits files."""
    count = 0
    pos = 0
    n = len(inner_bytes)

    while pos < n - 30:
        if inner_bytes[pos:pos+4] != LOCAL_SIG:
            pos += 1
            continue

        try:
            result = read_local_header(inner_bytes, pos)
            if result is None:
                pos += 1
                continue
            fname, data_start, flags, compression, comp_size = result
            has_dd = bool(flags & 0x0008)

            if fname.endswith('/') or not fname:
                pos = data_start
                continue

            if not fname.endswith('.lc.gz'):
                # Skip this entry - advance past it
                if not has_dd and comp_size > 0:
                    pos = data_start + comp_size
                    # Skip data descriptor if present
                    if pos < n and inner_bytes[pos:pos+4] == DATA_DESC:
                        pos += 16
                else:
                    pos = data_start + 4
                continue

            # This is an .lc.gz file - extract it
            raw_gz = decompress_entry(inner_bytes, data_start, compression, comp_size, has_dd)
            if not raw_gz:
                pos = data_start + 4
                continue

            # Gunzip → FITS
            fits_bytes = gzip.decompress(raw_gz)

            # Build output name: AL1_SOLEXS_20260709_SDD2_L1.lc.gz → 20260709_SDD2_lightcurve.fits
            pname = Path(fname).name.replace('.lc.gz', '')
            parts = pname.split('_')
            date_p = parts[2] if len(parts) > 2 else day_prefix
            sdd_p  = parts[3] if len(parts) > 3 else 'SDD2'
            out_name = f"{date_p}_{sdd_p}_lightcurve.fits"
            out_path = out_dir / out_name
            out_path.write_bytes(fits_bytes)
            print(f"      → {out_name} ({len(fits_bytes)/1e6:.1f} MB)")
            count += 1
            break  # One .lc.gz per inner ZIP is enough (SDD2 preferred)

        except Exception as e:
            pass
        pos += 4

    return count


def extract_solexs_outer(zip_path: Path, out_dir: Path, date_filter: str = "2026"):
    """
    Full extraction: outer ZIP → inner day ZIPs → .lc.gz → FITS
    Only extracts dates matching date_filter (e.g. '2026' for July 2026 data).
    """
    out_dir.mkdir(parents=True, exist_ok=True)
    size_mb = zip_path.stat().st_size / 1e6
    print(f"Loading {zip_path.name} ({size_mb:.0f} MB)...")
    data = zip_path.read_bytes()
    print(f"Scanning for inner ZIPs...")

    pos = 0
    n = len(data)
    extracted = 0

    while pos < n - 30:
        if data[pos:pos+4] != LOCAL_SIG:
            pos += 1
            continue

        try:
            result = read_local_header(data, pos)
            if result is None:
                pos += 1
                continue
            fname, data_start, flags, compression, comp_size = result
            has_dd = bool(flags & 0x0008)

            if fname.endswith('/') or not fname:
                pos = data_start
                continue

            # Only process per-day inner ZIP files containing our date filter
            if not fname.endswith('.zip') or date_filter not in fname:
                if not has_dd and comp_size > 0:
                    pos = data_start + comp_size
                    if pos < n and data[pos:pos+4] == DATA_DESC:
                        pos += 16
                else:
                    pos = data_start + max(4, comp_size)
                continue

            day = Path(fname).stem  # e.g. AL1_SLX_L1_20260709_v1.0
            parts = day.split('_')
            day_prefix = parts[3] if len(parts) > 3 else 'unknown'
            print(f"  Extracting inner ZIP: {fname} (day {day_prefix})")

            # Decompress the inner ZIP
            inner_bytes = decompress_entry(data, data_start, compression, comp_size, has_dd)
            if not inner_bytes or len(inner_bytes) < 100:
                print(f"    WARNING: Empty or tiny inner ZIP ({len(inner_bytes)} bytes)")
                pos = data_start + max(4, comp_size)
                continue

            # Extract .lc.gz from inner ZIP
            cnt = extract_inner_zip_lc(inner_bytes, day_prefix, out_dir)
            if cnt == 0:
                print(f"    WARNING: No .lc.gz found in inner ZIP")
            extracted += cnt

            # Advance past this entry
            if not has_dd and comp_size > 0:
                pos = data_start + comp_size
                if pos < n and data[pos:pos+4] == DATA_DESC:
                    pos += 16
            else:
                pos = data_start + max(4, len(inner_bytes))

        except Exception as e:
            print(f"  ERROR at pos {pos}: {e}")
            pos += 4

    print(f"\nExtracted {extracted} SoLEXS lightcurve FITS files")
    return extracted


if __name__ == '__main__':
    base = Path(__file__).parent.parent
    solexs_zips = sorted(base.glob("solexs_*.zip"))
    if not solexs_zips:
        print("No SoLEXS ZIP found in project root.")
        sys.exit(1)

    zip_path = solexs_zips[-1]
    out_dir = base / "data/raw/solexs"

    # Extract only July 2026 data to match HEL1OS dates
    count = extract_solexs_outer(zip_path, out_dir, date_filter="2026")
    if count > 0:
        print(f"\n✓ SoLEXS data ready in {out_dir}")
        print("Now run: python pipeline/ingest.py --input data/raw --output data/processed/lightcurve_combined.csv")
    else:
        print("\n⚠ No FITS files extracted. The archive may need manual inspection.")
