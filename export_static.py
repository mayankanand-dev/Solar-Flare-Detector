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
        import pandas as pd
        from pipeline.train_model import engineer_features, FEATURE_COLS

        print("  Generating calibrated static predictions with pipeline engineer_features()...")
        model = joblib.load(model_path)
        lc = pd.read_csv(lc_path)

        feat = engineer_features(lc, None, None, resample_freq="1min")
        feat_cols = [c for c in FEATURE_COLS if c in feat.columns]

        probs = model.predict_proba(feat[feat_cols].fillna(0).values)[:, 1]
        feat["flare_probability"] = probs.round(4)

        # Sample every 5 minutes (step of 5 on 1-min resampled dataframe)
        sampled = feat.iloc[::5]
        predictions = [
            {
                "timestamp": ts.isoformat() if hasattr(ts, "isoformat") else str(ts),
                "flare_probability": round(float(prob), 4),
            }
            for ts, prob in zip(sampled["timestamp"], sampled["flare_probability"])
        ]

        with open(out_path, "w") as f:
            json.dump({"predictions": predictions, "horizon_minutes": 30}, f)
        print(f"✓ Exported prediction_sample.json ({len(predictions)} predictions)")

    except Exception as e:
        print(f"⚠  Could not generate prediction_sample.json: {e}")
        with open(out_path, "w") as f:
            json.dump({"predictions": [], "error": str(e)}, f)


if __name__ == "__main__":
    main()
