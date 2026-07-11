"""
pipeline/detect_flares.py — Solar Flare Detection Algorithm
=============================================================
Implements a rolling-baseline + k-sigma spike detection approach.
All thresholds are configurable — no hardcoded magic numbers.

IMPORTANT: This pipeline uses REAL Aditya-L1 / HEL1OS data.
Classification uses GOES-style A/B/C/M/X thresholds as an APPROXIMATION.
HEL1OS operates in a different energy band (12–200 keV) than GOES (1–8 Å),
so class assignments are indicative, not a direct equivalence.

Usage:
    python pipeline/detect_flares.py --input data/processed/lightcurve.csv \
        --output data/processed/flares.json

    # With custom thresholds:
    python pipeline/detect_flares.py --sigma 4 --min-duration 3 --window 90
"""

import argparse
import json
import logging
import sys
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Optional

import numpy as np
import pandas as pd

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)

# ─── GOES-style X-ray flux class thresholds ────────────────────────────────────
# These are APPROXIMATE mappings for HEL1OS/SoLEXS data.
# GOES uses 1–8 Å band (W/m²). HEL1OS uses 12–200 keV counts/s.
# We classify relative to the dataset's background flux level + sigma levels.
# See: https://www.swpc.noaa.gov/products/goes-x-ray-flux
#
# For real analysis, use the actual flux thresholds from ISRO's documentation.
# The classes below are based on the ratio: peak_flux / background_flux
# A: < 2σ above baseline (micro-flare level)
# B: 2–4σ (small)
# C: 4–7σ (moderate)
# M: 7–10σ (strong)
# X: >10σ (extreme)
FLARE_CLASSES = [
    ("X", 10.0),
    ("M", 7.0),
    ("C", 4.0),
    ("B", 2.0),
    ("A", 0.0),
]


def classify_flare(peak_sigma: float) -> str:
    """Return GOES-style class (A/B/C/M/X) based on peak sigma above baseline."""
    for cls, threshold in FLARE_CLASSES:
        if peak_sigma >= threshold:
            return cls
    return "A"


@dataclass
class FlareEvent:
    id: int
    start_time: str
    peak_time: str
    end_time: str
    peak_flux: float
    background_flux: float
    peak_sigma: float
    duration_minutes: float
    flare_class: str
    instrument: str = "HEL1OS"
    note: str = ""

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class DetectionConfig:
    """All detection thresholds in one place — configurable, not hardcoded."""
    # Rolling baseline window in minutes
    baseline_window_minutes: int = 90
    # k-sigma threshold for flare start
    sigma_threshold: float = 3.0
    # Minimum consecutive samples above threshold to count as flare (reject noise)
    min_duration_samples: int = 3
    # How far below threshold before flare is considered ended (decay tolerance)
    decay_tolerance_sigma: float = 1.5
    # Maximum flare duration in minutes (reject runaway events)
    max_duration_minutes: int = 180
    # Minimum samples in window for robust baseline computation
    min_window_samples: int = 10


def compute_baseline(
    df: pd.DataFrame,
    window_minutes: int = 90,
) -> tuple[pd.Series, pd.Series]:
    """
    Compute rolling median baseline and rolling std of flux.
    
    Returns (baseline, rolling_std).
    The baseline represents the 'quiet Sun' background flux.
    """
    # Determine sampling cadence
    timestamps = pd.to_datetime(df["timestamp"])
    dt_seconds = timestamps.diff().dt.total_seconds().median()
    if np.isnan(dt_seconds) or dt_seconds <= 0:
        dt_seconds = 1.0  # fallback: 1 second cadence

    # Window in samples
    window_samples = max(1, int((window_minutes * 60) / dt_seconds))
    log.info(f"Baseline: {window_minutes} min window = {window_samples} samples "
             f"(cadence: {dt_seconds:.1f}s)")

    flux = df["flux"]
    baseline = flux.rolling(window=window_samples, center=True, min_periods=10).median()
    rolling_std = flux.rolling(window=window_samples, center=True, min_periods=10).std()

    # Fill edges with global median/std to avoid NaN at boundaries
    global_median = flux.median()
    global_std = flux.std()
    baseline = baseline.fillna(global_median)
    rolling_std = rolling_std.fillna(global_std)

    # Avoid division by zero
    rolling_std = rolling_std.clip(lower=1e-10)

    return baseline, rolling_std


