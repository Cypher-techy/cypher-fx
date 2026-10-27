# CYPHERFX development delivery — 26 October 2026

## Status

Latest UI milestone: concise chart-first website with `/markets`, `/accounts`, `/tools` and `/help`. Current verification: **27 unit/domain tests and 16 browser tests**. Earlier phase descriptions and counts below are historical; the latest milestone at the end supersedes the long landing-page layout.

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

## Dynamic website update

The public website now uses real HTTP endpoints rather than static market illustrations. The homepage includes a polling market explorer (5-second synthetic replay by default), pair/timeframe selection linked to the hero, zoomable candlesticks, bid/ask/spread, explicit source and failure warnings, manual pause/resume/refresh, searchable regional filters, locally saved favorites, last market preferences, a Details view, and pair-preserving links into `/dashboard`. No public quote is execution evidence.

Account comparison tabs switch visible cards; the starting virtual balance loads from server configuration. Website navigation recognizes existing sessions without exposing private balances. The margin/pip estimator is validated and calculated with Decimal on the server, uses a synthetic reference, and cannot trade or change wallets. FAQ search includes empty states. Sticky navigation, reading progress, reveal transitions, and back-to-top respect reduced-motion settings.

No schema migration or real-money state transition is introduced. Additional validation: **27 total unit/domain tests, 10 browser tests**, production build and typecheck pass. Browser tests cover replay updates/pause, pair/timeframe selection, dashboard deep-link symbol, filters/favorites persistence, account tabs, FAQ search, server estimates, session-aware navigation and visible provider failure. Original live-money/provider/legal/recovery limitations remain unchanged.


## Concise trading-first refinement

**Design brief:** shorter NadsFX-style entry, with applicable Eatnaked-inspired editorial hierarchy, pill controls, subtle transitions and clear exploration paths. The exact supplied `eatnaked.com` did not respond here; the accessible `eatnaked.co` was reviewed instead, alongside `nadsfx.com`. CYPHERFX retains independent branding, layout and assets; no reference site's code, product imagery, online-user counts, winners or financial claims were copied.

### Changed files and behavior

- `src/components/website.tsx`: replaces the long marketing scroll with a brief headline, primary chart, pair/timeframe controls, source/failure labels and order panel. No carousel or fake preloader obstructs the chart.
- `src/components/website/{landing.css,public-shell.tsx,brand.tsx}`: forest/ivory/lime palette, typographic hierarchy, pill controls, responsive navigation, compact footer and reduced-motion-aware transitions.
- `src/components/website/{use-context.ts,use-market.ts}`: shared session/configuration, persisted market preferences and conditional polling (no unnecessary market polling on account/help/tools pages).
- `src/components/website/{details.tsx,content.ts}` and `src/app/{markets,accounts,tools,help}/page.tsx`: existing functional explorer, estimator, account comparison and FAQs moved to focused routes rather than removed.
- `src/components/website/order-ticket.tsx`: Buy/Sell, volume presets and optional SL/TP. Explicit Review creates/uses a development practice session, retrieves an authenticated practice-engine quote and shows a focus-trapped confirmation dialog. Only explicit confirmation calls the existing demo order endpoint, with a stable per-review idempotency key. Fill feedback uses the returned persisted order, never the homepage replay. The portal dialog survives desktop→mobile resize; Escape, focus restoration and scroll lock are supported. The Real tab remains an unavailable notice with no real-money API call.
- `src/components/workspace.tsx` and explorer links: validated instrument plus `view=terminal`/`view=support` deep links. Auth/status imports use the shared brand module. Metadata and README/API documentation updated.
- `tests/e2e/{website,dynamic-website,trading-landing}.spec.ts`: updated navigation coverage and five additional tests for review/confirmation with real-wallet isolation, locked real mode, mobile/keyboard navigation, execution-feed failure and server rejection of invalid stop loss.

**Schema / financial services:** no migration, financial service change, real-money enablement or public authorization change. The chart replay is read-only and explicitly synthetic; it is distinct from the authenticated execution quote shown at order review. Demo execution remains simulated, with all existing server-side ownership, margin, risk and ledger separation intact. Local automatic guest sessions remain development-only.

**Verification:** typecheck, 27 unit/domain tests, 15 browser tests and production build pass. Desktop/mobile screenshots show no runtime or hydration errors; width checks include 320, 360, 390, 621, 768, 1024 and 1440 pixels. The first concurrent production build did not complete within its wait window; an isolated production build with a bounded Node heap completed successfully. The live preview is restarted after build verification.

**Local preview storage note:** the restored embedded practice database could not initialize. The server was stopped, its original files were preserved (not deleted) at `.data/postgres-preserved-20261026`, and the development preview initialized a fresh `.data/postgres`. Existing browser sessions from the previous local data set may require a fresh sign-in or new practice session. These private/test database files are not included in the source archive. No real customer funds are enabled in this environment.

**Limitations / next milestone:** this is a functional development website, not an authorized live brokerage. The existing provider, payment, KYC/security, legal and managed-database recovery requirements above remain open. Next: stakeholder visual sign-off, then credentialed sandbox/provider integration and production-readiness verification—not real-money enablement.


## Blue-and-black UI update

The green/forest palette is superseded by black/charcoal surfaces, electric-blue primary actions and slate-blue secondary text. Updated `website.css`, `website/landing.css` and `globals.css` cover the landing page, market explorer, account comparison, calculator, help, status, authentication forms and trading workspace. Embedded SVG accents in the explorer/workspace and the shared `price-chart.tsx` now use blue; falling candles and financial warnings keep distinct semantic colors. Public charts use a matching dark background. The workspace defaults to dark mode on first visit while respecting an explicit saved light preference. Layout, order-confirmation flow and provider/financial gates are unchanged.

No schema migration or financial calculation/authorization change. Theme regression coverage was added in `tests/e2e/theme.spec.ts`; the workspace theme-toggle test now verifies the dark default and switch to light. Verification: **16 browser tests, 27 unit/domain tests, typecheck and production build pass**; desktop/mobile screenshots show no browser errors or horizontal overflow.

Preview-only storage limitation: the restored file-backed PGlite store still cannot initialize. Its files have not been deleted, renamed or overwritten for this update. Browser validation and the running development preview use the existing `TEST_DB=true` option to isolate practice accounts in memory. Preview demo users, positions and support data are therefore temporary and reset when the server process stops. Normal source-code storage defaults and production PostgreSQL requirements are unchanged. Database recovery remains a separate outstanding task.

The next milestone is visual sign-off on the blue/black palette. This update does not enable live trading or real-money payments.
