# Solar Flare Detector (Solar Sentinel)

**Solar Sentinel** is an advanced, offline-first space weather analysis platform and interactive dashboard that ingests real telemetry from ISRO's **Aditya-L1** spacecraft (**HEL1OS** and **SoLEXS** instruments), executes a dual-sensor machine learning prediction engine with ground-truth NOAA GOES validation, and serves real-time solar hazard metrics through an interactive 3D dashboard.

Designed for college exhibitions and technical demonstrations, the entire system functions offline with pre-compiled mission datasets or live backend inference, eliminating dependency on external API availability during demos.

---

## 🚀 Key Architectural Features

- **Dual-Sensor ML Flare Prediction**: Utilizes XGBoost trained on uncoupled hard X-ray (**HEL1OS**, 12–200 keV) and soft X-ray (**SoLEXS**, 1–15 keV) flux profiles, leveraging early thermal pre-heating signals to forecast eruptions before impulsive particle spikes occur.
- **Precursor-Gated Ground Truth Labeling**: Intelligent target assignment that gates pre-flare labeling to active soft X-ray departures from ambient baseline noise, significantly boosting model precision and F1 score against real NOAA event catalogs.
- **Automated Pipeline & Change Detection**: Intelligent retraining workflow (`retrain.py`) that monitors raw FITS ingestion folders, computes file manifests, automatically fuses sensor overlapping dates, retrains models, and synchronizes frontend JSON static feeds without manual intervention.
- **3D Reactive Solar Dashboard**: Features a dynamic React/Vite UI complete with a responsive orbital scrubber, multi-sensor flux visualization, Recharts real-time training loss/accuracy curves, dynamic feature importance rankings, and an interactive 3D solar visualization that reacts to current solar threat levels.
- **Unified Single-Source-of-Truth Metrics**: Complete parity between backend Python mathematical evaluation (`model_metrics.json`) and frontend visual displays (`metrics.json`), guaranteeing zero simulated or hardcoded metrics.

---

## 🛰️ Physical & Mathematical Foundation

### 1. Why Dual-Sensor Input Works (SoLEXS vs. HEL1OS)
Standard flare detection algorithms frequently rely solely on high-energy hard X-ray spikes or simple sensor blending. Solar Sentinel decouples instrument channels to reflect the thermodynamic stages of a solar eruption:
- **SoLEXS (Soft X-ray Spectro-meter, 1–15 keV)**: Captures gradual coronal thermal heating and slow pre-flare plasma expansion. In our trained XGBoost models, **SoLEXS rate-of-change features account for >75% of total predictive power**, serving as our primary leading early-warning indicator.
- **HEL1OS (Hard X-ray Low Energy Payload, 12–200 keV)**: Measures impulsive particle acceleration during explosive flare climax. Acts as our verification signature for active flare onset and energy release.

### 2. Feature Engineering & Precursor Gating
To eliminate background sensitivity shifts, all flux measurements undergo scale-invariant statistical transformations over a rolling 90-minute ambient window:
- **Rolling Z-Score & Normalized Elevation ($Z, F_{norm}$)**: Measures deviation above background noise in terms of local standard deviation ($\sigma$).
- **Multi-Horizon Rate of Change ($\text{RoC}_{5m}, \text{RoC}_{15m}, \text{RoC}_{30m}$)**: Calculates velocity of thermal rise across independent time horizons.
- **Precursor Acceleration ($\text{Acc}_{15m}$)**: Second derivative of flux, isolating rapid concavity changes in soft X-ray curves.
- **Spectral Hardness Index ($\text{H/S Ratio}$)**: Direct ratio of normalized hard X-ray to soft X-ray intensity, monitoring plasma cooling/heating cycles.
- **Precursor-Gated Target Allocation**: During early-warning pre-flare windows (10–30 mins prior to eruption), positive targets ($1$) are exclusively assigned when soft X-ray gradients turn positive, shielding the classifier from false-negative penalties during quiet pre-onset minutes.

### 3. K-Sigma Threshold Detection Algorithm
Parallel to predictive ML, historical cataloging utilizes a classical signal detection model:
$$F \ge B + k \cdot \sigma \quad (k = 3.0)$$
Flares are dynamically classified by peak $\sigma$ intensity into standard space weather classes: **X-Class ($\ge 10\sigma$)**, **M-Class ($\ge 7\sigma$)**, **C-Class ($\ge 4\sigma$)**, and **B-Class ($\ge 2\sigma$)**.

---

## 🖥️ Interactive Dashboard Overview

1. **Mission Control Dashboard**: Live Solar Threat Gauge, probability monitors, NOAA GOES verification counts, and reactive 3D solar shader visualization.
2. **Detailed Analytics & Metrics**: Renders real boosting epoch loss curves, confusion matrices, and dynamic feature importance weights from `metrics.json`.
3. **Chronology & Lightcurve Scrubber**: Deep zoomable time-series inspection of raw counts vs. interpolated baseline feeds.
4. **Developer Contracts**: Comprehensive documentation of frontend JSON contracts is preserved in [`FRONTEND_FEATURES_AND_API_CONTRACTS.md`](./FRONTEND_FEATURES_AND_API_CONTRACTS.md).

---

## 🛠️ Requirements & Installation

- **Python**: 3.11 or higher
- **Node.js**: 18.0 or higher (with `npm`)
- **Git**: Configured for repository cloning and pushes

### 1. Initial Workspace Setup
```bash
# Clone repository and navigate into project directory
git clone https://github.com/mayankanand-dev/Solar-Flare-Detector.git
cd "Solar Sentinel"

# Create and activate Python Virtual Environment
python -m venv venv
venv\Scripts\activate   # On Windows
# source venv/bin/activate  # On macOS/Linux

# Install backend ML dependencies
pip install -r requirements.txt

# Install frontend React/Vite packages
cd frontend
npm install --legacy-peer-deps
cd ..
```

---

## 🔄 Automated Data Pipeline & Retraining

When new raw `.fits` telemetry files from ISRO PRADAN are placed inside `data/raw/` (or `data/raw/hel1os` / `data/raw/solexs`), execute the intelligent retraining orchestrator:

```bash
# Auto-detect file changes, run sensor fusion, train XGBoost, validate against NOAA, and sync JSONs
python pipeline/retrain.py
```

### Additional Pipeline Options:
- **`python pipeline/retrain.py --force`**: Force full pipeline rerun regardless of cache/manifest changes.
- **`python pipeline/retrain.py --watch`**: Run persistent background polling on `data/raw/`; automatically retrains as soon as new FITS archives arrive.
- **`python pipeline/retrain.py --export-only`**: Re-export existing machine learning metrics and lightcurve feeds to frontend static directories without re-running XGBoost.

Alternatively, execute the bundled OS reset utilities:
- **Windows**: `reset.bat`
- **macOS / Linux**: `./reset.sh`

---

## ▶️ Running the Live Demo

To start both the FastAPI telemetry backend (`http://localhost:8000`) and the Vite reactive developer dashboard (`http://localhost:5173`), simply run:

- **Windows**: `run.bat`
- **macOS / Linux**: `./run.sh`

The dashboard will automatically open and bind to local JSON static streams or live FastAPI endpoints!
