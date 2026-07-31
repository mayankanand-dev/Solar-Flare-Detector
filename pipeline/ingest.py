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
    returns a time-sorted DataFrame with columns [timestamp, flux, source].

    Fusion strategy:
    - Fuse HEL1OS + SoLEXS on their overlapping date range (50-50 blend)
    - Outside the overlap, use whichever instrument has data (labeled clearly)
    - Saves per-instrument CSVs to data/processed/ for ML feature engineering
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
        df_hel1os["timestamp"] = pd.to_datetime(df_hel1os["timestamp"], utc=True)
        
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
        df_solexs["timestamp"] = pd.to_datetime(df_solexs["timestamp"], utc=True)

    if df_hel1os.empty and df_solexs.empty:
        raise RuntimeError("No files parsed.")

    # ── Save per-instrument CSVs for ML feature engineering ──────────────────
    processed_dir = input_dir.parent.parent / "data" / "processed"
    processed_dir.mkdir(parents=True, exist_ok=True)

    if not df_hel1os.empty:
        h_out = processed_dir / "hel1os_lightcurve.csv"
        df_hel1os[["timestamp", "flux"]].to_csv(h_out, index=False)
        log.info(f"  ✓ Saved HEL1OS lightcurve: {len(df_hel1os):,} rows → {h_out}")

    if not df_solexs.empty:
        s_out = processed_dir / "solexs_lightcurve.csv"
        df_solexs[["timestamp", "flux"]].to_csv(s_out, index=False)
        log.info(f"  ✓ Saved SoLEXS lightcurve: {len(df_solexs):,} rows → {s_out}")

    # ── Sensor Fusion ─────────────────────────────────────────────────────────
    if df_hel1os.empty:
        log.warning("No HEL1OS data — using SoLEXS only")
        df_solexs["source"] = "SoLEXS Only (HEL1OS unavailable)"
        return df_solexs[["timestamp", "flux", "source"]]

    if df_solexs.empty:
        log.warning("No SoLEXS data — using HEL1OS only")
        df_hel1os["source"] = "HEL1OS Only (SoLEXS unavailable)"
        return df_hel1os[["timestamp", "flux", "source"]]

    # Find the overlapping date range
    h_start = df_hel1os["timestamp"].min()
    h_end   = df_hel1os["timestamp"].max()
    s_start = df_solexs["timestamp"].min()
    s_end   = df_solexs["timestamp"].max()

    overlap_start = max(h_start, s_start)
    overlap_end   = min(h_end, s_end)

    log.info(f"HEL1OS range:  {h_start.date()} → {h_end.date()} ({len(df_hel1os):,} rows)")
    log.info(f"SoLEXS range:  {s_start.date()} → {s_end.date()} ({len(df_solexs):,} rows)")

    if overlap_start >= overlap_end:
        log.warning("⚠ HEL1OS and SoLEXS have no overlapping dates — using HEL1OS only")
        df_hel1os["hel1os_flux"] = df_hel1os["flux"]
        df_hel1os["solexs_flux"] = df_hel1os["flux"]
        df_hel1os["source"] = "HEL1OS Only (No SoLEXS overlap)"
        return df_hel1os[["timestamp", "flux", "hel1os_flux", "solexs_flux", "source"]]

    log.info(f"Overlap window: {overlap_start.date()} → {overlap_end.date()}")

    # Slice each instrument to the overlap window
    h_overlap = df_hel1os[
        (df_hel1os["timestamp"] >= overlap_start) & (df_hel1os["timestamp"] <= overlap_end)
    ].copy()
    s_overlap = df_solexs[
        (df_solexs["timestamp"] >= overlap_start) & (df_solexs["timestamp"] <= overlap_end)
    ].copy()

    log.info(f"Fusing {len(h_overlap):,} HEL1OS rows and {len(s_overlap):,} SoLEXS rows on overlap window...")

    # Normalize both to [0, 1] range
    def norm(series):
        mn, mx = series.min(), series.max()
        if mx - mn < 1e-10:
            return series * 0.0
        return (series - mn) / (mx - mn)

    h_overlap["flux_norm"] = norm(h_overlap["flux"])
    s_overlap["flux_norm"] = norm(s_overlap["flux"])

    # Resample both to 1-second grid then fuse
    h_overlap = h_overlap.set_index("timestamp")
    s_overlap = s_overlap.set_index("timestamp")

    h_res = h_overlap["flux_norm"].resample("1s").mean().interpolate(method="time", limit=120)
    s_res = s_overlap["flux_norm"].resample("1s").mean().interpolate(method="time", limit=120)

    # Union index — only keep timestamps where BOTH sensors have data
    common_idx = h_res.dropna().index.intersection(s_res.dropna().index)
    if len(common_idx) == 0:
        log.warning("⚠ No common timestamps after resampling — using HEL1OS only for overlap window")
        fused = h_overlap[["flux_norm"]].rename(columns={"flux_norm": "flux"})
        fused["flux"] = fused["flux"] * 1000
        fused["hel1os_flux"] = fused["flux"]
        fused["solexs_flux"] = fused["flux"]
        fused["source"] = "HEL1OS Only (SoLEXS resample failed)"
        fused = fused.reset_index()[["timestamp", "flux", "hel1os_flux", "solexs_flux", "source"]]
    else:
        fused = pd.DataFrame({
            "timestamp": common_idx,
            "flux": ((h_res[common_idx] + s_res[common_idx]) / 2.0 * 1000).values,
            "hel1os_flux": (h_res[common_idx] * 1000).values,
            "solexs_flux": (s_res[common_idx] * 1000).values,
            "source": "Ensemble Fusion (50% HEL1OS, 50% SoLEXS)"
        })
    log.info(f"  ✓ Fused window: {len(fused):,} rows")

    # HEL1OS data OUTSIDE the overlap window (e.g. Jul 10 if SoLEXS ends Jul 9)
    h_outside = df_hel1os[
        (df_hel1os["timestamp"] < overlap_start) | (df_hel1os["timestamp"] > overlap_end)
    ].copy()

    parts = [fused]
    if not h_outside.empty:
        # Normalize HEL1OS-only data to same scale as fused (0–1000 range)
        h_outside["flux"] = norm(h_outside["flux"]) * 1000
        h_outside["hel1os_flux"] = h_outside["flux"]
        h_outside["solexs_flux"] = h_outside["flux"]
        h_outside["source"] = "HEL1OS Only (Outside SoLEXS coverage)"
        parts.append(h_outside[["timestamp", "flux", "hel1os_flux", "solexs_flux", "source"]])
        log.info(f"  + HEL1OS-only outside overlap: {len(h_outside):,} rows")

    combined = pd.concat(parts, ignore_index=True).sort_values("timestamp").reset_index(drop=True)
    log.info(f"  ✓ Final combined dataset: {len(combined):,} rows")
    return combined


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
