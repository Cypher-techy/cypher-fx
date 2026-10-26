import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { database, rows, sql, id } from "@/db";
import {
  currentUser,
  authorize,
  realEligible,
  rateLimit,
  provision,
  openSession,
  issueToken,
  hash,
  audit,
  stepUp,
} from "@/lib/auth";
import { cookies } from "next/headers";
import { AppError, requireThat } from "@/lib/errors";
import { market, symbols, quote } from "@/lib/providers/market";
import { executionProvider } from "@/lib/providers/execution";
import { darajaConfigured, stkPush, queryStk } from "@/lib/providers/daraja";
import {
  reserveWithdrawal,
  reviewWithdrawal,
  reconciliation,
} from "@/lib/services/ledger";
import {
  submitDemo,
  closeDemo,
  syncDemo,
  pnl,
  margin,
} from "@/lib/services/demo";
import Decimal from "decimal.js";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const phone = z
  .string()
  .regex(/^254[17]\d{8}$/, "Use 2547XXXXXXXX or 2541XXXXXXXX");
const money = z
  .string()
  .regex(/^\d{1,9}(\.\d{1,2})?$/, "Enter a valid KSh amount")
  .transform((v) => BigInt(new Decimal(v).mul(100).toFixed(0)))
  .refine(
    (v) => v >= 10000n && v <= 25000000n,
    "Amount must be KSh 100–250,000",
  );
