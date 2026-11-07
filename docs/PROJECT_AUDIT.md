# Project audit — 2026-11-05

## Scope and baseline

Reviewed the customer React app, separate admin React app, Express API, PostgreSQL schema/queries, Flutter app, Docker development configuration, package manifests, and existing documentation. The worktree already contains many uncommitted changes; this audit treats the current files as the baseline. No production database or running deployment was inspected.

Diagnostics before repairs: customer cart tests 6/6 passed; customer lint passed with three warnings; customer TypeScript/build passed with a large-chunk warning; admin TypeScript/build passed; admin lint failed because it traverses `node_modules`; Flutter analyze and 8 tests passed; `docker compose config --quiet` passed. Backend API tests were not run because they start a server, seed data, and create records in the configured database. Docker containers were not started.

## Confirmed issues

| ID | Severity | Affected files | Evidence / root cause | Proposed fix | Verification |
| --- | --- | --- | --- | --- | --- |
| SEC-01 | Critical — fixed in batch 3 | `backend/src/routes/orders.js`, `backend/src/db/database.js`, customer/mobile order clients | Order create and all lookups had no authentication middleware. The web sign-in gate was client only; phone and order ID revealed full order details. | Completed: require DB-backed customer authentication and persist `orders.customer_id`; only the owner can read customer endpoints. Existing unlinked orders remain staff-accessible only. | Anonymous, cross-customer, invalid/expired JWT, and unauthorized modification tests; admin access test; client checks. |
| DATA-01 | Critical — fixed in batch 2 | `backend/src/db/database.js` | Connection failure silently selected a transient in-memory SQL imitation. | Completed: fail startup when PostgreSQL is required; keep the test double explicit and isolated. | Startup failure test passed; live PostgreSQL integration remains unverified. |
| DATA-02 | High — fixed in batch 4 | `backend/src/routes/orders.js`, `backend/src/db/database.js` | `BEGIN`, writes, and `COMMIT` used separate `pool.query` calls, which need not share a connection. A partial order or incorrect loyalty balance could remain after a later write failed. | Completed: check out one client for the order header, items, loyalty credit, and response read; require one credited owner row; commit once, or roll back on failure. The isolated test store now rolls back failed transactions too. | Successful order, item-write failure, loyalty-write failure, missing-owner, and same-client commit/rollback tests passed. Live PostgreSQL remains unverified. |
| SEC-02 | High — fixed in batch 1 | `backend/src/server.js` | CORS origin callback accepted origins outside `CORS_ORIGINS`. | Completed: disallow unlisted browser origins. | Allowed origin has CORS header; unlisted origin does not. |
| SEC-03 | High — fixed in batch 1 | `backend/src/routes/admin/staff.js`, `backend/src/middleware/auth.js` | `authenticateStaff` accepted `staff` and `admin` on account-management routes. | Completed: require the current database role `admin` on those routes. | Staff receives 403; admin proceeds. |
| SEC-04 | High | `backend/src/config.js`, `compose.yaml` | Fallback JWT secret and initial credentials are embedded in runtime configuration. | Require non-default production secrets and document safe local setup. | Production startup rejects missing/insecure configuration. |
| API-01 | High | `admin/src/services/api.ts`, `admin/src/pages/OrdersPage.tsx`, `backend/src/routes/admin/orders.js` | Client types an order array but API returns a paginated object; status body uses `status` instead of `order_status`; payment URL does not exist. | Align client parsing, payloads, and URL with existing backend contract. | Admin order list and both updates pass API tests. |
| API-02 | High | `admin/src/services/api.ts`, backend admin catalog routes | Client uses `PUT` for PATCH-only catalog routes and calls nonexistent product `/toggle`. | Match existing PATCH routes and use product `is_available` update. | Edit and availability actions pass API tests. |
| ORDER-01 | High | `backend/src/routes/orders.js` | Unknown product IDs receive a fallback product/price; availability and customization values are not enforced. Loyalty followed submitted phone before batch 3. | Reject invalid/unavailable products and invalid options. Loyalty is now credited to the authenticated order owner as part of SEC-01. | Negative API tests and pricing tests. |
| MOBILE-01 | Medium — partially addressed in batch 3 | `mobile_app/lib/data/repositories/order_repository.dart` | Before batch 3, every create-order exception became a simulated success. HTTP errors now propagate, but network outages still return a simulated order through the normal placement flow. | Clearly distinguish offline preview from confirmed backend orders. | Offline UI identifies simulated orders; failed API requests do not appear confirmed. |
| PAY-01 | Medium | `frontend/src/components/payment/AbaKhqrPayment.tsx`, receipt | KHQR payload and payment status are demonstrative. | Preserve demo behavior and label it consistently until verified payment integration is authorized. | UI and receipt inspection. |
| QA-01 | Medium | `admin/package.json` | Plain `oxlint` scans installed dependencies; diagnostic produced dependency warnings and failed. | Restrict lint scope to source/config files. | `npm run lint` reports project code only. |
| PERF-01 | Low | `frontend/src/App.tsx`, frontend bundle | Customer build reports a 938 kB entry chunk. | Split route bundles and receipt generation when higher-priority flows are stable. | Build chunk report and route smoke test. |
| UI-01 | Low | customer checkout, receipt, rewards/profile components | Several labels use 10–11 px text; receipt uses different styling from brand tokens. | Review on real mobile sizes and improve affected components. | Keyboard and mobile viewport QA. |

## Unverified concerns

- Live PostgreSQL schema, existing records, backups, migrations, and actual connection behavior were not inspected.
- Container startup, networking at runtime, Apple Silicon image behavior, and deployed TLS/CORS behavior were not exercised.
- Browser/mobile end-to-end ordering, image loading, responsive overflow, and payment settlement were not tested. The KHQR implementation itself is explicitly demo-only.
- Build success does not prove admin workflows function; the API contract mismatches above are established by source comparison.

## Prioritized repair plan

1. **Batch 1 (completed):** SEC-02 and SEC-03. These are isolated backend authorization/configuration changes that do not change order or payment contracts.
2. **Batch 2 (completed):** DATA-01. Normal startup now fails when PostgreSQL cannot initialize; the in-memory store requires explicit test mode and an isolated database URL in tests.
3. **Batch 3 (completed):** SEC-01 only. Customer order routes now require a database-backed owner; web/mobile send bearer tokens; legacy unlinked orders remain admin-accessible.
4. **Batch 4 (completed):** DATA-02. Order writes now share one PostgreSQL client and roll back together; backend regression tests passed. Disposable PostgreSQL integration is still pending because no local service was available.
5. **Batch 5:** API-01, API-02, and QA-01 with admin workflow regression checks.
6. **Batch 6:** SEC-04, MOBILE-01, then focused UI/performance work. Maintain demo payment behavior unless a payment change is explicitly approved.
