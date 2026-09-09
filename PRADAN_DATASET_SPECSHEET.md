# ISRO Aditya-L1 PRADAN Portal Dataset Technical Specsheet & Directory Schema

> **Document Version:** 1.0  
> **Source Mission:** ISRO Aditya-L1 Solar Observatory  
> **Instruments Covered:** SoLEXS (Solar Low Energy X-ray Spectrometer) & HEL1OS (High Energy L1 Orbiting X-ray Spectrometer)  
> **Portal Source:** ISSDC PRADAN (Indian Space Science Data Centre) — `https://pradan.issdc.gov.in/` / `https://pradan1.issdc.gov.in/`  
> **Data Processing Level:** Level-1 (Calibrated Scientific Light Curves & Spectra)

---

## 1. Executive Summary & Download Mechanism

ISRO publishes primary scientific data products from Aditya-L1 via the **PRADAN** portal. When users select observations and click **Download Script**, PRADAN generates an authenticated, automated Python download script (e.g. `solexs_<timestamp>.py` or `hel1os_<timestamp>.py`).

### How the PRADAN Python Download Script Operates:
1. **Authentication:** Uses embedded HTTP session cookies (`JSESSIONID`, `OAuth_Token_Request_State`, `FGTServer`) obtained from the active browser session.
2. **Parallel/Resumable Chunking:**
   - Files are fetched via HTTPS `GET` requests with `Range: bytes=<offset>-` headers (`CHUNK_SIZE_MB = 8`, `MAX_RETRIES = 5`, `RETRY_WAIT_SECONDS = 30`).
   - In-progress downloads write to `.part` files (e.g., `filename.zip.part`). If interrupted, the script resumes from the exact byte offset.
3. **Directory Mirroring:**
   - The script strictly preserves the PRADAN URL endpoint structure under the local directory where the script is executed:
     `./pradan1.issdc.gov.in/al1/protected/downloadData/<instrument>/level1/...`

---

## 2. On-Disk Folder Structure (Post-Download)

Executing the PRADAN scripts produces the following exact filesystem hierarchy under the download working directory:

```text
pradan1.issdc.gov.in/
└── al1/
    └── protected/
        └── downloadData/
            │
            ├── solexs/
            │   └── level1/
            │       ├── 2024/
            │       ├── 2025/
            │       └── 2026/
            │           ├── 01/
            │           │   └── N00_0000/
            │           │       ├── AL1_SLX_L1_20260101_v1.0.zip
            │           │       ├── AL1_SLX_L1_20260102_v1.0.zip
            │           │       └── ...
            │           ├── 02/
            │           │   ├── C26_0024/          <-- Calibration / Observation ID subfolder
            │           │   ├── C26_0025/
            │           │   ├── N00_0000/          <-- Nominal Science Observation subfolder
            │           │   └── UNP_9999/          <-- Unplanned / Reprocessed run subfolder
            │           ├── ...
            │           └── 07/
            │               └── N00_0000/
            │                   ├── AL1_SLX_L1_20260701_v1.0.zip
            │                   ├── AL1_SLX_L1_20260702_v1.0.zip
            │                   └── AL1_SLX_L1_20260729_v1.0.zip
            │
            └── hel1os/
                └── level1/
                    ├── 2024/
                    ├── 2025/
                    └── 2026/
                        ├── 01/
                        ├── ...
                        └── 07/
                            ├── 01/                 <-- HEL1OS partitions by Day (DD)
                            │   └── N00_0000/
                            │       ├── HLS_20260701_000011_43178sec_lev1_V111.zip
                            │       └── HLS_20260701_120001_43199sec_lev1_V111.zip
                            ├── 02/
                            │   └── N00_0000/
                            │       ├── HLS_20260702_000005_43179sec_lev1_V111.zip
                            │       └── HLS_20260702_120000_43191sec_lev1_V111.zip
                            └── 10/
                                └── N00_0000/
                                    ├── HLS_20260710_000005_43181sec_lev1_V111.zip
                                    └── HLS_20260710_120002_43192sec_lev1_V111.zip
```

