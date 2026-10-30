import React from 'react';
import { GeminiAnalysis } from '../types/chronos';
import { Sparkles, Compass, ShieldAlert, CheckCircle2, TrendingUp, RefreshCw, Layers } from 'lucide-react';

interface GeminiAnalysisPanelProps {
  analysis: GeminiAnalysis | null;
  isLoading: boolean;
  onRefresh: () => void;
  symbol: string;
  modelVariant?: string;
}

export const GeminiAnalysisPanel: React.FC<GeminiAnalysisPanelProps> = ({
  analysis,
  isLoading,
  onRefresh,
  symbol,
  modelVariant = 'chronos-100m',
}) => {
  const isFinancialKronos = modelVariant === 'kronos-financial-100m';

  if (!analysis && !isLoading) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 text-center">
        <Sparkles className={`w-8 h-8 mx-auto mb-2 ${isFinancialKronos ? 'text-amber-400' : 'text-cyan-400'}`} />
        <h3 className="text-sm font-semibold text-slate-200">
          {isFinancialKronos ? 'Financial Kronos AI Synthesis' : 'AI Quantitative Synthesis'}
        </h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 mb-4">
          {isFinancialKronos
            ? 'Synthesize Financial Kronos 100M (AAAI 2026) dual-component K-line tokens with deep reasoning to detect market regimes, order flow, and candlestick microstructure.'
            : 'Synthesize Amazon Chronos 100M tokenized distributions with deep reasoning to detect market regimes and risk envelopes.'}
        </p>
        <button
          onClick={onRefresh}
          className={`px-4 py-2 text-white text-xs font-semibold rounded-md shadow-md transition-all cursor-pointer ${
            isFinancialKronos
              ? 'bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 shadow-amber-950/40'
              : 'bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 shadow-cyan-950/40'
          }`}
        >
          Generate AI Quantitative Insights
        </button>
      </div>
    );
  }

  const getRegimeColor = (regime?: string) => {
    switch (regime) {
      case 'Strong Bullish Trend':
      case 'Moderate Bullish':
        return 'text-emerald-400 bg-emerald-950/40 border-emerald-500/40';
      case 'Severe Bearish Breakdown':
      case 'Moderate Bearish':
        return 'text-rose-400 bg-rose-950/40 border-rose-500/40';
      case 'High Volatility Squeeze':
        return 'text-amber-400 bg-amber-950/40 border-amber-500/40';
      default:
        return 'text-cyan-400 bg-cyan-950/40 border-cyan-500/40';
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 sm:p-5 relative overflow-hidden">
      {/* Subtle background glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-tight">AI Quantitative Reasoning</h3>
              <span className="text-[10px] font-mono text-cyan-400">Gemini 3.8 Flash</span>
            </div>
            <div className="text-[11px] text-slate-400 flex items-center gap-2">
              <span className={isFinancialKronos ? 'text-amber-300 font-medium' : 'text-cyan-300 font-medium'}>
                {isFinancialKronos
                  ? 'Synthesizing Financial Kronos 100M K-line dual tokens (AAAI 2026)'
                  : 'Synthesizing Amazon Chronos 100M probabilistic quantiles'}
              </span>
              <span aria-hidden="true">·</span>
              <span>{symbol}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {analysis && (
            <span className="text-[11px] font-mono text-slate-500">
              Updated {new Date(analysis.analyzedAt).toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 border border-slate-700 text-xs text-slate-200 font-medium rounded transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-cyan-400' : 'text-slate-400'}`} />
            <span>{isLoading ? 'Synthesizing...' : 'Refresh AI'}</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="py-8 flex flex-col items-center justify-center space-y-3">
          <div className={`w-8 h-8 border-2 border-t-transparent rounded-full animate-spin ${
            isFinancialKronos ? 'border-amber-400' : 'border-cyan-500'
          }`} />
          <p className="text-xs text-slate-400 font-mono">
            {isFinancialKronos
              ? 'Evaluating Financial Kronos 100M K-line dual tokens, order flow and volatility cones...'
              : 'Evaluating Amazon Chronos 100M quantile distribution and multi-horizon variance...'}
          </p>
        </div>
      ) : analysis ? (
        <div className="space-y-4">
          {/* Regime & Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Regime */}
            <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-md">
              <div className="text-[11px] font-mono text-slate-400 mb-1">MARKET REGIME</div>
              <div className="flex items-center justify-between gap-2">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${getRegimeColor(analysis.marketRegime)}`}>
                  {analysis.marketRegime}
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  {analysis.regimeConfidence}% Conf.
                </span>
              </div>
            </div>

            {/* Expected Movement */}
            <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-md">
              <div className="text-[11px] font-mono text-slate-400 mb-1">DIRECTIONAL OUTLOOK</div>
              <p className="text-xs font-medium text-slate-200 truncate">
                {analysis.expectedHorizonMovement}
              </p>
            </div>

            {/* Recommended Action */}
            <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-md">
              <div className="text-[11px] font-mono text-slate-400 mb-1">STRATEGIC POSTURE</div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>{analysis.recommendedAction}</span>
              </div>
            </div>
          </div>

          {/* Synthesis Narrative */}
          <div className="p-3.5 bg-slate-950/40 border border-slate-800/80 rounded-md">
            <div className="text-xs text-slate-300 leading-relaxed">
              {analysis.summary}
            </div>
          </div>

          {/* Key Boundary Levels & Trading Implications */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Model Key Levels */}
            <div className="space-y-2">
              <div className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
                <Compass className={`w-3.5 h-3.5 ${isFinancialKronos ? 'text-amber-400' : 'text-cyan-400'}`} />
                <span className="font-bold">
                  {isFinancialKronos ? 'KRONOS QUANTILE BOUNDARIES (AAAI 2026)' : 'CHRONOS QUANTILE BOUNDARIES (AWS)'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="p-2.5 bg-slate-950/80 border border-rose-900/30 rounded text-center">
                  <div className="text-[10px] text-slate-400 font-mono">RESISTANCE (p90)</div>
                  <div className="text-xs font-bold font-mono text-rose-300 mt-0.5">
                    {analysis.keyLevels.resistance.toFixed(2)}
                  </div>
                </div>
                <div className="p-2.5 bg-slate-950/80 border border-cyan-900/30 rounded text-center">
                  <div className="text-[10px] text-slate-400 font-mono">MEDIAN PIVOT (p50)</div>
                  <div className="text-xs font-bold font-mono text-cyan-300 mt-0.5">
                    {analysis.keyLevels.pivot.toFixed(2)}
                  </div>
                </div>
                <div className="p-2.5 bg-slate-950/80 border border-emerald-900/30 rounded text-center">
                  <div className="text-[10px] text-slate-400 font-mono">SUPPORT (p10)</div>
                  <div className="text-xs font-bold font-mono text-emerald-300 mt-0.5">
                    {analysis.keyLevels.support.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>

            {/* Trading & Anomaly Insights */}
            <div className="space-y-2">
              <div className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                <span>QUANTITATIVE IMPLICATIONS</span>
              </div>
              <ul className="space-y-1.5 text-xs text-slate-300">
                {analysis.tradingImplications.map((imp, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-cyan-400 mt-0.5">▸</span>
                    <span>{imp}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