def detect_flares(
    df: pd.DataFrame,
    config: DetectionConfig,
) -> list[FlareEvent]:
    """
    Detect solar flare events in the light curve.

    Algorithm:
    1. Compute rolling median baseline
    2. Flag samples where flux > baseline + k*std
    3. Merge consecutive flagged samples into events
    4. Track peak and decay for each event
    5. Classify events by peak sigma

    Parameters
    ----------
    df : DataFrame with columns [timestamp, flux]
    config : DetectionConfig

    Returns
    -------
    List of FlareEvent objects, sorted by start_time.
    """
    if df.empty:
        log.warning("Empty DataFrame — no flares to detect")
        return []

    df = df.copy()
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    df = df.sort_values("timestamp").reset_index(drop=True)

    # Step 1: Compute baseline
    baseline, rolling_std = compute_baseline(df, config.baseline_window_minutes)
    df["baseline"] = baseline
    df["rolling_std"] = rolling_std
    df["sigma"] = (df["flux"] - df["baseline"]) / df["rolling_std"]

    # Step 2: Flag candidate flare samples
    df["above_threshold"] = df["sigma"] >= config.sigma_threshold

    # Step 3: Find contiguous blocks of above-threshold samples
    # Use group-by-consecutive-True/False pattern
    df["group"] = (df["above_threshold"] != df["above_threshold"].shift()).cumsum()

    flares = []
    flare_id = 0

    # Group consecutive True blocks
    candidates = df[df["above_threshold"]].groupby("group")

    for _, group in candidates:
        if len(group) < config.min_duration_samples:
            # Too short — likely noise spike
            continue

        # Flare start = first sample in this group
        start_idx = group.index[0]
        peak_idx = group["flux"].idxmax()

        # Step 4: Track decay — extend beyond the threshold group
        # Find where flux decays back to baseline + decay_tolerance*std
        decay_end_idx = peak_idx
        for i in range(peak_idx, min(len(df), peak_idx + config.max_duration_minutes * 60)):
            if i >= len(df):
                break
            sigma_at_i = df.loc[i, "sigma"]
            if sigma_at_i < config.decay_tolerance_sigma:
                decay_end_idx = i
                break
        else:
            decay_end_idx = min(len(df) - 1, peak_idx + config.max_duration_minutes)

        # Compute event properties
        start_time = df.loc[start_idx, "timestamp"]
        peak_time = df.loc[peak_idx, "timestamp"]
        end_time = df.loc[decay_end_idx, "timestamp"]

        duration_minutes = (end_time - start_time).total_seconds() / 60

        # Cap duration
        if duration_minutes > config.max_duration_minutes:
            duration_minutes = config.max_duration_minutes
            end_time = start_time + pd.Timedelta(minutes=config.max_duration_minutes)

        peak_flux = float(df.loc[peak_idx, "flux"])
        background_flux = float(df.loc[peak_idx, "baseline"])
        peak_sigma = float(df.loc[peak_idx, "sigma"])
        flare_class = classify_flare(peak_sigma)

        flare_id += 1
        event = FlareEvent(
            id=flare_id,
            start_time=start_time.isoformat(),
            peak_time=peak_time.isoformat(),
            end_time=end_time.isoformat(),
            peak_flux=round(peak_flux, 6),
            background_flux=round(background_flux, 6),
            peak_sigma=round(peak_sigma, 3),
            duration_minutes=round(duration_minutes, 2),
            flare_class=flare_class,
            instrument="Ensemble Fusion (HEL1OS + SoLEXS)",
            note=(
                "Classification is APPROXIMATE — Ensemble data "
                "differs from GOES (1-8 Å). Not a direct GOES equivalence."
            ),
        )
        flares.append(event)
        log.debug(f"  Flare {flare_id}: class={flare_class}, peak_sigma={peak_sigma:.1f}, "
                  f"duration={duration_minutes:.1f}min")

    return flares


