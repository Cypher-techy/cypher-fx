"use client";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { ArrowRight, ArrowUpRight, Menu, X } from "lucide-react";
import { WebBrand } from "./brand";
import type { WebsiteContext } from "./use-context";
import "../website.css";
import "./landing.css";
export function PublicHeader({
  session,
  active = "",
}: {
  session: WebsiteContext["session"];
  active?: string;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        menuRef.current?.focus();
      }
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [open]);
  const links = [
    ["/", "Trade"],
    ["/markets", "Markets"],
    ["/accounts", "Accounts"],
    ["/tools", "Tools"],
    ["/help", "Help"],
  ];
  return (
    <header className="cx-header">
      <div className="cx-width cx-header-inner">
        <WebBrand />
        <nav
          className={open ? "cx-nav is-open" : "cx-nav"}
          aria-label="Website navigation"
        >
          {links.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className={active === href ? "active" : ""}
              onClick={() => setOpen(false)}
            >
              {label}
              {active === href && <i />}
            </Link>
          ))}
        </nav>
        <div className="cx-header-actions">
          <Link className="cx-login" href={session ? "/dashboard" : "/login"}>
            {session
              ? session.practice
                ? "Practice account"
                : "Hi, " + session.name.split(" ")[0]
              : "Log in"}
            <ArrowUpRight size={12} />
          </Link>
          <Link
            className="cx-pill cx-pill-lime"
            href={session && !session.practice ? "/dashboard" : "/register"}
          >
            <span className="cx-pill-circle">
              <ArrowRight size={13} />
            </span>
            {session && !session.practice ? "My dashboard" : "Open an account"}
          </Link>
        </div>
        <button
          ref={menuRef}
          className="cx-menu"
          aria-label={open ? "Close navigation" : "Open navigation"}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
    </header>
  );
}
export function PublicFooter() {
  return (
    <footer className="cx-footer cx-width">
      <div>
        <span>© {new Date().getFullYear()} CYPHERFX</span>
        <span className="cx-footer-dot" />
        <span>Independent. Considered. Yours.</span>
      </div>
      <nav aria-label="Footer navigation">
        <Link href="/help#risk">Risk disclosure</Link>
        <Link href="/status">
          Platform status <ArrowUpRight size={10} />
        </Link>
        <Link href="/help">Support</Link>
      </nav>
    </footer>
  );
}
