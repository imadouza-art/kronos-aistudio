# Chronos AI & Financial Kronos 100M — Real-Time Predictor
### Powered by NinjaTrader 8 & Tradovate CME Futures

A real-time probabilistic time series forecasting and quantitative AI trading system powered by **Amazon Chronos (100M)** and **Financial Kronos (100M, AAAI 2026)** foundation models, receiving live streaming market data directly from **NinjaTrader 8** via **Tradovate**.

---

## Highlights

- **Direct NinjaTrader 8 Integration**: Non-blocking asynchronous NinjaScript C# indicator (`ChronosNT8BridgeIndicator.cs`) running inside NinjaTrader 8 on Windows.
- **Tradovate CME Futures Support**: Native support for **ES** (E-mini S&P 500), **MES** (Micro E-mini S&P 500), **NQ** (E-mini NASDAQ-100), and **MNQ** (Micro E-mini NASDAQ-100).
- **Multi-Timeframe Architecture**: Full support for 1-minute, 5-minute, 15-minute, 30-minute, and 60-minute bars.
- **Dual 100M Foundation Models**:
  - **Financial Kronos 100M (AAAI 2026)**: Pretrained on 12 Billion real financial market K-line records with dual-token hierarchical quantization (`[Coarse: 2048] + [Fine: 2048]`) and RoPE Causal Decoder.
  - **Amazon Chronos 100M (AWS)**: Continuous time-series language modeling with scale-invariance and 4,096 uniform vocabulary bins.
- **Probabilistic Forecasting Cones**: Projects multi-horizon quantile paths (`p10` lower support, `p50` expected median, `p90` upper resistance) with uncertainty bandwidths.
- **Two-Way Visualization**:
  - **On-Chart NT8 HUD & Lines**: Plots P10, P50, and P90 lines directly on your NinjaTrader 8 chart with an on-chart signal dashboard.
  - **Real-Time Web Dashboard**: Interactive React + Tailwind dashboard at `http://localhost:3000` with live streaming candles and Gemini 3.8 Flash quantitative reasoning.

---

## Architecture

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

## Quick Start (Windows 11)

### 1. Install Dependencies
Ensure you have **Node.js 18+** and **Python 3.9+** installed:
```cmd
npm install
pip install -r requirements.txt
```

### 2. Install NinjaScript Indicator in NinjaTrader 8
1. Copy `ChronosNT8BridgeIndicator.cs` into:
   ```
   C:\Users\<YourUsername>\Documents\NinjaTrader 8\bin\Custom\Indicators\
   ```
2. Open NinjaTrader 8, press **`F5`** to open the NinjaScript Editor, and press **`F5`** to compile.

### 3. Attach to an ES, MES, NQ, or MNQ Chart
1. Connect to your **Tradovate** connection in NinjaTrader 8.
2. Open an **ES** or **NQ** chart (1m, 5m, etc.).
3. Right-click chart → **Indicators** → select **`ChronosNT8Bridge`** → click **OK**.

### 4. Launch the System
Double-click:
```bat
start_nt8_chronos.bat
```
*(Or run `npm run dev` in one terminal and `run_nt8_bridge.bat` in another).*

### 5. Open Web Dashboard
Open your browser to:
```
http://localhost:3000
```

---

## Pipeline Verification Suite

To verify that the entire pipeline is functioning without waiting for live market hours, run:
```cmd
python verify_nt8_pipeline.py
```
This tests:
1. Historical CME futures candle batch transmission.
2. Real-time bar completion and streaming.
3. Duplicate timestamp rejection.
4. Mathematical equivalence between MT5-format inputs and NT8-format inputs.
5. Disconnection and reconnection detection watchdog.

---

## Repository Structure

```
├── ChronosNT8BridgeIndicator.cs       # C# NinjaScript Custom Indicator for NinjaTrader 8
├── NinjaScript/Indicators/            # Mirror directory for NT8 custom indicators
│   └── ChronosNT8BridgeIndicator.cs
├── nt8_bridge.py                      # Local Python Bridge service (port 5000)
├── run_nt8_bridge.bat                 # Windows launcher for Python NT8 bridge
├── start_nt8_chronos.bat              # Windows one-click launcher for server + bridge
├── verify_nt8_pipeline.py             # Automated test & verification suite
├── requirements.txt                   # Python dependencies (requests, urllib3)
├── NT8_INTEGRATION_GUIDE.md           # Comprehensive step-by-step setup documentation
├── server.ts                          # Express backend with /api/nt8/* and Chronos models
├── src/                               # React / TypeScript frontend dashboard
│   ├── App.tsx
│   ├── components/
│   │   ├── ChronosChart.tsx
│   │   ├── Header.tsx
│   │   ├── MacroIndicesBar.tsx
│   │   ├── RealTimeStatsBar.tsx
│   │   └── GeminiAnalysisPanel.tsx
│   ├── services/
│   │   ├── chronosEngine.ts           # Amazon Chronos 100M foundation model
│   │   ├── financialKronosEngine.ts   # Financial Kronos 100M foundation model
│   │   └── marketData.ts              # Data manager with NT8 Tradovate feed
│   └── types/
│       └── chronos.ts
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## License

Apache-2.0
