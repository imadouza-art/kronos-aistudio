# MetaTrader 5 (MT5) Integration Guide for Kronos & Chronos 100M AI

This guide shows you how to stream live candlesticks from your MetaTrader 5 terminal into the Kronos 100M Foundation Model server and plot real-time predictive quantiles (`p10` Bearish, `p50` Median, `p90` Bullish) on your MT5 charts.

---

## Architecture Overview

```
[ MetaTrader 5 Terminal ] 
   ↕ (rates & ticks via python MetaTrader5 API)
[ mt5_bridge.py ]
   ↕ (POST /api/mt5/predict)
[ Kronos Prediction Server (http://localhost:3000) ]
   ↓ (Calculates p10 / p50 / p90 multi-horizon forecast)
[ mt5_bridge.py ]
   ↓ (Writes Global Variables into MT5)
[ KronosSignalEA.ex5 ]
   ↓ (Draws p10, p50, p90 lines + On-Chart HUD panel)
```

---

## Step 1: Start the Local Prediction Server

Ensure your local server is running on port 3000:

```bash
npm run dev
# or
npx tsx server.ts
```

Verify the endpoint is responsive:
```bash
curl http://localhost:3000/api/health
```

The public prediction endpoint is active at:
`POST http://localhost:3000/api/mt5/predict` (No login required, CORS enabled).

---

## Step 2: Configure and Run the Python Bridge

In `mt5_bridge.py`, the configuration is already preset for remote connection:

```python
BACKEND = "remote"                       # "remote" connects to HTTP server
REMOTE_BASE = "http://localhost:3000"    # URL of your prediction server
DEFAULT_SYMBOL = "XAUUSDm"               # Chart symbol: XAUUSDm, XAUUSD, GOLD, etc.
TIMEFRAME_NAME = "1m"                    # 1m, 5m, 15m, 1h
PREDICTION_HORIZON = 24                  # Forecast horizon (bars ahead)
MODEL_VARIANT = "kronos-financial-100m"  # Financial Kronos 100M (AAAI 2026)
```

### Launch the Bridge:
- **On Windows**: Simply **double-click `run_bridge.bat`**.
- Or via terminal:
  ```bash
  python mt5_bridge.py XAUUSDm http://localhost:3000
  ```

Once running, the bridge will output:
```
[MT5 CONNECTED] Account: #12345678 (Broker-Server)
[BRIDGE ACTIVE] Streaming rates to: http://localhost:3000/api/mt5/predict
[14:30:05] XAUUSDm Spot: 2345.50 | p10: 2342.10 | p50: 2348.80 (+0.14%) | p90: 2354.20 | Latency: 4ms
```

---

## Step 3: Install and Compile `KronosSignalEA.mq5`

1. Open your **MetaTrader 5** terminal.
2. Press **F4** on your keyboard (or go to **Tools** → **MetaQuotes Language Editor**).
3. In MetaEditor, click **File** → **New** → **Expert Advisor (template)** → Name it `KronosSignalEA`.
4. Replace the template contents with the code from `KronosSignalEA.mq5` in this project folder.
5. Click **Compile** (or press **F7**). The compiler will generate `KronosSignalEA.ex5` with 0 errors.

---

## Step 4: Attach EA to Chart

1. Return to the MetaTrader 5 terminal.
2. Open your **XAUUSDm** (or **XAUUSD**) chart on the **M1** (or M5) timeframe.
3. In the **Navigator** window (Ctrl+N), expand **Expert Advisors** and find **`KronosSignalEA`**.
4. Drag `KronosSignalEA` onto your chart.
5. In the settings dialog:
   - Check **Allow Algo Trading** (if prompted).
   - Verify input colors:
     - `P90 (Bull Boundary)`: LimeGreen
     - `P50 (Median Target)`: Gold
     - `P10 (Bear Boundary)`: Crimson
6. Click **OK**.

---

## Result on Your Chart

- **p90 Line (Green)**: Upper 90% confidence quantile ceiling.
- **p50 Line (Gold)**: Median expected trajectory at horizon T+24.
- **p10 Line (Red)**: Lower 10% confidence quantile floor.
- **HUD Panel**: Displays real-time spot price, model status, expected drift %, and directional bias (Bullish / Bearish / Range).
