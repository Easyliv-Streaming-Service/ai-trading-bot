import { useEffect, useMemo, useState } from "react";

type MarketKind = "crypto" | "fx";

type MarketOption = {
  key: string;
  label: string;
  kind: MarketKind;
  base: string;
  quote: string;
  coingeckoId?: string;
  volatility: number;
  drift: number;
  anchor: number;
};

type Candle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

type NewsItem = {
  title: string;
  source: string;
  link: string;
  published: string;
  sentiment: number;
  summary: string;
  fallback?: boolean;
};

type MarketSnapshot = {
  option: MarketOption;
  candles: Candle[];
  current: number;
  changePct: number;
  source: string;
  updatedAt: string;
  live: boolean;
};

type Analysis = {
  direction: "CALL" | "PUT" | "WAIT";
  confidence: number;
  trend: number;
  momentum: number;
  news: number;
  volatility: number;
  pattern: string;
  rsi: number;
  macd: number;
  support: number;
  resistance: number;
  bias: number;
};

const MARKET_OPTIONS: MarketOption[] = [
  { key: "btcusd", label: "BTC / USD", kind: "crypto", base: "BTC", quote: "USD", coingeckoId: "bitcoin", volatility: 0.06, drift: 0.018, anchor: 68000 },
  { key: "ethusd", label: "ETH / USD", kind: "crypto", base: "ETH", quote: "USD", coingeckoId: "ethereum", volatility: 0.055, drift: 0.014, anchor: 3500 },
  { key: "solusd", label: "SOL / USD", kind: "crypto", base: "SOL", quote: "USD", coingeckoId: "solana", volatility: 0.08, drift: 0.022, anchor: 180 },
  { key: "xrpusd", label: "XRP / USD", kind: "crypto", base: "XRP", quote: "USD", coingeckoId: "ripple", volatility: 0.07, drift: 0.01, anchor: 0.6 },
  { key: "bnbusd", label: "BNB / USD", kind: "crypto", base: "BNB", quote: "USD", coingeckoId: "binancecoin", volatility: 0.05, drift: 0.012, anchor: 600 },
  { key: "adausd", label: "ADA / USD", kind: "crypto", base: "ADA", quote: "USD", coingeckoId: "cardano", volatility: 0.075, drift: 0.01, anchor: 0.55 },
  { key: "dogeusd", label: "DOGE / USD", kind: "crypto", base: "DOGE", quote: "USD", coingeckoId: "dogecoin", volatility: 0.09, drift: 0.008, anchor: 0.15 },
  { key: "ltcusd", label: "LTC / USD", kind: "crypto", base: "LTC", quote: "USD", coingeckoId: "litecoin", volatility: 0.07, drift: 0.01, anchor: 80 },
  { key: "eurusd", label: "EUR / USD", kind: "fx", base: "EUR", quote: "USD", volatility: 0.004, drift: 0.0008, anchor: 1.08 },
  { key: "gbpusd", label: "GBP / USD", kind: "fx", base: "GBP", quote: "USD", volatility: 0.005, drift: 0.001, anchor: 1.28 },
  { key: "usdjpy", label: "USD / JPY", kind: "fx", base: "USD", quote: "JPY", volatility: 0.006, drift: 0.0011, anchor: 148 },
  { key: "usdchf", label: "USD / CHF", kind: "fx", base: "USD", quote: "CHF", volatility: 0.0045, drift: 0.0008, anchor: 0.89 },
  { key: "audusd", label: "AUD / USD", kind: "fx", base: "AUD", quote: "USD", volatility: 0.0055, drift: 0.0009, anchor: 0.66 },
  { key: "usdcad", label: "USD / CAD", kind: "fx", base: "USD", quote: "CAD", volatility: 0.005, drift: 0.0009, anchor: 1.35 },
  { key: "eurjpy", label: "EUR / JPY", kind: "fx", base: "EUR", quote: "JPY", volatility: 0.006, drift: 0.001, anchor: 160 },
  { key: "gbpjpy", label: "GBP / JPY", kind: "fx", base: "GBP", quote: "JPY", volatility: 0.007, drift: 0.0011, anchor: 188 },
  { key: "eurgbp", label: "EUR / GBP", kind: "fx", base: "EUR", quote: "GBP", volatility: 0.004, drift: 0.0006, anchor: 0.85 },
];

const TIMEFRAMES = [
  { key: "1m", label: "1m", days: 1, candles: 60 },
  { key: "5m", label: "5m", days: 3, candles: 72 },
  { key: "15m", label: "15m", days: 7, candles: 84 },
  { key: "1h", label: "1h", days: 30, candles: 90 },
  { key: "4h", label: "4h", days: 90, candles: 96 },
] as const;

const NEWS_FEEDS = [
  { source: "CoinDesk", url: "https://www.coindesk.com/arc/outboundfeeds/rss/" },
  { source: "Cointelegraph", url: "https://cointelegraph.com/rss" },
  { source: "CryptoBriefing", url: "https://cryptobriefing.com/feed/" },
];

