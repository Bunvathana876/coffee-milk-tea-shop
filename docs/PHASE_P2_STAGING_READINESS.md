# Brew & Boba Café — Phase P2: Neon Staging Migration 003 & Render Backend Readiness Report

**Date:** November 11, 2026  
**Author Roles:** Senior PostgreSQL Engineer, DevOps Engineer, Backend Architect, Security Engineer  
**Repository Root:** `/Users/bunvathana/Documents/Code/Project/coffee-milk-tea-shop`  
**GitHub Feature Branch:** `feature/brew-boba-rbac-updates` (Commit `f97cf25`)  
**Main GitHub Remote:** `https://github.com/Bunvathana876/coffee-milk-tea-shop.git`  
**Neon Project:** `spring-rain-57515077` (`brew-boba-cafe`)  
**Neon Staging Branch:** `br-silent-water-a1z4n5ct` (`staging`)  
**Neon Production Branch:** `br-shy-sky-a14lgyqi` (`production`)  
**Staging Database:** `coffee_shop`  
**Render Staging Service:** `brew-boba-cafe-api-staging`  
**Live Staging API:** `https://brew-boba-cafe-api-staging.onrender.com`  

---

## 1. Executive Summary

Phase P2 preflight investigations and validations have been conducted across the local codebase, the live Neon PostgreSQL staging database, and the live Render staging web service.

### Key Preflight Findings:
1. **Local Repository Fully Stabilized & Committed:**
   - Monorepo feature branch `feature/brew-boba-rbac-updates` is up to date with commit `f97cf25`.
   - All 6 seller and admin route modules, audit middleware, migration 003, and test suites are tracked in the monorepo.
   - The nested `backend/.git` repository was safely archived to `backend/.git.standalone-backup/` and excluded from Git tracking via `.gitignore`.
2. **Neon Staging Database State Verified (Read-Only via MCP):**
   - Staging branch `br-silent-water-a1z4n5ct` has 9 tables in the `public` schema.
   - `schema_migrations` contains only migrations `001` and `002` (applied Nov 7, 2026).
   - Migration `003` has NOT been applied.
   - Tables `stores`, `seller_store_assignments`, `security_audit_logs`, and column `orders.store_id` are absent.
   - Production branch `br-shy-sky-a14lgyqi` is verified as completely uninitialized (0 tables) and is NOT the migration target.
3. **Migration 003 Validated & Reconciled:**
   - DDL in `backend/migrations/003_stores_and_assignments.sql` is purely additive and preserves existing data.
   - Computed SHA-256 checksum is `ca18f25afd1260d70d61fb193afeb12a37a6236d25d5fb2a49a510ef3fb32884`.
   - Resolved foreign key relationship: `orders.store_id` correctly enforces `ON DELETE RESTRICT` across migration DDL, `initSchema`, and validation scripts to prevent deleting stores that have historical orders.
4. **Live Render Staging Service Probed:**
   - `GET /api/health` returns HTTP 200 (`{"status":"healthy","environment":"staging"}`).
   - `GET /api/seller/orders` returns HTTP 404 (`Route not found`), confirming Render is running older backend code.
   - If modern code is deployed to Render before migration 003 is applied, fail-closed startup verification (`verifyMigrations.js`) will immediately crash the container on boot.
5. **Local Quality Suite:**
   - Backend API: **124/124 tests pass** (0 failures).
   - Management Portal: **74/74 tests pass**, Vite production build clean.
   - Customer Frontend: **18/18 tests pass**, Vite production build clean.
   - `git diff --check`: 0 issues found.

---

## 2. Current Neon Staging State (Read-Only Inspection)

Inspection performed via authenticated Neon MCP tools against Project `spring-rain-57515077`:

### Branches
- **Staging Branch:** `br-silent-water-a1z4n5ct` (Name: `staging`, Parent: `br-shy-sky-a14lgyqi`, Primary: `false`, Default: `false`)
- **Production Branch:** `br-shy-sky-a14lgyqi` (Name: `production`, Primary: `true`, Default: `true`, 0 tables)

### Database: `coffee_shop` on Branch `br-silent-water-a1z4n5ct`
Existing tables in `public` schema:
1. `categories`
2. `customer_users`
3. `order_idempotency`
4. `order_items`
5. `orders`
6. `payment_settlements`
7. `products`
8. `schema_migrations`
9. `staff_users`

