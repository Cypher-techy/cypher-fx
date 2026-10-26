"use client";
import { useEffect, useState } from "react";
import { usePublicMarket } from "./use-market";
import { browserPairs } from "./market-explorer";
export function useWebsiteContext(marketEnabled = true) {
  const [symbol, setSymbol] = useState("EUR_USD"),
    [timeframe, setTimeframe] = useState("1h"),
    [session, setSession] = useState<{
      name: string;
      practice: boolean;
    } | null>(null),
    [balance, setBalance] = useState<string | null>(null);
  const feed = usePublicMarket(symbol, timeframe, marketEnabled);
  useEffect(() => {
    let active = true;
    try {
      const saved = JSON.parse(
        localStorage.getItem("cypher-public-market") ?? "null",
      );
      if (saved && browserPairs.some((p) => p.symbol === saved.symbol))
        setSymbol(saved.symbol);
      if (
        saved &&
        ["1m", "5m", "15m", "1h", "4h", "1d"].includes(saved.timeframe)
      )
        setTimeframe(saved.timeframe);
    } catch {}
    const controller = new AbortController();
    fetch("/api/public/session", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((d) => {
        if (active && d.ok) setSession(d.data.user);
      })
      .catch(() => {});
    fetch("/api/public/config", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((d) => {
        if (active && d.ok) setBalance(d.data.demoStartingBalance);
      })
      .catch(() => {});
    return () => {
      active = false;
      controller.abort();
    };
  }, []);
  const chooseSymbol = (v: string) => {
    setSymbol(v);
    try {
      localStorage.setItem(
        "cypher-public-market",
        JSON.stringify({ symbol: v, timeframe }),
      );
    } catch {}
  };
  const chooseTimeframe = (v: string) => {
    setTimeframe(v);
    try {
      localStorage.setItem(
        "cypher-public-market",
        JSON.stringify({ symbol, timeframe: v }),
      );
    } catch {}
  };
  return {
    symbol,
    timeframe,
    chooseSymbol,
    chooseTimeframe,
    feed,
    session,
    setSession,
    balance,
    displayBalance: balance
      ? new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
          maximumFractionDigits: 0,
        }).format(Number(balance))
      : "—",
  };
}
export type WebsiteContext = ReturnType<typeof useWebsiteContext>;
