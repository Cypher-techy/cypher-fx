import Decimal from "decimal.js";
import {
  fixtureCandles,
  market,
  quote,
  symbols,
  type Candle,
  type Quote,
} from "../providers/market";
import { requireThat } from "../errors";
export const publicInstruments = [
  {
    symbol: "EUR_USD",
    name: "Euro / US Dollar",
    flag: "🇪🇺",
    second: "🇺🇸",
    group: "Europe",
  },
  {
    symbol: "GBP_USD",
    name: "British Pound / US Dollar",
    flag: "🇬🇧",
    second: "🇺🇸",
    group: "Europe",
  },
  {
    symbol: "USD_JPY",
    name: "US Dollar / Japanese Yen",
    flag: "🇺🇸",
    second: "🇯🇵",
    group: "Asia Pacific",
  },
  {
    symbol: "AUD_USD",
    name: "Australian Dollar / US Dollar",
    flag: "🇦🇺",
    second: "🇺🇸",
    group: "Asia Pacific",
  },
  {
    symbol: "USD_CHF",
    name: "US Dollar / Swiss Franc",
    flag: "🇺🇸",
    second: "🇨🇭",
    group: "Europe",
  },
  {
    symbol: "USD_CAD",
    name: "US Dollar / Canadian Dollar",
    flag: "🇺🇸",
    second: "🇨🇦",
    group: "Americas",
  },
];
export type PublicQuote = Quote & {
  change: string;
  spread: string;
  preview: number[];
};
export type PublicMarket = {
  symbol: string;
  timeframe: string;
  candles: Candle[];
  quotes: PublicQuote[];
  synthetic: boolean;
  status: string;
  source: string;
  observedAt: string;
  referenceAt: string;
  sequence: number;
  attribution: string;
};
const intervals = ["1m", "5m", "15m", "1h", "4h", "1d"];
// Explicit synthetic training replay. Historical fixture candles advance one bar every 5s;
// this endpoint is read-only and is NEVER a source of execution or settlement evidence.
export function replay(symbol: string, timeframe: string, now = Date.now()) {
  requireThat(
    symbols.includes(symbol) && intervals.includes(timeframe),
    400,
    "Unsupported symbol or timeframe",
  );
  const candles = fixtureCandles(symbol, timeframe),
    sequence = Math.floor(now / 5000),
    cursor = 80 + (sequence % 70),
    visible = candles.slice(0, cursor + 1),
    last = visible.at(-1)!;
  const spread = symbol === "USD_JPY" ? "0.014" : "0.00012",
    precision = symbol === "USD_JPY" ? 3 : 5;
  const q: PublicQuote = {
    symbol,
    bid: new Decimal(last.close).toFixed(precision),
    ask: new Decimal(last.close).plus(spread).toFixed(precision),
    time: new Date(last.time * 1000).toISOString(),
    source: "CYPHERFX synthetic training replay",
    synthetic: true,
    change: new Decimal(last.close)
      .minus(visible[0].open)
      .div(visible[0].open)
      .mul(100)
      .toFixed(2),
    spread: new Decimal(spread)
      .mul(symbol === "USD_JPY" ? 100 : 10000)
      .toFixed(1),
    preview: visible.slice(-24).map((c) => c.close),
  };
  return { candles: visible, quote: q, sequence };
}
const globalMarket = globalThis as unknown as {
  cypherPublicFeed?: Map<
    string,
    { until: number; data: Promise<PublicMarket> }
  >;
};
export async function publicMarket(
  symbol: string,
  timeframe: string,
): Promise<PublicMarket> {
  requireThat(
    symbols.includes(symbol) && intervals.includes(timeframe),
    400,
    "Unsupported symbol or timeframe",
  );
  if (process.env.ENABLE_PUBLIC_MARKET_DATA !== "true") {
    const now = Date.now(),
      selected = replay(symbol, timeframe, now);
    return {
      symbol,
      timeframe,
      candles: selected.candles,
      quotes: symbols.map((s) => replay(s, timeframe, now).quote),
      synthetic: true,
      status: "SYNTHETIC_REPLAY",
      source: "Synthetic training replay",
      observedAt: new Date(now).toISOString(),
      referenceAt: selected.quote.time,
      sequence: selected.sequence,
      attribution:
        "Synthetic historical training candles replayed every five seconds. Not live forex prices, not investment performance, and not executable quotes.",
    };
  }
  // Public provider redistribution must be explicitly enabled only after licensing review.
  requireThat(
    process.env.MARKET_DATA_PROVIDER === "oanda" &&
      process.env.OANDA_API_TOKEN &&
      process.env.OANDA_ACCOUNT_ID,
    503,
    "Public market data is enabled but the provider is not configured",
  );
  const cache = (globalMarket.cypherPublicFeed ??= new Map()),
    key = symbol + ":" + timeframe;
  const cached = cache.get(key);
  if (cached && cached.until > Date.now()) return cached.data;
  const data = (async () => {
    const selected = await market(symbol, timeframe);
    requireThat(!selected.quote.synthetic, 503, "Provider data unavailable");
    const quotes = await Promise.all(
      symbols.map(async (s) => {
        const q = s === symbol ? selected.quote : await quote(s);
        return {
          ...q,
          change: "",
          spread: new Decimal(q.ask)
            .minus(q.bid)
            .mul(s === "USD_JPY" ? 100 : 10000)
            .toFixed(1),
          preview:
            s === symbol
              ? selected.candles.slice(-24).map((c: Candle) => c.close)
              : [],
        } as PublicQuote;
      }),
    );
    return {
      symbol,
      timeframe,
      candles: selected.candles,
      quotes,
      synthetic: false,
      status: selected.status,
      source: "OANDA",
      observedAt: new Date().toISOString(),
      referenceAt: selected.quote.time,
      sequence: Math.floor(Date.now() / 5000),
      attribution: selected.attribution,
    } as PublicMarket;
  })();
  cache.set(key, { until: Date.now() + 4500, data });
  try {
    return await data;
  } catch (e) {
    cache.delete(key);
    throw e;
  }
}
export function estimateTrade(
  input: { symbol: string; lots: string; leverage: number },
  now = Date.now(),
) {
  requireThat(symbols.includes(input.symbol), 400, "Unsupported instrument");
  const lots = new Decimal(input.lots);
  requireThat(
    lots.gte(".01") &&
      lots.lte("100") &&
      [10, 30, 50, 100].includes(input.leverage),
    400,
    "Choose 0.01–100 lots and a supported leverage",
  );
  const { quote: q } = replay(input.symbol, "1h", now),
    units = lots.mul(100000),
    usdBase = input.symbol.startsWith("USD_"),
    price = new Decimal(q.bid),
    pip = input.symbol === "USD_JPY" ? ".01" : ".0001";
  const margin = units.mul(usdBase ? 1 : price).div(input.leverage),
    pipValue = units.mul(pip).div(usdBase ? price : 1);
  return {
    marginUSD: margin.toFixed(2),
    pipValueUSD: pipValue.toFixed(2),
    units: units.toFixed(0),
    referencePrice: q.bid,
    source: q.source,
    synthetic: true,
    referenceAt: q.time,
    disclaimer:
      "Hypothetical educational estimate using synthetic prices. No order is submitted and no wallet balance changes. This is not a live margin quote.",
  };
}
