# CYPHERFX development delivery — 26 October 2026

## Status

**Working development foundation, not a complete production forex brokerage.** Live customer funds, execution and payouts remain disabled. No production deployment, external provider success, licensing decision or completed recovery drill is claimed.

## Phase handover

| Phase               | Completed / changed files                                              | DB changes                                                                   | Validation / limitation                                                                   | Next milestone                                                                   |
| ------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| 1 Inspection/design | Removed two old ZIP archives from working tree; `docs/ARCHITECTURE.md` | None from previous app available                                             | Old code inspected inside archives; Git history retained                                  | Provider/legal design approval                                                   |
| 2 Shell/auth        | `src/app`, `src/components`, `src/lib/auth.ts`, `secrets.ts`           | users/sessions/tokens/profile/rate-limits/compliance                         | Browser auth/verification/reset/isolation passed; optional OAuth/self-service MFA omitted | Production auth/MFA hardening                                                    |
| 3 Schema            | `migrations/0001_core.sql`, `0002_hardening.sql`, `src/db`             | 30+ relational operational models, constraints/indexes/triggers              | Applied and tested with local PGlite; no prior production DB migrated                     | Managed PostgreSQL load/migration validation                                     |
| 4 Ledger            | `src/lib/services/ledger.ts`                                           | available/reserved accounts, balanced immutable journal, payment/ref uniques | Duplicate/concurrency/reservation/rejection/settlement tests passed                       | Independent finance/security review                                              |
| 5 Practice          | `services/demo.ts`, chart/workspace                                    | demo orders/executions/positions/history                                     | Market/pending, exits, decimal P&L; no real ledger changes                                | Provider-backed practice and risk engine validation                              |
| 6 Providers         | `providers/market.ts`, `execution.ts`                                  | quote/candle schema available; adapter currently fetches directly            | Synthetic fallback honest; OANDA adapter uncredentialed; execution disabled               | Authorized execution integration and licensed market feed                        |
| 7 Payments          | `providers/daraja.ts`, callback/API routes                             | pending deposits, immutable evidence                                         | STK OAuth/query implemented, no external credentials; no automatic credit from callback   | Approved receipt reconciliation and sandbox callback tests                       |
| 8 Withdrawals       | ledger services, payout adapter, admin review UI, worker               | request/review/payout events                                                 | Mandatory role, own-request block, fresh password+TOTP; disabled payout adapter           | Approved B2C + independently verified settlement/failure workflows               |
| 9 Operations        | role-filtered admin/finance/compliance/support/HR read views           | tickets/notices/audit/staff/internal-message schema                          | Customer tickets and core admin read views; staff workflows incomplete                    | Full staff administration and case-management implementation                     |
| 10 Quality/docs     | tests/configs, README/API/OPERATIONS/env                               | No extra sample production money                                             | Type check/build/20 domain tests/6 E2E passed                                             | Credentialed integration, real PostgreSQL contention and recovery/security gates |

## Acceptance criteria matrix

| #   | Requested scenario                     | Evidence / status                                                                                                                           |
| --- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Registration and own dashboard         | **Local pass:** HTTP E2E registers, verifies, isolates sessions and resets password                                                         |
| 2   | Demo without real-ledger mutation      | **Local simulation pass.** Genuine live prices not yet credentialed; default synthetic fixture explicitly labeled                           |
| 3   | Verified M-Pesa deposit credited once  | **Domain test pass only. External integration blocked.** Trusted receipt settlement is atomic; no externally verified payment run           |
| 4   | Duplicate callback no duplicate credit | Callback cannot credit at all; duplicate trusted settlement test passes. Full Daraja callback→receipt integration pending                   |
| 5   | Failed/cancelled payment no credit     | Local mismatched/failed evidence never credits; provider sandbox failure scenarios pending                                                  |
| 6   | Withdrawal remains pending             | **Local pass:** request reserves and remains pending; dispatch/settlement blocked before approval                                           |
| 7   | Rejection releases reservation         | **Local pass:** matching journal release, mandatory reason, audit, no payout                                                                |
| 8   | Approval then confirmed payment        | **Domain test pass only:** approval distinct from paid; matching dispatched ref + review required. Real provider disabled/unproven          |
| 9   | Unauthorized approval denied           | **Local pass:** customer direct API denied; support service denied; own Super Admin review denied                                           |
| 10  | Concurrent withdrawals no double spend | **Embedded DB test pass.** Real multi-connection managed PostgreSQL stress test required before launch                                      |
| 11  | Actual provider executions             | **Not passed:** no authorized execution integration; fails closed as unavailable                                                            |
| 12  | Genuine timestamped chart              | **Adapter implemented, not credential-tested.** Default chart synthetic, SSE/stale status works locally; licensed feed verification pending |
| 13  | Audit trail                            | Core financial/admin/auth/domain transitions tested. Full notification, role-management, investigation/outbox coverage incomplete           |
| 14  | Recovery                               | **Not passed:** runbook provided; actual managed PostgreSQL restore/reconcile drill required                                                |

