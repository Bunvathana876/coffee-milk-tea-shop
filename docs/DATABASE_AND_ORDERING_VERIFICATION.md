# Database and ordering verification

Verified on 2026-11-15. This phase used read-only queries against local `coffee_shop` and a separately initialized, temporary PostgreSQL 18 cluster for every write. No Render or Neon service was contacted, and no project database, product, price, image, user, or order was changed.

## 1. Local catalog verification

The connection target was checked as local `coffee_shop` on port 5433 and PostgreSQL default transactions were forced read-only. Counts were unchanged before and after the disposable tests.

| Measure | Result |
| --- | ---: |
| Total products | 33 |
| Active products | 20 |
| Inactive products | 13 |
| Cloudinary image URLs | 20 |
| Active Cloudinary products | 20 |
| Active non-Cloudinary products | 0 |
| Inactive Cloudinary products | 0 |

**Exactly 20 Cloudinary drinks are active.** The 13 other products are inactive. Historical `order_items` reference product IDs **1, 2, and 18**; all three products remain present and inactive. The local database also contains an existing `products_before_cloudinary_catalog_20261115` table, which was not read for rows or modified. This verifies availability flags, URL prefixes, and references, not the business approval of each drink or remote image delivery.

A read-only HTTP startup returned exactly 20 rows from `/api/products?is_available=true`. Every row was available and carried a Cloudinary URL. The required Flutter product fields were present, and `/api/products/:id` returned the same stored image URL. Flutter and the customer Menu page both request available products; the unfiltered management catalog can still see inactive entries.

## 2. Migration status and cause

Development `getDatabase()` runs the additive baseline `initSchema()` routine. That routine creates the application tables but does not create `schema_migrations` or `payment_settlements`. Those two objects are created by the separate versioned runner in `backend/scripts/prepareMigrations.js`, which is not called at ordinary startup and refuses any target except an explicitly marked loopback database named `phase5_migration_test` on a non-project port. No migration was applied to `coffee_shop`; its missing ledger and settlement table are therefore expected from the current workflow.

The current migration inventory is:

| Version | Purpose |
| --- | --- |
| `001_order_idempotency_alignment.sql` | Adds customer ownership and the idempotency table, aligns the unpaid default, adds indexes. |
| `002_cash_settlement.sql` | Creates the cash settlement ledger, constraints, and immutable audit triggers. |
| `003_stores_and_assignments.sql` | Adds store assignments, audit logs, store ownership, and indexes. |

The runner performs a baseline column preflight, uses a transaction and advisory lock per version, records filename and SHA-256 checksum, and rejects changed checksums. Production startup checks the ledger and enabled settlement audit triggers. It does **not** verify every table, column, index, or foreign key at startup, so full drift review remains a release gate. Older optional PostgreSQL integration files still assume two migrations and contain destructive SQL assertions; they were not run under this phase's no-destructive-SQL rule.

## 3. Disposable database setup and migration results

The new `backend/test/disposablePostgresVerification.mjs` harness requires `RUN_DISPOSABLE_POSTGRES=true`. It creates a temporary native PostgreSQL 18 cluster with its own data directory, random loopback port, dedicated database named `phase5_migration_test`, generated password, SCRAM authentication, and no project volume. It stops its own process and removes its own temporary directory afterward. The script refuses to run without the explicit marker and issues no `DROP`, `DELETE`, or `TRUNCATE` SQL.

Reproduce from `backend/` with the required native PostgreSQL tools installed:

```bash
RUN_DISPOSABLE_POSTGRES=true node test/disposablePostgresVerification.mjs
```

The rehearsal confirmed an empty fresh database; migration preflight failure left it untouched; development baseline initialization created tables without demo data; and production startup failed closed before migrations. All **three** migrations applied, then ran a second time without changing ledger contents. The ledger matched all three file checksums. Required catalog, order, store, and audit indexes; idempotency primary key; settlement unique and foreign keys; and both enabled audit triggers were present. A deliberately incorrect checksum made the runner and verifier fail closed; restoring the original value restored verification. Production-mode startup, `/api/health`, and `/api/ready` passed after migration. This tests checksum failure and recovery, but a mid-file SQL failure on a production-sized copy still needs a separate rehearsal.

