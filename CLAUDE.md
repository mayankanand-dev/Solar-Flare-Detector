# CLAUDE.md — Solar Flare Detector: Aditya-L1 Solar Flare Detector

This file is instructions for an AI coding agent (Claude Code, Antigravity, etc.) building this project end-to-end. Follow the phases **in order**. Do not skip the verification checks — each phase has a "Definition of Done" that must pass before moving to the next phase. Work in small, testable commits.

---

## 0. Project Summary

Build **Solar Flare Detector**: a system that ingests real X-ray light-curve data from ISRO's Aditya-L1 mission (SoLEXS instrument), runs a flare-detection algorithm on it, and serves the results through a local website with a live-feeling animated dashboard. This is for a college exhibition — it must run **fully offline on a laptop** (no dependency on live internet or cloud hosting during the demo).

**Non-negotiables:**
- Use **real Aditya-L1 data**, not synthetic/fake data, for the final build. Synthetic data is allowed only for early scaffolding/testing, and must be clearly marked and removed before final delivery.
- The whole stack must run locally with one simple start command (e.g. `./run.sh` or `npm run dev` + `python api.py`). No required internet connection at demo time.
- Every phase ends with a working, demoable state — never leave the app in a broken intermediate state between phases.
- Prefer simple, explainable methods over black-box ones. A judge/visitor should be able to understand the flare-detection logic when it's explained in under a minute.

---

## 1. Repository Structure

Create this structure at project init:

```
solar-flare-detector/
├── CLAUDE.md                  (this file)
├── README.md                  (setup + run instructions for humans)
├── data/
│   ├── raw/                   (downloaded FITS files go here, gitignored)
│   └── processed/             (cleaned CSV/JSON light curves + detected flares)
├── pipeline/
│   ├── ingest.py               (reads FITS -> pandas DataFrame)
│   ├── detect_flares.py        (baseline + spike detection + classification)
│   ├── validate.py             (cross-check against NOAA/GOES event list)
│   └── tests/
├── backend/
│   ├── main.py                 (FastAPI app)
│   ├── routes/
│   └── tests/
├── frontend/
│   ├── src/
│   └── (React app, or plain HTML/CSS/JS — agent chooses based on stack decision in Phase 1)
├── run.sh                       (one-command local startup)
└── .gitignore
```

---

## 2. Phase-by-Phase Build Plan

### Phase 1 — Project Scaffolding & Stack Decision
**Tasks:**
1. Confirm/choose stack: Python (FastAPI) backend, frontend in plain HTML/CSS/JS with Plotly.js (default choice — simpler to run offline, no build step required at a booth). Only use React if the user explicitly asks for it.
2. Create the repo structure above.
3. Set up Python virtual environment with `astropy`, `numpy`, `pandas`, `scipy`, `fastapi`, `uvicorn`.
4. Write `.gitignore` (exclude `data/raw/`, `venv/`, `node_modules/`, `__pycache__/`).
5. Write a stub `README.md` with setup steps (fill in fully at the end).

**Definition of Done:**
- [ ] `pip install -r requirements.txt` succeeds cleanly in a fresh venv.
- [ ] Folder structure matches Section 1.
- [ ] `git status` shows no `data/raw`, `venv`, or `node_modules` tracked.

---

### Phase 2 — Data Acquisition
**Tasks:**
1. Document in `README.md` how to get real SoLEXS light-curve FITS data from ISRO's PRADAN portal (https://pradan.issdc.gov.in/) — registration required, so this is a manual human step, not something the agent can automate. Prompt the user to place downloaded FITS files into `data/raw/`.
2. While waiting on real data access, use a small public sample SoLEXS FITS dataset for scaffolding ONLY (clearly log/comment that this is placeholder data, e.g. in `data/raw/README_SAMPLE_DATA.md`), so the rest of the pipeline can be built and tested immediately.
3. Write `pipeline/ingest.py`:
   - Reads a FITS file using `astropy.io.fits`.
   - Extracts timestamp column and flux column into a clean `pandas.DataFrame` with columns `[timestamp, flux]`.
   - Handles multiple FITS files (multiple days) and concatenates them into one time-sorted DataFrame.
   - Saves result to `data/processed/lightcurve.csv`.
