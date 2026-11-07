# Production readiness

Current master assessment: **NOT READY — BLOCKERS REMAIN**. Audited cash reconciliation, production migration verification without schema/seed writes, readiness checks, archive tools and separate production images have been added. See FINAL_PRODUCTION_READINESS_REPORT.md and MASTER_IMPLEMENTATION_PROGRESS.md for current verification and incomplete seller/staging work. Earlier phase results below are historical.

Updated: 2026-11-06. Phases 1–4 hardened authentication, order transactions, Flutter reliability, and management operations. Phase 5 removes fabricated customer payment displays and prepares disposable-only versioned migration tooling. The full system is not yet production-ready.

## Phase 1 security behavior

- Staff access is limited to active `admin` and `staff` database rows. The current row's role must match the role in the signed JWT. A role change requires a new login; a disabled or unsupported account cannot use staff APIs.
- Staff-account management remains administrator-only. Create and role-update requests accept only `admin` or `staff`. Seller accounts and seller routes remain unavailable.
- Production configuration is checked at the beginning of `startServer()`, before PostgreSQL connection, schema setup, or seeding. A failure reports variable names and validation reasons without logging values.
- The PostgreSQL connection log omits the connection URL.
- Validation runs when either `NODE_ENV=production` or `ENVIRONMENT=production`. `NODE_ENV=test` cannot be combined with production mode, so production cannot opt into the isolated in-memory test database.

## Required production configuration

Set these variables explicitly through the deployment environment or a secret manager before starting the backend:

| Variable | Requirement |
| --- | --- |
| `DATABASE_URL` | Nonempty PostgreSQL connection URL for the selected authoritative database. |
| `JWT_SECRET` | Unique value of at least 32 characters; the development fallback and obvious placeholders are rejected. |
| `ADMIN_INITIAL_EMAIL` | Valid address different from the development bootstrap account. |
| `ADMIN_INITIAL_PASSWORD` | Unique value of at least 12 characters; the development fallback and obvious weak values are rejected. |
| `CORS_ORIGINS` | Explicit comma-separated browser-origin allowlist; `*` is rejected. |

The bootstrap administrator settings are used **only if** the configured administrator account does not already exist. Startup does not rotate or overwrite an existing account password. Store production values outside version control; do not copy local development defaults into a deployment.

`compose.yaml` is a development stack and defaults to `ENVIRONMENT=development`. Setting `ENVIRONMENT=production` now reaches the backend validator, but the Compose frontend, portal, and backend images still run development servers and bind-mount source. Use a separate production serving design.

## Verification and limits

- Backend suite: 26/26 tests passed with its configured unreachable local database URL and explicit test-only in-memory store. Tests covered supported administrator/staff access, disabled and unsupported roles, stale JWT roles, forbidden staff mutations, production setting failures, and existing customer login/order authorization.
- JavaScript syntax checks passed for every changed backend source and test file. Backend has no lint script configured.
- No live PostgreSQL transaction or migration was tested, no Docker service or volume was changed, and no production account was modified.

## Phase 2 order API contract

- `POST /api/orders` requires a current customer JWT and a JSON object with a customer name, phone, and 1–50 items. Every item needs a positive catalog `product_id` and an integer quantity from 1 to 50. Size, sugar, ice, and toppings must be supported values; omitted customization fields retain the existing defaults. Unknown order or item fields are rejected, except legacy client price hints and product names, which are accepted but ignored. A supplied `currency` must be `USD`.
- The API checks that the product exists, is available, and belongs to an active category. It locks the product and category rows while pricing and writing the order. Product names and USD prices come from the database and server customization rules. The KHR total uses the server's `USD_TO_KHR_RATE`; neither currency total nor payment status is accepted from the client. The `khqr` method remains a demonstration selection and creates an **unpaid** order.
- New web and Flutter submissions send an `Idempotency-Key` header. It is 8–128 ASCII characters and is scoped to the authenticated customer. The first committed request returns `201`; a matching retry returns `200` with the same order ID and current order state. A different normalized payload using that customer's key returns `409`. An invalid key or malformed JSON returns `400`; semantic order validation returns `422`. Authentication failures retain their existing `401` behavior. Requests without a key remain supported for older clients, but each such request can create another order.
- The normalized payload hash excludes untrusted client price and product-name hints. A successful key reservation, order header, items, loyalty credit, and key-to-order link commit in one PostgreSQL transaction. Concurrent requests for one key serialize on the unique `(customer_id, idempotency_key)` constraint. A failed transaction rolls the reservation back, so the same key can be retried.

