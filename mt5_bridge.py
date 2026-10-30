#!/usr/bin/env python3
"""
Kronos & Chronos 100M Foundation Model - MetaTrader 5 Bridge
------------------------------------------------------------
Synchronizes live candlesticks from your MetaTrader 5 terminal with the
Kronos/Chronos AI prediction server, and publishes predicted p10 / p50 / p90
quantiles and target signals directly into MT5 Global Variables and files.
"""

import os
import sys
import time
import json
from datetime import datetime

try:
    import requests
except ImportError:
    print("[ERROR] 'requests' library missing. Run: pip install requests")
    sys.exit(1)

try:
    import MetaTrader5 as mt5
except ImportError:
    print("[ERROR] 'MetaTrader5' library missing. Run: pip install MetaTrader5")
    sys.exit(1)

# ==============================================================================
# CONFIGURATION
# ==============================================================================
BACKEND = "remote"                       # "remote" connects to HTTP server, "local" for offline
REMOTE_BASE = "http://localhost:3000"    # URL of your prediction server
DEFAULT_SYMBOL = "XAUUSDm"               # Active chart symbol: XAUUSDm, XAUUSD, etc.
TIMEFRAME_NAME = "1m"                    # "1m", "5m", "15m", "1h"
PREDICTION_HORIZON = 24                  # Number of future steps to forecast
MODEL_VARIANT = "kronos-financial-100m"  # "kronos-financial-100m" (AAAI 2026) or "chronos-100m" (AWS)
HISTORY_BARS = 80                        # Number of recent bars sent as context window
POLL_INTERVAL = 3.0                      # Seconds between forecast updates

# Map timeframe string to MT5 timeframe constant
TIMEFRAME_MAP = {
    "1m": mt5.TIMEFRAME_M1,
    "5m": mt5.TIMEFRAME_M5,
    "15m": mt5.TIMEFRAME_M15,
    "1h": mt5.TIMEFRAME_H1,
    "4h": mt5.TIMEFRAME_H4,
    "1d": mt5.TIMEFRAME_D1,
}


def resolve_symbol(requested_symbol: str) -> str:
    """Check if requested symbol exists in MT5; fallback to standard variants if needed."""
    if mt5.symbol_info(requested_symbol) is not None:
        mt5.symbol_select(requested_symbol, True)
        return requested_symbol

    # Try common broker symbol variations
    candidates = [
        requested_symbol,
        requested_symbol.replace("m", ""),
        requested_symbol + "m",
        requested_symbol.replace(".pro", ""),
        requested_symbol.replace(".raw", ""),
        "XAUUSD",
        "GOLD",
    ]
    for sym in candidates:
        if mt5.symbol_info(sym) is not None:
            mt5.symbol_select(sym, True)
            print(f"[BRIDGE INFO] Symbol '{requested_symbol}' redirected to available broker symbol '{sym}'")
            return sym

    print(f"[BRIDGE WARNING] Symbol '{requested_symbol}' not found in Market Watch. Using requested name.")
    return requested_symbol


