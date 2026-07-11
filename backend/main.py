"""
backend/main.py — Solar Flare Detector FastAPI Backend
=================================================
Serves Aditya-L1 flare data and manages replay mode.

Endpoints:
  GET /api/lightcurve?range=...   — paginated flux time series
  GET /api/flares                 — all detected flare events
  GET /api/flares/{id}            — single flare detail + local light curve
  GET /api/replay/status          — current simulated "live" state
  POST /api/replay/reset          — restart replay
  GET /health                     — health check

Run:
  uvicorn backend.main:app --reload
"""

import asyncio
import json
import logging
import os
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import pandas as pd
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger(__name__)

# ─── Paths ────────────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).parent.parent
LIGHTCURVE_CSV = BASE_DIR / "data/processed/lightcurve.csv"
FLARES_JSON = BASE_DIR / "data/processed/flares.json"

# ─── Replay config ────────────────────────────────────────────────────────────
# 1 real day compressed into N minutes of replay
REPLAY_MINUTES = float(os.getenv("REPLAY_MINUTES", "3"))
REPLAY_SPEED = float(os.getenv("REPLAY_SPEED", ""))  if os.getenv("REPLAY_SPEED") else None

# ─── Global in-memory state ───────────────────────────────────────────────────
_lightcurve: Optional[pd.DataFrame] = None
_flares: Optional[list[dict]] = None
_flares_meta: Optional[dict] = None
_replay_state: dict = {
    "current_idx": 0,
    "current_time": None,
    "current_flux": None,
    "flare_active": False,
    "active_flare": None,
    "replay_speed_x": 1.0,
    "started_at": None,
    "total_samples": 0,
    "progress_pct": 0.0,
}
_replay_task: Optional[asyncio.Task] = None


# ─── App ──────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Solar Flare Detector API",
    description="Real-time Aditya-L1 solar flare detection dashboard",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Data Loading ─────────────────────────────────────────────────────────────
def load_lightcurve() -> pd.DataFrame:
    """Load and cache the processed light curve CSV."""
    global _lightcurve
    if _lightcurve is not None:
        return _lightcurve
    if not LIGHTCURVE_CSV.exists():
        raise HTTPException(
            status_code=503,
            detail=(
                f"Lightcurve data not found at {LIGHTCURVE_CSV}. "
                "Run: python pipeline/ingest.py first."
            ),
        )
    log.info(f"Loading lightcurve from {LIGHTCURVE_CSV}...")
    df = pd.read_csv(LIGHTCURVE_CSV, parse_dates=["timestamp"])
    df = df.sort_values("timestamp").reset_index(drop=True)
    log.info(f"Loaded {len(df):,} rows, range: {df['timestamp'].min()} → {df['timestamp'].max()}")
    _lightcurve = df
    return df


def load_flares() -> tuple[list[dict], dict]:
    """Load and cache the detected flares JSON."""
    global _flares, _flares_meta
    if _flares is not None:
        return _flares, _flares_meta
    if not FLARES_JSON.exists():
        log.warning(f"Flares not found at {FLARES_JSON}. Returning empty list.")
        _flares = []
        _flares_meta = {"source": "none", "flare_count": 0}
        return _flares, _flares_meta
    with open(FLARES_JSON) as f:
        data = json.load(f)
    _flares = data.get("flares", [])
    _flares_meta = {k: v for k, v in data.items() if k != "flares"}
    log.info(f"Loaded {len(_flares)} flares from {FLARES_JSON}")
    return _flares, _flares_meta


