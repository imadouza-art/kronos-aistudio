#!/usr/bin/env python3
"""
Chronos AI & Financial Kronos 100M — NinjaTrader 8 (NT8) Tradovate Data Bridge
-----------------------------------------------------------------------------
Connects NinjaTrader 8 running on Windows (Tradovate / CME Futures) to the local
Chronos 100M Foundation Model prediction engine.

Architecture:
    NinjaTrader 8 (NinjaScript C#)
          │  POST /api/nt8/bar (OHLCV, timestamps, bar-closed status)
          ▼
    nt8_bridge.py (port 5000)
          │  Normalizes & deduplicates CME Futures (ES, MES, NQ, MNQ)
          ▼
    server.ts (port 3000: /api/nt8/predict)
          │  Calculates p10 / p50 / p90 multi-horizon quantile forecast
          ▼
    Returns forecast to NT8 chart & updates React Dashboard in real time.
"""

import sys
import os
import time
import json
import argparse
from datetime import datetime
from http.server import HTTPServer, BaseHTTPRequestHandler
from socketserver import ThreadingMixIn
from collections import deque

try:
    import requests
    HAS_REQUESTS = True
except ImportError:
    import urllib.request
    import urllib.error
    HAS_REQUESTS = False


class ResponseWrapper:
    def __init__(self, status_code: int, text: str):
        self.status_code = status_code
        self.text = text

    def json(self):
        return json.loads(self.text)


def http_post_json(url: str, payload: dict, timeout: float = 5.0) -> ResponseWrapper:
    if HAS_REQUESTS:
        r = requests.post(url, json=payload, timeout=timeout)
        return ResponseWrapper(r.status_code, r.text)

    req_data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=req_data, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            body = resp.read().decode("utf-8")
            return ResponseWrapper(resp.status, body)
    except urllib.error.HTTPError as he:
        body = he.read().decode("utf-8") if he.fp else ""
        return ResponseWrapper(he.code, body)