const FALLBACK_NEWS: NewsItem[] = [
  {
    title: "Bitcoin, Ethereum, and majors keep traders focused on trend continuation and volatility filters.",
    source: "Market Summary",
    link: "https://www.coindesk.com/",
    published: "Live fallback",
    sentiment: 58,
    summary: "The model uses fresh headlines when available, but this fallback keeps the dashboard useful if a feed is rate limited.",
    fallback: true,
  },
  {
    title: "Macro data and rate expectations can still dominate forex candles even when momentum looks clean.",
    source: "Macro Note",
    link: "https://www.reuters.com/",
    published: "Live fallback",
    sentiment: 52,
    summary: "Forex signals stay filtered by volatility and trend alignment instead of relying on a single candle pattern.",
    fallback: true,
  },
  {
    title: "Strong rallies can reverse fast, so confidence should be treated as a guide rather than a promise.",
    source: "Risk Note",
    link: "https://www.cnbc.com/",
    published: "Live fallback",
    sentiment: 41,
    summary: "The app keeps a risk-aware readout and never claims a guaranteed win rate.",
    fallback: true,
  },
];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function hashString(input: string) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed: number) {
  let t = seed >>> 0;
  return function next() {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function movingAverage(values: number[], period: number) {
  if (values.length < period) return average(values);
  return average(values.slice(values.length - period));
}

function ema(values: number[], period: number) {
  if (!values.length) return 0;
  const multiplier = 2 / (period + 1);
  let current = values[0];
  for (let index = 1; index < values.length; index += 1) {
    current = (values[index] - current) * multiplier + current;
  }
  return current;
}

function rsi(values: number[], period = 14) {
  if (values.length <= period) return 50;
  let gains = 0;
  let losses = 0;
  for (let index = values.length - period; index < values.length; index += 1) {
    const change = values[index] - values[index - 1];
    if (change >= 0) gains += change;
    else losses -= change;
  }
  const averageGain = gains / period;
  const averageLoss = losses / period;
  if (averageLoss === 0) return 100;
  const relativeStrength = averageGain / averageLoss;
  return 100 - 100 / (1 + relativeStrength);
}

function formatPercent(value: number) {
  const safe = Number.isFinite(value) ? value : 0;
  return `${safe >= 0 ? "+" : ""}${safe.toFixed(2)}%`;
}

function formatPrice(value: number, quote: string) {
  const abs = Math.abs(value);
  const digits = abs >= 100 ? 2 : abs >= 1 ? 4 : 6;
  return `${value.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits })} ${quote}`;
}

function formatCandlePrice(value: number, quote: string) {
  return `${value.toLocaleString(undefined, {
    minimumFractionDigits: value >= 100 ? 2 : value >= 1 ? 4 : 6,
    maximumFractionDigits: value >= 100 ? 2 : value >= 1 ? 4 : 6,
  })} ${quote}`;
}

function sentimentFromText(text: string) {
  const positive = ["surge", "bull", "record", "breakout", "rally", "gain", "adoption", "support", "beat", "growth", "approval", "accumulation", "strength"];
  const negative = ["selloff", "crash", "drop", "risk", "lawsuit", "delay", "hack", "liquidation", "fear", "loss", "warning", "uncertain", "pressure"];
  const normalized = text.toLowerCase();
  let score = 50;
  positive.forEach((word) => {
    if (normalized.includes(word)) score += 5;
  });
  negative.forEach((word) => {
    if (normalized.includes(word)) score -= 5;
  });
  return clamp(score, 0, 100);
}

function candlePattern(candles: Candle[]) {
  if (candles.length < 2) return { label: "Sideways", score: 0 };
  const last = candles[candles.length - 1];
  const prev = candles[candles.length - 2];
  const body = Math.abs(last.close - last.open);
  const range = Math.max(last.high - last.low, 1e-8);
  const upperWick = last.high - Math.max(last.close, last.open);
  const lowerWick = Math.min(last.close, last.open) - last.low;
  const bullish = last.close > last.open;
  const prevBullish = prev.close > prev.open;

  if (body / range < 0.18) {
    return { label: "Doji hesitation", score: bullish ? 3 : -3 };
  }
  if (bullish && !prevBullish && last.close > prev.open && last.open < prev.close) {
    return { label: "Bullish engulfing", score: 10 };
  }
  if (!bullish && prevBullish && last.close < prev.open && last.open > prev.close) {
    return { label: "Bearish engulfing", score: -10 };
  }
  if (lowerWick > body * 2 && bullish) {
    return { label: "Hammer reclaim", score: 7 };
  }
  if (upperWick > body * 2 && !bullish) {
    return { label: "Shooting star", score: -7 };
  }
  return { label: bullish ? "Bullish continuation" : "Bearish continuation", score: bullish ? 6 : -6 };
}

function createSyntheticCandles(option: MarketOption, timeframeKey: string, count: number, anchorOverride?: number) {
  const seed = hashString(`${option.key}:${timeframeKey}:${count}`);
  const rand = mulberry32(seed);
  const anchor = anchorOverride ?? option.anchor;
  const candles: Candle[] = [];
  let price = anchor;
  const start = Date.now() - count * 60 * 60 * 1000;

  for (let index = 0; index < count; index += 1) {
    const drift = option.drift + (rand() - 0.5) * option.volatility * 0.15;
    const impulse = Math.sin(index / 4.2) * option.volatility * 0.4 + Math.cos(index / 11.5) * option.volatility * 0.22;
    const swing = drift + impulse + (rand() - 0.5) * option.volatility * 0.45;
    const open = price;
    const close = Math.max(0.00001, open * (1 + swing));
    const wickUp = 1 + rand() * option.volatility * 0.6;
    const wickDown = 1 - rand() * option.volatility * 0.6;
    const high = Math.max(open, close) * wickUp;
    const low = Math.min(open, close) * wickDown;
    const volume = Math.round((rand() * 0.55 + 0.45) * 1000 * (1 + Math.abs(swing) * 12));
    candles.push({
      time: start + index * 60 * 60 * 1000,
      open,
      high,
      low,
      close,
      volume,
    });
    price = close;
  }

  return candles;
}

function pointsToCandles(points: { time: number; price: number; volume?: number }[], count: number) {
  const ordered = [...points].sort((left, right) => left.time - right.time).filter((point) => Number.isFinite(point.price));
  if (ordered.length < 4) return [] as Candle[];

  const bucketSize = Math.max(2, Math.floor(ordered.length / count));
  const candles: Candle[] = [];

  for (let start = 0; start < ordered.length; start += bucketSize) {
    const bucket = ordered.slice(start, start + bucketSize);
    if (bucket.length < 2) break;
    const open = bucket[0].price;
    const close = bucket[bucket.length - 1].price;
    const high = Math.max(...bucket.map((item) => item.price));
    const low = Math.min(...bucket.map((item) => item.price));
    const volume = bucket.reduce((sum, item) => sum + (item.volume ?? 0), 0) || Math.round(900 + Math.abs(close - open) * 1000);
    candles.push({
      time: bucket[bucket.length - 1].time,
      open,
      high,
      low,
      close,
      volume,
    });
  }

  return candles;
}

function deriveAnalysis(candles: Candle[], news: NewsItem[]) {
  const closes = candles.map((candle) => candle.close);
  const latest = closes[closes.length - 1] ?? 0;
  const sma8 = movingAverage(closes, 8);
  const sma21 = movingAverage(closes, 21);
  const ema12 = ema(closes.slice(-26), 12);
  const ema26 = ema(closes.slice(-26), 26);
  const macdValue = ema12 - ema26;
  const rsiValue = rsi(closes, 14);
  const candle = candlePattern(candles);
  const recentMoves = closes.slice(-8);
  const slope = recentMoves.length > 1 ? (recentMoves[recentMoves.length - 1] - recentMoves[0]) / recentMoves[0] : 0;
  const trendScore = clamp(50 + slope * 450 + (latest > sma8 ? 7 : -7) + (sma8 > sma21 ? 5 : -5), 0, 100);
  const momentumScore = clamp(50 + (rsiValue - 50) * 1.1 + (macdValue / latest) * 1500 + candle.score, 0, 100);
  const newsAverage = news.length ? average(news.map((item) => item.sentiment)) : 50;
  const newsScore = clamp(newsAverage, 0, 100);
  const support = Math.min(...candles.slice(-24).map((candleItem) => candleItem.low));
  const resistance = Math.max(...candles.slice(-24).map((candleItem) => candleItem.high));
  const range = Math.max(resistance - support, latest * 0.0001);
  const volatilityPct = clamp(((resistance - support) / latest) * 100, 0, 100);
  const bias = (trendScore - 50) * 0.42 + (momentumScore - 50) * 0.38 + (newsScore - 50) * 0.2 - (volatilityPct > 4 ? 6 : 0);
  const confidence = clamp(50 + Math.abs(bias) * 0.9, 0, 99);
  const bullish = bias > 3.5;
  const bearish = bias < -3.5;
  const direction: Analysis["direction"] = confidence < 57 ? "WAIT" : bullish ? "CALL" : bearish ? "PUT" : "WAIT";

  return {
    direction,
    confidence,
    trend: trendScore,
    momentum: momentumScore,
    news: newsScore,
    volatility: volatilityPct,
    pattern: candle.label,
    rsi: rsiValue,
    macd: macdValue,
    support: support || latest - range * 0.45,
    resistance: resistance || latest + range * 0.45,
    bias,
  } satisfies Analysis;
}

function newsFallback(option: MarketOption) {
  return FALLBACK_NEWS.map((item, index) => ({
    ...item,
    title: index === 0 && option.kind === "crypto"
      ? `${option.label} traders watch headline flow, volatility, and trend confirmation before entering.`
      : item.title,
  }));
}

async function loadCryptoSeries(option: MarketOption, timeframe: (typeof TIMEFRAMES)[number]) {
  if (!option.coingeckoId) throw new Error("Missing CoinGecko id");
  const url = `https://api.coingecko.com/api/v3/coins/${option.coingeckoId}/market_chart?vs_currency=usd&days=${timeframe.days}&interval=${timeframe.days <= 1 ? "hourly" : "daily"}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`CoinGecko request failed: ${response.status}`);
  const data = await response.json();
  const prices = Array.isArray(data?.prices) ? data.prices.map(([time, price]: [number, number]) => ({ time, price })) : [];
  const volumes = Array.isArray(data?.total_volumes)
    ? new Map(data.total_volumes.map(([time, volume]: [number, number]) => [time, volume]))
    : new Map<number, number>();

  return prices.map((point: { time: number; price: number }) => ({
    ...point,
    volume: volumes.get(point.time),
  }));
}

async function loadFxSeries(option: MarketOption, timeframe: (typeof TIMEFRAMES)[number]) {
  const start = new Date();
  start.setUTCDate(start.getUTCDate() - timeframe.days);
  const fromDate = start.toISOString().slice(0, 10);
  const frankfurterUrl = `https://api.frankfurter.dev/v1/${fromDate}..?base=${option.base}&symbols=${option.quote}`;
  try {
    const response = await fetch(frankfurterUrl);
    if (response.ok) {
      const data = await response.json();
      const rawRates = data?.rates;
      const points: { time: number; price: number }[] = [];

      if (rawRates && typeof rawRates === "object") {
        for (const [key, value] of Object.entries(rawRates)) {
          if (typeof value === "number") {
            points.push({ time: Date.parse(key), price: value });
            continue;
          }
          if (value && typeof value === "object") {
            const nested = value as Record<string, unknown>;
            if (typeof nested[option.quote] === "number") {
              points.push({ time: Date.parse(key), price: nested[option.quote] as number });
            }
          }
        }
      }

      if (points.length > 3) return points;
    }
  } catch {
    // Fallback below.
  }

  const latest = await fetch(`https://open.er-api.com/v6/latest/${option.base}`);
  if (!latest.ok) throw new Error(`FX request failed: ${latest.status}`);
  const data = await latest.json();
  const rate = data?.rates?.[option.quote];
  if (typeof rate !== "number") throw new Error("FX quote missing");
  return [{ time: Date.now(), price: rate }];
}

async function loadNews(option: MarketOption) {
  const feedUrls = option.kind === "crypto" ? NEWS_FEEDS : [NEWS_FEEDS[0], NEWS_FEEDS[2]];
  const requests = feedUrls.map(async (feed) => {
    const url = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed.url)}&count=4`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`RSS request failed: ${response.status}`);
    const data = await response.json();
    const items = Array.isArray(data?.items) ? data.items : [];
    return items.map((item: { title?: string; link?: string; pubDate?: string; description?: string }) => {
      const title = item.title ?? "Untitled update";
      const summary = item.description ? stripHtml(item.description) : "";
      return {
        title,
        source: feed.source,
        link: item.link ?? feed.url,
        published: item.pubDate ?? "Today",
        sentiment: sentimentFromText(`${title} ${summary}`),
        summary: summary || "Latest market headline pulled from a public RSS source.",
      } satisfies NewsItem;
    });
  });

  const settled = await Promise.allSettled(requests);
  const collected = settled.flatMap((result) => (result.status === "fulfilled" ? result.value : []));

  if (collected.length) {
    return collected.sort((left, right) => right.sentiment - left.sentiment).slice(0, 6);
  }

  return newsFallback(option);
}

function stripHtml(input: string) {
  return input.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function buildPolyline(candles: Candle[], width: number, height: number, padding: number) {
  if (!candles.length) return "";
  const closes = candles.map((candle) => candle.close);
  const min = Math.min(...candles.map((candle) => candle.low));
  const max = Math.max(...candles.map((candle) => candle.high));
  const range = Math.max(max - min, 1e-8);
  const usableWidth = width - padding * 2;
  const usableHeight = height - padding * 2;
  return closes
    .map((close, index) => {
      const x = padding + (index / Math.max(candles.length - 1, 1)) * usableWidth;
      const y = padding + ((max - close) / range) * usableHeight;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}

function MarketGauge({ analysis }: { analysis: Analysis }) {
  const circumference = 2 * Math.PI * 44;
  const offset = circumference - (circumference * analysis.confidence) / 100;
  const accent = analysis.direction === "CALL" ? "#34d399" : analysis.direction === "PUT" ? "#f87171" : "#fbbf24";

  return (
    <div className="flex items-center gap-5">
      <div className="relative h-32 w-32 shrink-0">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
          <circle cx="60" cy="60" r="44" fill="none" stroke="rgba(148,163,184,0.16)" strokeWidth="10" />
          <circle
            cx="60"
            cy="60"
            r="44"
            fill="none"
            stroke={accent}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 700ms ease, stroke 400ms ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <div className="text-3xl font-semibold tracking-tight text-white">{Math.round(analysis.confidence)}%</div>
          <div className="text-xs uppercase tracking-[0.35em] text-slate-400">confidence</div>
        </div>
      </div>
      <div>
        <div className="text-sm uppercase tracking-[0.35em] text-slate-400">Model verdict</div>
        <div className="mt-2 text-2xl font-semibold text-white">{analysis.direction}</div>
        <p className="mt-2 max-w-xs text-sm leading-6 text-slate-300">
          Heuristic call based on trend, momentum, candle shape, and headline sentiment. Not a guaranteed win rate.
        </p>
      </div>
    </div>
  );
}

function MetricBar({ label, value, tone = "cyan" }: { label: string; value: number; tone?: "cyan" | "emerald" | "rose" | "amber" }) {
  const colorMap = {
    cyan: "from-cyan-400 to-sky-500",
    emerald: "from-emerald-400 to-teal-500",
    rose: "from-rose-400 to-fuchsia-500",
    amber: "from-amber-300 to-orange-400",
  } as const;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm text-slate-300">
        <span>{label}</span>
        <span className="font-medium text-white">{Math.round(value)}</span>
      </div>
      <div className="h-2 overflow-hidden bg-white/10">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${colorMap[tone]}`}
          style={{ width: `${clamp(value, 0, 100)}%`, transition: "width 600ms ease" }}
        />
      </div>
    </div>
  );
}

