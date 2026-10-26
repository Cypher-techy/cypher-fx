"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, ArrowUpRight, RefreshCw } from "lucide-react";
import { WebBrand } from "./website";
import "./website.css";
export default function WebsiteStatus() {
  const [health, setHealth] = useState<Record<string, unknown> | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/health", { cache: "no-store" });
      if (!r.ok) throw new Error("Status service is unavailable");
      const d = await r.json();
      setHealth(d.data);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  return (
    <div className="web-site">
      <header className="web-header">
        <div className="web-container web-header-inner">
          <WebBrand />
          <Link
            href="/"
            className="web-text-link"
            style={{ marginLeft: "auto" }}
          >
            <ArrowLeft size={13} />
            Back to website
          </Link>
        </div>
      </header>
      <main className="web-main">
        <div className="web-container web-status-main">
          <div className="web-status-heading">
            <div>
              <span className="web-eyebrow">TRANSPARENCY, BY DESIGN</span>
              <h1>Platform status</h1>
              <p>
                What’s available — and what isn’t — in this development release.
              </p>
            </div>
            <button
              className="web-btn web-btn-outline"
              onClick={() => void load()}
              disabled={loading}
            >
              <RefreshCw size={13} className={loading ? "spin" : ""} />
              Refresh
            </button>
          </div>
          {error && (
            <div role="alert" className="web-auth-error">
              {error}
            </div>
          )}
          <div className="web-status-grid">
            {[
              {
                title: "Website & account access",
                status: health
                  ? "RESPONDING"
                  : loading
                    ? "CHECKING"
                    : "UNAVAILABLE",
                text: "Public website, registration, login and the practice workspace are served by the development application. Health response is not an independent database or provider availability check.",
              },
              {
                title: "Live forex execution",
                status: "NOT AVAILABLE",
                text: "No authorized execution provider is connected. No real orders are accepted or executed.",
              },
              {
                title: "M-Pesa deposits",
                status:
                  health?.payments === "sandbox-configured"
                    ? "SANDBOX CONFIGURED"
                    : "NOT CONFIGURED",
                text: "Customer-money deposits are disabled. An approved receipt verification integration and provider/regulatory approvals are still required.",
              },
              {
                title: "Withdrawals & payouts",
                status: "NOT AVAILABLE",
                text: "No real payout provider is connected. Every future payout must follow explicit Super Admin approval and independently verified payment confirmation.",
              },
              {
                title: "Market data",
                status: "PRACTICE DEFAULT",
                text: "Default charts use explicitly labeled synthetic practice data. Genuine feed configuration, entitlement and licensing must be independently validated.",
              },
              {
                title: "Environment",
                status: health ? String(health.mode).toUpperCase() : "CHECKING",
                text: "This is a development preview, not an authorized live brokerage or production service.",
              },
            ].map((x) => (
              <section className="web-status-card" key={x.title}>
                <div>
                  <h2>{x.title}</h2>
                  <span>{x.status}</span>
                </div>
                <p>{x.text}</p>
              </section>
            ))}
          </div>
          <div className="web-status-notice">
            This page reports configuration, not financial completion or
            regulatory authorization. It must never be treated as proof of a
            successful deposit, executed trade or paid withdrawal.
          </div>
          <Link
            href="/register"
            className="web-text-link"
            style={{ marginTop: 27 }}
          >
            Create a profile and explore practice trading{" "}
            <ArrowUpRight size={14} />
          </Link>
        </div>
      </main>
    </div>
  );
}
