"use client";
import { useState, type FormEvent } from "react";
import {
  ArrowRight,
  Calculator,
  Info,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { browserPairs } from "./market-explorer";
type Estimate = {
  marginUSD: string;
  pipValueUSD: string;
  units: string;
  referencePrice: string;
  source: string;
  referenceAt: string;
  disclaimer: string;
};
export default function TradeCalculator() {
  const [symbol, setSymbol] = useState("EUR_USD"),
    [lots, setLots] = useState("0.10"),
    [leverage, setLeverage] = useState(100),
    [estimate, setEstimate] = useState<Estimate | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [estimateKey, setEstimateKey] = useState("");
  const key = symbol + ":" + lots + ":" + leverage,
    valid = estimateKey === key;
  const calculate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/public/calculator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol, lots, leverage }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error?.message ?? "Unable to calculate");
      setEstimate(d.data);
      setEstimateKey(key);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="web-calculator-section" id="tools">
      <div className="web-container web-calculator-grid">
        <div className="web-calculator-copy">
          <span className="web-eyebrow">A LITTLE PLANNING GOES A LONG WAY</span>
          <h2>
            Know the numbers.
            <br />
            Before your next move.
          </h2>
          <p>
            Explore how position size and leverage affect a hypothetical trade.
            Adjust the inputs and get a server-calculated estimate.
          </p>
          <div>
            <ShieldCheck size={17} />
            <span>
              Educational tool only. No order is placed.
              <br />
              Your account and wallet are never changed.
            </span>
          </div>
        </div>
        <div className="web-calculator">
          <div className="wc-heading">
            <span>
              <Calculator size={16} />
              Margin & pip calculator
            </span>
            <span>SYNTHETIC REFERENCE</span>
          </div>
          <form onSubmit={calculate}>
            <div className="wc-inputs">
              <label>
                Instrument
                <select
                  aria-label="Calculator instrument"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                >
                  {browserPairs.map((p) => (
                    <option key={p.symbol} value={p.symbol}>
                      {p.symbol.replace("_", "/")}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Volume (lots)
                <input
                  aria-label="Calculator volume in lots"
                  type="number"
                  step=".01"
                  min=".01"
                  max="100"
                  value={lots}
                  onChange={(e) => setLots(e.target.value)}
                  required
                />
              </label>
              <label>
                Leverage
                <select
                  aria-label="Calculator leverage"
                  value={leverage}
                  onChange={(e) => setLeverage(+e.target.value)}
                >
                  {[10, 30, 50, 100].map((v) => (
                    <option value={v} key={v}>
                      1:{v}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <button className="web-btn web-btn-dark" disabled={busy}>
              {busy ? (
                <Loader2 size={13} className="spin" />
              ) : (
                <Calculator size={13} />
              )}
              Calculate estimate <ArrowRight size={13} />
            </button>
          </form>
          {error && (
            <p role="alert" className="wc-error">
              {error}
            </p>
          )}
          <div
            className={"wc-results " + (!valid ? "outdated" : "")}
            aria-live="polite"
          >
            <div>
              <span>Estimated margin</span>
              <strong data-testid="estimated-margin">
                {valid && estimate ? "$" + estimate.marginUSD : "—"}
              </strong>
              <small>USD · hypothetical</small>
            </div>
            <div>
              <span>Pip value</span>
              <strong data-testid="estimated-pip">
                {valid && estimate ? "$" + estimate.pipValueUSD : "—"}
              </strong>
              <small>USD per pip · estimate</small>
            </div>
          </div>
          <div className="wc-footnote">
            <Info size={12} />
            <p>
              {valid && estimate
                ? `Reference: ${estimate.referencePrice} · ${estimate.source}. ${estimate.disclaimer}`
                : "Choose your instrument, volume and leverage, then calculate. Results use synthetic replay prices, not current market prices or a live provider margin quote."}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
