"""
pipeline/validate.py — Cross-validation Against NOAA/GOES Event List
=====================================================================
Compares detected flares from flares.json against NOAA's publicly
recorded X-ray flare event list for the same date range.

NOAA GOES data is fetched from:
  https://www.swpc.noaa.gov/products/goes-x-ray-flux
  or from their ftp/json event archive.

For offline use, a locally-saved copy of the event list is used.
The script can also fetch from NOAA's public API if internet is available.

Usage:
    python pipeline/validate.py \
        --flares data/processed/flares.json \
        --output data/processed/validation_report.txt
"""

import argparse
import json
import logging
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pandas as pd

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)

# NOAA GOES flare event API (JSON endpoint)
NOAA_EVENTS_URL = "https://services.swpc.noaa.gov/json/goes/primary/xray-flares-7-day.json"


def fetch_noaa_events(start_date: str, end_date: str) -> pd.DataFrame:
    """
    Fetch NOAA flare events.
    Tries live NOAA API first; falls back to locally-saved copy.

    Returns DataFrame with columns: [event_time, end_time, class, max_flux, region].
    """
    local_cache = Path("data/processed/noaa_events_cache.json")

    # Try live fetch
    try:
        import requests
        log.info(f"Fetching NOAA GOES events from {NOAA_EVENTS_URL}")
        resp = requests.get(NOAA_EVENTS_URL, timeout=15)
        if resp.status_code == 200:
            data = resp.json()
            local_cache.parent.mkdir(parents=True, exist_ok=True)
            with open(local_cache, "w") as f:
                json.dump(data, f)
            log.info(f"  ✓ Fetched {len(data)} events, cached to {local_cache}")
            return _parse_noaa_json(data, start_date, end_date)
        else:
            log.warning(f"  NOAA API returned {resp.status_code}")
    except Exception as e:
        log.warning(f"  Live NOAA fetch failed: {e}")

    # Fall back to local cache
    if local_cache.exists():
        log.info(f"Using cached NOAA events: {local_cache}")
        with open(local_cache) as f:
            data = json.load(f)
        return _parse_noaa_json(data, start_date, end_date)

    # No data available
    log.warning(
        "⚠ No NOAA event data available (no internet + no cache).\n"
        "  Validation will be skipped. For offline use, run this script once\n"
        f"  with internet to cache NOAA data to {local_cache}."
    )
    return pd.DataFrame(columns=["event_time", "end_time", "flare_class", "max_flux", "region"])


def _parse_noaa_json(data: list, start_date: str, end_date: str) -> pd.DataFrame:
    """Parse NOAA GOES JSON event list to DataFrame."""
    rows = []
    for event in data:
        try:
            # NOAA format: {"begin_time": "2026-07-02 01:23:00", "max_time": ..., "end_time": ..., "goes_class": "M1.2", ...}
            begin = event.get("begin_time") or event.get("start_time") or ""
            max_time = event.get("max_time") or event.get("peak_time") or begin
            end = event.get("end_time") or max_time
            flare_class = event.get("goes_class") or event.get("class", "")
            region = event.get("noaa_region") or event.get("region", "")

            begin_dt = pd.to_datetime(begin, utc=True, errors='coerce')
            if pd.isna(begin_dt):
                continue

            rows.append({
                "event_time": begin_dt,
                "end_time": pd.to_datetime(end, utc=True, errors='coerce'),
                "flare_class": flare_class,
                "region": region,
            })
        except Exception:
            continue

    df = pd.DataFrame(rows)
    if df.empty:
        return df

    # Filter to the relevant date range
    df["event_time"] = pd.to_datetime(df["event_time"], utc=True)
    start = pd.to_datetime(start_date, utc=True)
    end = pd.to_datetime(end_date, utc=True)
    df = df[(df["event_time"] >= start) & (df["event_time"] <= end)]
    return df.reset_index(drop=True)


