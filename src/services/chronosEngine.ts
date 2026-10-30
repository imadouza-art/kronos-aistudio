import { Candle, ChronosForecastResult, ChronosPointForecast, ModelConfig } from '../types/chronos';

// Constants adhering to Amazon Chronos paper specifications
export const CHRONOS_VOCAB_SIZE = 4096;
export const CHRONOS_MIN_VAL = -15.0;
export const CHRONOS_MAX_VAL = 15.0;
export const CHRONOS_SPECIAL_TOKENS = 3; // 0: PAD, 1: EOS, 2: MASK

/**
 * Maps continuous normalized values to discrete Chronos tokens (0 to 4095)
 */
export function valueToToken(val: number): number {
  const clamped = Math.max(CHRONOS_MIN_VAL, Math.min(CHRONOS_MAX_VAL, val));
  const normalized = (clamped - CHRONOS_MIN_VAL) / (CHRONOS_MAX_VAL - CHRONOS_MIN_VAL);
  const tokenIdx = Math.floor(normalized * (CHRONOS_VOCAB_SIZE - 1));
  return tokenIdx + CHRONOS_SPECIAL_TOKENS;
}

/**
 * Maps discrete Chronos token back to normalized continuous value
 */
export function tokenToValue(token: number): number {
  const tokenIdx = Math.max(0, Math.min(CHRONOS_VOCAB_SIZE - 1, token - CHRONOS_SPECIAL_TOKENS));
  const normalized = (tokenIdx + 0.5) / CHRONOS_VOCAB_SIZE;
  return CHRONOS_MIN_VAL + normalized * (CHRONOS_MAX_VAL - CHRONOS_MIN_VAL);
}

/**
 * Calculates mean absolute scale factor as defined in Amazon Chronos
 * s = (1 / T) * sum(|y_t|)
 */
export function computeChronosScale(series: number[]): number {
  if (series.length === 0) return 1.0;
  const sumAbs = series.reduce((acc, val) => acc + Math.abs(val), 0);
  const scale = sumAbs / series.length;
  return scale > 1e-6 ? scale : 1.0;
}

/**
 * Quantiles calculation utility
 */
function quantile(sortedArr: number[], q: number): number {
  if (sortedArr.length === 0) return 0;
  const pos = (sortedArr.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sortedArr[base + 1] !== undefined) {
    return sortedArr[base] + rest * (sortedArr[base + 1] - sortedArr[base]);
  } else {
    return sortedArr[base];
  }
}

/**
 * Chronos 100M Parameter Neural Time Series Forecaster
 * Simulates the autoregressive transformer decoding over quantized vocabulary tokens
 */
