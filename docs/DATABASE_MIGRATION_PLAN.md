# PostgreSQL migration preparation — current status

Production startup now verifies migration records/checksums and the enabled audit trigger, and skips schema creation and seeding. Development startup retains its existing behavior. Migration 002 creates the cash audit ledger with foreign keys, a unique order constraint and immutable triggers. The runner performs required-baseline column preflight and remains disposable-only. Full drift review and an approved staging/production runner remain deployment gates. See DATABASE_BACKUP_RESTORE.md and DEPLOYMENT_RUNBOOK.md. Historical Phase 5 notes below describe earlier behavior.

Updated: 2026-11-06. No project database was migrated or selected as authoritative in this phase.

## Current schema and startup

`backend/src/db/database.js` initializes schema on every non-test-memory startup with `CREATE TABLE IF NOT EXISTS`, one additive `orders.customer_id` change, and indexes. `backend/src/db/seed.js` then inserts missing named catalog records and a missing bootstrap admin. Startup does not run versioned migrations, verify existing column types/constraints, or compare schema checksums. New order writes use a transaction; the seed routine itself is not a single transaction and can collide with concurrent startups.

| Table | Important relationships and constraints |
| --- | --- |
| `categories` | Integer primary key, unique name, active flag. |
| `products` | Integer primary key, required category FK with `ON DELETE RESTRICT`, USD numeric price, availability. Category index. |
| `customer_users` | Integer primary key, unique phone/email, password hash, loyalty count, active flag. |
| `staff_users` | Integer primary key, unique email, role text, password hash, active flag. Role validity is enforced in API logic, not a database CHECK. |
| `orders` | Integer primary key, unique reference, nullable customer FK with `ON DELETE SET NULL`, USD/KHR totals, method, payment and fulfillment strings. Phone, customer, and reference indexes. New code writes unpaid explicitly. |
| `order_items` | Integer primary key, order FK with `ON DELETE CASCADE`, optional product FK with `ON DELETE SET NULL`, price/name snapshot. Order index. |
| `order_idempotency` | Composite customer/key primary key, SHA-256 request hash, unique nullable order FK, timestamp. Customer FK cascades. No retention/pruning policy yet. |

The SQL under `backend/migrations/001_order_idempotency_alignment.sql` is an additive first version: it adds missing order ownership, creates the idempotency table and indexes, and changes the default for future payment rows to `unpaid`. It does not update existing order rows, references, statuses, or loyalty. `backend/scripts/prepareMigrations.js` tracks version, filename, SHA-256 checksum, and application timestamp in `schema_migrations`, with an advisory transaction lock and per-version transaction. It refuses the usual project ports and only applies to a specifically named disposable loopback database when explicitly marked. It is **not** invoked by API startup or configured for production deployment.

## Development database comparison

- Native PostgreSQL at `127.0.0.1:5433` accepted read-only metadata queries on 2026-11-06. Its `coffee_shop` database exposed six café tables: categories, customer_users, order_items, orders, products, staff_users. `orders.customer_id` and its customer FK exist; `order_idempotency` does not. No row values or credentials were read or printed.
- PostgreSQL on `127.0.0.1:5432` did not respond, and no café Compose service was running. Its volume was not mounted, started, or inspected, so schema and record differences between the two development databases remain unknown. Do not infer which holds authoritative customer orders.

## Before any staging or production migration

1. Select one authoritative database with the owner of the data. Inventory table/column types, constraints, indexes, row counts, `order_idempotency` shape, and status values on **both** sources by read-only queries. Resolve duplicate or divergent records through a reviewed plan; never merge by phone alone.
2. Stop automatic schema changes and bootstrap seeding in production startup after the versioned migration runner and a separate explicit seed process are reviewed. Do not flip that behavior in this phase: existing startup still performs its current initialization.
3. Take a consistent custom-format backup of the selected source using `pg_dump --format=custom --no-owner --no-acl` to encrypted restricted storage. Record the dump checksum, PostgreSQL version, database identifier, timestamp, and restore operator outside the repository. Also retain WAL/PITR coverage appropriate to the recovery objective. Never put the dump or URL in Git.
4. Restore the backup to a newly created staging database, using `pg_restore` **only against that new target**. Compare schema, table counts, order references, loyalty totals, and sample owner-linked reads with the source. Test the restore before applying a migration. Do not run `pg_restore --clean` against the source.
5. Apply reviewed migrations in version order to staging in a transaction, record checksums, and rerun to prove no-op behavior. Reject changed checksums, unexpected existing table shapes, or missing foreign keys. The Phase 5 runner is deliberately disposable-only; extend its target guard and rollout process only after staging review.
6. Test customer checkout/idempotent retry, order lookup, admin catalog/status/reporting, rollback on an injected failure, and application startup with seeding disabled. Check query plans and lock duration on production-sized copies. Verify backups can restore to a second new database.
7. For rollback, prefer restore or a forward corrective migration when data or constraints have changed. `001` is additive; dropping its table would discard retry records and can allow duplicate future orders, so do not use a blind down migration. Retain a pre-migration backup and a documented traffic freeze/replay plan.

## Disposable verification performed

A fresh PostgreSQL cluster on a temporary loopback port and a database named `phase5_migration_test` received a minimal legacy-shaped order. The migration ran twice, preserved the old reference and row, added the owner column/idempotency constraints, set the future payment default to unpaid, and recorded one tracking version. The temporary cluster and directory were stopped and removed afterward. The native and Docker project databases and volumes were not modified.

## Open deployment requirements

- Choose the authoritative database and reconcile native versus Docker contents.
- Validate actual schema drift before allowing `IF NOT EXISTS` to skip an incompatible object. Define production migration permissions, rollback windows, backup retention, monitoring, and idempotency-key retention.
- Move production schema/seed work out of ordinary API startup. Review production CORS origins, TLS, database credentials, and client API URLs with the selected hosting design.