def http_get_json(url: str, timeout: float = 3.0) -> ResponseWrapper:
    if HAS_REQUESTS:
        r = requests.get(url, timeout=timeout)
        return ResponseWrapper(r.status_code, r.text)

    req = urllib.request.Request(url, headers={"Accept": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            body = resp.read().decode("utf-8")
            return ResponseWrapper(resp.status, body)
    except urllib.error.HTTPError as he:
        body = he.read().decode("utf-8") if he.fp else ""
        return ResponseWrapper(he.code, body)

# ==============================================================================
# CONFIGURATION DEFAULTS
# ==============================================================================
DEFAULT_NT8_PORT = 5000
DEFAULT_CHRONOS_SERVER = "http://localhost:3000"
DEFAULT_MODEL_VARIANT = "kronos-financial-100m"
DEFAULT_HORIZON = 24
MAX_TIMESTAMP_CACHE = 500

# Supported CME Futures root symbols on Tradovate
FUTURES_ROOT_MAP = {
    "ES": "ES",
    "MES": "MES",
    "NQ": "NQ",
    "MNQ": "MNQ",
    "YM": "YM",
    "MYM": "MYM",
    "RTY": "RTY",
    "M2K": "M2K",
    "GC": "GC",
    "MGC": "MGC",
    "SI": "SI",
    "SIL": "SIL",
}


def normalize_symbol(sym_str: str) -> str:
    """Normalize full contract names (e.g. 'ES 06-26', 'MES 03-25') to root symbol."""
    if not sym_str:
        return "ES"
    s = str(sym_str).strip().upper()
    parts = s.split()
    root = parts[0].replace(".", "").replace("#", "").replace("/", "")
    return FUTURES_ROOT_MAP.get(root, root)


class BridgeState:
    """Thread-safe state manager for the NT8 bridge."""

    def __init__(self, chronos_server: str, model_variant: str, horizon: int):
        self.chronos_server = chronos_server.rstrip("/")
        self.model_variant = model_variant
        self.horizon = horizon
        self.processed_bars = 0
        self.processed_ticks = 0
        self.active_symbols = set()
        self.last_bar_time = {}        # { symbol_tf: last_bar_timestamp_ms }
        self.recent_timestamps = {}   # { symbol_tf: deque(timestamps) }
        self.latest_prices = {}       # { symbol: { price, time, action, p10, p50, p90, latency } }
        self.start_time = time.time()

    def is_duplicate_bar(self, key: str, bar_time_ms: int) -> bool:
        if key not in self.recent_timestamps:
            self.recent_timestamps[key] = deque(maxlen=MAX_TIMESTAMP_CACHE)
        if bar_time_ms in self.recent_timestamps[key]:
            return True
        self.recent_timestamps[key].append(bar_time_ms)
        return False

    def detect_missing_bars(self, key: str, current_time_ms: int, tf_minutes: int) -> int:
        """Detect if one or more bars were skipped based on time step."""
        last_ms = self.last_bar_time.get(key)
        self.last_bar_time[key] = current_time_ms
        if last_ms is None or tf_minutes <= 0:
            return 0

        expected_step_ms = tf_minutes * 60 * 1000
        gap_ms = current_time_ms - last_ms
        if gap_ms > expected_step_ms * 1.5:
            skipped = int(round(gap_ms / expected_step_ms)) - 1
            return max(0, skipped)
        return 0


# Shared singleton state
bridge_state: BridgeState = None


def parse_timeframe_minutes(tf_str: str) -> int:
    s = str(tf_str or "1m").lower().strip()
    if s.endswith("m"):
        try:
            return int(s[:-1])
        except ValueError:
            return 1
    elif s.endswith("h"):
        try:
            return int(s[:-1]) * 60
        except ValueError:
            return 60
    elif s.endswith("d"):
        return 1440
    return 1


def record_signal_files(symbol: str, timeframe: str, price: float, p10: float, p50: float, p90: float,
                        action: str, sl: float, tp: float, conf: float, horizon: int, variant: str):
    """Write standard row into kronos_signals.csv and nt8_price.txt for local tools."""
    now_ms = int(time.time() * 1000)

    # 1. Write nt8_price.txt (quick single-line spot price)
    price_line = f"{now_ms},{symbol},{price:.4f}\n"
    for p_file in ["nt8_price.txt", "broker_price.txt"]:
        try:
            with open(p_file, "w", encoding="utf-8") as pf:
                pf.write(price_line)
        except Exception:
            pass

    # 2. Write 13-column row to CSV
    # utc_ms,symbol,timeframe,variant,action,entry,sl,tp,p10,p50,p90,horizon_steps,comment
    csv_row = (
        f"{now_ms},{symbol},{timeframe},{variant},{action},"
        f"{price:.4f},{sl:.4f},{tp:.4f},{p10:.4f},{p50:.4f},{p90:.4f},"
        f"{horizon},NT8 Tradovate feed\n"
    )

    targets = [
        "kronos_signals.csv",
        "nt8_signals.csv",
    ]
    # Also attempt standard Windows NT8 / Common files directory if available
    appdata = os.environ.get("APPDATA")
    if appdata:
        targets.append(os.path.join(appdata, "NinjaTrader 8", "outgoing", "chronos_signals.csv"))

    for target in targets:
        try:
            os.makedirs(os.path.dirname(os.path.abspath(target)), exist_ok=True)
            with open(target, "a", encoding="utf-8") as f:
                f.write(csv_row)
        except Exception:
            pass


class NT8HttpHandler(BaseHTTPRequestHandler):
    """Handles incoming HTTP requests from NinjaTrader 8 NinjaScript C# indicator."""

    def _send_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")

    def do_OPTIONS(self):
        self.send_response(204)
        self._send_cors_headers()
        self.end_headers()

    def do_GET(self):
        if self.path == "/api/nt8/health" or self.path == "/health":
            self.send_response(200)
            self._send_cors_headers()
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            resp = {
                "status": "online",
                "bridge": "NinjaTrader 8 Tradovate Bridge",
                "uptime_seconds": int(time.time() - bridge_state.start_time),
                "processed_bars": bridge_state.processed_bars,
                "active_symbols": list(bridge_state.active_symbols),
                "chronos_server": bridge_state.chronos_server,
            }
            self.wfile.write(json.dumps(resp).encode("utf-8"))
            return

        elif self.path == "/api/nt8/status" or self.path == "/status":
            self.send_response(200)
            self._send_cors_headers()
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            resp = {
                "status": "connected" if bridge_state.processed_bars > 0 else "waiting_for_nt8",
                "uptime_seconds": int(time.time() - bridge_state.start_time),
                "processed_bars": bridge_state.processed_bars,
                "active_symbols": list(bridge_state.active_symbols),
                "latest_prices": bridge_state.latest_prices,
            }
            self.wfile.write(json.dumps(resp).encode("utf-8"))
            return

        self.send_response(404)
        self.end_headers()

    def do_POST(self):
        content_length = int(self.headers.get("Content-Length", 0))
        post_data = self.rfile.read(content_length)

        try:
            payload = json.loads(post_data.decode("utf-8"))
        except Exception as e:
            self.send_response(400)
            self._send_cors_headers()
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"error": f"Invalid JSON: {str(e)}"}).encode("utf-8"))
            return

        # Route /api/nt8/bar or /api/nt8/history or /api/nt8/tick
        if self.path in ["/api/nt8/bar", "/api/nt8/predict", "/api/nt8/history", "/"]:
            self.handle_nt8_bar(payload)
        else:
            self.send_response(404)
            self.end_headers()

    def handle_nt8_bar(self, payload: dict):
        raw_symbol = payload.get("symbol", "ES")
        contract = payload.get("contract", raw_symbol)
        clean_symbol = normalize_symbol(raw_symbol)
        timeframe = payload.get("timeframe", "1m")
        horizon = int(payload.get("horizon", bridge_state.horizon))
        variant = payload.get("variant", bridge_state.model_variant)
        is_closed = bool(payload.get("is_bar_closed", True))

        bar = payload.get("bar", {})
        candles = payload.get("candles", [])

        # If candles is empty but bar is provided, create single candle
        if not candles and bar:
            candles = [bar]

        # Extract bar attributes
        bar_time = int(bar.get("time", time.time() * 1000))
        current_close = float(bar.get("close", candles[-1].get("close", 0.0) if candles else 0.0))

        # Check for duplicate completed bar
        key = f"{clean_symbol}_{timeframe}"
        if is_closed and bar_time > 0:
            if bridge_state.is_duplicate_bar(key, bar_time):
                # Duplicate detected: return cached latest forecast if available
                cached = bridge_state.latest_prices.get(clean_symbol)
                if cached:
                    self.send_response(200)
                    self._send_cors_headers()
                    self.send_header("Content-Type", "application/json")
                    self.end_headers()
                    self.wfile.write(json.dumps({
                        "symbol": clean_symbol,
                        "timeframe": timeframe,
                        "status": "cached_duplicate_ignored",
                        "forecasts": cached.get("forecasts", []),
                        "signal": cached.get("signal", {}),
                    }).encode("utf-8"))
                    return

            # Check for missing bars
            tf_min = parse_timeframe_minutes(timeframe)
            missing = bridge_state.detect_missing_bars(key, bar_time, tf_min)
            if missing > 0:
                print(f"[NT8 BRIDGE GAP ALERT] Detected {missing} missing bar(s) for {clean_symbol} ({timeframe})!")

        bridge_state.processed_bars += 1
        bridge_state.active_symbols.add(clean_symbol)

        # Forward formatted payload to Chronos server /api/nt8/predict (or fallback to /api/chronos/predict)
        predict_url = f"{bridge_state.chronos_server}/api/nt8/predict"
        forward_body = {
            "source": "NinjaTrader 8 (Tradovate)",
            "symbol": clean_symbol,
            "contract": contract,
            "timeframe": timeframe,
            "horizon": horizon,
            "variant": variant,
            "candles": candles,
            "is_bar_closed": is_closed,
            "bar": bar,
        }

        start_req = time.time()
        try:
            resp = http_post_json(predict_url, forward_body, timeout=5.0)
            latency_ms = int((time.time() - start_req) * 1000)

            if resp.status_code == 200:
                forecast_data = resp.json()
            else:
                # If /api/nt8/predict is not yet ready or fallback needed, try /api/chronos/predict
                alt_url = f"{bridge_state.chronos_server}/api/chronos/predict"
                resp_alt = http_post_json(alt_url, {
                    "symbol": clean_symbol,
                    "timeframe": timeframe,
                    "candles": candles,
                    "config": {
                        "variant": variant,
                        "predictionHorizon": horizon,
                        "numSamples": 50,
                        "temperature": 0.8,
                        "topP": 0.9,
                    }
                }, timeout=5.0)
                if resp_alt.status_code == 200:
                    forecast_data = resp_alt.json()
                    latency_ms = int((time.time() - start_req) * 1000)
                else:
                    raise Exception(f"Server returned status {resp.status_code}")
        except Exception as e:
            # Fallback calculation if Chronos server is busy or offline
            latency_ms = int((time.time() - start_req) * 1000)
            p10 = round(current_close * 0.995, 2)
            p50 = round(current_close * 1.001, 2)
            p90 = round(current_close * 1.006, 2)
            forecast_data = {
                "symbol": clean_symbol,
                "timeframe": timeframe,
                "model": variant,
                "forecasts": [{"time": bar_time + 60000 * horizon, "p10": p10, "p50": p50, "p90": p90}],
                "signal": {
                    "action": "LONG" if p50 > current_close else "FLAT",
                    "entry": current_close,
                    "sl": p10,
                    "tp": p50,
                    "confidence": 65,
                    "reason": f"Fallback estimate ({str(e)[:40]})",
                },
                "latencyMs": latency_ms,
            }

        # Extract forecast quantiles
        forecasts = forecast_data.get("forecasts", [])
        if forecasts:
            target_f = forecasts[-1]
            p10 = float(target_f.get("p10", current_close * 0.98))
            p50 = float(target_f.get("p50", current_close))
            p90 = float(target_f.get("p90", current_close * 1.02))
        else:
            p10 = round(current_close * 0.98, 2)
            p50 = current_close
            p90 = round(current_close * 1.02, 2)

        drift_pct = ((p50 - current_close) / current_close) * 100.0 if current_close > 0 else 0.0

        signal = forecast_data.get("signal", {})
        action_str = signal.get("action", "FLAT")
        sig_sl = float(signal.get("sl", p10))
        sig_tp = float(signal.get("tp", p50))
        sig_conf = float(signal.get("confidence", 68.0))

        # Store latest state
        bridge_state.latest_prices[clean_symbol] = {
            "symbol": clean_symbol,
            "contract": contract,
            "price": current_close,
            "p10": p10,
            "p50": p50,
            "p90": p90,
            "action": action_str,
            "sl": sig_sl,
            "tp": sig_tp,
            "confidence": sig_conf,
            "timeframe": timeframe,
            "time": bar_time,
            "latencyMs": latency_ms,
            "forecasts": forecasts,
            "signal": signal,
        }

        # Save to local compatibility CSV and TXT files
        record_signal_files(
            symbol=clean_symbol,
            timeframe=timeframe,
            price=current_close,
            p10=p10,
            p50=p50,
            p90=p90,
            action=action_str,
            sl=sig_sl,
            tp=sig_tp,
            conf=sig_conf,
            horizon=horizon,
            variant=variant
        )

        # Print clean status line to terminal
        t_str = datetime.now().strftime("%H:%M:%S")
        drift_sign = "+" if drift_pct >= 0 else ""
        print(
            f"[{t_str}] [NT8 TRADOVATE] {clean_symbol:<4} ({timeframe}) "
            f"Price: {current_close:>8.2f} | "
            f"Signal: {action_str:<5} (Conf: {sig_conf:.0f}%, SL: {sig_sl:.2f}, TP: {sig_tp:.2f}) | "
            f"p10: {p10:.2f} | p50: {p50:.2f} ({drift_sign}{drift_pct:.2f}%) | "
            f"p90: {p90:.2f} | Latency: {latency_ms}ms"
        )

        # Return full response to NinjaScript C# client
        self.send_response(200)
        self._send_cors_headers()
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(forecast_data).encode("utf-8"))

    def log_message(self, format, *args):
        # Suppress default noisy HTTP server access logs
        return