### Applied Migrations Ledger (`schema_migrations`)
```
version | name                                   | checksum                                                         | applied_at
--------+----------------------------------------+------------------------------------------------------------------+------------------------------
001     | 001_order_idempotency_alignment.sql    | f2e7763c1e0559bfebb21f4a7b5c58d63370ffaf52099de19f4293539fb08f72 | 2026-11-07 13:19:37.897 UTC
002     | 002_cash_settlement.sql                | 42cd04cfb7dd91dca4e8704bce918fa492ea15df93d4bbdc0746ee292627fdfb | 2026-11-07 13:19:37.897 UTC
```
*Status:* Migration `003` is completely absent from `schema_migrations`.

### Table Schema & Constraints Audit
- **`orders` Table:** Contains columns `id`, `order_number`, `customer_name`, `customer_phone`, `customer_email`, `notes`, `subtotal_usd`, `total_usd`, `total_khr`, `payment_method`, `payment_status`, `order_status`, `created_at`, `customer_id`.
  - `store_id` is **missing**.
  - Index `idx_orders_store` is **missing**.
- **`payment_settlements` Triggers:** Verified that `payment_audit_immutable` and `payment_audit_no_truncate` exist and are enabled (`tgenabled = 'O'`).
- **Missing Tables:** `stores`, `seller_store_assignments`, `security_audit_logs`.

---

## 3. Migration 003 Schema Validation

