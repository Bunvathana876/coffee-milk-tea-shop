# Project fix progress

Master update: transactional administrator cash settlement, immutable audit migration 002, production startup migration verification without schema/seed mutation, guarded archive tools and production containers added. Current suites: backend 42, portal 11, customer 7, Flutter 25. See MASTER_IMPLEMENTATION_PROGRESS.md for incomplete phases and FINAL_PRODUCTION_READINESS_REPORT.md for readiness limits.

Updated: 2026-11-06. Detailed issue evidence and priorities are in [PROJECT_AUDIT.md](PROJECT_AUDIT.md). Production deployment requirements are in [PRODUCTION_READINESS.md](PRODUCTION_READINESS.md).

## Confirmed issues and completed fixes

| ID | Status | Result |
| --- | --- | --- |
| SEC-02 | Fixed in batch 1 | The Express CORS callback no longer approves origins absent from the configured allowlist. Requests without a browser `Origin` remain supported for mobile and command-line clients. |
| SEC-03 | Fixed in batch 1 | Staff-account routes now require the current database-backed staff role to be `admin`. Other existing staff routes retain their prior access policy. |
| DATA-01 | Fixed in batch 2 | PostgreSQL initialization failure now prevents normal API startup. The in-memory store is available only with both `NODE_ENV=test` and `ALLOW_IN_MEMORY_DB=true`; the API tests set an unreachable local database URL before importing the app. |
| SEC-01 | Fixed in batch 3 | Customer order routes now require a current, active customer JWT verified against the database. New orders store `customer_id`; ID, reference, and phone lookups only return orders linked to that customer. Staff order routes retain DB-backed staff authorization. |
| DATA-02 | Verified in production readiness phase 2 | Order header, items, loyalty credit, and response read run on one checked-out PostgreSQL client. A disposable PostgreSQL integration test confirmed concurrent idempotency and rollback after an injected item failure. |
| SEC-04 | Fixed in production readiness phase 1 | Production startup now requires explicit database, JWT, administrator bootstrap, and CORS configuration, rejects known development credentials and weak secrets, and fails before schema initialization or seeding. |
| STAFF-01 | Fixed in production readiness phase 1 | Staff JWTs are accepted only while the current database row is active, has a supported `admin` or `staff` role, and matches the token role. Staff account creation and role updates reject unsupported roles; seller access stays disabled. |
| ORDER-01 | Fixed in production readiness phase 2 | The order API rejects unknown, inactive, or unavailable products and invalid quantities/customizations; all names and monetary totals come from the server. |
| ORDER-02 | Fixed for keyed requests in production readiness phase 2 | A customer-scoped database key returns the same order on matching retries, including concurrent requests, and rejects changed payloads. Older requests without a key remain accepted. |

## Remaining issues

- High: API-01/API-02 (archived admin API mismatches; align contracts when building active portal pages).
- Medium/low: PAY-01, QA-01, PERF-01, UI-01. MOBILE-01 is addressed in production readiness phase 3. See the audit for original evidence.

## Files changed for batch 1

- `backend/src/server.js`
- `backend/src/middleware/auth.js`
- `backend/src/routes/admin/staff.js`
- `backend/test/security.test.js` (new)
- `docs/PROJECT_AUDIT.md` (new)
- `docs/PROJECT_FIX_PROGRESS.md` (new)

## Files changed for batch 2

- `backend/src/db/database.js`
- `backend/test/api.test.js`
- `backend/test/databaseStartup.test.js` (new)
- `docs/PROJECT_AUDIT.md`
- `docs/PROJECT_FIX_PROGRESS.md`

## Files changed for batch 3

- `backend/src/db/database.js` — nullable owner foreign key and index for new and existing schemas; test-memory mapping.
- `backend/src/routes/orders.js` — customer guard, owner checks, and authenticated loyalty credit.
- `backend/test/api.test.js` — order ownership and authorization regression coverage.
- `frontend/src/services/api.ts` — bearer token on customer order requests.
- `mobile_app/lib/data/services/api_service.dart`, `mobile_app/lib/providers/user_provider.dart` — bearer token on mobile order requests.
- `mobile_app/lib/data/repositories/order_repository.dart` — do not treat HTTP authentication errors as offline orders.
- `mobile_app/test/unit/api_service_auth_test.dart` — request header and error-handling regression tests.
- `docs/PROJECT_AUDIT.md`, `docs/PROJECT_FIX_PROGRESS.md`, `AGENTS.md` — architecture and progress notes.

