# CYPHERFX architecture and implementation plan

## Inspection

The starting repository contained two ZIP archives only. Their Supabase/Express prototype had placeholder STK integration, non-atomic payment posting and incomplete admin authorization. Archives are removed from the new working tree, recoverable from Git history. No production data or active database was provided.

## Architecture

Next.js App Router + React + TypeScript; Tailwind and custom accessible components; Drizzle ORM; PostgreSQL in deployed environments. A local embedded PostgreSQL-compatible PGlite database is used when DATABASE_URL is absent in development (never in production). This explicit local alternative avoids requiring a system PostgreSQL daemon in this environment. SQL migrations are shared. Monetary amounts are integer minor units (bigint) and Decimal is used for practice FX calculations. No money crosses the practice / real boundary.

Browser → same-origin route handlers → session/RBAC/validation → domain services → database.
Provider adapters are server-only. Financial mutation and audit records share a transaction. Wallet rows are locked before reservation. Ledger postings are balanced, append-only, uniquely referenced and transactionally update a reconciled balance projection. Reserved funds move from available liability to reserved liability. A payout worker may only claim rows with a distinct, explicit SUPER_ADMIN approval. Uncertain outcomes preserve reservation and cannot auto-retry.

## Roles

CUSTOMER: own profile, practice terminal, own wallet and support.
SUPER_ADMIN: financial review with password+TOTP step-up, never own requests.
FINANCE: reconciliation/read reports; no approval.
SUPPORT: support tickets; no financial writes.
COMPLIANCE: KYC/restriction review.
TRADING_OPS: provider health/order diagnostics.
AUDITOR: read-only ledger and audit.
HR: staff/access review only; no customer finance.

## Relationships

Users own sessions, demo account, real wallet, profiles, KYC, orders, deposits, withdrawals, tickets and notices. Wallets have available/reserved ledger accounts. Ledger transactions own entries; a deferred DB trigger enforces zero-sum postings. Deposits bind unique checkout/receipt references. Withdrawal reviews belong to one request and one admin; immutable audit accompanies every transition. Orders/positions reference an account mode and instrument. Provider events are immutable, not authorization evidence alone.

## Phases and evidence

1. Inspect/design: completed; this document records replacement and trust boundaries.
2. Shell/auth: local paper workspace plus registration, hashed passwords, hashed sessions, verification/reset token workflow; role guards.
3. Schema: shared SQL migration + Drizzle mappings, integrity triggers.
4. Finance: atomic balanced posting, reservation, decision, and confirmed settlement services; integration tests.
5. Practice: clearly labeled synthetic fixture feed, market/limit/stop simulation, exits/reset and history. It is NOT a claim of real market data.
6. Providers: OANDA practice market-data adapter; live execution fails closed. OANDA/CMA authorization and data licensing are not assumed.
7. M-Pesa: sandbox OAuth/STK adapter; callback records evidence, query verifies status; receipt verification is a separate trusted reconciliation step before credit.
8. Withdrawals: explicit Super Admin approval and step-up; payout adapter intentionally fails closed until an approved integration is supplied.
9. Operations: role-specific read views, support, notices, audit and reconciliation surfaces.
10. Tests/docs: see DELIVERY.md for commands, results and outstanding acceptance gates. This is a development foundation, not a finished regulated brokerage.
