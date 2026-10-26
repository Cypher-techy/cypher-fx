"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  Activity,
  ArrowDownLeft,
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  ArrowUpFromLine,
  Bell,
  BookOpen,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  CircleHelp,
  Command,
  Copy,
  CreditCard,
  Download,
  Ellipsis,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  Globe2,
  LayoutDashboard,
  LifeBuoy,
  Loader2,
  LockKeyhole,
  LogOut,
  Menu,
  Moon,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Star,
  Sun,
  TrendingUp,
  Users,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import PriceChart from "./price-chart";
import type { Candle, Quote } from "@/lib/providers/market";
type RecordData = Record<string, any>;
type State = {
  user: RecordData;
  demo: RecordData;
  wallet: RecordData;
  positions: RecordData[];
  orders: RecordData[];
  deposits: RecordData[];
  withdrawals: RecordData[];
  notifications: RecordData[];
  tickets: RecordData[];
  providers: RecordData;
};
type Market = {
  quote: Quote;
  candles: Candle[];
  status: string;
  attribution: string;
};
type Modal =
  | "deposit"
  | "withdraw"
  | "notifications"
  | "search"
  | "account"
  | "auth"
  | "reset"
  | "review"
  | null;
const instruments = [
  { symbol: "EUR_USD", name: "Euro / US Dollar", flags: ["🇪🇺", "🇺🇸"] },
  { symbol: "GBP_USD", name: "British Pound / US Dollar", flags: ["🇬🇧", "🇺🇸"] },
  { symbol: "USD_JPY", name: "US Dollar / Japanese Yen", flags: ["🇺🇸", "🇯🇵"] },
  {
    symbol: "AUD_USD",
    name: "Australian Dollar / US Dollar",
    flags: ["🇦🇺", "🇺🇸"],
  },
  { symbol: "USD_CHF", name: "US Dollar / Swiss Franc", flags: ["🇺🇸", "🇨🇭"] },
  {
    symbol: "USD_CAD",
    name: "US Dollar / Canadian Dollar",
    flags: ["🇺🇸", "🇨🇦"],
  },
];
const pages = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "Trading terminal", icon: Activity },
  { label: "My wallet", icon: Wallet },
  { label: "Transactions", icon: ArrowDownLeft },
  { label: "Trading history", icon: FileText },
];
const usd = (v: unknown) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    Number(v ?? 0),
  );
const kes = (v: unknown) =>
  "KSh " +
  new Intl.NumberFormat("en-KE", { minimumFractionDigits: 2 }).format(
    Number(v ?? 0) / 100,
  );
