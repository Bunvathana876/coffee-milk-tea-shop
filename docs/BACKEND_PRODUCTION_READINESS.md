# Backend production readiness audit

Audit date: 2026-11-15. Scope: `backend/` and its React, management portal, and Flutter API consumers. No deployment, migration, seed, or data mutation was performed against `coffee_shop`, Render, or Neon.

## Architecture and contracts

`src/server.js` mounts public catalog and health routes, customer authentication and orders, admin routes, and seller routes. `src/config.js` reads environment settings. `src/db/database.js` owns the PostgreSQL pool, development schema creation, transactions, and the isolated in-memory test database. `src/db/seed.js` contains demo data. Production and staging startup verify versioned migrations instead of creating schema. The SQL migrations live in `backend/migrations/`.

The Flutter client calls `/api/health`, `/api/categories`, `/api/products`, `/api/orders`, and `/api/auth`. It expects JSON lists for catalog endpoints and numeric `base_price_usd`; the product shape retains `id`, `category_id`, `name`, `description`, `image`, `base_price_usd`, and `is_available`. React clients use the same catalog and auth contracts. No favorites or server cart API exists; those are client state. The backend owns order creation and history. Seller order routes are read-only. KHQR remains a demo payment choice, and mobile offline simulated orders are not confirmed backend orders.

## Confirmed findings by severity

| Severity | Finding and impact | Status |
| --- | --- | --- |
| Critical | No confirmed Critical defect in the inspected paths. | — |
| High | Development startup called the demo seed on every restart. Missing sample products and a default admin could reappear in a customized catalog. | Fixed: startup no longer seeds; explicit demo seeding refuses a nonempty catalog. |
| High | Admin product deletion could null out `order_items.product_id` for historical orders. | Fixed: deletion locks the product and returns 409 if an order item references it. Mark such products unavailable instead. |
| High | The actual local database has no `schema_migrations` or `payment_settlements` table. Production-mode startup correctly fails closed against it. | Staging database migration and rehearsal remain required. No migration was applied to the local database. |
| Medium | Authentication inputs were weakly bounded and login routes lacked throttling. A malformed or oversized body could cause avoidable work or a 500 response. | Added bounded inputs, per-process authentication throttling, 64 KiB body limits, and JSON 413/422 responses. |
| Medium | Public product filters and route IDs accepted malformed values such as `1junk`, or let bad numeric filters reach PostgreSQL. | Fixed with strict validation and 400 responses. |
| Medium | Production database URL validation allowed remote TLS modes whose future `pg` semantics could weaken verification; invalid pool settings could reach startup. | Remote production/staging URLs now require `sslmode=verify-full`; port, pool, timeout, exchange rate, and JWT lifetime are validated. |
| Medium | Customer token expiry response was hardcoded to seven days even when the configured JWT lifetime changed. | Fixed: `expires_in_minutes` matches bounded `JWT_EXPIRES_IN`. |
| Low | Standard browser hardening headers and explicit proxy trust were absent. | Added minimal headers, disabled `X-Powered-By`, and trusted one proxy hop in staging/production. |
| Low | A port bind failure could emit an unhandled server error during startup. | Startup now rejects cleanly; the Render process can fail and report the port conflict. |

## Existing protections retained

Customer, staff, admin, and seller JWT roles are checked against active database accounts. Admin routes require backend authorization. Customer order reads check `orders.customer_id`. Order creation validates products, availability, options, and quantities; it computes prices and totals from catalog values in one transaction. Optional idempotency keys prevent duplicate orders on retries. Cash settlement requires an admin confirmation and receipt reference; KHQR is never automatically marked paid. SQL inputs in inspected routes use parameters. API failures return JSON without stack traces or secrets.

## Database and catalog safety

A read-only connection to local `coffee_shop` on port 5433 reported 33 products, 7 categories, 7 orders, and 9 customers. Twenty products had Cloudinary URLs and 13 had other HTTPS image URLs. All 33 stored image values were present and syntactically valid HTTPS URLs. This verifies URL syntax and API passthrough, not image availability on Cloudinary. A read-only HTTP startup returned 200 from `/api/health`, `/api/ready`, `/api/categories`, `/api/products`, and `/api/products/:id`; a Cloudinary image URL and the required product fields matched between list and detail responses. Product count was 33 before and after. No prices, product IDs, or URLs were changed.

Development startup still runs idempotent `CREATE TABLE IF NOT EXISTS` and `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` statements in `initSchema`; it no longer seeds data. Staging/production startup only verifies migration records and audit triggers. Demo seeding is a separate `npm run seed` action for an empty development catalog and requires a unique administrator password outside tests. Never run it against the existing `coffee_shop` catalog.

## Verification performed

- Baseline backend tests: 124 passed before edits. Final isolated backend suite: 133 passed, 0 failed. Tests use loopback port 1 and an in-memory database for API writes; they did not write to `coffee_shop`.
- Regression checks cover no startup seed, refusal to seed a populated catalog, historical product deletion, malformed filters, bounded registration, oversized bodies, auth throttling, production TLS/port validation, and JWT expiry.
- Read-only local PostgreSQL and HTTP checks passed for health, readiness, categories, products, Cloudinary URL passthrough, and unchanged product count.
- Targeted Flutter catalog and ordering reliability tests passed (18 tests using mocked HTTP responses). This checks client parsing and retry behavior, not a real device or live order submission.
- Production-mode startup was exercised against the local database with PostgreSQL default transactions forced read-only. It failed closed because the versioned migration prerequisites are absent. No production/staging database was contacted.
- The configured local port is 8003, and an existing listener there returned HTTP 200 from `/api/health`. It was left running; the updated code was started on an ephemeral port for the read-only check.
- The local runtime was Node 25.8.0. `Dockerfile.production` targets Node 22; a Node 22 CI or disposable staging run remains necessary before release.

## Remaining risks and release verdict

1. **Staging deployment readiness: No.** First rehearse the existing migrations on a disposable PostgreSQL copy and confirm the exact staging schema, then run real PostgreSQL order, idempotency, settlement, and rollback tests. The memory-backed API suite does not replace this integration gate.
2. Review the 13 non-Cloudinary catalog entries against the intended 20-drink menu. This audit intentionally did not delete or change them.
3. The authentication limiter is per process. Multiple Render instances need a shared rate-limit store or edge-level protection. Reverse-proxy trust assumes exactly one trusted Render proxy hop and should be checked in staging.
4. Cash settlement is an administrator attestation with a receipt reference, not independent payment-provider verification. KHQR has no verified payment integration.
5. The existing development schema bootstrap and versioned production migrations follow different paths. A schema snapshot and compatibility rehearsal are required before moving any real data.
6. No live Render, Neon, Cloudinary delivery, or Flutter device end-to-end test was performed.
7. Legacy checkout requests without an `Idempotency-Key` can still create duplicate orders after a retry. Current web and Flutter paths send keys, but the header remains optional for compatibility. Order history has no pagination, and no stock table or inventory reservation exists.
8. Customer and staff account creation still accept six-character passwords to preserve current client behavior. Raise this policy together with client validation and a transition plan for existing accounts before a public launch.

See [RENDER_BACKEND_DEPLOYMENT_GUIDE.md](./RENDER_BACKEND_DEPLOYMENT_GUIDE.md) for future release steps.