4. Add a CLI: `python pipeline/ingest.py --input data/raw --output data/processed/lightcurve.csv`.

**Definition of Done:**
- [ ] Running the ingest script on sample FITS files in `data/raw/` produces a valid `lightcurve.csv` with no NaN timestamps and monotonically increasing time.
- [ ] Script prints row count and time range covered (sanity check output).
- [ ] Unit test in `pipeline/tests/test_ingest.py` covering: valid FITS parses correctly; malformed/corrupt file raises a clear error instead of crashing silently.

---

### Phase 3 — Flare Detection Algorithm
**Tasks:**
1. Write `pipeline/detect_flares.py` implementing:
   - **Rolling baseline**: rolling median (e.g. window ~60–120 min, tune based on data cadence) representing the Sun's "quiet" background flux.
   - **Spike detection**: flag a candidate flare start when flux exceeds baseline by more than `k` standard deviations (start with `k=3`, make it a tunable parameter) for at least `n` consecutive samples (reject 1-sample noise spikes).
   - **Peak & decay tracking**: once a flare starts, track until flux decays back within some tolerance of baseline; record `start_time`, `peak_time`, `end_time`, `peak_flux`, `duration`.
   - **Classification**: bucket `peak_flux` into A/B/C/M/X classes using the standard GOES-style flux thresholds (document the exact thresholds used in code comments, since Aditya-L1's energy band differs from GOES — note this as an approximation, not a direct equivalence).
   - Output: `data/processed/flares.json`, a list of flare event objects.
2. Make all thresholds (`k`, min duration, decay tolerance) configurable via a config dict or CLI args, not hardcoded magic numbers.

**Definition of Done:**
- [ ] Running on `lightcurve.csv` produces `flares.json` with at least one detected event on the sample dataset (or a clear log message if genuinely zero flares in that window — don't silently produce an empty file without explanation).
- [ ] Unit tests in `pipeline/tests/test_detect_flares.py`: a synthetic light curve with a known injected spike is correctly detected; a flat/noisy light curve with no real spike produces zero false positives.
- [ ] Print a human-readable summary table (flare count by class) after running.

---

### Phase 4 — Validation Against Ground Truth
**Tasks:**
1. Write `pipeline/validate.py` that fetches or uses a locally-saved copy of the public NOAA/GOES X-ray flare event list for the same date range as your data.
2. Compare your detected flares' start times against NOAA's recorded flare times (allow a tolerance window, e.g. ±10 min) and compute: how many of your detections match a real recorded flare (true positives), how many don't (false positives), and how many real flares you missed (false negatives).
3. Print a simple precision/recall-style summary. This is for your own confidence and for judges' questions — doesn't need to be perfect, just honestly reported.

**Definition of Done:**
- [ ] `validate.py` runs and prints match/miss counts against at least one day of known flare activity.
- [ ] Results (even if imperfect) are logged to `data/processed/validation_report.txt` — do not hide or discard poor results, report them honestly so the user can decide whether to tune thresholds.

---

### Phase 5 — Backend API
**Tasks:**
1. Build `backend/main.py` (FastAPI) with endpoints:
   - `GET /api/lightcurve?range=...` → returns flux time series (for chart plotting), paginated/downsampled if large.
   - `GET /api/flares` → returns list of detected flare events from `flares.json`.
   - `GET /api/flares/{id}` → returns single flare detail including its local light-curve window.
   - `GET /api/replay/status` → returns current simulated "live" timestamp and flux value (see Phase 6 replay logic).
2. Enable CORS for local frontend dev.
3. Add basic input validation and clear error responses (404 for missing flare id, etc.) — no unhandled 500s.

**Definition of Done:**
- [ ] `uvicorn backend.main:app --reload` starts cleanly.
- [ ] All four endpoints tested manually (curl or FastAPI's `/docs` Swagger UI) and return correct JSON shapes.
- [ ] Backend tests in `backend/tests/` cover at least one success and one error case per endpoint.

---

### Phase 6 — "Replay Mode" (Live Demo Simulation)
**Tasks:**
1. Since Aditya-L1 has no public live-streaming feed, implement a replay simulator: a background task that steps through the historical `lightcurve.csv` at accelerated speed (e.g. configurable multiplier — default: 1 real day compressed into ~2–3 minutes) and updates an in-memory "current time / current flux" state that `/api/replay/status` exposes.
2. When the replay pointer crosses a timestamp range matching a detected flare, mark replay status as `"flare_active": true` with the flare's class — this drives the frontend's alert animation.
3. Clearly label this in the UI (Phase 7) as "Replay Mode — Historical Aditya-L1 Data" so it's never mistaken for a real live feed. This is an honesty requirement, not optional polish.

**Definition of Done:**
- [ ] Replay advances automatically once backend starts, with no manual triggering needed.
- [ ] `/api/replay/status` correctly flags `flare_active` during the time windows recorded in `flares.json`.
- [ ] Replay speed is configurable via an env var or config value.

---

### Phase 7 — Frontend Dashboard
**Tasks:**
1. Landing/Dashboard page:
   - Animated Sun graphic (CSS/SVG) that visibly changes state (glow/pulse/color) when `flare_active` is true, reading from `/api/replay/status` on a short poll interval (e.g. every 1–2s).
   - Scrolling flux line chart (Plotly.js or Chart.js) showing the replay window.
   - Status badge: "Sun is Quiet" vs "⚠ Flare in Progress — [class]".
2. Flare Timeline page: list/timeline of all entries from `/api/flares`, color-coded by class, clickable to a detail view showing that flare's light curve, peak flux, duration.
3. "How It Works" page: simple step diagram (Sun → Aditya-L1 at L1 → SoLEXS → detection algorithm → website). Keep it visual, minimal text.
4. "About Aditya-L1" page: short factual mission summary.
5. Responsive enough to look good on a laptop screen and a tablet (exhibitions often use both).

**Definition of Done:**
- [ ] All four pages/sections render correctly with real backend data (not mocked).
- [ ] Sun animation visibly reacts within ~2s of a flare becoming active in replay mode.
- [ ] No console errors in browser dev tools.
- [ ] Manually click through every flare in the timeline at least once — no broken detail views.

---

### Phase 8 — Local-First Packaging for Exhibition Day
**Tasks:**
1. Write `run.sh` (and a Windows-friendly equivalent if needed) that starts backend + frontend with one command, printing the local URL to open (e.g. `http://localhost:8000`).
2. Confirm the whole app works with **WiFi/internet fully disabled** — this is a hard requirement, test it explicitly.
3. Finalize `README.md` with: setup steps, how to swap in new PRADAN data, how to adjust replay speed, and a troubleshooting section.
4. Add a `--reset` or `make clean` style option to clear processed data and re-run the full pipeline from raw FITS files if the user updates their dataset.

**Definition of Done:**
- [ ] Fresh machine (or fresh clone) can go from `git clone` → `./run.sh` → working dashboard in under 10 commands total, per README instructions.
- [ ] App confirmed working with network disabled.
- [ ] Full pipeline (`ingest.py` → `detect_flares.py` → `validate.py` → backend → frontend) can be re-run end-to-end with a single documented sequence of commands.

---

## 3. Cross-Cutting Rules (apply to every phase)

- **Never fabricate data.** If real Aditya-L1 data isn't available yet, use clearly-labeled placeholder/sample data and say so out loud in logs, comments, and the README — don't let it silently look like real mission data.
- **Fail loud, not silent.** Parsing errors, empty datasets, and threshold edge cases should raise clear errors or log warnings, not fail silently and produce empty/misleading output.
- **Keep thresholds configurable**, not hardcoded, so the user can tune sensitivity without touching core logic.
- **Test before moving to the next phase.** Each phase's Definition of Done must be checked off before starting the next phase.
- **Keep the demo offline-safe** at every phase — don't introduce a hard dependency on a live external API for anything that runs during the exhibition itself.

---

## 4. Open Questions to Confirm With the User Before Starting

- Do they already have PRADAN portal access / downloaded FITS files, or are they starting from zero?
- Preferred frontend approach: plain HTML/JS (simplest, most offline-robust) or React (if they're more comfortable there)?
- Do they want HEL1OS data included as a stretch goal (Phase 9, optional), or SoLEXS-only for the exhibition deadline?
