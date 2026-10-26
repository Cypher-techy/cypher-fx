import { requireThat } from "../errors";
export const symbols = [
  "EUR_USD",
  "GBP_USD",
  "USD_JPY",
  "AUD_USD",
  "USD_CHF",
  "USD_CAD",
];
const bases: Record<string, number> = {
  EUR_USD: 1.08452,
  GBP_USD: 1.29785,
  USD_JPY: 149.632,
  AUD_USD: 0.66342,
  USD_CHF: 0.86641,
  USD_CAD: 1.38265,
};
const granularity: Record<string, string> = {
  "1m": "M1",
  "5m": "M5",
  "15m": "M15",
  "1h": "H1",
  "4h": "H4",
  "1d": "D",
};
export type Quote = {
  symbol: string;
  bid: string;
  ask: string;
  time: string;
  source: string;
  synthetic: boolean;
};
export type Candle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
};
export function syntheticQuote(symbol: string): Quote {
  const base = bases[symbol];
  requireThat(base, 400, "Unsupported instrument");
  const spread = symbol === "USD_JPY" ? 0.014 : 0.00012;
  return {
    symbol,
    bid: base.toFixed(symbol === "USD_JPY" ? 3 : 5),
    ask: (base + spread).toFixed(symbol === "USD_JPY" ? 3 : 5),
    time: new Date().toISOString(),
    source: "CYPHERFX synthetic practice fixture",
    synthetic: true,
  };
}
export function fixtureCandles(symbol: string, timeframe: string): Candle[] {
  const step =
      { "1m": 60, "5m": 300, "15m": 900, "1h": 3600, "4h": 14400, "1d": 86400 }[
        timeframe
      ] ?? 3600,
    base = bases[symbol],
    scale = symbol === "USD_JPY" ? 0.035 : 0.00026;
  const end = 1792771200;
  const n = 150;
  const offset = (i: number) =>
    Math.sin(i * 0.19) * 3 + Math.sin(i * 0.63) * 1.3 + (i - n) * 0.035;
  const close = (i: number) => base + (offset(i) - offset(n - 1)) * scale;
  return Array.from({ length: n }, (_, i) => {
    const o = close(i - 1),
      c = close(i);
    return {
      time: end - (n - 1 - i) * step,
      open: o,
      close: c,
      high: Math.max(o, c) + scale * (0.3 + Math.abs(Math.sin(i * 3.1))),
      low: Math.min(o, c) - scale * (0.3 + Math.abs(Math.cos(i * 2.3))),
    };
  });
}
function configured() {
  return (
    process.env.MARKET_DATA_PROVIDER === "oanda" &&
    process.env.OANDA_API_TOKEN &&
    process.env.OANDA_ACCOUNT_ID
  );
}
async function oanda(path: string) {
  const base =
    process.env.OANDA_ENV === "live"
      ? "https://api-fxtrade.oanda.com"
      : "https://api-fxpractice.oanda.com";
  const r = await fetch(base + path, {
    headers: { Authorization: `Bearer ${process.env.OANDA_API_TOKEN}` },
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  requireThat(r.ok, 503, "Market-data provider unavailable");
  return r.json();
}
export async function quote(symbol: string): Promise<Quote> {
  requireThat(symbols.includes(symbol), 400, "Unsupported instrument");
  if (!configured()) return syntheticQuote(symbol);
  const d = await oanda(
    `/v3/accounts/${encodeURIComponent(process.env.OANDA_ACCOUNT_ID!)}/pricing?instruments=${symbol}`,
  );
  const p = d.prices?.[0];
  requireThat(
    p?.bids?.length && p?.asks?.length && p.status === "tradeable",
    503,
    "Instrument is unavailable",
  );
  return {
    symbol,
    bid: p.bids[0].price,
    ask: p.asks[0].price,
    time: p.time,
    source: "OANDA",
    synthetic: false,
  };
}
export async function market(symbol: string, timeframe: string) {
  requireThat(
    symbols.includes(symbol) && timeframe in granularity,
    400,
    "Unsupported symbol or timeframe",
  );
  if (!configured())
    return {
      quote: syntheticQuote(symbol),
      candles: fixtureCandles(symbol, timeframe),
      status: "SYNTHETIC_PRACTICE",
      attribution:
        "Synthetic training fixture. Not live market data. No volume is supplied.",
    };
  const [q, d] = await Promise.all([
    quote(symbol),
    oanda(
      `/v3/instruments/${symbol}/candles?price=M&count=150&granularity=${granularity[timeframe]}`,
    ),
  ]);
  return {
    quote: q,
    candles: d.candles.map(
      (c: {
        time: string;
        mid: { o: string; h: string; l: string; c: string };
      }) => ({
        time: Math.floor(new Date(c.time).getTime() / 1000),
        open: +c.mid.o,
        high: +c.mid.h,
        low: +c.mid.l,
        close: +c.mid.c,
      }),
    ),
    status:
      Date.now() - new Date(q.time).getTime() > 30000 ? "STALE" : "CONNECTED",
    attribution:
      "OANDA market data. Availability and use are subject to your OANDA agreement.",
  };
}
