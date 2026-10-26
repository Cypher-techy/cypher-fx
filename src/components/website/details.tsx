"use client";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  LockKeyhole,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { PublicHeader, PublicFooter } from "./public-shell";
import { useWebsiteContext } from "./use-context";
import { MarketExplorer } from "./market-explorer";
import TradeCalculator from "./trade-calculator";
import { faqs } from "./content";
import "../website.css";
import "./landing.css";
type Section = "markets" | "accounts" | "tools" | "help";
export default function WebsiteDetails({ section }: { section: Section }) {
  const context = useWebsiteContext(section === "markets"),
    {
      feed,
      symbol,
      timeframe,
      chooseSymbol,
      chooseTimeframe,
      session,
      displayBalance,
    } = context;
  const [tab, setTab] = useState("compare"),
    [faq, setFaq] = useState<number | null>(0),
    [search, setSearch] = useState("");
  const q = feed.data?.quotes.find((q) => q.symbol === symbol);
  const info = {
    markets: {
      kicker: "YOUR WINDOW TO THE MARKETS",
      title: "Market workspace.",
      body: "Explore currency pairs, save your favorites and find your perspective.",
    },
    accounts: {
      kicker: "KNOW WHERE YOU STAND",
      title: "Two accounts. One clear distinction.",
      body: "Start with practice. Real-money services are not yet available.",
    },
    tools: {
      kicker: "PLAN BEFORE YOU PLACE",
      title: "A more considered move.",
      body: "Understand position size, leverage and pip value before a practice trade.",
    },
    help: {
      kicker: "GOOD QUESTIONS. STRAIGHT ANSWERS.",
      title: "A little clarity.",
      body: "What you can do today, and what is still ahead.",
    },
  }[section];
  const matches = faqs
    .map((f, i) => ({ ...f, i }))
    .filter((f) =>
      (f.q + " " + f.a).toLowerCase().includes(search.toLowerCase()),
    );
  return (
    <div className="web-site cx-secondary">
      <PublicHeader session={session} active={"/" + section} />
      <main className="web-main">
        <div className="cx-width cx-secondary-title">
          <div>
            <span className="cx-kicker">{info.kicker}</span>
            <h1>{info.title}</h1>
            <p>{info.body}</p>
          </div>
          {section === "markets" ? (
            <div className="cx-secondary-quote">
              <span>
                {symbol.replace("_", "/")} ·{" "}
                {feed.data?.synthetic ? "SYNTHETIC REPLAY" : "PREVIEW"}
              </span>
              <strong data-testid="hero-quote">
                {q?.bid ?? (feed.error ? "Unavailable" : "Connecting…")}
              </strong>
            </div>
          ) : (
            <Link href="/" className="web-text-link">
              Back to trading view <ArrowUpRight size={14} />
            </Link>
          )}
        </div>
        {section === "markets" && (
          <div className="cx-width cx-detail-markets">
            <MarketExplorer
              feed={feed}
              symbol={symbol}
              setSymbol={chooseSymbol}
              timeframe={timeframe}
              setTimeframe={chooseTimeframe}
            />
          </div>
        )}
        {section === "tools" && <TradeCalculator />}
        {section === "accounts" && (
          <div className="cx-width cx-accounts-detail">
            <div
              className="web-account-tabs"
              role="tablist"
              aria-label="Compare account types"
            >
              {[
                ["compare", "Compare accounts"],
                ["demo", "Demo account"],
                ["real", "Real account"],
              ].map(([v, label]) => (
                <button
                  key={v}
                  role="tab"
                  aria-selected={tab === v}
                  onClick={() => setTab(v)}
                >
                  {label}
                </button>
              ))}
            </div>
            <div
              className={
                "web-account-grid " +
                (tab !== "compare" ? "web-account-single" : "")
              }
              role="tabpanel"
              aria-label="Account comparison"
            >
              <article className="web-account-card" hidden={tab === "real"}>
                <span className="web-account-icon">
                  <Sparkles size={24} />
                </span>
                <span className="web-account-status">
                  AVAILABLE IN DEVELOPMENT
                </span>
                <h3>Your space to practice.</h3>
                <p>
                  Learn the platform with separate virtual funds. No deposit
                  required.
                </p>
                <div className="web-account-balance">
                  <strong>{displayBalance}</strong>
                  <span>Starting virtual USD balance</span>
                </div>
                <ul>
                  {[
                    "Simulated market and pending orders",
                    "Interactive charts and trade history",
                    "Stop-loss and take-profit controls",
                    "Virtual funds only — not withdrawable",
                  ].map((t) => (
                    <li key={t}>
                      <Check size={13} />
                      {t}
                    </li>
                  ))}
                </ul>
                <Link href="/dashboard" className="web-btn web-btn-dark">
                  Open the demo workspace <ArrowUpRight size={15} />
                </Link>
                <small>
                  Default feed is synthetic practice data, clearly labeled.
                </small>
              </article>
              <article
                className="web-account-card web-real-card"
                hidden={tab === "demo"}
              >
                <span className="web-account-icon">
                  <LockKeyhole size={23} />
                </span>
                <span className="web-account-status">NOT YET AVAILABLE</span>
                <h3>A foundation for real trading.</h3>
                <p>
                  Identity verification, authorized providers and regulatory
                  approval come first.
                </p>
                <div className="web-real-note">
                  <ShieldCheck size={24} />
                  <div>
                    <strong>Safeguards come first.</strong>
                    <span>
                      No live execution or customer funds in this preview.
                    </span>
                  </div>
                </div>
                <ul>
                  {[
                    "Separate KSh wallet and financial ledger",
                    "M-Pesa integration subject to provider approval",
                    "Explicit Super Admin withdrawal review",
                    "Independent payment confirmation required",
                  ].map((t) => (
                    <li key={t}>
                      <LockKeyhole size={12} />
                      {t}
                    </li>
                  ))}
                </ul>
                <Link href="/register" className="web-btn web-btn-outline">
                  Create a profile <ArrowRight size={15} />
                </Link>
                <small>
                  A profile is not an approved live trading account.
                </small>
              </article>
            </div>
          </div>
        )}
        {section === "help" && (
          <div className="cx-width cx-help-grid">
            <div className="cx-help-intro">
              <h2>
                Here to help.
                <br />
                Without the noise.
              </h2>
              <p>
                Send a private enquiry from your account. No public chat or
                invented online-user counts.
              </p>
              <Link
                href={session ? "/dashboard?view=support" : "/login"}
                className="web-btn web-btn-dark"
              >
                Go to your support center <ArrowUpRight size={14} />
              </Link>
              <div className="cx-help-safety">
                <ShieldCheck size={20} />
                <p>
                  We never ask for your M-Pesa PIN or trading-provider secrets.
                </p>
              </div>
            </div>
            <div className="web-faq-list">
              <div className="web-faq-search">
                <Search size={14} />
                <input
                  aria-label="Search frequently asked questions"
                  placeholder="Search your question…"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setFaq(null);
                  }}
                />
                {search && (
                  <button
                    aria-label="Clear question search"
                    onClick={() => setSearch("")}
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
              {matches.map((f) => (
                <article key={f.i} className={faq === f.i ? "open" : ""}>
                  <button
                    aria-expanded={faq === f.i}
                    aria-controls={"faq-" + f.i}
                    onClick={() => setFaq(faq === f.i ? null : f.i)}
                  >
                    {f.q}
                    <Plus size={17} />
                  </button>
                  <div id={"faq-" + f.i} hidden={faq !== f.i}>
                    <p>{f.a}</p>
                  </div>
                </article>
              ))}
              {!matches.length && (
                <div className="web-faq-empty">
                  <Search size={22} />
                  <strong>No answers found for “{search}”</strong>
                  <button
                    onClick={() => {
                      setSearch("");
                      setFaq(0);
                    }}
                  >
                    Show all questions <ArrowRight size={12} />
                  </button>
                </div>
              )}
            </div>
            <section id="risk" className="cx-full-risk">
              <h2>Risk disclosure & development status</h2>
              <p>
                Leveraged forex carries significant risk and may not be suitable
                for all investors. Do not trade money you cannot afford to lose.
                Practice results do not predict real performance. CYPHERFX is in
                development and is not accepting customer funds or offering
                authorized live brokerage services. Synthetic chart replay is
                not current market data, and it is separate from the practice
                execution feed. Required Kenyan legal, CMA, data-protection and
                provider approvals must be confirmed before real-money services
                are enabled.
              </p>
              <Link href="/status" className="web-text-link">
                View platform status <ArrowUpRight size={13} />
              </Link>
            </section>
          </div>
        )}
      </main>
      <PublicFooter />
    </div>
  );
}