const financeRoles = ["SUPER_ADMIN", "FINANCE", "AUDITOR"];
const staffRoles = [
  "SUPER_ADMIN",
  "FINANCE",
  "SUPPORT",
  "COMPLIANCE",
  "TRADING_OPS",
  "AUDITOR",
  "HR",
];
async function emailToken(email: string, token: string, purpose: string) {
  const link = `${process.env.APP_BASE_URL ?? ""}/${purpose === "verify" ? "verify-email" : "reset-password"}?token=${token}`;
  if (process.env.RESEND_API_KEY && process.env.EMAIL_FROM) {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to: email,
        subject:
          purpose === "verify"
            ? "Verify your CYPHERFX email"
            : "Reset your CYPHERFX password",
        text: `Open this link within one hour: ${link}`,
      }),
    });
    requireThat(r.ok, 503, "Email provider unavailable");
  } else
    requireThat(
      process.env.NODE_ENV !== "production",
      503,
      "Email provider is not configured",
    );
  return process.env.NODE_ENV !== "production" ? { developmentLink: link } : {};
}
async function handler(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const { path } = await ctx.params;
  const route = path.join("/"),
    method = req.method;
  try {
    if (method !== "GET" && !route.startsWith("payments/callback")) {
      const origin = req.headers.get("origin");
      if (origin) {
        const host =
          req.headers.get("x-forwarded-host") ?? req.headers.get("host");
        requireThat(
          new URL(origin).host === host || origin === process.env.APP_BASE_URL,
          403,
          "Cross-origin request blocked",
        );
      }
      requireThat(
        req.headers.get("content-type")?.includes("application/json"),
        415,
        "JSON content type required",
      );
    }
    let body: Record<string, any> = {};
    if (method !== "GET") {
      const raw = await req.text();
      requireThat(raw.length <= 65536, 413, "Request body too large");
      try {
        body = JSON.parse(raw);
        requireThat(
          body && typeof body === "object" && !Array.isArray(body),
          400,
          "JSON object required",
        );
      } catch {
        throw new AppError(400, "Invalid JSON object");
      }
    }
    if (route.startsWith("auth/") && method === "POST")
      await rateLimit("auth-global", 500);
    if (route === "health")
      return NextResponse.json({
        ok: true,
        data: {
          service: "CYPHERFX",
          mode: process.env.DATABASE_URL
            ? "postgresql"
            : "embedded-local-postgres",
          liveTrading: false,
          payments: darajaConfigured()
            ? "sandbox-configured"
            : "not-configured",
        },
      });
    if (route === "auth/guest" && method === "POST") {
      requireThat(
        process.env.NODE_ENV !== "production" &&
          process.env.ALLOW_LOCAL_PRACTICE !== "false",
        403,
        "Local practice sessions are disabled",
      );
      await rateLimit("practice-session", 100);
      const uid = await provision(
        "Alex Morgan",
        `practice-${id()}@local.invalid`,
        id(),
        { status: "active" },
      );
      await openSession(uid);
      return NextResponse.json({ ok: true, data: { practice: true } });
    }
    if (route.startsWith("auth/")) {
      const email =
        typeof body.email === "string" ? body.email.toLowerCase().trim() : "";
      if (["auth/register", "auth/login", "auth/forgot"].includes(route))
        await rateLimit(
          route + ":" + hash(email),
          route === "auth/login" ? 10 : 5,
        );
      if (route === "auth/register" && method === "POST") {
        const v = z
          .object({
            name: z.string().trim().min(2).max(80),
            email: z.email(),
            password: z.string().min(12).max(128),
            riskAccepted: z.literal(true),
          })
          .parse({ ...body, email });
        const exists = await rows(
          sql`SELECT id FROM users WHERE email=${email}`,
        );
        requireThat(
          !exists.length,
          409,
          "Unable to register with these details",
        );
        const uid = await provision(v.name, v.email, v.password);
        await rows(
          sql`INSERT INTO compliance_records(id,user_id,kind,version) VALUES(${id()},${uid},'RISK_ACCEPTANCE','2026-01')`,
        );
        const token = await issueToken(uid, "verify");
        const delivery = await emailToken(v.email, token, "verify");
        await openSession(uid);
        return NextResponse.json({
          ok: true,
          data: {
            message:
              "Account created. Verify your email to continue onboarding.",
            ...delivery,
          },
        });
      }
      if (route === "auth/login" && method === "POST") {
        const v = z
          .object({ email: z.email(), password: z.string().max(128) })
          .parse({ ...body, email });
        const [u] = await rows<{
          id: string;
          password_hash: string;
          status: string;
        }>(sql`SELECT * FROM users WHERE email=${v.email}`);
        requireThat(
          u && (await bcrypt.compare(v.password, u.password_hash)),
          401,
          "Invalid email or password",
        );
        requireThat(
          !["closed", "suspended"].includes(u.status),
          403,
          "Account access is restricted",
        );
        await openSession(u.id);
        await audit(u.id, "security.login", u.id);
        return NextResponse.json({ ok: true, data: { message: "Signed in" } });
      }
      if (route === "auth/forgot" && method === "POST") {
        z.email().parse(email);
        const [u] = await rows<{ id: string }>(
          sql`SELECT id FROM users WHERE email=${email}`,
        );
        let delivery = {};
        if (u)
          delivery = await emailToken(
            email,
            await issueToken(u.id, "reset"),
            "reset",
          );
        return NextResponse.json({
          ok: true,
          data: {
            message: "If the account exists, a reset link has been sent.",
            ...delivery,
          },
        });
      }
      if (["auth/verify", "auth/reset"].includes(route) && method === "POST") {
        const v = z
          .object({
            token: z.string().min(32),
            password:
              route === "auth/reset"
                ? z.string().min(12).max(128)
                : z.string().optional(),
          })
          .parse(body);
        const purpose = route === "auth/reset" ? "reset" : "verify";
        const db = await database();
        await db.transaction(async (tx) => {
          const [t] = await rows<{ id: string; user_id: string }>(
            sql`SELECT * FROM auth_tokens WHERE token_hash=${hash(v.token)} AND purpose=${purpose} AND used_at IS NULL AND expires_at>now() FOR UPDATE`,
            tx,
          );
          requireThat(t, 400, "Link is invalid or expired");
          if (purpose === "reset") {
            await tx.execute(
              sql`UPDATE users SET password_hash=${await bcrypt.hash(v.password!, 12)} WHERE id=${t.user_id}`,
            );
            await tx.execute(
              sql`DELETE FROM user_sessions WHERE user_id=${t.user_id}`,
            );
          } else
            await tx.execute(
              sql`UPDATE users SET email_verified=true WHERE id=${t.user_id}`,
            );
          await tx.execute(
            sql`UPDATE auth_tokens SET used_at=now() WHERE id=${t.id}`,
          );
          await audit(t.user_id, "security." + purpose, t.user_id, {}, tx);
        });
        return NextResponse.json({
          ok: true,
          data: {
            message:
              purpose === "verify"
                ? "Email verified."
                : "Password changed. Sign in again.",
          },
        });
      }
    }
    // Unauthenticated callbacks are evidence only. They cannot post ledger credits.
    if (route === "payments/callback" && method === "POST") {
      requireThat(
        JSON.stringify(body).length < 32768,
        413,
        "Payload too large",
      );
      const callback = z
        .object({
          CheckoutRequestID: z.string().max(100),
          ResultCode: z.number(),
        })
        .passthrough()
        .parse(body.Body?.stkCallback);
      const [d] = await rows<{ id: string; status: string }>(
        sql`SELECT id,status FROM deposits WHERE checkout_ref=${callback.CheckoutRequestID}`,
      );
      await rows(
        sql`INSERT INTO payment_events(id,deposit_id,reference,payload) VALUES(${id()},${d?.id ?? null},${callback.CheckoutRequestID},${JSON.stringify(body)}::jsonb)`,
      );
      if (d && d.status !== "SUCCESSFUL") {
        // Authenticate status server-to-server. Never trust client/callback ResultCode, receipt or amount.
        try {
          const status = await queryStk(callback.CheckoutRequestID);
          const code = String(status.ResultCode);
          const next =
            code === "0"
              ? "AWAITING_RECEIPT_RECONCILIATION"
              : code === "1032"
                ? "CANCELLED"
                : code === "1037"
                  ? "EXPIRED"
                  : code === "1"
                    ? "FAILED"
                    : "PENDING";
          await rows(
            sql`UPDATE deposits SET status=${next} WHERE id=${d.id} AND status<>'SUCCESSFUL'`,
          );
        } catch {
          /* retained as unverified evidence for reconciliation */
        }
      }
      return NextResponse.json({
        ResultCode: 0,
        ResultDesc: "Accepted for reconciliation",
      });
    }
    const u = await currentUser();
    if (method === "POST")
      await rateLimit(
        u.id + ":" + route,
        route.includes("withdrawal") ? 10 : 80,
      );
    if (route === "auth/logout" && method === "POST") {
      const token = (await cookies()).get("cypher_session")?.value;
      await rows(
        sql`DELETE FROM user_sessions WHERE token_hash=${hash(token ?? "")}`,
      );
      (await cookies()).delete("cypher_session");
      return NextResponse.json({ ok: true, data: {} });
    }
    if (route === "state" && method === "GET") {
      const [demo] = await rows<{ balance: string; initial_balance: string }>(
        sql`SELECT * FROM demo_accounts WHERE user_id=${u.id}`,
      );
      const [wallet] = await rows(
        sql`SELECT * FROM wallets WHERE user_id=${u.id}`,
      );
      const positions = await rows<{
        id: string;
        symbol: string;
        side: string;
        lots: string;
        entry_price: string;
        status: string;
      }>(
        sql`SELECT * FROM positions WHERE user_id=${u.id} ORDER BY created_at DESC LIMIT 200`,
      );
      let unrealized = new Decimal(0),
        used = new Decimal(0);
      const enriched = [];
      for (const p of positions) {
        let profit = "0.00",
          stale = false;
        if (p.status === "OPEN") {
          try {
            const q = await quote(p.symbol);
            stale =
              !q.synthetic && Date.now() - new Date(q.time).getTime() > 30000;
            profit = pnl(p, p.side === "BUY" ? q.bid : q.ask).toFixed(2);
            unrealized = unrealized.plus(profit);
            used = used.plus(margin(p));
          } catch {
            stale = true;
          }
        }
        enriched.push({ ...p, floating_pnl: profit, stale });
      }
      const orders = await rows(
        sql`SELECT * FROM orders WHERE user_id=${u.id} ORDER BY created_at DESC LIMIT 100`,
      );
      const deposits = await rows(
        sql`SELECT * FROM deposits WHERE user_id=${u.id} ORDER BY created_at DESC LIMIT 100`,
      );
      const withdrawals = await rows(
        sql`SELECT * FROM withdrawal_requests WHERE user_id=${u.id} ORDER BY created_at DESC LIMIT 100`,
      );
      const notifications = await rows(
        sql`SELECT * FROM notifications WHERE user_id=${u.id} ORDER BY created_at DESC LIMIT 50`,
      );
      const tickets = await rows(
        sql`SELECT * FROM support_tickets WHERE user_id=${u.id} ORDER BY created_at DESC LIMIT 50`,
      );
      const equity = new Decimal(demo.balance).plus(unrealized);
      return NextResponse.json({
        ok: true,
        data: {
          user: {
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
            status: u.status,
            emailVerified: u.email_verified,
            kycStatus: u.kyc_status,
          },
          demo: {
            ...demo,
            equity: equity.toFixed(2),
            unrealized: unrealized.toFixed(2),
            margin: used.toFixed(2),
            freeMargin: equity.minus(used).toFixed(2),
          },
          wallet,
          positions: enriched,
          orders,
          deposits,
          withdrawals,
          notifications,
          tickets,
          providers: {
            market:
              process.env.MARKET_DATA_PROVIDER === "oanda"
                ? "OANDA"
                : "SYNTHETIC_PRACTICE",
            execution: "UNAVAILABLE",
            payments: darajaConfigured() ? "SANDBOX_CONFIGURED" : "UNAVAILABLE",
            payout: "UNAVAILABLE",
          },
        },
      });
    }
    if (route === "market" && method === "GET")
      return NextResponse.json({
        ok: true,
        data: await market(
          req.nextUrl.searchParams.get("symbol") ?? "EUR_USD",
          req.nextUrl.searchParams.get("timeframe") ?? "1h",
        ),
      });
    if (route === "market/stream" && method === "GET") {
      const symbol = req.nextUrl.searchParams.get("symbol") ?? "EUR_USD";
      const sessionHash = hash(
        (await cookies()).get("cypher_session")?.value ?? "",
      );
      let closed = false;
      let inFlight = false;
      let timer: ReturnType<typeof setInterval>;
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          const send = async () => {
            if (closed || inFlight) return;
            inFlight = true;
            try {
              const allowed = await rows(
                sql`SELECT s.id FROM user_sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=${sessionHash} AND s.expires_at>now() AND u.status NOT IN ('suspended','closed')`,
              );
              if (!allowed.length) {
                closed = true;
                clearInterval(timer);
                controller.enqueue(
                  encoder.encode("event: unauthorized\ndata: {}\n\n"),
                );
                controller.close();
                return;
              }
              const q = await quote(symbol);
              if (!closed)
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify(q)}\n\n`),
                );
            } catch {
              if (!closed)
                controller.enqueue(
                  encoder.encode("event: unavailable\ndata: {}\n\n"),
                );
            } finally {
              inFlight = false;
            }
          };
          void send();
          timer = setInterval(() => void send(), 5000);
          req.signal.addEventListener("abort", () => {
            closed = true;
            clearInterval(timer);
            try {
              controller.close();
            } catch {}
          });
        },
        cancel() {
          closed = true;
          clearInterval(timer);
        },
      });
      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "X-Accel-Buffering": "no",
        },
      });
    }
    if (route === "demo/orders" && method === "POST") {
      const v = z
        .object({
          symbol: z.enum(symbols as [string, ...string[]]),
          side: z.enum(["BUY", "SELL"]),
          type: z.enum(["MARKET", "LIMIT", "STOP"]),
          lots: z
            .string()
            .regex(/^\d{1,2}(\.\d{1,2})?$/)
            .refine(
              (v) => new Decimal(v).gte(".01") && new Decimal(v).lte("10"),
            ),
          price: z
            .string()
            .regex(/^\d+(\.\d+)?$/)
            .optional(),
          stopLoss: z
            .string()
            .regex(/^\d+(\.\d+)?$/)
            .optional(),
          takeProfit: z
            .string()
            .regex(/^\d+(\.\d+)?$/)
            .optional(),
          key: z.string().uuid(),
        })
        .parse(body);
      return NextResponse.json({ ok: true, data: await submitDemo(u.id, v) });
    }
    if (route === "demo/sync" && method === "POST") {
      await syncDemo(u.id);
      return NextResponse.json({ ok: true, data: {} });
    }
    if (route === "demo/close" && method === "POST") {
      const v = z.object({ id: z.string().uuid() }).parse(body);
      return NextResponse.json({ ok: true, data: await closeDemo(u.id, v.id) });
    }
    if (route === "demo/cancel" && method === "POST") {
      const v = z.object({ id: z.string().uuid() }).parse(body);
      const changed = await rows(
        sql`UPDATE orders SET status='CANCELLED' WHERE id=${v.id} AND user_id=${u.id} AND mode='DEMO' AND status='PENDING' RETURNING id`,
      );
      requireThat(changed.length, 409, "Pending practice order not found");
      await audit(u.id, "demo.order.cancelled", v.id);
      return NextResponse.json({ ok: true, data: {} });
    }
    if (route === "demo/reset" && method === "POST") {
      const db = await database();
      await db.transaction(async (tx) => {
        await tx.execute(
          sql`SELECT user_id FROM demo_accounts WHERE user_id=${u.id} FOR UPDATE`,
        );
        const open = await rows(
          sql`SELECT id FROM positions WHERE user_id=${u.id} AND status='OPEN' AND mode='DEMO'`,
          tx,
        );
        requireThat(
          !open.length,
          409,
          "Close all practice positions before resetting",
        );
        const [a] = await rows<{ reset_at: string | null }>(
          sql`SELECT reset_at FROM demo_accounts WHERE user_id=${u.id}`,
          tx,
        );
        requireThat(
          !a.reset_at || Date.now() - new Date(a.reset_at).getTime() > 3600000,
          429,
          "Demo reset is available once per hour",
        );
        await tx.execute(
          sql`UPDATE orders SET status='CANCELLED' WHERE user_id=${u.id} AND mode='DEMO' AND status='PENDING'`,
        );
        await tx.execute(
          sql`UPDATE demo_accounts SET balance=initial_balance,reset_at=now() WHERE user_id=${u.id}`,
        );
        await audit(u.id, "demo.balance.reset", u.id, {}, tx);
      });
      return NextResponse.json({
        ok: true,
        data: { message: "Virtual balance reset. Real wallet unchanged." },
      });
    }
    if (route === "live/orders" && method === "POST") {
      await realEligible(u);
      return NextResponse.json({
        ok: true,
        data: await executionProvider.submitOrder(
          body,
          req.headers.get("idempotency-key") ?? id(),
        ),
      });
    }
    if (route === "deposits" && method === "POST") {
      const v = z
        .object({ amount: money, phone, key: z.string().uuid() })
        .parse(body);
      await realEligible(u);
      requireThat(
        darajaConfigured(),
        503,
        "M-Pesa unavailable. No payment has been initiated.",
      );
      requireThat(
        v.amount % 100n === 0n,
        400,
        "M-Pesa deposits must be whole shillings",
      );
      const [existing] = await rows<{
        user_id: string;
        amount: string;
        phone: string;
      }>(sql`SELECT * FROM deposits WHERE idempotency_key=${v.key}`);
      if (existing) {
        requireThat(
          existing.user_id === u.id &&
            BigInt(existing.amount) === v.amount &&
            existing.phone === v.phone,
          409,
          "Idempotency conflict",
        );
        return NextResponse.json({ ok: true, data: existing });
      }
      const did = id();
      await rows(
        sql`INSERT INTO deposits(id,user_id,amount,phone,idempotency_key) VALUES(${did},${u.id},${v.amount.toString()},${v.phone},${v.key})`,
      );
      await audit(u.id, "deposit.initiated", did);
      try {
        const reference = await stkPush(
          (v.amount / 100n).toString(),
          v.phone,
          did,
        );
        await rows(
          sql`UPDATE deposits SET checkout_ref=${reference} WHERE id=${did}`,
        );
        return NextResponse.json({
          ok: true,
          data: { id: did, status: "PENDING" },
        });
      } catch (e) {
        await rows(
          sql`UPDATE deposits SET status='PENDING_PROVIDER_REVIEW' WHERE id=${did}`,
        );
        await audit(u.id, "deposit.uncertain", did);
        throw e;
      }
    }
    if (route === "withdrawals" && method === "POST") {
      const v = z
        .object({ amount: money, phone, key: z.string().uuid() })
        .parse(body);
      await realEligible(u);
      return NextResponse.json({
        ok: true,
        data: await reserveWithdrawal(u.id, v.amount, v.phone, v.key),
      });
    }
    if (route === "admin/withdrawals/review" && method === "POST") {
      authorize(u, ["SUPER_ADMIN"]);
      const v = z
        .object({
          id: z.string().uuid(),
          decision: z.enum(["APPROVE", "REJECT"]),
          reason: z.string().max(1000),
          password: z.string().max(128),
          otp: z.string().length(6),
        })
        .parse(body);
      await stepUp(u, v.password, v.otp);
      return NextResponse.json({
        ok: true,
        data: await reviewWithdrawal(u, v.id, v.decision, v.reason),
      });
    }
    if (route === "admin/overview" && method === "GET") {
      authorize(u, staffRoles);
      const data: Record<string, unknown> = {};
      if (["SUPER_ADMIN", "COMPLIANCE", "SUPPORT"].includes(u.role))
        data.users = await rows(
          sql`SELECT id,name,email,status,kyc_status,role,created_at FROM users WHERE email NOT LIKE '%@local.invalid' ORDER BY created_at DESC LIMIT 100`,
        );
      if (financeRoles.includes(u.role)) {
        data.withdrawals = await rows(
          sql`SELECT w.*,u.name,u.email,u.status AS account_status,u.kyc_status FROM withdrawal_requests w JOIN users u ON u.id=w.user_id ORDER BY w.created_at DESC LIMIT 100`,
        );
        data.deposits = await rows(
          sql`SELECT * FROM deposits ORDER BY created_at DESC LIMIT 100`,
        );
        data.reconciliation = await reconciliation();
        data.audit = await rows(
          sql`SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100`,
        );
      }
      if (["SUPER_ADMIN", "SUPPORT"].includes(u.role))
        data.tickets = await rows(
          sql`SELECT t.*,u.name FROM support_tickets t JOIN users u ON u.id=t.user_id ORDER BY created_at DESC LIMIT 100`,
        );
      if (["SUPER_ADMIN", "TRADING_OPS"].includes(u.role))
        data.providerHealth = await executionProvider.health();
      if (["SUPER_ADMIN", "HR"].includes(u.role))
        data.staff = await rows(
          sql`SELECT s.*,u.name,u.role FROM staff_profiles s JOIN users u ON u.id=s.user_id`,
        );
      return NextResponse.json({ ok: true, data });
    }
    if (route === "admin/users/status" && method === "POST") {
      authorize(u, ["SUPER_ADMIN", "COMPLIANCE"]);
      const v = z
        .object({
          id: z.string().uuid(),
          status: z.enum(["active", "restricted", "suspended", "closed"]),
          reason: z.string().min(10).max(1000),
        })
        .parse(body);
      requireThat(v.id !== u.id, 403, "Cannot alter your own status");
      const db = await database();
      await db.transaction(async (tx) => {
        await tx.execute(
          sql`UPDATE users SET status=${v.status} WHERE id=${v.id} AND role='CUSTOMER'`,
        );
        await tx.execute(sql`DELETE FROM user_sessions WHERE user_id=${v.id}`);
        await audit(
          u.id,
          "account.status.changed",
          v.id,
          { status: v.status, reason: v.reason },
          tx,
        );
      });
      return NextResponse.json({ ok: true, data: {} });
    }
    if (route === "support" && method === "POST") {
      const v = z
        .object({
          subject: z.string().trim().min(3).max(160),
          message: z.string().trim().min(10).max(4000),
        })
        .parse(body);
      const tid = id();
      await rows(
        sql`INSERT INTO support_tickets(id,user_id,subject,message) VALUES(${tid},${u.id},${v.subject},${v.message})`,
      );
      return NextResponse.json({ ok: true, data: { id: tid } });
    }
    if (route === "notifications/read" && method === "POST") {
      await rows(
        sql`UPDATE notifications SET read_at=now() WHERE user_id=${u.id} AND read_at IS NULL`,
      );
      return NextResponse.json({ ok: true, data: {} });
    }
    if (route === "profile" && method === "POST") {
      const v = z
        .object({
          name: z.string().trim().min(2).max(80),
          timezone: z.enum([
            "Africa/Nairobi",
            "UTC",
            "Europe/London",
            "America/New_York",
          ]),
        })
        .parse(body);
      const db = await database();
      await db.transaction(async (tx) => {
        await tx.execute(sql`UPDATE users SET name=${v.name} WHERE id=${u.id}`);
        await tx.execute(
          sql`UPDATE customer_profiles SET timezone=${v.timezone} WHERE user_id=${u.id}`,
        );
        await audit(u.id, "profile.updated", u.id, {}, tx);
      });
      return NextResponse.json({
        ok: true,
        data: { message: "Profile updated" },
      });
    }
    if (route === "sessions/revoke" && method === "POST") {
      await rows(sql`DELETE FROM user_sessions WHERE user_id=${u.id}`);
      (await cookies()).delete("cypher_session");
      await audit(u.id, "security.sessions.revoked", u.id);
      return NextResponse.json({
        ok: true,
        data: { message: "All sessions revoked" },
      });
    }
    if (route === "statement" && method === "GET") {
      const ledger = await rows<Record<string, string>>(
        sql`SELECT t.created_at,t.reference,t.description,a.kind,e.amount::text FROM ledger_entries e JOIN ledger_transactions t ON e.transaction_id=t.id JOIN ledger_accounts a ON a.id=e.account_id WHERE a.user_id=${u.id} ORDER BY t.created_at`,
      );
      const csv = [
        "date,reference,description,account,amount_minor_KES",
        ...ledger.map((r) =>
          [r.created_at, r.reference, r.description, r.kind, r.amount]
            .map((v) => '"' + String(v).replaceAll('"', '""') + '"')
            .join(","),
        ),
      ].join("\n");
      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition":
            'attachment; filename="cypherfx-statement.csv"',
        },
      });
    }
    throw new AppError(404, "Operation not found");
  } catch (e) {
    if (e instanceof z.ZodError)
      return NextResponse.json(
        {
          ok: false,
          error: { message: e.issues[0]?.message ?? "Invalid input" },
        },
        { status: 400 },
      );
    if (e instanceof AppError)
      return NextResponse.json(
        { ok: false, error: { message: e.message } },
        { status: e.status },
      );
    console.error(
      "API operation failed",
      route,
      e instanceof Error ? e.message : "unknown",
    );
    return NextResponse.json(
      {
        ok: false,
        error: {
          message:
            "The operation could not be completed. No successful financial result is implied.",
        },
      },
      { status: 500 },
    );
  }
}
export { handler as GET, handler as POST };
