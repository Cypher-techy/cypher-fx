"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Activity,
  ArrowDownUp,
  Check,
  ChevronDown,
  ChevronRight,
  Globe2,
  Layers3,
  LockKeyhole,
  Menu,
  Search,
  ArrowUp,
  Plus,
  ShieldCheck,
  Sparkles,
  Wallet,
  X,
} from "lucide-react";
import "./website.css";
import { usePublicMarket } from "./website/use-market";
import { MarketExplorer, MarketPreview } from "./website/market-explorer";
import TradeCalculator from "./website/trade-calculator";
export function WebBrand() {
  return (
    <Link href="/" className="web-brand" aria-label="CYPHERFX home">
      <span className="web-brand-mark" />
      <span>
        CYPHER<span>FX</span>
      </span>
      <sup>®</sup>
    </Link>
  );
}
const faqs = [
  {
    q: "Can I trade with real money today?",
    a: "No. CYPHERFX is a development platform. Live execution and customer-money services remain disabled until an authorized trading provider, payment integrations, regulatory approvals and security reviews are complete. We do not currently accept customer funds.",
  },
  {
    q: "What can I do with a demo account?",
    a: "Use virtual USD funds to place simulated market, limit and stop orders, set stop loss and take profit, close positions and view your trading history. The default feed is clearly labeled synthetic practice data, not genuine current market prices. Demo funds cannot be withdrawn.",
  },
  {
    q: "Will CYPHERFX support M-Pesa?",
    a: "M-Pesa is part of the planned payment workflow. The current build includes a Daraja sandbox integration boundary, but approved receipt reconciliation is still required. No real M-Pesa payments are accepted in this preview, and we never ask for your M-Pesa PIN.",
  },
  {
    q: "How will withdrawals be approved?",
    a: "Each eligible request must reserve funds and receive explicit approval from an authorized Super Admin. Approval is separate from payment. A withdrawal can be marked paid only after an independently confirmed provider result. The payout adapter is currently disabled.",
  },
  {
    q: "Is CYPHERFX licensed to offer live forex trading?",
    a: "No authorization or license is claimed by this development website. The applicable Kenyan CMA, legal, data protection and customer-money requirements must be confirmed for the final business model before any real-money service is enabled.",
  },
  {
    q: "Do I need to download an app?",
    a: "No. CYPHERFX runs in your web browser on desktop, tablet and mobile. Register or sign in on this website to access your account. Local development preview accounts are not live brokerage accounts.",
  },
];
export default function Website() {
  const [menu, setMenu] = useState(false),
    [selected, setSelected] = useState("EUR_USD"),
    [timeframe, setTimeframe] = useState("1h"),
    [faq, setFaq] = useState<number | null>(0),
    [faqSearch, setFaqSearch] = useState(""),
    [accountView, setAccountView] = useState("compare"),
    [progress, setProgress] = useState(0),
    [scrolled, setScrolled] = useState(false),
    [session, setSession] = useState<{
      name: string;
      practice: boolean;
    } | null>(null),
    [startingBalance, setStartingBalance] = useState<string | null>(null);
  const feed = usePublicMarket(selected, timeframe);
  const displayBalance = startingBalance
    ? new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(Number(startingBalance))
    : "—";
  useEffect(() => {
    let active = true;
    try {
      const saved = JSON.parse(
        localStorage.getItem("cypher-public-market") ?? "null",
      );
      if (
        saved &&
        [
          "EUR_USD",
          "GBP_USD",
          "USD_JPY",
          "AUD_USD",
          "USD_CHF",
          "USD_CAD",
        ].includes(saved.symbol)
      )
        setSelected(saved.symbol);
      if (
        saved &&
        ["1m", "5m", "15m", "1h", "4h", "1d"].includes(saved.timeframe)
      )
        setTimeframe(saved.timeframe);
    } catch {}
    fetch("/api/public/session", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (active && d.ok) setSession(d.data.user);
      })
      .catch(() => {});
    fetch("/api/public/config", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (active && d.ok) setStartingBalance(d.data.demoStartingBalance);
      })
      .catch(() => {});
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - innerHeight;
      setProgress(max > 0 ? (scrollY / max) * 100 : 0);
      setScrolled(scrollY > 550);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("web-is-visible");
            observer.unobserve(e.target);
          }
        }),
      { threshold: 0.06 },
    );
    document
      .querySelectorAll(".web-main > section:not(.web-hero)")
      .forEach((el) => {
        el.classList.add("web-reveal");
        observer.observe(el);
      });
    return () => {
      active = false;
      window.removeEventListener("scroll", onScroll);
      observer.disconnect();
    };
  }, []);
  const chooseSymbol = (v: string) => {
    setSelected(v);
    localStorage.setItem(
      "cypher-public-market",
      JSON.stringify({ symbol: v, timeframe }),
    );
  };
  const chooseTimeframe = (v: string) => {
    setTimeframe(v);
    localStorage.setItem(
      "cypher-public-market",
      JSON.stringify({ symbol: selected, timeframe: v }),
    );
  };
  const filteredFaqs = faqs
    .map((f, i) => ({ ...f, i }))
    .filter((f) =>
      (f.q + " " + f.a).toLowerCase().includes(faqSearch.toLowerCase()),
    );
  return (
    <div className="web-site">
      <div
        className="web-reading-progress"
        style={{ width: progress + "%" }}
        aria-hidden="true"
      />
      <div className="web-preview-bar">
        <span>
          <i />
          DEVELOPMENT PREVIEW
        </span>
        <p>Live trading and real-money payments are not yet available.</p>
        <Link href="/status">
          Platform status <ArrowUpRight size={11} />
        </Link>
      </div>
      <header className="web-header">
        <div className="web-container web-header-inner">
          <WebBrand />
          <nav
            className={menu ? "web-nav web-nav-open" : "web-nav"}
            aria-label="Website navigation"
          >
            <a href="#markets" onClick={() => setMenu(false)}>
              Markets
            </a>
            <a href="#platform" onClick={() => setMenu(false)}>
              Our platform
            </a>
            <a href="#accounts" onClick={() => setMenu(false)}>
              Accounts
            </a>
            <a href="#why-cypherfx" onClick={() => setMenu(false)}>
              Why CYPHERFX
            </a>
            <a href="#learn" onClick={() => setMenu(false)}>
              Learn & support
            </a>
          </nav>
          <div className="web-header-actions">
            <Link
              href={session ? "/dashboard" : "/login"}
              className="web-login-link"
            >
              {session
                ? session.practice
                  ? "Practice account"
                  : "Hi, " + session.name.split(" ")[0]
                : "Log in"}{" "}
              <ArrowUpRight size={13} />
            </Link>
            <Link
              href={session && !session.practice ? "/dashboard" : "/register"}
              className="web-btn web-btn-dark"
            >
              {session && !session.practice
                ? "My dashboard"
                : "Open an account"}{" "}
              <ArrowRight size={13} />
            </Link>
          </div>
          <button
            className="web-menu-button"
            aria-label={menu ? "Close navigation" : "Open navigation"}
            aria-expanded={menu}
            onClick={() => setMenu(!menu)}
          >
            {menu ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </header>
      <main className="web-main">
        <section className="web-hero">
          <div className="web-hero-texture" />
          <div className="web-container web-hero-grid">
            <div className="web-hero-copy">
              <span className="web-eyebrow">
                <span /> YOUR AMBITION. YOUR NEXT MOVE.
              </span>
              <h1>
                The markets move.
                <br />
                <em>Find your edge.</em>
              </h1>
              <p>
                A focused forex trading experience, built around you.
                <br className="web-desktop-break" /> Clear insights. Intuitive
                tools. Room to grow.
              </p>
              <div className="web-hero-actions">
                <Link href="/register" className="web-btn web-btn-lime">
                  Create your account <ArrowUpRight size={16} />
                </Link>
                <Link href="/dashboard" className="web-demo-link">
                  Explore the demo{" "}
                  <span>
                    <ArrowRight size={14} />
                  </span>
                </Link>
              </div>
              <div className="web-hero-trust">
                <span>
                  <Check size={13} /> Browser-based platform
                </span>
                <span>
                  <Check size={13} /> Separate virtual funds
                </span>
              </div>
              <div className="web-hero-disclosure">
                <LockKeyhole size={12} />
                <span>
                  Currently in development. Practice access only.
                  <br />
                  No live execution. No customer funds accepted.
                </span>
              </div>
            </div>
            <div className="web-hero-visual">
              <div className="web-orbit web-orbit-one" />
              <div className="web-orbit web-orbit-two" />
              <span className="web-visual-star">✳</span>
              <MarketPreview
                feed={feed}
                symbol={selected}
                timeframe={timeframe}
                setTimeframe={chooseTimeframe}
              />
              <div className="web-float-card">
                <span className="web-float-icon">
                  <ShieldCheck size={21} />
                </span>
                <div>
                  <strong>Practice with perspective.</strong>
                  <span>Virtual funds. Real learning.</span>
                </div>
                <ArrowUpRight size={15} />
              </div>
              <span className="web-visual-caption">
                {feed.data?.synthetic
                  ? "SYNTHETIC TRAINING REPLAY · NOT REAL MARKET ACTIVITY"
                  : "READ-ONLY MARKET PREVIEW · NO EXECUTION"}
              </span>
            </div>
          </div>
          <div className="web-hero-foot web-container">
            <span>BUILT FOR A MORE CONSIDERED TRADER.</span>
            <div>
              <span>WEB TERMINAL</span>
              <i />
              <span>DEMO ACCOUNTS</span>
              <i />
              <span>KENYA-FOCUSED</span>
            </div>
          </div>
        </section>
        <section className="web-value-strip">
          <div className="web-container">
            <span>
              <Globe2 size={19} />
              <b>A world of currency pairs</b>
            </span>
            <span>
              <Layers3 size={19} />
              <b>A workspace that makes sense</b>
            </span>
            <span>
              <ShieldCheck size={19} />
              <b>Clarity, not empty promises</b>
            </span>
            <span>
              <Activity size={19} />
              <b>Built for your browser</b>
            </span>
          </div>
        </section>
        <section id="markets" className="web-section web-markets">
          <div className="web-container">
            <div className="web-section-header">
              <div>
                <span className="web-eyebrow">A GLOBAL PERSPECTIVE</span>
                <h2>One world. More possibilities.</h2>
                <p>
                  Explore major currency pairs. Get to know the markets before
                  your next move.
                </p>
              </div>
              <Link href="/dashboard" className="web-text-link">
                Explore the terminal <ArrowUpRight size={15} />
              </Link>
            </div>
            <MarketExplorer
              feed={feed}
              symbol={selected}
              setSymbol={chooseSymbol}
              timeframe={timeframe}
              setTimeframe={chooseTimeframe}
            />
          </div>
        </section>
        <section id="platform" className="web-platform-section">
          <div className="web-container web-platform-grid">
            <div className="web-platform-graphic">
              <div className="web-mini-header">
                <span className="web-mini-mark" />
                CYPHERFX <span>YOUR WORKSPACE</span>
              </div>
              <div className="web-mini-body">
                <div className="web-mini-nav">
                  {[Layers3, Activity, Wallet, ArrowDownUp].map((Icon, i) => (
                    <span key={i} className={i === 1 ? "active" : ""}>
                      <Icon size={15} />
                    </span>
                  ))}
                </div>
                <div className="web-mini-main">
                  <span className="web-overline">
                    DEMO ACCOUNT · VIRTUAL USD
                  </span>
                  <strong>Make room for your next move.</strong>
                  <div className="web-mini-metrics">
                    <div>
                      <span>Starting virtual balance</span>
                      <b>
                        {displayBalance}
                        <span> USD</span>
                      </b>
                    </div>
                    <div>
                      <ShieldCheck size={20} />
                      <span>Not withdrawable</span>
                    </div>
                  </div>
                  <div className="web-mini-chart">
                    <svg
                      viewBox="0 0 400 100"
                      aria-label="Synthetic interface illustration"
                    >
                      <defs>
                        <linearGradient
                          id="mini-fill"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop stopColor="#99b66f" stopOpacity=".2" />
                          <stop
                            offset="1"
                            stopColor="#99b66f"
                            stopOpacity="0"
                          />
                        </linearGradient>
                      </defs>
                      <path
                        d="M0 80 20 75 40 85 60 55 80 65 100 48 120 60 140 50 160 63 180 43 200 50 220 25 240 45 260 32 280 40 300 23 320 32 340 15 360 24 380 12 400 5V100H0Z"
                        fill="url(#mini-fill)"
                      />
                      <path
                        d="M0 80 20 75 40 85 60 55 80 65 100 48 120 60 140 50 160 63 180 43 200 50 220 25 240 45 260 32 280 40 300 23 320 32 340 15 360 24 380 12 400 5"
                        stroke="#8da665"
                        strokeWidth="2"
                        fill="none"
                      />
                    </svg>
                    <span>Illustration only · not account performance</span>
                  </div>
                  <div className="web-mini-position">
                    <span>YOUR PLAN. YOUR PACE.</span>
                    <span>
                      Practice → Review → Learn <ArrowRight size={12} />
                    </span>
                  </div>
                </div>
              </div>
              <div className="web-platform-label">
                <span>
                  <Sparkles size={14} />
                  LESS FRICTION. MORE FOCUS.
                </span>
                <span>DESKTOP · TABLET · MOBILE</span>
              </div>
            </div>
            <div className="web-platform-copy">
              <span className="web-eyebrow">MEET YOUR TRADING WORKSPACE</span>
              <h2>
                Everything in view.
                <br />
                Nothing in your way.
              </h2>
              <p>
                A clean, connected place to build your trading confidence. From
                your first practice order to a more considered routine.
              </p>
              <ul>
                <li>
                  <span>
                    <Activity size={16} />
                  </span>
                  <div>
                    <strong>See the bigger picture</strong>
                    <p>
                      Interactive charts, timeframes and a watchlist that feels
                      like yours.
                    </p>
                  </div>
                </li>
                <li>
                  <span>
                    <Layers3 size={16} />
                  </span>
                  <div>
                    <strong>Put your thinking into practice</strong>
                    <p>
                      Simulated orders, stop loss, take profit and a clear trade
                      history.
                    </p>
                  </div>
                </li>
                <li>
                  <span>
                    <ShieldCheck size={16} />
                  </span>
                  <div>
                    <strong>Know where you stand</strong>
                    <p>
                      Virtual account metrics stay separate from your real-money
                      wallet.
                    </p>
                  </div>
                </li>
              </ul>
              <Link className="web-btn web-btn-dark" href="/dashboard">
                Take a look inside <ArrowUpRight size={15} />
              </Link>
            </div>
          </div>
        </section>
        <section id="accounts" className="web-section web-accounts">
          <div className="web-container">
            <div className="web-centered-heading">
              <span className="web-eyebrow">THE RIGHT START, FOR YOU</span>
              <h2>Two accounts. One clear distinction.</h2>
              <p>
                Start with practice. Real-money access will only open when the
                right safeguards are in place.
              </p>
            </div>
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
                  aria-selected={accountView === v}
                  onClick={() => setAccountView(v)}
                >
                  {label}
                </button>
              ))}
            </div>
            <div
              className={
                "web-account-grid " +
                (accountView !== "compare" ? "web-account-single" : "")
              }
              role="tabpanel"
              aria-label="Account comparison"
            >
              <article
                className="web-account-card"
                hidden={accountView === "real"}
              >
                <span className="web-account-icon">
                  <Sparkles size={24} />
                </span>
                <span className="web-account-status">
                  AVAILABLE IN DEVELOPMENT
                </span>
                <h3>Your space to practice.</h3>
                <p>
                  Get comfortable with forex trading using a separate virtual
                  account. No deposit required.
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
                hidden={accountView === "demo"}
              >
                <span className="web-account-icon">
                  <LockKeyhole size={23} />
                </span>
                <span className="web-account-status">NOT YET AVAILABLE</span>
                <h3>A foundation for real trading.</h3>
                <p>
                  Real-money services require verified accounts, authorized
                  providers and the relevant regulatory approvals.
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
                  A profile is not a funded or approved live trading account.
                </small>
              </article>
            </div>
          </div>
        </section>
        <TradeCalculator />
        <section id="why-cypherfx" className="web-why-section">
          <div className="web-container">
            <div className="web-section-header">
              <div>
                <span className="web-eyebrow">BUILT WITH INTENTION</span>
                <h2>Your trust isn't a shortcut.</h2>
              </div>
              <p>
                A better trading experience starts with clear boundaries.
                <br />
                Not invented returns. Not promises of easy money.
              </p>
            </div>
            <div className="web-principles">
              {[
                {
                  number: "01",
                  icon: Globe2,
                  title: "Made for the way you trade.",
                  text: "A browser-first workspace that adapts to your screen, with no separate app to install.",
                },
                {
                  number: "02",
                  icon: ShieldCheck,
                  title: "Separate means separate.",
                  text: "Practice activity never credits, debits or moves funds in your real-money ledger.",
                },
                {
                  number: "03",
                  icon: LockKeyhole,
                  title: "Approval is not payment.",
                  text: "Every future payout requires explicit approval and independent provider confirmation.",
                },
              ].map((x) => (
                <article key={x.number}>
                  <div>
                    <x.icon size={24} />
                    <span>{x.number}</span>
                  </div>
                  <h3>{x.title}</h3>
                  <p>{x.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
        <section id="learn" className="web-section web-faq">
          <div className="web-container web-faq-grid">
            <div>
              <span className="web-eyebrow">
                A LITTLE CLARITY GOES A LONG WAY
              </span>
              <h2>
                Good questions.
                <br />
                Straight answers.
              </h2>
              <p>
                Understand the platform, the account modes
                <br />
                and what comes next.
              </p>
              <div className="web-help-box">
                <span>
                  <Globe2 size={20} />
                </span>
                <div>
                  <strong>Need a hand?</strong>
                  <p>Sign in to send a private support enquiry.</p>
                  <Link href="/login" className="web-text-link">
                    Visit your support center <ArrowUpRight size={13} />
                  </Link>
                </div>
              </div>
            </div>
            <div className="web-faq-list">
              <div className="web-faq-search">
                <Search size={14} />
                <input
                  aria-label="Search frequently asked questions"
                  placeholder="Search your question…"
                  value={faqSearch}
                  onChange={(e) => {
                    setFaqSearch(e.target.value);
                    setFaq(null);
                  }}
                />
                {faqSearch && (
                  <button
                    aria-label="Clear question search"
                    onClick={() => setFaqSearch("")}
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
              {filteredFaqs.map((f) => {
                const i = f.i;
                return (
                  <article className={faq === i ? "open" : ""} key={f.q}>
                    <button
                      aria-expanded={faq === i}
                      aria-controls={"faq-" + i}
                      onClick={() => setFaq(faq === i ? null : i)}
                    >
                      {f.q}
                      <Plus size={17} />
                    </button>
                    <div id={"faq-" + i} hidden={faq !== i}>
                      <p>{f.a}</p>
                    </div>
                  </article>
                );
              })}
              {!filteredFaqs.length && (
                <div className="web-faq-empty">
                  <Search size={22} />
                  <strong>No answers found for “{faqSearch}”</strong>
                  <button
                    onClick={() => {
                      setFaqSearch("");
                      setFaq(0);
                    }}
                  >
                    Show all questions <ArrowRight size={12} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>
        <section className="web-final-section">
          <div className="web-container web-final-inner">
            <div>
              <span className="web-eyebrow">A NEW PERSPECTIVE STARTS HERE</span>
              <h2>
                Your next move.
                <br />
                Make it a considered one.
              </h2>
              <p>Create your profile and explore the practice workspace.</p>
            </div>
            <div>
              <Link href="/register" className="web-btn web-btn-lime">
                Get started with CYPHERFX <ArrowUpRight size={17} />
              </Link>
              <span>No real-money deposits accepted.</span>
            </div>
            <span className="web-final-star">✳</span>
          </div>
        </section>
      </main>
      <footer className="web-footer">
        <div className="web-container">
          <div className="web-footer-grid">
            <div>
              <WebBrand />
              <p>
                A clearer perspective.
                <br />A more considered next move.
              </p>
              <span className="web-footer-location">
                <Globe2 size={13} /> Kenya-focused · Browser-based
              </span>
            </div>
            <div>
              <h3>Explore</h3>
              <a href="#markets">Forex markets</a>
              <a href="#platform">Trading platform</a>
              <a href="#accounts">Account types</a>
            </div>
            <div>
              <h3>Your account</h3>
              <Link href="/register">Create an account</Link>
              <Link href="/login">Client login</Link>
              <Link href="/dashboard">Demo workspace</Link>
            </div>
            <div>
              <h3>Stay informed</h3>
              <a href="#learn">Help & questions</a>
              <Link href="/status">Platform status</Link>
              <a href="#risk-disclosure">Risk disclosure</a>
            </div>
          </div>
          <div id="risk-disclosure" className="web-risk">
            <strong>Risk disclosure & development notice</strong>
            <p>
              Leveraged forex trading carries a high level of risk and may not
              be suitable for all investors. Do not trade with money you cannot
              afford to lose. Practice results do not predict real performance.
              CYPHERFX is an independent development platform and does not
              currently offer authorized live brokerage services, accept
              customer funds or execute real trades. Synthetic illustrations are
              not live market data. Applicable Kenyan CMA, legal, provider and
              data-protection requirements must be confirmed before launch. No
              affiliation with NadsFX or any other brokerage is claimed.
            </p>
          </div>
          <div className="web-footer-bottom">
            <span>
              © {new Date().getFullYear()} CYPHERFX. Built for your next move.
            </span>
            <span>
              <i />
              DEVELOPMENT PREVIEW · NOT A LIVE BROKERAGE
            </span>
            <a href="#">Back to top ↑</a>
          </div>
        </div>
      </footer>
      {scrolled && (
        <button
          className="web-back-to-top"
          aria-label="Scroll back to top"
          onClick={() =>
            window.scrollTo({
              top: 0,
              behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
                .matches
                ? "instant"
                : "smooth",
            })
          }
        >
          <ArrowUp size={17} />
        </button>
      )}
    </div>
  );
}
