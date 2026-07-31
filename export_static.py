"""
export_static.py — Export backend data to static files for Vercel / offline demo.
Loads model_metrics.json directly (real ML metrics) instead of calling
the backend's get_metrics() which previously generated fake math curves.
"""
import json
import os
import sys
from pathlib import Path

BASE_DIR = Path(__file__).parent
PROC_DIR = BASE_DIR / "data" / "processed"
OUT_DIR  = BASE_DIR / "frontend" / "public" / "data"

# Add project root to path so we can import backend
sys.path.insert(0, str(BASE_DIR))


def main():
    print("=" * 60)
    print("Solar Sentinel — Exporting backend data to static files")
    print("=" * 60)
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    from backend.main import get_flares, get_lightcurve, get_stats, get_validation

    # ── Flares ────────────────────────────────────────────────────────────────
    flares_data = get_flares()
    with open(OUT_DIR / "flares.json", "w") as f:
        json.dump(flares_data, f)
    print(f"✓ Exported flares.json ({len(flares_data.get('flares', []))} flares)")

    # ── Stats ─────────────────────────────────────────────────────────────────
    stats_data = get_stats()
    with open(OUT_DIR / "stats.json", "w") as f:
        json.dump(stats_data, f)
    print("✓ Exported stats.json")

    # ── Metrics (REAL — from model_metrics.json, not generated math) ──────────
    metrics_path = PROC_DIR / "model_metrics.json"
    if metrics_path.exists():
        with open(metrics_path) as f:
            metrics_data = json.load(f)
        source = "real ML metrics"
    else:
        print("⚠  model_metrics.json not found — using stub.")
        print("   Run: python pipeline/retrain.py  to generate real metrics.")
        import math
        curves = []
        for e in range(1, 51):
            curves.append({
                "epoch": e,
                "loss":         round(0.9 * math.exp(-0.06 * e) + 0.05, 4),
                "val_loss":     round(1.0 * math.exp(-0.05 * e) + 0.08, 4),
                "accuracy":     round(0.98 - 0.4 * math.exp(-0.08 * e), 4),
                "val_accuracy": round(0.95 - 0.4 * math.exp(-0.08 * e), 4),
            })
        metrics_data = {
            "training_curves": curves,
            "weightage": [
                {"name": "HEL1OS (12-200 keV)", "value": 50},
                {"name": "SoLEXS (1-15 keV)",   "value": 50},
            ],
            "confusion_matrix": {"TP": 0, "FP": 0, "TN": 0, "FN": 0},
            "precision": 0.0, "recall": 0.0, "f1_score": 0.0,
            "feature_importances": {},
            "note": "STUB — run python pipeline/retrain.py to get real ML metrics",
        }
        source = "stub (no model trained yet)"

    with open(OUT_DIR / "metrics.json", "w") as f:
        json.dump(metrics_data, f)
    print(f"✓ Exported metrics.json ({source})")

    # ── Validation (REAL — from validation_report.json) ───────────────────────
    validation_data = get_validation()
    with open(OUT_DIR / "validation.json", "w") as f:
        json.dump(validation_data, f)
    print(f"✓ Exported validation.json")

    # ── Lightcurve (downsampled) ──────────────────────────────────────────────
    resp = get_lightcurve(downsample=2000, range=None, start=None, end=None)
    with open(OUT_DIR / "lightcurve.json", "w") as f:
        json.dump(resp, f)
    print(f"✓ Exported lightcurve.json ({resp.get('n_points', 0)} points)")

    # ── Prediction sample (static offline predictions) ────────────────────────
    pred_sample_path = OUT_DIR / "prediction_sample.json"
    _export_prediction_sample(pred_sample_path)

    print("=" * 60)
    print("✓ All static files exported to frontend/public/data/")
    print("=" * 60)


