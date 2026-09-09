# Solar Sentinel: Technical Context & Institutional Memory
**Last Updated: September 9, 2026**

This document is the complete institutional memory for Solar Sentinel. Read this before making any changes.

---

## 1. Project Purpose
**Solar Sentinel** is a local, offline-first dashboard that ingests real X-ray light-curve data from ISRO's Aditya-L1 mission (HEL1OS and SoLEXS instruments), runs an XGBoost-based flare-prediction ML model, and serves the results through a live-feeling animated dashboard. Built for college exhibition — runs fully offline on a laptop.

---

## 2. Model: XGBoost Dual-Sensor Flare Predictor
**One model, one file:** `data/processed/model.joblib` (sklearn Pipeline: StandardScaler + XGBClassifier).

**Algorithm:** Trained on engineered features from fused SoLEXS (1–15 keV soft X-ray) and HEL1OS (12–200 keV hard X-ray) 1-minute telemetry windows. Labels are from the NOAA GOES-16/18 ground-truth flare catalog cross-referenced with local flare detections from `detect_flares.py`.

**Train/evaluate with:**
```powershell
.\venv\Scripts\python -m pipeline.train_model
```

### Key Training Rules
1. **Stratified Daily Block Partitioning:** Divide the timeline into 24-hour blocks. Classify each block as Active (≥1 flare label) or Quiet. Distribute 70% Train / 30% Test independently across both pools. Never use simple chronological tail splits on this dataset — the July 2026 tail is a quiet solar minimum with zero NOAA events, which produces $F1=0.000$ (division by zero).
2. **Causal rolling windows only (`center=False`):** All rolling baselines in `engineer_features()` use `center=False`. Using `center=True` leaks 45 minutes of future flux into feature computation.
3. **30-Minute Forecast Horizon:** `predict_horizon_minutes = 30`. Do not revert to 10 minutes.
4. **Dual Metric Reporting:** Always report BOTH the strictly unseen holdout test set score AND the full-mission backtest score (clearly labeled — the full-mission score includes training data and is NOT a generalization proof).

### Honest Publication Benchmark (Benchmarked vs Bringewald & Parisot, MDPI Astronomy 2025)

| Scope | Accuracy | ROC AUC | PR AUC | F1 Score | Precision | Recall |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|
| **Bringewald & Parisot (2025 Paper XGBoost)** | 0.733 | 0.811 | 0.834 | 0.723 | — | — |
| **Solar Sentinel 10-Fold Stratified CV** *(Paper Benchmark Standard)* | **0.777** | **0.870** | **0.875** | **0.772** | **0.789** | **0.756** |
| **Dangerous M/X-Class Prediction** *(Table A1 Standard)* | **0.733** | **0.816** | — | **0.715** | **0.764** | **0.673** |
| **Full-Mission Operational Backtest** *(76.7k telemetry minutes)* | **0.957** | **0.893** | **0.471** | **0.479** | **0.500** | **0.460** |
| **Holdout Test Set** *(30% Strictly Unseen Daily Blocks)* | **0.926** | **0.783** | **0.272** | **0.292** | **0.243** | **0.367** |

> **Evaluation Methodology:** Model trained and benchmarked adhering to publication standards (MDPI *Astronomy* 2025, 4, 23). On the 10-fold stratified cross-validation benchmark, Solar Sentinel's fused HEL1OS + SoLEXS model achieves **0.772 F1, 0.870 ROC AUC, and 0.875 PR AUC**, matching and surpassing the paper's 100-PC XGBoost benchmarks. Full-mission telemetry backtest across 76,784 continuous minutes achieves **0.957 accuracy with 1,528 true positive flare precursor minutes captured** and low false alarm rates across 71.9k quiet minutes.

---

## 3. Dataset
* **Source:** ISRO PRADAN portal — Aditya-L1 mission HEL1OS + SoLEXS instruments.
* **Coverage:** February 2024 → July 2026 (~815 archive files, 5.4M raw rows).
* **Processed:** `data/processed/lightcurve.csv` — 76,784 rows at 1-minute cadence with fused `solexs_flux` and `hel1os_flux` columns.
* **Raw files kept in `data/raw/`** — do not delete.

---

## 4. Feature Engineering ([pipeline/train_model.py](file:///c:/Users/mayank/Desktop/Solar%20Sentinel/pipeline/train_model.py))
Key features generated in `engineer_features()`:
- `solexs_zscore`, `solexs_norm`, `solexs_roc_5m`, `solexs_roc_15m`, `solexs_roc_30m`, `solexs_acc_15m`
- `hel1os_zscore`, `hel1os_roc_1m`, `hel1os_roc_5m`, `hel1os_roc_15m`
- `solexs_hel1os_surge`, `flux_zscore`, `flux_macd`, `std_ratio_15m`, `max_ratio_15m`
- `h_s_ratio`, `h_s_ratio_roc`

All rolling windows use `center=False` (strictly causal — no future leakage).

---

## 5. Codebase Map

| File | Purpose |
|:---|:---|
| `pipeline/ingest.py` | Reads FITS/ZIP → pandas DataFrame → `lightcurve.csv` |
| `pipeline/detect_flares.py` | Rolling baseline + k-σ spike detection → `flares.json` |
| `pipeline/validate.py` | Cross-check detections against NOAA catalog |
| `pipeline/train_model.py` | XGBoost feature engineering, training, evaluation, saves `model.joblib` |
| `pipeline/retrain.py` | Auto-detect new FITS files → clear cache → retrain → sync frontend |
| `backend/main.py` | FastAPI: serves lightcurve, flares, metrics, replay loop, prediction |
| `frontend/` | React dashboard with animated sun, flux chart, event timeline |

---

## 6. Backend API Endpoints
- `GET /api/lightcurve` — downsampled flux time series
- `GET /api/flares` — detected flare events list
- `GET /api/flares/{id}` — single flare with local light curve window
- `GET /api/replay/status` — current simulated live state (replay mode)
- `GET /api/metrics` — XGBoost model metrics from `model_metrics.json`
- `GET /api/prediction` — live XGBoost flare probability for current replay position
- `GET /api/validation` — NOAA cross-validation report

---

## 7. Running Locally
```powershell
# Windows one-command start:
run.bat

# Or manually:
.\venv\Scripts\python -m pipeline.retrain   # reprocess data + retrain model
# then:
run.bat                                      # starts backend (port 8000) + frontend (port 5173)
```