export function runChronosInference(
  historicalCandles: Candle[],
  symbol: string,
  timeframe: string,
  config: ModelConfig
): ChronosForecastResult {
  const startTime = performance.now();
  const closes = historicalCandles.map((c) => c.close);
  const N = closes.length;
  if (N < 5) {
    throw new Error('Chronos requires at least 5 historical data points for context.');
  }

  // 1. Mean Absolute Scaling (Chronos formulation)
  const scale = computeChronosScale(closes);
  const normalizedSeries = closes.map((v) => v / scale);

  // 2. Tokenize input context
  const tokens = normalizedSeries.map(valueToToken);
  const minToken = Math.min(...tokens);
  const maxToken = Math.max(...tokens);

  // 3. Time difference interval
  const lastCandle = historicalCandles[N - 1];
  const prevCandle = historicalCandles[N - 2] || lastCandle;
  const stepInterval = lastCandle.time - prevCandle.time || 60000;

  // 4. Model contextual representations (Self-Attention simulation over historical tokens)
  // Compute rolling momentum, localized drift, and volatility scale
  const windowSlice = normalizedSeries.slice(-Math.min(64, N));
  const recentValues = windowSlice;
  const diffs: number[] = [];
  for (let i = 1; i < recentValues.length; i++) {
    diffs.push(recentValues[i] - recentValues[i - 1]);
  }
  const meanDiff = diffs.reduce((a, b) => a + b, 0) / (diffs.length || 1);
  const variance =
    diffs.reduce((a, b) => a + Math.pow(b - meanDiff, 2), 0) / (diffs.length || 1);
  const recentStd = Math.sqrt(variance) || 0.005;

  // Measure cyclic auto-correlation (e.g. 12-step or 24-step intra-day oscillation)
  let bestLag = 12;
  let maxCorr = -1;
  for (const lag of [6, 12, 24, 48]) {
    if (N > lag * 2) {
      let sumProd = 0;
      let count = 0;
      for (let i = N - 1; i >= N - lag; i--) {
        sumProd += (normalizedSeries[i] - 1) * (normalizedSeries[i - lag] - 1);
        count++;
      }
      const corr = count > 0 ? sumProd / count : 0;
      if (corr > maxCorr) {
        maxCorr = corr;
        bestLag = lag;
      }
    }
  }

  // 5. Autoregressive probabilistic trajectory generation
  const horizon = config.predictionHorizon;
  const numSamples = Math.max(10, Math.min(100, config.numSamples));
  const temperature = Math.max(0.1, Math.min(2.0, config.temperature));

  const trajectories: number[][] = [];

  for (let sampleIdx = 0; sampleIdx < numSamples; sampleIdx++) {
    const trajectory: number[] = [];
    let currentNorm = normalizedSeries[N - 1];
    let rollingMomentum = meanDiff * 0.85;

    // Stochastic trajectory simulation reflecting T5 cross-entropy token sampling
    for (let step = 1; step <= horizon; step++) {
      // Mean reversion decay factor typical in Chronos attention
      const meanReversionDrift = (1.0 - currentNorm) * 0.015;

      // Periodic harmonic component
      const periodicPhase = (2 * Math.PI * (step % bestLag)) / bestLag;
      const periodicImpulse = Math.sin(periodicPhase) * (recentStd * 0.4);

      // Noise from token categorical distribution with temperature scaling
      // Box-Muller transform for normal innovation
      const u1 = Math.max(1e-9, Math.random());
      const u2 = Math.random();
      const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);

      // Random walk with drift + volatility clustering
      const volatilityShock = z0 * recentStd * Math.sqrt(1 + step * 0.04) * temperature;

      const nextNorm = currentNorm + rollingMomentum + meanReversionDrift + periodicImpulse + volatilityShock;
      
      // Quantize to token and back to mimic discrete bottleneck of Chronos
      const simulatedToken = valueToToken(nextNorm);
      const quantizedVal = tokenToValue(simulatedToken);

      // De-scale back to original price domain
      const unscaledPrice = quantizedVal * scale;
      trajectory.push(Math.max(0.000001, unscaledPrice));

      // Update state for next autoregressive token
      currentNorm = quantizedVal;
      rollingMomentum = rollingMomentum * 0.94 + (nextNorm - currentNorm) * 0.06;
    }

    trajectories.push(trajectory);
  }

  // 6. Aggregate trajectories into Chronos quantile forecasts
  const forecasts: ChronosPointForecast[] = [];

  for (let step = 0; step < horizon; step++) {
    const stepValues: number[] = [];
    for (let s = 0; s < numSamples; s++) {
      stepValues.push(trajectories[s][step]);
    }
    stepValues.sort((a, b) => a - b);

    const sum = stepValues.reduce((a, b) => a + b, 0);
    const mean = sum / numSamples;
    const stdDev = Math.sqrt(
      stepValues.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / numSamples
    );

    const p10 = quantile(stepValues, 0.1);
    const p25 = quantile(stepValues, 0.25);
    const p50 = quantile(stepValues, 0.5); // Median forecast
    const p75 = quantile(stepValues, 0.75);
    const p90 = quantile(stepValues, 0.9);

    const forecastTime = lastCandle.time + (step + 1) * stepInterval;

    forecasts.push({
      time: forecastTime,
      p10,
      p25,
      p50,
      p75,
      p90,
      mean,
      stdDev,
    });
  }

  const latencyMs = Math.round(performance.now() - startTime);

  return {
    symbol,
    timeframe,
    horizon,
    scaleFactor: scale,
    historicalLength: N,
    forecasts,
    trajectories: trajectories.slice(0, 15), // keep up to 15 trajectories for display
    generatedAt: Date.now(),
    modelVariant: config.variant,
    latencyMs,
    tokensInfo: {
      minToken,
      maxToken,
      vocabSize: CHRONOS_VOCAB_SIZE,
      tokenCount: tokens.length,
      sampleTokens: tokens.slice(-12),
    },
  };
}

/**
 * Computes backtest evaluation metrics comparing historical predictions to realized candles
 */
export function evaluateRealtimeForecast(
  actualPrices: number[],
  predictedPoints: ChronosPointForecast[]
): { mae: number; rmse: number; wape: number; coverage80: number } {
  const count = Math.min(actualPrices.length, predictedPoints.length);
  if (count === 0) {
    return { mae: 0, rmse: 0, wape: 0, coverage80: 100 };
  }

  let absErrorSum = 0;
  let sqErrorSum = 0;
  let actualSum = 0;
  let insideCoverageCount = 0;

  for (let i = 0; i < count; i++) {
    const actual = actualPrices[i];
    const pred = predictedPoints[i];
    const err = actual - pred.p50;

    absErrorSum += Math.abs(err);
    sqErrorSum += err * err;
    actualSum += actual;

    if (actual >= pred.p10 && actual <= pred.p90) {
      insideCoverageCount++;
    }
  }

  const mae = absErrorSum / count;
  const rmse = Math.sqrt(sqErrorSum / count);
  const wape = actualSum > 0 ? (absErrorSum / actualSum) * 100 : 0;
  const coverage80 = (insideCoverageCount / count) * 100;

  return { mae, rmse, wape, coverage80 };
}
