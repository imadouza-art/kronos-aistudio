import React, { useRef, useState, useMemo, useEffect } from 'react';
import { Candle, ChronosForecastResult, ChronosPointForecast, MarketAsset } from '../types/chronos';
import { Eye, Layers, TrendingUp, Compass, Maximize2, Clock } from 'lucide-react';
import { TIMEFRAMES } from '../services/marketData';

interface ChronosChartProps {
  asset: MarketAsset;
  timeframe: string;
  onSelectTimeframe: (tf: string) => void;
  candles: Candle[];
  forecastResult: ChronosForecastResult | null;
  livePrice: number;
  selectedHorizon: number;
  onSelectHorizon: (h: number) => void;
  showTrajectories: boolean;
  onToggleTrajectories: () => void;
  modelVariant?: string;
}

export const ChronosChart: React.FC<ChronosChartProps> = ({
  asset,
  timeframe,
  onSelectTimeframe,
  candles,
  forecastResult,
  livePrice,
  selectedHorizon,
  onSelectHorizon,
  showTrajectories,
  onToggleTrajectories,
  modelVariant = 'chronos-100m',
}) => {
  const isFinancialKronos = modelVariant === 'kronos-financial-100m';
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 900, height: 480 });
  const [chartType, setChartType] = useState<'candles' | 'line'>('candles');
  const [showEMA, setShowEMA] = useState(true);
  const [showVolume, setShowVolume] = useState(true);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [hoverType, setHoverType] = useState<'history' | 'forecast' | null>(null);

  // Resize observer for responsive layout
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setDimensions({
          width: Math.max(400, Math.floor(entry.contentRect.width)),
          height: Math.max(340, Math.floor(entry.contentRect.height)),
        });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Compute 20-period EMA for historical candles
  const ema20 = useMemo(() => {
    if (candles.length < 5) return [];
    const k = 2 / (20 + 1);
    const result: (number | null)[] = [];
    let currentEMA = candles[0].close;

    for (let i = 0; i < candles.length; i++) {
      if (i < 10) {
        result.push(null);
      } else {
        currentEMA = candles[i].close * k + currentEMA * (1 - k);
        result.push(currentEMA);
      }
    }
    return result;
  }, [candles]);

  // Merge historical points and forecast points into continuous domain
  const forecasts = forecastResult?.forecasts || [];
  const totalPoints = candles.length + forecasts.length;

  // Chart padding
  const padding = {
    top: 24,
    right: 80, // for Y-axis labels
    bottom: showVolume ? 70 : 36,
    left: 16,
  };

  const chartWidth = Math.max(100, dimensions.width - padding.left - padding.right);
  const chartHeight = Math.max(100, dimensions.height - padding.top - padding.bottom);
  const volumeHeight = showVolume ? 36 : 0;
  const priceChartHeight = chartHeight - (showVolume ? volumeHeight + 12 : 0);

  // Determine global min and max prices across candles + forecasts
  const { minPrice, maxPrice, maxVolume } = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;
    let maxVol = 0;

    for (const c of candles) {
      if (c.low < min) min = c.low;
      if (c.high > max) max = c.high;
      if (c.volume > maxVol) maxVol = c.volume;
    }

    if (forecasts.length > 0) {
      for (const f of forecasts) {
        if (f.p10 < min) min = f.p10;
        if (f.p90 > max) max = f.p90;
      }
    }

    if (!isFinite(min) || !isFinite(max) || min === max) {
      min = livePrice * 0.98;
      max = livePrice * 1.02;
    }

    // Add 4% padding on vertical scale
    const span = max - min;
    return {
      minPrice: min - span * 0.04,
      maxPrice: max + span * 0.04,
      maxVolume: maxVol || 100,
    };
  }, [candles, forecasts, livePrice]);

  // Coordinate scales
  const getX = (index: number) => {
    if (totalPoints <= 1) return padding.left;
    return padding.left + (index / (totalPoints - 1)) * chartWidth;
  };

  const getY = (price: number) => {
    if (maxPrice === minPrice) return padding.top + priceChartHeight / 2;
    const ratio = (price - minPrice) / (maxPrice - minPrice);
    return padding.top + priceChartHeight * (1 - ratio);
  };

  const getVolY = (vol: number) => {
    const bottomY = padding.top + chartHeight;
    const ratio = Math.min(1, vol / (maxVolume || 1));
    return bottomY - ratio * volumeHeight;
  };

  // Build SVG paths for Chronos quantile fan
  const { fan90Path, fan75Path, medianPath } = useMemo(() => {
    if (forecasts.length === 0 || candles.length === 0) {
      return { fan90Path: '', fan75Path: '', medianPath: '' };
    }

    const lastHistIdx = candles.length - 1;
    const lastHistX = getX(lastHistIdx);
    const lastHistClose = candles[lastHistIdx].close;
    const lastHistY = getY(lastHistClose);

    // 10th - 90th percentile envelope polygon
    let upper90 = `M ${lastHistX} ${lastHistY}`;
    let lower10 = '';

    // 25th - 75th percentile envelope polygon
    let upper75 = `M ${lastHistX} ${lastHistY}`;
    let lower25 = '';

    // Median forecast line (p50)
    let med = `M ${lastHistX} ${lastHistY}`;

    for (let i = 0; i < forecasts.length; i++) {
      const x = getX(lastHistIdx + 1 + i);
      const f = forecasts[i];

      upper90 += ` L ${x} ${getY(f.p90)}`;
      lower10 = ` L ${x} ${getY(f.p10)}` + lower10;

      upper75 += ` L ${x} ${getY(f.p75)}`;
      lower25 = ` L ${x} ${getY(f.p25)}` + lower25;

      med += ` L ${x} ${getY(f.p50)}`;
    }

    const fan90 = `${upper90}${lower10} Z`;
    const fan75 = `${upper75}${lower25} Z`;

    return { fan90Path: fan90, fan75Path: fan75, medianPath: med };
  }, [candles, forecasts, minPrice, maxPrice, dimensions.width]);

  // SVG path for Historical Close line
  const histLinePath = useMemo(() => {
    if (candles.length === 0) return '';
    return candles.reduce((acc, c, i) => {
      const cmd = i === 0 ? 'M' : 'L';
      return `${acc} ${cmd} ${getX(i)} ${getY(c.close)}`;
    }, '');
  }, [candles, minPrice, maxPrice, dimensions.width]);

  // SVG path for EMA20
  const emaPath = useMemo(() => {
    if (!showEMA) return '';
    let path = '';
    let started = false;
    for (let i = 0; i < ema20.length; i++) {
      const val = ema20[i];
      if (val !== null) {
        const cmd = !started ? 'M' : 'L';
        path += ` ${cmd} ${getX(i)} ${getY(val)}`;
        started = true;
      }
    }
    return path;
  }, [ema20, showEMA, minPrice, maxPrice, dimensions.width]);

  // Trajectory sample lines
  const trajectoryPaths = useMemo(() => {
    if (!showTrajectories || !forecastResult?.trajectories || candles.length === 0) return [];
    const lastHistIdx = candles.length - 1;
    const startX = getX(lastHistIdx);
    const startY = getY(candles[lastHistIdx].close);

    return forecastResult.trajectories.map((traj) => {
      let path = `M ${startX} ${startY}`;
      for (let step = 0; step < traj.length; step++) {
        const x = getX(lastHistIdx + 1 + step);
        const y = getY(traj[step]);
        path += ` L ${x} ${y}`;
      }
      return path;
    });
  }, [showTrajectories, forecastResult, candles, minPrice, maxPrice, dimensions.width]);

  // Horizontal Grid Lines & Price Labels
  const gridLines = useMemo(() => {
    const lines = [];
    const count = 5;
    for (let i = 0; i <= count; i++) {
      const price = minPrice + ((maxPrice - minPrice) / count) * i;
      const y = getY(price);
      lines.push({ price, y });
    }
    return lines;
  }, [minPrice, maxPrice, priceChartHeight]);

  // Handle Hover Interaction
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    if (mouseX < padding.left || mouseX > padding.left + chartWidth) {
      setHoverIndex(null);
      setHoverType(null);
      return;
    }

    const relX = (mouseX - padding.left) / chartWidth;
    const targetIdx = Math.round(relX * (totalPoints - 1));

    if (targetIdx < candles.length) {
      setHoverIndex(targetIdx);
      setHoverType('history');
    } else {
      const forecastIdx = targetIdx - candles.length;
      if (forecastIdx < forecasts.length) {
        setHoverIndex(forecastIdx);
        setHoverType('forecast');
      }
    }
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
    setHoverType(null);
  };

  const splitX = candles.length > 0 ? getX(candles.length - 1) : 0;
  const livePriceY = getY(livePrice);

  return (
    <div className="flex flex-col bg-slate-900/90 border border-slate-800 rounded-lg overflow-hidden shadow-xl">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-slate-900 border-b border-slate-800/90 text-xs">
        {/* Left: Timeframe Selector (Primary for Traders) + Horizon + Chart Style */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Prominent Timeframe Selector */}
          <div className="flex items-center gap-2 bg-slate-950 border-2 border-cyan-500/70 rounded-lg px-2.5 py-1 shadow-md">
            <Clock className="w-3.5 h-3.5 text-cyan-400 shrink-0 animate-pulse" />
            <span className="text-cyan-200 font-extrabold text-[11px] tracking-wider uppercase">TIMEFRAME:</span>
            <div className="flex items-center bg-slate-900 rounded p-0.5 border border-slate-700">
              {TIMEFRAMES.map((tf) => (
                <button
                  key={tf.value}
                  onClick={() => onSelectTimeframe(tf.value)}
                  className={`px-2.5 py-1 text-xs font-mono font-bold rounded transition-all cursor-pointer ${
                    timeframe === tf.value
                      ? 'bg-cyan-500 text-slate-950 font-black shadow-md ring-1 ring-cyan-200'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {tf.label}
                </button>
              ))}
            </div>
            <span className="text-[10px] font-mono text-slate-400 pl-1 hidden xl:inline">
              ({asset.yahooSymbol ? 'Yahoo Live' : 'Binance'})
            </span>
          </div>

          <div className="h-4 w-[1px] bg-slate-800 hidden sm:block" />

          {/* Horizon Selection */}
          <div className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-800 rounded px-2 py-1">
            <span className="text-slate-400 font-bold text-[11px]">HORIZON:</span>
            <div className="flex items-center bg-slate-800 rounded p-0.5 border border-slate-700/80">
              {[12, 24, 48, 96].map((h) => (
                <button
                  key={h}
                  onClick={() => onSelectHorizon(h)}
                  className={`px-2 py-0.5 text-[11px] font-mono font-bold rounded transition-colors cursor-pointer ${
                    selectedHorizon === h
                      ? isFinancialKronos
                        ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                        : 'bg-cyan-500 text-slate-950 font-black shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  +{h}
                </button>
              ))}
            </div>
          </div>

          <div className="h-4 w-[1px] bg-slate-800 hidden sm:block" />

          {/* Chart Type Toggle */}
          <div className="flex items-center bg-slate-800 rounded p-0.5 border border-slate-700/80">
            <button
              onClick={() => setChartType('candles')}
              className={`px-2 py-0.5 text-[11px] font-medium rounded transition-colors cursor-pointer ${
                chartType === 'candles'
                  ? 'bg-slate-700 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Candles
            </button>
            <button
              onClick={() => setChartType('line')}
              className={`px-2 py-0.5 text-[11px] font-medium rounded transition-colors cursor-pointer ${
                chartType === 'line'
                  ? 'bg-slate-700 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Line
            </button>
          </div>
        </div>

        {/* Right: Technical Overlays & Stochastic Trajectories */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowEMA(!showEMA)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium border transition-colors ${
              showEMA
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                : 'bg-slate-800/60 border-slate-700/60 text-slate-400'
            }`}
          >
            <TrendingUp className="w-3 h-3" />
            <span>EMA 20</span>
          </button>

          <button
            onClick={() => setShowVolume(!showVolume)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium border transition-colors ${
              showVolume
                ? 'bg-slate-700/60 border-slate-600 text-slate-200'
                : 'bg-slate-800/60 border-slate-700/60 text-slate-500'
            }`}
          >
            <Layers className="w-3 h-3" />
            <span>Volume</span>
          </button>

          <button
            onClick={onToggleTrajectories}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium border transition-colors ${
              showTrajectories
                ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300'
                : 'bg-slate-800/60 border-slate-700/60 text-slate-400'
            }`}
            title="Toggle individual Monte Carlo sample trajectories"
          >
            <Compass className="w-3 h-3" />
            <span>Trajectories</span>
          </button>
        </div>
      </div>

      {/* Live Price Sub-bar with MT5 Broker Price Badge & Demoted Yahoo Line */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-1.5 bg-slate-950/80 border-b border-slate-800 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-400 text-[11px]">
            {asset.symbol === 'VIX'
              ? 'Yahoo - delayed (^VIX):'
              : `Broker Live Price (${asset.brokerSymbol || asset.symbol}):`}
          </span>
          <span className="font-mono font-bold text-slate-200 text-xs">
            {livePrice.toFixed(asset.decimals)} {asset.unit || asset.quoteAsset}
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] font-mono text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/80" />
            <span>{asset.symbol === 'VIX' ? 'Yahoo Indicative' : 'Exness Tradeable'}</span>
          </span>
        </div>

        {/* Broker Price Badge & CFD Basis Calibration */}
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 rounded px-2 py-0.5 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>CFD Basis Calibrated (Futures/CFD Gap Eliminated)</span>
          </div>
          <div className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-300 bg-amber-950/60 border border-amber-800/40 rounded px-2 py-0.5 shadow-sm">
            <span>⚠️</span>
            <span>Exness Broker Tradeable Price</span>
          </div>
        </div>
      </div>

      {/* Main Chart Canvas / SVG Container */}
      <div ref={containerRef} className="relative w-full h-[460px] bg-slate-950 select-none">
        <svg
          width={dimensions.width}
          height={dimensions.height}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="w-full h-full cursor-crosshair overflow-visible"
        >
          <defs>
            {/* 10% - 90% Quantile Gradient */}
            <linearGradient id="chronosFan90" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.12" />
            </linearGradient>

            {/* 25% - 75% Quantile Gradient */}
            <linearGradient id="chronosFan75" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#0891b2" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#2563eb" stopOpacity="0.22" />
            </linearGradient>

            <pattern id="gridPattern" width="60" height="40" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 40" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeOpacity="0.35" />
            </pattern>
          </defs>

          {/* Grid Background */}
          <rect
            x={padding.left}
            y={padding.top}
            width={chartWidth}
            height={priceChartHeight}
            fill="url(#gridPattern)"
          />

          {/* Horizontal Grid lines & Price Markers */}
          {gridLines.map((line, idx) => (
            <g key={idx}>
              <line
                x1={padding.left}
                y1={line.y}
                x2={padding.left + chartWidth}
                y2={line.y}
                stroke="#1e293b"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
              <text
                x={padding.left + chartWidth + 8}
                y={line.y + 4}
                fill="#64748b"
                fontSize="10"
                fontFamily="ui-monospace, monospace"
              >
                {line.price.toFixed(asset.decimals)}
              </text>
            </g>
          ))}

          {/* Vertical Separator: Context Boundary vs Forecast Horizon */}
          {candles.length > 0 && (
            <g>
              <line
                x1={splitX}
                y1={padding.top}
                x2={splitX}
                y2={padding.top + chartHeight}
                stroke="#06b6d4"
                strokeWidth="1.5"
                strokeDasharray="4 4"
                opacity="0.75"
              />
              <rect
                x={splitX - 44}
                y={padding.top + 6}
                width="88"
                height="18"
                rx="3"
                fill="#0f172a"
                stroke="#0891b2"
                strokeWidth="0.8"
              />
              <text
                x={splitX}
                y={padding.top + 18}
                fill="#22d3ee"
                fontSize="9"
                fontFamily="ui-monospace, monospace"
                fontWeight="600"
                textAnchor="middle"
              >
                T₀ (REAL-TIME)
              </text>
            </g>
          )}

          {/* Volume Bars */}
          {showVolume &&
            candles.map((c, i) => {
              const x = getX(i);
              const barWidth = Math.max(1.5, (chartWidth / totalPoints) * 0.75);
              const volY = getVolY(c.volume);
              const bottomY = padding.top + chartHeight;
              const isBullish = c.close >= c.open;
              return (
                <rect
                  key={`vol-${i}`}
                  x={x - barWidth / 2}
                  y={volY}
                  width={barWidth}
                  height={Math.max(1, bottomY - volY)}
                  fill={isBullish ? '#10b981' : '#f43f5e'}
                  opacity="0.3"
                />
              );
            })}

          {/* Chronos Quantile Fan Area: 10% - 90% Bound */}
          {fan90Path && <path d={fan90Path} fill="url(#chronosFan90)" />}

          {/* Chronos Quantile Fan Area: 25% - 75% Interquartile Bound */}
          {fan75Path && <path d={fan75Path} fill="url(#chronosFan75)" />}

          {/* Monte Carlo Simulated Sample Trajectories */}
          {trajectoryPaths.map((tPath, idx) => (
            <path
              key={`traj-${idx}`}
              d={tPath}
              fill="none"
              stroke="#818cf8"
              strokeWidth="0.8"
              opacity="0.35"
              strokeDasharray="2 2"
            />
          ))}

          {/* Historical Candlesticks */}
          {chartType === 'candles' &&
            candles.map((c, i) => {
              const x = getX(i);
              const openY = getY(c.open);
              const closeY = getY(c.close);
              const highY = getY(c.high);
              const lowY = getY(c.low);
              const isBullish = c.close >= c.open;
              const candleColor = isBullish ? '#10b981' : '#f43f5e';
              const bodyTop = Math.min(openY, closeY);
              const bodyHeight = Math.max(1.5, Math.abs(closeY - openY));
              const candleWidth = Math.max(2, (chartWidth / totalPoints) * 0.7);

              return (
                <g key={`candle-${i}`}>
                  {/* Wick */}
                  <line
                    x1={x}
                    y1={highY}
                    x2={x}
                    y2={lowY}
                    stroke={candleColor}
                    strokeWidth="1"
                    opacity="0.9"
                  />
                  {/* Body */}
                  <rect
                    x={x - candleWidth / 2}
                    y={bodyTop}
                    width={candleWidth}
                    height={bodyHeight}
                    fill={isBullish ? '#10b981' : '#f43f5e'}
                    rx="1"
                  />
                </g>
              );
            })}

          {/* Historical Close Line (if line mode) */}
          {chartType === 'line' && histLinePath && (
            <path
              d={histLinePath}
              fill="none"
              stroke="#94a3b8"
              strokeWidth="1.8"
            />
          )}

          {/* EMA 20 overlay */}
          {emaPath && (
            <path
              d={emaPath}
              fill="none"
              stroke="#f59e0b"
              strokeWidth="1.4"
              opacity="0.8"
            />
          )}

          {/* Chronos Median Line (p50 Forecast) */}
          {medianPath && (
            <g>
              <path
                d={medianPath}
                fill="none"
                stroke="#06b6d4"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Forecast points */}
              {forecasts.map((f, idx) => {
                const x = getX(candles.length + idx);
                const y = getY(f.p50);
                return (
                  <circle
                    key={`fpt-${idx}`}
                    cx={x}
                    cy={y}
                    r={idx === forecasts.length - 1 ? 4 : 2}
                    fill="#22d3ee"
                    stroke="#0f172a"
                    strokeWidth="1"
                  />
                );
              })}
            </g>
          )}

          {/* Real-time Live Price Marker */}
          {candles.length > 0 && (
            <g>
              <line
                x1={padding.left}
                y1={livePriceY}
                x2={padding.left + chartWidth}
                y2={livePriceY}
                stroke="#10b981"
                strokeWidth="1.2"
                strokeDasharray="2 3"
                opacity="0.85"
              />
              {/* Right Tag */}
              <rect
                x={padding.left + chartWidth + 2}
                y={livePriceY - 9}
                width="72"
                height="18"
                rx="2"
                fill="#065f46"
                stroke="#10b981"
                strokeWidth="0.8"
              />
              <text
                x={padding.left + chartWidth + 6}
                y={livePriceY + 3.5}
                fill="#34d399"
                fontSize="10"
                fontFamily="ui-monospace, monospace"
                fontWeight="700"
              >
                {livePrice.toFixed(asset.decimals)}
              </text>
              {/* Pulsing indicator on right edge of chart */}
              <circle
                cx={splitX}
                cy={livePriceY}
                r="4.5"
                fill="#10b981"
                className="animate-ping"
                opacity="0.5"
              />
              <circle cx={splitX} cy={livePriceY} r="3" fill="#34d399" />
            </g>
          )}

          {/* Interactive Crosshair */}
          {hoverIndex !== null && hoverType && (
            <g pointerEvents="none">
              {hoverType === 'history' && candles[hoverIndex] && (
                <>
                  <line
                    x1={getX(hoverIndex)}
                    y1={padding.top}
                    x2={getX(hoverIndex)}
                    y2={padding.top + chartHeight}
                    stroke="#64748b"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                  />
                  <line
                    x1={padding.left}
                    y1={getY(candles[hoverIndex].close)}
                    x2={padding.left + chartWidth}
                    y2={getY(candles[hoverIndex].close)}
                    stroke="#64748b"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                  />
                </>
              )}
              {hoverType === 'forecast' && forecasts[hoverIndex] && (
                <>
                  <line
                    x1={getX(candles.length + hoverIndex)}
                    y1={padding.top}
                    x2={getX(candles.length + hoverIndex)}
                    y2={padding.top + chartHeight}
                    stroke="#06b6d4"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                  />
                  <line
                    x1={padding.left}
                    y1={getY(forecasts[hoverIndex].p50)}
                    x2={padding.left + chartWidth}
                    y2={getY(forecasts[hoverIndex].p50)}
                    stroke="#06b6d4"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                  />
                </>
              )}
            </g>
          )}
        </svg>

        {/* Floating Tooltip */}
        {hoverIndex !== null && hoverType && (
          <div
            className="absolute z-20 pointer-events-none bg-slate-900/95 backdrop-blur border border-slate-700/80 rounded p-2.5 text-xs shadow-2xl text-slate-200"
            style={{
              left: Math.min(
                dimensions.width - 240,
                Math.max(
                  16,
                  hoverType === 'history'
                    ? getX(hoverIndex) + 14
                    : getX(candles.length + hoverIndex) + 14
                )
              ),
              top: 36,
            }}
          >
            {hoverType === 'history' && candles[hoverIndex] && (
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-4 font-mono text-[11px] text-slate-400 border-b border-slate-800 pb-1">
                  <span>HISTORICAL CANDLE</span>
                  <span>{new Date(candles[hoverIndex].time).toLocaleTimeString()}</span>
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 font-mono text-[11px]">
                  <span className="text-slate-400">Open:</span>
                  <span className="text-right">{candles[hoverIndex].open.toFixed(asset.decimals)}</span>
                  <span className="text-slate-400">High:</span>
                  <span className="text-right text-emerald-400">{candles[hoverIndex].high.toFixed(asset.decimals)}</span>
                  <span className="text-slate-400">Low:</span>
                  <span className="text-right text-rose-400">{candles[hoverIndex].low.toFixed(asset.decimals)}</span>
                  <span className="text-slate-400">Close:</span>
                  <span className="text-right font-bold">{candles[hoverIndex].close.toFixed(asset.decimals)}</span>
                  <span className="text-slate-400">Volume:</span>
                  <span className="text-right text-slate-300">{candles[hoverIndex].volume.toLocaleString()}</span>
                </div>
              </div>
            )}

            {hoverType === 'forecast' && forecasts[hoverIndex] && (
              <div className="space-y-1">
                <div className={`flex items-center justify-between gap-4 font-mono text-[11px] border-b border-slate-800 pb-1 ${
                  isFinancialKronos ? 'text-amber-400' : 'text-cyan-400'
                }`}>
                  <span className="font-bold">
                    {isFinancialKronos ? 'KRONOS K-LINE FORECAST' : 'CHRONOS FORECAST'} [T+{hoverIndex + 1}]
                  </span>
                  <span>{new Date(forecasts[hoverIndex].time).toLocaleTimeString()}</span>
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 font-mono text-[11px]">
                  <span className={isFinancialKronos ? 'text-amber-300 font-bold' : 'text-cyan-300 font-bold'}>
                    p50 (Median):
                  </span>
                  <span className="text-right font-bold text-white">
                    {forecasts[hoverIndex].p50.toFixed(asset.decimals)}
                  </span>
                  <span className="text-slate-400">p10 (Lower 10%):</span>
                  <span className={`text-right ${isFinancialKronos ? 'text-amber-200' : 'text-cyan-200'}`}>
                    {forecasts[hoverIndex].p10.toFixed(asset.decimals)}
                  </span>
                  <span className="text-slate-400">p90 (Upper 90%):</span>
                  <span className={`text-right ${isFinancialKronos ? 'text-amber-200' : 'text-cyan-200'}`}>
                    {forecasts[hoverIndex].p90.toFixed(asset.decimals)}
                  </span>
                  <span className="text-slate-400">IQR (p75 - p25):</span>
                  <span className="text-right text-slate-300">
                    {(forecasts[hoverIndex].p75 - forecasts[hoverIndex].p25).toFixed(asset.decimals)}
                  </span>
                  <span className="text-slate-400">Uncertainty:</span>
                  <span className="text-right text-amber-300">
                    ±{(
                      ((forecasts[hoverIndex].p90 - forecasts[hoverIndex].p10) /
                        (2 * forecasts[hoverIndex].p50)) *
                      100
                    ).toFixed(2)}%
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Chart Footer: Legend & Context Length */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2 bg-slate-900 border-t border-slate-800/80 text-[11px] text-slate-400">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className={`w-3 h-0.5 inline-block ${isFinancialKronos ? 'bg-amber-400' : 'bg-cyan-400'}`} />
            <span className="text-slate-300 font-medium">
              {isFinancialKronos ? 'Kronos p50 Median K-Line' : 'Chronos p50 Median Path'}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`w-3 h-2 border inline-block ${
              isFinancialKronos ? 'bg-amber-500/30 border-amber-500/50' : 'bg-cyan-500/30 border-cyan-500/50'
            }`} />
            <span className="text-slate-300">50% Interquartile Range [p25, p75]</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`w-3 h-2 border inline-block ${
              isFinancialKronos ? 'bg-amber-500/15 border-amber-500/30' : 'bg-cyan-500/15 border-cyan-500/30'
            }`} />
            <span className="text-slate-300">80% Prediction Interval [p10, p90]</span>
          </div>
          {showEMA && (
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-amber-400 inline-block" />
              <span className="text-amber-300">EMA 20</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 font-mono text-[11px] text-slate-500">
          <span>Context: {candles.length} candles</span>
          <span aria-hidden="true">·</span>
          <span>Forecast: {forecasts.length} steps</span>
          <span aria-hidden="true">·</span>
          <span>Inference: {forecastResult ? `${forecastResult.latencyMs}ms` : '—'}</span>
        </div>
      </div>
    </div>
  );
};
