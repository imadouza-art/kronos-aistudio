export interface Candle {
  time: number; // Unix timestamp in ms
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface ChronosPointForecast {
  time: number;
  p10: number; // 10th percentile (lower bound)
  p25: number;
  p50: number; // Median (expected value)
  p75: number;
  p90: number; // 90th percentile (upper bound)
  mean: number;
  stdDev: number;
}

export interface ChronosForecastResult {
  symbol: string;
  timeframe: string;
  horizon: number;
  scaleFactor: number;
  historicalLength: number;
  forecasts: ChronosPointForecast[];
  trajectories?: number[][]; // [sampleIdx][stepIdx]
  generatedAt: number;
  modelVariant: string;
  latencyMs: number;
  tokensInfo: {
    minToken: number;
    maxToken: number;
    vocabSize: number;
    tokenCount: number;
    sampleTokens: number[];
  };
}

export interface RealtimeBacktestMetric {
  evaluatedPoints: number;
  mae: number;
  rmse: number;
  wape: number; // %
  coverage80: number; // % of actual prices within [p10, p90]
  directionalAccuracy: number; // % correct sign
}

export interface ModelConfig {
  variant: 'chronos-100m' | 'kronos-financial-100m' | 'chronos-bolt-small' | 'chronos-t5-small';
  predictionHorizon: number; // 12, 24, 48, 96
  numSamples: number; // 20 to 100
  temperature: number; // 0.1 to 1.5
  topP: number;
  hfApiToken?: string;
  useHfApi: boolean;
}

export interface MarketAsset {
  symbol: string;
  name: string;
  category: 'gold' | 'indices' | 'crypto' | 'forex' | 'commodities' | 'tech';
  baseAsset: string;
  quoteAsset: string;
  decimals: number;
  brokerSymbol?: string;
  binanceSymbol?: string;
  yahooSymbol?: string;
  initialPrice: number;
  volatility: number;
  unit?: string;
  macroRole?: string;
  isFuturesFallback?: boolean;
  priceNote?: string;
}

export interface GeminiAnalysis {
  marketRegime: 'Strong Bullish Trend' | 'Moderate Bullish' | 'Consolidation / Range' | 'Moderate Bearish' | 'Severe Bearish Breakdown' | 'High Volatility Squeeze';
  regimeConfidence: number; // 0 - 100
  summary: string;
  expectedHorizonMovement: string;
  keyLevels: {
    resistance: number;
    support: number;
    pivot: number;
  };
  volatilityOutlook: 'Expanding' | 'Contracting' | 'Normal';
  tradingImplications: string[];
  anomaliesDetected: string[];
  recommendedAction: 'Accumulate / Long' | 'Hedge / Reduce Exposure' | 'Range Trade' | 'Short / Exit' | 'Hold / Observe';
  analyzedAt: number;
}