def validate_detections(
    detected_flares: list[dict],
    noaa_events: pd.DataFrame,
    tolerance_minutes: int = 10,
) -> dict:
    """
    Cross-match detected flares against NOAA ground truth.

    Returns a dict with:
      - true_positives: our detections that match a NOAA event
      - false_positives: our detections with no NOAA match
      - false_negatives: NOAA events we missed
      - precision, recall
    """
    if noaa_events.empty:
        return {
            "note": "No NOAA events available for comparison. Cannot compute TP/FP/FN.",
            "detected": len(detected_flares),
            "noaa_events": 0,
        }

    tolerance = timedelta(minutes=tolerance_minutes)
    noaa_times = noaa_events["event_time"].values

    matched_noaa = set()
    true_positives = []
    false_positives = []

    for det in detected_flares:
        det_time = pd.to_datetime(det["start_time"], utc=True)
        # Find closest NOAA event within tolerance
        best_match = None
        best_delta = timedelta(days=999)

        for i, noaa_time in enumerate(noaa_events["event_time"]):
            delta = abs(det_time - noaa_time)
            if delta <= tolerance and delta < best_delta:
                best_match = i
                best_delta = delta

        if best_match is not None:
            true_positives.append({
                "our_flare_id": det["id"],
                "our_class": det["flare_class"],
                "our_time": det["start_time"],
                "noaa_class": noaa_events.iloc[best_match]["flare_class"],
                "noaa_time": str(noaa_events.iloc[best_match]["event_time"]),
                "delta_minutes": round(best_delta.total_seconds() / 60, 1),
            })
            matched_noaa.add(best_match)
        else:
            false_positives.append({
                "our_flare_id": det["id"],
                "our_class": det["flare_class"],
                "our_time": det["start_time"],
            })

    false_negatives = [
        {
            "noaa_class": noaa_events.iloc[i]["flare_class"],
            "noaa_time": str(noaa_events.iloc[i]["event_time"]),
        }
        for i in range(len(noaa_events))
        if i not in matched_noaa
    ]

    n_det = len(detected_flares)
    n_tp = len(true_positives)
    n_fp = len(false_positives)
    n_fn = len(false_negatives)

    precision = n_tp / n_det if n_det > 0 else 0.0
    recall = n_tp / (n_tp + n_fn) if (n_tp + n_fn) > 0 else 0.0
    f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0.0

    return {
        "detected": n_det,
        "noaa_events": len(noaa_events),
        "true_positives": n_tp,
        "false_positives": n_fp,
        "false_negatives": n_fn,
        "precision": round(precision, 3),
        "recall": round(recall, 3),
        "f1_score": round(f1, 3),
        "tolerance_minutes": tolerance_minutes,
        "matches": true_positives,
        "missed_by_us": false_negatives[:20],  # cap for report
        "spurious": false_positives[:20],
        "note": (
            "Results are approximate — HEL1OS energy band differs from GOES. "
            "Timing differences may reflect propagation, instrument sensitivity, or threshold tuning."
        ),
    }


def write_report(results: dict, output_path: Path):
    """Write a human-readable validation report."""
    lines = [
        "=" * 70,
        "SOLAR SENTINEL — VALIDATION REPORT",
        f"Generated: {datetime.now(timezone.utc).isoformat()}",
        "Data: Real Aditya-L1 HEL1OS data (ISRO PRADAN)",
        "=" * 70,
        "",
        f"Our detections:    {results.get('detected', 'N/A')}",
        f"NOAA events:       {results.get('noaa_events', 'N/A')}",
        f"True Positives:    {results.get('true_positives', 'N/A')}",
        f"False Positives:   {results.get('false_positives', 'N/A')}",
        f"False Negatives:   {results.get('false_negatives', 'N/A')}",
        f"Precision:         {results.get('precision', 'N/A'):.3f}",
        f"Recall:            {results.get('recall', 'N/A'):.3f}",
        f"F1 Score:          {results.get('f1_score', 'N/A'):.3f}",
        "",
        f"Note: {results.get('note', '')}",
        "",
    ]

    if results.get("matches"):
        lines += ["", "Matched Flares (True Positives):", "-" * 50]
        for m in results["matches"]:
            lines.append(
                f"  Flare #{m['our_flare_id']} (ours: {m['our_class']}, NOAA: {m['noaa_class']}) "
                f"at {m['our_time'][:16]} — Δt={m['delta_minutes']}min"
            )

    if results.get("missed_by_us"):
        lines += ["", "NOAA Events We Missed (False Negatives):", "-" * 50]
        for m in results["missed_by_us"]:
            lines.append(f"  {m['noaa_class']} at {m['noaa_time']}")

    if results.get("spurious"):
        lines += ["", "Our Detections Not in NOAA (False Positives):", "-" * 50]
        for m in results["spurious"]:
            lines.append(f"  Flare #{m['our_flare_id']} ({m['our_class']}) at {m['our_time'][:16]}")

    lines.append("\n" + "=" * 70)
    report = "\n".join(lines)
    log.info(report)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w") as f:
        f.write(report)
    log.info(f"\n✓ Validation report saved to {output_path}")


def main():
    parser = argparse.ArgumentParser(
        description="Solar Flare Detector — Validate detections against NOAA events"
    )
    parser.add_argument("--flares", type=Path, default=Path("data/processed/flares.json"))
    parser.add_argument("--output", type=Path, default=Path("data/processed/validation_report.txt"))
    parser.add_argument("--tolerance", type=int, default=10,
                        help="Match tolerance in minutes (default: 10)")
    args = parser.parse_args()

    if not args.flares.exists():
        log.error(f"Flares file not found: {args.flares}")
        log.error("Run pipeline/detect_flares.py first.")
        sys.exit(1)

    with open(args.flares) as f:
        data = json.load(f)

    detected = data.get("flares", [])
    log.info(f"Loaded {len(detected)} detected flares from {args.flares}")

    if not detected:
        log.warning("No flares to validate against NOAA.")
        results = {"detected": 0, "noaa_events": 0, "note": "No flares detected."}
        write_report(results, args.output)
        return

    # Determine date range from detected flares
    times = [d["start_time"] for d in detected]
    start_date = min(times)[:10]
    end_date = max(times)[:10]
    log.info(f"Date range: {start_date} → {end_date}")

    noaa_events = fetch_noaa_events(start_date, end_date)
    log.info(f"NOAA events in range: {len(noaa_events)}")

    results = validate_detections(detected, noaa_events, args.tolerance)
    write_report(results, args.output)

    # Also save JSON
    json_output = args.output.with_suffix(".json")
    with open(json_output, "w") as f:
        json.dump(results, f, indent=2, default=str)
    log.info(f"✓ JSON results saved to {json_output}")


if __name__ == "__main__":
    main()
