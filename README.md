# Solar Flare Detector

**Solar Flare Detector** is a local, offline-first dashboard that ingests real X-ray light-curve data from ISRO's Aditya-L1 mission (HEL1OS and SoLEXS instruments), runs a custom flare-detection algorithm, and serves the results through a live-feeling animated dashboard.

Designed for college exhibitions, the entire system runs locally on your machine without requiring a live internet connection during the demo.

## Features

- **Real Mission Data**: Processes FITS lightcurve files from the Aditya-L1 mission.
- **Offline Flare Detection**: Custom algorithm (rolling baseline + k-σ spike detection) to detect solar flares.
- **Replay Mode**: Simulates a live feed by replaying historical data at accelerated speeds.
- **Interactive Dashboard**: Features an animated sun that reacts to flare classes, a scrolling flux chart, and detailed event timelines.
- **Validation**: Automatically cross-checks detected flares against NOAA's GOES event catalog for ground-truth comparison.

## Requirements

- **Python 3.11+**
- **Node.js 18+**

## Setup Instructions

1. **Clone the repository** (or extract the project folder).
2. **Install Python dependencies**:
   ```bash
   python -m venv venv
   # On Windows: venv\Scripts\activate
   # On Mac/Linux: source venv/bin/activate
   pip install -r requirements.txt
   ```
3. **Install Frontend dependencies**:
   ```bash
   cd frontend
   npm install --legacy-peer-deps
   cd ..
   ```

## Obtaining Real Aditya-L1 Data

This project uses real data from ISRO's PRADAN portal.
1. Register and log in at [ISRO PRADAN](https://pradan.issdc.gov.in/).
2. Search for Aditya-L1 mission data (HEL1OS and SoLEXS instruments).
3. Download the lightcurve `.fits` files (for HEL1OS) and the `.zip` files (for SoLEXS).
4. Place the downloaded files into the `data/raw/hel1os` and `data/raw` directories, respectively.

## Running the Pipeline (Reset)

If you've added new data, you need to run the data pipeline to extract, ingest, detect, and validate.

**On Windows:**
```bash
reset.bat
```

**On Mac/Linux:**
```bash
./reset.sh
```

## Running the Application

Once the data is processed, you can start the backend API and the frontend dashboard.

**On Windows:**
```bash
run.bat
```

**On Mac/Linux:**
```bash
./run.sh
```

This will open two terminal windows (or background processes) and expose:
- **Backend API**: http://localhost:8000
- **Frontend Dashboard**: http://localhost:5173

## Adjusting Replay Speed

The simulated live feed is managed by the backend. To adjust the replay speed:
1. Open `backend/main.py`.
2. Locate the `replay_loop` function.
3. Modify the `target_duration_minutes` or `steps_per_second` variables to speed up or slow down the simulation.

## Troubleshooting

- **No Data in Dashboard**: Ensure you ran `reset.bat` (or `reset.sh`) after placing data in `data/raw`. Check the console output of the reset script for errors.
- **Port Conflicts**: If port 8000 or 5173 is already in use, you can modify the ports in `run.bat` / `run.sh` and update `frontend/vite.config.ts` accordingly.
- **Missing Dependencies**: Re-run `pip install -r requirements.txt` and `npm install` inside the `frontend` folder.
- **Extracting SoLEXS files**: Ensure the SoLEXS `.zip` files are in the root directory or `data/raw/solexs`. The `extract_solexs.py` script handles the complex nested ZIP extraction automatically.