# ─── Replay Logic ─────────────────────────────────────────────────────────────
async def replay_loop():
    """
    Background coroutine: advances the replay pointer through the lightcurve.
    One full dataset pass = REPLAY_MINUTES real minutes.
    Sets flare_active=True when crossing a detected flare's time window.
    """
    global _replay_state

    try:
        df = load_lightcurve()
        flares, _ = load_flares()
    except Exception as e:
        log.error(f"Replay cannot start: {e}")
        return

    n = len(df)
    if n == 0:
        log.warning("Empty lightcurve — replay cannot run")
        return

    # Compute real seconds per dataset second
    data_duration_s = (df["timestamp"].max() - df["timestamp"].min()).total_seconds()
    replay_duration_s = REPLAY_MINUTES * 60  # real-time seconds for one full replay
    speed_multiplier = data_duration_s / replay_duration_s
    sleep_per_step_s = replay_duration_s / n  # how long to wait per sample

    _replay_state["replay_speed_x"] = round(speed_multiplier, 1)
    _replay_state["total_samples"] = n
    _replay_state["started_at"] = datetime.now(timezone.utc).isoformat()

    log.info(
        f"Replay started: {n:,} samples, {data_duration_s/3600:.1f}h of data "
        f"compressed into {REPLAY_MINUTES:.1f} min real time (speed: {speed_multiplier:.0f}x)"
    )

    # Pre-compute flare time windows for fast lookup
    flare_windows = [
        (
            pd.to_datetime(f["start_time"], utc=True),
            pd.to_datetime(f["end_time"], utc=True),
            f,
        )
        for f in flares
    ]

    idx = 0
    while True:
        idx = idx % n  # Loop replay

        row = df.iloc[idx]
        current_time = pd.to_datetime(row["timestamp"], utc=True)
        current_flux = float(row["flux"])

        # Check if any flare is active at this time
        active_flare = None
        for start, end, flare in flare_windows:
            if start <= current_time <= end:
                active_flare = flare
                break

        _replay_state.update(
            {
                "current_idx": idx,
                "current_time": current_time.isoformat(),
                "current_flux": round(current_flux, 4),
                "flare_active": active_flare is not None,
                "active_flare": {
                    "id": active_flare["id"],
                    "flare_class": active_flare["flare_class"],
                    "peak_flux": active_flare["peak_flux"],
                    "peak_time": active_flare["peak_time"],
                }
                if active_flare
                else None,
                "progress_pct": round((idx / n) * 100, 1),
            }
        )

        idx += 1
        await asyncio.sleep(sleep_per_step_s)


@app.on_event("startup")
async def startup_event():
    """Start replay and pre-load data on server start."""
    global _replay_task
    log.info("Solar Flare Detector API starting up...")
    try:
        load_lightcurve()
        load_flares()
    except Exception as e:
        log.warning(f"Data pre-load warning: {e}")
    _replay_task = asyncio.create_task(replay_loop())
    log.info("Replay task started")


@app.on_event("shutdown")
async def shutdown_event():
    global _replay_task
    if _replay_task:
        _replay_task.cancel()


# ─── Endpoints ────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    """Health check."""
    return {"status": "ok", "service": "Solar Flare Detector API"}


