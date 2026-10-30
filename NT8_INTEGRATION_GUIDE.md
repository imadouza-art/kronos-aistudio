# NinjaTrader 8 (NT8) Tradovate Integration Guide
## Chronos AI & Financial Kronos 100M Real-Time Predictor

This guide provides complete instructions for streaming live market data from **NinjaTrader 8** (with your existing **Tradovate** connection) on Windows into the **Chronos 100M Foundation Model** prediction engine and visualizing real-time probabilistic quantile forecasts (`p10` Bearish, `p50` Median, `p90` Bullish) on both your NT8 charts and the real-time web dashboard.

---

## 1. System Architecture

```
[ NinjaTrader 8 + Tradovate (CME Futures) ]
   │
   │  (Extracts completed OHLCV bars, timestamps, and real-time ticks)
   ▼
[ ChronosNT8BridgeIndicator.cs ]  <-- Non-blocking async C# NinjaScript Indicator
   │
   │  POST http://localhost:5000/api/nt8/bar (JSON)
   ▼
[ nt8_bridge.py ]                 <-- Local Python Bridge (Deduplication & Normalization)
   │
   │  POST http://localhost:3000/api/nt8/predict
   ▼
[ Chronos Prediction Server ]     <-- Amazon Chronos 100M & Financial Kronos 100M
   │
   ├──▶ Returns p10, p50, p90 quantiles & signal back to NinjaTrader 8 Chart (HUD & Lines)
   └──▶ Updates React Dashboard in real time at http://localhost:3000
```

---

## 2. Prerequisites

1. **Operating System**: Windows 10 or Windows 11.
2. **NinjaTrader 8**: Version 8.0.28.0 or newer.
3. **Data Connection**: Existing Tradovate connection active in NinjaTrader 8.
4. **Python**: Python 3.9+ installed and added to your system `PATH`.
5. **Node.js**: Node 18+ installed on your PC.
6. **Supported Futures Instruments**:
   - `ES` (E-mini S&P 500)
   - `MES` (Micro E-mini S&P 500)
   - `NQ` (E-mini NASDAQ-100)
   - `MNQ` (Micro E-mini NASDAQ-100)
   - `YM` / `MYM` (Dow Jones Industrial Average Futures)
   - `GC` / `MGC` (COMEX Gold Futures)
   - `SI` / `SIL` (COMEX Silver Futures)

---

## 3. Step 1: Install the NinjaScript C# Indicator in NinjaTrader 8

1. In this project repository, locate the source file:
   ```
   ChronosNT8BridgeIndicator.cs
   ```
   *(Also available in `NinjaScript/Indicators/ChronosNT8BridgeIndicator.cs`)*

2. Copy `ChronosNT8BridgeIndicator.cs` to your NinjaTrader 8 custom indicators directory:
   ```
   C:\Users\<YourUsername>\Documents\NinjaTrader 8\bin\Custom\Indicators\
   ```

3. Open **NinjaTrader 8**.

4. Open the NinjaScript Editor:
   - On the NinjaTrader 8 Control Center, click **New** → **NinjaScript Editor** (or press `F5`).

5. Compile the Indicator:
   - In the NinjaScript Editor, press **`F5`** (or right-click → **Compile**).
   - In the lower status bar, you will hear a chime and see:
     ```
     NinjaScript compiled successfully
     ```
   - The indicator `ChronosNT8Bridge` is now compiled and ready to attach to any chart.

---

## 4. Step 2: Connect to Your Tradovate Account in NinjaTrader 8

1. On the NinjaTrader 8 Control Center, click **Connections** in the top menu.
2. If your Tradovate connection is already configured:
   - Click on your **Tradovate** connection name.
   - The connection light in the bottom-left corner of the Control Center will turn **Green** (Connected).
3. If setting up for the first time:
   - Click **Connections** → **configure**.
   - Under *Available*, select **Tradovate / NinjaTrader**, click **add**.
   - Enter your Tradovate username and password.
   - Set Connection type to **Live** or **Simulation** as appropriate.
   - Click **OK**, then connect via **Connections** → **Tradovate**.

---

## 5. Step 3: Open Futures Charts & Attach `ChronosNT8Bridge`

1. Open a new chart for your desired instrument:
   - In the Control Center, click **New** → **Chart**.
   - Select your instrument: `ES`, `MES`, `NQ`, or `MNQ` (or current active front-month contract, e.g., `ES 06-26`).
   - Select your timeframe: **1 Minute**, **5 Minute**, **15 Minute**, **30 Minute**, or **60 Minute**.
   - Click **OK**.

2. Attach the `ChronosNT8Bridge` Indicator:
   - Right-click anywhere on the chart → **Indicators** (or press `Ctrl+I`).
   - In the top-left *Available* list, scroll to **ChronosNT8Bridge**.
   - Click **Add** in the bottom-left to move it to *Configured*.

3. Verify Indicator Settings:
   - **Bridge Server URL**: `http://localhost:5000/api/nt8/bar`
   - **Prediction Horizon**: `24` (Number of bars to project)
   - **Model Variant**: `kronos-financial-100m` *(or `chronos-100m`)*
   - **Historical Context Bars**: `80`
   - **Draw Forecast Lines**: `True` (Draws P90, P50, P10 horizontal targets)
   - **Show On-Chart HUD**: `True` (Displays real-time panel in chart corner)
   - Click **OK**.

---

## 6. Step 4: Run the Complete System Locally

You can launch both the Chronos AI Prediction Server and the NinjaTrader 8 Bridge with a single command.

