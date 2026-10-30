import { Candle, MarketAsset } from '../types/chronos';

export const SUPPORTED_ASSETS: MarketAsset[] = [
  // --- NINJATRADER 8 TRADOVATE CME FUTURES ---
  {
    symbol: 'ES',
    name: 'ES - E-mini S&P 500 Futures (NinjaTrader 8 Tradovate)',
    category: 'indices',
    baseAsset: 'ES',
    quoteAsset: 'USD',
    decimals: 2,
    brokerSymbol: 'ES',
    yahooSymbol: 'ES=F',
    initialPrice: 5882.25,
    volatility: 0.0019,
    unit: 'pts',
    macroRole: 'Primary US Equity Benchmark (CME Globex Futures)',
  },
  {
    symbol: 'MES',
    name: 'MES - Micro E-mini S&P 500 Futures (NinjaTrader 8 Tradovate)',
    category: 'indices',
    baseAsset: 'MES',
    quoteAsset: 'USD',
    decimals: 2,
    brokerSymbol: 'MES',
    yahooSymbol: 'ES=F',
    initialPrice: 5882.25,
    volatility: 0.0019,
    unit: 'pts',
    macroRole: 'Micro-Contract Equity Benchmark (CME Globex Futures)',
  },
  {
    symbol: 'NQ',
    name: 'NQ - E-mini NASDAQ-100 Futures (NinjaTrader 8 Tradovate)',
    category: 'indices',
    baseAsset: 'NQ',
    quoteAsset: 'USD',
    decimals: 2,
    brokerSymbol: 'NQ',
    yahooSymbol: 'NQ=F',
    initialPrice: 20450.50,
    volatility: 0.0028,
    unit: 'pts',
    macroRole: 'Tech / AI Growth Index Benchmark (CME Globex Futures)',
  },
  {
    symbol: 'MNQ',
    name: 'MNQ - Micro E-mini NASDAQ-100 Futures (NinjaTrader 8 Tradovate)',
    category: 'indices',
    baseAsset: 'MNQ',
    quoteAsset: 'USD',
    decimals: 2,
    brokerSymbol: 'MNQ',
    yahooSymbol: 'NQ=F',
    initialPrice: 20450.50,
    volatility: 0.0028,
    unit: 'pts',
    macroRole: 'Micro Tech Index Benchmark (CME Globex Futures)',
  },

  // --- GOLD & PRECIOUS METALS ---
  {
    symbol: 'XAUUSD',
    name: 'XAUUSD / GC - Gold Futures (NT8: GC)',
    category: 'gold',
    baseAsset: 'XAU',
    quoteAsset: 'USD',
    decimals: 2,
    brokerSymbol: 'GC',
    yahooSymbol: 'GC=F',
    binanceSymbol: 'paxgusdt',
    initialPrice: 4110.02,
    volatility: 0.0022,
    unit: '$/oz',
    macroRole: 'Global Monetary Safe-Haven & Inflation Hedge',
    isFuturesFallback: true,
  },
  {
    symbol: 'GC_F',
    name: 'COMEX Gold Futures (NT8: GC)',
    category: 'gold',
    baseAsset: 'GC',
    quoteAsset: 'USD',
    decimals: 2,
    brokerSymbol: 'GC',
    yahooSymbol: 'GC=F',
    initialPrice: 4110.02,
    volatility: 0.0024,
    unit: '$/oz',
    macroRole: 'Institutional Commodity Derivatives Benchmark (Futures)',
  },
  {
    symbol: 'XAGUSD',
    name: 'XAGUSD - Spot Silver (Exness broker: XAGUSDr)',
    category: 'gold',
    baseAsset: 'XAG',
    quoteAsset: 'USD',
    decimals: 3,
    brokerSymbol: 'XAGUSDr',
    yahooSymbol: 'XAGUSD=X',
    initialPrice: 60.28,
    volatility: 0.0042,
    unit: '$/oz',
    macroRole: 'Monetary & High-Tech Industrial Precious Metal (Spot)',
    isFuturesFallback: true,
    priceNote: 'Futures (reference only)',
  },
  {
    symbol: 'SI_F',
    name: 'COMEX Silver Futures (reference only)',
    category: 'gold',
    baseAsset: 'SI',
    quoteAsset: 'USD',
    decimals: 3,
    brokerSymbol: 'XAGUSDr',
    yahooSymbol: 'SI=F',
    initialPrice: 60.28,
    volatility: 0.0042,
    unit: '$/oz',
    macroRole: 'Precious Metals Derivative Contract (Futures)',
    isFuturesFallback: true,
    priceNote: 'Futures (reference only)',
  },
  {
    symbol: 'GDX',
    name: 'VanEck Gold Miners Equity Index',
    category: 'gold',
    baseAsset: 'GDX',
    quoteAsset: 'USD',
    decimals: 2,
    yahooSymbol: 'GDX',
    initialPrice: 87.42,
    volatility: 0.0055,
    unit: 'USD',
    macroRole: 'High-Beta Operational Leverage to Gold Bullion',
  },

  // --- MAJOR FINANCIAL INDICES ---
  {
    symbol: 'SPX',
    name: 'S&P 500 Benchmark Index (Exness broker: US500r)',
    category: 'indices',
    baseAsset: 'SPX',
    quoteAsset: 'USD',
    decimals: 2,
    brokerSymbol: 'US500r',
    yahooSymbol: '^GSPC',
    initialPrice: 7782.15,
    volatility: 0.0018,
    unit: 'pts',
    macroRole: 'Primary US Large-Cap Equity Benchmark',
  },
  {
    symbol: 'NDX',
    name: 'NASDAQ Composite & 100 Index (Exness broker: USTECr)',
    category: 'indices',
    baseAsset: 'NDX',
    quoteAsset: 'USD',
    decimals: 2,
    brokerSymbol: 'USTECr',
    yahooSymbol: '^IXIC',
    initialPrice: 31243.60,
    volatility: 0.0028,
    unit: 'pts',
    macroRole: 'Growth, Artificial Intelligence & Mega-Cap Tech',
  },
  {
    symbol: 'DJI',
    name: 'Dow Jones Industrial Average 30 (Exness broker: US30r)',
    category: 'indices',
    baseAsset: 'DJI',
    quoteAsset: 'USD',
    decimals: 2,
    brokerSymbol: 'US30r',
    yahooSymbol: '^DJI',
    initialPrice: 51280.40,
    volatility: 0.0016,
    unit: 'pts',
    macroRole: 'US Blue-Chip Industrial & Banking Index',
  },
  {
    symbol: 'DXY',
    name: 'US Dollar Index (Exness broker: DXYr)',
    category: 'indices',
    baseAsset: 'DXY',
    quoteAsset: 'USD',
    decimals: 3,
    brokerSymbol: 'DXYr',
    yahooSymbol: 'DX-Y.NYB',
    initialPrice: 102.14,
    volatility: 0.0012,
    unit: 'pts',
    macroRole: 'Trade-Weighted Dollar vs EUR/JPY/GBP (Inverse Gold Driver)',
  },
  {
    symbol: 'DAX',
    name: 'German DAX 40 Index (^GDAXI)',
    category: 'indices',
    baseAsset: 'DAX',
    quoteAsset: 'EUR',
    decimals: 2,
    yahooSymbol: '^GDAXI',
    initialPrice: 25254.21,
    volatility: 0.0022,
    unit: 'pts',
    macroRole: 'European Industrial & Export Titan Index',
  },
  {
    symbol: 'N225',
    name: 'Nikkei 225 Tokyo Equity Index (^N225)',
    category: 'indices',
    baseAsset: 'N225',
    quoteAsset: 'JPY',
    decimals: 2,
    yahooSymbol: '^N225',
    initialPrice: 69946.86,
    volatility: 0.0026,
    unit: 'pts',
    macroRole: 'Asia-Pacific Core Equity Benchmark',
  },
  {
    symbol: 'VIX',
    name: 'CBOE Volatility Index (Fear Gauge ^VIX)',
    category: 'indices',
    baseAsset: 'VIX',
    quoteAsset: 'pts',
    decimals: 2,
    yahooSymbol: '^VIX',
    initialPrice: 15.52,
    volatility: 0.0085,
    unit: 'pts',
    macroRole: 'Implied 30-Day S&P 500 Option Volatility',
  },

  // --- CRYPTOCURRENCIES ---
  {
    symbol: 'BTCUSDT',
    name: 'Bitcoin / US Dollar (BTC-USD)',
    category: 'crypto',
    baseAsset: 'BTC',
    quoteAsset: 'USDT',
    decimals: 2,
    yahooSymbol: 'BTC-USD',
    binanceSymbol: 'btcusdt',
    initialPrice: 85930.0,
    volatility: 0.0035,
    unit: 'USDT',
    macroRole: 'Digital Store of Value / Macro Liquidity Asset',
  },
  {
    symbol: 'ETHUSDT',
    name: 'Ethereum / US Dollar (ETH-USD)',
    category: 'crypto',
    baseAsset: 'ETH',
    quoteAsset: 'USDT',
    decimals: 2,
    yahooSymbol: 'ETH-USD',
    binanceSymbol: 'ethusdt',
    initialPrice: 2716.4,
    volatility: 0.0045,
    unit: 'USDT',
    macroRole: 'Decentralized Computation & Smart Contracts',
  },
  {
    symbol: 'SOLUSDT',
    name: 'Solana / US Dollar (SOL-USD)',
    category: 'crypto',
    baseAsset: 'SOL',
    quoteAsset: 'USDT',
    decimals: 2,
    yahooSymbol: 'SOL-USD',
    binanceSymbol: 'solusdt',
    initialPrice: 175.5,
    volatility: 0.006,
    unit: 'USDT',
    macroRole: 'High-Throughput Layer-1 Network',
  },

  // --- FOREX & TECH ---
  {
    symbol: 'EURUSD',
    name: 'Euro / US Dollar (EURUSD=X)',
    category: 'forex',
    baseAsset: 'EUR',
    quoteAsset: 'USD',
    decimals: 4,
    yahooSymbol: 'EURUSD=X',
    initialPrice: 1.1225,
    volatility: 0.0008,
    unit: 'USD',
    macroRole: 'World’s Most Liquid Currency Pair',
  },
  {
    symbol: 'GRIDLOAD',
    name: 'Smart Energy Grid Demand (GW)',
    category: 'tech',
    baseAsset: 'GRID',
    quoteAsset: 'GW',
    decimals: 2,
    initialPrice: 420.5,
    volatility: 0.0025,
    unit: 'GW',
    macroRole: 'Real-Time Power System Capacity Load',
  },
];