## Explicit remaining requirements

- **Live market/execution:** provider agreement; instrument/entitlement discovery; real account provisioning and funding transfers; order/cancel idempotency across provider failures; actual executions/positions reconciliation; persistent feed gateway and licensed redistribution. No real-money trading account balance is fabricated.
- **Payments:** approved receipt-status/report adapter; automatic matching/reconciliation of delayed, out-of-order and missing callbacks; sandbox transaction approval/eligibility setup; daily scheduled reconciliation and finance investigation actions. Callback intake is evidence-only, not a finished auto-credit integration.
- **Payouts:** approved B2C request/result/status adapters, verified result authenticity, durable outbox/dispatch recovery, verified failure release, dispute workflow and operational alerting. The payout adapter cannot be enabled merely by adding credentials.
- **Authentication:** optional OAuth, self-service MFA setup/recovery, MFA on privileged login, verification resend, reliable email retry/receipt, full session/device management, notices for all security events and TOTP replay defense. Financial review already requires encrypted operator-provisioned TOTP plus password.
- **Compliance:** actual KYC provider, private encrypted uploads, sanctions/AML controls, restrictions policy, risk acceptance updates/version workflows and review cases. No browser KYC bypass is present.
- **Staff:** no public role editing/elevation; production role-request and segregation-of-duties workflow, support ticket assignments/replies, staff private channels/attachments, risk investigations, access review requests, HR workflows and full operational filters/exports still needed. Tables alone are not presented as completed features.
- **Reports:** CSV ledger statements exist, but formatted provider receipts/PDFs, automated daily reports, segmented demo performance analytics and jurisdiction-specific financial reporting do not.
- **Financial policies:** transactional row locks and entry constraints exist; production transaction limits, withdrawal destination verification, margin stop-out, double-approval thresholds, finance exception processing and reserve reconciliation job require completion.
- **Operational security:** edge WAF/IP limits, distributed monitors/alerting, least-privilege production grants, advisory-lock migrations, immutable offsite backups and disaster recovery evidence, pentest, tightened production CSP, privacy/retention policy and regulator/legal review.
- **Timezone:** UTC stored; profile timezone can be saved, but not every UI date is yet formatted using that preference (browser-local display remains in several tables).
- **Deployment:** local preview only; no external production/staging domain or managed infrastructure provisioned.

## Verification performed

- `npm run typecheck`: pass.
- `npm test`: **20 tests passed** (16 finance/practice and 4 provider/security tests).
- `npm run test:e2e`: **6 tests passed** (desktop trade/close/pending/cancel/theme/wallet guards, mobile support/navigation/search, HTTP registration/verification/reset/security).
- `npm run build`: pass (Next.js 16.4.3).
- Chromium manual screenshots: desktop 1440px and mobile 390px; no horizontal page overflow; no uncaught browser runtime errors in tested workflows.
- `npm audit --omit=dev`: 0 known production dependency vulnerabilities at build time. Development toolchain audit retains moderate transitive `drizzle-kit`/esbuild issues; full dependency review is still a deployment gate.

Tests use synthetic provider inputs/local fixtures, never invented successful external transactions. E2E-generated users are test identities; dashboard financial activity is not seeded as genuine customer business.

## Repository state

The replacement is prepared in `/home/user/cypher-fx` with Git history intact. The exposed token was not used or saved. GitHub connector was reported unsupported by the environment. **No remote deletion/push occurred.** Publish only with a newly issued, securely configured least-privilege credential. Revoke the token pasted in the request. Original archives are recoverable from the existing Git history, not included in the new source archive.

## Public website follow-up

The root now serves a public forex website rather than opening directly into the dashboard. Working routes: `/register`, `/login`, `/verify-email`, `/forgot-password`, `/reset-password`, `/dashboard`, `/status`. A further three browser tests verify public navigation, mobile layout, and real registration→verification→login HTTP workflows. Development email links use same-origin relative routes when APP_BASE_URL is not set, avoiding links to the visitor’s own localhost. All original live-provider/payment/regulatory blockers remain unchanged. No public hosting account or domain has been provisioned.