def _export_prediction_sample(out_path: Path):
    """
    Pre-compute predictions at key timepoints from the lightcurve
    for the offline static demo (no backend required).
    """
    model_path = PROC_DIR / "model.joblib"
    metrics_path = PROC_DIR / "model_metrics.json"
    lc_path = PROC_DIR / "lightcurve.csv"

    if not model_path.exists() or not metrics_path.exists() or not lc_path.exists():
        # Write a minimal stub
        with open(out_path, "w") as f:
            json.dump({"predictions": [], "note": "Run pipeline/retrain.py to generate predictions"}, f)
        return

    try:
        import joblib
        import numpy as np
        import pandas as pd

        model = joblib.load(model_path)
        with open(metrics_path) as f:
            metrics = json.load(f)
        feature_cols = metrics.get("feature_cols", [])

        lc = pd.read_csv(lc_path)
        lc["timestamp"] = pd.to_datetime(lc["timestamp"], format="ISO8601", utc=True)
        lc = lc.sort_values("timestamp").reset_index(drop=True)

        # Sample every 5 minutes through the dataset (using a 30-min rolling window for feature computation)
        predictions = []
        window_size = 30 * 60  # 30 min in seconds (at 1-second cadence)
        step_size = 5 * 60     # 5 min sampling interval for high-resolution scrubbing

        for i in range(window_size, len(lc), step_size):
            window = lc.iloc[max(0, i - window_size):i]
            flux = window["flux"].values.astype(float)

            if len(flux) < 5:
                continue

            window_15 = flux[-15*60:] if len(flux) >= 15*60 else flux
            window_90 = flux
            med_90 = float(np.median(window_90)) if len(window_90) > 0 else float(flux[-1])
            std_90 = float(np.std(window_90)) + 1e-6

            val_curr = float(flux[-1])
            val_5m   = float(flux[-min(len(flux), 300)])
            val_15m  = float(flux[-min(len(flux), 900)])

            s_flux = window["solexs_flux"].values.astype(float) if "solexs_flux" in window.columns else flux
            h_flux = window["hel1os_flux"].values.astype(float) if "hel1os_flux" in window.columns else flux

            val_curr_s, val_5m_s, val_15m_s, val_30m_s = s_flux[-1], s_flux[-min(len(s_flux), 300)], s_flux[-min(len(s_flux), 900)], s_flux[-min(len(s_flux), 1800)]
            val_curr_h, val_5m_h = h_flux[-1], h_flux[-min(len(h_flux), 300)]
            med_90_s, std_90_s = float(np.median(s_flux)), float(np.std(s_flux)) + 1e-6
            med_90_h, std_90_h = float(np.median(h_flux)), float(np.std(h_flux)) + 1e-6

            row = {
                "solexs_zscore":  (val_curr_s - med_90_s) / std_90_s,
                "solexs_norm":    (val_curr_s - med_90_s) / (abs(med_90_s) + 1e-6),
                "solexs_roc_5m":  (val_curr_s - val_5m_s) / (abs(val_5m_s) + 1e-6),
                "solexs_roc_15m": (val_curr_s - val_15m_s) / (abs(val_15m_s) + 1e-6),
                "solexs_roc_30m": (val_curr_s - val_30m_s) / (abs(val_30m_s) + 1e-6),
                "solexs_acc_15m": ((val_curr_s - val_15m_s) / (abs(val_15m_s) + 1e-6)) - ((val_5m_s - val_15m_s) / (abs(val_15m_s) + 1e-6)),
                "hel1os_zscore":  (val_curr_h - med_90_h) / std_90_h,
                "hel1os_roc_5m":  (val_curr_h - val_5m_h) / (abs(val_5m_h) + 1e-6),
                "flux_zscore":    (val_curr - med_90) / std_90,
                "std_ratio_15m":  float(np.std(window_15)) / std_90,
                "max_ratio_15m":  (float(np.max(window_15)) - med_90) / std_90,
                "h_s_ratio":      float(val_curr_h / (val_curr_s + 1e-6)),
                "h_s_ratio_roc":  0.0,
            }
            X = np.array([[row.get(c, 0.0) for c in feature_cols]])
            prob = float(model.predict_proba(X)[0][1])
            predictions.append({
                "timestamp": lc.iloc[i]["timestamp"].isoformat(),
                "flare_probability": round(prob, 3),
            })

        with open(out_path, "w") as f:
            json.dump({"predictions": predictions, "horizon_minutes": 30}, f)
        print(f"✓ Exported prediction_sample.json ({len(predictions)} predictions)")

    except Exception as e:
        print(f"⚠  Could not generate prediction_sample.json: {e}")
        with open(out_path, "w") as f:
            json.dump({"predictions": [], "error": str(e)}, f)


if __name__ == "__main__":
    main()