### Key Differences in Download Path Partitioning:
| Instrument | Path Depth | Cadence per Package | Package Size |
| :--- | :--- | :--- | :--- |
| **SoLEXS** | `solexs/level1/<YYYY>/<MM>/<OBS_ID>/` | **1 ZIP per UT Day** (full 24h continuous) | ~1.0 MB – 9.2 MB |
| **HEL1OS** | `hel1os/level1/<YYYY>/<MM>/<DD>/<OBS_ID>/` | **2 to 4 ZIPs per UT Day** (~12h orbit segments) | ~40 MB – 120 MB |

---

## 3. Internal Archive Packaging (Inside the ZIP Files)

Each downloaded `.zip` file contains multiple detector bundles, calibration files, and raw event tables in standard NASA/OGIP FITS formats.

### A. SoLEXS Archive Structure (`AL1_SLX_L1_<YYYYMMDD>_v1.0.zip`)

```text
AL1_SLX_L1_20260701_v1.0/
├── SDD1/                                      # Silicon Drift Detector 1 (Auxiliary/Secondary)
│   └── AL1_SOLEXS_20260701_SDD1_L1.gti.gz     # Good Time Intervals (.gti.gz)
└── SDD2/                                      # Silicon Drift Detector 2 (Primary Science Sensor)
    ├── AL1_SOLEXS_20260701_SDD2_L1.lc.gz      # Primary Light Curve (Gzipped FITS table) [~300 KB]
    ├── AL1_SOLEXS_20260701_SDD2_L1.gti.gz     # Good Time Intervals (Gzipped FITS) [~1 KB]
    └── AL1_SOLEXS_20260701_SDD2_L1.pi.gz      # Pulse Invariant / Energy Spectrum [~9.6 MB]
```

### B. HEL1OS Archive Structure (`HLS_<YYYYMMDD>_<HHMMSS>_<sec>sec_lev1_<VER>.zip`)

```text
<YYYY>/<MM>/<DD>/HLS_<YYYYMMDD>_<HHMMSS>_<duration>sec_lev1_<VER>/
├── czt/                                       # Cadmium Zinc Telluride (20–200 keV)
│   ├── lightcurve_czt1.fits                   # Primary Science Light Curve (CZT Detector 1) [~11.4 MB]
│   ├── lightcurve_czt2.fits                   # Secondary Science Light Curve (CZT Detector 2) [~11.4 MB]
│   ├── hel1os_czt_spectra_czt1.fits           # Calibrated Energy Spectrum (CZT 1) [~14.5 MB]
│   └── hel1os_czt_spectra_czt2.fits           # Calibrated Energy Spectrum (CZT 2) [~14.5 MB]
│
├── cdte/                                      # Cadmium Telluride (12–50 keV)
│   ├── lightcurve_cdte1.fits                  # Primary Science Light Curve (CdTe Detector 1) [~11.4 MB]
│   ├── lightcurve_cdte2.fits                  # Secondary Science Light Curve (CdTe Detector 2) [~11.4 MB]
│   ├── hel1os_cdte_spectra_cdte1.fits         # Calibrated Energy Spectrum (CdTe 1) [~21.6 MB]
│   └── hel1os_cdte_spectra_cdte2.fits         # Calibrated Energy Spectrum (CdTe 2) [~21.6 MB]
│
├── aux/                                       # Auxiliary Calibration & Diagnostic Data
│   ├── gticzt1.fits, gticzt2.fits             # Good Time Interval masks for CZT detectors
│   ├── gticdte1.fits, gticdte2.fits           # Good Time Interval masks for CdTe detectors
│   ├── hk.fits                                # Housekeeping telemetry (voltages, temperatures) [~2.3 MB]
│   └── cztdis/                                # Disabled / noisy pixel maps
│       ├── czt1dispix.txt
│       └── czt2dispix.txt
│
└── events/                                    # Raw Photon Event List
    └── evt.fits                               # Individual photon timestamp, energy channel, & pixel ID [~165 MB]
```