def main():
    # Allow command-line overrides: python mt5_bridge.py [SYMBOL] [SERVER_URL]
    symbol = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_SYMBOL
    remote_base = sys.argv[2] if len(sys.argv) > 2 else REMOTE_BASE

    print("=" * 68)
    print("   KRONOS & CHRONOS 100M AI — METATRADER 5 BRIDGE")
    print("=" * 68)
    print(f"Backend Mode  : {BACKEND}")
    print(f"Server URL    : {remote_base}")
    print(f"Target Symbol : {symbol}")
    print(f"Timeframe     : {TIMEFRAME_NAME}")
    print(f"Model Variant : {MODEL_VARIANT}")
    print(f"Update Loop   : Every {POLL_INTERVAL} seconds")
    print("=" * 68)

    # Initialize MetaTrader 5 terminal connection
    if not mt5.initialize():
        print(f"[ERROR] Failed to initialize MetaTrader 5: {mt5.last_error()}")
        print("Please ensure your MetaTrader 5 terminal is open and logged into your account.")
        sys.exit(1)

    account_info = mt5.account_info()
    terminal_info = mt5.terminal_info()
    if account_info and terminal_info:
        print(f"[MT5 CONNECTED] Account: #{account_info.login} ({account_info.server})")
        print(f"                Company: {account_info.company} | Currency: {account_info.currency}")
        print(f"                Terminal: {terminal_info.name} build {terminal_info.build}")
    else:
        print("[MT5 CONNECTED] Terminal active.")

    active_symbol = resolve_symbol(symbol)
    tf_enum = TIMEFRAME_MAP.get(TIMEFRAME_NAME, mt5.TIMEFRAME_M1)

    predict_url = f"{remote_base.rstrip('/')}/api/mt5/predict"
    print(f"\n[BRIDGE ACTIVE] Streaming rates to: {predict_url}")
    print("Press Ctrl+C to stop.\n")

    last_processed_time = 0

    try:
        while True:
            # 1. Fetch latest historical candles from MetaTrader 5
            rates = mt5.copy_rates_from_pos(active_symbol, tf_enum, 0, HISTORY_BARS)

            if rates is None or len(rates) < 5:
                print(f"[BRIDGE WAIT] Waiting for rates on '{active_symbol}'... ({mt5.last_error()})")
                time.sleep(POLL_INTERVAL)
                continue

            current_bar_time = int(rates[-1]['time'])
            current_close = float(rates[-1]['close'])

            # 2. Format candles into JSON payload
            candles_payload = []
            for r in rates:
                candles_payload.append({
                    "time": int(r['time'] * 1000),  # Convert to ms
                    "open": float(r['open']),
                    "high": float(r['high']),
                    "low": float(r['low']),
                    "close": float(r['close']),
                    "volume": float(r['tick_volume']),
                })

            request_body = {
                "symbol": active_symbol,
                "timeframe": TIMEFRAME_NAME,
                "horizon": PREDICTION_HORIZON,
                "variant": MODEL_VARIANT,
                "candles": candles_payload,
            }

            # 3. Request forecast from Kronos/Chronos prediction server
            try:
                start_req = time.time()
                resp = requests.post(predict_url, json=request_body, timeout=6.0)
                roundtrip_ms = int((time.time() - start_req) * 1000)

                if resp.status_code == 200:
                    data = resp.json()
                    forecasts = data.get("forecasts", [])

                    if forecasts:
                        target_f = forecasts[-1]  # Final horizon step (e.g. T+24)
                        p10 = float(target_f.get("p10", current_close * 0.98))
                        p50 = float(target_f.get("p50", current_close))
                        p90 = float(target_f.get("p90", current_close * 1.02))
                        drift_pct = ((p50 - current_close) / current_close) * 100

            # 4. Push predicted quantiles into MetaTrader 5 Global Variables
            # KronosSignalEA reads these variables in real time on every tick
            clean_sym = active_symbol.replace(".", "_").replace("#", "_")
            mt5.global_variable_set(f"Kronos_{clean_sym}_p10", p10)
            mt5.global_variable_set(f"Kronos_{clean_sym}_p50", p50)
            mt5.global_variable_set(f"Kronos_{clean_sym}_p90", p90)
            mt5.global_variable_set(f"Kronos_{clean_sym}_spot", current_close)
            mt5.global_variable_set(f"Kronos_{clean_sym}_drift", drift_pct)
            mt5.global_variable_set(f"Kronos_{clean_sym}_updated", float(time.time()))

            # Extract trading signal if provided by /api/mt5/predict
            signal = data.get("signal", {})
            action_str = signal.get("action", "FLAT")
            action_val = 1.0 if action_str == "LONG" else (-1.0 if action_str == "SHORT" else 0.0)
            sig_sl = float(signal.get("sl", p10))
            sig_tp = float(signal.get("tp", p50))
            sig_conf = float(signal.get("confidence", 50))

            mt5.global_variable_set(f"Kronos_{clean_sym}_action", action_val)
            mt5.global_variable_set(f"Kronos_{clean_sym}_sl", sig_sl)
            mt5.global_variable_set(f"Kronos_{clean_sym}_tp", sig_tp)
            mt5.global_variable_set(f"Kronos_{clean_sym}_conf", sig_conf)

            # Write full 13-field row to kronos_signals.csv:
            # utc_ms,symbol,timeframe,variant,action,entry,sl,tp,p10,p50,p90,horizon_steps,comment
            now_ms = int(time.time() * 1000)
            csv_line = f"{now_ms},{active_symbol},{TIMEFRAME_NAME},{MODEL_VARIANT},{action_str},{current_close:.4f},{sig_sl:.4f},{sig_tp:.4f},{p10:.4f},{p50:.4f},{p90:.4f},{PREDICTION_HORIZON},Exness broker feed\n"
            for out_csv in ["kronos_signals.csv", os.path.expandvars(r"%APPDATA%\MetaQuotes\Terminal\Common\Files\kronos_signals.csv")]:
                try:
                    with open(out_csv, "a", encoding="utf-8") as kf:
                        kf.write(csv_line)
                except Exception:
                    pass

                        # Also set universal generic keys for current chart
                        mt5.global_variable_set("Kronos_p10", p10)
                        mt5.global_variable_set("Kronos_p50", p50)
                        mt5.global_variable_set("Kronos_p90", p90)
                        mt5.global_variable_set("Kronos_spot", current_close)
                        mt5.global_variable_set("Kronos_drift", drift_pct)
                        mt5.global_variable_set("Kronos_updated", float(time.time()))
                        mt5.global_variable_set("Kronos_action", action_val)
                        mt5.global_variable_set("Kronos_sl", sig_sl)
                        mt5.global_variable_set("Kronos_tp", sig_tp)
                        mt5.global_variable_set("Kronos_conf", sig_conf)

                        time_str = datetime.now().strftime("%H:%M:%S")
                        drift_sign = "+" if drift_pct >= 0 else ""
                        print(
                            f"[{time_str}] {active_symbol} Spot: {current_close:.2f} | "
                            f"Signal: {action_str} (SL: {sig_sl:.2f}, TP: {sig_tp:.2f}, Conf: {sig_conf:.0f}%) | "
                            f"p10: {p10:.2f} | p50: {p50:.2f} ({drift_sign}{drift_pct:.2f}%) | "
                            f"p90: {p90:.2f} | Latency: {roundtrip_ms}ms"
                        )
                else:
                    print(f"[BRIDGE HTTP ERROR] Server returned status {resp.status_code}: {resp.text[:120]}")

            except requests.exceptions.RequestException as e:
                print(f"[BRIDGE NETWORK ERROR] Failed to connect to {predict_url}: {e}")

            time.sleep(POLL_INTERVAL)

    except KeyboardInterrupt:
        print("\n[BRIDGE STOPPED] Shutting down connection cleanly.")
    finally:
        mt5.shutdown()


if __name__ == "__main__":
    main()