export const TIMEFRAMES = [
  { label: '1m', value: '1m', intervalMs: 60 * 1000 },
  { label: '5m', value: '5m', intervalMs: 5 * 60 * 1000 },
  { label: '15m', value: '15m', intervalMs: 15 * 60 * 1000 },
  { label: '1h', value: '1h', intervalMs: 60 * 60 * 1000 },
  { label: '4h', value: '4h', intervalMs: 4 * 60 * 60 * 1000 },
  { label: '1d', value: '1d', intervalMs: 24 * 60 * 60 * 1000 },
];

/**
 * Generates synthetic historical candles with realistic microstructure
 */
export function generateSyntheticHistory(
  asset: MarketAsset,
  count: number = 100,
  intervalMs: number = 60000
): Candle[] {
  const candles: Candle[] = [];
  const now = Date.now();
  const startTime = now - count * intervalMs;
  let price = asset.initialPrice;

  for (let i = 0; i < count; i++) {
    const time = startTime + i * intervalMs;
    // Multi-frequency harmonic trend
    const cycle1 = Math.sin((i / 24) * 2 * Math.PI) * 0.008;
    const cycle2 = Math.cos((i / 80) * 2 * Math.PI) * 0.015;
    
    // Brownian motion with volatility
    const u1 = Math.max(1e-9, Math.random());
    const u2 = Math.random();
    const shock = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2) * asset.volatility;

    const returnPct = cycle1 * 0.2 + cycle2 * 0.3 + shock;
    const open = price;
    const close = Math.max(0.0001, open * (1 + returnPct));

    const wickUp = Math.abs(shock) * (0.5 + Math.random()) * price;
    const wickDown = Math.abs(shock) * (0.5 + Math.random()) * price;

    const high = Math.max(open, close) + wickUp;
    const low = Math.max(0.00001, Math.min(open, close) - wickDown);
    const volume = Math.round(100 + Math.random() * 500 + Math.abs(shock) * 10000);

    candles.push({
      time,
      open: Number(open.toFixed(asset.decimals)),
      high: Number(high.toFixed(asset.decimals)),
      low: Number(low.toFixed(asset.decimals)),
      close: Number(close.toFixed(asset.decimals)),
      volume,
    });

    price = close;
  }

  return candles;
}