The working tree contained extensive pre-existing uncommitted changes, including the current backend and admin files, before batch 1. Batch 3 touched only the files listed above. During batch 1, the Flutter test command automatically resolved packages and reported updates to `mobile_app/pubspec.lock` and `mobile_app/analysis_options.yaml`; these files are inside an already untracked `mobile_app/` tree, so Git cannot distinguish those diagnostic side effects from its prior state. Batch 3 Flutter checks used `--no-pub`.

## Files changed for batch 4

- `backend/src/db/database.js` — single-client PostgreSQL transaction helper and rollback support in the isolated test store.
- `backend/src/routes/orders.js` — order, item, loyalty, and response-read queries share one transaction.
- `backend/test/api.test.js` — success/payment defaults and failed item/loyalty write regression tests.
- `backend/test/transaction.test.js` (new) — same-client commit and rollback tests.
- `docs/PROJECT_AUDIT.md`, `docs/PROJECT_FIX_PROGRESS.md` — issue and verification status.

## Production readiness phase 1 — staff authorization and configuration

- `backend/src/middleware/auth.js` checks the current database role against the supported role set and the JWT role on every staff request. An active administrator or staff member retains existing authorized access; a disabled, unsupported, or role-changed account is rejected.
- `backend/src/routes/admin/auth.js` refuses to issue new staff tokens for unsupported database roles. `backend/src/routes/admin/staff.js` accepts only `admin` and `staff` in create and role-update requests. The existing administrator guard still protects staff-account management.
- `backend/src/config.js` validates production settings without including their values in errors. `backend/src/server.js` runs validation before connecting to PostgreSQL, changing schema, or seeding. Development defaults remain available outside production. `compose.yaml` can pass an explicitly selected `ENVIRONMENT`; its default remains development.
- The isolated in-memory test store now recognizes the existing case-insensitive staff-email query so HTTP role tests can exercise normal staff creation. PostgreSQL connection logging no longer includes the database URL. No PostgreSQL schema or account password was changed.
- Added HTTP regression coverage for administrator and ordinary staff access, disabled accounts, unsupported roles, role changes after token issuance, forbidden staff account mutations, and continued customer authentication. Added production configuration and startup rejection tests.
- Verification: backend `npm test` passed **26/26** in the explicitly isolated test database; `node --check` passed for all changed JavaScript files. Backend has no configured lint script. No live PostgreSQL, Docker container, customer web build, or Flutter runtime was used in this phase.

## Production readiness phase 2 — orders and transactions

