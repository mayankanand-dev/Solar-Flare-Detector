"""
pipeline/ingest.py — Solar Flare Detector Data Ingestion
====================================================
Reads FITS files from ISRO Aditya-L1 SoLEXS and HEL1OS instruments.
Extracts timestamp + flux columns into a clean pandas DataFrame.
Handles multiple FITS files (multiple days) and concatenates them.

Usage:
    python pipeline/ingest.py --input data/raw --output data/processed/lightcurve.csv
    python pipeline/ingest.py --input data/raw/hel1os --output data/processed/hel1os.csv --instrument hel1os
    python pipeline/ingest.py --input data/raw/solexs --output data/processed/solexs.csv --instrument solexs
"""

import argparse
import logging
import sys
from pathlib import Path
from typing import Optional

import numpy as np
import pandas as pd
from astropy.io import fits
from astropy.time import Time

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)

# ─── FITS column name candidates (instrument-dependent) ───────────────────────
TIMESTAMP_COLUMNS = ["ISOT", "TIME", "time", "Timestamp", "TIMESTAMP", "MET", "UTC", "MJD"]
FLUX_COLUMNS = [
    # HEL1OS actual column names
    "CTR", "ctr",
    # Generic alternatives
    "RATE", "rate", "COUNTS", "counts", "FLUX", "flux",
    "COUNT_RATE", "count_rate", "VETO_RATE",
    "RATE_0_200", "RATE_0_500", "RATE_GT_200",
]


def _find_column(columns: list[str], candidates: list[str]) -> Optional[str]:
    """Return the first matching column name from candidates."""
    col_set = set(columns)
    for c in candidates:
        if c in col_set:
            return c
    return None


def _parse_hel1os_fits(filepath: Path) -> pd.DataFrame:
    """
    Parse a HEL1OS lightcurve FITS file.
    
    Real HEL1OS CZT lightcurve columns:
      - ISOT: ISO 8601 timestamp string (e.g. '2026-07-02T00:00:01.000')
      - MJD:  Modified Julian Date (float)
      - CTR:  Count rate (counts/second) — the flux proxy
      - STAT_ERR: Statistical error on CTR
    """
    with fits.open(filepath) as hdul:
        # Try each HDU to find the binary table
        table = None
        for hdu in hdul:
            if hasattr(hdu, 'columns') and hdu.data is not None and len(hdu.data) > 0:
                table = hdu
                break

        if table is None:
            raise ValueError(f"No binary table found in {filepath}")

        cols = [c.name for c in table.columns]
        log.debug(f"  Columns in {filepath.name}: {cols}")

        # Parse timestamps — prefer ISOT (ISO string), fall back to MJD
        ts_utc = None
        if 'ISOT' in cols:
            try:
                isot_vals = table.data['ISOT']
                # ISOT may be bytes or str array
                if hasattr(isot_vals[0], 'decode'):
                    isot_vals = [v.decode('ascii').strip() for v in isot_vals]
                else:
                    isot_vals = [str(v).strip() for v in isot_vals]
                ts_utc = pd.to_datetime(isot_vals, utc=True, errors='coerce')
                log.debug(f"  Parsed ISOT timestamps: {ts_utc[0]} → {ts_utc[-1]}")
            except Exception as e:
                log.warning(f"  ISOT parse failed, falling back to MJD: {e}")

        if ts_utc is None and 'MJD' in cols:
            # Convert MJD → UTC datetime
            mjd_vals = table.data['MJD'].astype(float)
            try:
                astro_times = Time(mjd_vals, format='mjd', scale='utc')
                ts_utc = pd.to_datetime(astro_times.to_value('datetime64'))
                log.debug(f"  Parsed MJD timestamps")
            except Exception as e:
                log.warning(f"  MJD parse failed: {e}")

        if ts_utc is None:
            # Last resort: try generic time columns
            time_col = _find_column(cols, TIMESTAMP_COLUMNS)
            if time_col is None:
                raise ValueError(f"Cannot find time column in {filepath}. Available: {cols}")
            time_vals = table.data[time_col].astype(float)
            ADITYA_L1_EPOCH = "2017-01-01T00:00:00"
            epoch = Time(ADITYA_L1_EPOCH, format='isot', scale='utc')
            timestamps = epoch + time_vals
            ts_utc = pd.to_datetime(timestamps.to_value('datetime64'))

        # Parse flux — prefer CTR (count rate)
        flux_col = _find_column(cols, FLUX_COLUMNS)
        if flux_col is None:
            raise ValueError(f"Cannot find flux column in {filepath}. Available: {cols}")

        flux_vals = table.data[flux_col].astype(float)

        # Handle multi-dimensional flux (e.g. energy channels) — sum across channels
        if flux_vals.ndim > 1:
            flux_vals = flux_vals.sum(axis=1)

    df = pd.DataFrame({"timestamp": ts_utc, "flux": flux_vals, "source": filepath.name})
    df = df.dropna(subset=["timestamp", "flux"])
    df = df[df["flux"] >= 0]  # Remove negative flux (bad data)
    return df