/**
 * Fetch real historical candles from NinjaTrader 8 Tradovate feed (primary if available), Yahoo Finance, or Binance API
 */
export async function fetchHistoricalCandles(
  asset: MarketAsset,
  timeframe: string = '1m',
  limit: number = 120
): Promise<Candle[]> {
  const brokerSym = asset.brokerSymbol || (asset.symbol === 'XAUUSD' ? 'GC' : asset.symbol);

  // 0. PRIMARY CHECK: Real NinjaTrader 8 candles pushed directly by NT8 bridge or indicator
  if (brokerSym) {
    try {
      const bRes = await fetch(
        `/api/broker/candles?symbol=${encodeURIComponent(brokerSym)}&timeframe=${encodeURIComponent(timeframe)}`,
        { signal: AbortSignal.timeout(2000) }
      );
      if (bRes.ok) {
        const bData = await bRes.json();
        if (bData.available && Array.isArray(bData.candles) && bData.candles.length >= 5) {
          return bData.candles.slice(-limit);
        }
      }
    } catch {
      // fallback to Yahoo
    }
  }

  // 1. SECONDARY: Yahoo Finance Real-Time Chart API (with CFD basis calibration to broker price)
  if (asset.yahooSymbol) {
    try {
      const response = await fetch(
        `/api/yahoo/chart?symbol=${encodeURIComponent(asset.yahooSymbol)}&interval=${timeframe}`,
        { signal: AbortSignal.timeout(5000) }
      );
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data.candles) && data.candles.length >= 5) {
          let candles: Candle[] = data.candles;

          // Double check basis alignment with current broker price if available
          if (brokerSym) {
            try {
              const pRes = await fetch('/api/broker/prices', { signal: AbortSignal.timeout(1500) });
              if (pRes.ok) {
                const pData = await pRes.json();
                const item = pData?.prices?.[brokerSym] || pData?.prices?.[asset.symbol];
                if (item && typeof item.price === 'number' && item.price > 0 && candles.length > 0) {
                  const lastClose = candles[candles.length - 1].close;
                  const offset = item.price - lastClose;
                  // If difference > 0.001, shift all candles so they terminate exactly at broker price
                  if (Math.abs(offset) > 0.001) {
                    candles = candles.map((c) => ({
                      ...c,
                      open: Number((c.open + offset).toFixed(asset.decimals)),
                      high: Number((c.high + offset).toFixed(asset.decimals)),
                      low: Number((c.low + offset).toFixed(asset.decimals)),
                      close: Number((c.close + offset).toFixed(asset.decimals)),
                    }));
                  }
                }
              }
            } catch {
              // ignore
            }
          }

          return candles.slice(-limit);
        }
      }
    } catch {
      // Fallback silently if Yahoo Finance is slow or rate-limited
    }
  }

  // 2. TERTIARY: Binance Public API for Crypto & PAXG Gold
  if (asset.binanceSymbol) {
    try {
      const querySymbol = asset.binanceSymbol.toUpperCase();
      const response = await fetch(
        `https://api.binance.com/api/v3/klines?symbol=${querySymbol}&interval=${timeframe}&limit=${limit}`,
        { signal: AbortSignal.timeout(4000) }
      );
      if (response.ok) {
        const rawData = await response.json();
        if (Array.isArray(rawData) && rawData.length > 0) {
          return rawData.map((item: any[]) => ({
            time: Number(item[0]),
            open: parseFloat(item[1]),
            high: parseFloat(item[2]),
            low: parseFloat(item[3]),
            close: parseFloat(item[4]),
            volume: parseFloat(item[5]),
          }));
        }
      }
    } catch {
      // Fallback silently if Binance has network block
    }
  }

  // 3. QUATERNARY: Microstructure-accurate Synthetic Generator
  const tfConfig = TIMEFRAMES.find((t) => t.value === timeframe) || TIMEFRAMES[0];
  return generateSyntheticHistory(asset, limit, tfConfig.intervalMs);
}