---

## 4. Instrument Physical & Science Specifications

| Parameter | SoLEXS | HEL1OS |
| :--- | :--- | :--- |
| **Full Instrument Name** | Solar Low Energy X-ray Spectrometer | High Energy L1 Orbiting X-ray Spectrometer |
| **Payload Lead Entity** | URSC / ISRO Satellite Centre | SAG / URSC / ISRO |
| **Energy Coverage** | **1.0 keV – 15.0 keV** (Soft X-ray) | **12.0 keV – 200.0 keV** (Hard X-ray) |
| **Flare Physics Sensitivity** | Thermal coronal plasma heating & precursor rise | Non-thermal impulsive flare acceleration & electron bremsstrahlung |
| **Detector Materials** | Silicon Drift Detectors (SDD) | Cadmium Zinc Telluride (CZT) & Cadmium Telluride (CdTe) |
| **Sampling Cadence** | 1.0 second nominal | 1.0 second nominal |
| **Reference Epoch** | Unix Epoch (`MJDREF = 40587.0` / `1970-01-01T00:00:00 UTC`) | Modified Julian Date (`MJD`) + ISO 8601 string (`ISOT`) |
| **Daily Data Volume** | ~4 MB – 8 MB per day (compressed) | ~150 MB – 300 MB per day (compressed) |

---

## 5. FITS Header & Binary Table HDU Architecture

### A. SoLEXS Lightcurve FITS (`*.lc.gz`)

#### HDU 0: `PRIMARY` (Header Only)
* **`EXTEND`**: `T`
* **`TELESCOP`**: `AL1`
* **`INSTRUME`**: `SoLEXS`
* **`ORIGIN`**: `SoLEXSPOC`
* **`CREATOR`**: `solexs_pipeline-1.4`
* **`OBS_DATE`**: `YYYYMMDD`
* **`OBS_ID`**: e.g., `N00_0000_000947`

#### HDU 1: `RATE` (BinTableHDU — 86,400 Rows × 2 Columns)
Conforms to NASA OGIP standard `CAL/GEN/92-007` for astronomical lightcurves.
* **`HDUCLASS`**: `OGIP`
* **`HDUCLAS1`**: `LIGHTCURVE`
* **`HDUCLAS2`**: `TOTAL`
* **`HDUCLAS3`**: `COUNTS`
* **`FILTER`**: `SDD2`
* **`TIMEDEL`**: `1.0` (Second)
* **`MJDREFI`**: `40587` (Unix epoch baseline)
* **`TIMEUNIT`**: `s`

**Column Schema:**
| Index | Name | Data Type | TFORM | Description |
| :---: | :--- | :--- | :---: | :--- |
| **1** | `TIME` | `float64` | `D` | Elapsed seconds from Unix epoch (`1970-01-01T00:00:00Z`) |
| **2** | `COUNTS` | `float64` | `D` | Count rate in counts/second (1.0 s bin integration) |

---

### B. HEL1OS Lightcurve FITS (`lightcurve_czt1.fits`)

#### HDU 0: `PRIMARY` (Header Only)
* **`TELESCOP`**: `Aditya-L1`
* **`INSTRUME`**: `HEL1OS`
* **`CREATOR`**: `HEL1OS-L1-PIPELINE`
* **`POC`**: `HEL1OS-POC`
* **`ENTITY`**: `SAG, URSC, ISRO`
* **`MJDSTART` / `MJDSTOP`**: Modified Julian Date span
* **`ISOSTART` / `ISOSTOP`**: e.g., `2026-07-10T12:00:02.261` → `2026-07-10T23:59:55.010`
* **Pointing**: `SUNRA`, `SUNDEC`, `SUNYAW`, `SUNROLL`, `SUNPITCH`, `BORESRA`, `BORESDEC`

