"use client";
import Link from "next/link";
import { useState } from "react";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Calculator,
  ChevronDown,
  Globe2,
  Loader2,
  Pause,
  Play,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import PriceChart from "./price-chart";
import { useWebsiteContext } from "./website/use-context";
import { PublicHeader, PublicFooter } from "./website/public-shell";
import { browserPairs } from "./website/market-explorer";
import OrderTicket from "./website/order-ticket";
import "./website.css";
import "./website/landing.css";
export { WebBrand } from "./website/brand";
export default function Website() {
  const context = useWebsiteContext(),
    { symbol, timeframe, chooseSymbol, chooseTimeframe, feed } = context;
  const [mobileTab, setMobileTab] = useState("chart");
  const q = feed.data?.quotes.find((q) => q.symbol === symbol),
    current = browserPairs.find((p) => p.symbol === symbol)!;
  return (
    <div className="web-site cx-landing">
      <div className="cx-preview">
        <span>
          <i />
          DEVELOPMENT PREVIEW
        </span>
        <p>Live trading and real-money payments are not yet available.</p>
        <Link href="/status">
          Service status <ArrowUpRight size={10} />
        </Link>
      </div>
      <PublicHeader session={context.session} active="/" />
      <main className="web-main cx-width cx-home-main">
        <section className="cx-intro">
          <div>
            <span className="cx-kicker">A CLEARER PERSPECTIVE ON FOREX</span>
            <h1>
              Your next move. <em>In focus.</em>
            </h1>
          </div>
          <div className="cx-intro-aside">
            <p>Your chart. Your strategy. One focused workspace.</p>
            <Link href="/dashboard?view=terminal" className="cx-demo-link">
              Explore the demo{" "}
              <span>
                <ArrowUpRight size={15} />
              </span>
            </Link>
          </div>
        </section>
        <section
          className="cx-trading-stage"
          aria-label="Forex chart and practice order panel"
        >
          <div
            className="cx-stage-mobile-tabs"
            role="tablist"
            aria-label="Mobile trading view"
          >
            <button
              role="tab"
              aria-selected={mobileTab === "chart"}
              onClick={() => setMobileTab("chart")}
            >
              <Activity size={13} />
              Chart
            </button>
            <button
              role="tab"
              aria-selected={mobileTab === "order"}
              onClick={() => setMobileTab("order")}
            >
              <SlidersHorizontal size={13} />
              Order
            </button>
            <Link href="/markets">
              <Globe2 size={13} />
              Markets
            </Link>
            <Link href="/help">
              <BookOpen size={13} />
              Help
            </Link>
          </div>
          <div className={"cx-stage-grid mobile-" + mobileTab}>
            <div className="cx-chart-side">
              <div
                className="cx-pair-strip"
                role="group"
                aria-label="Quick currency pairs"
              >
                {browserPairs.slice(0, 4).map((p) => (
                  <button
                    key={p.symbol}
                    aria-pressed={symbol === p.symbol}
                    onClick={() => chooseSymbol(p.symbol)}
                    className={symbol === p.symbol ? "active" : ""}
                  >
                    <span>{p.flag}</span>
                    {p.symbol.replace("_", "/")}
                    <span className="cx-pair-strip-price">
                      {feed.data?.quotes.find((q) => q.symbol === p.symbol)
                        ?.bid ?? "—"}
                    </span>
                  </button>
                ))}
                <Link href="/markets" aria-label="Explore all currency pairs">
                  All pairs <ArrowUpRight size={12} />
                </Link>
              </div>
              <div className="cx-chart-heading">
                <div className="cx-symbol-control">
                  <span className="cx-symbol-flag">{current.flag}</span>
                  <div>
                    <label className="cx-symbol-picker">
                      <select
                        aria-label="Select trading instrument"
                        value={symbol}
                        onChange={(e) => chooseSymbol(e.target.value)}
                      >
                        {browserPairs.map((p) => (
                          <option key={p.symbol} value={p.symbol}>
                            {p.symbol.replace("_", "/")}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={13} />
                    </label>
                    <span>{current.name}</span>
                  </div>
                  <span className="cx-source-tag">
                    {feed.data?.synthetic
                      ? "SYNTHETIC REPLAY"
                      : "READ-ONLY PREVIEW"}
                  </span>
                </div>
                <div className="cx-chart-status">
                  <i className={feed.stale || feed.error ? "warning" : ""} />
                  {feed.error
                    ? "Unavailable"
                    : feed.stale
                      ? "Delayed"
                      : feed.paused
                        ? "Paused"
                        : "5s updates"}
                </div>
              </div>
              <div className="cx-chart-price-row">
                <strong data-testid="hero-quote">
                  {q?.bid ?? (feed.error ? "Unavailable" : "Connecting…")}
                </strong>
                <span
                  className={
                    Number(q?.change ?? 0) >= 0 ? "positive" : "negative"
                  }
                >
                  {q?.change
                    ? (Number(q.change) >= 0 ? "+" : "") + q.change + "%"
                    : ""}
                  <small>{q?.change ? "Replay change" : ""}</small>
                </span>
                <div className="cx-chart-ask">
                  <span>ASK</span>
                  <b>{q?.ask ?? "—"}</b>
                </div>
                <div className="cx-chart-spread">
                  <span>SPREAD</span>
                  <b>{q?.spread ?? "—"} pips</b>
                </div>
              </div>
              <div className="cx-chart-controls">
                <div
                  className="cx-timeframes"
                  role="group"
                  aria-label="Chart timeframe"
                >
                  {["1m", "5m", "15m", "1h", "4h", "1d"].map((t) => (
                    <button
                      key={t}
                      aria-pressed={t === timeframe}
                      className={t === timeframe ? "active" : ""}
                      onClick={() => chooseTimeframe(t)}
                    >
                      {t.toUpperCase()}
                    </button>
                  ))}
                </div>
                <div className="cx-chart-buttons">
                  <span>
                    <Activity size={12} />
                    Candles
                  </span>
                  <button
                    aria-label={
                      feed.paused
                        ? "Resume market replay"
                        : "Pause market replay"
                    }
                    onClick={() => feed.setPaused(!feed.paused)}
                  >
                    {feed.paused ? <Play size={13} /> : <Pause size={13} />}
                  </button>
                  <button
                    aria-label="Refresh market data"
                    onClick={feed.refresh}
                  >
                    <RefreshCw
                      size={13}
                      className={feed.loading ? "spin" : ""}
                    />
                  </button>
                </div>
              </div>
              <div className="cx-main-chart">
                {feed.data ? (
                  <PriceChart candles={feed.data.candles} dark />
                ) : (
                  <div className="cx-chart-placeholder">
                    {feed.error ? (
                      <ShieldCheck size={23} />
                    ) : (
                      <Loader2 className="spin" size={23} />
                    )}
                    <p>
                      {feed.error
                        ? "The preview feed could not be reached."
                        : "Preparing your market view…"}
                    </p>
                    {feed.error && (
                      <button onClick={feed.refresh}>
                        Try again <RefreshCw size={12} />
                      </button>
                    )}
                  </div>
                )}
              </div>
              <div className="cx-chart-caption">
                <span>
                  <i />
                  {feed.data?.synthetic
                    ? "Synthetic training replay · not live market prices"
                    : "Read-only market preview · no real execution"}
                </span>
                <span data-testid="market-sequence">
                  {feed.data ? "Update " + feed.data.sequence : "Connecting"}
                  {feed.paused ? " · paused" : ""}
                </span>
              </div>
              {feed.error && (
                <p className="cx-feed-error" role="status">
                  {feed.error}. Last received values are not current.
                </p>
              )}
            </div>
            <OrderTicket
              context={context}
              onReview={() => setMobileTab("order")}
            />
          </div>
        </section>
        <section className="cx-quick-paths" aria-label="Explore CYPHERFX">
          <Link href="/markets">
            <span className="cx-path-icon">
              <Globe2 size={19} />
            </span>
            <div>
              <strong>A wider perspective.</strong>
              <span>Explore pairs & build your watchlist</span>
            </div>
            <ArrowUpRight size={16} />
          </Link>
          <Link href="/tools">
            <span className="cx-path-icon">
              <Calculator size={19} />
            </span>
            <div>
              <strong>A more considered move.</strong>
              <span>Plan with the margin & pip calculator</span>
            </div>
            <ArrowUpRight size={16} />
          </Link>
          <Link href="/accounts">
            <span className="cx-path-icon">
              <ShieldCheck size={19} />
            </span>
            <div>
              <strong>A clear distinction.</strong>
              <span>Demo funds and real funds stay separate</span>
            </div>
            <ArrowUpRight size={16} />
          </Link>
        </section>
        <div className="cx-risk-line">
          <ShieldCheck size={11} />
          <p>
            Practice only. Virtual funds cannot be withdrawn. Leveraged forex
            carries significant risk.{" "}
            <Link href="/help#risk">
              Read the disclosure <ArrowUpRight size={10} />
            </Link>
          </p>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