/**
 * Fetch live quote directly from Yahoo Finance endpoint
 */
export async function fetchLiveYahooQuote(yahooSymbol: string): Promise<{
  livePrice: number;
  prevClose: number;
  change: number;
  changePercent: number;
} | null> {
  try {
    const res = await fetch(`/api/yahoo/quote?symbol=${encodeURIComponent(yahooSymbol)}`, {
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) {
      const data = await res.json();
      if (typeof data.livePrice === 'number' && data.livePrice > 0) {
        return {
          livePrice: data.livePrice,
          prevClose: data.prevClose || data.livePrice,
          change: data.change || 0,
          changePercent: data.changePercent || 0,
        };
      }
    }
  } catch {
    // ignore
  }
  return null;
}

export type TickListener = (update: {
  candle: Candle;
  isNewCandle: boolean;
  livePrice: number;
  tickTime: number;
  source?: string;
}) => void;

/**
 * Real-time Live Market Feed Manager
 * Prioritizes live Yahoo Finance quotes for Gold, Indices & Commodities,
 * Binance WebSockets for Crypto, and realistic micro-ticks as fallback.
 */
export class RealtimeFeedManager {
  private ws: WebSocket | null = null;
  private timer: number | null = null;
  private currentCandle: Candle | null = null;
  private listeners: Set<TickListener> = new Set();
  private asset: MarketAsset;
  private timeframe: string;
  private intervalMs: number;
  public isConnected: boolean = false;
  public connectionType: 'broker' | 'yahoo' | 'websocket' | 'simulation' = 'broker';

  constructor(asset: MarketAsset, timeframe: string = '1m') {
    this.asset = asset;
    this.timeframe = timeframe;
    const tf = TIMEFRAMES.find((t) => t.value === timeframe) || TIMEFRAMES[0];
    this.intervalMs = tf.intervalMs;
  }

  public setInitialCandle(candle: Candle) {
    this.currentCandle = { ...candle };
  }

  public subscribe(listener: TickListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public start() {
    this.stop();
    // 1. If asset has brokerSymbol (Gold, Silver, USTECr, US30r, US500r, DXYr), prioritize live broker feed!
    if (this.asset.brokerSymbol) {
      this.startBrokerFeed();
    } else if (this.asset.symbol === 'VIX' && this.asset.yahooSymbol) {
      // Keep Yahoo ONLY for the VIX card ("Yahoo - delayed")
      this.startYahooFeed();
    } else if (this.asset.binanceSymbol) {
      this.connectWebSocket();
    } else if (this.asset.yahooSymbol) {
      this.startYahooFeed();
    } else {
      this.startSyntheticFeed();
    }
  }

  public stop() {
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // ignore
      }
      this.ws = null;
    }
    if (this.timer) {
      window.clearInterval(this.timer);
      this.timer = null;
    }
    this.isConnected = false;
  }

  public switchAssetOrTimeframe(asset: MarketAsset, timeframe: string) {
    this.asset = asset;
    this.timeframe = timeframe;
    const tf = TIMEFRAMES.find((t) => t.value === timeframe) || TIMEFRAMES[0];
    this.intervalMs = tf.intervalMs;
    this.start();
  }

  /**
   * NinjaTrader 8 (Tradovate) Real-Time Polling Engine
   * Polls /api/broker/prices and /api/nt8/status every 2.5 seconds and generates live price ticks & candles
   */
  private startBrokerFeed() {
    this.connectionType = 'broker';
    this.isConnected = true;
    const brokerSym = this.asset.brokerSymbol || this.asset.symbol;

    const poll = async () => {
      try {
        // 1. Check NT8 connection status
        try {
          const sRes = await fetch('/api/nt8/status', { signal: AbortSignal.timeout(2000) });
          if (sRes.ok) {
            const sData = await sRes.json();
            // If data is fresh (< 60s), mark connected; otherwise mark disconnected
            if (sData.status === 'connected' && sData.age_seconds <= 60) {
              this.isConnected = true;
            } else if (sData.status === 'stale_disconnected' || (sData.age_seconds !== -1 && sData.age_seconds > 60)) {
              this.isConnected = false;
            }
          }
        } catch {
          // ignore status ping error
        }

        const res = await fetch('/api/broker/prices', { signal: AbortSignal.timeout(3000) });
        if (!res.ok) return;
        const data = await res.json();
        const prices = data?.prices || {};

        // Find match for brokerSymbol or asset.symbol
        const item =
          prices[brokerSym] ||
          prices[this.asset.symbol] ||
          (this.asset.symbol === 'ES' ? (prices['MES'] || prices['US500r']) : null) ||
          (this.asset.symbol === 'NQ' ? (prices['MNQ'] || prices['USTECr']) : null) ||
          (this.asset.symbol === 'XAUUSD' ? (prices['GC'] || prices['XAUUSDr'] || prices['XAUUSDm']) : null);

        if (!item || typeof item.price !== 'number' || item.price <= 0) {
          return;
        }

        const newPrice = item.price;
        if (!this.currentCandle) {
          const now = Date.now();
          this.currentCandle = {
            time: Math.floor(now / this.intervalMs) * this.intervalMs,
            open: newPrice,
            high: newPrice,
            low: newPrice,
            close: newPrice,
            volume: 10,
          };
        } else if (Math.abs(this.currentCandle.close - newPrice) > this.currentCandle.close * 0.003) {
          // Basis Gap Protection: If previous candle had an unaligned basis,
          // immediately re-baseline to the tradeable price so no artificial giant drop candle is generated
          this.currentCandle = {
            ...this.currentCandle,
            open: newPrice,
            high: newPrice,
            low: newPrice,
            close: newPrice,
          };
        }

        const now = Date.now();
        const candleStartTime = Math.floor(now / this.intervalMs) * this.intervalMs;
        const isNewCandle = candleStartTime > this.currentCandle.time;

        let updatedCandle: Candle;
        if (isNewCandle) {
          updatedCandle = {
            time: candleStartTime,
            open: this.currentCandle.close,
            high: Math.max(this.currentCandle.close, newPrice),
            low: Math.min(this.currentCandle.close, newPrice),
            close: Number(newPrice.toFixed(this.asset.decimals)),
            volume: 10,
          };
        } else {
          updatedCandle = {
            ...this.currentCandle,
            high: Number(Math.max(this.currentCandle.high, newPrice).toFixed(this.asset.decimals)),
            low: Number(Math.min(this.currentCandle.low, newPrice).toFixed(this.asset.decimals)),
            close: Number(newPrice.toFixed(this.asset.decimals)),
            volume: this.currentCandle.volume + 5,
          };
        }

        this.currentCandle = updatedCandle;
        this.emitUpdate(updatedCandle, isNewCandle, newPrice, 'NinjaTrader 8 (Tradovate)');
      } catch {
        // silent fail
      }
    };

    // Immediate poll then poll every 2.5s
    poll();
    this.timer = window.setInterval(poll, 2500);
  }

  /**
   * Yahoo Finance Live Polling Engine
   * Polls Yahoo Finance live quote every 2.5 seconds and generates live price ticks & candles
   */
  private startYahooFeed() {
    this.connectionType = 'yahoo';
    this.isConnected = true;
    const yahooSym = this.asset.yahooSymbol!;

    const poll = async () => {
      try {
        const quote = await fetchLiveYahooQuote(yahooSym);
        if (!quote || !this.currentCandle) return;

        const newPrice = quote.livePrice;
        const now = Date.now();
        const candleStartTime = Math.floor(now / this.intervalMs) * this.intervalMs;
        const isNewCandle = candleStartTime > this.currentCandle.time;

        let updatedCandle: Candle;
        if (isNewCandle) {
          updatedCandle = {
            time: candleStartTime,
            open: this.currentCandle.close,
            high: Math.max(this.currentCandle.close, newPrice),
            low: Math.min(this.currentCandle.close, newPrice),
            close: Number(newPrice.toFixed(this.asset.decimals)),
            volume: 10,
          };
        } else {
          updatedCandle = {
            ...this.currentCandle,
            high: Number(Math.max(this.currentCandle.high, newPrice).toFixed(this.asset.decimals)),
            low: Number(Math.min(this.currentCandle.low, newPrice).toFixed(this.asset.decimals)),
            close: Number(newPrice.toFixed(this.asset.decimals)),
            volume: this.currentCandle.volume + 5,
          };
        }

        this.currentCandle = updatedCandle;
        this.emitUpdate(updatedCandle, isNewCandle, newPrice, 'Yahoo Finance Real-Time');
      } catch {
        // keep running smoothly
      }
    };

    // Immediate initial poll
    poll();
    // Repeating interval every 2.5s for live price feed
    this.timer = window.setInterval(poll, 2500);
  }

  private connectWebSocket() {
    const symbol = this.asset.binanceSymbol!;
    const streamUrl = `wss://stream.binance.com:9443/ws/${symbol}@kline_${this.timeframe}`;
    
    try {
      this.ws = new WebSocket(streamUrl);
      this.connectionType = 'websocket';

      this.ws.onopen = () => {
        this.isConnected = true;
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data && data.k) {
            const k = data.k;
            const updatedCandle: Candle = {
              time: Number(k.t),
              open: parseFloat(k.o),
              high: parseFloat(k.h),
              low: parseFloat(k.l),
              close: parseFloat(k.c),
              volume: parseFloat(k.v),
            };
            const isClosed = Boolean(k.x);
            this.currentCandle = updatedCandle;
            this.emitUpdate(updatedCandle, isClosed, updatedCandle.close, 'Binance WebSocket');
          }
        } catch {
          // ignore parsing error
        }
      };

      this.ws.onerror = () => {
        // On WebSocket failure, fallback to Yahoo or simulation
        this.stop();
        if (this.asset.yahooSymbol) {
          this.startYahooFeed();
        } else {
          this.startSyntheticFeed();
        }
      };

      this.ws.onclose = () => {
        this.isConnected = false;
      };
    } catch {
      if (this.asset.yahooSymbol) {
        this.startYahooFeed();
      } else {
        this.startSyntheticFeed();
      }
    }
  }

  private startSyntheticFeed() {
    this.connectionType = 'simulation';
    this.isConnected = true;

    this.timer = window.setInterval(() => {
      if (!this.currentCandle) return;

      const now = Date.now();
      const candleStartTime = Math.floor(now / this.intervalMs) * this.intervalMs;
      const isNewCandle = candleStartTime > this.currentCandle.time;

      // Realistic tick variation
      const u1 = Math.max(1e-9, Math.random());
      const u2 = Math.random();
      const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
      const tickDeltaPct = (z0 * this.asset.volatility) / 8;
      const newPrice = Math.max(
        0.0001,
        this.currentCandle.close * (1 + tickDeltaPct)
      );

      let updatedCandle: Candle;
      if (isNewCandle) {
        updatedCandle = {
          time: candleStartTime,
          open: this.currentCandle.close,
          high: Math.max(this.currentCandle.close, newPrice),
          low: Math.min(this.currentCandle.close, newPrice),
          close: Number(newPrice.toFixed(this.asset.decimals)),
          volume: Math.round(5 + Math.random() * 20),
        };
      } else {
        updatedCandle = {
          ...this.currentCandle,
          high: Number(
            Math.max(this.currentCandle.high, newPrice).toFixed(this.asset.decimals)
          ),
          low: Number(
            Math.min(this.currentCandle.low, newPrice).toFixed(this.asset.decimals)
          ),
          close: Number(newPrice.toFixed(this.asset.decimals)),
          volume: this.currentCandle.volume + Math.round(1 + Math.random() * 5),
        };
      }

      this.currentCandle = updatedCandle;
      this.emitUpdate(updatedCandle, isNewCandle, updatedCandle.close, 'Simulated Microstructure');
    }, 1200);
  }

  private emitUpdate(candle: Candle, isNewCandle: boolean, livePrice: number, source: string = 'Real-time Feed') {
    const payload = {
      candle,
      isNewCandle,
      livePrice,
      tickTime: Date.now(),
      source,
    };
    for (const listener of this.listeners) {
      try {
        listener(payload);
      } catch {
        // ignore subscriber errors
      }
    }
  }

  /**
   * Inject a real-time volatility or price shock for stress testing
   */
  public injectShock(shockPct: number) {
    if (!this.currentCandle) return;
    const newPrice = this.currentCandle.close * (1 + shockPct);
    const updatedCandle: Candle = {
      ...this.currentCandle,
      high: Math.max(this.currentCandle.high, newPrice),
      low: Math.min(this.currentCandle.low, newPrice),
      close: Number(newPrice.toFixed(this.asset.decimals)),
      volume: this.currentCandle.volume + 500,
    };
    this.currentCandle = updatedCandle;
    this.emitUpdate(updatedCandle, false, updatedCandle.close, 'Injected Shock');
  }
}
