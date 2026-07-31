# Solar Sentinel — Frontend Features & ML API Contracts Guide

This comprehensive reference manual documents all existing frontend features, visual dashboards, data pipelines, and required JSON API schemas for **Solar Sentinel**. As you design and rebuild your custom ML model architecture, adhering to the data structures and interface contracts outlined below guarantees that **100% of the existing interactive frontend components will continue functioning seamlessly without modifications to the UI codebase**.

---

## 1. Architectural Overview: Static vs. Live Mode

The frontend application is built in **Vite + React + TypeScript** with **Recharts** for plotting and **Three.js / Canvas** for satellite orbital interaction. It supports two execution modes:
1. **Static / Serverless Hosting (GitHub Pages / Demo Mode)**: Consumes compiled JSON files located in `frontend/public/data/`.
2. **Live Backend Mode**: Interacts with the real-time FastAPI server (`backend/main.py`), which dynamically supplies predictions and system statuses.

To preserve compatibility across both modes, your custom ML retraining workflow should write its evaluation metrics and outputs to the static dataset path (`frontend/public/data/`) using a script similar to `export_static.py`.

---

## 2. Page-by-Page Feature Matrix & Data Consumption

### A. Main Dashboard (`frontend/src/pages/Dashboard.tsx`)
The central operations control room displaying satellite status, interactive telemetry, and live threat level assessment.
* **Key Features & Widgets**:
  * **Real-Time Flare Probability Gauge**: Displays an animated threat percentage meter indicating the likelihood of an upcoming solar event (`predProb`). Cycles through test set prediction samples every 5 seconds or reads from `/api/prediction`.
  * **Interactive 3D Orbital Scrubber (`OrbitalScrubber3D.tsx`)**: Renders Aditya-L1's orbital position and aligns telemetry against solar observation window times.
  * **Recent Detections Feed**: Lists confirmed energetic bursts with classifications (X/M/C/B/A) and direct links to inspect individual lightcurve profiles.
  * **Live Replay Monitor**: Shows sampling cadence, speed multiplier, and operational telemetry notices.
* **Consumed API Endpoints / Static Files**:
  * `getFlares()` $\rightarrow$ `flares.json`
  * `getLightcurve()` $\rightarrow$ `lightcurve.json`
  * `getPrediction()` $\rightarrow$ `prediction_sample.json` (or `/api/prediction`)
  * `getReplayStatus()` $\rightarrow$ simulated fallback or `/api/replay`

### B. Model Performance & Metrics (`frontend/src/pages/Metrics.tsx`)
A rigorous analytics dashboard evaluating training performance, feature importance distributions, and historical verification against ground-truth catalogs.
* **Key Features & Widgets**:
  * **Summary KPI Banner**: Rendered via `<MetricCard>`, reporting Overall Test Accuracy (calculated from confusion matrix), Precision, Recall, F1 Score, Predictive Look-Ahead Horizon (in minutes), and Total Training Sample Count.
  * **Training Loss & Accuracy Curves**: Renders boosting round progressions (`training_curves`) using dual-axis Recharts line charts (comparing `loss` vs `val_loss`, and `accuracy` vs `val_accuracy`).
  * **Confusion Matrix Visualization**: Graphic four-quadrant breakdown displaying True Positives (TP), False Positives (FP), True Negatives (TN), and False Negatives (FN).
  * **Feature Importance Ranking**: Renders a horizontal bar chart displaying the statistical weight/importance of each individual feature column supplied to the model (`feature_importances`).
  * **Sensor Weightage Pie Chart**: Visualizes relative blending contributions between payloads (e.g., HEL1OS 50% vs SoLEXS 50%).
  * **NOAA GOES Ground-Truth Validation Benchmarking**: Displays independent verification against official NOAA event catalogs, showing precision, recall, matched events table, and temporal deviation deltas (`validation.json`).
* **Consumed API Endpoints / Static Files**:
  * `getMetrics()` $\rightarrow$ `metrics.json` (derived from `data/processed/model_metrics.json`)
  * `getValidation()` $\rightarrow$ `validation.json`
  * `getStats()` $\rightarrow$ `stats.json`