function SimpleSparkline({ values, accent = "#38bdf8" }: { values: number[]; accent?: string }) {
  const width = 140;
  const height = 42;
  const padding = 2;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 1e-8);
  const points = values
    .map((value, index) => {
      const x = padding + (index / Math.max(values.length - 1, 1)) * (width - padding * 2);
      const y = padding + ((max - value) / range) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-10 w-36">
      <polyline fill="none" stroke={accent} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" points={points} />
    </svg>
  );
}

function MarketChart({ candles, current, option, live }: { candles: Candle[]; current: number; option: MarketOption; live: boolean }) {
  const width = 980;
  const height = 460;
  const padding = 34;
  const min = Math.min(...candles.map((candle) => candle.low));
  const max = Math.max(...candles.map((candle) => candle.high));
  const range = Math.max(max - min, 1e-8);
  const usableWidth = width - padding * 2;
  const usableHeight = height - padding * 2;
  const candleWidth = Math.max(3, usableWidth / candles.length * 0.6);
  const polyline = buildPolyline(candles, width, height, padding);
  const area = (() => {
    if (!candles.length) return "";
    const points = candles.map((candle, index) => {
      const x = padding + (index / Math.max(candles.length - 1, 1)) * usableWidth;
      const y = padding + ((max - candle.close) / range) * usableHeight;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    });
    const baseline = height - padding;
    return `M ${padding.toFixed(2)} ${baseline.toFixed(2)} L ${points.join(" L ")} L ${(padding + usableWidth).toFixed(2)} ${baseline.toFixed(2)} Z`;
  })();

  const markers = candles.filter((_, index) => index % Math.max(1, Math.floor(candles.length / 4)) === 0);

  return (
    <div className="relative overflow-hidden border border-white/10 bg-white/[0.03] p-4 shadow-[0_30px_90px_rgba(8,15,35,0.45)] backdrop-blur-xl">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:72px_72px] opacity-50" />
      <div className="relative flex items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <div className="text-xs uppercase tracking-[0.35em] text-slate-400">live chart</div>
          <h3 className="mt-2 text-2xl font-semibold text-white">{option.label}</h3>
          <p className="mt-1 text-sm text-slate-300">{live ? "Live price baseline with market feed fallback" : "Synthetic market model for offline mode"}</p>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase tracking-[0.35em] text-slate-400">last price</div>
          <div className="mt-2 text-2xl font-semibold text-white">{formatPrice(current, option.quote)}</div>
        </div>
      </div>

      <div className="relative mt-4 overflow-hidden">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-[420px] w-full">
          <defs>
            <linearGradient id="areaGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.34" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.02" />
            </linearGradient>
            <linearGradient id="bullGradient" x1="0" x2="1">
              <stop offset="0%" stopColor="#34d399" />
              <stop offset="100%" stopColor="#22d3ee" />
            </linearGradient>
            <linearGradient id="bearGradient" x1="0" x2="1">
              <stop offset="0%" stopColor="#fb7185" />
              <stop offset="100%" stopColor="#f472b6" />
            </linearGradient>
          </defs>

          <g opacity="0.45">
            {markers.map((_, index) => {
              const x = padding + (index / Math.max(markers.length - 1, 1)) * usableWidth;
              return <line key={`grid-${index}`} x1={x} y1={padding} x2={x} y2={height - padding} stroke="rgba(148,163,184,0.2)" strokeWidth="1" />;
            })}
            {Array.from({ length: 5 }).map((_, index) => {
              const y = padding + (index / 4) * usableHeight;
              return <line key={`h-${index}`} x1={padding} y1={y} x2={width - padding} y2={y} stroke="rgba(148,163,184,0.16)" strokeWidth="1" />;
            })}
          </g>

          {area && <path d={area} fill="url(#areaGradient)" opacity="0.9" />}
          {polyline && (
            <polyline
              key={`${option.key}-${candles[candles.length - 1]?.time}`}
              points={polyline}
              fill="none"
              stroke="url(#bullGradient)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              pathLength={1}
              className="chart-draw"
            />
          )}

          {candles.map((candle, index) => {
            const x = padding + (index / Math.max(candles.length - 1, 1)) * usableWidth;
            const openY = padding + ((max - candle.open) / range) * usableHeight;
            const closeY = padding + ((max - candle.close) / range) * usableHeight;
            const highY = padding + ((max - candle.high) / range) * usableHeight;
            const lowY = padding + ((max - candle.low) / range) * usableHeight;
            const bullish = candle.close >= candle.open;
            const bodyY = Math.min(openY, closeY);
            const bodyHeight = Math.max(Math.abs(closeY - openY), 1.6);
            return (
              <g key={`${candle.time}-${index}`}>
                <line
                  x1={x}
                  y1={highY}
                  x2={x}
                  y2={lowY}
                  stroke={bullish ? "#34d399" : "#fb7185"}
                  strokeWidth="1.8"
                  opacity="0.9"
                />
                <rect
                  x={x - candleWidth / 2}
                  y={bodyY}
                  width={candleWidth}
                  height={bodyHeight}
                  rx={1.5}
                  fill={bullish ? "url(#bullGradient)" : "url(#bearGradient)"}
                />
              </g>
            );
          })}

          <text x={padding} y={height - 12} fill="rgba(203,213,225,0.65)" fontSize="12" letterSpacing="3">trend line + candle body blend</text>
        </svg>
      </div>
    </div>
  );
}

