import React from 'react';
import { Activity, Cpu, Sliders, Zap, Upload, Bell, RefreshCw, Clock } from 'lucide-react';
import { MarketAsset } from '../types/chronos';
import { SUPPORTED_ASSETS, TIMEFRAMES } from '../services/marketData';

interface HeaderProps {
  selectedAsset: MarketAsset;
  onSelectAsset: (asset: MarketAsset) => void;
  selectedTimeframe: string;
  onSelectTimeframe: (tf: string) => void;
  isConnected: boolean;
  connectionType: 'broker' | 'yahoo' | 'websocket' | 'simulation';
  tickCount: number;
  lastTickTime: number;
  activeModelVariant: 'chronos-100m' | 'kronos-financial-100m';
  onToggleModelVariant: (variant: 'chronos-100m' | 'kronos-financial-100m') => void;
  onOpenModelModal: () => void;
  onOpenScenarioModal: () => void;
  onOpenUploadModal: () => void;
  onOpenAlertsModal: () => void;
  onManualRecompute: () => void;
  isComputing: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  selectedAsset,
  onSelectAsset,
  selectedTimeframe,
  onSelectTimeframe,
  isConnected,
  connectionType,
  tickCount,
  activeModelVariant,
  onToggleModelVariant,
  onOpenModelModal,
  onOpenScenarioModal,
  onOpenUploadModal,
  onOpenAlertsModal,
  onManualRecompute,
  isComputing,
}) => {
  const isFinancialKronos = activeModelVariant === 'kronos-financial-100m';

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-slate-100 px-4 py-3 select-none">
      <div className="max-w-7xl mx-auto flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
        {/* Left Branding & Live Indicator */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shadow-lg transition-colors ${
              isFinancialKronos
                ? 'bg-gradient-to-br from-amber-500 to-rose-600 shadow-amber-950/40 ring-1 ring-amber-400/50'
                : 'bg-gradient-to-br from-cyan-500 to-indigo-600 shadow-cyan-950/40 ring-1 ring-cyan-400/50'
            }`}>
              <Cpu className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold tracking-tight text-sm text-white">
                  {isFinancialKronos ? 'FINANCIAL KRONOS-100M' : 'AMAZON CHRONOS-100M'}
                </span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                  isFinancialKronos
                    ? 'bg-amber-950/80 text-amber-300 border border-amber-600/40'
                    : 'bg-cyan-950/80 text-cyan-300 border border-cyan-600/40'
                }`}>
                  {isFinancialKronos ? 'AAAI 2026 K-LINE FOUNDATION' : 'AWS TIME SERIES FOUNDATION'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                <span className="text-slate-300 font-medium">
                  {isFinancialKronos
                    ? 'Dual-Token K-lines (12B Records)'
                    : 'Scale-Invariant (4,096 Bins)'}
                </span>
                <span aria-hidden="true">·</span>
                <span>100M Params</span>
                <span aria-hidden="true">·</span>
                <span className="flex items-center gap-1.5">
                  <span
                    className={`inline-block w-2 h-2 rounded-full ${
                      isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500 animate-pulse'
                    }`}
                  />
                  <span className={`font-mono text-[11px] font-semibold ${
                    isConnected ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    {isConnected
                      ? (connectionType === 'broker'
                          ? 'NinjaTrader 8 (Tradovate)'
                          : connectionType === 'yahoo'
                          ? (selectedAsset.symbol === 'VIX' ? 'Yahoo - delayed (^VIX)' : 'Yahoo (indicative)')
                          : connectionType === 'websocket'
                          ? 'Binance Live WS'
                          : 'NinjaTrader 8 (Tradovate)')
                      : 'NinjaTrader 8: Disconnected'}{' '}
                    <span className="text-slate-400 font-normal">({tickCount} ticks)</span>
                  </span>
                </span>
                <span className={`hidden 2xl:inline-flex text-[10px] rounded px-1.5 py-0.5 font-medium border ${
                  isConnected
                    ? 'text-emerald-300 bg-emerald-950/60 border-emerald-800/40'
                    : 'text-rose-300 bg-rose-950/60 border-rose-800/40'
                }`}>
                  {isConnected ? 'Feed: NinjaTrader 8 Tradovate' : 'NT8 Standby / Disconnected'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Center: Model Selector, Asset & Prominent Timeframe */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* 1. Model Family Selector */}
          <div className="flex items-center bg-slate-950/90 border border-slate-700 rounded-lg p-0.5 shadow-inner">
            <button
              onClick={() => onToggleModelVariant('chronos-100m')}
              title="Amazon Chronos 100M - Language Modeling of Continuous Time Series (AWS)"
              className={`px-3 py-1.5 text-xs font-mono font-bold rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                !isFinancialKronos
                  ? 'bg-cyan-600 text-white shadow-md ring-1 ring-cyan-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>⚡</span>
              <span>Amazon Chronos</span>
            </button>
            <button
              onClick={() => onToggleModelVariant('kronos-financial-100m')}
              title="Financial Kronos 100M - Financial Candlesticks & K-Lines Foundation Model (AAAI 2026 / NeoQuasar)"
              className={`px-3 py-1.5 text-xs font-mono font-bold rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                isFinancialKronos
                  ? 'bg-amber-600 text-white shadow-md ring-1 ring-amber-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>🏛️</span>
              <span>Financial Kronos</span>
            </button>
          </div>

          {/* 2. Asset Dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-950/90 border border-slate-700 rounded-lg px-3 py-1.5 text-xs shadow-inner">
            <span className="text-slate-400 text-[11px] font-semibold">ASSET:</span>
            <select
              value={selectedAsset.symbol}
              onChange={(e) => {
                const asset = SUPPORTED_ASSETS.find((a) => a.symbol === e.target.value);
                if (asset) onSelectAsset(asset);
              }}
              className="bg-transparent text-white font-bold focus:outline-none cursor-pointer"
            >
              <optgroup label="CME Futures (NinjaTrader 8 Tradovate)">
                {SUPPORTED_ASSETS.filter((a) => ['ES', 'MES', 'NQ', 'MNQ'].includes(a.symbol)).map((a) => (
                  <option key={a.symbol} value={a.symbol} className="bg-slate-900 text-emerald-300 font-bold">
                    📈 {a.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Gold & Precious Metals (NT8 & Yahoo)">
                {SUPPORTED_ASSETS.filter((a) => a.category === 'gold').map((a) => (
                  <option key={a.symbol} value={a.symbol} className="bg-slate-900 text-slate-100 font-medium">
                    🪙 {a.name} ({a.symbol})
                  </option>
                ))}
              </optgroup>
              <optgroup label="Major Stock & Economic Indices">
                {SUPPORTED_ASSETS.filter((a) => a.category === 'indices' && !['ES', 'MES', 'NQ', 'MNQ'].includes(a.symbol)).map((a) => (
                  <option key={a.symbol} value={a.symbol} className="bg-slate-900 text-slate-100 font-medium">
                    📊 {a.name} ({a.symbol})
                  </option>
                ))}
              </optgroup>
              <optgroup label="Cryptocurrency (Yahoo & Binance Live)">
                {SUPPORTED_ASSETS.filter((a) => a.category === 'crypto').map((a) => (
                  <option key={a.symbol} value={a.symbol} className="bg-slate-900 text-slate-100">
                    ⚡ {a.baseAsset}/{a.quoteAsset} - {a.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Forex & Tech Indicators">
                {SUPPORTED_ASSETS.filter((a) => a.category === 'forex' || a.category === 'tech').map((a) => (
                  <option key={a.symbol} value={a.symbol} className="bg-slate-900 text-slate-100">
                    {a.symbol} - {a.name}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* 3. HIGH VISIBILITY TIMEFRAME SELECTOR */}
          <div className="flex items-center gap-1.5 bg-slate-950/90 border-2 border-cyan-500/50 rounded-lg px-2.5 py-1 text-xs shadow-md">
            <Clock className="w-3.5 h-3.5 text-cyan-400 shrink-0 animate-pulse" />
            <span className="text-cyan-300 text-[11px] font-extrabold uppercase tracking-wide">TIMEFRAME:</span>
            <div className="flex items-center bg-slate-900 rounded p-0.5 border border-slate-700">
              {TIMEFRAMES.map((tf) => (
                <button
                  key={tf.value}
                  onClick={() => onSelectTimeframe(tf.value)}
                  className={`px-2 py-0.5 text-xs font-mono font-bold rounded transition-all cursor-pointer ${
                    selectedTimeframe === tf.value
                      ? 'bg-cyan-500 text-slate-950 font-black shadow-sm ring-1 ring-cyan-200'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {tf.label}
                </button>
              ))}
            </div>
          </div>

          {/* Refresh / Recompute button */}
          <button
            onClick={onManualRecompute}
            disabled={isComputing}
            title="Re-run 100M inference across current window"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 border border-slate-700 rounded-lg text-xs text-slate-200 font-semibold transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isComputing ? 'animate-spin text-cyan-400' : 'text-slate-400'}`} />
            <span>Predict Now</span>
          </button>
        </div>

        {/* Right Action Tools */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenScenarioModal}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 border border-slate-700/80 rounded-lg transition-colors cursor-pointer"
            title="Inject market shock to test model adaptation"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Stress Test</span>
          </button>

          <button
            onClick={onOpenModelModal}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 border border-slate-700/80 rounded-lg transition-colors cursor-pointer"
            title="Inspect tokenization and model parameters"
          >
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            <span>100M Specs</span>
          </button>

          <button
            onClick={onOpenAlertsModal}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 border border-slate-700/80 rounded-lg transition-colors cursor-pointer"
            title="Configure probabilistic price breach alerts"
          >
            <Bell className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Alerts</span>
          </button>

          <button
            onClick={onOpenUploadModal}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 border border-slate-700/80 rounded-lg transition-colors cursor-pointer"
            title="Upload custom time series CSV or JSON"
          >
            <Upload className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden md:inline">Custom Data</span>
          </button>
        </div>
      </div>
    </header>
  );
};