def _parse_solexs_fits(filepath: Path) -> pd.DataFrame:
    """
    Parse a SoLEXS lightcurve FITS file.
    
    Real SoLEXS (SDD) lightcurve columns:
      - TIME:   seconds since Unix epoch (MJDREF=40587 = 1970-01-01)
      - COUNTS: count rate (counts/s) per second cadence
    """
    with fits.open(filepath) as hdul:
        table = None
        for i, hdu in enumerate(hdul):
            if hasattr(hdu, 'columns') and hdu.data is not None and len(hdu.data) > 0:
                table = hdu
                log.debug(f"  Using HDU {i}: {hdu.name}")
                break

        if table is None:
            raise ValueError(f"No usable binary table in {filepath}")

        cols = [c.name for c in table.columns]
        log.debug(f"  SoLEXS Columns: {cols}")

        # TIME column: seconds since Unix epoch (MJDREF=40587=1970-01-01)
        if 'TIME' not in cols:
            raise ValueError(f"No TIME column in {filepath}. Available: {cols}")

        time_vals = table.data['TIME'].astype(float)
        ts_utc = pd.to_datetime(time_vals, unit='s', utc=True)

        # Flux: prefer COUNTS, fall back to RATE
        flux_col = _find_column(cols, ['COUNTS', 'RATE', 'FLUX', 'CTR', 'rate', 'counts'])
        if flux_col is None:
            raise ValueError(f"No flux column in {filepath}. Available: {cols}")

        flux_vals = table.data[flux_col].astype(float)
        if flux_vals.ndim > 1:
            flux_vals = np.nansum(flux_vals, axis=1)

    df = pd.DataFrame({"timestamp": ts_utc, "flux": flux_vals, "source": filepath.name, "instrument": "SoLEXS"})
    df = df.dropna(subset=["timestamp", "flux"])
    df = df[df["flux"] >= 0]
    return df


