@echo off
title Chronos AI - NinjaTrader 8 Bridge Runner
color 0A

echo ==============================================================================
echo       CHRONOS AI & FINANCIAL KRONOS 100M - NINJATRADER 8 BRIDGE
echo ==============================================================================
echo.
echo [1/3] Checking Python installation...
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not installed or not added to your system PATH!
    echo Please install Python 3.9+ from https://www.python.org/downloads/
    echo NOTE: During Python installation, make sure to check "Add Python to PATH".
    echo.
    pause
    exit /b 1
)

python --version
echo.

echo [2/3] Checking required libraries (requests)...
python -c "import requests" >nul 2>&1
if errorlevel 1 (
    echo Installing missing Python dependencies (requests)...
    pip install -r requirements.txt
    if errorlevel 1 (
        echo [ERROR] Failed to install dependencies. Please run manually:
        echo pip install requests
        pause
        exit /b 1
    )
) else (
    echo [OK] Dependencies verified: requests is ready.
)

echo.
echo [3/3] Starting NinjaTrader 8 Data Bridge on port 5000...
echo       Bridge Target : http://localhost:5000/api/nt8/bar
echo       Chronos Server: http://localhost:3000
echo       Instruments   : ES, MES, NQ, MNQ (Tradovate / CME Futures)
echo.
echo NOTE: Ensure NinjaTrader 8 is open and 'ChronosNT8Bridge' is attached to your chart.
echo ==============================================================================
echo.

python nt8_bridge.py %*

if errorlevel 1 (
    echo.
    echo [BRIDGE EXITED WITH ERROR] Please review the error message above.
    pause
)
