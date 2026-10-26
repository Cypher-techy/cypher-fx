import { describe, it, expect, vi } from "vitest";
import Decimal from "decimal.js";
import { replay, publicMarket, estimateTrade } from "@/lib/website/market";
describe("read-only public website data", () => {
  it("replays explicitly synthetic candles without claiming current market timestamps", () => {
    const now = 1800000000000,
      a = replay("EUR_USD", "1h", now),
      b = replay("EUR_USD", "1h", now + 5000);
    expect(a.quote.synthetic).toBe(true);
    expect(a.quote.source).toContain("synthetic");
    expect(a.quote.time).not.toBe(new Date(now).toISOString());
    expect(b.sequence).toBe(a.sequence + 1);
    expect(a.quote.bid).not.toBe(b.quote.bid);
    expect(a.candles.at(-1)?.close.toFixed(5)).toBe(a.quote.bid);
    expect(a.quote.preview).toHaveLength(24);
  });
  it("changes instrument and candle timeframe correctly", () => {
    const a = replay("EUR_USD", "1h"),
      b = replay("GBP_USD", "5m");
    expect(a.quote.bid).not.toBe(b.quote.bid);
    expect(a.candles[1].time - a.candles[0].time).toBe(3600);
    expect(b.candles[1].time - b.candles[0].time).toBe(300);
  });
  it("never exposes provider data without explicit public distribution configuration", async () => {
    vi.stubEnv("ENABLE_PUBLIC_MARKET_DATA", "false");
    const d = await publicMarket("USD_JPY", "1h");
    expect(d.synthetic).toBe(true);
    expect(d.quotes).toHaveLength(6);
    expect(d.attribution).toContain("Not live");
    vi.unstubAllEnvs();
  });
  it("fails closed when public licensed data is enabled but credentials are missing", async () => {
    vi.stubEnv("ENABLE_PUBLIC_MARKET_DATA", "true");
    vi.stubEnv("OANDA_API_TOKEN", "");
    await expect(publicMarket("EUR_USD", "1h")).rejects.toThrow(
      "not configured",
    );
    vi.unstubAllEnvs();
  });
  it("rejects unsupported symbols and timeframes", () => {
    expect(() => replay("FAKE_USD", "1h")).toThrow();
    expect(() => replay("EUR_USD", "7m")).toThrow();
  });
  it("calculates hypothetical margin and pip values with Decimal on the server", () => {
    const now = 1800000000000,
      e = estimateTrade(
        { symbol: "EUR_USD", lots: "0.10", leverage: 100 },
        now,
      );
    expect(e.marginUSD).toBe(
      new Decimal(e.referencePrice).mul(10000).div(100).toFixed(2),
    );
    expect(e.pipValueUSD).toBe("1.00");
    expect(e.synthetic).toBe(true);
    expect(e.units).toBe("10000");
    expect(e.disclaimer).toContain("no wallet balance changes");
    const j = estimateTrade(
      { symbol: "USD_JPY", lots: "0.10", leverage: 100 },
      now,
    );
    expect(j.marginUSD).toBe("100.00");
    expect(j.pipValueUSD).toBe(
      new Decimal(100).div(j.referencePrice).toFixed(2),
    );
  });
  it("rejects invalid size/leverage inputs before estimation", () => {
    expect(() =>
      estimateTrade({ symbol: "EUR_USD", lots: "0", leverage: 100 }),
    ).toThrow();
    expect(() =>
      estimateTrade({ symbol: "EUR_USD", lots: "1000", leverage: 100 }),
    ).toThrow();
    expect(() =>
      estimateTrade({ symbol: "EUR_USD", lots: ".1", leverage: 10000 }),
    ).toThrow();
  });
});