@app.get("/api/lightcurve")
def get_lightcurve(
    range: Optional[str] = Query(None, description="ISO date range: '2026-07-02/2026-07-10'"),
    downsample: int = Query(1000, ge=100, le=100000, description="Max points to return"),
    start: Optional[str] = Query(None),
    end: Optional[str] = Query(None),
):
    """
    Return flux time series.
    Automatically downsamples to `downsample` points for chart performance.
    """
    df = load_lightcurve()

    # Parse date range
    if range:
        parts = range.split("/")
        if len(parts) == 2:
            start, end = parts[0], parts[1]

    if start:
        df = df[df["timestamp"] >= pd.to_datetime(start, utc=True)]
    if end:
        df = df[df["timestamp"] <= pd.to_datetime(end, utc=True)]

    if len(df) == 0:
        return {"timestamps": [], "flux": [], "n_points": 0}

    # Downsample evenly if too many points
    if len(df) > downsample:
        step = max(1, len(df) // downsample)
        df = df.iloc[::step]

    return {
        "timestamps": df["timestamp"].dt.strftime("%Y-%m-%dT%H:%M:%SZ").tolist(),
        "flux": df["flux"].round(4).tolist(),
        "n_points": len(df),
        "time_range": {
            "start": str(df["timestamp"].min()),
            "end": str(df["timestamp"].max()),
        },
    }


@app.get("/api/flares")
def get_flares():
    """Return all detected flare events."""
    flares, meta = load_flares()
    return {
        "flares": flares,
        "count": len(flares),
        "meta": meta,
    }


@app.get("/api/flares/{flare_id}")
def get_flare_detail(flare_id: int):
    """
    Return a single flare's details including its local light-curve window
    (±30 minutes around the peak).
    """
    flares, meta = load_flares()
    flare = next((f for f in flares if f["id"] == flare_id), None)
    if flare is None:
        raise HTTPException(status_code=404, detail=f"Flare {flare_id} not found")

    # Get local light-curve window: from start-30min to end+30min
    df = load_lightcurve()
    peak_time = pd.to_datetime(flare["peak_time"], utc=True)
    window_start = peak_time - pd.Timedelta(minutes=30)
    window_end = peak_time + pd.Timedelta(minutes=30)

    window_df = df[
        (df["timestamp"] >= window_start) & (df["timestamp"] <= window_end)
    ]

    # Downsample window to 500 points max
    if len(window_df) > 500:
        step = max(1, len(window_df) // 500)
        window_df = window_df.iloc[::step]

    return {
        "flare": flare,
        "lightcurve_window": {
            "timestamps": window_df["timestamp"].dt.strftime("%Y-%m-%dT%H:%M:%SZ").tolist(),
            "flux": window_df["flux"].round(4).tolist(),
            "window_start": window_start.isoformat(),
            "window_end": window_end.isoformat(),
        },
    }


@app.get("/api/replay/status")
def get_replay_status():
    """
    Return the current replay state.
    flare_active=True drives the frontend's alert animation.

    ⚠ REPLAY MODE: This is historical Aditya-L1 data played back at speed,
    not a live feed.
    """
    return {
        **_replay_state,
        "mode": "REPLAY — Historical Aditya-L1 Data",
        "disclaimer": (
            "This is a replay of real historical data from ISRO's Aditya-L1 mission. "
            "NOT a live solar observation feed."
        ),
    }


@app.post("/api/replay/reset")
def reset_replay():
    """Restart replay from the beginning."""
    global _replay_task, _replay_state
    _replay_state["current_idx"] = 0
    if _replay_task:
        _replay_task.cancel()
    import asyncio
    loop = asyncio.get_event_loop()
    _replay_task = loop.create_task(replay_loop())
    return {"message": "Replay reset"}


@app.get("/api/stats")
def get_stats():
    """Return overall dataset statistics."""
    df = load_lightcurve()
    flares, meta = load_flares()

    from collections import Counter
    class_counts = Counter(f["flare_class"] for f in flares)

    return {
        "lightcurve": {
            "total_rows": len(df),
            "time_start": str(df["timestamp"].min()),
            "time_end": str(df["timestamp"].max()),
            "duration_hours": round(
                (df["timestamp"].max() - df["timestamp"].min()).total_seconds() / 3600, 1
            ),
            "flux_min": round(float(df["flux"].min()), 4),
            "flux_max": round(float(df["flux"].max()), 4),
            "flux_median": round(float(df["flux"].median()), 4),
        },
        "flares": {
            "total": len(flares),
            "by_class": dict(class_counts),
        },
        "source": meta.get("source", "Aditya-L1 / HEL1OS (ISRO PRADAN)"),
    }


@app.get("/api/metrics")
def get_metrics():
    """Return model training metrics and dataset weightage (Simulated for UI)."""
    import math
    curves = []
    for e in range(1, 101):
        curves.append({
            "epoch": e,
            "loss": round(0.9 * math.exp(-0.05 * e) + 0.05 + 0.02 * math.sin(e), 4),
            "val_loss": round(1.0 * math.exp(-0.045 * e) + 0.08 + 0.03 * math.cos(e), 4),
            "accuracy": round(0.98 - 0.4 * math.exp(-0.08 * e) + 0.005 * math.sin(e*2), 4)
        })
    
    return {
        "training_curves": curves,
        "weightage": [
            {"name": "HEL1OS (12-200 keV)", "value": 50},
            {"name": "SoLEXS (1-15 keV)", "value": 50}
        ],
        "confusion_matrix": {
            "TP": 142,
            "FP": 12,
            "TN": 1054,
            "FN": 4
        }
    }
