import React from 'react';
import { MarketAsset } from '../types/chronos';
import { SUPPORTED_ASSETS } from '../services/marketData';
import { Coins, TrendingUp, DollarSign, Activity, Sparkles } from 'lucide-react';

interface MacroIndicesBarProps {
  currentAsset: MarketAsset;
  onSelectAsset: (asset: MarketAsset) => void;
  goldPrice: number;
  spxPrice?: number;
  livePrices?: Record<string, number>;
}

export const MacroIndicesBar: React.FC<MacroIndicesBarProps> = ({
  currentAsset,
  onSelectAsset,
  goldPrice,
  livePrices = {},
}) => {
  // Highlighted quick assets for CME Futures, Gold & Indices
  const quickSymbols = ['ES', 'NQ', 'MES', 'MNQ', 'XAUUSD', 'SPX', 'NDX', 'DXY', 'VIX'];
  const quickAssets = quickSymbols
    .map((sym) => SUPPORTED_ASSETS.find((a) => a.symbol === sym))
    .filter((a): a is MarketAsset => Boolean(a));

  // S&P 500 / ES asset price
  const esAsset = SUPPORTED_ASSETS.find((a) => a.symbol === 'ES');
  const esCurrentPrice = livePrices['ES'] || livePrices['SPX'] || (esAsset ? esAsset.initialPrice : 5882.25);

  // Gold to S&P 500 Macro Ratio
  const currentGold = livePrices['XAUUSD'] || livePrices['GC'] || goldPrice;
  const goldToSpxRatio = currentGold > 0 && esCurrentPrice > 0 ? (currentGold / esCurrentPrice).toFixed(4) : '0.6985';

  return (
    <div className="bg-slate-900/90 border-b border-slate-800 text-xs px-4 py-2">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-2 overflow-x-auto">
        {/* Left: Quick Switcher for NT8 Futures, Gold & Indices */}
        <div className="flex items-center gap-1.5 flex-nowrap shrink-0">
          <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 mr-1 shrink-0">
            <Coins className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">NT8 LIVE:</span>
          </div>

          <div className="flex items-center gap-1 overflow-x-auto py-0.5 no-scrollbar">
            {quickAssets.map((asset) => {
              const isSelected = currentAsset.symbol === asset.symbol;
              const isGold = asset.category === 'gold';
              const isIndex = asset.category === 'indices';
              const price = livePrices[asset.symbol] ?? (asset.symbol === 'XAUUSD' ? goldPrice : asset.initialPrice);

              return (
                <button
                  key={asset.symbol}
                  onClick={() => onSelectAsset(asset)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium transition-all shrink-0 cursor-pointer ${
                    isSelected
                      ? isGold
                        ? 'bg-amber-500/20 border border-amber-500/50 text-amber-200 font-bold shadow-sm'
                        : 'bg-cyan-500/20 border border-cyan-500/50 text-cyan-200 font-bold shadow-sm'
                      : 'bg-slate-800/70 hover:bg-slate-700/80 border border-slate-700/70 text-slate-300 hover:text-white'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isSelected
                        ? isGold ? 'bg-amber-400 animate-pulse' : 'bg-cyan-400 animate-pulse'
                        : isGold ? 'bg-amber-400' : isIndex ? 'bg-cyan-400' : 'bg-slate-400'
                    }`}
                  />
                  <span className="font-mono font-bold">{asset.brokerSymbol ? asset.brokerSymbol.replace(/r$/, '') : asset.baseAsset}</span>
                  <span className="text-[10px] text-slate-300 font-mono font-semibold">
                    {price.toFixed(asset.decimals <= 2 ? asset.decimals : 2)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Macro Relative Strength (Gold / S&P 500 Ratio) */}
        <div className="flex items-center gap-3 shrink-0 text-[11px] text-slate-400 font-mono">
          <div className="flex items-center gap-1.5 bg-slate-950/70 border border-slate-800 px-2 py-1 rounded">
            <span className="text-amber-400 font-bold">XAU / SPX:</span>
            <span className="text-slate-200 font-semibold">{goldToSpxRatio}</span>
            <span className="text-[10px] text-slate-500 hidden lg:inline">(Gold vs Equity Multiplier)</span>
          </div>

          <div className="hidden xl:flex items-center gap-1.5 text-slate-400">
            <span>DXY Dollar Index:</span>
            <span className="text-slate-200 font-bold">
              {(livePrices['DXY'] || 102.10).toFixed(2)}
            </span>
            <span className="text-[10px] text-emerald-400 font-semibold">Exness Feed</span>
          </div>
        </div>
      </div>
    </div>
  );
};
