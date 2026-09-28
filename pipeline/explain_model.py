"""
pipeline/explain_model.py — SHAP Feature Importance Analysis
=============================================================
Publication Remediation — Step 6.

Generates SHAP-based feature importance values for the trained Solar Sentinel
XGBoost model. Replaces informal "SoLEXS accounts for >75%" claim with
rigorous, publishable evidence.

Outputs:
  data/processed/shap_feature_ranking.json   — ordered SHAP importance list
  data/processed/shap_summary.png            — SHAP beeswarm plot for paper
  data/processed/shap_bar.png                — SHAP bar chart for paper

Prerequisites:
    pip install shap>=0.45.0

Usage:
    python pipeline/explain_model.py
    python pipeline/explain_model.py --max-rows 5000
"""

import argparse
import json
import logging
import sys
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)

BASE_DIR = Path(__file__).parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))
DATA_DIR = BASE_DIR / "data" / "processed"

# Colorblind-safe sensor group palette (Wong 2011)
SENSOR_COLORS = {
    "solexs":   "#009E73",  # Green  — SoLEXS (soft X-ray)
    "hel1os":   "#0072B2",  # Blue   — HEL1OS (hard X-ray)
    "cross":    "#CC79A7",  # Pink   — Cross-sensor spectral
    "ensemble": "#E69F00",  # Orange — Shared/ensemble stability
}

CROSS_SENSOR_COLS = {"h_s_ratio", "h_s_ratio_roc", "energy_partition_idx", "solexs_hel1os_surge"}


def _get_feature_group(col: str) -> str:
    if col in CROSS_SENSOR_COLS:
        return "cross"
    if "solexs" in col:
        return "solexs"
    if "hel1os" in col:
        return "hel1os"
    return "ensemble"


