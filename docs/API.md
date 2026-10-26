# CYPHERFX API (development v0.1)

Same-origin `/api` routes. JSON input, cookie-authenticated sessions. Errors: `{ok:false,error:{message}}`; success: `{ok:true,data}`. UTC storage. Amount inputs are decimal strings in KSh; ledger amounts are integer KES minor units. All provider secrets are server-side. Mutation requests require JSON; cross-origin requests are rejected. Exceptions: callback has provider-required Daraja response, statements return CSV, streams return SSE.

| Method | Route                                 | Authorization / request                                                                                              |
| ------ | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| GET    | `/health`                             | Public configuration health; no secrets                                                                              |
| POST   | `/auth/guest`                         | Development only; empty JSON; creates isolated virtual account                                                       |
| POST   | `/auth/register`                      | `{name,email,password,riskAccepted:true}`; password ≥12 chars                                                        |
| POST   | `/auth/login`                         | `{email,password}`                                                                                                   |
| POST   | `/auth/forgot`                        | `{email}`; generic response; dev-only `developmentLink`                                                              |
| POST   | `/auth/verify`                        | `{token}`; one use, 1 hour                                                                                           |
| POST   | `/auth/reset`                         | `{token,password}`; one use; revokes all sessions                                                                    |
| POST   | `/auth/logout`                        | Authenticated; revokes current session                                                                               |
| GET    | `/state`                              | Own user, virtual metrics, real wallet, positions, orders, deposits, withdrawals, notices and tickets                |
| GET    | `/market?symbol=EUR_USD&timeframe=1h` | Authenticated; genuine provider or explicitly marked synthetic fixtures                                              |
| GET    | `/market/stream?symbol=EUR_USD`       | Authenticated SSE; quote every 5 seconds; session expiry/revocation and account status rechecked before every update |
| POST   | `/demo/orders`                        | `{symbol,side:BUY\|SELL,type:MARKET\|LIMIT\|STOP,lots:"0.10",price?,stopLoss?,takeProfit?,key:uuid}`                 |
| POST   | `/demo/close`                         | `{id:positionUuid}`; own demo only                                                                                   |
| POST   | `/demo/cancel`                        | `{id:orderUuid}`; own pending demo only                                                                              |
| POST   | `/demo/sync`                          | Own practice pending fills and SL/TP touch checks                                                                    |
| POST   | `/demo/reset`                         | Once/hour, requires no open practice positions                                                                       |
| POST   | `/live/orders`                        | Eligible/approved real user; currently 503 unavailable                                                               |
| POST   | `/deposits`                           | Eligible real user; `{amount:"1000",phone:"254712345678",key:uuid}`; KSh 100–250,000; whole shillings for STK        |
| POST   | `/payments/callback`                  | Public provider evidence ingestion; `{Body:{stkCallback:{CheckoutRequestID,ResultCode,...}}}`; **no ledger credit**  |
| POST   | `/withdrawals`                        | Eligible real user; `{amount:"1000",phone:"254712345678",key:uuid}`; reserves atomically                             |
| POST   | `/admin/withdrawals/review`           | SUPER_ADMIN only; `{id,decision:APPROVE\|REJECT,reason,password,otp}`; fresh MFA; no own approval                    |
| GET    | `/admin/overview`                     | Role-filtered operational read views; customers forbidden                                                            |
| POST   | `/admin/users/status`                 | SUPER_ADMIN/COMPLIANCE; `{id,status,reason}`; customer status only; revokes sessions                                 |
| POST   | `/support`                            | `{subject,message}`; own private customer ticket                                                                     |
| POST   | `/notifications/read`                 | Marks own notifications read                                                                                         |
| POST   | `/profile`                            | `{name,timezone}`; accepted zones enumerated in route schema                                                         |
| POST   | `/sessions/revoke`                    | Revokes every current user's session                                                                                 |
| GET    | `/statement`                          | Own immutable-ledger CSV; minor KES units                                                                            |

## Supported practice symbols/timeframes

EUR_USD, GBP_USD, USD_JPY, AUD_USD, USD_CHF, USD_CAD. 1m, 5m, 15m, 1h, 4h, 1d. Provider instruments and entitlement still need production discovery/validation.

## Permission boundaries

- Customer ownership is taken from the server session, never body.user_id.
- All money eligibility requires active + verified email + KYC verified + platform regulatory flags. There is no customer-controlled KYC setter.
- Finance/Auditor view ledger, deposits, withdrawals and audit. Support sees account status and tickets, no withdrawal approval. HR sees staff profiles only. Trading Ops sees provider health only. Compliance sees customer/KYC status and may restrict customer accounts.
- Reviews recheck SUPER_ADMIN at the service layer and database review trigger. TOTP+password is required at the HTTP boundary.
- No API exists for crediting balances, marking paid, deleting financial records, changing roles, bypassing KYC, or dispatching a payout.

## Internal-only operations

`settleVerifiedDeposit`: independently verified receipt evidence required. `reviewWithdrawal`: called after HTTP step-up. `dispatchApprovedPayout`: worker-only; requires configured adapter, runtime flags and immutable matching review. `confirmPayout`: trusted reconciler-only; requires an already recorded matching provider reference and explicit approval.

## Not implemented

Live order cancellation/reconciliation, independently authenticated payment receipt/payout reconciliation endpoints, OAuth, self-service MFA enrollment, KYC uploads/provider callbacks, role-request approvals, staff message APIs, ticket replies/assignment and rich statements. These are not silently represented as working endpoints. See delivery matrix.

## Dynamic public website endpoints

These endpoints are read-only or educational; they cannot authorize trades or move funds.

| Method | Route                                        | Behavior                                                                                                                                                                                                                                                        |
| ------ | -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/public/config`                             | Public instrument catalog, configured virtual starting balance, unavailable live-service flags                                                                                                                                                                  |
| GET    | `/public/session`                            | Optional current-session name/role/practice indicator only; private no-store; no balances or email returned                                                                                                                                                     |
| GET    | `/public/market?symbol=EUR_USD&timeframe=1h` | Six quotes and selected historical candles. Default is explicitly synthetic, historical replay (one candle every five seconds, 70-step looping replay). `sequence` is a replay update identifier, not provider execution evidence. No ledger or wallet effects. |
| POST   | `/public/calculator`                         | `{symbol,lots:"0.10",leverage:10\|30\|50\|100}`; server-side Decimal educational estimate of margin and pip value. Always synthetic reference; never an order or live margin quote.                                                                             |

`ENABLE_PUBLIC_MARKET_DATA=false` by default. Public provider data is separately opt-in only after redistribution rights are confirmed. Enabling it without valid configured provider credentials fails closed. Credentialed provider data is cached briefly on the server to reduce request fan-out; this is not a production distributed feed gateway. Errors remain visible; no synthetic data silently replaces a failed provider feed. Public replay prices are intentionally separate from the practice execution service. Browser polling pauses in hidden tabs; manual pause freezes the preview, and an explicit refresh may fetch while paused. Favorites and selected symbol/timeframe persist locally on the visitor’s device.