### C. Flare Timeline Catalog (`frontend/src/pages/FlareTimeline.tsx`)
A chronological archive of all detected energetic occurrences.
* **Key Features**: Filtering by solar classification tag (X, M, C, B, A), sorting by duration or peak flux, and rendering comparative scatterplots of flare intensity vs duration.

### D. Individual Flare Deep Dive (`frontend/src/pages/FlareDetail.tsx`)
Provides zoomed-in lightcurve trajectory charts (from 1 hour prior to peak to 2 hours post-peak) and granular physical properties (background baseline flux, sigma departure ratio, duration, and energetic tagging) for any single selected event ID.

---

## 3. Required JSON Schemas & TypeScript API Contracts

When implementing your custom model architecture, ensure your training pipeline generates output JSON files conforming to the exact field names and variable types defined below.

### 1. `metrics.json` (Model Performance & Evaluation)
This file represents the primary output of your machine learning evaluation engine.
```typescript
interface MetricsData {
  // Epoch or boosting round evaluation curves (REQUIRED for Recharts loss/accuracy display)
  training_curves: Array<{
    epoch: number;        // Iteration or epoch index (e.g., 1 to 300)
    loss: number;         // Training loss (e.g., Logloss / Cross-Entropy)
    val_loss: number;     // Validation / Test loss
    accuracy: number;     // Training accuracy (0.0 to 1.0)
    val_accuracy?: number;// Validation / Test accuracy (0.0 to 1.0)
  }>;

  // Sensor contribution breakdown
  weightage: Array<{
    name: string;         // e.g., "HEL1OS (12-200 keV)" or "SoLEXS (1-15 keV)"
    value: number;        // e.g., 50
  }>;

  // Real test-set evaluation matrix (REQUIRED for Overall Accuracy calculator on UI)
  confusion_matrix: {
    TP: number;           // True Positives
    FP: number;           // False Positives
    TN: number;           // True Negatives
    FN: number;           // False Negatives
  };

  // Pre-calculated evaluation percentages (0.0 to 1.0)
  precision?: number;
  recall?: number;
  f1_score?: number;

  // Key-value mapping of feature column names to statistical importance (0.0 to 1.0)
  feature_importances?: Record<string, number>;
  // e.g., { "solexs_flux_roc": 0.321, "hel1os_hard_xray": 0.245, "zscore": 0.112 }

  // Model metadata displayed on KPI badges
  predict_horizon_minutes?: number; // e.g., 10, 15, 30
  trained_at?: string;              // ISO8601 UTC timestamp string
  n_train_samples?: number;         // Total training window count
  n_test_samples?: number;          // Total testing window count
  note?: string;                    // Status banner text (omit "STUB" to confirm real ML execution)
}
```

### 2. `prediction_sample.json` & Live `/api/prediction`
Used by the Dashboard Solar Threat Probability Gauge and real-time inference polling.
```typescript
// For prediction_sample.json (Static Cycling Mode)
interface PredictionSampleFile {
  predictions: Array<{
    timestamp: string;          // ISO8601 UTC timestamp
    flare_probability: number;  // Float between 0.0 and 1.0 (e.g., 0.852 for high threat)
  }>;
  horizon_minutes?: number;     // Early warning window in minutes
}

// For live backend inference (/api/prediction via FastAPI)
interface LivePredictionResponse {
  flare_probability: number;    // Float between 0.0 and 1.0
  predicted_class: string;      // e.g., "M-X class likely", "B-C class possible", or "quiet"
  confidence: string;           // e.g., "high", "medium", or "low"
  horizon_minutes?: number;
  note?: string;
}
```

### 3. `validation.json` (NOAA Ground-Truth Verification Report)
Displays comparative benchmarking against official space science event catalogs.
```typescript
interface ValidationData {
  detected?: number;            // Total occurrences identified by our instrument threshold
  noaa_events?: number;         // Total events cataloged by NOAA GOES in overlap timeframe
  true_positives?: number;      // Matches confirmed within tolerance window
  false_positives?: number;     // Detections unconfirmed by NOAA
  false_negatives?: number;     // NOAA events missed by our detectors
  precision?: number;           // Cross-instrument precision (0.0 to 1.0)
  recall?: number;              // Cross-instrument recall (0.0 to 1.0)
  f1_score?: number;            // Cross-instrument harmonic mean
  tolerance_minutes?: number;   // Temporal match matching allowance (e.g., 10 minutes)
  note?: string;                // Contextual explanation banner
  matches?: Array<{
    our_flare_id: number;
    our_class: string;          // e.g., "M", "C", "B"
    our_time: string;           // ISO8601 Timestamp
    noaa_class: string;         // e.g., "C3.2", "M1.1"
    noaa_time: string;
    delta_minutes: number;      // Difference in detected peak timing
  }>;
}
```