def run_shap_analysis(max_rows: int = 5000) -> dict:
    """
    Load trained model + holdout test probabilities, compute SHAP values,
    save plots and JSON ranking.
    """
    # 1. Load model ─────────────────────────────────────────────────────────
    model_path = DATA_DIR / "model.joblib"
    if not model_path.exists():
        log.error(f"Model not found at {model_path}. Run pipeline/train_model.py first.")
        sys.exit(1)

    pipe = joblib.load(model_path)
    scaler = pipe.named_steps["scaler"]
    xgb_model = pipe.named_steps["model"]
    log.info(f"✓ Loaded model from {model_path}")

    # 2. Load lightcurve and regenerate features ────────────────────────────
    lc_path = DATA_DIR / "lightcurve.csv"
    if not lc_path.exists():
        log.error(f"Lightcurve not found at {lc_path}. Run pipeline/ingest.py first.")
        sys.exit(1)

    from pipeline.train_model import engineer_features, generate_labels, FEATURE_COLS
    lc = pd.read_csv(lc_path)
    feat = engineer_features(lc, None, None)

    noaa_path = DATA_DIR / "noaa_events_cache.json"
    feat_labeled = generate_labels(feat, noaa_path, predict_horizon_minutes=30)
    available_cols = [c for c in FEATURE_COLS if c in feat_labeled.columns]

    # Use holdout test set rows (same SDBP split logic)
    block_size = 1440
    n_blocks = int(np.ceil(len(feat_labeled) / block_size))
    active_blocks, quiet_blocks = [], []
    for b in range(n_blocks):
        s, e = b * block_size, min((b + 1) * block_size, len(feat_labeled))
        if feat_labeled.iloc[s:e]["label"].sum() > 0:
            active_blocks.append((s, e))
        else:
            quiet_blocks.append((s, e))

    test_indices = []
    for pool in [active_blocks, quiet_blocks]:
        for i, (s, e) in enumerate(pool):
            if (i % 10) >= 7:
                test_indices.extend(range(s, e))

    test_df = feat_labeled.iloc[test_indices].sort_values("timestamp").reset_index(drop=True)
    X_test = test_df[available_cols].fillna(0).values
    y_test = test_df["label"].values
    X_test_s = scaler.transform(X_test)

    # Subsample for SHAP (kernel explainer can be slow on large sets)
    if len(X_test_s) > max_rows:
        idx = np.random.choice(len(X_test_s), max_rows, replace=False)
        idx.sort()
        X_shap = X_test_s[idx]
        log.info(f"  Subsampled {max_rows} rows for SHAP (from {len(X_test_s)} test rows)")
    else:
        X_shap = X_test_s
        log.info(f"  Using all {len(X_test_s)} test rows for SHAP")

    # 3. Compute SHAP values ─────────────────────────────────────────────────
    try:
        import shap
    except ImportError:
        log.error("shap not installed. Run: .\\venv\\Scripts\\pip install shap>=0.45.0")
        sys.exit(1)

    log.info("Computing SHAP values (TreeExplainer)...")
    explainer = shap.TreeExplainer(xgb_model)
    shap_values = explainer.shap_values(X_shap)
    log.info("✓ SHAP values computed")

    # 4. Compute mean absolute SHAP importance ──────────────────────────────
    mean_abs_shap = np.abs(shap_values).mean(axis=0)
    total = mean_abs_shap.sum()
    relative_shap = mean_abs_shap / total if total > 0 else mean_abs_shap

    # Sort by importance
    sort_idx = np.argsort(relative_shap)[::-1]
    ranked = []
    for i, idx in enumerate(sort_idx):
        col = available_cols[idx]
        group = _get_feature_group(col)
        ranked.append({
            "rank": i + 1,
            "feature": col,
            "group": group,
            "mean_abs_shap": round(float(mean_abs_shap[idx]), 6),
            "relative_importance": round(float(relative_shap[idx]), 6),
        })

    # 5. Group-level contribution summary ───────────────────────────────────
    group_summary = {}
    for r in ranked:
        g = r["group"]
        group_summary[g] = group_summary.get(g, 0.0) + r["relative_importance"]
    group_summary = {k: round(v, 4) for k, v in sorted(group_summary.items(), key=lambda x: -x[1])}

    log.info("SHAP Feature Importance (Top 10):")
    for r in ranked[:10]:
        log.info(f"  #{r['rank']:2d} [{r['group']:8s}] {r['feature']:<35s} {r['relative_importance']:.3f}")
    log.info(f"Group contributions: {group_summary}")

    # 6. Save JSON ───────────────────────────────────────────────────────────
    result = {
        "computed_at": pd.Timestamp.now(tz="UTC").isoformat(),
        "n_samples_shap": len(X_shap),
        "n_features": len(available_cols),
        "feature_ranking": ranked,
        "group_contributions": group_summary,
        "note": (
            "Mean absolute SHAP values on SDBP holdout test set. "
            "Groups: solexs=SoLEXS soft X-ray, hel1os=HEL1OS hard X-ray, "
            "cross=cross-sensor spectral features, ensemble=shared stability features."
        ),
    }

    ranking_path = DATA_DIR / "shap_feature_ranking.json"
    with open(ranking_path, "w") as f:
        json.dump(result, f, indent=2)
    log.info(f"✓ SHAP ranking saved → {ranking_path}")

    # 7. Generate plots ──────────────────────────────────────────────────────
    try:
        import matplotlib
        matplotlib.rcParams.update({
            "font.family": "serif",
            "font.serif": ["Times New Roman", "DejaVu Serif"],
            "font.size": 9,
            "axes.spines.top": False,
            "axes.spines.right": False,
            "figure.dpi": 200,
        })
        import matplotlib.pyplot as plt
        import matplotlib.patches as mpatches

        # 7a. SHAP Bar Chart (for paper)
        features_sorted = [r["feature"] for r in ranked]
        importances_sorted = [r["relative_importance"] for r in ranked]
        groups_sorted = [r["group"] for r in ranked]
        colors_sorted = [SENSOR_COLORS[g] for g in groups_sorted]

        fig, ax = plt.subplots(figsize=(7.5, 6.5))
        ax.barh(
            features_sorted[::-1],
            importances_sorted[::-1],
            color=colors_sorted[::-1],
            alpha=0.85, edgecolor="white", linewidth=0.4,
        )
        ax.set_xlabel("Relative SHAP Importance (mean |SHAP|)", labelpad=8)
        ax.set_title(
            "Feature Importance by Mean Absolute SHAP Value\n"
            "Solar Sentinel — Dual-Sensor Aditya-L1 Model (SDBP Holdout Set)",
            pad=10, fontweight="semibold",
        )
        legend_handles = [
            mpatches.Patch(color=SENSOR_COLORS["solexs"],   label="SoLEXS — Soft X-ray (1–15 keV)"),
            mpatches.Patch(color=SENSOR_COLORS["hel1os"],   label="HEL1OS — Hard X-ray (12–200 keV)"),
            mpatches.Patch(color=SENSOR_COLORS["cross"],    label="Cross-Sensor Spectral"),
            mpatches.Patch(color=SENSOR_COLORS["ensemble"], label="Ensemble / Stability"),
        ]
        ax.legend(handles=legend_handles, loc="lower right", fontsize=8, framealpha=0.9)
        ax.xaxis.grid(True, linestyle="--", color="grey", alpha=0.4)
        ax.set_axisbelow(True)
        ax.tick_params(axis="y", labelsize=7.5)

        bar_path = DATA_DIR / "shap_bar.png"
        plt.tight_layout(pad=1.5)
        plt.savefig(bar_path, bbox_inches="tight", dpi=200)
        plt.close()
        log.info(f"✓ SHAP bar chart saved → {bar_path}")

        # 7b. SHAP Beeswarm / Summary Plot
        fig2, ax2 = plt.subplots(figsize=(7.5, 6.5))
        plt.sca(ax2)
        shap.summary_plot(
            shap_values, X_shap,
            feature_names=available_cols,
            show=False, plot_size=None,
            color_bar_label="Feature Value (scaled)",
        )
        ax2.set_title(
            "SHAP Summary Plot (Beeswarm)\nSolar Sentinel — Holdout Test Set",
            pad=10, fontweight="semibold",
        )
        summary_path = DATA_DIR / "shap_summary.png"
        plt.tight_layout(pad=1.5)
        plt.savefig(summary_path, bbox_inches="tight", dpi=200)
        plt.close()
        log.info(f"✓ SHAP summary plot saved → {summary_path}")

    except Exception as e:
        log.warning(f"Plot generation failed (non-fatal): {e}")

    return result


def main():
    parser = argparse.ArgumentParser(
        description="Solar Sentinel — SHAP feature importance analysis (Step 6)"
    )
    parser.add_argument("--max-rows", type=int, default=5000,
                        help="Max test rows to use for SHAP computation (default: 5000)")
    args = parser.parse_args()

    result = run_shap_analysis(max_rows=args.max_rows)

    log.info("\n" + "=" * 60)
    log.info("SHAP ANALYSIS COMPLETE")
    log.info(f"  Top feature:       {result['feature_ranking'][0]['feature']}")
    log.info(f"  Group breakdown:   {result['group_contributions']}")
    log.info("=" * 60)


if __name__ == "__main__":
    main()
