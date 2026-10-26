# Deployment, security and recovery runbook

## Safe staging deployment

1. Node 22 LTS container or long-lived Node host; managed PostgreSQL 16+ with TLS and private networking. Use `npm ci`, `npm run typecheck`, `npm test`, `npm run build`.
2. Provision isolated development/staging database, dedicated migration role and non-owner runtime role. Migrate using the deployment role with `RUN_MIGRATIONS=true`. Do not allow the runtime role to alter tables, disable triggers, truncate journals or create roles.
3. Disable `ALLOW_LOCAL_PRACTICE` on deployed environments; production code refuses auto-guest even if accidentally set. Keep `ENABLE_REAL_MONEY=false`, `REGULATORY_APPROVAL_CONFIRMED=false`, `TRADING_PROVIDER=disabled`. Set `APP_BASE_URL` to the HTTPS origin and use a long random `AUTH_SECRET` from a secret manager.
4. Supply a verified-domain Resend configuration to test real emails. Use disposable test identities, never actual customer KYC in this build.
5. Route all browser requests same-origin. Terminate TLS at the trusted proxy; validate forwarded-host headers at ingress. Restrict external callbacks to approved paths, provider network controls and approved evidence verification.
6. Browser SSE is backed by server-side 5-second provider polling. Use a persistent gateway on hosts with short function-duration limits. On Vercel, move streaming, background execution, reconciliation and payout workers to a persistent service; never start them inside a request and forget them.
7. Add per-IP/edge throttling, WAF/body-size limits, connection quotas and distributed alerts. Current DB-backed rate limits constrain application operations, not a complete DDoS defense.
8. Re-run browser tests against staging, actual PostgreSQL multi-connection stress tests and external provider sandboxes. No credentialed external tests have been performed here.

## Financial states and failures

- `PENDING_ADMIN_APPROVAL`: reserve only; no provider request.
- `APPROVED_PENDING_PAYOUT`: explicit independent admin review exists; funds still reserved; no proof of payment.
- `PROCESSING`: worker claimed exactly once before external call; provider reference must be persisted.
- `PAYOUT_UNDER_REVIEW`: uncertain external outcome; funds remain reserved. No automatic retry or release.
- `PAID`: trusted reconciler received an independently verified result matching the dispatched reference; journal removes reserved liability against clearing.
- `REJECTED`: explicit reason; reserved liability returns to available liability.
- `FAILED`: reserved until verified failure/release policy is implemented. Current adapter never dispatches; verified-failure release/compensation workflow is a remaining task.

Crash recovery after a PROCESSING claim must first query the provider using the stable request ID. A worker must never retry an uncertain network dispatch blindly. The disabled adapter cannot be enabled by environment variables alone.

Deposits retain callback evidence immutably. Unknown or early callbacks are retained with nullable deposit association and provider reference. Current flow leaves successful query results awaiting receipt reconciliation. An orphan-event matching worker, scheduled query/reconciliation, provider transaction receipt verification, failed status handling and operational alerts must be completed before automatic credit. Never add a client-facing settlement endpoint.

## Backups and restoration (procedure, not a completed drill)

Use managed encrypted PITR plus daily immutable snapshots in separate access-controlled storage. Store AUTH_SECRET in a protected key vault backup independently. Define RPO/RTO, retention and incident ownership before launch. Do not copy a live PGlite directory across processes as a production backup.

Example PostgreSQL commands (operator-controlled, never browser-facing):

```bash
# Dedicated backup role; do not print passwords to logs.
pg_dump --format=custom --file=cypherfx-backup.dump "$BACKUP_DATABASE_URL"
# Restore into a NEW, isolated database. Never overwrite a live ledger in place.
pg_restore --no-owner --exit-on-error --dbname="$ISOLATED_RESTORE_DATABASE_URL" cypherfx-backup.dump
```

After restore:

1. Confirm migration checksums/version, immutable triggers, roles, indexes and foreign keys.
2. Validate every journal transaction sums to zero and has at least two entries.
3. Reconcile each wallet available/reserved projection to the corresponding journal account sum.
4. Compare withdrawals to reservations and immutable reviews; compare paid records to provider statements.
5. Recover outbox/provider-event orphan associations; independently inquire about PROCESSING/uncertain payouts. Never replay money-moving commands from an HTTP log.
6. Ensure audit events and provider references survived; compare row counts and backup manifests.
7. Test session revocation and rotate secrets as required. Record the signed recovery drill result before reopening access.

**No managed backup/restore drill was run in this environment. Acceptance test 14 is not passed.**

## Remaining security gates

- Security review and penetration testing; secrets rotation; dependency review on deployment date.
- Replace permissive development CSP script directives with nonce/hashes; apply CSP/headers through a verified deployment proxy. Current preview CSP allows the Arena frame.
- Production least-privilege grants/stored-procedure review; concurrency tests with multiple PostgreSQL connections; migration advisory locking/checksums and rollback strategy.
- Privileged login MFA enforcement in addition to financial step-up, secure self-service enrollment/recovery, TOTP replay protection, durable privileged-session freshness, staff access reviews.
- Email verification re-send, email delivery retry/outbox, breached-password screening, account recovery abuse controls, session/device management and login-event notices.
- No uploads currently accepted, preventing a placeholder unsafe KYC file endpoint. Complete encrypted private KYC storage, MIME sniffing, malware scan, signed access and retention before enabling uploads.
- Data retention policy and Kenya Data Protection Act review; customer funds segregation; AML, sanctions/PEP and escalation procedures; CMA/legal/provider agreements.
- Add transactional outbox and monitoring for all sensitive transitions, timed provider updates and discrepancies. In-app transaction notices exist; full security/trading/email/SMS notification coverage does not.

## Practice execution model

Practice only, USD virtual balance, one standard lot = 100,000 base currency, leverage 1:100. Bid/ask used for executable sides. For USD-base pairs, quote P&L is converted to USD using the exit rate. Non-USD-base supported pairs all quote USD. No commissions/swaps/liquidity simulation. Limit touch fills cannot claim guaranteed execution in real markets. SL/TP and pending orders are checked when the workspace polls; no unattended 24/7 practice execution guarantee. No stop-out engine yet; practice equity may fall below initial collateral after a market gap. Historical trades remain after reset, so history-based total P&L spans resets; a production performance report needs period/reset segmentation.

## Licensing and branding

CYPHERFX branding is original CSS/SVG; no third-party platform interface/code/logo is used. Country flag emoji are platform-rendered. Lightweight Charts attribution remains enabled; keep its LICENSE/NOTICE requirements. OANDA attribution is included when configured, but contractual display/redistribution rights must still be independently confirmed. Sparkline previews are explicitly synthetic, not provider-supplied trading activity.
