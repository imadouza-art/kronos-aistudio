@echo off
title Chronos AI - Complete NinjaTrader 8 System Launcher
color 0B

echo ==============================================================================
echo       CHRONOS AI REAL-TIME PREDICTOR - NINJATRADER 8 LAUNCHER
echo ==============================================================================
echo.
echo Launching Chronos AI Prediction Server and NinjaTrader 8 Bridge...
echo.

:: 1. Launch Node/Express Server on Port 3000 in background/new window
start "Chronos AI Prediction Server (Port 3000)" cmd /k "npm run dev"

:: Wait 3 seconds for server to initialize
timeout /t 3 /nobreak >nul

:: 2. Launch NT8 Python Bridge on Port 5000 in background/new window
start "Chronos NT8 Data Bridge (Port 5000)" cmd /k "run_nt8_bridge.bat"

echo.
echo [STARTED]
echo   1. Chronos AI Server is running at: http://localhost:3000
echo   2. NT8 Data Bridge is listening at: http://localhost:5000/api/nt8/bar
echo.
echo Next steps:
echo   1. In NinjaTrader 8, open an ES, MES, NQ, or MNQ chart.
echo   2. Right-click the chart -> Indicators -> select 'ChronosNT8Bridge' -> click OK.
echo   3. Open your browser at http://localhost:3000 to view the real-time AI dashboard!
echo ==============================================================================
echo.
pause
