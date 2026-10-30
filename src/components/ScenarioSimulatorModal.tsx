import React from 'react';
import { X, Zap, ArrowUpRight, ArrowDownRight, Activity, RotateCcw } from 'lucide-react';

interface ScenarioSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInjectShock: (shockPct: number) => void;
  symbol: string;
}

export const ScenarioSimulatorModal: React.FC<ScenarioSimulatorModalProps> = ({
  isOpen,
  onClose,
  onInjectShock,
  symbol,
}) => {
  if (!isOpen) return null;

  const scenarios = [
    {
      title: 'Gold Safe-Haven Flight',
      description: 'Simulates flight-to-safety capital flows boosting bullion & precious metals (+2.2%).',
      shockPct: 0.022,
      icon: ArrowUpRight,
      color: 'text-amber-400 bg-amber-950/40 border-amber-500/40',
      badge: 'Safe Haven +2.2%',
    },
    {
      title: 'Interest Rate Cut Impulse',
      description: 'Simulates lower real yields & liquidity injection lifting Indices & Gold (+1.8%).',
      shockPct: 0.018,
      icon: ArrowUpRight,
      color: 'text-emerald-400 bg-emerald-950/40 border-emerald-500/40',
      badge: 'Macro Cut +1.8%',
    },
    {
      title: 'Dollar Spike Retracement',
      description: 'Simulates a sudden surge in the DXY Dollar Index pressing commodities (-1.4%).',
      shockPct: -0.014,
      icon: RotateCcw,
      color: 'text-cyan-400 bg-cyan-950/40 border-cyan-500/40',
      badge: 'DXY Surge -1.4%',
    },
    {
      title: 'Flash Cascading Sell-Off',
      description: 'Simulates rapid liquidation across futures and equity margin calls (-2.8%).',
      shockPct: -0.028,
      icon: ArrowDownRight,
      color: 'text-rose-400 bg-rose-950/40 border-rose-500/40',
      badge: 'Dump -2.8%',
    },
    {
      title: 'Volatility Expansion Shock',
      description: 'Injects sudden two-sided volatility expansion across the order book.',
      shockPct: 0.012,
      icon: Activity,
      color: 'text-indigo-400 bg-indigo-950/40 border-indigo-500/40',
      badge: 'High Vol',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
              <Zap className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">
                Scenario Simulator & Stress Tester
              </h3>
              <p className="text-xs text-slate-400">
                Observe how Chronos 100M adapts its prediction fan in real-time
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-md transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-3">
          <p className="text-xs text-slate-400 leading-relaxed">
            Click any scenario to inject an immediate micro-structure shock into the real-time tick stream for <span className="text-white font-semibold">{symbol}</span>. The Chronos foundation model will re-quantize the tokens and re-estimate future probability distributions instantly.
          </p>

          <div className="space-y-2.5 pt-2">
            {scenarios.map((sc, i) => {
              const Icon = sc.icon;
              return (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 bg-slate-950/60 hover:bg-slate-950 border border-slate-800/80 hover:border-slate-700 rounded-lg transition-all"
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded border mt-0.5 ${sc.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-white">{sc.title}</span>
                        <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${sc.color}`}>
                          {sc.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">{sc.description}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      onInjectShock(sc.shockPct);
                      onClose();
                    }}
                    className="ml-3 shrink-0 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 active:bg-cyan-600 text-slate-200 hover:text-white text-xs font-medium rounded border border-slate-700 transition-colors cursor-pointer"
                  >
                    Inject Shock
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end px-5 py-3 border-t border-slate-800 bg-slate-900/90">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