- Root causes: order creation previously fell back to a default name/price when a catalog ID was missing, accepted unavailable products and unrecognized customizations, parsed partial quantity strings, and had no request-level duplicate guard. Client prices were already ignored, and the existing transaction helper already kept order, items, and loyalty on one PostgreSQL client.
- `backend/src/utils/orderValidation.js` now validates the order body, catalog ID, bounded quantity, payment method, USD currency, supported customization values, and known fields. `backend/src/utils/calculations.js` exposes integer-cent pricing and creates ten-character cryptographic order-reference suffixes; existing reference formats still resolve. `backend/src/routes/orders.js` reads and locks current product/category rows, computes totals from catalog prices, and returns consistent 400/409/422 errors. `backend/src/middleware/errorHandler.js` sanitizes malformed JSON and unexpected server errors without echoing request bodies. `backend/src/server.js` permits the browser idempotency header through CORS.
- `backend/src/db/database.js` adds the `order_idempotency` table and matching isolated-memory behavior. A unique customer/key reservation is committed atomically with the order, its items, the loyalty update, and the reservation's order link. A matching retry returns the same order; a changed payload gets 409. No existing order row or reference is changed.
- `frontend/src/pages/CheckoutPage.tsx`, `frontend/src/services/orderService.ts`, and `frontend/src/services/api.ts` send and reuse a key for retries of an unchanged payload, including a page refresh within the browser session. Session storage holds only the payload fingerprint and key, not customer details. `mobile_app/lib/data/repositories/order_repository.dart` and `mobile_app/lib/data/services/api_service.dart` reuse a key for the current repository lifetime. The existing Flutter offline preview behavior is unchanged and is still not a confirmed backend order.
- `backend/test/api.test.js` covers malformed bodies, catalog availability, customization and quantity bounds, server pricing, web/Flutter request shapes, ownership, duplicate/concurrent requests, conflicts, rollback, loyalty, and browser preflight. `backend/test/orderPostgres.integration.js` checks the additive legacy schema, true PostgreSQL concurrency, owner scope, and rollback in an explicitly disposable database. `mobile_app/test/unit/api_service_auth_test.dart` checks the header and retry key reuse.
- Database change: a new `order_idempotency` table is created on normal startup if absent. There is no data backfill or destructive operation. During this batch, only a locally created temporary PostgreSQL cluster was used and removed; existing PostgreSQL data and Docker volumes were not touched. Review the additive DDL before deployment because this project has no versioned migration system.
- Verification: backend suite **31/31**, disposable PostgreSQL integration **2/2**, customer web tests **6/6**, and Flutter tests **12/12** passed. Customer web TypeScript/build and lint passed with existing warnings; Flutter analysis passed. Phase 1 security tests remained green.
- Remaining risks: old clients without a key can still duplicate orders; pending Flutter keys are not persisted across app restarts; idempotency rows currently have no retention job; Flutter offline previews can appear in local history. The next phase should address mobile order truth and history, then portal integrations and versioned migrations.

## Production readiness phase 3 — Flutter order reliability

- Root causes: network failures returned a fabricated `CAF-` order through the normal placement path; checkout then cleared the cart, opened tracking, and credited local stamps. The in-memory idempotency key vanished on restart. History treated only `CAF-` text as a reference, while backend-created orders use `ORD-`. The mobile default host pointed to port 8000, and local/server loyalty balances were merged with `max()`.
- `mobile_app/lib/data/repositories/order_repository.dart` now returns only parsed server orders, persists a customer-scoped SHA-256 payload fingerprint and retry key before submission, reuses it across restarts, and clears it after server confirmation. `mobile_app/lib/data/models/offline_order_preview.dart` represents only a local estimate, without a server ID, reference, status, or payment. `mobile_app/lib/data/services/local_storage_service.dart` stores pending keys, confirmed server stamps, and account identity separately from earlier device-only stamps. The `crypto` package became a direct dependency in `mobile_app/pubspec.yaml` and lockfile.
- `mobile_app/lib/data/services/api_service.dart` sends the selected payment method, validates server order responses, treats empty bodies as errors, and adds owner-list retrieval. `mobile_app/lib/providers/order_provider.dart` has explicit preview/pending/failed/confirmed submission state, prevents duplicate in-flight sends, clears cached orders on session changes, and routes `ORD-` and historical `CAF-` references correctly. `mobile_app/lib/providers/user_provider.dart` displays server loyalty balances from authentication and `/me`, preserves earlier local counts as unverified history, and blocks local-only sessions from confirmed checkout.
- `mobile_app/lib/ui/features/cart/widgets/checkout_sheet.dart` keeps the cart after any unconfirmed submission, shows a retry message, and opens tracking only after confirmation. `mobile_app/lib/ui/features/orders/screens/order_history_screen.dart` shows server-only owner history and correct reference/phone lookup. `mobile_app/lib/ui/features/orders/screens/order_tracking_screen.dart` hides prior-account details after a session change and states whether the café confirmed payment. `mobile_app/lib/ui/features/profile/screens/profile_screen.dart` labels confirmed and earlier device-only stamps without claiming a redeemable reward. `mobile_app/lib/core/config/app_config.dart` changes development defaults to port 8001 and requires an explicit release API URL; `main.dart` and `user_provider.dart` ensure saved development overrides cannot replace the release URL. `mobile_app/README.md` documents this.
- `backend/src/routes/orders.js` adds authenticated `GET /api/orders` for the current customer's linked orders. `backend/test/api.test.js` verifies owner scope and anonymous denial; no schema or database data changed.
- Regression coverage in `mobile_app/test/unit/order_reliability_test.dart` and `api_service_auth_test.dart` exercises network/auth failure, cart retention, empty and partial success responses, empty history bodies, duplicate submits, restart retries, changed payload keys, late-response key isolation, reference routing, earlier-session response isolation, server API shapes, and loyalty reconciliation. A valid server order response is required before checkout accepts status or payment fields, and a late confirmation clears only its own pending key. Verification: Flutter **25/25** tests, clean Flutter analysis, backend **31/31** tests. No live PostgreSQL, Docker volume, deployment, commit, or push was used.
- Remaining risks: older device-only stamp balances are retained but cannot be promoted without verification; local-only authentication still exists for offline browsing but cannot submit a confirmed order; a changed cart after an uncertain submission needs review before retry; owner history has no pagination. Next phase: management portal API integration and payment-status policy, followed by store ownership and versioned migrations.