function NewsList({ items, sourceLabel }: { items: NewsItem[]; sourceLabel: string }) {
  return (
    <div className="border-t border-white/10 pt-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.35em] text-slate-400">crypto news pulse</div>
          <h3 className="mt-2 text-2xl font-semibold text-white">Reliable headlines, scored for sentiment</h3>
        </div>
          <p className="max-w-md text-sm leading-6 text-slate-300">
          The news layer ingests public RSS feeds when available and falls back to curated market notes if a feed blocks browser access.
        </p>
        <div className="text-right text-xs uppercase tracking-[0.35em] text-slate-500">
          source: <span className="text-cyan-200">{sourceLabel}</span>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        {items.map((item, index) => (
          <a
            key={`${item.source}-${index}`}
            href={item.link}
            target="_blank"
            rel="noreferrer"
            className="group block border border-white/10 bg-white/[0.02] p-4 transition duration-300 hover:border-cyan-300/40 hover:bg-white/[0.05]"
          >
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs uppercase tracking-[0.3em] text-cyan-300">{item.source}</span>
              <span className="text-xs text-slate-500">{item.published}</span>
              <span
                className={`text-xs font-medium ${item.sentiment >= 60 ? "text-emerald-300" : item.sentiment >= 45 ? "text-amber-300" : "text-rose-300"}`}
              >
                sentiment {item.sentiment}
              </span>
              {item.fallback ? <span className="text-[11px] uppercase tracking-[0.3em] text-slate-500">fallback</span> : null}
            </div>
            <h4 className="mt-3 text-lg font-medium text-white transition group-hover:text-cyan-200">{item.title}</h4>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-400">{item.summary}</p>
          </a>
        ))}
      </div>
    </div>
  );
}

