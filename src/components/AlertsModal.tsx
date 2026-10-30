import React, { useState } from 'react';
import { X, Bell, ShieldCheck, Check } from 'lucide-react';
import { MarketAsset } from '../types/chronos';

export interface AlertRule {
  id: string;
  type: 'above_p90' | 'below_p10' | 'volatility_spike';
  enabled: boolean;
  targetPrice?: number;
}

interface AlertsModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: MarketAsset;
  p10: number;
  p90: number;
  alertRules: AlertRule[];
  onUpdateRules: (rules: AlertRule[]) => void;
}

export const AlertsModal: React.FC<AlertsModalProps> = ({
  isOpen,
  onClose,
  asset,
  p10,
  p90,
  alertRules,
  onUpdateRules,
}) => {
  if (!isOpen) return null;

  const [rules, setRules] = useState<AlertRule[]>([...alertRules]);
  const [saved, setSaved] = useState(false);

  const toggleRule = (type: AlertRule['type']) => {
    setRules((prev) =>
      prev.map((r) => (r.type === type ? { ...r, enabled: !r.enabled } : r))
    );
  };

  const handleSave = () => {
    onUpdateRules(rules);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center">
              <Bell className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">
                Probabilistic Prediction Alerts
              </h3>
              <p className="text-xs text-slate-400">
                Trigger real-time notifications on Chronos quantile boundary breaches
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
        <div className="p-5 space-y-3.5 text-xs text-slate-300">
          <p className="text-xs text-slate-400">
            Set triggers that notify you when real-time incoming market ticks breach the bounds forecasted by Chronos 100M:
          </p>

          <div className="space-y-2.5 pt-1">
            {/* Rule 1: Upper Bound Breach (p90) */}
            <label className="flex items-center justify-between p-3 bg-slate-950/60 border border-slate-800 rounded-lg cursor-pointer hover:bg-slate-950 transition-colors">
              <div className="space-y-0.5">
                <span className="font-semibold text-white block">
                  Upper Resistance Breach (&gt; p90)
                </span>
                <span className="text-[11px] text-slate-400 block font-mono">
                  Trigger if price exceeds {p90.toFixed(asset.decimals)} {asset.quoteAsset}
                </span>
              </div>
              <input
                type="checkbox"
                checked={rules.find((r) => r.type === 'above_p90')?.enabled ?? true}
                onChange={() => toggleRule('above_p90')}
                className="w-4 h-4 accent-cyan-500 cursor-pointer"
              />
            </label>

            {/* Rule 2: Lower Bound Breach (p10) */}
            <label className="flex items-center justify-between p-3 bg-slate-950/60 border border-slate-800 rounded-lg cursor-pointer hover:bg-slate-950 transition-colors">
              <div className="space-y-0.5">
                <span className="font-semibold text-white block">
                  Lower Support Floor Breach (&lt; p10)
                </span>
                <span className="text-[11px] text-slate-400 block font-mono">
                  Trigger if price drops below {p10.toFixed(asset.decimals)} {asset.quoteAsset}
                </span>
              </div>
              <input
                type="checkbox"
                checked={rules.find((r) => r.type === 'below_p10')?.enabled ?? true}
                onChange={() => toggleRule('below_p10')}
                className="w-4 h-4 accent-cyan-500 cursor-pointer"
              />
            </label>

            {/* Rule 3: Volatility Spike */}
            <label className="flex items-center justify-between p-3 bg-slate-950/60 border border-slate-800 rounded-lg cursor-pointer hover:bg-slate-950 transition-colors">
              <div className="space-y-0.5">
                <span className="font-semibold text-white block">
                  High Volatility Expansion Alert
                </span>
                <span className="text-[11px] text-slate-400 block font-mono">
                  Trigger if uncertainty band (p90 - p10) widens &gt; 5%
                </span>
              </div>
              <input
                type="checkbox"
                checked={rules.find((r) => r.type === 'volatility_spike')?.enabled ?? false}
                onChange={() => toggleRule('volatility_spike')}
                className="w-4 h-4 accent-cyan-500 cursor-pointer"
              />
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-800 bg-slate-900/90">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs rounded transition-colors shadow-md shadow-cyan-950/40 cursor-pointer"
          >
            {saved ? <Check className="w-3.5 h-3.5" /> : null}
            <span>{saved ? 'Saved!' : 'Save Triggers'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
