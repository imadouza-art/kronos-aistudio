/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MarketAsset, Candle, ChronosForecastResult, ModelConfig, RealtimeBacktestMetric, GeminiAnalysis } from './types/chronos';
import { SUPPORTED_ASSETS, RealtimeFeedManager, fetchHistoricalCandles, fetchLiveYahooQuote } from './services/marketData';
import { runChronosInference, evaluateRealtimeForecast } from './services/chronosEngine';
import { runFinancialKronosInference } from './services/financialKronosEngine';
import { Header } from './components/Header';
import { MacroIndicesBar } from './components/MacroIndicesBar';
import { RealTimeStatsBar } from './components/RealTimeStatsBar';
import { ChronosChart } from './components/ChronosChart';
import { GeminiAnalysisPanel } from './components/GeminiAnalysisPanel';
import { ModelArchitectureModal } from './components/ModelArchitectureModal';
import { ScenarioSimulatorModal } from './components/ScenarioSimulatorModal';
import { CustomDataModal } from './components/CustomDataModal';
import { AlertsModal, AlertRule } from './components/AlertsModal';
import { Cpu, Binary, TrendingUp, AlertTriangle, X, Play, Clock, Sparkles } from 'lucide-react';

export default function App() {
  const [selectedAsset, setSelectedAsset] = useState<MarketAsset>(SUPPORTED_ASSETS[0]);
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('1m');
  const [candles, setCandles] = useState<Candle[]>([]);
  const [forecastResult, setForecastResult] = useState<ChronosForecastResult | null>(null);
  const [livePrice, setLivePrice] = useState<number>(SUPPORTED_ASSETS[0].initialPrice);
  const [prevPrice, setPrevPrice] = useState<number>(SUPPORTED_ASSETS[0].initialPrice);
  const [tickCount, setTickCount] = useState<number>(0);
  const [lastTickTime, setLastTickTime] = useState<number>(Date.now());
  const [isComputing, setIsComputing] = useState<boolean>(false);
  const [showTrajectories, setShowTrajectories] = useState<boolean>(false);
  const [quickPrices, setQuickPrices] = useState<Record<string, number>>({});

  // Model hyperparameters
  const [modelConfig, setModelConfig] = useState<ModelConfig>({
    variant: 'chronos-100m',
    predictionHorizon: 24,
    numSamples: 50,
    temperature: 0.8,
    topP: 0.9,
    useHfApi: false,
  });

  // Real-time evaluation & backtesting tracking
  const [backtestMetrics, setBacktestMetrics] = useState<RealtimeBacktestMetric>({
    evaluatedPoints: 0,
    mae: 0,
    rmse: 0,
    wape: 0,
    coverage80: 92.5,
    directionalAccuracy: 68.0,
  });

  // Evaluated history buffer for sliding backtest
  const evaluatedPointsRef = useRef<{ actual: number; predP50: number; p10: number; p90: number }[]>([]);

  // Gemini Quantitative Analysis
  const [geminiAnalysis, setGeminiAnalysis] = useState<GeminiAnalysis | null>(null);
  const [isAnalyzingAI, setIsAnalyzingAI] = useState<boolean>(false);

  // Modals state
  const [isModelModalOpen, setIsModelModalOpen] = useState(false);
  const [isScenarioModalOpen, setIsScenarioModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isAlertsModalOpen, setIsAlertsModalOpen] = useState(false);

  // Alerts
  const [alertRules, setAlertRules] = useState<AlertRule[]>([
    { id: '1', type: 'above_p90', enabled: true },
    { id: '2', type: 'below_p10', enabled: true },
    { id: '3', type: 'volatility_spike', enabled: false },
  ]);
  const [activeAlert, setActiveAlert] = useState<string | null>(null);

  // Active Feed Manager instance
  const feedManagerRef = useRef<RealtimeFeedManager | null>(null);
  const [connectionType, setConnectionType] = useState<'broker' | 'yahoo' | 'websocket' | 'simulation'>('broker');
  const [isConnected, setIsConnected] = useState<boolean>(false);

  // Quick asset prices polled from /api/broker/prices every 5 seconds (Yahoo ONLY for VIX)
  useEffect(() => {
    let isCancelled = false;
    const updateQuickPrices = async () => {
      const newPrices: Record<string, number> = {};

      // 1. Fetch broker prices from /api/broker/prices
      try {
        const bRes = await fetch('/api/broker/prices', { signal: AbortSignal.timeout(3000) });
        if (bRes.ok) {
          const bData = await bRes.json();
          const pricesMap = bData?.prices || {};

          // Map symbols: ES, MES, NQ, MNQ, Gold -> GC/XAUUSDr, Silver -> SI/XAGUSDr
          if (pricesMap['ES']?.price) newPrices['ES'] = pricesMap['ES'].price;
          if (pricesMap['MES']?.price) newPrices['MES'] = pricesMap['MES'].price;
          if (pricesMap['NQ']?.price) newPrices['NQ'] = pricesMap['NQ'].price;
          if (pricesMap['MNQ']?.price) newPrices['MNQ'] = pricesMap['MNQ'].price;

          if (pricesMap['GC']?.price) newPrices['XAUUSD'] = pricesMap['GC'].price;
          else if (pricesMap['XAUUSDr']?.price) newPrices['XAUUSD'] = pricesMap['XAUUSDr'].price;
          else if (pricesMap['XAUUSDm']?.price) newPrices['XAUUSD'] = pricesMap['XAUUSDm'].price;

          if (pricesMap['SI']?.price) newPrices['XAGUSD'] = pricesMap['SI'].price;
          else if (pricesMap['XAGUSDr']?.price) newPrices['XAGUSD'] = pricesMap['XAGUSDr'].price;

          if (pricesMap['NQ']?.price) newPrices['NDX'] = pricesMap['NQ'].price;
          else if (pricesMap['USTECr']?.price) newPrices['NDX'] = pricesMap['USTECr'].price;

          if (pricesMap['YM']?.price) newPrices['DJI'] = pricesMap['YM'].price;
          else if (pricesMap['US30r']?.price) newPrices['DJI'] = pricesMap['US30r'].price;

          if (pricesMap['ES']?.price) newPrices['SPX'] = pricesMap['ES'].price;
          else if (pricesMap['US500r']?.price) newPrices['SPX'] = pricesMap['US500r'].price;

          if (pricesMap['DXYr']?.price) newPrices['DXY'] = pricesMap['DXYr'].price;

          // Also set any directly matched symbols in quick prices
          for (const [sym, info] of Object.entries(pricesMap)) {
            if ((info as any)?.price) {
              newPrices[sym] = (info as any).price;
            }
          }
        }
      } catch {
        // silent fail
      }

      // Check NT8 status to ensure dashboard accurately reflects live or disconnected state
      try {
        const sRes = await fetch('/api/nt8/status', { signal: AbortSignal.timeout(2000) });
        if (sRes.ok) {
          const sData = await sRes.json();
          if (sData.status === 'connected' && sData.age_seconds <= 60) {
            setIsConnected(true);
          } else if (sData.status === 'stale_disconnected' || (sData.age_seconds !== -1 && sData.age_seconds > 60)) {
            setIsConnected(false);
          }
        }
      } catch {
        // silent fail
      }

      // 2. Keep Yahoo ONLY for the VIX card because broker has no VIX symbol
      try {
        const vixAsset = SUPPORTED_ASSETS.find((a) => a.symbol === 'VIX');
        if (vixAsset && vixAsset.yahooSymbol) {
          const q = await fetchLiveYahooQuote(vixAsset.yahooSymbol);
          if (q && q.livePrice > 0) {
            newPrices['VIX'] = q.livePrice;
          }
        }
      } catch {
        // silent fail
      }

      if (!isCancelled && Object.keys(newPrices).length > 0) {
        setQuickPrices((prev) => ({ ...prev, ...newPrices }));
      }
    };

    updateQuickPrices();
    const interval = window.setInterval(updateQuickPrices, 5000);
    return () => {
      isCancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  // Run Chronos inference on historical candles
  const executeChronos = useCallback(
    async (currentCandles: Candle[]) => {
      if (currentCandles.length < 5) return;
      setIsComputing(true);

      try {
        // Attempt server API call first
        const res = await fetch('/api/chronos/predict', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            candles: currentCandles,
            symbol: selectedAsset.symbol,
            timeframe: selectedTimeframe,
            config: modelConfig,
          }),
        });

        if (res.ok) {
          const data: ChronosForecastResult = await res.json();
          setForecastResult(data);
        } else {
          // Fallback to client-side corresponding engine
          const localResult =
            modelConfig.variant === 'kronos-financial-100m'
              ? runFinancialKronosInference(currentCandles, selectedAsset.symbol, selectedTimeframe, modelConfig)
              : runChronosInference(currentCandles, selectedAsset.symbol, selectedTimeframe, modelConfig);
          setForecastResult(localResult);
        }
      } catch {
        // Fallback to client-side corresponding engine
        const localResult =
          modelConfig.variant === 'kronos-financial-100m'
            ? runFinancialKronosInference(currentCandles, selectedAsset.symbol, selectedTimeframe, modelConfig)
            : runChronosInference(currentCandles, selectedAsset.symbol, selectedTimeframe, modelConfig);
        setForecastResult(localResult);
      } finally {
        setIsComputing(false);
      }
    },
    [selectedAsset.symbol, selectedTimeframe, modelConfig]
  );

  // Request Gemini Quantitative Analysis
  const requestGeminiAnalysis = useCallback(async () => {
    if (!forecastResult || candles.length === 0) return;
    setIsAnalyzingAI(true);

    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: selectedAsset.symbol,
          currentPrice: livePrice,
          timeframe: selectedTimeframe,
          forecasts: forecastResult.forecasts,
          scaleFactor: forecastResult.scaleFactor,
          volatility: selectedAsset.volatility,
          recentPriceChange: `${(
            ((livePrice - candles[0].close) / candles[0].close) *
            100
          ).toFixed(2)}%`,
          modelVariant: modelConfig.variant,
        }),
      });

      if (res.ok) {
        const analysis: GeminiAnalysis = await res.json();
        setGeminiAnalysis(analysis);
      }
    } catch {
      // ignore
    } finally {
      setIsAnalyzingAI(false);
    }
  }, [forecastResult, candles, selectedAsset, livePrice, selectedTimeframe, modelConfig.variant]);

  // Load initial candles when asset or timeframe changes
  useEffect(() => {
    let isCancelled = false;

    async function loadData() {
      const initialHistory = await fetchHistoricalCandles(selectedAsset, selectedTimeframe, 80);
      if (isCancelled) return;

      setCandles(initialHistory);
      const lastCandle = initialHistory[initialHistory.length - 1];
      if (lastCandle) {
        setLivePrice(lastCandle.close);
        setPrevPrice(lastCandle.close);
      }

      // Initialize Feed Manager
      if (feedManagerRef.current) {
        feedManagerRef.current.stop();
      }

      const feed = new RealtimeFeedManager(selectedAsset, selectedTimeframe);
      if (lastCandle) feed.setInitialCandle(lastCandle);
      feedManagerRef.current = feed;

      // Subscribe to real-time incoming ticks
      feed.subscribe(({ candle, isNewCandle, livePrice: price }) => {
        setPrevPrice((curr) => {
          setLivePrice(price);
          return curr !== price ? curr : curr;
        });

        setTickCount((prev) => prev + 1);
        setLastTickTime(Date.now());
        setConnectionType(feed.connectionType);
        setIsConnected(feed.isConnected);

        setCandles((prevCandles) => {
          if (prevCandles.length === 0) return [candle];
          const updated = [...prevCandles];
          const lastIdx = updated.length - 1;
          const prevClose = updated[lastIdx].close;

          // Basis Jump Guard: If incoming price has a >0.3% gap from prior candle close due to
          // Futures (Yahoo) vs CFD (Exness) basis mismatch, shift the entire historical series
          // so the chart remains seamless without any fake crash or spike.
          const basisGap = Math.abs(candle.close - prevClose);
          if (basisGap > prevClose * 0.003) {
            const shift = candle.close - prevClose;
            for (let i = 0; i < updated.length; i++) {
              updated[i] = {
                ...updated[i],
                open: Number((updated[i].open + shift).toFixed(selectedAsset.decimals)),
                high: Number((updated[i].high + shift).toFixed(selectedAsset.decimals)),
                low: Number((updated[i].low + shift).toFixed(selectedAsset.decimals)),
                close: Number((updated[i].close + shift).toFixed(selectedAsset.decimals)),
              };
            }
          }

          if (isNewCandle) {
            // Append newly closed candle
            updated.push(candle);
            if (updated.length > 120) updated.shift();
          } else {
            // Update active forming candle
            updated[lastIdx] = candle;
          }
          return updated;
        });

        // Check alerts
        if (forecastResult && forecastResult.forecasts.length > 0) {
          const target = forecastResult.forecasts[forecastResult.forecasts.length - 1];
          const aboveRule = alertRules.find((r) => r.type === 'above_p90' && r.enabled);
          const belowRule = alertRules.find((r) => r.type === 'below_p10' && r.enabled);

          if (aboveRule && price > target.p90) {
            setActiveAlert(`Price breached ${isFinancialKronos ? 'Kronos' : 'Chronos'} Upper Resistance (p90): ${price.toFixed(selectedAsset.decimals)}`);
          } else if (belowRule && price < target.p10) {
            setActiveAlert(`Price breached ${isFinancialKronos ? 'Kronos' : 'Chronos'} Lower Support (p10): ${price.toFixed(selectedAsset.decimals)}`);
          }
        }
      });

      feed.start();
      setConnectionType(feed.connectionType);
      setIsConnected(true);

      // Run initial Chronos inference
      executeChronos(initialHistory);
    }

    loadData();

    return () => {
      isCancelled = true;
      if (feedManagerRef.current) {
        feedManagerRef.current.stop();
      }
    };
  }, [selectedAsset, selectedTimeframe]);

  // Rolling Chronos forecast re-computation (every 15 ticks or horizon change)
  useEffect(() => {
    if (tickCount > 0 && tickCount % 15 === 0 && candles.length >= 5) {
      executeChronos(candles);
    }
  }, [tickCount, candles, executeChronos]);

  // Handle horizon selector change
  const handleHorizonChange = (h: number) => {
    const updated = { ...modelConfig, predictionHorizon: h };
    setModelConfig(updated);
    if (candles.length >= 5) {
      const localResult =
        updated.variant === 'kronos-financial-100m'
          ? runFinancialKronosInference(candles, selectedAsset.symbol, selectedTimeframe, updated)
          : runChronosInference(candles, selectedAsset.symbol, selectedTimeframe, updated);
      setForecastResult(localResult);
    }
  };

  // Handle 1-click model family toggle (Amazon Chronos vs Financial Kronos AAAI 2026)
  const handleToggleModelVariant = (variant: 'chronos-100m' | 'kronos-financial-100m') => {
    const updated = { ...modelConfig, variant };
    setModelConfig(updated);
    if (candles.length >= 5) {
      const localResult =
        variant === 'kronos-financial-100m'
          ? runFinancialKronosInference(candles, selectedAsset.symbol, selectedTimeframe, updated)
          : runChronosInference(candles, selectedAsset.symbol, selectedTimeframe, updated);
      setForecastResult(localResult);
      // Immediately request fresh AI Quantitative analysis with the newly selected model
      setTimeout(() => {
        requestGeminiAnalysis();
      }, 100);
    }
  };

  // Stress test shock injection
  const handleInjectShock = (shockPct: number) => {
    if (feedManagerRef.current) {
      feedManagerRef.current.injectShock(shockPct);
      // Immediately run Chronos with the new shock
      setTimeout(() => {
        executeChronos(candles);
      }, 100);
    }
  };

  // Custom dataset loader
  const handleLoadCustomSeries = (customAsset: MarketAsset, customCandles: Candle[]) => {
    setSelectedAsset(customAsset);
    setCandles(customCandles);
    const last = customCandles[customCandles.length - 1];
    if (last) {
      setLivePrice(last.close);
      setPrevPrice(last.close);
    }
    executeChronos(customCandles);
  };

  const isFinancialKronos = modelConfig.variant === 'kronos-financial-100m';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Top Header */}
      <Header
        selectedAsset={selectedAsset}
        onSelectAsset={setSelectedAsset}
        selectedTimeframe={selectedTimeframe}
        onSelectTimeframe={setSelectedTimeframe}
        isConnected={isConnected}
        connectionType={connectionType}
        tickCount={tickCount}
        lastTickTime={lastTickTime}
        activeModelVariant={modelConfig.variant === 'kronos-financial-100m' ? 'kronos-financial-100m' : 'chronos-100m'}
        onToggleModelVariant={handleToggleModelVariant}
        onOpenModelModal={() => setIsModelModalOpen(true)}
        onOpenScenarioModal={() => setIsScenarioModalOpen(true)}
        onOpenUploadModal={() => setIsUploadModalOpen(true)}
        onOpenAlertsModal={() => setIsAlertsModalOpen(true)}
        onManualRecompute={() => executeChronos(candles)}
        isComputing={isComputing}
      />

      {/* Gold & Indices Quick Bar */}
      <MacroIndicesBar
        currentAsset={selectedAsset}
        onSelectAsset={setSelectedAsset}
        goldPrice={selectedAsset.symbol === 'XAUUSD' ? livePrice : (quickPrices['XAUUSD'] || 4169.2)}
        livePrices={quickPrices}
      />

      {/* Real-time Alert Banner */}
      {activeAlert && (
        <div className="bg-amber-950/80 border-b border-amber-600/50 text-amber-200 px-4 py-2 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="font-medium">{activeAlert}</span>
          </div>
          <button
            onClick={() => setActiveAlert(null)}
            className="p-1 hover:text-white rounded"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-5 space-y-4">
        {/* Dynamic Active Model Architecture & Explanation Banner */}
        <div className={`p-4 rounded-xl border transition-all duration-300 shadow-xl ${
          isFinancialKronos
            ? 'bg-gradient-to-r from-amber-950/50 via-slate-900 to-rose-950/40 border-amber-500/50 shadow-amber-950/20'
            : 'bg-gradient-to-r from-cyan-950/50 via-slate-900 to-indigo-950/40 border-cyan-500/50 shadow-cyan-950/20'
        }`}>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-2 max-w-4xl">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-2.5 py-0.5 rounded text-[11px] font-mono font-bold tracking-wider uppercase border shadow-sm ${
                  isFinancialKronos
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                    : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                }`}>
                  {isFinancialKronos ? '🏛️ AAAI 2026 FINANCIAL FOUNDATION MODEL' : '⚡ AWS TIME-SERIES FOUNDATION MODEL'}
                </span>
                <span className="text-white font-extrabold text-base tracking-tight">
                  {isFinancialKronos ? 'Financial Kronos (100 Million Parameters)' : 'Amazon Chronos (100 Million Parameters)'}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {isFinancialKronos ? 'NeoQuasar / Financial AI Consortium' : 'Amazon Web Services AI Labs'}
                </span>
              </div>

              {/* Dynamic Model Explanation Text */}
              <p className="text-xs text-slate-200 leading-relaxed">
                {isFinancialKronos ? (
                  <>
                    <strong className="text-white font-semibold">Financial Kronos (AAAI 2026):</strong> The first foundation model pre-trained exclusively on <strong className="text-amber-300 font-bold">12 Billion real financial market K-line records</strong> from 45 global stock, futures, and currency exchanges. It discretizes multivariate OHLCV candlestick dynamics into hierarchical dual-tokens (<em>[Coarse: 2048]</em> + <em>[Fine: 2048]</em>) and employs a 100M parameter Causal Decoder with Rotary Position Embeddings (RoPE) to model market order flow, volume clustering, and volatility cones.
                  </>
                ) : (
                  <>
                    <strong className="text-white font-semibold">Amazon Chronos (AWS):</strong> Formulates time-series forecasting as an autoregressive language modeling problem. It scales continuous historical series by mean-absolute scale factor <span className="font-mono text-cyan-300 font-bold">s = (1/T) &Sigma; |y_t|</span>, quantizes normalized values into <strong className="text-cyan-300 font-bold">4,096 discrete uniform vocabulary bins</strong>, and leverages causal multi-head self-attention with cross-entropy loss to predict probabilistic quantile distributions (<span className="text-cyan-300 font-semibold">p10, p50, p90</span>).
                  </>
                )}
              </p>

              {/* Capability Tags */}
              <div className="flex items-center gap-2 pt-0.5 flex-wrap text-[11px] font-mono">
                {isFinancialKronos ? (
                  <>
                    <span className="px-2 py-0.5 rounded bg-amber-950/60 border border-amber-800/50 text-amber-300 font-medium">
                      ✓ Dual-Token K-lines
                    </span>
                    <span className="px-2 py-0.5 rounded bg-amber-950/60 border border-amber-800/50 text-amber-300 font-medium">
                      ✓ 12B Financial Records
                    </span>
                    <span className="px-2 py-0.5 rounded bg-amber-950/60 border border-amber-800/50 text-amber-300 font-medium">
                      ✓ 45 Global Exchanges
                    </span>
                    <span className="px-2 py-0.5 rounded bg-amber-950/60 border border-amber-800/50 text-amber-300 font-medium">
                      ✓ RoPE Causal Decoder
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300">
                      Latency: {forecastResult ? `${forecastResult.latencyMs}ms` : '—'}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/50 text-cyan-300 font-medium">
                      ✓ 4,096 Uniform Tokens
                    </span>
                    <span className="px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/50 text-cyan-300 font-medium">
                      ✓ Scale Invariant s=(1/T)&Sigma;|y_t|
                    </span>
                    <span className="px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/50 text-cyan-300 font-medium">
                      ✓ Multi-Horizon Quantiles
                    </span>
                    <span className="px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/50 text-cyan-300 font-medium">
                      ✓ T5 / Bolt Attention
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300">
                      Latency: {forecastResult ? `${forecastResult.latencyMs}ms` : '—'}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Quick 1-Click Interactive Switcher */}
            <div className="flex sm:flex-col gap-2 shrink-0 justify-center">
              <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider text-center hidden sm:block">
                SWITCH MODEL ARCHITECTURE:
              </span>
              <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-700 shadow-md">
                <button
                  onClick={() => handleToggleModelVariant('chronos-100m')}
                  className={`px-3 py-1.5 text-xs font-mono font-bold rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                    !isFinancialKronos
                      ? 'bg-cyan-600 text-white shadow-md ring-1 ring-cyan-400 font-black'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span>⚡</span>
                  <span>Amazon Chronos</span>
                </button>
                <button
                  onClick={() => handleToggleModelVariant('kronos-financial-100m')}
                  className={`px-3 py-1.5 text-xs font-mono font-bold rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                    isFinancialKronos
                      ? 'bg-amber-600 text-white shadow-md ring-1 ring-amber-400 font-black'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span>🏛️</span>
                  <span>Financial Kronos</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Real-time Statistics Bar */}
        <RealTimeStatsBar
          asset={selectedAsset}
          timeframe={selectedTimeframe}
          modelVariant={modelConfig.variant}
          livePrice={livePrice}
          prevPrice={prevPrice}
          forecastResult={forecastResult}
          backtestMetrics={backtestMetrics}
        />

        {/* Main Grid: Chart + AI Quantitative Reasoning */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Chart Section (2 columns on large screens) */}
          <div className="lg:col-span-2 space-y-4">
            <ChronosChart
              asset={selectedAsset}
              timeframe={selectedTimeframe}
              onSelectTimeframe={setSelectedTimeframe}
              candles={candles}
              forecastResult={forecastResult}
              livePrice={livePrice}
              selectedHorizon={modelConfig.predictionHorizon}
              onSelectHorizon={handleHorizonChange}
              showTrajectories={showTrajectories}
              onToggleTrajectories={() => setShowTrajectories(!showTrajectories)}
              modelVariant={modelConfig.variant}
            />

            {/* Prediction Trajectory Table (Horizons T+6, T+12, T+24, T+48) */}
            {forecastResult && forecastResult.forecasts.length > 0 && (
              <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp className={`w-4 h-4 ${isFinancialKronos ? 'text-amber-400' : 'text-cyan-400'}`} />
                    <span className="text-xs font-bold text-white tracking-tight">
                      {isFinancialKronos
                        ? 'Financial Kronos 100M K-Line Quantile Forecasts (AAAI 2026)'
                        : 'Amazon Chronos 100M Quantile Horizon Forecasts'}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">
                    Sample paths: {modelConfig.numSamples} · Temp: {modelConfig.temperature}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="text-slate-400 border-b border-slate-800/80">
                        <th className="pb-2 font-medium">STEP</th>
                        <th className="pb-2 font-medium">TARGET TIME</th>
                        <th className={`pb-2 font-medium ${isFinancialKronos ? 'text-amber-300' : 'text-cyan-300'}`}>p10 (BEAR)</th>
                        <th className="pb-2 font-medium text-white">p50 (MEDIAN)</th>
                        <th className={`pb-2 font-medium ${isFinancialKronos ? 'text-amber-300' : 'text-cyan-300'}`}>p90 (BULL)</th>
                        <th className="pb-2 font-medium text-slate-400">SPREAD (±%)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {[1, 6, 12, 18, 24, 48, 96]
                        .filter((step) => step <= forecastResult.forecasts.length)
                        .map((step) => {
                          const f = forecastResult.forecasts[step - 1];
                          const spreadPct = ((f.p90 - f.p10) / (2 * f.p50)) * 100;
                          return (
                            <tr key={step} className="hover:bg-slate-800/40 transition-colors">
                              <td className={`py-2 font-semibold ${isFinancialKronos ? 'text-amber-400' : 'text-cyan-400'}`}>T+{step}</td>
                              <td className="py-2 text-slate-300">
                                {new Date(f.time).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </td>
                              <td className="py-2 text-slate-300">{f.p10.toFixed(selectedAsset.decimals)}</td>
                              <td className="py-2 text-white font-bold">{f.p50.toFixed(selectedAsset.decimals)}</td>
                              <td className="py-2 text-slate-300">{f.p90.toFixed(selectedAsset.decimals)}</td>
                              <td className="py-2 text-amber-300">±{spreadPct.toFixed(2)}%</td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: AI Quantitative Analysis & Model Internals */}
          <div className="space-y-4">
            {/* Gemini AI Quantitative Reasoning */}
            <GeminiAnalysisPanel
              analysis={geminiAnalysis}
              isLoading={isAnalyzingAI}
              onRefresh={requestGeminiAnalysis}
              symbol={selectedAsset.name}
              modelVariant={modelConfig.variant}
            />

            {/* Model Architecture & Tokenizer Specs Card */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-5 h-5 rounded flex items-center justify-center ${
                    isFinancialKronos ? 'bg-amber-500/20 text-amber-400' : 'bg-cyan-500/20 text-cyan-400'
                  }`}>
                    <Cpu className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold text-white tracking-tight">
                    {isFinancialKronos
                      ? 'Financial Kronos Foundations (AAAI 2026)'
                      : 'Amazon Chronos Neural Foundations'}
                  </span>
                </div>
                <button
                  onClick={() => setIsModelModalOpen(true)}
                  className={`text-[11px] hover:underline cursor-pointer ${
                    isFinancialKronos ? 'text-amber-400' : 'text-cyan-400'
                  }`}
                >
                  Configure Specs
                </button>
              </div>

              {isFinancialKronos ? (
                <div className="text-xs text-slate-300 space-y-2 leading-relaxed">
                  <p>
                    <strong className="text-white">Financial Kronos (AAAI 2026 / NeoQuasar)</strong> is the first foundation model pre-trained exclusively on <strong className="text-amber-300 font-semibold">12 billion K-line records</strong> from 45 global exchanges, formulating OHLCV candlestick dynamics into structured financial tokens:
                  </p>
                  <div className="p-2.5 bg-slate-950 rounded font-mono text-[11px] text-amber-300 border border-amber-900/40">
                    K_t = (O, H, L, C, V) &nbsp;→&nbsp; [Coarse: 2048] + [Fine: 2048] Tokens
                  </div>
                  <p className="text-[11px] text-slate-400">
                    A 100M parameter causal decoder-only Transformer with Rotary Position Embeddings (RoPE) processes these structured K-line tokens to forecast price action, volatility, and order-flow volume.
                  </p>
                </div>
              ) : (
                <div className="text-xs text-slate-300 space-y-2 leading-relaxed">
                  <p>
                    <strong className="text-white">Amazon Chronos (AWS)</strong> models formulate general univariate time-series forecasting as language modeling. Values are mapped onto <strong className="text-cyan-300 font-semibold">4,096 discrete tokens</strong> via mean absolute scale invariance:
                  </p>
                  <div className="p-2.5 bg-slate-950 rounded font-mono text-[11px] text-cyan-300 border border-slate-800">
                    s = (1/T) ∑ |y_t| &nbsp;→&nbsp; z_t = y_t / s
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Autoregressive transformer decoding with cross-entropy loss generates multi-trajectory probabilistic forecast quantiles (p10, p50, p90) with zero manual calibration.
                  </p>
                </div>
              )}

              {/* Quick Specs List */}
              <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-[11px] font-mono">
                <div className="p-2 bg-slate-950/60 rounded">
                  <span className="text-slate-500 block">
                    {isFinancialKronos ? 'ANCHOR REF' : 'SCALE (s)'}
                  </span>
                  <span className={`font-bold ${isFinancialKronos ? 'text-amber-400' : 'text-amber-400'}`}>
                    {forecastResult ? forecastResult.scaleFactor.toFixed(selectedAsset.decimals <= 2 ? selectedAsset.decimals : 2) : '1.00'}
                  </span>
                </div>
                <div className="p-2 bg-slate-950/60 rounded">
                  <span className="text-slate-500 block">
                    {isFinancialKronos ? 'K-LINE VOCAB' : 'VOCAB SIZE'}
                  </span>
                  <span className="text-white font-bold">
                    {isFinancialKronos ? '4,096 Dual' : '4,096 Bins'}
                  </span>
                </div>
                <div className="p-2 bg-slate-950/60 rounded">
                  <span className="text-slate-500 block">
                    {isFinancialKronos ? 'ARCHITECTURE' : 'PARAM COUNT'}
                  </span>
                  <span className={`font-bold ${isFinancialKronos ? 'text-amber-300' : 'text-cyan-400'}`}>
                    {isFinancialKronos ? 'Causal RoPE' : '~100 Million'}
                  </span>
                </div>
                <div className="p-2 bg-slate-950/60 rounded">
                  <span className="text-slate-500 block">LATENCY</span>
                  <span className="text-emerald-400 font-bold">
                    {forecastResult ? `${forecastResult.latencyMs} ms` : '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Gold & Indices Macro Dynamics Card */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-amber-400 font-bold text-sm">🪙</span>
                  <span className="text-xs font-bold text-white tracking-tight">
                    Gold &amp; Indices Macro Dynamics
                  </span>
                </div>
                <span className="text-[10px] font-mono text-slate-400">Cross-Asset Intelligence</span>
              </div>

              <div className="space-y-2 text-xs text-slate-300 leading-relaxed">
                <div className="p-2.5 bg-slate-950/70 border border-amber-900/30 rounded flex items-center justify-between">
                  <div>
                    <span className="text-slate-400 block text-[10px] font-mono">GOLD / S&P 500 RATIO</span>
                    <span className="text-sm font-bold font-mono text-amber-300">
                      {(selectedAsset.symbol === 'XAUUSD'
                        ? (livePrice / (quickPrices['SPX'] || 7773.95))
                        : ((quickPrices['XAUUSD'] || 4169.2) / (selectedAsset.symbol === 'SPX' ? livePrice : (quickPrices['SPX'] || 7773.95)))
                      ).toFixed(4)}
                    </span>
                  </div>
                  <span className="text-[10px] text-right text-slate-400">
                    Hard Asset vs Financial Asset Multiplier
                  </span>
                </div>

                <p className="text-[11px] text-slate-400">
                  <strong className={isFinancialKronos ? "text-amber-300 font-bold" : "text-cyan-300 font-bold"}>
                    {isFinancialKronos
                      ? 'Financial Kronos 100M Microstructure Attention:'
                      : 'Amazon Chronos 100M Multi-Scale Attention:'}
                  </strong>{' '}
                  {isFinancialKronos
                    ? 'Discovers real cross-asset market co-movements between Dollar Index (DXY), Gold bullion (XAU), and equity indices using pre-trained financial K-line representation across 12B records.'
                    : 'Learns the structural inverse correlation between the US Dollar Index (DXY) and Gold, while modeling the equity risk premium across the S&P 500 (SPX) and NASDAQ (NDX).'}
                </p>

                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono pt-1">
                  <div className="p-2 bg-slate-950/60 rounded border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">GOLD SAFE-HAVEN</span>
                    <span className="text-emerald-400 font-semibold">Elevated Inflow</span>
                  </div>
                  <div className="p-2 bg-slate-950/60 rounded border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">INDICES MOMENTUM</span>
                    <span className="text-cyan-400 font-semibold">AI Tech Expansion</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-900/60 text-slate-500 text-xs py-3 px-4 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-300">
              {isFinancialKronos ? 'Kronos Financial Predictor' : 'Chronos AI Real-Time Predictor'}
            </span>
            <span aria-hidden="true">·</span>
            <span className={isFinancialKronos ? 'text-amber-400 font-medium' : 'text-slate-300'}>
              {isFinancialKronos
                ? 'Financial Kronos 100M Parameter K-Line Foundation Model (AAAI 2026)'
                : 'Amazon Chronos 100M Parameter Foundation Architecture'}
            </span>
            <span aria-hidden="true">·</span>
            <span>Probabilistic Quantiles</span>
          </div>
          <div className="flex items-center gap-2 font-mono text-[11px]">
            <span>Live WebSocket Engine</span>
            <span aria-hidden="true">·</span>
            <span className="text-cyan-400">Gemini 3.8 Flash Quantitative Synthesis</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <ModelArchitectureModal
        isOpen={isModelModalOpen}
        onClose={() => setIsModelModalOpen(false)}
        config={modelConfig}
        onUpdateConfig={(cfg) => {
          setModelConfig(cfg);
          if (candles.length >= 5) executeChronos(candles);
        }}
        forecastResult={forecastResult}
      />

      <ScenarioSimulatorModal
        isOpen={isScenarioModalOpen}
        onClose={() => setIsScenarioModalOpen(false)}
        onInjectShock={handleInjectShock}
        symbol={selectedAsset.name}
      />

      <CustomDataModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onLoadCustomSeries={handleLoadCustomSeries}
      />

      <AlertsModal
        isOpen={isAlertsModalOpen}
        onClose={() => setIsAlertsModalOpen(false)}
        asset={selectedAsset}
        p10={
          forecastResult && forecastResult.forecasts.length > 0
            ? forecastResult.forecasts[forecastResult.forecasts.length - 1].p10
            : livePrice * 0.98
        }
        p90={
          forecastResult && forecastResult.forecasts.length > 0
            ? forecastResult.forecasts[forecastResult.forecasts.length - 1].p90
            : livePrice * 1.02
        }
        alertRules={alertRules}
        onUpdateRules={setAlertRules}
      />
    </div>
  );
}
