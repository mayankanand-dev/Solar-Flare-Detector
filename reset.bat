@echo off
echo =======================================================
echo Solar Flare Detector — Full Pipeline Reset
echo =======================================================

echo.
echo 1. Clearing old processed data...
del /q data\processed\* 2>nul

echo.
echo 2. Extracting SoLEXS files (if any)...
venv\Scripts\python pipeline\extract_solexs.py

echo.
echo 3. Running Data Ingestion (HEL1OS + SoLEXS)...
venv\Scripts\python pipeline\ingest.py --input data\raw --output data\processed\lightcurve.csv

echo.
echo 4. Running Flare Detection...
venv\Scripts\python pipeline\detect_flares.py --input data\processed\lightcurve.csv --output data\processed\flares.json --sigma 3.0 --window 90

echo.
echo 5. Running Validation (NOAA GOES comparison)...
venv\Scripts\python pipeline\validate.py

echo.
echo =======================================================
echo Pipeline Complete! You can now start the app with run.bat
echo =======================================================