## 4. Real PostgreSQL ordering results

The disposable HTTP server and PostgreSQL pool passed these checks with synthetic records:

- Admin login, category and product creation, public product response fields, stored image URL passthrough, customer registration, login, and profile.
- Large drink customization with a topping: catalog base price `$2.00`, size `$0.60`, topping `$0.50`, quantity 2. The server stored `$3.10` per item and `$6.20` total despite a client-supplied `$0.01` price. The order item and customer history were present.
- Another customer received 404 for the order; a customer token received 403 from admin orders.
- Four concurrent requests with one `Idempotency-Key` produced one 201 and three 200 responses for one order ID.
- Two otherwise identical requests **without** a key produced two 201 responses and distinct order IDs. This is a confirmed legacy retry risk.
- Admin status transitions progressed through preparing, ready, and completed. A status request could not set payment to paid. A KHQR order remained unpaid, cash settlement was rejected for it, and no settlement row was created.
- A disposable `NOT VALID` check constraint rejected a new order item *after* the order row insert. The transaction rolled back the order, idempotency reservation, and loyalty credit. The API returned JSON 500 without leaking SQL details.

No synthetic payment was marked paid. Stock is not modeled or reserved in the current schema.

### Backward-compatible duplicate-order path

Keep the existing optional `Idempotency-Key` contract for older clients. Every current web and Flutter checkout attempt should generate one stable key and persist it across timeout and retry until the result is known; the backend's existing reservation already handles concurrent retries. Record the rate of no-key checkouts and update remaining clients. A later versioned API contract can require a key. A server-only content/time-window dedupe would also suppress a customer's intentional second purchase of the same drink, so it was not added. The disposable regression check explicitly preserves and documents the current no-key behavior.

## 5. Runtime, security, and compatibility

- Node **22.23.5** passed the full **133-test** backend suite. The disposable PostgreSQL rehearsal passed **19 checks** on Node 22 with PostgreSQL 18. Production-style startup failed before migrations and passed after them, both against the disposable loopback database.
- The real HTTP server returned 429 after the configured burst of invalid admin login attempts. The limiter is in process memory: counters are not shared between instances and reset on restart. Before multi-instance deployment, use a shared store or platform edge control and verify the one-hop proxy/IP assumption.
- The PostgreSQL pool stayed within its configured maximum; health and readiness returned 200. A production-mode child received `SIGTERM` and exited cleanly. The application listener and pool also closed cleanly in process.
- Targeted Flutter catalog and order reliability tests passed **18/18** with mocked HTTP. Management Portal tests passed **83/83**. Customer web tests passed **18/18**. These complement, but do not replace, a device-to-staging end-to-end check.
- No Flutter UI, customer website, Management Portal, backend response field, or live catalog data was changed.

## 6. Files changed and remaining blockers

This phase added only `backend/test/disposablePostgresVerification.mjs` and this report. The existing working-tree changes were preserved. The graphify code graph was refreshed after adding the harness.

**Remaining blockers before staging:** choose an authoritative source database and review a backup/restore copy; compare that copy's full schema with the migration preflight; create an approved staging-target migration workflow (the current runner is disposable-only); rehearse a mid-file migration failure and recovery on a copy; update the stale optional integration scripts; establish a shared rate limit strategy for multiple instances; and move all checkout clients to stable idempotency keys. Cash settlement remains an administrator attestation, and KHQR remains a demo without verified payment integration.

**Recommended next phase:** prepare an isolated, reviewed copy of the selected source database, validate row counts and historical links, rehearse the versioned migrations and restore plan there, then test the full Flutter and management flows against that staging copy. Do not apply migrations to `coffee_shop` or connect a Render service until that review is approved.
