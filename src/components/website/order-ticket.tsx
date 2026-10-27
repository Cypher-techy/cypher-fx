"use client";
import Link from "next/link";
import { createPortal } from "react-dom";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
  Info,
  Loader2,
  LockKeyhole,
  ShieldCheck,
  X,
} from "lucide-react";
import type { Quote } from "@/lib/providers/market";
import type { WebsiteContext } from "./use-context";
class RequestError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
async function request(path: string, body?: unknown) {
  const r = await fetch("/api/" + path, {
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const d = await r.json();
  if (!r.ok)
    throw new RequestError(
      r.status,
      d.error?.message ?? "Request could not be completed",
    );
  return d.data;
}
type Prepared = {
  quote: Quote;
  balance: string;
  symbol: string;
  side: "BUY" | "SELL";
  lots: string;
  stopLoss?: string;
  takeProfit?: string;
  key: string;
};
export default function OrderTicket({
  context,
  onReview,
}: {
  context: WebsiteContext;
  onReview: () => void;
}) {
  const { symbol } = context;
  const [account, setAccount] = useState<"demo" | "real">("demo"),
    [side, setSide] = useState<"BUY" | "SELL">("BUY"),
    [lots, setLots] = useState("0.10"),
    [risk, setRisk] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [prepared, setPrepared] = useState<Prepared | null>(null),
    [success, setSuccess] = useState<{
      id: string;
      price: string;
      symbol: string;
    } | null>(null);
  const reviewRef = useRef<HTMLButtonElement>(null),
    busyRef = useRef(busy),
    modalRef = useRef<HTMLDivElement>(null),
    closeRef = useRef<HTMLButtonElement>(null);
  busyRef.current = busy;
  useEffect(() => {
    if (!prepared) return;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busyRef.current) setPrepared(null);
      if (e.key === "Tab") {
        const all = Array.from(
          modalRef.current?.querySelectorAll<HTMLElement>(
            "button:not(:disabled),a[href]",
          ) ?? [],
        );
        if (e.shiftKey && document.activeElement === all[0]) {
          e.preventDefault();
          all.at(-1)?.focus();
        } else if (!e.shiftKey && document.activeElement === all.at(-1)) {
          e.preventDefault();
          all[0]?.focus();
        }
      }
    };
    document.addEventListener("keydown", handle);
    return () => {
      document.removeEventListener("keydown", handle);
      document.body.style.overflow = oldOverflow;
      requestAnimationFrame(() => reviewRef.current?.focus());
    };
  }, [prepared]);
  const prepare = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (account === "real") return;
    onReview();
    setBusy(true);
    setError("");
    setSuccess(null);
    const f = new FormData(e.currentTarget);
    try {
      let state;
      try {
        state = await request("state");
      } catch (e) {
        if (!(e instanceof RequestError && e.status === 401)) throw e;
        await request("auth/guest", {});
        state = await request("state");
      }
      const market = await request(`market?symbol=${symbol}&timeframe=1h`);
      if (market.status === "STALE")
        throw new Error(
          "Practice execution quote is stale. Please try again later.",
        );
      setPrepared({
        quote: market.quote,
        balance: state.demo.balance,
        symbol,
        side,
        lots,
        stopLoss: risk
          ? String(f.get("stopLoss") || "") || undefined
          : undefined,
        takeProfit: risk
          ? String(f.get("takeProfit") || "") || undefined
          : undefined,
        key: crypto.randomUUID(),
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const confirm = async () => {
    if (!prepared) return;
    setBusy(true);
    setError("");
    try {
      const result = await request("demo/orders", {
        symbol: prepared.symbol,
        side: prepared.side,
        type: "MARKET",
        lots: prepared.lots,
        stopLoss: prepared.stopLoss,
        takeProfit: prepared.takeProfit,
        key: prepared.key,
      });
      const state = await request("state");
      const order = state.orders.find(
        (o: { id: string }) => o.id === result.id,
      );
      setSuccess({
        id: result.id,
        price: order?.entry_price ?? "Recorded in your account",
        symbol: prepared.symbol,
      });
      setPrepared(null);
      context.setSession({
        name: state.user.name,
        practice: state.user.email.endsWith("@local.invalid"),
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <aside className="cx-ticket" id="practice-order">
      <div className="cx-ticket-heading">
        <h2>Make your next move.</h2>
        <span>ORDER PANEL</span>
      </div>
      <div
        className="cx-account-toggle"
        role="tablist"
        aria-label="Trading account mode"
      >
        <button
          role="tab"
          aria-selected={account === "demo"}
          onClick={() => {
            setAccount("demo");
            setError("");
          }}
        >
          Demo account<span>Virtual USD</span>
        </button>
        <button
          role="tab"
          aria-selected={account === "real"}
          onClick={() => {
            setAccount("real");
            setError("");
          }}
        >
          Real account
          <LockKeyhole size={10} />
        </button>
      </div>
      {account === "real" ? (
        <div className="cx-real-unavailable">
          <span>
            <LockKeyhole size={25} />
          </span>
          <h3>Live trading unavailable.</h3>
          <p>
            Real orders and payments remain disabled until the required provider
            and regulatory approvals are in place.
          </p>
          <Link href="/accounts">
            View account requirements <ArrowUpRight size={12} />
          </Link>
          <button
            className="cx-ticket-submit"
            onClick={() => setAccount("demo")}
          >
            Switch to demo <ArrowRight size={14} />
          </button>
        </div>
      ) : (
        <form onSubmit={prepare}>
          <div className="cx-order-pair">
            <span>{symbol.replace("_", "/")}</span>
            <span>Market order</span>
          </div>
          <div className="cx-side-toggle">
            <button
              type="button"
              className={side === "BUY" ? "buy selected" : "buy"}
              aria-pressed={side === "BUY"}
              onClick={() => setSide("BUY")}
            >
              Buy <ArrowUpRight size={13} />
            </button>
            <button
              type="button"
              className={side === "SELL" ? "sell selected" : "sell"}
              aria-pressed={side === "SELL"}
              onClick={() => setSide("SELL")}
            >
              Sell <ArrowUpRight size={13} />
            </button>
          </div>
          <label className="cx-lots-label">
            Volume <span>1 lot = 100,000 units</span>
            <div className="cx-lots-control">
              <button
                type="button"
                aria-label="Decrease trade volume"
                onClick={() =>
                  setLots(Math.max(0.01, Number(lots) - 0.01).toFixed(2))
                }
              >
                −
              </button>
              <input
                aria-label="Trade volume in lots"
                type="number"
                min=".01"
                max="10"
                step=".01"
                value={lots}
                onChange={(e) => setLots(e.target.value)}
                required
              />
              <span>lots</span>
              <button
                type="button"
                aria-label="Increase trade volume"
                onClick={() =>
                  setLots(Math.min(10, Number(lots) + 0.01).toFixed(2))
                }
              >
                +
              </button>
            </div>
          </label>
          <div className="cx-volume-presets" aria-label="Volume presets">
            {["0.01", "0.10", "0.50", "1.00"].map((v) => (
              <button
                type="button"
                key={v}
                className={lots === v ? "active" : ""}
                aria-pressed={lots === v}
                onClick={() => setLots(v)}
              >
                {v}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="cx-risk-toggle"
            aria-expanded={risk}
            onClick={() => setRisk(!risk)}
          >
            <ShieldCheck size={12} /> Stop loss & take profit{" "}
            <span>Optional</span>
            <ChevronDown
              size={12}
              style={{ transform: risk ? "rotate(180deg)" : "none" }}
            />
          </button>
          {risk && (
            <div className="cx-risk-inputs">
              <label>
                Stop loss
                <input
                  name="stopLoss"
                  aria-label="Order stop loss"
                  type="number"
                  min=".00001"
                  step="any"
                  placeholder="Price"
                />
              </label>
              <label>
                Take profit
                <input
                  name="takeProfit"
                  aria-label="Order take profit"
                  type="number"
                  min=".00001"
                  step="any"
                  placeholder="Price"
                />
              </label>
            </div>
          )}
          <button ref={reviewRef} className="cx-ticket-submit" disabled={busy}>
            {busy ? <Loader2 size={14} className="spin" /> : null}Review demo
            order <ArrowRight size={14} />
          </button>
          <p className="cx-ticket-disclaimer">
            <Info size={11} />
            Simulated execution. Quote reviewed before confirmation.
          </p>
          {error && !prepared && (
            <p role="alert" className="cx-order-error">
              {error}
              <Link href="/login">Sign in to your account ↗</Link>
            </p>
          )}
          {success && (
            <div className="cx-order-success" role="status">
              <CheckCircle2 size={16} />
              <div>
                <strong>Practice order filled at {success.price}.</strong>
                <Link
                  href={
                    "/dashboard?symbol=" + success.symbol + "&view=terminal"
                  }
                >
                  View your position <ArrowUpRight size={11} />
                </Link>
              </div>
            </div>
          )}
        </form>
      )}
      <div className="cx-ticket-bottom">
        <ShieldCheck size={13} />
        <span>Practice funds stay separate from your real wallet.</span>
      </div>
      {prepared &&
        createPortal(
          <div
            className="cx-confirm-overlay"
            onClick={() => {
              if (!busy) setPrepared(null);
            }}
          >
            <div
              className="cx-confirm-modal"
              ref={modalRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="confirm-title"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                ref={closeRef}
                className="cx-confirm-close"
                aria-label="Close order review"
                disabled={busy}
                onClick={() => setPrepared(null)}
              >
                <X size={20} />
              </button>
              <span className="cx-confirm-icon">
                <ShieldCheck size={25} />
              </span>
              <span className="cx-kicker">VIRTUAL FUNDS ONLY</span>
              <h2 id="confirm-title">Review your practice order.</h2>
              <p>This is a simulated trade, not a real-money order.</p>
              <dl>
                <div>
                  <dt>Instrument / side</dt>
                  <dd>
                    {prepared.symbol.replace("_", "/")} · {prepared.side}
                  </dd>
                </div>
                <div>
                  <dt>Volume</dt>
                  <dd>{prepared.lots} lots</dd>
                </div>
                <div>
                  <dt>Practice execution quote</dt>
                  <dd>
                    {prepared.side === "BUY"
                      ? prepared.quote.ask
                      : prepared.quote.bid}
                  </dd>
                </div>
                <div>
                  <dt>Your virtual balance</dt>
                  <dd>
                    $
                    {Number(prepared.balance).toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                    })}
                  </dd>
                </div>
                <div>
                  <dt>Source</dt>
                  <dd>
                    {prepared.quote.synthetic
                      ? "Synthetic practice feed"
                      : prepared.quote.source + " · practice execution"}
                  </dd>
                </div>
              </dl>
              <p className="cx-confirm-note">
                The execution quote comes from the practice engine, not the
                homepage replay. The server rechecks the price, margin and risk
                levels when you confirm.
              </p>
              {error && (
                <p role="alert" className="cx-order-error">
                  {error}
                </p>
              )}
              <button
                className={"cx-ticket-submit " + prepared.side.toLowerCase()}
                disabled={busy}
                onClick={() => void confirm()}
              >
                {busy ? (
                  <Loader2 size={14} className="spin" />
                ) : (
                  <ShieldCheck size={14} />
                )}
                Confirm practice {prepared.side.toLowerCase()}
                <ArrowRight size={14} />
              </button>
              <button
                className="cx-confirm-cancel"
                disabled={busy}
                onClick={() => setPrepared(null)}
              >
                Keep exploring
              </button>
            </div>
          </div>,
          document.body,
        )}
    </aside>
  );
}