async function api(path: string, body?: unknown) {
  const r = await fetch("/api/" + path, {
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error?.message ?? "Request failed");
  return d.data;
}
function Brand() {
  return (
    <div className="brand">
      <span className="brand-symbol">
        <span />
      </span>
      <span>
        CYPHER<span className="brand-fx">FX</span>
        <sup>®</sup>
      </span>
    </div>
  );
}
function Flags({ symbol }: { symbol: string }) {
  const f = instruments.find((i) => i.symbol === symbol)?.flags ?? ["🌐", "🌐"];
  return (
    <span className="flags">
      <span>{f[0]}</span>
      <span>{f[1]}</span>
    </span>
  );
}
function Sparkline({ up = true, seed = 0 }: { up?: boolean; seed?: number }) {
  const points = Array.from(
    { length: 24 },
    (_, i) =>
      `${i * 3},${20 + Math.sin(i * 0.9 + seed) * 6 + Math.sin(i * 2 + seed) * 3 + (up ? -(i - 12) * 0.6 : (i - 12) * 0.45)}`,
  ).join(" ");
  return (
    <svg className="sparkline" viewBox="0 0 70 40" aria-hidden="true">
      <polyline
        points={points}
        fill="none"
        stroke={up ? "#339b73" : "#ca7976"}
        strokeWidth="1.4"
      />
    </svg>
  );
}
function Orbit() {
  return (
    <svg className="hero-orbit" viewBox="0 0 420 240" aria-hidden="true">
      <defs>
        <linearGradient id="orb" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#1e4934" />
          <stop offset="1" stopColor="#568b4d" />
        </linearGradient>
      </defs>
      <g fill="none" stroke="#709260" strokeWidth=".7" opacity=".38">
        <ellipse
          cx="227"
          cy="120"
          rx="161"
          ry="77"
          transform="rotate(-27 227 120)"
        />
        <ellipse
          cx="227"
          cy="120"
          rx="161"
          ry="77"
          transform="rotate(28 227 120)"
        />
        <ellipse cx="227" cy="120" rx="110" ry="110" />
        <ellipse
          cx="227"
          cy="120"
          rx="67"
          ry="110"
          transform="rotate(27 227 120)"
        />
        <path d="M40 120h350M227 8v224" />
      </g>
      <g transform="translate(174 57)">
        <path d="m0 52 58-34 58 34-58 34Z" fill="#356746" />
        <path d="m0 52 58 34v55L0 107Z" fill="#244f38" />
        <path d="m58 86 58-34v55l-58 34Z" fill="#163e2c" />
        <path d="m0 34 58-34 58 34-58 34Z" fill="#b9df7a" />
        <path d="m0 34 58 34v18L0 52Z" fill="#98bd61" />
        <path d="m58 68 58-34v18L58 86Z" fill="#719a49" />
        <path d="m58 16 26 15-26 15-26-15Z" fill="#416d39" />
      </g>
      <circle cx="95" cy="98" r="6" fill="#b5d87d" />
      <circle cx="340" cy="165" r="4" fill="#759d54" />
      <path d="M130 25h6m-3-3v6M358 72h8m-4-4v8" stroke="#70965c" />
    </svg>
  );
}
export default function Workspace() {
  const [state, setState] = useState<State | null>(null),
    [page, setPage] = useState("Overview"),
    [mode, setMode] = useState<"DEMO" | "REAL">("DEMO"),
    [accountMenu, setAccountMenu] = useState(false),
    [symbol, setSymbol] = useState("EUR_USD"),
    [timeframe, setTimeframe] = useState("1h"),
    [market, setMarket] = useState<Market | null>(null),
    [modal, setModal] = useState<Modal>(null),
    [toast, setToast] = useState<{ text: string; error?: boolean } | null>(
      null,
    ),
    [busy, setBusy] = useState(false),
    [dark, setDark] = useState(false),
    [collapsed, setCollapsed] = useState(false),
    [mobile, setMobile] = useState(false),
    [hidden, setHidden] = useState(false),
    [tab, setTab] = useState("Open positions"),
    [search, setSearch] = useState(""),
    [favorites, setFavorites] = useState<string[]>([
      "EUR_USD",
      "GBP_USD",
      "USD_JPY",
      "AUD_USD",
    ]),
    [favOnly, setFavOnly] = useState(false),
    [side, setSide] = useState<"BUY" | "SELL">("BUY"),
    [orderType, setOrderType] = useState("MARKET"),
    [lots, setLots] = useState("0.10"),
    [admin, setAdmin] = useState<RecordData | null>(null),
    [review, setReview] = useState<RecordData | null>(null),
    [authTab, setAuthTab] = useState("login"),
    [bootError, setBootError] = useState(""),
    [lastUpdate, setLastUpdate] = useState(0),
    [streamStatus, setStreamStatus] = useState("connecting");
  const boot = useRef<Promise<State> | null>(null);
  const notify = useCallback((text: string, error = false) => {
    setToast({ text, error });
    setTimeout(() => setToast(null), 6500);
  }, []);
  const refresh = useCallback(async () => {
    const d = await api("state");
    setState(d);
    return d;
  }, []);
  useEffect(() => {
    let active = true;
    if (!boot.current)
      boot.current = (async () => {
        try {
          return await api("state");
        } catch {
          await api("auth/guest", {});
          return api("state");
        }
      })();
    boot.current
      .then((d) => {
        if (active) setState(d);
      })
      .catch(() => {
        if (active)
          setBootError(
            "Sign in to access your workspace. Local practice may be disabled.",
          );
      });
    const f = localStorage.getItem("cypher-favorites");
    if (f)
      try {
        setFavorites(JSON.parse(f));
      } catch {}
    setDark(localStorage.getItem("cypher-theme") === "dark");
    const params = new URLSearchParams(location.search);
    if (params.has("verify")) {
      api("auth/verify", { token: params.get("verify") })
        .then((d) => notify(d.message))
        .catch((e) => notify(e.message, true));
      history.replaceState({}, "", "/");
    }
    if (params.has("reset")) {
      setAuthTab("reset");
      setModal("auth");
    }
    return () => {
      active = false;
    };
  }, [notify]);
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    localStorage.setItem("cypher-theme", dark ? "dark" : "light");
  }, [dark]);
  useEffect(() => {
    if (!state) return;
    let active = true;
    setStreamStatus("connecting");
    api(`market?symbol=${symbol}&timeframe=${timeframe}`)
      .then((d) => {
        if (active) {
          setMarket(d);
          setLastUpdate(Date.now());
          setStreamStatus(
            d.status === "SYNTHETIC_PRACTICE" ? "synthetic" : "connected",
          );
        }
      })
      .catch((e) => {
        if (active) {
          setStreamStatus("unavailable");
          notify(e.message, true);
        }
      });
    const source = new EventSource(`/api/market/stream?symbol=${symbol}`);
    source.onmessage = (e) => {
      const q = JSON.parse(e.data);
      if (active) {
        setMarket((old) => {
          if (!old) return null;
          if (q.synthetic) return { ...old, quote: q };
          const step =
              {
                "1m": 60,
                "5m": 300,
                "15m": 900,
                "1h": 3600,
                "4h": 14400,
                "1d": 86400,
              }[timeframe] ?? 3600,
            t = Math.floor(new Date(q.time).getTime() / 1000 / step) * step,
            v = (Number(q.bid) + Number(q.ask)) / 2,
            last = old.candles[old.candles.length - 1];
          if (!last || t < last.time) return { ...old, quote: q };
          const candles =
            t === last.time
              ? [
                  ...old.candles.slice(0, -1),
                  {
                    ...last,
                    high: Math.max(last.high, v),
                    low: Math.min(last.low, v),
                    close: v,
                  },
                ]
              : [
                  ...old.candles,
                  { time: t, open: v, high: v, low: v, close: v },
                ];
          return { ...old, quote: q, candles };
        });
        setLastUpdate(Date.now());
        setStreamStatus(
          q.synthetic
            ? "synthetic"
            : Date.now() - new Date(q.time).getTime() > 30000
              ? "stale"
              : "connected",
        );
      }
    };
    source.onerror = () => setStreamStatus("reconnecting");
    source.addEventListener("unavailable", () =>
      setStreamStatus("unavailable"),
    );
    source.addEventListener("unauthorized", () => {
      source.close();
      setStreamStatus("unavailable");
      notify(
        "Your market-data session expired or was revoked. Sign in again.",
        true,
      );
    });
    return () => {
      active = false;
      source.close();
    };
  }, [symbol, timeframe, !!state, notify]);
  useEffect(() => {
    if (!state) return;
    const timer = setInterval(() => {
      api("demo/sync", {})
        .then(() => refresh())
        .catch(() => {});
      if (lastUpdate && Date.now() - lastUpdate > 30000)
        setStreamStatus("stale");
    }, 12000);
    return () => clearInterval(timer);
  }, [!!state, lastUpdate, refresh]);
  useEffect(() => {
    if (page === "Administration" && state)
      api("admin/overview")
        .then(setAdmin)
        .catch((e) => notify(e.message, true));
  }, [page, state?.user.role, notify]);
  useEffect(() => {
    if (!modal) return;
    const previous = document.activeElement as HTMLElement | null;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setModal(null);
        return;
      }
      if (e.key === "Tab") {
        const targets = Array.from(
          document.querySelectorAll<HTMLElement>(
            "[role=dialog] button:not(:disabled),[role=dialog] input:not(:disabled),[role=dialog] select,[role=dialog] textarea,[role=dialog] a[href]",
          ),
        );
        const first = targets[0],
          last = targets[targets.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("keydown", handler);
      previous?.focus();
    };
  }, [modal]);
  const action = async (fn: () => Promise<any>, message?: string) => {
    setBusy(true);
    try {
      const result = await fn();
      await refresh();
      if (message) notify(message);
      return result;
    } catch (e) {
      notify((e as Error).message, true);
      return null;
    } finally {
      setBusy(false);
    }
  };
  const navigate = (p: string) => {
    setPage(p);
    setMobile(false);
  };
  const favorite = (s: string) => {
    const next = favorites.includes(s)
      ? favorites.filter((x) => x !== s)
      : [...favorites, s];
    setFavorites(next);
    localStorage.setItem("cypher-favorites", JSON.stringify(next));
  };
  const current = instruments.find((i) => i.symbol === symbol)!;
  const open = state?.positions.filter((p) => p.status === "OPEN") ?? [],
    closed = state?.positions.filter((p) => p.status === "CLOSED") ?? [],
    pending = state?.orders.filter((o) => o.status === "PENDING") ?? [];
  const virtual = mode === "DEMO";
  const showTransfer = (type: "deposit" | "withdraw") => setModal(type);
  const onOrder = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const r = await action(
      () =>
        api(virtual ? "demo/orders" : "live/orders", {
          symbol,
          side,
          type: orderType,
          lots,
          price: f.get("price") || undefined,
          stopLoss: f.get("stopLoss") || undefined,
          takeProfit: f.get("takeProfit") || undefined,
          key: crypto.randomUUID(),
        }),
      "Practice " + side.toLowerCase() + " order submitted",
    );
    if (r) setTab(orderType === "MARKET" ? "Open positions" : "Pending orders");
  };
  const onTransfer = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const r = await action(
      () =>
        api(modal === "deposit" ? "deposits" : "withdrawals", {
          amount: f.get("amount"),
          phone: String(f.get("phone")).replace(/^0/, "254"),
          key: crypto.randomUUID(),
        }),
      modal === "deposit"
        ? "STK push requested. Awaiting provider confirmation."
        : "Withdrawal submitted for Super Admin approval",
    );
    if (r) setModal(null);
  };
  const authSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    try {
      const data = await api("auth/" + authTab, {
        name: f.get("name"),
        email: f.get("email"),
        password: f.get("password"),
        riskAccepted: f.get("risk") === "on",
        token: new URLSearchParams(location.search).get("reset"),
      });
      notify(data.message ?? "Welcome back");
      if (data.developmentLink)
        notify("Development email link: " + data.developmentLink);
      if (authTab === "login" || authTab === "register") {
        await refresh();
        setModal(null);
        setBootError("");
      }
      if (authTab === "reset") {
        history.replaceState({}, "", "/");
        setAuthTab("login");
      }
    } catch (e) {
      notify((e as Error).message, true);
    } finally {
      setBusy(false);
    }
  };
  const renderWatchlist = (compact = false) => (
    <section className={"panel watchlist " + (compact ? "compact" : "")}>
      <div className="panel-heading">
        <h3>
          Market watch{" "}
          <span className="count">
            {favOnly ? favorites.length : instruments.length}
          </span>
        </h3>
        <button
          className="icon-button"
          title={favOnly ? "Show all instruments" : "Show favorites"}
          onClick={() => setFavOnly(!favOnly)}
        >
          <Star size={16} fill={favOnly ? "currentColor" : "none"} />
        </button>
      </div>
      <div className="watch-columns">
        <span>Instrument</span>
        <span>Practice chart</span>
        <span>Watch</span>
      </div>
      {instruments
        .filter((i) => !favOnly || favorites.includes(i.symbol))
        .map((i, index) => (
          <div
            className={"watch-row " + (symbol === i.symbol ? "selected" : "")}
            key={i.symbol}
          >
            <button
              className="instrument-button"
              onClick={() => setSymbol(i.symbol)}
            >
              <Flags symbol={i.symbol} />
              <span>
                <strong>{i.symbol.replace("_", "/")}</strong>
                <small>{i.name.split(" / ")[0]}</small>
              </span>
            </button>
            <button
              className="mini-chart"
              title={"Open " + i.name}
              onClick={() => {
                setSymbol(i.symbol);
                navigate("Trading terminal");
              }}
            >
              <Sparkline seed={index} up={index !== 2 && index !== 4} />
            </button>
            <button
              className="star-button"
              title={"Favorite " + i.symbol}
              onClick={() => favorite(i.symbol)}
            >
              <Star
                size={14}
                fill={favorites.includes(i.symbol) ? "currentColor" : "none"}
              />
            </button>
          </div>
        ))}
      <div className="watch-note">
        <span className="status-dot amber" />
        Synthetic chart previews · not live prices
      </div>
      <button
        className="text-link watch-all"
        onClick={() => navigate("Trading terminal")}
      >
        Open trading terminal <ArrowUpRight size={14} />
      </button>
    </section>
  );
  const renderChart = () => (
    <section className="panel chart-panel">
      <div className="chart-title">
        <div className="chart-title-left">
          <Flags symbol={symbol} />
          <button className="symbol-select" onClick={() => setModal("search")}>
            <strong>{symbol.replace("_", "/")}</strong>
            <span>
              {current.name} <ChevronDown size={12} />
            </span>
          </button>
          <span className="tag neutral">FOREX</span>
        </div>
        <button
          className="icon-button"
          title="Chart information"
          onClick={() =>
            notify(market?.attribution ?? "Market data unavailable")
          }
        >
          <Ellipsis size={20} />
        </button>
      </div>
      <div className="chart-price">
        <strong>{market?.quote.bid ?? "—"}</strong>
        <span className="price-label">
          {market?.quote.synthetic
            ? "Synthetic practice price"
            : (market?.quote.source ?? "Connecting")}
        </span>
        <div className="bid-ask">
          <span>
            BID <b>{market?.quote.bid ?? "—"}</b>
          </span>
          <span>
            ASK <b>{market?.quote.ask ?? "—"}</b>
          </span>
        </div>
      </div>
      <div className="chart-controls">
        <div className="timeframes">
          {["1m", "5m", "15m", "1h", "4h", "1d"].map((t) => (
            <button
              className={timeframe === t ? "active" : ""}
              key={t}
              onClick={() => setTimeframe(t)}
            >
              {t.toUpperCase()}
            </button>
          ))}
        </div>
        <div className="chart-tools">
          <span>
            <Activity size={13} /> Candles
          </span>
          <span className="vertical-divider" />
          <button
            className="icon-button"
            title="Chart controls"
            onClick={() =>
              notify(
                "Scroll to zoom, drag to pan, and move your pointer to inspect candle prices.",
              )
            }
          >
            <SlidersHorizontal size={14} />
          </button>
        </div>
      </div>
      {market ? (
        <PriceChart candles={market.candles} dark={dark} />
      ) : (
        <div className="chart-loading">
          <Loader2 className="spin" size={22} /> Connecting to chart…
        </div>
      )}
      <div className="chart-footer">
        <span>
          <i
            className={
              "status-dot " + (streamStatus === "connected" ? "" : "amber")
            }
          />
          {streamStatus === "synthetic"
            ? "Synthetic practice feed"
            : streamStatus === "connected"
              ? "Provider connected"
              : streamStatus === "stale"
                ? "Warning: stale data"
                : streamStatus === "reconnecting"
                  ? "Reconnecting…"
                  : streamStatus === "unavailable"
                    ? "Market data unavailable"
                    : "Connecting…"}
        </span>
        <span>
          {market?.quote.synthetic
            ? "Historical training fixture"
            : market
              ? new Date(market.quote.time).toLocaleTimeString("en-GB") +
                " UTC offset local"
              : "—"}{" "}
          · {timeframe.toUpperCase()}
        </span>
      </div>
    </section>
  );
  const renderPositions = () => {
    const list =
      tab === "Open positions"
        ? open
        : tab === "Pending orders"
          ? pending
          : closed;
    return (
      <section className="panel positions-panel">
        <div className="position-tabs">
          {["Open positions", "Pending orders", "Trade history"].map((t, i) => (
            <button
              className={tab === t ? "active" : ""}
              key={t}
              onClick={() => setTab(t)}
            >
              {t}
              <span>{[open.length, pending.length, closed.length][i]}</span>
            </button>
          ))}
          <button
            className="icon-button positions-export"
            title="Download real-money statement"
            onClick={() => window.open("/api/statement", "_blank")}
          >
            <Download size={15} />
          </button>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Instrument</th>
                <th>Side / size</th>
                <th>Entry price</th>
                <th>Stop loss</th>
                <th>Take profit</th>
                <th>
                  {tab === "Trade history" ? "Realized P&L" : "Floating P&L"}
                </th>
                <th />
              </tr>
            </thead>
            <tbody>
              {list.map((p) => (
                <tr key={p.id}>
                  <td>
                    <span className="table-symbol">
                      <Flags symbol={p.symbol} />
                      <strong>{p.symbol.replace("_", "/")}</strong>
                    </span>
                  </td>
                  <td>
                    <span
                      className={
                        "side-tag " + (p.side === "BUY" ? "buy" : "sell")
                      }
                    >
                      {p.side}
                    </span>{" "}
                    <span className="subtle">{p.lots}</span>
                  </td>
                  <td>
                    {Number(p.entry_price).toFixed(
                      p.symbol === "USD_JPY" ? 3 : 5,
                    )}
                  </td>
                  <td>{p.stop_loss ?? "—"}</td>
                  <td>{p.take_profit ?? "—"}</td>
                  <td
                    className={
                      Number(p.floating_pnl ?? p.pnl ?? 0) >= 0
                        ? "positive"
                        : "negative"
                    }
                  >
                    {tab === "Pending orders"
                      ? "—"
                      : usd(tab === "Trade history" ? p.pnl : p.floating_pnl)}
                  </td>
                  <td>
                    {tab !== "Trade history" && (
                      <button
                        className="small-button"
                        disabled={busy}
                        onClick={() =>
                          action(
                            () =>
                              api(
                                tab === "Open positions"
                                  ? "demo/close"
                                  : "demo/cancel",
                                { id: p.id },
                              ),
                            tab === "Open positions"
                              ? "Practice position closed"
                              : "Pending order cancelled",
                          )
                        }
                      >
                        {tab === "Open positions" ? "Close" : "Cancel"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!list.length && (
            <div className="empty-state">
              <span className="empty-icon">
                <Activity size={21} />
              </span>
              <strong>
                {tab === "Open positions"
                  ? "A clear view. A fresh opportunity."
                  : tab === "Pending orders"
                    ? "No pending orders"
                    : "Your trading story starts here"}
              </strong>
              <p>
                {tab === "Open positions"
                  ? "Your practice positions will appear here when you place a trade."
                  : tab === "Pending orders"
                    ? "Place a limit or stop order in the trading terminal."
                    : "Closed practice trades will be recorded here."}
              </p>
              <button
                className="text-link"
                onClick={() => navigate("Trading terminal")}
              >
                Explore the terminal <ArrowRight size={13} />
              </button>
            </div>
          )}
        </div>
      </section>
    );
  };
  const orderPanel = () => (
    <section className="panel order-panel">
      <div className="panel-heading">
        <h3>Place an order</h3>
        <span className="tag demo">{virtual ? "DEMO" : "REAL"}</span>
      </div>
      <div className="order-pair">
        <Flags symbol={symbol} />
        <strong>{symbol.replace("_", "/")}</strong>
        <span className="subtle">
          Spread{" "}
          {market
            ? (
                (+market.quote.ask - +market.quote.bid) *
                (symbol === "USD_JPY" ? 100 : 10000)
              ).toFixed(1)
            : "—"}{" "}
          pips
        </span>
      </div>
      <form onSubmit={onOrder}>
        <div className="side-buttons">
          <button
            type="button"
            className={side === "SELL" ? "selected sell" : ""}
            onClick={() => setSide("SELL")}
          >
            <span>Sell</span>
            <strong>{market?.quote.bid ?? "—"}</strong>
          </button>
          <button
            type="button"
            className={side === "BUY" ? "selected buy" : ""}
            onClick={() => setSide("BUY")}
          >
            <span>Buy</span>
            <strong>{market?.quote.ask ?? "—"}</strong>
          </button>
        </div>
        <label>
          Order type
          <select
            value={orderType}
            onChange={(e) => setOrderType(e.target.value)}
          >
            <option value="MARKET">Market execution</option>
            <option value="LIMIT">Limit order</option>
            <option value="STOP">Stop entry order</option>
          </select>
        </label>
        <label>
          Volume (lots)
          <div className="volume-input">
            <button
              type="button"
              onClick={() =>
                setLots(Math.max(0.01, Number(lots) - 0.01).toFixed(2))
              }
            >
              −
            </button>
            <input
              aria-label="Volume in lots"
              type="number"
              min=".01"
              max="10"
              step=".01"
              value={lots}
              onChange={(e) => setLots(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() =>
                setLots(Math.min(10, Number(lots) + 0.01).toFixed(2))
              }
            >
              +
            </button>
          </div>
        </label>
        {orderType !== "MARKET" && (
          <label>
            Entry price
            <input
              name="price"
              type="number"
              min="0.00001"
              step="any"
              placeholder={market?.quote.bid}
              required
            />
          </label>
        )}
        <div className="form-row">
          <label>
            Stop loss <span>Optional</span>
            <input
              name="stopLoss"
              type="number"
              step="any"
              min="0.00001"
              placeholder="Not set"
            />
          </label>
          <label>
            Take profit <span>Optional</span>
            <input
              name="takeProfit"
              type="number"
              step="any"
              min="0.00001"
              placeholder="Not set"
            />
          </label>
        </div>
        <div className="order-summary">
          <span>
            Practice leverage <b>1:100</b>
          </span>
          <span>
            Free margin <b>{usd(state?.demo.freeMargin)}</b>
          </span>
        </div>
        {!virtual && (
          <p className="warning-text">
            <LockKeyhole size={14} />
            Live trading unavailable. No real orders can be submitted.
          </p>
        )}
        <button
          className={"button full " + (side === "BUY" ? "primary" : "danger")}
          disabled={
            busy ||
            !virtual ||
            ["unavailable", "stale", "reconnecting", "connecting"].includes(
              streamStatus,
            )
          }
        >
          {busy ? <Loader2 className="spin" size={15} /> : <Zap size={15} />}{" "}
          {side === "BUY" ? "Buy" : "Sell"} {symbol.replace("_", "/")}
        </button>
        <p className="order-disclaimer">
          {market?.quote.synthetic
            ? "Simulated execution using synthetic prices."
            : "Simulated execution using provider prices."}{" "}
          Virtual funds only.
        </p>
      </form>
    </section>
  );
  const renderOverview = () => (
    <>
      <div className="welcome-row">
        <div>
          <div className="eyebrow">YOUR TRADING WORKSPACE</div>
          <h1>
            Welcome back, {state?.user.name.split(" ")[0] ?? "trader"}{" "}
            <span className="greeting-dot">✦</span>
          </h1>
          <p>A clear perspective. A smarter next move.</p>
        </div>
        <button
          className="button secondary date-button"
          onClick={() => setModal("account")}
        >
          <Globe2 size={14} />{" "}
          {new Date().toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
          <ChevronDown size={12} />
        </button>
      </div>
      <section className="hero">
        <div className="hero-content">
          <span className="hero-kicker">
            <span /> BUILT FOR YOUR NEXT MOVE
          </span>
          <h2>
            Your ambition.
            <br />A world of opportunity.
          </h2>
          <p>
            Find your rhythm in the markets.
            <br />
            Practice with purpose. Trade with perspective.
          </p>
          <button
            className="button hero-button"
            onClick={() => navigate("Trading terminal")}
          >
            Explore the markets <ArrowUpRight size={15} />
          </button>
        </div>
        <Orbit />
        <div className="hero-badge">
          <ShieldCheck size={15} />
          <span>Your edge starts here.</span>
        </div>
        <div className="hero-page">
          <i />
          <i />
          <i />
        </div>
      </section>
      <div className="section-heading">
        <h2>
          Account overview{" "}
          <span className="tag demo">
            {virtual ? "DEMO ACCOUNT" : "REAL ACCOUNT"}
          </span>
        </h2>
        <button className="text-link subtle" onClick={() => setHidden(!hidden)}>
          {hidden ? <EyeOff size={14} /> : <Eye size={14} />}{" "}
          {hidden ? "Show balances" : "Hide balances"}
        </button>
      </div>
      <div className="stats-grid">
        <div className="stat-card balance-card">
          <div className="stat-label">
            {virtual ? "Virtual balance" : "Wallet balance"}
            <Wallet size={16} />
          </div>
          <div className="stat-value">
            {hidden
              ? "••••••"
              : virtual
                ? usd(state?.demo.balance)
                : kes(state?.wallet.available)}
            <span>{virtual ? "USD" : "KES"}</span>
          </div>
          <div className="stat-bottom">
            <span className="little-dot" />
            {virtual
              ? "Virtual funds · no real money"
              : "Available real-money funds"}
            <button
              onClick={() =>
                virtual ? setModal("reset") : showTransfer("deposit")
              }
              title={virtual ? "Reset demo balance" : "Deposit"}
            >
              <Plus size={15} />
            </button>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">
            {virtual ? "Account equity" : "Reserved funds"}
            <TrendingUp size={16} />
          </div>
          <div className="stat-value">
            {hidden
              ? "••••••"
              : virtual
                ? usd(state?.demo.equity)
                : kes(state?.wallet.reserved)}
          </div>
          <div className="stat-bottom">
            <span>Balance + unrealized P&L</span>
            <span className="stat-mini subtle">
              <TrendingUp size={19} />
            </span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">
            Unrealized P&L
            <Activity size={16} />
          </div>
          <div
            className={
              "stat-value " +
              (Number(state?.demo.unrealized ?? 0) >= 0
                ? "positive"
                : "negative")
            }
          >
            {hidden ? "••••••" : virtual ? usd(state?.demo.unrealized) : "—"}
          </div>
          <div className="stat-bottom">
            <span>Across {virtual ? open.length : 0} open positions</span>
            <span className="tag neutral">
              {virtual ? "PRACTICE" : "OFFLINE"}
            </span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">
            {virtual ? "Free margin" : "Verification"}
            <ShieldCheck size={16} />
          </div>
          <div className="stat-value">
            {hidden
              ? "••••••"
              : virtual
                ? usd(state?.demo.freeMargin)
                : "Pending"}
          </div>
          <div className="stat-bottom">
            <span>
              {virtual ? "Leverage 1:100" : "Complete your onboarding"}
            </span>
            <span className="info-dot">i</span>
          </div>
        </div>
      </div>
      <div className="section-heading market-section-title">
        <h2>
          Market overview{" "}
          <span className="muted-label">Your view of the markets</span>
        </h2>
        <button
          className="text-link"
          onClick={() => navigate("Trading terminal")}
        >
          Go to terminal <ArrowUpRight size={14} />
        </button>
      </div>
      <div className="market-grid">
        {renderChart()}
        {renderWatchlist()}
      </div>
      {renderPositions()}
      <div className="bottom-grid">
        <section className="learning-card">
          <div className="learn-icon">
            <BookOpen size={23} />
          </div>
          <div>
            <span className="eyebrow">A LITTLE KNOWLEDGE. A BETTER EDGE.</span>
            <h3>Build confidence before you trade.</h3>
            <p>Get familiar with the market, one practice trade at a time.</p>
          </div>
          <button
            className="icon-button"
            title="Read trading guide"
            onClick={() => navigate("Learning center")}
          >
            <ArrowUpRight size={20} />
          </button>
        </section>
        <section className="safety-card">
          <ShieldCheck size={22} />
          <div>
            <h3>A safer place to practice</h3>
            <p>Demo funds stay separate from your real wallet. Always.</p>
          </div>
          <button
            className="icon-button"
            title="Account safety"
            onClick={() => setModal("account")}
          >
            <ArrowUpRight size={18} />
          </button>
        </section>
      </div>
    </>
  );
  const renderTransactions = (history = false) => (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            {history ? "YOUR TRADING JOURNEY" : "A CLEAR FINANCIAL RECORD"}
          </div>
          <h1>{history ? "Trading history" : "Transactions"}</h1>
          <p>
            {history
              ? "Every practice order. Every result. All in one place."
              : "Your deposits and withdrawals, from request to confirmation."}
          </p>
        </div>
        <a className="button secondary" href="/api/statement">
          <Download size={15} /> Export statement
        </a>
      </div>
      {history ? (
        renderPositions()
      ) : (
        <>
          <div className="notice">
            <ShieldCheck size={18} />
            <span>
              Real-money activity is separate from practice trading. Payments
              remain disabled until all approvals and integrations are complete.
            </span>
          </div>
          <section className="panel">
            <div className="panel-heading">
              <h3>Wallet activity</h3>
              <span className="tag neutral">KES</span>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ...(state?.deposits ?? []).map((x) => ({
                      ...x,
                      kind: "Deposit",
                    })),
                    ...(state?.withdrawals ?? []).map((x) => ({
                      ...x,
                      kind: "Withdrawal",
                    })),
                  ].map((x: RecordData) => (
                    <tr key={x.id}>
                      <td className="mono">{x.id.slice(0, 12)}</td>
                      <td>{x.kind}</td>
                      <td>{kes(x.amount)}</td>
                      <td>{new Date(x.created_at).toLocaleDateString()}</td>
                      <td>
                        <span className="tag neutral">
                          {x.status.replaceAll("_", " ")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!state?.deposits.length && !state?.withdrawals.length && (
                <div className="empty-state tall">
                  <span className="empty-icon">
                    <ArrowDownLeft size={24} />
                  </span>
                  <strong>No transactions yet</strong>
                  <p>
                    Confirmed payments and withdrawal requests will appear here.
                    <br />
                    Practice trades never change your real wallet.
                  </p>
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </>
  );
  const renderWallet = () => (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">YOUR FUNDS, IN FOCUS</div>
          <h1>My wallet</h1>
          <p>A separate home for your real-money funds.</p>
        </div>
        <a href="/api/statement" className="button secondary">
          <Download size={15} /> Statement
        </a>
      </div>
      <div className="wallet-layout">
        <section className="wallet-card">
          <div className="wallet-card-top">
            <Brand />
            <span>KES WALLET</span>
          </div>
          <span className="wallet-label">Available balance</span>
          <h2>{kes(state?.wallet.available)}</h2>
          <div className="wallet-card-bottom">
            <span>
              Reserved for withdrawal <b>{kes(state?.wallet.reserved)}</b>
            </span>
            <ShieldCheck size={27} />
          </div>
        </section>
        <section className="panel wallet-actions">
          <h3>Move your money</h3>
          <p>Secure, traceable payments through approved providers.</p>
          <div>
            <button
              className="button primary"
              onClick={() => showTransfer("deposit")}
            >
              <ArrowDownToLine size={16} /> Deposit via M-Pesa
            </button>
            <button
              className="button secondary"
              onClick={() => showTransfer("withdraw")}
            >
              <ArrowUpFromLine size={16} /> Request withdrawal
            </button>
          </div>
          <small>
            <LockKeyhole size={13} /> Every withdrawal needs explicit Super
            Admin approval.
          </small>
        </section>
      </div>
      <div className="notice amber-notice">
        <LockKeyhole size={19} />
        <div>
          <strong>Real-money services are not yet available</strong>
          <p>
            Required: account verification, approved payment and execution
            providers, Kenyan regulatory clearance, and security review. No real
            funds are accepted in this environment.
          </p>
        </div>
      </div>
      <div className="onboarding-grid">
        {[
          {
            title: "Verify your email",
            detail: state?.user.emailVerified
              ? "Email confirmed"
              : "Confirm your email address",
            done: state?.user.emailVerified,
          },
          {
            title: "Complete identity verification",
            detail: "KYC provider onboarding required",
            done: false,
          },
          {
            title: "Accept risk disclosures",
            detail: "Understand leveraged trading risks",
            done: false,
          },
        ].map((x, i) => (
          <section className="panel onboarding-step" key={x.title}>
            <span className={"step-number " + (x.done ? "done" : "")}>
              {x.done ? <Check size={16} /> : i + 1}
            </span>
            <h3>{x.title}</h3>
            <p>{x.detail}</p>
            <span className="tag neutral">
              {x.done ? "COMPLETED" : "PENDING"}
            </span>
          </section>
        ))}
      </div>
      <section className="panel">
        <div className="panel-heading">
          <h3>Wallet statements</h3>
          <a className="text-link" href="/api/statement">
            Download ledger statement <Download size={14} />
          </a>
        </div>
        <div className="empty-state">
          <FileText size={24} />
          <strong>A complete record of your funds</strong>
          <p>
            Visit Transactions to track deposits and withdrawals. Statements are
            generated from your authoritative ledger, never from browser
            balances.
          </p>
          <button
            className="text-link"
            onClick={() => navigate("Transactions")}
          >
            View transactions <ArrowRight size={13} />
          </button>
        </div>
      </section>
    </>
  );
  const renderSupport = () => (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">WE'RE HERE TO HELP</div>
          <h1>Support center</h1>
          <p>Your questions deserve clear answers.</p>
        </div>
        <LifeBuoy size={30} />
      </div>
      <div className="two-column">
        <section className="panel form-panel">
          <h3>Start a conversation</h3>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const form = e.currentTarget,
                f = new FormData(form);
              const r = await action(
                () =>
                  api("support", {
                    subject: f.get("subject"),
                    message: f.get("message"),
                  }),
                "Support ticket created",
              );
              if (r) form.reset();
            }}
          >
            <label>
              Subject
              <input
                name="subject"
                placeholder="How can we help?"
                required
                minLength={3}
                maxLength={160}
              />
            </label>
            <label>
              Your message
              <textarea
                name="message"
                rows={5}
                placeholder="Tell us a little more…"
                required
                minLength={10}
                maxLength={4000}
              />
            </label>
            <button className="button primary" disabled={busy}>
              Send message <ArrowRight size={15} />
            </button>
          </form>
        </section>
        <section className="panel">
          <div className="panel-heading">
            <h3>Your conversations</h3>
          </div>
          {state?.tickets.length ? (
            state.tickets.map((t) => (
              <div className="ticket" key={t.id}>
                <span className="tag demo">{t.status}</span>
                <h3>{t.subject}</h3>
                <p>{t.message}</p>
                <small>{new Date(t.created_at).toLocaleString()}</small>
              </div>
            ))
          ) : (
            <div className="empty-state tall">
              <LifeBuoy size={28} />
              <strong>A fresh conversation starts here</strong>
              <p>Your private support tickets will appear here.</p>
            </div>
          )}
        </section>
      </div>
    </>
  );
  const renderSettings = () => (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">MAKE IT YOURS</div>
          <h1>Settings & security</h1>
          <p>Your profile, your preferences, your peace of mind.</p>
        </div>
      </div>
      <div className="two-column">
        <section className="panel form-panel">
          <h3>Personal details</h3>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              await action(
                () =>
                  api("profile", {
                    name: f.get("name"),
                    timezone: f.get("timezone"),
                  }),
                "Profile saved",
              );
            }}
          >
            <label>
              Full name
              <input
                name="name"
                defaultValue={state?.user.name}
                required
                minLength={2}
              />
            </label>
            <label>
              Email address
              <input value={state?.user.email ?? ""} disabled readOnly />
            </label>
            <label>
              Display timezone
              <select name="timezone">
                <option>Africa/Nairobi</option>
                <option>UTC</option>
                <option>Europe/London</option>
                <option>America/New_York</option>
              </select>
            </label>
            <button className="button primary" disabled={busy}>
              Save changes <Check size={15} />
            </button>
          </form>
        </section>
        <div>
          <section className="panel form-panel">
            <h3>Account security</h3>
            <div className="security-row">
              <LockKeyhole size={19} />
              <div>
                <strong>Password & sessions</strong>
                <p>Server-side, expiring, revocable sessions.</p>
              </div>
            </div>
            <button
              className="button secondary full"
              onClick={() => {
                setAuthTab("forgot");
                setModal("auth");
              }}
            >
              Reset password <ArrowUpRight size={14} />
            </button>
            <button
              className="button secondary full spaced"
              onClick={async () => {
                await api("sessions/revoke", {});
                setState(null);
                setBootError("All sessions revoked. Sign in again.");
              }}
            >
              Revoke all sessions <LogOut size={14} />
            </button>
          </section>
          <section className="panel form-panel spaced">
            <h3>Appearance</h3>
            <p>Find your focus, day or night.</p>
            <button className="button secondary" onClick={() => setDark(!dark)}>
              {dark ? <Sun size={16} /> : <Moon size={16} />} Switch to{" "}
              {dark ? "light" : "dark"} mode
            </button>
          </section>
        </div>
      </div>
    </>
  );
  const renderLearning = () => (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">KNOWLEDGE IS YOUR FIRST EDGE</div>
          <h1>Learn. Practice. Repeat.</h1>
          <p>A practical introduction to your trading workspace.</p>
        </div>
        <BookOpen size={30} />
      </div>
      <div className="learning-grid">
        {[
          {
            n: "01",
            title: "Know your account",
            body: "A demo account uses virtual USD. Your real KSh wallet is separate. Synthetic training prices are not the current market and cannot indicate real trading performance.",
          },
          {
            n: "02",
            title: "Understand bid and ask",
            body: "Buy orders execute at the ask; sell orders at the bid. The difference is the spread. Closing a position crosses the spread too, so a new position can immediately show a small loss.",
          },
          {
            n: "03",
            title: "Size your risk",
            body: "One standard forex lot is 100,000 base units. The practice engine uses 1:100 leverage. Margin is not a fee, but a collateral requirement. Losses can increase rapidly with leverage.",
          },
          {
            n: "04",
            title: "Plan your exits",
            body: "A stop loss aims to limit downside and take profit targets an exit. The simulator checks bid/ask touches while your workspace is open. It does not model liquidity, slippage, swaps, or guaranteed fills.",
          },
          {
            n: "05",
            title: "Market, limit, or stop?",
            body: "Market orders execute at the current practice quote. Limits request a better price; stop entries activate beyond the current price. Pending orders wait until a valid quote touches the threshold.",
          },
          {
            n: "06",
            title: "Real money, real responsibility",
            body: "Leveraged forex carries significant risk. Do not invest money you cannot afford to lose. CYPHERFX development mode is not an authorized brokerage or a recommendation to trade.",
          },
        ].map((x) => (
          <section className="panel learning-article" key={x.n}>
            <span>{x.n}</span>
            <h2>{x.title}</h2>
            <p>{x.body}</p>
          </section>
        ))}
      </div>
      <button
        className="button primary"
        onClick={() => navigate("Trading terminal")}
      >
        Put it into practice <ArrowUpRight size={15} />
      </button>
    </>
  );
  const renderAdmin = () => (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">AUTHORIZED OPERATIONS ONLY</div>
          <h1>Platform administration</h1>
          <p>Financial decisions with clear accountability.</p>
        </div>
        <button
          className="button secondary"
          onClick={() =>
            api("admin/overview")
              .then(setAdmin)
              .catch((e) => notify(e.message, true))
          }
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>
      <div className="notice">
        <ShieldCheck size={18} />
        <span>
          Your role: {state?.user.role}. Only a Super Admin with fresh password
          and MFA can approve or reject. Approval never means paid.
        </span>
      </div>
      {admin ? (
        <>
          {admin.withdrawals && (
            <section className="panel">
              <div className="panel-heading">
                <h3>Withdrawal approval queue</h3>
                <span className="tag demo">
                  {admin.withdrawals.length} REQUESTS
                </span>
              </div>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Amount</th>
                      <th>Destination</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {admin.withdrawals.map((w: RecordData) => (
                      <tr key={w.id}>
                        <td>
                          <strong>{w.name}</strong>
                          <small className="block subtle">{w.email}</small>
                        </td>
                        <td>{kes(w.amount)}</td>
                        <td>{w.phone}</td>
                        <td>
                          <span className="tag neutral">
                            {w.status.replaceAll("_", " ")}
                          </span>
                        </td>
                        <td>
                          {w.status === "PENDING_ADMIN_APPROVAL" &&
                          state?.user.role === "SUPER_ADMIN" ? (
                            <button
                              className="small-button"
                              onClick={() => {
                                setReview(w);
                                setModal("review");
                              }}
                            >
                              Review
                            </button>
                          ) : (
                            "Read only"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!admin.withdrawals.length && (
                  <div className="empty-state">
                    <ShieldCheck size={27} />
                    <strong>No withdrawal requests</strong>
                    <p>All financial activity is preserved for audit.</p>
                  </div>
                )}
              </div>
            </section>
          )}
          {admin.users && (
            <section className="panel spaced">
              <div className="panel-heading">
                <h3>Customer accounts</h3>
              </div>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Account status</th>
                      <th>KYC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {admin.users.map((x: RecordData) => (
                      <tr key={x.id}>
                        <td>{x.name}</td>
                        <td>{x.email}</td>
                        <td>{x.status}</td>
                        <td>{x.kyc_status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!admin.users.length && (
                  <div className="empty-state">
                    <Users size={24} />
                    <strong>No registered customers</strong>
                    <p>
                      Local practice sessions are excluded from this directory.
                    </p>
                  </div>
                )}
              </div>
            </section>
          )}
          {admin.reconciliation && (
            <section className="panel spaced">
              <div className="panel-heading">
                <h3>Ledger reconciliation</h3>
                <span className="tag demo">MINOR UNITS · KES</span>
              </div>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Account</th>
                      <th>Kind</th>
                      <th>Ledger balance</th>
                      <th>Projection</th>
                      <th>Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {admin.reconciliation
                      .filter(
                        (x: RecordData) =>
                          x.projected_balance !== null &&
                          x.ledger_balance !== "0",
                      )
                      .map((x: RecordData) => (
                        <tr key={x.id}>
                          <td>{x.id.slice(0, 18)}</td>
                          <td>{x.kind}</td>
                          <td>{x.ledger_balance}</td>
                          <td>{x.projected_balance}</td>
                          <td>
                            {x.ledger_balance === x.projected_balance
                              ? "Matched"
                              : "DISCREPANCY"}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
          {admin.audit && (
            <section className="panel spaced">
              <div className="panel-heading">
                <h3>Immutable audit trail</h3>
              </div>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Action</th>
                      <th>Reference</th>
                      <th>Outcome</th>
                    </tr>
                  </thead>
                  <tbody>
                    {admin.audit.map((x: RecordData) => (
                      <tr key={x.id}>
                        <td>{new Date(x.created_at).toLocaleString()}</td>
                        <td>{x.action}</td>
                        <td className="mono">{x.reference.slice(0, 15)}</td>
                        <td>{x.outcome}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
          {admin.providerHealth && (
            <section className="panel form-panel spaced">
              <h3>Execution connectivity</h3>
              <p>{admin.providerHealth.reason}</p>
              <span className="tag neutral">LIVE TRADING UNAVAILABLE</span>
            </section>
          )}
          {admin.tickets && (
            <section className="panel form-panel spaced">
              <h3>Support queue</h3>
              {admin.tickets.length ? (
                admin.tickets.map((x: RecordData) => (
                  <div className="ticket" key={x.id}>
                    <h3>{x.subject}</h3>
                    <p>{x.message}</p>
                    <small>
                      {x.name} · {x.status}
                    </small>
                  </div>
                ))
              ) : (
                <p>No customer enquiries.</p>
              )}
            </section>
          )}
          {admin.staff && (
            <section className="panel form-panel spaced">
              <h3>Staff access reviews</h3>
              <p>
                {admin.staff.length} staff profiles. HR has no payment or
                trading permissions.
              </p>
            </section>
          )}
        </>
      ) : (
        <div className="empty-state">
          <Loader2 className="spin" />
          Loading authorized views…
        </div>
      )}
    </>
  );
  return (
    <div
      className={
        "app-shell " +
        (collapsed ? "sidebar-collapsed" : "") +
        (mobile ? " mobile-open" : "")
      }
    >
      <aside className="sidebar">
        <div className="sidebar-brand">
          <Brand />
          <button
            className="sidebar-collapse"
            title="Collapse navigation"
            onClick={() => setCollapsed(!collapsed)}
          >
            <ChevronLeft size={16} />
          </button>
        </div>
        <div className="workspace-label">
          TRADER WORKSPACE <span>01</span>
        </div>
        <nav>
          {pages.map((p) => (
            <button
              className={page === p.label ? "nav-item active" : "nav-item"}
              key={p.label}
              onClick={() => navigate(p.label)}
              title={p.label}
            >
              <p.icon size={18} />
              <span>{p.label}</span>
              {p.label === "Trading terminal" && (
                <span className="nav-badge">PRO</span>
              )}
              {p.label === "Overview" && <span className="nav-active-dot" />}
            </button>
          ))}
        </nav>
        <div className="nav-divider" />
        <div className="workspace-label">RESOURCES</div>
        <nav>
          <button
            className={
              "nav-item " + (page === "Learning center" ? "active" : "")
            }
            onClick={() => navigate("Learning center")}
            title="Learning center"
          >
            <BookOpen size={18} />
            <span>Learning center</span>
            <ArrowUpRight className="nav-end" size={13} />
          </button>
          <button
            className={
              "nav-item " + (page === "Support center" ? "active" : "")
            }
            onClick={() => navigate("Support center")}
            title="Support center"
          >
            <LifeBuoy size={18} />
            <span>Support center</span>
          </button>
          {state && state.user.role !== "CUSTOMER" && (
            <button
              className={
                "nav-item " + (page === "Administration" ? "active" : "")
              }
              onClick={() => navigate("Administration")}
            >
              <ShieldCheck size={18} />
              <span>Administration</span>
            </button>
          )}
        </nav>
        <div className="sidebar-bottom">
          <div className="practice-card">
            <span className="practice-card-icon">
              <Sparkles size={18} />
            </span>
            <h3>
              Small steps.
              <br />
              Stronger trader.
            </h3>
            <p>
              Build your edge with a<br />
              risk-free demo account.
            </p>
            <button
              onClick={() => {
                setMode("DEMO");
                navigate("Trading terminal");
              }}
            >
              Keep practicing <ArrowUpRight size={13} />
            </button>
            <span className="practice-decoration">✳</span>
          </div>
          <button
            className={"nav-item " + (page === "Settings" ? "active" : "")}
            title="Settings"
            onClick={() => navigate("Settings")}
          >
            <Settings size={18} />
            <span>Settings & security</span>
          </button>
          <div className="sidebar-status">
            <span className="status-dot" />
            <span>Development environment</span>
            <CircleHelp size={13} />
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="icon-button mobile-menu"
              title="Open navigation"
              onClick={() => setMobile(!mobile)}
            >
              <Menu size={20} />
            </button>
            <span className="breadcrumb">
              Workspace <ChevronRight size={13} /> <strong>{page}</strong>
            </span>
          </div>
          <div className="topbar-right">
            <div className="account-switcher-wrap">
              <button
                className="account-switcher"
                onClick={() => setAccountMenu(!accountMenu)}
              >
                <span className={"status-dot " + (!virtual ? "amber" : "")} />
                <span>{virtual ? "Demo account" : "Real account"}</span>
                <ChevronDown size={12} />
              </button>
              {accountMenu && (
                <div className="account-dropdown">
                  {(["DEMO", "REAL"] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => {
                        setMode(m);
                        setAccountMenu(false);
                      }}
                    >
                      <span>
                        <strong>
                          {m === "DEMO" ? "Demo account" : "Real-money account"}
                        </strong>
                        <small>
                          {m === "DEMO"
                            ? "Virtual USD · practice trading"
                            : "KES wallet · live services disabled"}
                        </small>
                      </span>
                      {mode === m && <Check size={16} />}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <span className="topbar-divider" />
            <button
              className="icon-button search-button"
              title="Search instruments"
              onClick={() => setModal("search")}
            >
              <Search size={18} />
            </button>
            <button
              className="icon-button theme-button"
              title="Toggle theme"
              onClick={() => setDark(!dark)}
            >
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              className="icon-button notification-button"
              title="Notifications"
              onClick={() => {
                setModal("notifications");
                api("notifications/read", {})
                  .then(refresh)
                  .catch(() => {});
              }}
            >
              <Bell size={18} />
              {state?.notifications.some((n) => !n.read_at) && <i />}
            </button>
            <span className="topbar-divider" />
            <button
              className="profile-button"
              onClick={() => setModal("account")}
            >
              <span className="avatar">
                {state?.user.name
                  .split(" ")
                  .map((s: string) => s[0])
                  .slice(0, 2)
                  .join("") ?? "CX"}
              </span>
              <span>
                <strong>{state?.user.name ?? "Your account"}</strong>
                <small>{virtual ? "Personal workspace" : "Real account"}</small>
              </span>
              <ChevronDown size={12} />
            </button>
          </div>
        </header>
        <main>
          {!state ? (
            <div className="boot-state">
              <Brand />
              {bootError ? (
                <>
                  <h1>Your next chapter starts here.</h1>
                  <p>{bootError}</p>
                  <button
                    className="button primary"
                    onClick={() => {
                      setAuthTab("login");
                      setModal("auth");
                    }}
                  >
                    Sign in <ArrowRight size={16} />
                  </button>
                  <button
                    className="text-link"
                    onClick={() => {
                      setAuthTab("register");
                      setModal("auth");
                    }}
                  >
                    Create an account
                  </button>
                </>
              ) : (
                <>
                  <Loader2 className="spin" size={24} />
                  <p>Preparing your practice workspace…</p>
                </>
              )}
            </div>
          ) : (
            <>
              {!virtual && (
                <div className="notice amber-notice">
                  <LockKeyhole size={17} />
                  <span>
                    <strong>Live trading unavailable.</strong> Real-money
                    services remain disabled. Charts below, if shown, are
                    explicitly practice-only.
                  </span>
                  <button className="text-link" onClick={() => setMode("DEMO")}>
                    Back to demo <ArrowRight size={13} />
                  </button>
                </div>
              )}
              {page === "Overview" ? (
                renderOverview()
              ) : page === "Trading terminal" ? (
                <>
                  <div className="page-heading terminal-heading">
                    <div>
                      <div className="eyebrow">FIND YOUR NEXT OPPORTUNITY</div>
                      <h1>
                        Trading terminal{" "}
                        <span className="tag demo">
                          {virtual ? "PRACTICE" : "LIVE UNAVAILABLE"}
                        </span>
                      </h1>
                      <p>
                        {market?.quote.synthetic
                          ? "Synthetic prices. Simulated execution. Real confidence."
                          : "Provider prices. Practice execution. Virtual funds only."}
                      </p>
                    </div>
                    <button
                      className="button secondary"
                      onClick={() => setModal("search")}
                    >
                      <Search size={15} /> Find instrument
                    </button>
                  </div>
                  <div className="terminal-layout">
                    <div>
                      {renderChart()}
                      {renderPositions()}
                    </div>
                    <div>
                      {orderPanel()}
                      <div className="spaced">{renderWatchlist(true)}</div>
                    </div>
                  </div>
                </>
              ) : page === "My wallet" ? (
                renderWallet()
              ) : page === "Transactions" ? (
                renderTransactions()
              ) : page === "Trading history" ? (
                renderTransactions(true)
              ) : page === "Support center" ? (
                renderSupport()
              ) : page === "Settings" ? (
                renderSettings()
              ) : page === "Learning center" ? (
                renderLearning()
              ) : (
                renderAdmin()
              )}
              <footer className="footer">
                <span>
                  © {new Date().getFullYear()} CYPHERFX. Built for your next
                  move.
                </span>
                <span>
                  <ShieldCheck size={12} /> Demo environment · Virtual funds
                  only
                </span>
              </footer>
              <div className="risk-footer">
                Leveraged forex trading carries significant risk. Practice
                results do not predict real performance. CYPHERFX is in
                development and is not accepting customer funds.
              </div>
            </>
          )}
        </main>
      </div>
      {mobile && (
        <button
          className="mobile-overlay"
          aria-label="Close menu"
          onClick={() => setMobile(false)}
        />
      )}
      {toast && (
        <div
          className={"toast " + (toast.error ? "toast-error" : "")}
          role="status"
        >
          {toast.error ? <CircleHelp size={18} /> : <CheckCheck size={18} />}
          <span>{toast.text}</span>
          <button title="Dismiss" onClick={() => setToast(null)}>
            <X size={15} />
          </button>
        </div>
      )}
      {modal && (
        <div className="modal-backdrop" onClick={() => setModal(null)}>
          <section
            className={"modal " + (modal === "search" ? "search-modal" : "")}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close icon-button"
              title="Close dialog"
              onClick={() => setModal(null)}
              autoFocus
            >
              <X size={19} />
            </button>
            {(modal === "deposit" || modal === "withdraw") && (
              <>
                <span className="modal-icon">
                  {modal === "deposit" ? (
                    <ArrowDownToLine size={25} />
                  ) : (
                    <ArrowUpFromLine size={25} />
                  )}
                </span>
                <div className="eyebrow">REAL-MONEY WALLET · KES</div>
                <h2 id="modal-title">
                  {modal === "deposit"
                    ? "Deposit with M-Pesa"
                    : "Request a withdrawal"}
                </h2>
                <p>
                  {modal === "deposit"
                    ? "An STK prompt is only the start. Funds are credited only after independent provider verification."
                    : "Your funds are reserved first. A Super Admin must explicitly approve before any payout can be initiated."}
                </p>
                <div className="notice amber-notice small">
                  <LockKeyhole size={17} />
                  <span>
                    {modal === "deposit"
                      ? "Payments are not enabled in this environment. No M-Pesa prompt will be sent."
                      : "Real-money withdrawals are currently disabled. No payout will be initiated."}
                  </span>
                </div>
                <form onSubmit={onTransfer}>
                  <label>
                    Amount (KSh)
                    <input
                      autoComplete="off"
                      type="number"
                      name="amount"
                      min="100"
                      max="250000"
                      step="1"
                      placeholder="1,000"
                      required
                    />
                  </label>
                  <label>
                    M-Pesa phone number
                    <input
                      name="phone"
                      type="tel"
                      placeholder="0712 345 678"
                      pattern="(0|254)[17][0-9]{8}"
                      required
                    />
                  </label>
                  <div className="form-hint">
                    <ShieldCheck size={13} /> Never share your M-Pesa PIN with
                    CYPHERFX.
                  </div>
                  <button disabled={busy} className="button primary full">
                    {busy ? (
                      <Loader2 className="spin" size={16} />
                    ) : (
                      <LockKeyhole size={16} />
                    )}{" "}
                    {modal === "deposit"
                      ? "Check deposit eligibility"
                      : "Check withdrawal eligibility"}
                  </button>
                </form>
                <div className="modal-footnote">
                  {modal === "withdraw"
                    ? "Request → Super Admin review → Approved payout → Provider confirmation"
                    : "Request → Phone confirmation → Provider verification → Wallet credit"}
                </div>
              </>
            )}
            {modal === "search" && (
              <>
                <h2 id="modal-title">Find your market</h2>
                <div className="search-input">
                  <Search size={19} />
                  <input
                    placeholder="Search currency pairs…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="eyebrow">FOREX INSTRUMENTS · PRACTICE</div>
                {instruments
                  .filter((i) =>
                    (i.symbol + i.name)
                      .toLowerCase()
                      .includes(search.toLowerCase().replace("/", "_")),
                  )
                  .map((i) => (
                    <button
                      className="search-result"
                      key={i.symbol}
                      onClick={() => {
                        setSymbol(i.symbol);
                        navigate("Trading terminal");
                        setModal(null);
                        setSearch("");
                      }}
                    >
                      <Flags symbol={i.symbol} />
                      <span>
                        <strong>{i.symbol.replace("_", "/")}</strong>
                        <small>{i.name}</small>
                      </span>
                      <ArrowUpRight size={15} />
                    </button>
                  ))}
                <p className="small-text">
                  Instrument availability in live trading is subject to the
                  connected provider.
                </p>
              </>
            )}
            {modal === "notifications" && (
              <>
                <span className="modal-icon">
                  <Bell size={24} />
                </span>
                <h2 id="modal-title">Your notifications</h2>
                <p>Important updates, without the noise.</p>
                {state?.notifications.length ? (
                  state.notifications.map((n) => (
                    <article className="notification" key={n.id}>
                      <CheckCheck size={18} />
                      <div>
                        <strong>{n.title}</strong>
                        <p>{n.body}</p>
                        <small>{new Date(n.created_at).toLocaleString()}</small>
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="empty-state">
                    <span className="empty-icon">
                      <CheckCheck size={23} />
                    </span>
                    <strong>You're all caught up</strong>
                    <p>
                      Account, payment and security updates will appear here.
                    </p>
                  </div>
                )}
              </>
            )}
            {modal === "account" && (
              <>
                <div className="account-modal-heading">
                  <span className="avatar large">
                    {state?.user.name
                      .split(" ")
                      .map((s: string) => s[0])
                      .slice(0, 2)
                      .join("") ?? "CX"}
                  </span>
                  <div>
                    <h2 id="modal-title">
                      {state?.user.name ?? "Your account"}
                    </h2>
                    <p>{state?.user.email}</p>
                  </div>
                </div>
                <div className="account-details">
                  <span>
                    Account mode{" "}
                    <b>
                      {virtual
                        ? "Demo · virtual funds"
                        : "Real · services disabled"}
                    </b>
                  </span>
                  <span>
                    Identity verification{" "}
                    <b>{state?.user.kycStatus ?? "Unverified"}</b>
                  </span>
                  <span>
                    Account status <b>{state?.user.status}</b>
                  </span>
                  <span>
                    Local display time <b>Africa/Nairobi</b>
                  </span>
                </div>
                <button
                  className="button secondary full"
                  onClick={() => {
                    navigate("Settings");
                    setModal(null);
                  }}
                >
                  <Settings size={16} /> Profile & security
                </button>
                <button
                  className="button primary full spaced"
                  onClick={() => {
                    setAuthTab("register");
                    setModal("auth");
                  }}
                >
                  Create your personal account <ArrowUpRight size={15} />
                </button>
                <button
                  className="text-link spaced"
                  onClick={() => {
                    setAuthTab("login");
                    setModal("auth");
                  }}
                >
                  Already registered? Sign in
                </button>
                <button
                  className="button secondary full spaced"
                  onClick={async () => {
                    await api("auth/logout", {});
                    setState(null);
                    setModal(null);
                    setBootError("You have signed out securely.");
                  }}
                >
                  <LogOut size={15} /> Sign out
                </button>
              </>
            )}
            {modal === "reset" && (
              <>
                <span className="modal-icon">
                  <RefreshCw size={24} />
                </span>
                <h2 id="modal-title">A fresh start?</h2>
                <p>
                  Reset your practice balance to{" "}
                  {usd(state?.demo.initial_balance)}. Your trading history stays
                  intact, pending orders are cancelled, and your real-money
                  wallet is never affected.
                </p>
                <div className="notice small">
                  <ShieldCheck size={18} />
                  <span>
                    Close open positions first. Resets are limited to once per
                    hour.
                  </span>
                </div>
                <button
                  className="button primary full"
                  disabled={busy}
                  onClick={async () => {
                    const r = await action(
                      () => api("demo/reset", {}),
                      "Virtual balance reset. Your real wallet is unchanged.",
                    );
                    if (r) setModal(null);
                  }}
                >
                  <RefreshCw size={15} /> Reset virtual balance
                </button>
              </>
            )}
            {modal === "auth" && (
              <>
                <Brand />
                <h2 className="auth-title" id="modal-title">
                  {authTab === "login"
                    ? "Welcome to your next move."
                    : authTab === "register"
                      ? "Your edge starts here."
                      : authTab === "forgot"
                        ? "Let’s get you back in."
                        : "Choose a new password."}
                </h2>
                <p>
                  {authTab === "register"
                    ? "Create your account. Start with risk-free practice."
                    : authTab === "login"
                      ? "Sign in to your personal trading workspace."
                      : "Secure access to your CYPHERFX account."}
                </p>
                <form onSubmit={authSubmit}>
                  {authTab === "register" && (
                    <label>
                      Full name
                      <input
                        name="name"
                        required
                        minLength={2}
                        autoComplete="name"
                      />
                    </label>
                  )}
                  {authTab !== "reset" && (
                    <label>
                      Email address
                      <input
                        type="email"
                        name="email"
                        required
                        autoComplete="email"
                      />
                    </label>
                  )}
                  {authTab !== "forgot" && (
                    <label>
                      Password
                      <input
                        name="password"
                        type="password"
                        required
                        minLength={authTab === "login" ? 1 : 12}
                        autoComplete={
                          authTab === "login"
                            ? "current-password"
                            : "new-password"
                        }
                      />
                      {authTab !== "login" && (
                        <small>At least 12 characters.</small>
                      )}
                    </label>
                  )}
                  {authTab === "register" && (
                    <label className="checkbox-label">
                      <input type="checkbox" name="risk" required />
                      <span>
                        I understand leveraged forex carries significant risk.
                        Demo trading uses virtual funds and is not indicative of
                        real returns.
                      </span>
                    </label>
                  )}
                  <button className="button primary full" disabled={busy}>
                    {busy ? (
                      <Loader2 className="spin" size={16} />
                    ) : (
                      <ArrowRight size={16} />
                    )}{" "}
                    {authTab === "login"
                      ? "Sign in"
                      : authTab === "register"
                        ? "Create account"
                        : authTab === "forgot"
                          ? "Send reset link"
                          : "Update password"}
                  </button>
                </form>
                <div className="auth-links">
                  <button
                    className="text-link"
                    onClick={() =>
                      setAuthTab(authTab === "register" ? "login" : "register")
                    }
                  >
                    {authTab === "register"
                      ? "Already a member? Sign in"
                      : "New here? Create an account"}
                  </button>
                  {authTab === "login" && (
                    <button
                      className="text-link subtle"
                      onClick={() => setAuthTab("forgot")}
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
              </>
            )}
            {modal === "review" && review && (
              <>
                <span className="modal-icon">
                  <ShieldCheck size={25} />
                </span>
                <h2 id="modal-title">Review withdrawal</h2>
                <p>
                  Approval authorizes a payout attempt. It does not confirm
                  payment.
                </p>
                <div className="account-details">
                  <span>
                    Customer <b>{review.name}</b>
                  </span>
                  <span>
                    Amount <b>{kes(review.amount)}</b>
                  </span>
                  <span>
                    Destination <b>{review.phone}</b>
                  </span>
                  <span>
                    Account / KYC{" "}
                    <b>
                      {review.account_status} / {review.kyc_status}
                    </b>
                  </span>
                </div>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    const r = await action(
                      () =>
                        api("admin/withdrawals/review", {
                          id: review.id,
                          decision: f.get("decision"),
                          reason: f.get("reason"),
                          password: f.get("password"),
                          otp: f.get("otp"),
                        }),
                      "Decision recorded in the immutable audit trail",
                    );
                    if (r) {
                      setModal(null);
                      setAdmin(await api("admin/overview"));
                    }
                  }}
                >
                  <label>
                    Decision
                    <select name="decision">
                      <option value="APPROVE">
                        Approve · await authorized payout
                      </option>
                      <option value="REJECT">
                        Reject · release reserved funds
                      </option>
                    </select>
                  </label>
                  <label>
                    Review reason (required for rejection)
                    <textarea name="reason" minLength={5} required rows={2} />
                  </label>
                  <label>
                    Confirm password
                    <input
                      name="password"
                      type="password"
                      required
                      autoComplete="current-password"
                    />
                  </label>
                  <label>
                    MFA code
                    <input
                      name="otp"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      required
                      inputMode="numeric"
                      autoComplete="one-time-code"
                    />
                  </label>
                  <button className="button primary full" disabled={busy}>
                    <ShieldCheck size={16} /> Confirm financial decision
                  </button>
                </form>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