### Option A: One-Click Windows Launcher (Recommended)
Simply double-click:
```bat
start_nt8_chronos.bat
```
This automatically launches:
1. Chronos AI prediction server on `http://localhost:3000`
2. NinjaTrader 8 bridge on `http://localhost:5000`

### Option B: Manual Startup via Command Line

**Terminal 1 — Chronos Prediction Server:**
```cmd
npm run dev
```

**Terminal 2 — NinjaTrader 8 Data Bridge:**
```cmd
run_nt8_bridge.bat
```
*(or `python nt8_bridge.py --port 5000 --server http://localhost:3000`)*

---

## 7. Step 5: Verify Streaming & Forecast Output

Once connected, your terminal will display real-time bar events streamed from Tradovate:

```
==========================================================================
      CHRONOS AI & FINANCIAL KRONOS 100M — NINJATRADER 8 BRIDGE
==========================================================================
  NinjaTrader 8 Port : http://localhost:5000/api/nt8/bar
  Chronos Server URL : http://localhost:3000
  Default Variant    : kronos-financial-100m
  Default Horizon    : 24 bars
  Supported Futures  : ES, MES, NQ, MNQ (Tradovate / CME)
==========================================================================
[*] Starting multi-threaded HTTP listener on 0.0.0.0:5000...
[OK] Chronos Server connected successfully at http://localhost:3000 (status: online).

[READY] Waiting for real-time bars from NinjaTrader 8 Indicator 'ChronosNT8Bridge'...

[14:30:00] [NT8 TRADOVATE] ES   (1m) Price:  5882.25 | Signal: LONG  (Conf: 78%, SL: 5878.50, TP: 5887.25) | p10: 5878.50 | p50: 5887.25 (+0.09%) | p90: 5892.00 | Latency: 4ms
[14:31:00] [NT8 TRADOVATE] ES   (1m) Price:  5883.50 | Signal: LONG  (Conf: 82%, SL: 5879.75, TP: 5888.50) | p10: 5879.75 | p50: 5888.50 (+0.09%) | p90: 5893.25 | Latency: 3ms
[14:31:00] [NT8 TRADOVATE] NQ   (1m) Price: 20455.00 | Signal: SHORT (Conf: 74%, SL: 20475.00, TP: 20435.00) | p10: 20418.00 | p50: 20435.00 (-0.10%) | p90: 20475.00 | Latency: 5ms
```

### Visual Output in NinjaTrader 8:
- **P90 Line (LimeGreen)**: 90th percentile bullish ceiling.
- **P50 Line (Gold)**: Median expected trajectory at horizon T+24.
- **P10 Line (Crimson)**: 10th percentile bearish floor.
- **On-Chart HUD Panel (Top-Left)**:
  - Instrument & Timeframe
  - Live Spot Price
  - Connection status & Latency
  - Foundation Model Variant
  - Median Expected Target & Drift %
  - Trading Signal (LONG / SHORT / FLAT), Stop Loss, Take Profit, and Confidence %

### Visual Output on the Web Dashboard:
- Open your browser to `http://localhost:3000`.
- The top header will show:
  ```
  [●] Prices: NinjaTrader 8 (Tradovate) (X ticks)
  ```
- Select **ES**, **MES**, **NQ**, or **MNQ** from the asset dropdown.
- View real-time candlestick charts, probabilistic prediction cones, quantile distribution bands, and AI quantitative analysis powered by Gemini 3.8 Flash.

---

## 8. Verification & Pipeline Testing Suite

To verify all components end-to-end without waiting for market hours, run the included pipeline verification suite:

```cmd
python verify_nt8_pipeline.py
```

This automated test checks:
1. **Historical Candle Transmission**: Formats and transmits 60 CME bars.
2. **Completed Bar Streaming**: Validates that bar closes reach the bridge and server.
3. **Duplicate Bar Rejection**: Ensures duplicate timestamps are rejected.
4. **MT5 vs NT8 Input Equivalence**: Feeds identical candlestick data in both MT5 format and NT8 format, proving exact numerical equivalence in forecast outputs.
5. **Connection & Disconnection Watchdog**: Tests the real-time disconnection detection logic.

---

## 9. Troubleshooting & FAQ

### Q1: The indicator displays "Bridge Connection Error" on the chart.
- **Cause**: The Python bridge (`nt8_bridge.py`) is not running.
- **Solution**: Run `run_nt8_bridge.bat` or `start_nt8_chronos.bat`. Verify that port 5000 is open.

### Q2: How does the bridge avoid freezing NinjaTrader 8?
- The `ChronosNT8BridgeIndicator.cs` uses asynchronous, non-blocking HTTP requests via `Task.Run` and `HttpClient.PostAsync` with a strict 3-second timeout. Bar calculations and UI rendering on the NT8 chart continue with zero interruption.

### Q3: How do I switch between Amazon Chronos and Financial Kronos?
- In the NinjaTrader 8 indicator properties:
  - Set **Model Variant** to `kronos-financial-100m` (pre-trained on 12B K-line records, AAAI 2026) or `chronos-100m` (AWS continuous time series foundation).
- On the web dashboard: click the **Amazon Chronos** or **Financial Kronos** toggle buttons at the top of the screen.

### Q4: Does this require MetaTrader 5?
- **No.** MetaTrader 5 is completely eliminated from the data pipeline. Market data comes directly from your active NinjaTrader 8 / Tradovate session.

### Q5: What happens when NinjaTrader 8 is closed?
- The dashboard watchdog detects that no new ticks have been received for over 60 seconds and cleanly displays `NinjaTrader 8: Disconnected / Standby`. It will never generate fake or simulated prices in place of real market data.