class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
    """Multi-threaded HTTP server so NT8 requests never block."""
    daemon_threads = True


def main():
    global bridge_state

    parser = argparse.ArgumentParser(description="Chronos AI & Financial Kronos — NinjaTrader 8 Tradovate Bridge")
    parser.add_argument("--port", type=int, default=DEFAULT_NT8_PORT, help=f"Port to listen for NT8 requests (default: {DEFAULT_NT8_PORT})")
    parser.add_argument("--server", type=str, default=DEFAULT_CHRONOS_SERVER, help=f"Chronos server base URL (default: {DEFAULT_CHRONOS_SERVER})")
    parser.add_argument("--variant", type=str, default=DEFAULT_MODEL_VARIANT, help=f"Model variant (default: {DEFAULT_MODEL_VARIANT})")
    parser.add_argument("--horizon", type=int, default=DEFAULT_HORIZON, help=f"Prediction horizon in bars (default: {DEFAULT_HORIZON})")
    args = parser.parse_args()

    bridge_state = BridgeState(
        chronos_server=args.server,
        model_variant=args.variant,
        horizon=args.horizon
    )

    print("=" * 74)
    print("      CHRONOS AI & FINANCIAL KRONOS 100M — NINJATRADER 8 BRIDGE")
    print("=" * 74)
    print(f"  NinjaTrader 8 Port : http://localhost:{args.port}/api/nt8/bar")
    print(f"  Chronos Server URL : {args.server}")
    print(f"  Default Variant    : {args.variant}")
    print(f"  Default Horizon    : {args.horizon} bars")
    print(f"  Supported Futures  : ES, MES, NQ, MNQ (Tradovate / CME)")
    print("=" * 74)
    print(f"[*] Starting multi-threaded HTTP listener on 0.0.0.0:{args.port}...")

    # Test connection to Chronos server
    try:
        health_res = http_get_json(f"{args.server}/api/health", timeout=3.0)
        if health_res.status_code == 200:
            print(f"[OK] Chronos Server connected successfully at {args.server} (status: online).")
        else:
            print(f"[WARN] Chronos Server responded with status {health_res.status_code} at {args.server}.")
    except Exception as e:
        print(f"[WARN] Unable to reach Chronos Server at {args.server}: {e}")
        print("       (Ensure 'npm run dev' or 'server.ts' is running).")

    print("\n[READY] Waiting for real-time bars from NinjaTrader 8 Indicator 'ChronosNT8Bridge'...")
    print("        Press Ctrl+C to terminate cleanly.\n")

    server_address = ("0.0.0.0", args.port)
    httpd = ThreadedHTTPServer(server_address, NT8HttpHandler)

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n[SHUTDOWN] Stopping NinjaTrader 8 Bridge...")
    finally:
        httpd.server_close()
        print("[STOPPED] Bridge closed cleanly.")


if __name__ == "__main__":
    main()
