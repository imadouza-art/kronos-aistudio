import React, { useState } from 'react';
import { ModelConfig, ChronosForecastResult } from '../types/chronos';
import { X, Sliders, Cpu, Binary, Sparkles, Key, Check } from 'lucide-react';
import { CHRONOS_VOCAB_SIZE, CHRONOS_MIN_VAL, CHRONOS_MAX_VAL } from '../services/chronosEngine';

interface ModelArchitectureModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ModelConfig;
  onUpdateConfig: (newConfig: ModelConfig) => void;
  forecastResult: ChronosForecastResult | null;
}

export const ModelArchitectureModal: React.FC<ModelArchitectureModalProps> = ({
  isOpen,
  onClose,
  config,
  onUpdateConfig,
  forecastResult,
}) => {
  if (!isOpen) return null;

  const [tempConfig, setTempConfig] = useState<ModelConfig>({ ...config });
  const [tokenInput, setTokenInput] = useState(config.hfApiToken || '');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = () => {
    onUpdateConfig({
      ...tempConfig,
      hfApiToken: tokenInput.trim() || undefined,
      useHfApi: Boolean(tokenInput.trim()),
    });
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 600);
  };

  const sampleTokens = forecastResult?.tokensInfo?.sampleTokens || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded flex items-center justify-center ${
              tempConfig.variant === 'kronos-financial-100m'
                ? 'bg-amber-500/20 border border-amber-500/40 text-amber-400'
                : 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-400'
            }`}>
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">
                {tempConfig.variant === 'kronos-financial-100m'
                  ? 'Financial Kronos 100M Architecture (AAAI 2026)'
                  : 'Amazon Chronos 100M Parameter Architecture'}
              </h3>
              <p className="text-xs text-slate-400">
                {tempConfig.variant === 'kronos-financial-100m'
                  ? 'First Foundation Model for Financial Candlesticks & K-Lines (NeoQuasar/Kronos-base)'
                  : 'Pretrained Foundation Model for Probabilistic Time Series Forecasting (AWS)'}
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

        {/* Modal Body */}
        <div className="p-5 space-y-5 overflow-y-auto text-xs text-slate-300">
          {/* Model Family Selector Buttons */}
          <div className="p-1.5 bg-slate-950 border border-slate-800 rounded-lg flex items-center gap-1.5">
            <button
              onClick={() => {
                const updated = { ...tempConfig, variant: 'kronos-financial-100m' as const };
                setTempConfig(updated);
                onUpdateConfig(updated);
              }}
              className={`flex-1 py-2 px-3 rounded text-xs font-semibold transition-all cursor-pointer ${
                tempConfig.variant === 'kronos-financial-100m'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🏛️ Financial Kronos-100M (AAAI 2026)
            </button>
            <button
              onClick={() => {
                const updated = { ...tempConfig, variant: 'chronos-100m' as const };
                setTempConfig(updated);
                onUpdateConfig(updated);
              }}
              className={`flex-1 py-2 px-3 rounded text-xs font-semibold transition-all cursor-pointer ${
                tempConfig.variant === 'chronos-100m'
                  ? 'bg-cyan-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              ⚡ Amazon Chronos-100M (AWS)
            </button>
          </div>

          {/* Architecture Specs Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 bg-slate-950/70 border border-slate-800 rounded">
              <div className="text-[10px] text-slate-400 font-mono">PARAMETERS</div>
              <div className={`text-base font-bold font-mono mt-0.5 ${
                tempConfig.variant === 'kronos-financial-100m' ? 'text-amber-400' : 'text-cyan-400'
              }`}>
                100 Million
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                {tempConfig.variant === 'kronos-financial-100m' ? 'Kronos-base' : 'Chronos-Bolt'}
              </div>
            </div>

            <div className="p-3 bg-slate-950/70 border border-slate-800 rounded">
              <div className="text-[10px] text-slate-400 font-mono">
                {tempConfig.variant === 'kronos-financial-100m' ? 'DUAL TOKEN VOCAB' : 'VOCABULARY (B)'}
              </div>
              <div className="text-base font-bold font-mono text-white mt-0.5">
                {tempConfig.variant === 'kronos-financial-100m' ? '2048 + 2048' : '4,096 Bins'}
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                {tempConfig.variant === 'kronos-financial-100m' ? 'Coarse & Fine K-lines' : 'Quantized tokens'}
              </div>
            </div>

            <div className="p-3 bg-slate-950/70 border border-slate-800 rounded">
              <div className="text-[10px] text-slate-400 font-mono">PRE-TRAINING</div>
              <div className="text-base font-bold font-mono text-emerald-300 mt-0.5">
                {tempConfig.variant === 'kronos-financial-100m' ? '12B K-Lines' : 'Synthetic TS'}
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                {tempConfig.variant === 'kronos-financial-100m' ? '45 Global Exchanges' : 'Multi-domain series'}
              </div>
            </div>

            <div className="p-3 bg-slate-950/70 border border-slate-800 rounded">
              <div className="text-[10px] text-slate-400 font-mono">ARCHITECTURE</div>
              <div className="text-base font-bold font-mono text-indigo-300 mt-0.5">
                {tempConfig.variant === 'kronos-financial-100m' ? 'Causal RoPE' : 'T5 Attention'}
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                {tempConfig.variant === 'kronos-financial-100m' ? 'Decoder-Only Causal' : 'Encoder-Decoder'}
              </div>
            </div>
          </div>

          {/* Tokenization Visualizer */}
          <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <div className={`flex items-center gap-1.5 font-mono text-[11px] font-semibold ${
                tempConfig.variant === 'kronos-financial-100m' ? 'text-amber-400' : 'text-cyan-400'
              }`}>
                <Binary className="w-3.5 h-3.5" />
                <span>
                  {tempConfig.variant === 'kronos-financial-100m'
                    ? 'KRONOS DUAL-COMPONENT K-LINE TOKENIZER'
                    : 'CHRONOS UNIFORM TOKEN DISCRETIZATION'}
                </span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                {tempConfig.variant === 'kronos-financial-100m' ? 'OHLCV Multi-Variate' : 'Univariate Clamped [-15, 15]'}
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              {tempConfig.variant === 'kronos-financial-100m' ? (
                <>
                  <strong className="text-white">Financial Kronos (AAAI 2026):</strong> Employs a specialized Transformer autoencoder to quantize multivariate K-lines into dual tokens: <em>Coarse tokens</em> encode directional returns and macro price levels, while <em>Fine tokens</em> encode intra-candle volatility, wicks, and trading activity patterns.
                </>
              ) : (
                <>
                  <strong className="text-white">Amazon Chronos:</strong> Scales continuous series by mean absolute scale factor s = (1/T) &Sigma; |y_t|, quantizes normalized values into 4,096 discrete scale-invariant tokens, and performs autoregressive multi-head self-attention.
                </>
              )}
            </p>

            {/* Token visualization bar */}
            <div>
              <div className="text-[11px] text-slate-400 font-mono mb-1.5">
                Active Context Tokens (Recent {sampleTokens.length}):
              </div>
              <div className="flex flex-wrap gap-1.5 font-mono text-[11px]">
                {sampleTokens.map((tok, i) => (
                  <span
                    key={i}
                    className={`px-2 py-0.5 rounded border font-mono ${
                      tempConfig.variant === 'kronos-financial-100m'
                        ? 'bg-amber-950/40 border-amber-800/50 text-amber-300'
                        : 'bg-cyan-950/40 border-cyan-800/50 text-cyan-300'
                    }`}
                    title={`Token ID: ${tok}`}
                  >
                    #{tok}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Inference Hyperparameters */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <span>Inference Hyperparameters</span>
            </div>

            {/* Temperature Slider */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300">Sampling Temperature (T):</span>
                <span className="font-mono text-cyan-400 font-bold">{tempConfig.temperature}</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.5"
                step="0.05"
                value={tempConfig.temperature}
                onChange={(e) =>
                  setTempConfig({ ...tempConfig, temperature: parseFloat(e.target.value) })
                }
                className="w-full accent-cyan-500 bg-slate-800 h-1.5 rounded cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>0.1 (Strict & Deterministic)</span>
                <span>0.8 (Optimal Quantiles)</span>
                <span>1.5 (High Entropy Exploration)</span>
              </div>
            </div>

            {/* Monte Carlo Sample Count */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300">Monte Carlo Sample Paths:</span>
                <span className="font-mono text-cyan-400 font-bold">{tempConfig.numSamples} paths</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                step="5"
                value={tempConfig.numSamples}
                onChange={(e) =>
                  setTempConfig({ ...tempConfig, numSamples: parseInt(e.target.value, 10) })
                }
                className="w-full accent-cyan-500 bg-slate-800 h-1.5 rounded cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>10 samples (Ultra fast)</span>
                <span>50 samples (Recommended)</span>
                <span>100 samples (Dense quantiles)</span>
              </div>
            </div>
          </div>

          {/* Hugging Face Inference API Integration (Optional) */}
          <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-slate-200 font-medium">
                <Key className="w-3.5 h-3.5 text-amber-400" />
                <span>Hugging Face Hub API Token (Optional)</span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">amazon/chronos-bolt-small</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Provide an optional Hugging Face User Access Token to run inference on Hugging Face hosted endpoints. The high-performance local Chronos 100M neural engine runs automatically if left empty.
            </p>
            <input
              type="password"
              placeholder="hf_..."
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-mono"
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-800 bg-slate-900/90">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs rounded transition-colors shadow-md shadow-cyan-950/40"
          >
            {savedSuccess ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Applied!</span>
              </>
            ) : (
              <span>Apply Parameters</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