### 4. `flares.json` (Detected Events Catalog)
Consumed across the Dashboard, Timeline, and Flare Detail screens.
```typescript
interface FlaresCatalog {
  generated_at: string;         // ISO8601 Timestamp
  source: string;               // e.g., "Aditya-L1 Dual Sensor Fusion"
  flare_count: number;
  flares: Array<{
    id: number;                 // Unique sequential numeric identifier (1, 2, 3...)
    start_time: string;         // ISO8601 Timestamp
    peak_time: string;          // ISO8601 Timestamp
    end_time: string;           // ISO8601 Timestamp
    peak_flux: number;          // Maximum recorded flux value
    background_flux: number;    // Pre-flare ambient background baseline
    peak_sigma: number;         // Signal-to-noise ratio / Z-score departure
    duration_minutes: number;   // Event length in minutes
    flare_class: 'X' | 'M' | 'C' | 'B' | 'A'; // Standard solar flare magnitude classification
    instrument: string;         // e.g., "HEL1OS+SoLEXS"
    note: string;
  }>;
}
```

### 5. `stats.json` & `lightcurve.json` (Time-Series Observational Feeds)
Provides raw continuous lightcurve coordinates and global statistical summaries.
```typescript
// lightcurve.json (Downsampled to ~2,000 points for fluid UI responsiveness)
interface LightcurveData {
  timestamps: string[];         // Array of ISO8601 strings
  flux: number[];               // Array of floating point intensity readings
  n_points: number;
}

// stats.json
interface StatsData {
  lightcurve: {
    total_rows: number;
    time_start: string;
    time_end: string;
    duration_hours: number;
    flux_min: number;
    flux_max: number;
    flux_median: number;
  };
  flares: {
    total: number;
    by_class: Record<string, number>; // e.g., { "X": 0, "M": 2, "C": 15, "B": 84, "A": 45 }
  };
  source: string;
}
```

---

## 4. Best Practices for Implementing Your Custom ML Architecture

As you reconstruct the model architecture to target **80%+ accuracy, precision, and recall**, keep the following frontend integration mechanics in mind:

1. **Populating Training Curves**: Regardless of whether you build a Deep Neural Network (PyTorch / TensorFlow / LSTM) or an advanced Gradient Boosted ensemble (CatBoost / LightGBM / XGBoost), preserve per-epoch or per-iteration evaluation logs and serialize them into `metrics.training_curves`. This ensures the live visual charts on the Metrics screen continue rendering your real training progression without breaking or defaulting to empty spaces.
2. **Feature Importance Flexibility**: The frontend table natively supports **any** arbitrary string keys in `feature_importances`. You are free to invent brand new physical domain features (e.g., `solexs_acceleration`, `spectral_hardness_index`, `coronal_temperature_proxy`), and the frontend Recharts bar graph will automatically parse, sort, and render your custom feature names cleanly.
3. **Confusion Matrix Drives Overall Accuracy Display**: On the `Metrics.tsx` page, the bold primary KPI badge labeled **"Overall Accuracy"** dynamically computes its percentage using the formula:  
   $$\text{Accuracy} = \frac{\text{TP} + \text{TN}}{\text{TP} + \text{FP} + \text{TN} + \text{FN}} \times 100$$  
   Ensure your evaluation module outputs accurately calibrated values for all four quadrants (`TP`, `FP`, `TN`, `FN`) in `metrics.json`.
4. **Model Artifact Exporting**: Once your custom training module completes execution, ensure it outputs the final metrics dict to `data/processed/model_metrics.json` and runs `export_static.py` (or your equivalent sync script) to deploy the JSON artifacts directly into `frontend/public/data/` for immediate frontend consumption.