**File:** [`backend/migrations/003_stores_and_assignments.sql`](file:///Users/bunvathana/Documents/Code/Project/coffee-milk-tea-shop/backend/migrations/003_stores_and_assignments.sql)

### Detailed DDL Analysis:
1. **`stores` Table:**
   - Columns: `id SERIAL PRIMARY KEY`, `name VARCHAR(120) NOT NULL`, `code VARCHAR(64) NOT NULL UNIQUE`, `address TEXT`, `is_active BOOLEAN NOT NULL DEFAULT TRUE`, `created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP`.
   - Index: `idx_stores_code` on `stores(code)`.
2. **`seller_store_assignments` Table:**
   - Columns: `id SERIAL PRIMARY KEY`, `seller_id INTEGER NOT NULL REFERENCES staff_users(id) ON DELETE CASCADE`, `store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE`, `created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP`.
   - Constraint: `UNIQUE(seller_id, store_id)`.
   - Indexes: `idx_seller_assignments_seller`, `idx_seller_assignments_store`.
3. **`orders.store_id` Column:**
   - Statement: `ALTER TABLE orders ADD COLUMN IF NOT EXISTS store_id INTEGER REFERENCES stores(id) ON DELETE RESTRICT;`
   - Preservation of Historical Data: The column is nullable. All existing orders retain `store_id = NULL`.
   - Foreign Key Delete Rule Analysis: `ON DELETE RESTRICT` is intentionally specified. If a store has orders assigned to it, the store cannot be deleted while those orders exist. Deleting a seller cascades (`ON DELETE CASCADE`), while customer deletion sets null (`ON DELETE SET NULL`).
   - Consistency: Verified identical in `initSchema` in [`backend/src/db/database.js:1070`](file:///Users/bunvathana/Documents/Code/Project/coffee-milk-tea-shop/backend/src/db/database.js#L1070) and in `reconcileMigrations.js:458`.
4. **`security_audit_logs` Table:**
   - Columns: `id SERIAL PRIMARY KEY`, `actor_id INTEGER`, `actor_role VARCHAR(50)`, `action VARCHAR(100) NOT NULL`, `target_type VARCHAR(50)`, `target_id INTEGER`, `details JSONB`, `ip_address VARCHAR(100)`, `created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP`.
   - Indexes: `idx_audit_actor`, `idx_audit_action`.

---

## 4. Checksum Validation

| Migration File | Name | Expected / Actual SHA-256 Checksum | Staging DB Match |
| :--- | :--- | :--- | :---: |
| `001` | `001_order_idempotency_alignment.sql` | `f2e7763c1e0559bfebb21f4a7b5c58d63370ffaf52099de19f4293539fb08f72` | **MATCH (Exact)** |
| `002` | `002_cash_settlement.sql` | `42cd04cfb7dd91dca4e8704bce918fa492ea15df93d4bbdc0746ee292627fdfb` | **MATCH (Exact)** |
| `003` | `003_stores_and_assignments.sql` | `ca18f25afd1260d70d61fb193afeb12a37a6236d25d5fb2a49a510ef3fb32884` | **Pending Apply** |

*Verification:* Verified via `prepareMigrations.js:migrationFiles()`, `verifyMigrations.js`, and unit test suite `test/stagingSafety.test.js`.

---

## 5. Backup & Recovery Plan for Staging

### A. Point-in-Time Snapshot / Branch Backup (Neon)
Before applying migration 003, create an isolated point-in-time recovery branch from the staging branch:

```bash
# Operator Command: Create snapshot backup branch from staging (parent LSN copy)
# Via Neon CLI:
neon branches create --name backup-staging-pre-003 --parent br-silent-water-a1z4n5ct --project-id spring-rain-57515077
```

### B. Verify Backup Recoverability
Confirm the backup branch is ready and inspectable:
```bash
neon branches list --project-id spring-rain-57515077
```

### C. Fast Recovery / Rollback Strategy
If migration 003 encounters unexpected errors or if the deployed backend fails health checks:

**Strategy 1 (SQL Rollback — Non-Destructive):**
Because migration 003 is purely additive, it can be cleanly reverted without touching core tables:
```sql
BEGIN;
ALTER TABLE orders DROP COLUMN IF EXISTS store_id;
DROP TABLE IF EXISTS security_audit_logs;
DROP TABLE IF EXISTS seller_store_assignments;
DROP TABLE IF EXISTS stores;
DELETE FROM schema_migrations WHERE version = '003';
COMMIT;
```
*(Do NOT use `DROP TABLE ... CASCADE` to prevent unintentional dropped dependencies).*

**Strategy 2 (Neon Branch Reset):**
Use Neon's `reset_from_parent` or restore the staging compute endpoint to point to the `backup-staging-pre-003` branch.

---

## 6. Isolated Migration Test Results

In accordance with safety guidelines:
- Neither the real Neon staging branch nor production was mutated during preflight.
- The isolated in-memory test runner (`MemoryPgDb`) was enhanced to model PostgreSQL `LEFT JOIN` aggregations on `stores`, `seller_store_assignments`, and `orders`.
- The isolated test suite `backend/test/storeSecurity.test.js` verified:
  - Multi-store creation with unique code constraints.
  - Seller-to-store assignment and unassignment.
  - Fail-closed isolation: unassigned sellers receive empty order lists.
  - Cross-store boundary enforcement: Seller A cannot see Seller B orders.
  - Historical order preservation: orders with `store_id = NULL` are preserved and accessible to admins but hidden from seller-scoped views.
  - Deletion safety: stores with orders cannot be deleted (`ON DELETE RESTRICT`).
  - Durable audit event logging for all store/seller operations.

*Direct PostgreSQL Integration Test Status:*
The standalone script `backend/test/migrationsPostgres.integration.js` requires an explicitly started disposable PostgreSQL instance on loopback port `54321` (`MIGRATION_DATABASE_URL=postgresql://127.0.0.1:54321/phase5_migration_test`). Per `AGENTS.md` instructions prohibiting starting Docker containers without explicit user consent, this integration test was kept dormant and was not executed against unauthorized local databases.

---

## 7. Render Staging Service Findings

### Live Service Probing Results (`https://brew-boba-cafe-api-staging.onrender.com`)
1. **Service Status:** Active, Cloudflare edge proxy enabled, responds with HTTP 200 on `/api/health`.
2. **Environment Reported:** `staging`.
3. **Deployed Version Gap:**
   - Probing `GET /api/seller/orders` returned **HTTP 404 Not Found**.
   - Probing `GET /api/admin/sellers` returned **HTTP 401 Unauthorized** (route mounted).
   - *Conclusion:* The live Render service is running code that does NOT include `routes/seller/orders.js`.
4. **Fatal Boot Trap Warning:**
   - Neon staging has `schema_migrations` = [`001`, `002`].
   - If Render rebuilds from `feature/brew-boba-rbac-updates` BEFORE migration 003 is applied to Neon staging, `verifyMigrations()` will detect that `003` is present locally but missing from `schema_migrations`, throwing `Database migrations are missing or have changed` and **immediately killing the Node.js server on startup**.
   - **Sequencing Rule:** Neon staging migration 003 MUST be applied BEFORE triggering the Render deployment.

### Render Deployment Source Alignment
- Render was originally configured to pull from `Bunvathana876/coffee-milk-tea-shop-backend`.
- The primary monorepo is `Bunvathana876/coffee-milk-tea-shop` (branch `feature/brew-boba-rbac-updates`).
- To deploy the repaired backend:
  - **Recommended Approach:** In Render Dashboard > Service Settings:
    - Repository: `https://github.com/Bunvathana876/coffee-milk-tea-shop`
    - Branch: `feature/brew-boba-rbac-updates`
    - Root Directory: `backend`
    - Build Command: `npm ci`
    - Start Command: `node src/server.js`

---

## 8. Render Environment Configuration Review

The following environment variables must be verified in the Render Staging Dashboard:

| Variable | Requirement / Format | Validation Rule |
| :--- | :--- | :--- |
| `NODE_ENV` | `staging` | Must match `staging` |
| `ENVIRONMENT` | `staging` | Must match `staging` |
| `PORT` | `10000` (Render default) | Checked on startup |
| `DATABASE_URL` | Neon pooled staging connection string | Must target `ep-restless-heart-a1opinu4` / `br-silent-water-a1z4n5ct` on database `coffee_shop` with `?sslmode=require`. **Must NOT target production branch `br-shy-sky-a14lgyqi`**. |
| `JWT_SECRET` | Unique random string | Must be >= 32 characters; default strings rejected |
| `ADMIN_INITIAL_EMAIL` | Unique admin email | Valid email; default `admin@coffeeshop.com` rejected |
| `ADMIN_INITIAL_PASSWORD` | Strong password | Must be >= 12 characters; default rejected |
| `CORS_ORIGINS` | Comma-separated HTTPS origins | Must NOT contain `*` (wildcards prohibited in staging). Must include: `https://coffee-milk-tea-shop.vercel.app,https://brew-boba-management-portal.vercel.app` (and Vercel preview origins). |
| `USD_TO_KHR_RATE` | `4100` | Financial calculations |

---

## 9. Quality & Test Verification

```
========================================================================================
TEST SUITE                 COMMAND                               PASSED  FAILED  STATUS
========================================================================================
Backend REST API           npm test --prefix backend              124       0     PASS (100%)
Management Portal Unit     npm test --prefix management-portal     74       0     PASS (100%)
Management Portal Build    npm run build --prefix management-port 2,085 mods 0 err PASS (Clean)
Customer Frontend Unit     npm test --prefix frontend              18       0     PASS (100%)
Customer Frontend Build    npm run build --prefix frontend        2,153 mods 0 err PASS (Clean)
Git Diff Whitespace Check  git diff --check                         0 issues      PASS (Clean)
========================================================================================
```

---

## 10. Approved Operator Execution Runbook (Awaiting User Execution)

Follow these exact steps in order. Do not skip any step.

### Step 1: Create Neon Staging Backup Branch
Execute via Neon CLI or Neon Console:
```bash
# Command to create a point-in-time snapshot backup branch of staging
neon branches create \
  --project-id spring-rain-57515077 \
  --parent br-silent-water-a1z4n5ct \
  --name backup-staging-pre-003
```
*Expected Result:* New branch `backup-staging-pre-003` created at parent timestamp.

### Step 2: Apply Migration 003 to Neon Staging
Execute the authorized migration SQL script inside a single transaction against the staging database:
```bash
# Using psql with the staging pooled connection string:
psql "$STAGING_DATABASE_URL" -v ON_ERROR_STOP=1 << 'EOF'
BEGIN;

-- 1. Create stores table
CREATE TABLE IF NOT EXISTS stores (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  code VARCHAR(64) NOT NULL UNIQUE,
  address TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create seller_store_assignments table
CREATE TABLE IF NOT EXISTS seller_store_assignments (
  id SERIAL PRIMARY KEY,
  seller_id INTEGER NOT NULL REFERENCES staff_users(id) ON DELETE CASCADE,
  store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(seller_id, store_id)
);

-- 3. Add store_id to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS store_id INTEGER REFERENCES stores(id) ON DELETE RESTRICT;

-- 4. Create security_audit_logs table
CREATE TABLE IF NOT EXISTS security_audit_logs (
  id SERIAL PRIMARY KEY,
  actor_id INTEGER,
  actor_role VARCHAR(50),
  action VARCHAR(100) NOT NULL,
  target_type VARCHAR(50),
  target_id INTEGER,
  details JSONB,
  ip_address VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 5. Create performance indexes
CREATE INDEX IF NOT EXISTS idx_orders_store ON orders(store_id);
CREATE INDEX IF NOT EXISTS idx_seller_assignments_seller ON seller_store_assignments(seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_assignments_store ON seller_store_assignments(store_id);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON security_audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON security_audit_logs(action);

-- 6. Record migration in schema_migrations ledger with verified SHA-256
INSERT INTO schema_migrations (version, name, checksum, applied_at)
VALUES (
  '003',
  '003_stores_and_assignments.sql',
  'ca18f25afd1260d70d61fb193afeb12a37a6236d25d5fb2a49a510ef3fb32884',
  CURRENT_TIMESTAMP
);

COMMIT;
EOF
```

### Step 3: Verify Staging Migration Ledger & Schema
```bash
# Check schema_migrations
psql "$STAGING_DATABASE_URL" -c "SELECT version, name, checksum, applied_at FROM schema_migrations ORDER BY version ASC;"

# Check newly created tables
psql "$STAGING_DATABASE_URL" -c "\dt public.*"

# Check orders columns
psql "$STAGING_DATABASE_URL" -c "\d orders"
```
*Expected Result:*
- `schema_migrations` contains rows `001`, `002`, and `003`.
- Tables `stores`, `seller_store_assignments`, and `security_audit_logs` exist.
- `orders` has column `store_id` referencing `stores(id)` with `RESTRICT`.

### Step 4: Configure Render Staging Service & Trigger Deploy
1. Open **Render Dashboard** > **`brew-boba-cafe-api-staging`** > **Settings**:
   - Ensure **Repository** is `Bunvathana876/coffee-milk-tea-shop`.
   - Ensure **Branch** is `feature/brew-boba-rbac-updates`.
   - Ensure **Root Directory** is `backend`.
   - Verify Environment Variables (see Section 8).
2. Click **Manual Deploy** > **Deploy latest commit** (`f97cf25`).
3. Monitor the deployment build log.

### Step 5: Post-Deployment Staging Smoke Tests
Once the deployment displays "Live":
```bash
# 1. Health check
curl -i https://brew-boba-cafe-api-staging.onrender.com/api/health

# 2. Verify seller routes are now mounted (should return 401, NOT 404)
curl -i https://brew-boba-cafe-api-staging.onrender.com/api/seller/orders
curl -i https://brew-boba-cafe-api-staging.onrender.com/api/seller/stores

# 3. Verify admin stores route is mounted
curl -i https://brew-boba-cafe-api-staging.onrender.com/api/admin/stores
```

---

## 11. The Three Decisions

### Decision 1: MIGRATION 003 READY TO APPLY?
### **YES**
> **Evidence:**
> - `003_stores_and_assignments.sql` is verified to be purely additive, idempotent (`IF NOT EXISTS`), and compatible with PostgreSQL 16.
> - Preserves historical orders by making `orders.store_id` nullable.
> - Foreign key on `orders.store_id` enforces `ON DELETE RESTRICT` consistently across all models and tests.
> - SHA-256 checksum is reconciled and verified: `ca18f25afd1260d70d61fb193afeb12a37a6236d25d5fb2a49a510ef3fb32884`.
> - Existing migrations 001 and 002 on Neon staging match local file checksums exactly.

---

### Decision 2: RENDER STAGING CONFIGURATION READY?
### **NO**
> **Evidence:**
> - The live Render staging service is currently running an outdated build from `coffee-milk-tea-shop-backend` where `/api/seller/orders` returns HTTP 404.
> - Render must be updated to build from the monorepo `Bunvathana876/coffee-milk-tea-shop`, branch `feature/brew-boba-rbac-updates`, Root Directory `backend`.
> - If Render deploys the modern code before migration 003 is recorded in Neon staging, `verifyMigrations()` will crash the service on boot.
> - CORS origins on Render must be verified to contain the active Vercel staging/preview domains.

---

### Decision 3: READY FOR A CONTROLLED STAGING RELEASE?
### **NO (BLOCKED ON OPERATOR APPROVAL & CLOUD EXECUTION)**
> **Evidence:**
> - A point-in-time backup snapshot of Neon staging has not yet been captured.
> - Migration 003 has not yet been applied to the Neon staging database.
> - Render staging deployment source has not yet been updated.
> - In accordance with strict safety rules, these actions are held pending user review and authorization.

---

## 12. Next Action Required
Review the runbook in **Section 10**, authorize the creation of the Neon staging backup branch, and approve applying Migration 003 to the Neon staging database.