## Phase 2 schema and verification

- Startup now creates `order_idempotency` if missing. It has a customer-scoped primary key, a request hash, and a unique nullable order foreign key. Existing `orders`, `order_items`, order references, and history are not rewritten or backfilled. New references keep the `ORD-YYYYMMDD-` prefix and use ten cryptographically generated characters to reduce collisions. This is an additive schema change to review before production startup; no live database was connected to or migrated during Phase 2.
- Backend suite: **31/31** passed in the explicit test-only in-memory store. A separate **2/2** integration suite passed against a locally created, disposable PostgreSQL cluster and database. It verified the additive `orders.customer_id` column on a legacy-shaped row, eight concurrent submissions creating one order and one loyalty credit, customer ownership, a payload conflict, unavailable-product rejection, and rollback after an injected item failure. The temporary cluster was stopped and removed after the run; Docker and the configured project database were untouched.
- Customer web tests: **6/6**; TypeScript/build and lint passed with three pre-existing lint warnings and the existing large bundle warning. Flutter tests: **12/12**; `flutter analyze --no-pub` passed. Backend syntax checks and the final diff review are recorded in the progress log.

## Phase 3 Flutter order behavior

- A network error or timeout no longer creates a simulated `OrderModel`, a `CAF-` reference, an active tracked order, or a recent-order entry. Checkout keeps the cart and presents a local estimate as an **unconfirmed preview**. Submission state distinguishes preview, in-flight pending, failed, and confirmed. Only a valid `200`/`201` server order response clears the cart and opens tracking. Empty or malformed success bodies are treated as failures, leaving the retry key and cart intact.
- Flutter persists one SHA-256 payload fingerprint and its idempotency key in SharedPreferences before sending the request. The fingerprint includes the API host, account identity, contact details, payment choice, products, quantities, and customizations; it excludes client price hints. A restart or retry of the same payload reuses the key. A changed payload gets a new key. The stored fingerprint does not expose customer details. The key is cleared only after a valid server order response.
- The backend now exposes `GET /api/orders` for all orders owned by the authenticated customer. It uses the existing database-backed customer guard and returns only owner-linked orders. Flutter's default history uses this endpoint; explicit phone searches use `/api/orders/lookup/phone`, and `ORD-` plus historical `CAF-` references use `/api/orders/ref/:reference`. No local preview is inserted into server history. Order caches and tracking views are hidden or cleared when the customer session changes.
- The backend remains authoritative for loyalty. Checkout no longer adds local stamps. Login and `/api/auth/me` set the confirmed balance; a successful order triggers a profile refresh. Earlier device-only stamp counts are retained separately and labeled unverified, without being added to confirmed rewards. The tracking screen displays server payment status and does not claim that the demo KHQR choice paid the order.
- Development API defaults now point to the Brew & Boba Express backend on port **8001** (`10.0.2.2` for Android emulators, `localhost` for iOS simulators and desktop/web). Physical devices can set a reachable host in Profile during development. Release builds require and use an explicit `BREW_BOBA_API_URL` through `--dart-define`, even if a development override was saved; no production credential or host is embedded. The [mobile README](../mobile_app/README.md) describes the setup.
- Verification: Flutter **25/25** tests passed and `flutter analyze --no-pub` reported no issues. Tests cover network and authentication failures, cart retention, preview versus confirmed state, duplicate in-flight submission, retry after repository restart, changed-payload keys, reference routing, empty or partial success responses, earlier-session response isolation, a late response preserving a newer retry key, server-shaped order/payment data, and loyalty reconciliation. The backend suite remained **31/31**, including owner-scoped list and prior authorization tests. No live database, Docker service, or payment processor was used.
- A success response must include server identity, totals, payment and order status, timestamp, and item data before checkout treats it as confirmed. Retry-key cleanup checks the submitted fingerprint and key, so a late response cannot erase a newer pending submission. Order validation errors shown in checkout use a safe customer-facing message.

