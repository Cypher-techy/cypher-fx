# CYPHERFX

### Your ambition. A world of opportunity.

A functional **development foundation** for a forex trading workspace. Built from a clean working tree with Next.js 16, React 19, TypeScript, Tailwind 4, Drizzle and PostgreSQL. **Not production-ready; do not accept customer funds.**

## Try it

```bash
npm ci
cp .env.example .env.local
npm run dev
# open http://localhost:3000
```

No external credentials are needed for local practice. A unique, server-side practice session is created automatically in **development only**. Initial balance is **USD 10,000 in virtual funds**. Quotes and charts are explicitly **synthetic training fixtures**, not live market data. Place/close practice trades, create/cancel pending orders, reset demo funds, explore the KSh wallet, submit support tickets, register a personal account and change settings.

### Commands

| Command                   | Purpose                                                                  |
| ------------------------- | ------------------------------------------------------------------------ |
| `npm run dev`             | Development server on `0.0.0.0:3000`                                     |
| `npm run typecheck`       | TypeScript checking                                                      |
| `npm test`                | Finance/domain/provider tests in isolated embedded PostgreSQL            |
| `npm run test:e2e`        | Browser + HTTP integration tests against a running dev server            |
| `npm run build`           | Production build (does not enable financial providers)                   |
| `npm start`               | Run production build; requires managed PostgreSQL for authenticated APIs |
| `npm run db:migrate`      | Apply checked-in SQL migrations; see environment notes below             |
| `npm run admin:bootstrap` | One-time operator bootstrap using `.env.local`                           |
| `npm run worker`          | Examine approved payout queue; refuses unconfigured payout dispatch      |

Install browsers once: `npx playwright install --with-deps chromium`. Node 20.19+ required; Node 22 LTS recommended.

## What works today

- Distinctive responsive trader workspace, collapsible navigation, dark/light themes, watchlist favorites, instrument search, interactive Lightweight Charts, bid/ask and stale connection warnings.
- Persistent local practice accounts; market, limit and stop orders; position closure; stop-loss/take-profit checks; decimal P&L; margin checks; history and controlled resets. Real ledger never used by demo.
- Registration, bcrypt password hashing, hashed HttpOnly sessions, login/logout, session revocation, verification/reset tokens, role guards and account-status checks. Development email links returned by API; Resend adapter available.
- Shared PostgreSQL SQL migrations, deferred balanced-journal constraints, immutable financial/audit/provider records, immutable committed journal membership, unique references, row-locked wallet reservations and ledger reconciliation.
- Withdrawal request → explicit independent Super Admin review → approved pending payout. Rejection releases funds atomically. Settlement requires an already-dispatched matching provider reference. Payout adapter is deliberately unavailable.
- Operator-provisioned Super Admin with encrypted TOTP secret; password + TOTP reauthentication for every approval/rejection. No hardcoded staff passwords or public role elevation.
- KSh wallet, transaction history, downloadable ledger CSV, notifications, private customer support tickets, profile/security settings and read-only role-specific operational views.
- OANDA market-data adapter for genuine quote/history retrieval when configured; server-side polling delivered to browser over SSE. Live execution remains disabled.
- Daraja sandbox OAuth/STK/query code and callback evidence ingestion. **Receipt verification and automatic deposit credit are intentionally blocked pending an approved reconciliation integration.**

## Database

If `DATABASE_URL` is empty in development, PGlite stores a local PostgreSQL-compatible database at `.data/postgres`. It is **not** a production substitute for managed PostgreSQL, multi-process row-lock contention testing, HA or backups. Run only one application process against an embedded data directory. Stop the dev server before CLI commands that use the same local database. Unit tests use their own in-memory instance.

For real PostgreSQL, set `DATABASE_URL` in the shell or use:

```bash
# Explicitly load your local environment for the migration CLI:
node --env-file=.env.local --import tsx scripts/migrate.ts
# In production use a privileged MIGRATION connection, not the runtime app role:
RUN_MIGRATIONS=true node --env-file=.env.local --import tsx scripts/migrate.ts
```

Next.js loads `.env.local` for web requests; standalone CLI tools do not unless explicitly passed `--env-file`. Migrations are canonical SQL under `migrations/`. `schema.ts` maps the principal aggregates; **do not use `drizzle-kit push` to replace the SQL integrity constraints**. Migration auto-application is development-only unless an operator explicitly enables `RUN_MIGRATIONS`. A production runtime role must not own or alter tables/triggers.

## First Super Admin

1. Configure a random 32+ character `AUTH_SECRET` (e.g. `openssl rand -hex 32`).
2. Put the one-time admin email, a unique 16+ character password and a secure base32 TOTP secret in the bootstrap environment. Enroll that secret in the operator's authenticator through a secure process.
3. Stop the local dev server if using PGlite; run `npm run admin:bootstrap`; restart.
4. Remove the one-time password/TOTP variables immediately. The database stores the TOTP secret encrypted using AES-256-GCM. Preserve and securely back up `AUTH_SECRET`.
5. Sign in through the profile menu. Administration appears only for staff roles; APIs independently enforce permissions.

Bootstrap never elevates an existing customer. A production recovery/enrollment process, hardware-backed MFA, access reviews and separation-of-duties policy still need security approval.

## External integrations and production blockers

Configuration alone is **not** proof of legal authorization. See [delivery status](docs/DELIVERY.md) for the acceptance matrix and every major unfinished requirement; [architecture](docs/ARCHITECTURE.md), [API](docs/API.md) and [deployment/security](docs/OPERATIONS.md) for details.

- **Market data:** set `MARKET_DATA_PROVIDER=oanda`, `OANDA_ENV=practice`, `OANDA_API_TOKEN`, `OANDA_ACCOUNT_ID`. Confirm your OANDA agreement permits the proposed use/redistribution. No credentials were provided or tested against an external account.
- **Live trading:** authorized provider adapter, trading account lifecycle, order reconciliation and broker agreements are still required. Orders fail closed, never fabricate fills.
- **M-Pesa:** supply Daraja sandbox values in `.env.example`; onboard the callback URL and test with Safaricom. Callbacks and an STK status query alone do not establish a verified receipt amount/phone. Complete the approved receipt-reconciliation adapter before connecting `settleVerifiedDeposit` to a trusted worker. There is no public “mark successful” route.
- **Payouts:** implement and certify the approved B2C provider adapter, status inquiry and result authentication. No payout network call currently exists. Approval alone cannot mark anything paid. Uncertain dispatches remain reserved and under review.
- **Compliance:** obtain applicable Kenyan CMA/legal advice, customer-money handling permissions, data protection review, KYC/AML process, and payment/execution agreements. No license is claimed.
- **Operations:** complete managed PostgreSQL contention tests, recovery drill, distributed streaming/worker deployment, monitoring, penetration testing and remaining staff workflows.

Real services require both eligibility and explicit `ENABLE_REAL_MONEY=true` + `REGULATORY_APPROVAL_CONFIRMED=true`; keep these **false**. The current release must remain development/practice-only even if an operator toggles them, because essential adapters and reviews are not finished.

## Repository handover

The original ZIP-only tree was replaced locally, retaining Git history. No exposed access token was used or stored. Remote publishing requires a new, securely supplied GitHub authentication method. Revoke any token pasted into a chat. See `docs/DELIVERY.md` for verified test results and limitations.