function App() {
  const [selectedKey, setSelectedKey] = useState("btcusd");
  const [timeframeKey, setTimeframeKey] = useState<(typeof TIMEFRAMES)[number]["key"]>("1h");
  const [useLiveData, setUseLiveData] = useState(true);
  const [refreshIndex, setRefreshIndex] = useState(0);
  const [market, setMarket] = useState<MarketSnapshot>(() => {
    const option = MARKET_OPTIONS[0];
    const frame = TIMEFRAMES[3];
    const candles = createSyntheticCandles(option, frame.key, frame.candles);
    return {
      option,
      candles,
      current: candles[candles.length - 1]?.close ?? option.anchor,
      changePct: (((candles[candles.length - 1]?.close ?? option.anchor) - candles[0]?.open) / (candles[0]?.open || 1)) * 100,
      source: "Synthetic demo mode",
      updatedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      live: false,
    };
  });
  const [news, setNews] = useState<NewsItem[]>(FALLBACK_NEWS);
  const [newsSource, setNewsSource] = useState("Fallback headlines");

  const option = useMemo(() => MARKET_OPTIONS.find((entry) => entry.key === selectedKey) ?? MARKET_OPTIONS[0], [selectedKey]);
  const timeframe = useMemo(() => TIMEFRAMES.find((entry) => entry.key === timeframeKey) ?? TIMEFRAMES[3], [timeframeKey]);
  const analysis = useMemo(() => deriveAnalysis(market.candles, news), [market.candles, news]);
  const recentValues = market.candles.slice(-7).map((candle) => candle.close);

  useEffect(() => {
    let active = true;
    const selectedFrame = timeframe;

    async function runMarketLoad() {
      const useRealData = useLiveData;

      try {
        if (option.kind === "crypto" && useRealData) {
          const points = await loadCryptoSeries(option, selectedFrame);
          if (!active) return;
          const candles = pointsToCandles(points, selectedFrame.candles);
          const resolved = candles.length ? candles : createSyntheticCandles(option, selectedFrame.key, selectedFrame.candles, points[points.length - 1]?.price ?? option.anchor);
          const current = resolved[resolved.length - 1]?.close ?? option.anchor;
          const first = resolved[0]?.open ?? current;
          setMarket({
            option,
            candles: resolved,
            current,
            changePct: ((current - first) / (first || 1)) * 100,
            source: "CoinGecko market chart",
            updatedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            live: true,
          });
          return;
        }

        if (option.kind === "fx" && useRealData) {
          const points = await loadFxSeries(option, selectedFrame);
          if (!active) return;
          const anchor = points[points.length - 1]?.price ?? option.anchor;
          const candles = createSyntheticCandles(option, selectedFrame.key, selectedFrame.candles, anchor);
          const first = candles[0]?.open ?? anchor;
          const current = candles[candles.length - 1]?.close ?? anchor;
          setMarket({
            option,
            candles,
            current,
            changePct: ((current - first) / (first || 1)) * 100,
            source: points.length > 1 ? "Frankfurter + live FX anchor" : "Open ER API anchor",
            updatedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            live: true,
          });
          return;
        }
      } catch {
        // Fallback below.
      }

      if (!active) return;
      const candles = createSyntheticCandles(option, selectedFrame.key, selectedFrame.candles);
      const current = candles[candles.length - 1]?.close ?? option.anchor;
      const first = candles[0]?.open ?? current;
      setMarket({
        option,
        candles,
        current,
        changePct: ((current - first) / (first || 1)) * 100,
        source: "Synthetic fallback model",
        updatedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        live: false,
      });
    }

    runMarketLoad();
    return () => {
      active = false;
    };
  }, [option, timeframe, useLiveData, refreshIndex]);

  useEffect(() => {
    let active = true;

    async function runNewsLoad() {
      try {
        const items = await loadNews(option);
        if (!active) return;
        setNews(items);
        setNewsSource(items.some((item) => item.fallback) ? "Fallback headlines" : "RSS2JSON public feeds");
      } catch {
        if (!active) return;
        const fallback = newsFallback(option);
        setNews(fallback);
        setNewsSource("Fallback headlines");
      }
    }

    runNewsLoad();
    return () => {
      active = false;
    };
  }, [option, refreshIndex]);

  return (
    <main className="bg-[#050816] text-slate-100">
      <section className="relative isolate overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.16),transparent_30%),radial-gradient(circle_at_80%_20%,rgba(16,185,129,0.12),transparent_25%),linear-gradient(180deg,#070b18_0%,#050816_54%,#04050e_100%)]" />
        <div className="absolute -left-24 top-20 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl motion-drift" />
        <div className="absolute right-0 top-0 h-[42rem] w-[42rem] rounded-full bg-fuchsia-500/10 blur-3xl motion-drift-delayed" />

        <div className="relative mx-auto grid min-h-screen max-w-7xl gap-12 px-6 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:px-8">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-3 border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.4em] text-cyan-200 backdrop-blur-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-400 pulse-dot" />
              Pocket Signal Lab
            </div>
            <h1 className="mt-8 text-5xl font-semibold tracking-tight text-white sm:text-6xl lg:text-7xl">
              AI market scanning for Pocket Option style short-term setups.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-slate-300 sm:text-lg">
              This browser app studies candlesticks, trend structure, momentum, and crypto headlines from public sources to suggest a directional bias.
              It does not promise a 90 percent win rate, and it is not affiliated with Pocket Option.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => document.getElementById("scanner")?.scrollIntoView({ behavior: "smooth", block: "start" })}
                className="border border-cyan-300/40 bg-cyan-300/12 px-5 py-3 text-sm font-medium text-cyan-100 transition hover:-translate-y-0.5 hover:border-cyan-200/70 hover:bg-cyan-300/18"
              >
                Open scanner
              </button>
              <button
                type="button"
                onClick={() => setRefreshIndex((count) => count + 1)}
                className="border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-white transition hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/10"
              >
                Refresh analysis
              </button>
              <label className="flex items-center gap-3 border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
                <span className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${useLiveData ? "bg-emerald-500/70" : "bg-slate-600"}`}>
                  <span className={`absolute left-0.5 h-4 w-4 rounded-full bg-white transition ${useLiveData ? "translate-x-4" : "translate-x-0"}`} />
                </span>
                <input type="checkbox" className="sr-only" checked={useLiveData} onChange={(event) => setUseLiveData(event.target.checked)} />
                Live feeds on
              </label>
            </div>

            <div className="mt-10 grid gap-4 text-sm text-slate-300 sm:grid-cols-3">
              <div className="border-l border-white/10 pl-4">
                <div className="text-xs uppercase tracking-[0.35em] text-slate-500">Bias engine</div>
                <div className="mt-2 font-medium text-white">Trend, candle shape, momentum</div>
              </div>
              <div className="border-l border-white/10 pl-4">
                <div className="text-xs uppercase tracking-[0.35em] text-slate-500">News layer</div>
                <div className="mt-2 font-medium text-white">Public RSS feeds and fallback headlines</div>
              </div>
              <div className="border-l border-white/10 pl-4">
                <div className="text-xs uppercase tracking-[0.35em] text-slate-500">Safety</div>
                <div className="mt-2 font-medium text-white">No guaranteed win rate, no auto-trade execution</div>
              </div>
            </div>
          </div>

          <div className="relative h-[34rem] lg:h-[42rem]">
            <div className="absolute inset-0 border border-white/10 bg-white/[0.03] shadow-[0_30px_120px_rgba(8,15,35,0.6)]" />
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:80px_80px] opacity-55" />
            <div className="relative flex h-full flex-col justify-between p-6 lg:p-8">
              <div className="flex items-center justify-between gap-4 text-sm text-slate-300">
                <div>
                  <div className="text-xs uppercase tracking-[0.35em] text-slate-500">Selected pair</div>
                  <div className="mt-1 text-lg font-medium text-white">{market.option.label}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs uppercase tracking-[0.35em] text-slate-500">source</div>
                  <div className="mt-1 text-sm text-cyan-200">{market.source}</div>
                </div>
              </div>

              <div className="mt-6 flex-1">
                <MarketChart candles={market.candles} current={market.current} option={market.option} live={market.live} />
              </div>

              <div className="mt-6 grid grid-cols-2 gap-4 border-t border-white/10 pt-5 text-sm text-slate-300 sm:grid-cols-4">
                <div>
                  <div className="text-xs uppercase tracking-[0.35em] text-slate-500">Current</div>
                  <div className="mt-1 font-medium text-white">{formatPrice(market.current, market.option.quote)}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.35em] text-slate-500">Change</div>
                  <div className={`mt-1 font-medium ${market.changePct >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{formatPercent(market.changePct)}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.35em] text-slate-500">Updated</div>
                  <div className="mt-1 font-medium text-white">{market.updatedAt}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.35em] text-slate-500">Mode</div>
                  <div className="mt-1 font-medium text-white">{market.live ? "Live + synthetic blend" : "Synthetic fallback"}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="scanner" className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-8">
            <div>
              <div className="text-xs uppercase tracking-[0.35em] text-slate-500">Scanner</div>
              <h2 className="mt-2 text-3xl font-semibold text-white">Pick a pair and read the bias</h2>
              <p className="mt-3 max-w-xl text-sm leading-7 text-slate-300">
                The model refreshes with live crypto market charts where possible, anchors forex pairs to public rate feeds, and then blends that with
                headline sentiment. It is a decision aid, not a profit guarantee.
              </p>
            </div>

            <div className="space-y-5 border border-white/10 bg-white/[0.03] p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-sm text-slate-300">
                  <span className="block text-xs uppercase tracking-[0.35em] text-slate-500">Market pair</span>
                  <select
                    value={selectedKey}
                    onChange={(event) => setSelectedKey(event.target.value)}
                    className="w-full border border-white/10 bg-slate-950/80 px-4 py-3 text-white outline-none transition focus:border-cyan-300/50"
                  >
                    <optgroup label="Crypto pairs">
                      {MARKET_OPTIONS.filter((entry) => entry.kind === "crypto").map((entry) => (
                        <option key={entry.key} value={entry.key}>
                          {entry.label}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Forex pairs">
                      {MARKET_OPTIONS.filter((entry) => entry.kind === "fx").map((entry) => (
                        <option key={entry.key} value={entry.key}>
                          {entry.label}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </label>

                <div className="space-y-2 text-sm text-slate-300">
                  <span className="block text-xs uppercase tracking-[0.35em] text-slate-500">Timeframe</span>
                  <div className="grid grid-cols-5 gap-2">
                    {TIMEFRAMES.map((frame) => {
                      const active = frame.key === timeframeKey;
                      return (
                        <button
                          key={frame.key}
                          type="button"
                          onClick={() => setTimeframeKey(frame.key)}
                          className={`border px-3 py-3 text-sm font-medium transition ${
                            active
                              ? "border-cyan-300/50 bg-cyan-300/12 text-cyan-100"
                              : "border-white/10 bg-white/[0.03] text-slate-200 hover:border-white/20 hover:bg-white/[0.06]"
                          }`}
                        >
                          {frame.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <MetricBar label="Trend strength" value={analysis.trend} tone="emerald" />
                <MetricBar label="Momentum" value={analysis.momentum} tone="cyan" />
                <MetricBar label="News sentiment" value={analysis.news} tone="amber" />
                <MetricBar label="Volatility filter" value={100 - analysis.volatility} tone="rose" />
              </div>

              <div className="border-t border-white/10 pt-5">
                <MarketGauge analysis={analysis} />
              </div>

              <div className="grid gap-3 border-t border-white/10 pt-5 text-sm text-slate-300 sm:grid-cols-2">
                <div>
                  <div className="text-xs uppercase tracking-[0.35em] text-slate-500">Pattern</div>
                  <div className="mt-1 text-white">{analysis.pattern}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.35em] text-slate-500">RSI / MACD</div>
                  <div className="mt-1 text-white">
                    {analysis.rsi.toFixed(1)} / {analysis.macd >= 0 ? "+" : ""}{analysis.macd.toFixed(4)}
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.35em] text-slate-500">Support</div>
                  <div className="mt-1 text-white">{formatCandlePrice(analysis.support, market.option.quote)}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.35em] text-slate-500">Resistance</div>
                  <div className="mt-1 text-white">{formatCandlePrice(analysis.resistance, market.option.quote)}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <div className="border border-white/10 bg-white/[0.03] p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs uppercase tracking-[0.35em] text-slate-500">Model notes</div>
                  <h3 className="mt-2 text-2xl font-semibold text-white">How the signal is built</h3>
                </div>
                <SimpleSparkline values={recentValues.length >= 2 ? recentValues : [market.current, market.current * 1.01]} />
              </div>
              <div className="mt-5 space-y-4 text-sm leading-7 text-slate-300">
                <p>
                  1. Candles are normalized into a short-term series and checked against moving averages, RSI, MACD-like momentum, and the last candle
                  shape.
                </p>
                <p>
                  2. Crypto markets can load live chart data from CoinGecko. Forex pairs are anchored to public rate feeds and then modeled into a
                  short-term candle sequence.
                </p>
                <p>
                  3. News headlines from public RSS sources are scored for positive and negative language, then folded into the final confidence.
                </p>
                <p>
                  4. If the volatility filter is too wide or the signals conflict, the app shifts toward WAIT instead of forcing a trade.
                </p>
              </div>
            </div>

            <NewsList items={news} sourceLabel={newsSource} />
          </div>
        </div>
      </section>

      <section className="border-t border-white/10 bg-white/[0.02]">
        <div className="mx-auto max-w-7xl px-6 py-10 text-sm leading-7 text-slate-300 lg:px-8">
          <div className="grid gap-4 md:grid-cols-3">
            <p>
              This page is a browser-based analysis demo, not an actual auto-trading bot. It can help you review markets, but it cannot guarantee a
              90 percent win rate.
            </p>
            <p>
              No trading engine can remove risk. Short-term option style strategies are especially sensitive to spread, news shocks, and timing.
            </p>
            <p>
              If you want, the next step can be a backend-powered version with authenticated APIs, watchlists, alerts, and paper-trading export.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

export default App;