## Verification

- New backend security tests: 2/2 passed. They check allowlisted and unlisted CORS origins and admin versus staff roles.
- Full backend suite with `DATABASE_URL` overridden to an unreachable local port: 8/8 passed using the repository's in-memory fallback. No configured PostgreSQL database was touched. This does **not** verify PostgreSQL transaction behavior.
- `node --check` passed for the three changed backend source files.
- Before the batch: customer cart tests 6/6 passed; customer lint passed with three warnings; customer and admin TypeScript/build passed; Flutter analyze and 8 tests passed; `docker compose config --quiet` passed.
- Admin `npm run lint` failed because it scans installed dependencies. Customer build warned about a large entry chunk.
- `git diff --check` found a pre-existing trailing blank line in `frontend/src/types/index.ts`, outside this batch. No changes were made to that file.

### Batch 2 verification

- `npm test` in `backend/`: 9/9 passed. The API suite forces an unreachable local URL and opts into test-only memory storage; the new startup test sets production mode and confirms initialization rejects the same unreachable URL even when the memory opt-in flag is present.
- `node --check` passed for the changed database module and both affected test files.
- No PostgreSQL service or Docker container was started. The suite did not use the configured database URL or modify existing database records.

### Batch 3 verification

- Backend `npm test`: 10/10 passed in the explicitly isolated in-memory test store. Tests cover anonymous requests, own and cross-customer ID/reference/phone lookups, invalid/expired JWTs, nonexistent database-backed identities, denied customer status changes, and verified admin access.
- Customer web TypeScript/build passed; lint passed with the same three warnings and the existing large-bundle warning remained.
- Flutter `analyze --no-pub` passed; `test --no-pub` passed 11/11, including bearer-header, rejected-auth, and offline-preview checks.
- Customer web cart tests passed 6/6.
- Backend `node --check` passed for changed route and database modules. No live PostgreSQL, Docker service, or payment integration was run.

### Batch 4 verification

- Backend `npm test`: 16/16 passed. The isolated API suite verifies successful server-calculated totals, one loyalty credit, unchanged `cash`/`unpaid`/`pending` order defaults, full rollback after a later item or loyalty write fails or the owner row is missing, and the existing admin payment-status update. Customer ownership/authentication tests remain green.
- Transaction helper tests verify that `BEGIN`, writes, and `COMMIT` or `ROLLBACK` use the same client, and the callback executes only once. These tests use a fake client and do not prove live PostgreSQL behavior.
- Customer web tests: 6/6 passed. Customer TypeScript/build passed; lint passed with the same three warnings. The existing 938 kB entry-chunk warning remains.
- `node --check` passed for both changed backend modules and both affected test files. Flutter was not retested because no mobile or API contract changed in this batch.
- `docker compose ps --status running --services` showed no running Compose services; `pg_isready` reported no response at `127.0.0.1:5432`. No PostgreSQL integration or live `orders.customer_id` schema check was possible. No database records, Docker volumes, or payment behavior were changed.

