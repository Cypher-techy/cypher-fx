"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  ChevronRight,
  Loader2,
  Pause,
  Play,
  RefreshCw,
  Search,
  Star,
  X,
} from "lucide-react";
import PriceChart from "../price-chart";
import type { MarketFeed } from "./use-market";
export const browserPairs = [
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
export function MarketExplorer({
  feed,
  symbol,
  setSymbol,
  timeframe,
  setTimeframe,
}: {
  feed: MarketFeed;
  symbol: string;
  setSymbol: (v: string) => void;
  timeframe: string;
  setTimeframe: (v: string) => void;
}) {
  const [search, setSearch] = useState(""),
    [filter, setFilter] = useState("All pairs"),
    [favorites, setFavorites] = useState<string[]>(["EUR_USD", "GBP_USD"]),
    [ready, setReady] = useState(false),
    [view, setView] = useState<"chart" | "details">("chart");
  useEffect(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem("cypher-public-favorites") ?? "null",
      );
      if (Array.isArray(saved))
        setFavorites(
          saved.filter((v) => browserPairs.some((p) => p.symbol === v)),
        );
    } catch {}
    setReady(true);
  }, []);
  const star = (s: string) => {
    const next = favorites.includes(s)
      ? favorites.filter((x) => x !== s)
      : [...favorites, s];
    setFavorites(next);
    localStorage.setItem("cypher-public-favorites", JSON.stringify(next));
  };
  const list = browserPairs.filter(
    (p) =>
      (filter === "All pairs" ||
        (filter === "Favorites" && favorites.includes(p.symbol)) ||
        p.group === filter) &&
      (p.symbol + p.name)
        .toLowerCase()
        .replaceAll(/[\s/_]/g, "")
        .includes(search.toLowerCase().replaceAll(/[\s/_]/g, "")),
  );
  const selected = browserPairs.find((p) => p.symbol === symbol)!,
    q = feed.data?.quotes.find((q) => q.symbol === symbol),
    activeData =
      feed.data?.symbol === symbol && feed.data?.timeframe === timeframe;
  return (
    <div className="dynamic-markets">
      <div className="dm-toolbar">
        <div className="dm-filters" role="group" aria-label="Market filters">
          {["All pairs", "Favorites", "Europe", "Asia Pacific", "Americas"].map(
            (f) => (
              <button
                key={f}
                className={filter === f ? "active" : ""}
                aria-pressed={filter === f}
                onClick={() => setFilter(f)}
              >
                {f === "Favorites" && <Star size={11} />} {f}
              </button>
            ),
          )}
        </div>
        <div className="dm-search">
          <Search size={14} />
          <input
            aria-label="Search currency pairs"
            placeholder="Search currency pairs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              aria-label="Clear market search"
              onClick={() => setSearch("")}
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>
      <div className="dm-feed-notice">
        <span
          className={
            "dm-feed-dot " + (feed.error || feed.stale ? "warning" : "")
          }
        />
        <strong>
          {feed.data?.synthetic
            ? "SYNTHETIC TRAINING REPLAY"
            : feed.data
              ? "PROVIDER DATA"
              : "CONNECTING MARKET PREVIEW"}
        </strong>
        <span>
          {feed.paused
            ? "Paused by you"
            : feed.error
              ? "Data unavailable — last values may be stale"
              : feed.stale
                ? "Warning: data is delayed"
                : feed.data?.synthetic
                  ? "One historical training candle every 5 seconds · not live forex prices"
                  : feed.data
                    ? "Provider timestamps · read-only preview"
                    : "Connecting to the server…"}
        </span>
        <button
          className="dm-refresh"
          aria-label="Refresh market data"
          onClick={feed.refresh}
        >
          <RefreshCw size={12} className={feed.loading ? "spin" : ""} />
        </button>
      </div>
      <div className="dm-layout">
        <div className="dm-list" aria-label="Currency pair list">
          <div className="dm-list-head">
            <span>Instrument</span>
            <span>{feed.data?.synthetic ? "Replay bid" : "Bid"} / change</span>
          </div>
          {list.map((p) => {
            const quote = feed.data?.quotes.find((q) => q.symbol === p.symbol);
            return (
              <div
                key={p.symbol}
                className={"dm-pair " + (p.symbol === symbol ? "selected" : "")}
              >
                <button
                  className="dm-pair-select"
                  aria-label={"View " + p.symbol.replace("_", "/")}
                  aria-pressed={p.symbol === symbol}
                  onClick={() => setSymbol(p.symbol)}
                >
                  <span className="dm-flags">
                    <span>{p.flag}</span>
                    <span>{p.second}</span>
                  </span>
                  <span className="dm-pair-name">
                    <strong>{p.symbol.replace("_", "/")}</strong>
                    <small>{p.name.split(" / ")[0]}</small>
                  </span>
                  <span className="dm-pair-quote">
                    <strong data-testid={"quote-" + p.symbol}>
                      {quote?.bid ?? "—"}
                    </strong>
                    <small
                      className={
                        Number(quote?.change ?? 0) >= 0 ? "up" : "down"
                      }
                    >
                      {quote?.change
                        ? (+quote.change >= 0 ? "+" : "") + quote.change + "%"
                        : quote
                          ? "—"
                          : "Connecting…"}
                      {quote?.change && <em> replay</em>}
                    </small>
                  </span>
                </button>
                <button
                  className={
                    "dm-favorite " +
                    (favorites.includes(p.symbol) ? "saved" : "")
                  }
                  aria-label={
                    (favorites.includes(p.symbol) ? "Remove " : "Add ") +
                    p.symbol.replace("_", "/") +
                    (favorites.includes(p.symbol)
                      ? " from favorites"
                      : " to favorites")
                  }
                  aria-pressed={ready && favorites.includes(p.symbol)}
                  onClick={() => star(p.symbol)}
                >
                  <Star
                    size={13}
                    fill={
                      favorites.includes(p.symbol) ? "currentColor" : "none"
                    }
                  />
                </button>
              </div>
            );
          })}
          {!list.length && (
            <div className="dm-empty">
              <Search size={23} />
              <strong>No matching pairs</strong>
              <p>Try a different search or show all instruments.</p>
              <button
                onClick={() => {
                  setSearch("");
                  setFilter("All pairs");
                }}
              >
                Clear filters <ChevronRight size={12} />
              </button>
            </div>
          )}
          <div className="dm-list-foot">
            <Star size={11} />
            Your favorites are saved on this device.
          </div>
        </div>
        <div className="dm-chart-panel">
          <div className="dm-chart-header">
            <div className="dm-chart-name">
              <span>{selected.flag}</span>
              <div>
                <h3>{symbol.replace("_", "/")}</h3>
                <p>{selected.name}</p>
              </div>
              <span className="dm-source-badge">
                {feed.data?.synthetic ? "SYNTHETIC" : "PREVIEW"}
              </span>
            </div>
            <div className="dm-chart-actions">
              <button
                aria-label={
                  feed.paused ? "Resume market replay" : "Pause market replay"
                }
                aria-pressed={feed.paused}
                onClick={() => feed.setPaused(!feed.paused)}
              >
                {feed.paused ? <Play size={13} /> : <Pause size={13} />}
              </button>
              <Link
                href={"/dashboard?symbol=" + symbol + "&view=terminal"}
                aria-label={"Practice " + symbol.replace("_", "/")}
              >
                <ArrowUpRight size={15} />
              </Link>
            </div>
          </div>
          <div className="dm-price-row">
            <strong>{activeData ? (q?.bid ?? "—") : "—"}</strong>
            <span className="dm-spread">
              Spread <b>{activeData ? (q?.spread ?? "—") : "—"} pips</b>
            </span>
            <span className="dm-ask">
              Ask <b>{activeData ? (q?.ask ?? "—") : "—"}</b>
            </span>
          </div>
          <div className="dm-chart-toolbar">
            <div role="group" aria-label="Chart timeframe">
              {["1m", "5m", "15m", "1h", "4h", "1d"].map((t) => (
                <button
                  key={t}
                  className={timeframe === t ? "active" : ""}
                  aria-pressed={timeframe === t}
                  onClick={() => setTimeframe(t)}
                >
                  {t.toUpperCase()}
                </button>
              ))}
            </div>
            <div role="tablist" aria-label="Market detail view">
              <button
                role="tab"
                aria-selected={view === "chart"}
                onClick={() => setView("chart")}
              >
                Chart
              </button>
              <button
                role="tab"
                aria-selected={view === "details"}
                onClick={() => setView("details")}
              >
                Details
              </button>
            </div>
          </div>
          {view === "chart" ? (
            <div
              className="dm-chart-content"
              role="tabpanel"
              aria-label="Interactive market chart"
            >
              {activeData && feed.data ? (
                <PriceChart candles={feed.data.candles} dark />
              ) : (
                <div className="dm-chart-loading">
                  <Loader2 className="spin" size={20} />
                  <span>
                    {feed.error
                      ? "Could not load prices"
                      : "Loading " + symbol.replace("_", "/") + " chart…"}
                  </span>
                  {feed.error && (
                    <button onClick={feed.refresh}>Try again</button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div
              className="dm-details"
              role="tabpanel"
              aria-label="Instrument details"
            >
              <div>
                <span>Base currency</span>
                <strong>{symbol.split("_")[0]}</strong>
              </div>
              <div>
                <span>Quote currency</span>
                <strong>{symbol.split("_")[1]}</strong>
              </div>
              <div>
                <span>Standard lot</span>
                <strong>100,000 base units</strong>
              </div>
              <div>
                <span>Price source</span>
                <strong>{feed.data?.source ?? "Not connected"}</strong>
              </div>
              <div>
                <span>Execution</span>
                <strong>Not available on this preview</strong>
              </div>
              <p>
                Preview quotes are read-only and are not order offers. Synthetic
                replay prices are not the practice terminal’s execution feed.
              </p>
            </div>
          )}
          <div className="dm-chart-bottom">
            <span>
              <Activity size={10} />
              {feed.data?.synthetic
                ? "Historical synthetic candles · not live"
                : (feed.data?.attribution ?? "Waiting for data")}
            </span>
            <span data-testid="market-sequence">
              {feed.data ? "Update " + feed.data.sequence : "Connecting"}
              {feed.paused ? " · paused" : ""}
            </span>
          </div>
          {feed.error && (
            <p className="dm-error" role="status">
              {feed.error}. Last received values are not current.
            </p>
          )}
        </div>
      </div>
      <div className="dm-bottom">
        <p>
          {feed.data?.attribution ??
            "No provider prices are implied. Prices load only from the server response."}
        </p>
        <Link
          href={"/dashboard?symbol=" + symbol + "&view=terminal"}
          className="web-text-link"
        >
          Practice with {symbol.replace("_", "/")} <ArrowUpRight size={13} />
        </Link>
      </div>
    </div>
  );
}
export function MarketPreview({
  feed,
  symbol,
  timeframe,
  setTimeframe,
}: {
  feed: MarketFeed;
  symbol: string;
  timeframe: string;
  setTimeframe: (v: string) => void;
}) {
  const bars = feed.data?.candles.slice(-45) ?? [],
    q = feed.data?.quotes.find((q) => q.symbol === symbol),
    max = bars.length ? Math.max(...bars.map((c) => c.high)) : 1,
    min = bars.length ? Math.min(...bars.map((c) => c.low)) : 0,
    span = max - min || 1,
    y = (v: number) => 205 - ((v - min) / span) * 180;
  return (
    <div className="web-terminal">
      <div className="web-terminal-top">
        <span>
          <i />
          <i />
          <i />
        </span>
        <span>YOUR MARKET. YOUR PERSPECTIVE.</span>
        <Activity size={13} />
      </div>
      <div className="web-terminal-account">
        <div>
          <span className="web-overline">INTERACTIVE MARKET PREVIEW</span>
          <strong>A clearer view of every move.</strong>
        </div>
        <span className="web-demo-tag">
          <i />
          {feed.data?.synthetic ? "REPLAY" : "PREVIEW"}
        </span>
      </div>
      <div className="web-terminal-pair">
        <span className="web-pair-icon">
          {symbol.startsWith("EUR")
            ? "€"
            : symbol.startsWith("GBP")
              ? "£"
              : "$"}
        </span>
        <div>
          <strong>{symbol.replace("_", "/")}</strong>
          <span>
            {feed.data?.synthetic
              ? "Synthetic training candles"
              : "Read-only market preview"}
          </span>
        </div>
        <div className="web-chart-price">
          <span>{feed.data?.synthetic ? "SYNTHETIC BID" : "BID"}</span>
          <strong data-testid="hero-quote">
            {q?.bid ?? (feed.error ? "Unavailable" : "Connecting…")}
          </strong>
        </div>
      </div>
      <div
        className="web-chart-time"
        role="group"
        aria-label="Hero chart timeframe"
      >
        {["1m", "5m", "15m", "1h", "4h", "1d"].map((t) => (
          <button
            key={t}
            aria-pressed={timeframe === t}
            className={t === timeframe ? "selected" : ""}
            onClick={() => setTimeframe(t)}
          >
            {t.toUpperCase()}
          </button>
        ))}
        <span className="web-chart-indicator">
          <Activity size={11} />
          {feed.paused
            ? "Paused"
            : feed.error
              ? "Unavailable"
              : feed.stale
                ? "Delayed"
                : "5s updates"}
        </span>
      </div>
      <svg
        className="web-hero-chart"
        viewBox="0 0 560 230"
        role="img"
        aria-label={
          feed.data?.synthetic
            ? "Updating synthetic training replay, not live market data"
            : "Read-only provider chart"
        }
      >
        {[25, 75, 125, 175, 225].map((y) => (
          <path key={y} d={`M0 ${y}H560`} stroke="#ffffff08" />
        ))}
        {[30, 120, 210, 300, 390, 480].map((x) => (
          <path key={x} d={`M${x} 0V230`} stroke="#ffffff05" />
        ))}
        {bars.map((c, i) => {
          const x = 8 + i * 12,
            up = c.close >= c.open;
          return (
            <g
              key={c.time}
              fill={up ? "#7ca2e2" : "#a98d7f"}
              stroke={up ? "#7ca2e2" : "#a98d7f"}
            >
              <path
                d={`M${x} ${y(c.high).toFixed(3)}V${y(c.low).toFixed(3)}`}
              />
              <rect
                x={x - 3}
                y={Math.min(y(c.open), y(c.close)).toFixed(3)}
                width="6"
                height={Math.max(1, Math.abs(y(c.open) - y(c.close))).toFixed(
                  3,
                )}
                stroke="none"
                rx=".6"
              />
            </g>
          );
        })}
        {!bars.length && (
          <text
            x="280"
            y="115"
            textAnchor="middle"
            fill="#728ab2"
            fontSize="11"
          >
            {feed.error
              ? "Preview unavailable"
              : "Connecting to market preview…"}
          </text>
        )}
      </svg>
      <div className="web-chart-axis">
        <span>Historical training replay</span>
        <span>
          {feed.data?.synthetic
            ? "Not real forex prices"
            : (feed.data?.source ?? "Connecting")}
        </span>
      </div>
      <div className="web-terminal-bottom">
        <span>
          <i />
          {feed.error
            ? "DATA UNAVAILABLE"
            : feed.data?.synthetic
              ? "SYNTHETIC REPLAY · NOT LIVE"
              : "PROVIDER DATA · READ ONLY"}
        </span>
        <a href="#markets">Explore chart controls ↗</a>
      </div>
    </div>
  );
}
