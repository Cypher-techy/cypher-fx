"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { PublicMarket } from "@/lib/website/market";
export function usePublicMarket(symbol: string, timeframe: string) {
  const [data, setData] = useState<PublicMarket | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [paused, setPaused] = useState(false),
    [lastReceived, setLastReceived] = useState(0),
    [stale, setStale] = useState(false),
    [refreshKey, setRefreshKey] = useState(0);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []),
    inFlight = useRef(false);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    inFlight.current = false;
    setLoading(true);
    setData(null);
    setError("");
    setStale(false);
    const load = async () => {
      if (!active || inFlight.current || document.hidden) return;
      inFlight.current = true;
      try {
        const r = await fetch(
          `/api/public/market?symbol=${encodeURIComponent(symbol)}&timeframe=${encodeURIComponent(timeframe)}`,
          { cache: "no-store", signal: controller.signal },
        );
        const d = await r.json();
        if (!r.ok)
          throw new Error(d.error?.message ?? "Market preview unavailable");
        if (active) {
          setData(d.data);
          setLastReceived(Date.now());
          setStale(d.data.status === "STALE");
          setError("");
        }
      } catch (e) {
        if (active && !controller.signal.aborted) {
          setError((e as Error).message);
          setStale(true);
        }
      } finally {
        if (active) {
          setLoading(false);
          inFlight.current = false;
        }
      }
    };
    void load();
    const timer = setInterval(() => {
      if (!pausedRef.current) void load();
    }, 5000);
    const visible = () => {
      if (!document.hidden && !pausedRef.current) void load();
    };
    document.addEventListener("visibilitychange", visible);
    return () => {
      active = false;
      controller.abort();
      clearInterval(timer);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [symbol, timeframe, refreshKey]);
  useEffect(() => {
    if (paused || !lastReceived) return;
    const timer = setInterval(() => {
      if (Date.now() - lastReceived > 20000) setStale(true);
    }, 5000);
    return () => clearInterval(timer);
  }, [paused, lastReceived]);
  return {
    data,
    error,
    loading,
    paused,
    setPaused,
    lastReceived,
    stale,
    refresh,
  };
}
export type MarketFeed = ReturnType<typeof usePublicMarket>;
