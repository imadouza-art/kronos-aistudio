import React, { useEffect, useState } from 'react';
import { MarketAsset, ChronosForecastResult, RealtimeBacktestMetric } from '../types/chronos';
import { ArrowUpRight, ArrowDownRight, Target, Activity, ShieldCheck, Gauge } from 'lucide-react';

interface RealTimeStatsBarProps {
  asset: MarketAsset;
  timeframe?: string;
  modelVariant?: string;
  livePrice: number;
  prevPrice: number;
  forecastResult: ChronosForecastResult | null;
  backtestMetrics: RealtimeBacktestMetric;
}

export const RealTimeStatsBar: React.FC<RealTimeStatsBarProps> = ({
  asset,
  timeframe,
  modelVariant = 'chronos-100m',
  livePrice,
  prevPrice,
  forecastResult,
  backtestMetrics,
}) => {
  const isFinancialKronos = modelVariant === 'kronos-financial-100m';
  const [flash, setFlash] = useState<'up' | 'down' | null>(null);

  // Broker Prices state polled every 5 seconds from /api/broker/prices
  const [brokerPrices, setBrokerPrices] = useState<
    Record<
      string,
      {
        price: number;
        utc_ms: number;
        age_seconds: number;
        timeframe?: string;
        variant?: string;
        action?: string;
      }
    >
  >({});

  useEffect(() => {
    let isMounted = true;
    const fetchBrokerPrices = async () => {
      try {
        const res = await fetch('/api/broker/prices');
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data?.prices) {
            setBrokerPrices(data.prices);
          }
        }
      } catch {
        // silent fail
      }
    };

    fetchBrokerPrices();
    const interval = setInterval(fetchBrokerPrices, 5000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (livePrice > prevPrice) {
      setFlash('up');
      const t = setTimeout(() => setFlash(null), 700);
      return () => clearTimeout(t);
    } else if (livePrice < prevPrice) {
      setFlash('down');
      const t = setTimeout(() => setFlash(null), 700);
      return () => clearTimeout(t);
    }
  }, [livePrice, prevPrice]);

  const targetForecast =
    forecastResult && forecastResult.forecasts.length > 0
      ? forecastResult.forecasts[forecastResult.forecasts.length - 1]
      : null;

  const medianTarget = targetForecast ? targetForecast.p50 : livePrice;
  const deltaValue = medianTarget - livePrice;
  const deltaPct = livePrice > 0 ? (deltaValue / livePrice) * 100 : 0;
  const isTargetBullish = deltaValue >= 0;

  const p10 = targetForecast ? targetForecast.p10 : livePrice * 0.98;
  const p90 = targetForecast ? targetForecast.p90 : livePrice * 1.02;
  const uncertaintyWidthPct = livePrice > 0 ? ((p90 - p10) / livePrice) * 100 : 0;

  // Resolve matching broker / NT8 symbol data:
  // ES -> ES, MES -> MES, NQ -> NQ, MNQ -> MNQ, Gold -> GC/XAUUSDr, Silver -> SI/XAGUSDr
  const brokerKey =
    asset.brokerSymbol ||
    (asset.symbol === 'ES' || asset.symbol === 'MES' ? asset.symbol :
     asset.symbol === 'NQ' || asset.symbol === 'MNQ' ? asset.symbol :
     asset.symbol === 'XAUUSD' || asset.symbol === 'GC_F' ? 'GC' :
     asset.symbol === 'XAGUSD' || asset.symbol === 'SI_F' ? 'SI' :
     asset.symbol === 'NDX' ? 'NQ' :
     asset.symbol === 'DJI' ? 'YM' :
     asset.symbol === 'SPX' ? 'ES' :
     asset.symbol === 'DXY' ? 'DXYr' :
     asset.symbol);

  const matchedBrokerData =
    brokerPrices[brokerKey] ||
    (asset.symbol === 'ES' ? (brokerPrices['MES'] || brokerPrices['US500r']) : undefined) ||
    (asset.symbol === 'NQ' ? (brokerPrices['MNQ'] || brokerPrices['USTECr']) : undefined) ||
    (asset.symbol === 'XAUUSD' ? (brokerPrices['GC'] || brokerPrices['XAUUSDr'] || brokerPrices['XAUUSDm']) : undefined) ||
    (asset.symbol === 'XAGUSD' ? (brokerPrices['SI'] || brokerPrices['XAGUSDr']) : undefined) ||
    brokerPrices[asset.symbol];

  const hasBrokerPrice = Boolean(matchedBrokerData && typeof matchedBrokerData.price === 'number');
  const activeTradePrice = hasBrokerPrice ? matchedBrokerData!.price : livePrice;
  const currentAge = matchedBrokerData?.age_seconds ?? 0;
  const displaySymbol = brokerKey || asset.symbol;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {/* 1. BROKER / NT8 PRICE (Tradeable) */}
      <div
        className={`p-3 bg-slate-900 border rounded-lg transition-colors duration-300 ${
          flash === 'up'
            ? 'border-emerald-500/80 bg-emerald-950/20'
            : flash === 'down'
            ? 'border-rose-500/80 bg-rose-950/20'
            : 'border-slate-800'
        }`}
      >
        <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-bold text-amber-300 text-[11px] tracking-tight">
              {hasBrokerPrice
                ? `TRADOVATE / NT8 (${displaySymbol})`
                : asset.symbol === 'VIX'
                ? 'YAHOO PRICE (delayed)'
                : `LIVE PRICE (${displaySymbol})`}
            </span>
            {timeframe && (
              <span className="text-[10px] font-mono text-cyan-300 font-bold bg-cyan-950 px-1.5 py-0.5 rounded border border-cyan-500/50">
                {timeframe}
              </span>
            )}
          </div>
          <span
            className={`w-2 h-2 rounded-full ${
              hasBrokerPrice
                ? currentAge > 180
                  ? 'bg-rose-500 animate-pulse'
                  : currentAge > 60
                  ? 'bg-amber-400'
                  : 'bg-emerald-400'
                : flash === 'up'
                ? 'bg-emerald-400'
                : flash === 'down'
                ? 'bg-rose-400'
                : 'bg-slate-600'
            }`}
          />
        </div>

        {/* Big Live Price */}
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-black font-mono text-white tracking-tight">
            {activeTradePrice.toFixed(asset.decimals)}
          </span>
          <span className="text-[11px] text-amber-300 font-mono font-semibold">
            {asset.unit || asset.quoteAsset}
          </span>
        </div>

        {/* Age Indicator Pill (green <60s, yellow <180s, red stale) */}
        <div className="mt-1 flex items-center gap-1 font-mono text-[10px]">
          {hasBrokerPrice ? (
            <span
              className={`px-1.5 py-0.5 rounded font-bold border ${
                currentAge > 180
                  ? 'text-rose-400 bg-rose-950/80 border-rose-800/80 animate-pulse'
                  : currentAge > 60
                  ? 'text-amber-300 bg-amber-950/80 border-amber-700/80'
                  : 'text-emerald-400 bg-emerald-950/70 border-emerald-800/60'
              }`}
            >
              live {currentAge}s ago
            </span>
          ) : asset.symbol === 'VIX' ? (
            <span className="text-cyan-300 bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-800/60 font-semibold">
              Yahoo - delayed
            </span>
          ) : (
            <span className="text-slate-500 bg-slate-950/80 px-1.5 py-0.5 rounded border border-slate-800">
              NT8 standby
            </span>
          )}
        </div>

        {/* Secondary line (Yahoo delayed or Futures reference only if not VIX) */}
        {asset.symbol !== 'VIX' && (
          <div className="mt-2 pt-1.5 border-t border-slate-800/80 text-[10px] text-slate-400 flex items-center justify-between font-mono">
            <span className="text-slate-500 truncate">
              indicative:
            </span>
            <span className="text-slate-300 font-semibold ml-1 shrink-0">
              {livePrice.toFixed(asset.decimals)}
            </span>
          </div>
        )}

        {/* Tradeable Price Badge */}
        <div className="mt-2 text-[10px] text-emerald-300 bg-emerald-950/60 border border-emerald-800/40 rounded px-1.5 py-0.5 font-medium leading-tight">
          Tradeable price streamed from NinjaTrader 8 (Tradovate) chart
        </div>
      </div>

      {/* 2. Model Horizon Median Target */}
      <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg">
        <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
          <span className="flex items-center gap-1">
            <Target className={`w-3.5 h-3.5 ${isFinancialKronos ? 'text-amber-400' : 'text-cyan-400'}`} />
            <span>{isFinancialKronos ? 'Kronos Median (p50)' : 'Chronos Median (p50)'}</span>
          </span>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className={`text-xl font-bold font-mono tracking-tight ${isFinancialKronos ? 'text-amber-300' : 'text-cyan-300'}`}>
            {medianTarget.toFixed(asset.decimals)}
          </span>
        </div>
        <div
          className={`text-[11px] font-mono font-medium mt-1 flex items-center gap-0.5 ${
            isTargetBullish ? 'text-emerald-400' : 'text-rose-400'
          }`}
        >
          {isTargetBullish ? (
            <ArrowUpRight className="w-3.5 h-3.5" />
          ) : (
            <ArrowDownRight className="w-3.5 h-3.5" />
          )}
          <span>
            {isTargetBullish ? '+' : ''}
            {deltaValue.toFixed(asset.decimals)} ({deltaPct >= 0 ? '+' : ''}
            {deltaPct.toFixed(2)}%)
          </span>
        </div>
      </div>

      {/* 3. Prediction Uncertainty Bandwidth */}
      <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg">
        <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
          <span className="flex items-center gap-1">
            <Activity className="w-3.5 h-3.5 text-indigo-400" />
            <span>Uncertainty Width</span>
          </span>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-xl font-bold font-mono text-slate-100 tracking-tight">
            ±{(uncertaintyWidthPct / 2).toFixed(2)}%
          </span>
        </div>
        <div className="text-[11px] text-slate-400 mt-1 truncate">
          <span>Range: {p10.toFixed(asset.decimals)} – {p90.toFixed(asset.decimals)}</span>
        </div>
      </div>

      {/* 4. Model Scale / Anchor Factor (s) */}
      <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg">
        <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
          <span className="flex items-center gap-1">
            <Gauge className={`w-3.5 h-3.5 ${isFinancialKronos ? 'text-amber-400' : 'text-cyan-400'}`} />
            <span>{isFinancialKronos ? 'Anchor Price (s)' : 'Scale Factor (s)'}</span>
          </span>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className={`text-xl font-bold font-mono tracking-tight ${isFinancialKronos ? 'text-amber-300' : 'text-amber-300'}`}>
            {forecastResult ? forecastResult.scaleFactor.toFixed(asset.decimals <= 2 ? asset.decimals : 2) : '1.00'}
          </span>
        </div>
        <div className="text-[11px] text-slate-400 mt-1 truncate">
          <span>{isFinancialKronos ? 'K-Line Dual-Token Invariant' : 'Mean Absolute Scale invariant'}</span>
        </div>
      </div>

      {/* 5. Backtest 80% Coverage */}
      <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg">
        <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>80% CI Coverage</span>
          </span>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-xl font-bold font-mono text-emerald-400 tracking-tight">
            {backtestMetrics.coverage80.toFixed(1)}%
          </span>
          <span className="text-[10px] text-slate-400 font-mono">
            ({backtestMetrics.evaluatedPoints} ticks)
          </span>
        </div>
        <div className="text-[11px] text-slate-400 mt-1 truncate">
          <span>Points inside [p10, p90]</span>
        </div>
      </div>

      {/* 6. Real-time Accuracy (MAE / WAPE) */}
      <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg">
        <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
          <span>Forecast Error</span>
          <span className="text-[10px] text-cyan-400 font-mono">WAPE</span>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-xl font-bold font-mono text-slate-100 tracking-tight">
            {backtestMetrics.wape.toFixed(2)}%
          </span>
        </div>
        <div className="text-[11px] text-slate-400 mt-1 truncate font-mono">
          <span>MAE: {backtestMetrics.mae.toFixed(asset.decimals)}</span>
        </div>
      </div>
    </div>
  );
};