#### Multi-HDU Energy Band Architecture:
HEL1OS lightcurves provide discrete spectral bandpass slicing across separate HDUs:
* **HDU 1:** `CZT1_LC_BAND_20.00KEV_TO_40.00KEV`
* **HDU 2:** `CZT1_LC_BAND_40.00KEV_TO_60.00KEV`
* **HDU 3:** `CZT1_LC_BAND_60.00KEV_TO_80.00KEV`
* **HDU 4:** `CZT1_LC_BAND_80.00KEV_TO_150.00KEV`
* **HDU 5:** `CZT1_LC_BAND_18.00KEV_TO_160.00KEV` *(Broadband integrated science curve)*

**Column Schema (Identical for HDU 1 through 5):**
| Index | Name | Data Type | TFORM | Unit | Description |
| :---: | :--- | :--- | :---: | :---: | :--- |
| **1** | `MJD` | `float64` | `D` | `MJD` | Modified Julian Date (UTC scale) |
| **2** | `ISOT` | `string[30]`| `30A` | `UT` | High-precision ISO timestamp (`YYYY-MM-DDTHH:MM:SS.sss`) |
| **3** | `CTR` | `float64` | `D` | `cts/sec` | Primary count rate (flux proxy) |
| **4** | `STAT_ERR` | `float64` | `D` | `cts/sec` | 1-$\sigma$ Poisson counting error ($\sqrt{N}$) |

---

## 6. Solar Sentinel Ingestion & Processing Pipeline

Within this repository, raw PRADAN datasets are ingested and transformed as follows:

```text
Raw Downloads:
  data/raw/pradan1.issdc.gov.in/al1/protected/downloadData/
                               │
               ┌───────────────┴───────────────┐
               ▼                               ▼
       SoLEXS Level-1 ZIPs             HEL1OS Level-1 ZIPs
               │                               │
               ▼                               ▼
       Extracts SDD2 .lc.gz            Extracts lightcurve_czt1.fits
       (1–15 keV Soft X-ray)           (20–200 keV Hard X-ray)
               │                               │
               └───────────────┬───────────────┘
                               ▼
                    pipeline/ingest.py
       • Parses FITS tables & timestamps (ISOT/MJD/Epoch)
       • Drops invalid/negative flux rows
       • Normalizes sampling rates to 1.0 s cadence
       • Generates per-instrument CSVs:
           - data/processed/solexs_lightcurve.csv
           - data/processed/hel1os_lightcurve.csv
       • Performs Sensor Fusion (50-50 normalized overlap blend):
           - data/processed/lightcurve.csv (76,024 continuous 1-minute frames)
                               │
                               ▼
                    pipeline/features.py
       • Computes causal rolling windows (center=False):
           - 5m, 10m, 15m, 30m, 60m rolling mean, std, peak, flux velocity
           - Energy band ratios (Hard/Soft X-ray non-thermal index)
                               │
                               ▼
                    pipeline/train_model.py
       • Trains XGBoost flare detector (predict_horizon = 30 min)
```

---

## 7. Storage Best Practices & Guidelines
1. **`.gitignore` Enforcement:**
   - Raw archives (`*.zip`) and extracted FITS files (`*.fits`, `*.gz`) should remain in `data/raw/` and are strictly excluded from git tracking due to file size limits.
2. **Exclusion of Event Lists:**
   - When extracting HEL1OS archives for flare detection lightcurves, ignore `events/evt.fits` (~165 MB per archive) and `aux/hk.fits` to preserve local storage space.
3. **Reproducibility:**
   - Rerunning `pipeline/ingest.py --input data/raw --output data/processed/lightcurve.csv` automatically traverses the PRADAN directory tree, identifies archives, and rebuilds the unified dataset without manual extraction.