## Remaining deployment gates

1. Provide a verified payment or manual reconciliation workflow before allowing any new `paid` status. Reconcile historical paid records before using reports for financial decisions.
2. Design store ownership and seller-scoped APIs before enabling seller access.
3. Select the authoritative PostgreSQL database, add versioned migrations and backups, and provide production hosting, TLS, and client API configuration. Review the additive idempotency table before deployment and plan retention/pruning for old keys.
4. Keep the idempotency header on all order clients. Older requests without it can still duplicate. A changed cart after an uncertain submission represents a new payload and may need user review before resubmission.
5. Define a verified process for any historical device-only loyalty claims; never merge them into server balances by phone alone. The owner-scoped order-list endpoint currently has no pagination.

## Phase 4 management operations and payment policy

- The active management portal uses the existing Express admin routes for category and product CRUD, reversible availability changes, order listing/details/status changes, and sales reporting. All these routes require the current database-backed `admin` role. The seller route shells remain inaccessible.
- Catalog input is validated at the API boundary: IDs, names, optional text, booleans, and finite two-decimal positive USD prices. The portal validates forms and confirms deactivation/deletion. API errors never trigger mock records.
- Order status transitions are serialized in a transaction with a row lock. Allowed moves are `pending → preparing → ready → completed`, with cancellation from pending, preparing, or ready when the order is not recorded paid. Completed/cancelled orders are terminal. The endpoint rejects any payment-status field because no verified settlement or reconciliation workflow exists. Cancelling an already paid order requires a future verified refund process.
- New customer orders remain `unpaid` even if the KHQR demo method is selected. Dashboard `total_sales_*` and report `total_revenue_*` count only paid, completed rows. Report breakdown gross totals are separate from its recognized-revenue fields. Historical paid rows may have been set before this policy and must be reconciled before financial use.
- Verification: portal tests **11/11** and build passed, backend isolated suite **35/35**, customer frontend tests **6/6**, and Compose configuration validation passed. PostgreSQL-backed admin flows, live portal interaction, and payment reconciliation were not run against the project's databases.

## Phase 5 payment safety and migration preparation

- New customer orders remain `unpaid` for cash and KHQR. The customer web receipt and exported PDF now derive payment state solely from the server order; the local “simulate paid” control was removed. The PDF treats `unpaid` as unpaid and uses the actual payment method. Flutter tracking and the management portal continue to display the server record without asserting external verification. No API payment transition is enabled; repeated settlement claims are rejected. See [PAYMENT_POLICY.md](PAYMENT_POLICY.md).
- A first additive SQL migration and checksum-tracking runner were prepared for a specifically named disposable PostgreSQL database. The migration preserves historical order rows and references, adds missing ownership/idempotency structure, and changes only the default for future payment rows. API startup is unchanged and does not run this runner. See [DATABASE_MIGRATION_PLAN.md](DATABASE_MIGRATION_PLAN.md).
- Read-only native PostgreSQL metadata at port 5433 showed six café tables and no `order_idempotency`. Docker PostgreSQL at port 5432 was stopped, so the databases could not be compared. A separate temporary PostgreSQL cluster passed the migration repeatability test and was removed. No project database or volume was changed.
- Production review: `DATABASE_URL`, administrator credentials, JWT secret, and CORS origins are validated in production mode; Compose still embeds development defaults, uses bind mounts and dev servers, and is not a production deployment. Frontend `VITE_API_URL` is build-time, Flutter release needs `BREW_BOBA_API_URL`, and the portal uses same-origin `/api`. The current health endpoint reports process health but does not check a later PostgreSQL outage. Backups, restore drills, TLS, and an authoritative database remain deployment gates.
- Verification: isolated backend tests **38/38**; customer web tests **7/7** and build; management portal tests **11/11** and build; Compose configuration passed. The disposable PostgreSQL migration test passed **1/1** after the final SQL change and its temporary cluster was removed. No project database, Docker volume, provider, or live payment was changed.
