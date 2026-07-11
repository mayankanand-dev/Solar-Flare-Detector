@echo off
echo =======================================================
echo Solar Flare Detector — Startup
echo =======================================================

echo.
echo Starting Backend API (FastAPI) on port 8000...
start "Backend API" cmd /k "call venv\Scripts\activate.bat & uvicorn backend.main:app --reload --port 8000"

echo.
echo Starting Frontend Dashboard (Vite) on port 5173...
start "Frontend" cmd /k "cd frontend & npm run dev"

echo.
echo Servers are starting in separate windows.
echo - Backend API: http://localhost:8000
echo - Frontend Dashboard: http://localhost:5173
echo.
echo Leave those windows open. Close them to stop the servers.
echo =======================================================