def ingest_directory(
    input_dir: Path,
    instrument: str = "auto",
    max_files: Optional[int] = None,
) -> pd.DataFrame:
    """
    Reads all FITS files in input_dir (recursively), parses them, and
    returns a 50-50 fused time-sorted DataFrame with columns [timestamp, flux, source].
    """
    fits_files = sorted(input_dir.rglob("*.fits"))

    if not fits_files:
        log.warning(f"No FITS files found in {input_dir}")
        return pd.DataFrame(columns=["timestamp", "flux", "source"])

    # Split into hel1os and solexs
    hel1os_files = []
    solexs_files = []
    
    for f in fits_files:
        path_str = str(f).lower()
        if "hel1os" in path_str or "hls" in path_str or "czt" in path_str:
            hel1os_files.append(f)
        elif "solexs" in path_str or "slx" in path_str or "sdd" in path_str:
            solexs_files.append(f)

    # For HEL1OS, prefer czt1
    hel1os_czt1 = [f for f in hel1os_files if "czt1" in f.name.lower()]
    if hel1os_czt1:
        hel1os_files = hel1os_czt1
        
    # For SoLEXS, filter lightcurves
    solexs_lc = [f for f in solexs_files if any(k in f.name.lower() for k in ["lc", "lightcurve", "rate", "counts"])]
    if solexs_lc:
        solexs_files = solexs_lc

    if max_files:
        hel1os_files = hel1os_files[:max_files]
        solexs_files = solexs_files[:max_files]
        
    df_hel1os = pd.DataFrame()
    df_solexs = pd.DataFrame()
    
    # Read HEL1OS
    frames = []
    for f in hel1os_files:
        try:
            df = _parse_hel1os_fits(f)
            frames.append(df)
        except Exception as e:
            log.warning(f"HEL1OS failed {f.name}: {e}")
    if frames:
        df_hel1os = pd.concat(frames, ignore_index=True).sort_values("timestamp").drop_duplicates("timestamp")
        
    # Read SoLEXS
    frames = []
    for f in solexs_files:
        try:
            df = _parse_solexs_fits(f)
            frames.append(df)
        except Exception as e:
            log.warning(f"SoLEXS failed {f.name}: {e}")
    if frames:
        df_solexs = pd.concat(frames, ignore_index=True).sort_values("timestamp").drop_duplicates("timestamp")

    if df_hel1os.empty and df_solexs.empty:
        raise RuntimeError("No files parsed.")
        
    log.info(f"Fusing {len(df_hel1os)} HEL1OS rows and {len(df_solexs)} SoLEXS rows...")
        
    # FUSION
    if not df_hel1os.empty and not df_solexs.empty:
        # Normalize both to 0-1
        df_hel1os["flux_norm"] = (df_hel1os["flux"] - df_hel1os["flux"].min()) / (df_hel1os["flux"].max() - df_hel1os["flux"].min())
        df_solexs["flux_norm"] = (df_solexs["flux"] - df_solexs["flux"].min()) / (df_solexs["flux"].max() - df_solexs["flux"].min())
        
        # Resample
        df_hel1os.set_index("timestamp", inplace=True)
        df_solexs.set_index("timestamp", inplace=True)
        
        h_res = df_hel1os.resample("1s").mean().interpolate(method="time", limit=60)
        s_res = df_solexs.resample("1s").mean().interpolate(method="time", limit=60)
        
        # Combine
        combined = pd.DataFrame(index=h_res.index.union(s_res.index))
        combined["h"] = h_res["flux_norm"]
        combined["s"] = s_res["flux_norm"]
        
        combined["h"] = combined["h"].interpolate(method="time", limit=60)
        combined["s"] = combined["s"].interpolate(method="time", limit=60)
        
        # Exactly 50-50
        combined["flux"] = combined[["h", "s"]].mean(axis=1) * 1000 # Scale up for readability
        combined = combined.dropna(subset=["flux"]).reset_index()
        combined = combined.rename(columns={"index": "timestamp"})
        combined["source"] = "Ensemble Fusion (50% HEL1OS, 50% SoLEXS)"
        return combined
    elif not df_hel1os.empty:
        df_hel1os["source"] = "HEL1OS Only (Fusion Failed)"
        return df_hel1os
    else:
        df_solexs["source"] = "SoLEXS Only (Fusion Failed)"
        return df_solexs


def main():
    parser = argparse.ArgumentParser(
        description="Solar Flare Detector — Aditya-L1 FITS data ingestion"
    )
    parser.add_argument(
        "--input", "-i", type=Path, default=Path("data/raw"),
        help="Input directory containing FITS files (default: data/raw)"
    )
    parser.add_argument(
        "--output", "-o", type=Path, default=Path("data/processed/lightcurve.csv"),
        help="Output CSV path (default: data/processed/lightcurve.csv)"
    )
    parser.add_argument(
        "--instrument", choices=["auto", "hel1os", "solexs"], default="auto",
        help="Instrument type (default: auto-detect)"
    )
    parser.add_argument(
        "--max-files", type=int, default=None,
        help="Limit number of FITS files to process (for testing)"
    )
    args = parser.parse_args()

    if not args.input.exists():
        log.error(f"Input directory not found: {args.input}")
        sys.exit(1)

    log.info("=" * 60)
    log.info("Solar Flare Detector — Data Ingestion Pipeline")
    log.info("⚠  Using REAL Aditya-L1 mission data from ISRO PRADAN")
    log.info("=" * 60)

    df = ingest_directory(args.input, args.instrument, args.max_files)

    if df.empty:
        log.error("No data was ingested. Check your FITS files.")
        sys.exit(1)

    # Save output
    args.output.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(args.output, index=False)

    log.info("\n" + "=" * 60)
    log.info("Ingestion Summary")
    log.info(f"  Total rows:   {len(df):,}")
    log.info(f"  Time range:   {df['timestamp'].min()} → {df['timestamp'].max()}")
    log.info(f"  Duration:     {df['timestamp'].max() - df['timestamp'].min()}")
    log.info(f"  Flux range:   [{df['flux'].min():.4f}, {df['flux'].max():.4f}]")
    log.info(f"  Output:       {args.output}")
    log.info("=" * 60)

    # Sanity checks
    nan_ts = df["timestamp"].isna().sum()
    if nan_ts > 0:
        log.warning(f"⚠ {nan_ts} NaN timestamps in output — check source data")

    return df


if __name__ == "__main__":
    main()
