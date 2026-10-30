import React, { useState } from 'react';
import { X, Upload, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { Candle, MarketAsset } from '../types/chronos';

interface CustomDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadCustomSeries: (customAsset: MarketAsset, candles: Candle[]) => void;
}

export const CustomDataModal: React.FC<CustomDataModalProps> = ({
  isOpen,
  onClose,
  onLoadCustomSeries,
}) => {
  if (!isOpen) return null;

  const [rawText, setRawText] = useState('');
  const [datasetName, setDatasetName] = useState('My Custom Dataset');
  const [error, setError] = useState<string | null>(null);

  const sampleData = `102.5, 103.2, 101.8, 104.0, 105.6, 107.2, 106.8, 108.4, 109.1, 107.9, 110.5, 112.3, 111.8, 113.4, 115.0, 114.2, 116.8, 118.2, 117.5, 119.9, 122.1, 121.4, 123.8, 125.0, 124.6, 126.9, 128.5, 127.8, 130.2, 131.9`;

  const handleParse = () => {
    setError(null);
    const content = rawText.trim() || sampleData;

    try {
      // Split by commas, newlines, or spaces
      const tokens = content
        .split(/[\r\n,;\t]+/)
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      const numericValues: number[] = [];
      for (const t of tokens) {
        const val = parseFloat(t);
        if (!isNaN(val)) {
          numericValues.push(val);
        }
      }

      if (numericValues.length < 5) {
        throw new Error('Please provide at least 5 numeric values for Chronos context.');
      }

      // Convert values to Candle structures
      const now = Date.now();
      const intervalMs = 60000;
      const startTime = now - numericValues.length * intervalMs;

      const candles: Candle[] = numericValues.map((val, idx) => {
        const time = startTime + idx * intervalMs;
        const prevVal = idx > 0 ? numericValues[idx - 1] : val;
        return {
          time,
          open: prevVal,
          high: Math.max(prevVal, val) * 1.002,
          low: Math.min(prevVal, val) * 0.998,
          close: val,
          volume: Math.round(100 + Math.random() * 200),
        };
      });

      const customAsset: MarketAsset = {
        symbol: 'CUSTOM',
        name: datasetName.trim() || 'Custom Time Series',
        category: 'tech',
        baseAsset: 'CUSTOM',
        quoteAsset: 'VAL',
        decimals: 2,
        initialPrice: numericValues[numericValues.length - 1],
        volatility: 0.005,
      };

      onLoadCustomSeries(customAsset, candles);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to parse custom series');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setDatasetName(file.name.replace(/\.[^/.]+$/, ''));
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (text) {
        setRawText(text);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center">
              <Upload className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">
                Import Custom Time Series
              </h3>
              <p className="text-xs text-slate-400">
                Run Chronos 100M foundation model on your own data
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
        <div className="p-5 space-y-4 overflow-y-auto text-xs text-slate-300">
          {/* Dataset Name */}
          <div className="space-y-1">
            <label className="text-slate-300 font-medium">Dataset Label:</label>
            <input
              type="text"
              value={datasetName}
              onChange={(e) => setDatasetName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
              placeholder="e.g. Factory Power Grid, Website Traffic"
            />
          </div>

          {/* File Upload Trigger */}
          <div className="p-4 border-2 border-dashed border-slate-800 hover:border-slate-700 rounded-lg text-center bg-slate-950/40 transition-colors">
            <FileText className="w-6 h-6 text-slate-500 mx-auto mb-1.5" />
            <label className="text-xs text-cyan-400 hover:underline cursor-pointer font-medium">
              <span>Choose CSV or text file</span>
              <input
                type="file"
                accept=".csv,.txt,.json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
            <p className="text-[11px] text-slate-500 mt-1">Supports numbers separated by comma, space or newline</p>
          </div>

          {/* Or Paste Values */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-slate-300 font-medium">Or Paste Values Directly:</label>
              <button
                type="button"
                onClick={() => setRawText(sampleData)}
                className="text-[11px] text-cyan-400 hover:underline cursor-pointer"
              >
                Load Sample Series
              </button>
            </div>
            <textarea
              rows={5}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="102.5, 103.2, 101.8, 104.0..."
              className="w-full bg-slate-950 border border-slate-800 rounded p-2.5 font-mono text-xs text-slate-200 focus:outline-none focus:border-cyan-500 resize-none"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-2.5 bg-rose-950/40 border border-rose-800/60 rounded text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
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
            onClick={handleParse}
            className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs rounded transition-colors shadow-md shadow-cyan-950/40 cursor-pointer"
          >
            Predict with Chronos 100M
          </button>
        </div>
      </div>
    </div>
  );
};
