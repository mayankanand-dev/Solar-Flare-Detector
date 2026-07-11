#!/bin/bash
echo "======================================================="
echo "Solar Sentinel — Full Pipeline Reset"
echo "======================================================="

echo ""
echo "1. Clearing old processed data..."
rm -f data/processed/*

echo ""
echo "2. Extracting SoLEXS files (if any)..."
source venv/bin/activate
python pipeline/extract_solexs.py

echo ""
echo "3. Running Data Ingestion (HEL1OS + SoLEXS)..."
python pipeline/ingest.py --input data/raw --output data/processed/lightcurve.csv

echo ""
echo "4. Running Flare Detection..."
python pipeline/detect_flares.py --input data/processed/lightcurve.csv --output data/processed/flares.json --sigma 3.0 --window 90

echo ""
echo "5. Running Validation (NOAA GOES comparison)..."
python pipeline/validate.py

echo ""
echo "======================================================="
echo "Pipeline Complete! You can now start the app with ./run.sh"
echo "======================================================="