def print_summary(flares: list[FlareEvent]):
    """Print a human-readable summary table of detected flares."""
    if not flares:
        log.info("\n⚠ No flares detected. Check thresholds or data range.")
        return

    log.info("\n" + "=" * 70)
    log.info(f"{'Flare Detection Summary':^70}")
    log.info("=" * 70)
    log.info(f"{'ID':>4}  {'Class':>5}  {'Start':^22}  {'Peak σ':>7}  {'Duration':>9}")
    log.info("-" * 70)
    for f in flares:
        log.info(f"{f.id:>4}  {f.flare_class:>5}  {f.start_time[:19]:^22}  "
                 f"{f.peak_sigma:>7.1f}  {f.duration_minutes:>7.1f}m")
    log.info("-" * 70)

    # Class count summary
    from collections import Counter
    counts = Counter(f.flare_class for f in flares)
    log.info("\nFlare count by class:")
    for cls in ["X", "M", "C", "B", "A"]:
        if cls in counts:
            log.info(f"  {cls}: {counts[cls]}")
    log.info(f"\nTotal detected: {len(flares)}")
    log.info("=" * 70)


def main():
    parser = argparse.ArgumentParser(
        description="Solar Flare Detector — Flare Detection Algorithm"
    )
    parser.add_argument(
        "--input", "-i", type=Path, default=Path("data/processed/lightcurve.csv"),
        help="Input lightcurve CSV (default: data/processed/lightcurve.csv)"
    )
    parser.add_argument(
        "--output", "-o", type=Path, default=Path("data/processed/flares.json"),
        help="Output flares JSON (default: data/processed/flares.json)"
    )
    parser.add_argument("--sigma", type=float, default=3.0,
                        help="k-sigma detection threshold (default: 3.0)")
    parser.add_argument("--window", type=int, default=90,
                        help="Baseline window in minutes (default: 90)")
    parser.add_argument("--min-duration", type=int, default=3,
                        help="Min consecutive samples for flare (default: 3)")
    parser.add_argument("--decay-tolerance", type=float, default=1.5,
                        help="Sigma threshold for decay end (default: 1.5)")
    args = parser.parse_args()

    if not args.input.exists():
        log.error(f"Input file not found: {args.input}")
        log.error("Run pipeline/ingest.py first to generate the lightcurve CSV.")
        sys.exit(1)

    log.info("=" * 60)
    log.info("Solar Flare Detector — Flare Detection")
    log.info("⚠  Using REAL Aditya-L1 HEL1OS data")
    log.info("=" * 60)

    config = DetectionConfig(
        sigma_threshold=args.sigma,
        baseline_window_minutes=args.window,
        min_duration_samples=args.min_duration,
        decay_tolerance_sigma=args.decay_tolerance,
    )

    log.info(f"Config: σ={config.sigma_threshold}, window={config.baseline_window_minutes}min, "
             f"min_dur={config.min_duration_samples} samples")

    df = pd.read_csv(args.input)
    log.info(f"Loaded {len(df):,} rows from {args.input}")

    flares = detect_flares(df, config)
    print_summary(flares)

    # Save output
    args.output.parent.mkdir(parents=True, exist_ok=True)
    output_data = {
        "generated_at": pd.Timestamp.now().isoformat(),
        "source": "Ensemble Fusion (50% HEL1OS, 50% SoLEXS)",
        "config": {
            "sigma_threshold": config.sigma_threshold,
            "baseline_window_minutes": config.baseline_window_minutes,
            "min_duration_samples": config.min_duration_samples,
            "decay_tolerance_sigma": config.decay_tolerance_sigma,
        },
        "flare_count": len(flares),
        "flares": [f.to_dict() for f in flares],
    }
    with open(args.output, "w") as fp:
        json.dump(output_data, fp, indent=2, default=str)

    log.info(f"\n✓ Saved {len(flares)} flares → {args.output}")

    if not flares:
        log.info(
            "No flares detected. This may be correct if the data window "
            "covers a quiet Sun period. Try reducing --sigma to 2.5 or "
            "check the lightcurve.csv for expected activity."
        )

    return flares


if __name__ == "__main__":
    main()