## Known risks and next actions

- The additive `orders.customer_id` column will be created on the next normal backend startup. Existing order rows remain unlinked and are visible through staff order routes, but customer ID/reference/phone lookups will return only newly linked orders. No old order is backfilled by phone because phone ownership is unverified. A future verified claim process could restore customer access to historical orders.
- Phase 2 verified DATA-02 and the additive `orders.customer_id` schema in a disposable PostgreSQL cluster. The project database and live records remain untested by design.
- Matching keyed HTTP retries return one order and one loyalty credit. Flutter now persists its retry key across restarts; older clients that omit `Idempotency-Key` can still create duplicate orders.
- The mobile app keeps a local cart estimate after network failure but does not create a simulated order, clear the cart, or grant confirmed loyalty. A local-only customer must sign in to the café server to place a real order.
- CORS still permits all origins when configuration explicitly contains `*`; the Phase 1 production validator requires a restricted allowlist.
- No live browser, container, or project PostgreSQL database was used. Phase 2 used a temporary local PostgreSQL cluster solely for its integration suite.
- Phase 4 completed management portal API integration and payment-status restrictions. Verified payment reconciliation, authoritative database selection, and versioned migrations remain.

## Production readiness phase 4 — management portal and payment policy

- Replaced active portal product, category, order, and analytics shells with live API screens. Added typed API calls, validated forms, catalog search/filtering, confirmation dialogs, order details and transitions, responsive table/form styles, and loading/empty/error handling. No mock catalog is used.
- Restricted dashboard, report, catalog, and order APIs to the database-backed administrator role. Catalog writes validate type and range. Order status writes use a row-locked transaction and reject unsupported transitions and all payment-status changes. KHQR remains unpaid without verified settlement.
- Dashboard and sales reports now recognize revenue only from paid, completed orders. Existing report breakdown gross totals are labeled separately from new recognized-revenue fields. Historical paid records still need reconciliation.
- Corrected the isolated memory database's DELETE dispatch and dynamic catalog updates so Phase 4 HTTP tests exercise CRUD accurately. Regression tests cover admin/staff access, catalog CRUD and validation, order listing/details/status, denied payment writes, revenue exclusions and positive historical paid/completed calculations, empty API responses, and API failures.
- Verification: backend **35/35**, management portal **11/11** and build, customer frontend **6/6**, and Compose config passed. No live PostgreSQL, Docker volume, deployment, commit, or push was used. Next phase: verified payment reconciliation and authoritative database/migration plan before seller ownership design.

## Production readiness phase 5 — payment safety and migration preparation

- Removed the customer receipt's local paid simulation. Receipt UI and PDF use only server payment status; `unpaid` no longer falls into a paid PDF branch, and cash is labeled as cash. A small shared status helper has a regression test.
- Preserved the Phase 4 API freeze on payment-status writes: repeated admin claims, staff attempts, and invalid order transitions are rejected. Cash fulfillment can complete while the payment record stays unpaid; cancelled and historical paid rows retain guarded behavior. No bank payment or manual settlement was fabricated.
- New-install `orders.payment_status` defaults to `unpaid` in schema SQL. Added a versioned, additive migration file and checksum-tracking runner restricted to a named disposable database. A temporary PostgreSQL integration test verified legacy-row preservation and repeat application, then the cluster was removed.
- Native `coffee_shop` at port 5433 was inspected through read-only metadata and has six tables without `order_idempotency`; Docker PostgreSQL at port 5432 was stopped. Neither project database was migrated, reset, seeded, or selected as authoritative. Backup/restore, drift checks, staging gates, and rollback guidance are in [DATABASE_MIGRATION_PLAN.md](DATABASE_MIGRATION_PLAN.md); payment rules are in [PAYMENT_POLICY.md](PAYMENT_POLICY.md).
- Verification: backend **38/38**; customer web **7/7** and build; management portal **11/11** and build; Compose config passed; disposable PostgreSQL migration **1/1**. The temporary cluster was stopped and removed. No deployment, commit, or push was made.
