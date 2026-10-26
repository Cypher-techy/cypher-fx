"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  Loader2,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import { WebBrand } from "./website";
import "./website.css";
type Mode = "login" | "register" | "forgot" | "reset" | "verify";
const titles: Record<Mode, string> = {
  login: "Welcome back.",
  register: "Your edge starts here.",
  forgot: "Let’s get you back in.",
  reset: "A fresh start, securely.",
  verify: "Verify your email.",
};
export default function WebsiteAuth({ mode }: { mode: Mode }) {
  const router = useRouter(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [devLink, setDevLink] = useState(""),
    once = useRef(false);
  const send = async (path: string, body: unknown) => {
    const r = await fetch("/api/" + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const d = await r.json();
    if (!r.ok)
      throw new Error(d.error?.message ?? "Unable to complete this request");
    return d.data;
  };
  useEffect(() => {
    if (mode !== "verify" || once.current) return;
    once.current = true;
    const token = new URLSearchParams(location.search).get("token");
    if (!token) {
      setError("This verification link is missing its token.");
      return;
    }
    setBusy(true);
    send("auth/verify", { token })
      .then((d) => setMessage(d.message))
      .catch((e) => setError(e.message))
      .finally(() => setBusy(false));
  }, [mode]);
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    setMessage("");
    setDevLink("");
    try {
      const d = await send("auth/" + mode, {
        name: f.get("name"),
        email: f.get("email"),
        password: f.get("password"),
        riskAccepted: f.get("risk") === "on",
        token: new URLSearchParams(location.search).get("token"),
      });
      if (mode === "login") {
        router.push("/dashboard");
        router.refresh();
      } else {
        setMessage(d.message ?? "Your account has been created.");
        if (d.developmentLink) setDevLink(d.developmentLink);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="web-site web-auth">
      <aside className="web-auth-aside">
        <WebBrand />
        <div className="web-auth-message">
          <span className="web-eyebrow">A NEW PERSPECTIVE STARTS HERE</span>
          <h1>
            Your ambition.
            <br />
            <span>
              A world of
              <br />
              opportunity.
            </span>
          </h1>
          <p>
            A focused place to learn the markets,
            <br />
            build your confidence and find your edge.
          </p>
          <div>
            <ShieldCheck size={17} />
            Separate virtual funds. Clear account boundaries.
          </div>
        </div>
        <p className="web-auth-disclosure">
          DEVELOPMENT PREVIEW · No live trading or customer-money services.
          Registering does not create an approved live brokerage account.
        </p>
        <span className="web-auth-star">✳</span>
      </aside>
      <main className="web-main web-auth-content">
        <div className="web-auth-form">
          <Link className="web-auth-home" href="/">
            <ArrowLeft size={13} />
            Back to CYPHERFX
          </Link>
          <h2>{titles[mode]}</h2>
          <p>
            {mode === "register"
              ? "Create your profile and explore the practice workspace. Real-money services remain unavailable."
              : mode === "login"
                ? "Sign in to your secure trading workspace."
                : mode === "forgot"
                  ? "Enter your registered email address to request a secure password reset link."
                  : mode === "reset"
                    ? "Choose a new password with at least 12 characters. Existing sessions will be revoked."
                    : "We’ll confirm your email using the secure link you received."}
          </p>
          {error && (
            <div className="web-auth-error" role="alert">
              {error}
            </div>
          )}
          {message && (
            <div className="web-auth-success" role="status">
              {message}
              {devLink && (
                <>
                  <br />
                  <strong>Development email preview</strong>
                  <a href={devLink}>
                    {mode === "forgot"
                      ? "Open secure password reset link"
                      : "Verify your email address"}{" "}
                    <ArrowUpRight size={11} />
                  </a>
                  <small>
                    This link is shown only in development, not as evidence of a
                    delivered email.
                  </small>
                </>
              )}
              {mode === "register" && (
                <Link href="/dashboard">
                  Continue to your practice workspace <ArrowRight size={11} />
                </Link>
              )}
              {mode === "reset" && (
                <Link href="/login">
                  Sign in with your new password <ArrowRight size={11} />
                </Link>
              )}
            </div>
          )}
          {mode === "verify" ? (
            <>
              {busy && (
                <div className="web-auth-success">
                  <Loader2 size={17} className="spin" /> Confirming your email…
                </div>
              )}
              <Link className="web-btn web-btn-dark" href="/dashboard">
                Go to your workspace <ArrowRight size={14} />
              </Link>
            </>
          ) : (
            <form onSubmit={submit}>
              {mode === "register" && (
                <label>
                  Full name
                  <input
                    name="name"
                    type="text"
                    placeholder="Your full name"
                    autoComplete="name"
                    minLength={2}
                    maxLength={80}
                    required
                  />
                </label>
              )}
              {mode !== "reset" && (
                <label>
                  Email address
                  <input
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                  />
                </label>
              )}
              {mode !== "forgot" && (
                <label>
                  <span className="web-password-label">
                    Password
                    {mode === "login" && (
                      <Link href="/forgot-password">Forgot password?</Link>
                    )}
                  </span>
                  <input
                    name="password"
                    aria-label="Password"
                    type="password"
                    placeholder={
                      mode === "login"
                        ? "Enter your password"
                        : "At least 12 characters"
                    }
                    autoComplete={
                      mode === "login" ? "current-password" : "new-password"
                    }
                    minLength={mode === "login" ? 1 : 12}
                    maxLength={128}
                    required
                  />
                  {mode === "register" && (
                    <small>
                      Use a long, unique password you don’t use elsewhere.
                    </small>
                  )}
                </label>
              )}
              {mode === "register" && (
                <label className="web-auth-checkbox">
                  <input name="risk" type="checkbox" required />
                  <span>
                    I have read the{" "}
                    <Link href="/#risk-disclosure" target="_blank">
                      risk disclosure
                    </Link>
                    . I understand this is a development platform, practice
                    funds are virtual, and live trading is not available.
                  </span>
                </label>
              )}
              <button
                type="submit"
                className="web-btn web-btn-dark"
                disabled={busy}
              >
                {busy ? <Loader2 className="spin" size={15} /> : null}
                {mode === "login"
                  ? "Sign in to your account"
                  : mode === "register"
                    ? "Create your profile"
                    : mode === "forgot"
                      ? "Send reset link"
                      : "Update password"}
                <ArrowRight size={14} />
              </button>
            </form>
          )}
          {mode !== "verify" && (
            <div className="web-auth-switch">
              {mode === "register" ? "Already registered?" : "New to CYPHERFX?"}
              <Link href={mode === "register" ? "/login" : "/register"}>
                {mode === "register" ? "Sign in" : "Create an account"}
              </Link>
            </div>
          )}
          {mode === "login" && (
            <>
              <div className="web-auth-or">JUST LOOKING AROUND?</div>
              <Link className="web-btn web-btn-outline" href="/dashboard">
                Explore the demo workspace <ArrowUpRight size={14} />
              </Link>
            </>
          )}
          <span className="web-auth-security">
            <LockKeyhole size={11} />
            Protected sessions · Virtual practice funds only
          </span>
        </div>
      </main>
    </div>
  );
}
