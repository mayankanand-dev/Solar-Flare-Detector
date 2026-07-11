#!/bin/bash
echo "======================================================="
echo "Solar Sentinel — Startup"
echo "======================================================="

echo ""
echo "Starting Backend API (FastAPI) on port 8000..."
source venv/bin/activate
uvicorn backend.main:app --reload --port 8000 &
BACKEND_PID=$!

echo ""
echo "Starting Frontend Dashboard (Vite) on port 5173..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "Servers are running."
echo "- Backend API: http://localhost:8000"
echo "- Frontend Dashboard: http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop both servers."

trap "kill $BACKEND_PID $FRONTEND_PID" SIGINT SIGTERM EXIT
wait
