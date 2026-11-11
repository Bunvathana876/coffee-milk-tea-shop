# Brew & Boba Café — Complete Project Audit & Production Readiness Review

**Audit Date:** November 10, 2026  
**Auditor Roles:** Principal Software Engineer, Senior Full-Stack Architect, QA Engineer, DevSecOps Specialist, Database Engineer, Cybersecurity Auditor, Technical Project Reviewer  
**Repository Root:** `/Users/bunvathana/Documents/Code/Project/coffee-milk-tea-shop`  
**GitHub Remote (Root):** `https://github.com/Bunvathana876/coffee-milk-tea-shop`  
**GitHub Remote (Backend Nested):** `https://github.com/Bunvathana876/coffee-milk-tea-shop-backend`  

---

## 1. Executive Summary

Brew & Boba Café is an ambitious full-stack beverage ordering and café management platform spanning four distinct sub-projects: a React customer storefront, a React management portal, a Node.js Express REST API, and a Flutter customer mobile application.

An exhaustive, evidence-based audit was conducted against the physical source code, test runners, git trees, and cloud databases (Neon PostgreSQL staging and production branches).

### High-Level Verdict: **NOT READY FOR PRODUCTION — BLOCKERS REMAIN**

1. **Production Readiness:** **NO**. The production database on Neon is completely uninitialized (0 tables in `public` schema). The remote backend repository on GitHub (`coffee-milk-tea-shop-backend`), from which Render deploys, is frozen at October 28, 2026 (commit `189d001`) and lacks all recent security migrations, cash settlement logic, and store/seller RBAC modules.
2. **Staging Readiness:** **NO**. While a staging branch exists on Neon, it only has migrations 001 and 002 applied. Migration 003 (`003_stores_and_assignments.sql`) is missing. Because the backend implements fail-closed migration verification on startup (`verifyMigrations.js`), any backend instance started against Neon staging or production will **immediately crash on boot**.
3. **MVP Feature Completeness:** **NO**. While the core customer ordering flow (catalog -> cart -> checkout -> receipt) and administrator control center (catalog CRUD, staff management, customer directory, order status transitions, manual cash settlement) are substantially developed:
   - **Payment is simulated:** The KHQR payment option renders a demo-only QR payload (`khqr-demo://mock-pay?...`); there is no integration with an actual banking API or payment gateway (e.g. Bakong KHQR Open API, ABA PayWay, Stripe).
   - **Seller Portal is non-functional:** All seller views (`/seller/*`) in the management portal are dummy placeholder shells (`PlannedPage`), and the login portal explicitly rejects non-admin users.
   - **Backend Integration Gap:** Updating a seller profile from the management portal fails with HTTP 404 because the backend lacks `PATCH /api/admin/sellers/:id`.
   - **Git Repository Disconnect:** Six critical backend route, migration, and test files are completely untracked in the root git repository, risking immediate CI/CD and deployment breakage upon checkout.

---

## 2. Project Architecture

The Brew & Boba Café repository contains four client/server tiers and legacy archives:

```
coffee-milk-tea-shop/
├── frontend/               # Customer Web Application (React 19, TypeScript, Vite 8, Tailwind CSS v4)
├── management-portal/      # Administrative Control Center (React 19, TypeScript, Vite 8, Tailwind CSS v4)
├── backend/                # Shared REST API (Node.js ESM, Express 4, PostgreSQL pg driver, bcryptjs, JWT)
│   ├── .git/               # NESTED GIT REPO pointing to coffee-milk-tea-shop-backend (remote mismatch!)
│   ├── migrations/         # 001_order_idempotency, 002_cash_settlement, 003_stores_and_assignments
│   └── src/
│       ├── middleware/     # auth.js, audit.js, errorHandler.js
│       ├── routes/         # public, customer, admin, and seller endpoints
│       └── utils/          # calculations, validations, cash settlement, revenue
├── mobile_app/             # Customer Mobile App (Flutter 3.47.9, Dart 3.13.7, Provider, http)
├── archive/
│   └── legacy-admin/       # Preserved former admin source (deprecated, contract mismatches)
├── compose.yaml            # Development multi-container Docker compose definition
├── compose.production.yaml # Production multi-container Docker compose definition
└── docs/                   # Engineering documentation, migration plans, and audits
```

### Communication Topology

```
[ Customer Web (Vercel) ]      ──HTTPS/REST──>  [ Backend API (Render) ]  ──TLS/pg──>  [ PostgreSQL (Neon) ]
[ Management Portal (Vercel) ] ──HTTPS/REST──>          │
[ Mobile App (Flutter) ]       ──HTTPS/REST──>          │
                                                         ▼
                                            [ security_audit_logs ]
                                            [ payment_settlements ]
```

---

## 3. Scope and MVP Definition

To eliminate ambiguity, this audit defines two evaluation horizons:

### A. Customer MVP (Minimum Viable Ordering Experience)
- **Included:** Public menu browsing, item customization, shopping cart persistence, customer authentication (phone/password), dual-currency (USD/KHR) display, order placement with server-side price validation and idempotency, digital receipt viewing, and past order history.
- **Excluded / Deferred:** Automated real-time payment webhooks, driver delivery tracking, in-app credit card processing. (Cash on pickup/delivery is the viable physical fulfillment path; KHQR remains a visual demo).

### B. Enterprise / Multi-Tenant Phase (Roadmap Expansion)
- **Included in Master Plan:** Multi-store registry, store-scoped seller accounts, role controller matrix, store assignment UI, seller self-service portal, store-isolated order fulfillment.
- **Current State:** Backend has drafted store/seller endpoints; management portal has drafted admin-facing seller and store management; seller self-service portal is completely unbuilt (`PlannedPage` shells).

---

## 4. Completion Matrix

| Functional Area | Status | Evidence | Missing / Broken Work | Severity | Recommended Next Step |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Customer Storefront** | **COMPLETE (Demo)** | 18/18 tests pass; Vite build clean; catalog, cart, checkout, receipt, and orders work. | Automated KHQR payment processing; delivery address mapping. | Medium | Integrate actual KHQR/bank webhook or clearly label cash-only in production. |
| **Customer Auth & Loyalty** | **COMPLETE** | Token-based auth, password hashing, session restore, profile editing, loyalty stamp tracking. | SMS OTP phone verification (uses password only). | Low | Add phone OTP verification for production anti-abuse. |
| **Admin Catalog Management** | **COMPLETE** | Categories and Products full CRUD, image fallbacks, availability toggles, input validation. | Direct S3/Neon object storage upload (currently uses image URLs). | Low | Integrate Neon Object Storage or Cloudinary for direct image uploads. |
| **Admin Order & Cash Desk** | **COMPLETE** | Live queue, stage filtering, status transitions, immutable cash settlement trigger. | Automated payment status reconciliation. | Low | Ready for manual in-store operations. |
| **Admin Customer Directory** | **COMPLETE** | Server-side pagination, search, active filter, order count & spending metrics. | Backend route file untracked in root git repo! | **P0** | Track and commit `backend/src/routes/admin/customers.js`. |
| **Admin Store & Seller Mgmt** | **PARTIAL** | Add seller, store registry, assignment UI in portal. Backend routes created. | `PATCH /api/admin/sellers/:id` missing (404); backend files untracked in git. | **P1** | Implement `PATCH /:id` in `sellers.js` and commit files. |
| **Seller Portal (`/seller/*`)** | **NOT IMPLEMENTED** | Portal routes render dummy `PlannedPage` shells; login explicitly rejects sellers. | Entire frontend seller portal UI; seller order mutation endpoints. | **P1** | Implement seller dashboard and order fulfillment UI. |
| **Role Controller Page** | **COMPLETE (UI)** | 11-row policy matrix, role cards, high-contrast styles, live server indicator. | Dynamic permission editing (by design, server middleware is authoritative). | Informational | Functioning as intended for governance visualization. |
| **Backend Core REST API** | **COMPLETE** | 119/122 tests pass; server-authoritative calculations, idempotency, transactions. | 3 failing tests; missing `PATCH /sellers/:id`; mock DB regex JOIN limitation. | **P1** | Fix seller update route, update migration test checksum, fix regex in test mock. |
| **Database Migrations** | **STILL BROKEN** | Migrations 001-003 drafted. Neon staging has only 001 and 002. Neon prod has 0 tables. | Migration 003 unapplied on staging; prod uninitialized; startup crash in staging. | **P0** | Execute approved migration runner on staging and initialize production database. |
| **Security & RBAC** | **COMPLETE (Core)** | Middleware enforces role checks, token invalidation on role demotion, last admin protection. | `security_audit_logs` table missing on Neon staging/prod (crashes audit writes). | **P0** | Provision `security_audit_logs` via migration 003. |
| **Flutter Mobile App** | **COMPLETE (Client)** | 25/25 tests pass; `flutter analyze` clean; offline idempotency, catalog, cart, checkout. | Untested on physical mobile devices; appName brand mismatch ('Coffee Cute'). | **P2** | Update `appName` to 'Brew & Boba Café' and test on physical Android/iOS device. |
| **Deployment Setup** | **STILL BROKEN** | Vercel SPA rewrites configured; Docker production images build. | Render connected to outdated nested backend repo; untracked files in root repo. | **P0** | Reconcile nested backend repo and push latest code to GitHub. |

---

## 5. Customer Website Audit (`frontend/`)

### Authentication & Account Management
- **Registration & Login:** [AuthContext.tsx](file:///Users/bunvathana/Documents/Code/Project/coffee-milk-tea-shop/frontend/src/features/auth/AuthContext.tsx) and [AuthModal.tsx](file:///Users/bunvathana/Documents/Code/Project/coffee-milk-tea-shop/frontend/src/components/auth/AuthModal.tsx). Validates phone numbers (8-15 digits), email formats, and minimum password length (6 characters).
- **Session Persistence:** Tokens stored in `localStorage` with automatic hydration and `/me` validation on launch.
- **Invalid Session Handling:** Emits `auth:unauthorized` events on 401 responses, automatically clearing stale tokens and prompting re-authentication.
- **Profile & Loyalty:** Displays loyalty card with stamp accumulation (1 stamp per order, tiered perks at 5, 10, and 15 stamps).

### Menu & Customization
- **Catalog Browsing:** [MenuPage.tsx](file:///Users/bunvathana/Documents/Code/Project/coffee-milk-tea-shop/frontend/src/pages/MenuPage.tsx) loads live categories and products via `useProducts` and `useCategories`.
- **Customization Engine:** [CustomizationModal.tsx](file:///Users/bunvathana/Documents/Code/Project/coffee-milk-tea-shop/frontend/src/components/product/CustomizationModal.tsx). Supports Cup Size (`Small` +$0.00, `Medium` +$0.30, `Large` +$0.60), Sugar Levels (`0%`, `25%`, `50%`, `75%`, `100%`), Ice Levels (`No Ice`, `Less Ice`, `Normal Ice`, `Extra Ice`), and Toppings (`Brown Sugar Pearls` +$0.50, `Cheese Foam` +$0.60, `Coconut Jelly` +$0.40, `Pudding` +$0.50).
- **Authoritative Prices:** Price calculation logic in `customization.ts` mirrors server-side calculations in `backend/src/utils/orderValidation.js`.

### Shopping Cart
- **State Management:** [CartContext.tsx](file:///Users/bunvathana/Documents/Code/Project/coffee-milk-tea-shop/frontend/src/features/cart/CartContext.tsx) and [cartReducer.ts](file:///Users/bunvathana/Documents/Code/Project/coffee-milk-tea-shop/frontend/src/features/cart/cartReducer.ts).
- **Persistence & Recovery:** Tested against corrupted `localStorage` structures; safely resets state without throwing runtime errors ([cartStorage.ts](file:///Users/bunvathana/Documents/Code/Project/coffee-milk-tea-shop/frontend/src/features/cart/cartStorage.ts)).
- **Customization Hashing:** Items with identical product IDs but distinct toppings/sizes are stored as separate unique line items.

### Checkout & Ordering Flow
- **Order Placement:** [CheckoutPage.tsx](file:///Users/bunvathana/Documents/Code/Project/coffee-milk-tea-shop/frontend/src/pages/CheckoutPage.tsx).
- **Authentication Gate:** Guests cannot checkout; prompts `openAuthModal` before submission.
- **Duplicate Protection:** Generates a deterministic SHA-256 fingerprint of payload items and sends an `Idempotency-Key` header.
- **Payment Method Selection:** Allows selecting `cash` or `khqr`.
- **Payment Realism Finding:** Selecting `khqr` displays [AbaKhqrPayment.tsx](file:///Users/bunvathana/Documents/Code/Project/coffee-milk-tea-shop/frontend/src/components/payment/AbaKhqrPayment.tsx). This generates a synthetic URI (`khqr-demo://mock-pay?...`) with a disclaimer: *"This is a simulated QR code with mock metadata for demonstration and portfolio testing."* **There is no live payment gateway.** Orders are created with `payment_status = 'unpaid'` (or `'pending'`).

### Orders & Digital Receipts
- **Order History:** [OrdersPage.tsx](file:///Users/bunvathana/Documents/Code/Project/coffee-milk-tea-shop/frontend/src/pages/OrdersPage.tsx) queries `/api/orders/lookup/phone?phone=...` to display past customer orders.
- **Digital Receipt:** [ReceiptPage.tsx](file:///Users/bunvathana/Documents/Code/Project/coffee-milk-tea-shop/frontend/src/pages/ReceiptPage.tsx) renders full line-item details, order progress stepper, and generates client-side PDF downloads via `jspdf` ([receiptPdfGenerator.ts](file:///Users/bunvathana/Documents/Code/Project/coffee-milk-tea-shop/frontend/src/utils/receiptPdfGenerator.ts)).

---

## 6. Management Portal Audit (`management-portal/`)

### Dashboard & Analytics
- **Summary Metrics:** [AdminDashboard.tsx](file:///Users/bunvathana/Documents/Code/Project/coffee-milk-tea-shop/management-portal/src/pages/AdminDashboard.tsx) renders total orders, revenue in USD/KHR, pending queue count, and total customers.
- **Data Visualizations:** Custom SVG Donut Chart (`OrderBreakdownDonut`) and CSS Bar Chart (`OrderActivityChart`) with zero-state handling.
- **Attention Center:** `OperationsCenterPanel` highlights orders in `preparing` and `ready` status with 1-click drilldowns.
- **Recognized Revenue Policy:** [AnalyticsPage.tsx](file:///Users/bunvathana/Documents/Code/Project/coffee-milk-tea-shop/management-portal/src/pages/AnalyticsPage.tsx). Displays an explicit policy disclaimer (`ZeroRevenueCard`): *Revenue is only recognized when an order is both `payment_status = 'paid'` AND `order_status = 'completed'`*.

### Order Management & Cash Settlement
- **Queue & Drawer:** [OrdersPage.tsx](file:///Users/bunvathana/Documents/Code/Project/coffee-milk-tea-shop/management-portal/src/pages/OrdersPage.tsx). Status filtering (`all`, `pending`, `preparing`, `ready`, `completed`, `cancelled`).
- **Payment Separation:** Status badges decouple fulfillment status (`pending`, `preparing`, `ready`, `completed`) from payment status (`unpaid`, `paid`, `failed`).
- **Cash Settlement Desk:** Allows admins to record physical cash received with an external receipt reference, invoking `POST /api/admin/orders/:id/cash-settlement`. Rejects non-cash or already-settled orders.

### Catalog Management (Products & Categories)
- **Categories:** [CategoriesPage.tsx](file:///Users/bunvathana/Documents/Code/Project/coffee-milk-tea-shop/management-portal/src/pages/CategoriesPage.tsx). Complete CRUD with image thumbnail fallbacks and active status toggles.
- **Products:** [ProductsPage.tsx](file:///Users/bunvathana/Documents/Code/Project/coffee-milk-tea-shop/management-portal/src/pages/ProductsPage.tsx). Product creation, editing, category binding, base price definition, and availability toggle.

### Customer Directory
- **Customer Table:** [CustomersPage.tsx](file:///Users/bunvathana/Documents/Code/Project/coffee-milk-tea-shop/management-portal/src/pages/CustomersPage.tsx). Features live search, active/inactive filtering, sorting, total spend calculation, and loyalty stamp display.

### Seller Management & Multi-Store Tenancy
- **Admin Sellers Page:** [SellersPage.tsx](file:///Users/bunvathana/Documents/Code/Project/coffee-milk-tea-shop/management-portal/src/pages/SellersPage.tsx).
  - Displays registered sellers, assigned stores, active metrics, and Add Seller drawer.
  - **CRITICAL DEFECT:** Editing a seller (changing name, password) invokes `updateSeller` (`PATCH /api/admin/sellers/:id`), which returns **HTTP 404** because the backend only implemented `PATCH /:id/status`!
- **Seller Self-Service Portal:** [App.tsx](file:///Users/bunvathana/Documents/Code/Project/coffee-milk-tea-shop/management-portal/src/App.tsx#L45-L50).
  - Routes `/seller/dashboard`, `/seller/products`, `/seller/orders`, `/seller/inventory`, `/seller/analytics`, and `/seller/profile` render `PlannedPage` placeholder shells.
  - The login provider ([AuthProvider.tsx](file:///Users/bunvathana/Documents/Code/Project/coffee-milk-tea-shop/management-portal/src/auth/AuthProvider.tsx#L76)) rejects any user whose role is not `admin`.

### Role Controller & Access Governance
- **Role Controller Page:** [RoleControllerPage.tsx](file:///Users/bunvathana/Documents/Code/Project/coffee-milk-tea-shop/management-portal/src/pages/RoleControllerPage.tsx).
  - Displays 11 authoritative authorization policies across Admin, Staff, and Seller roles.
  - Contrast fixes verified in source: utilizes `#17294D`, `text-slate-900`, `dark:text-zinc-50`.

### Workspace Settings
- **Preferences:** [SettingsPage.tsx](file:///Users/bunvathana/Documents/Code/Project/coffee-milk-tea-shop/management-portal/src/pages/SettingsPage.tsx). Supports Light, Dark, and System themes; Compact, Default, and Comfortable table densities; and sidebar collapse preferences stored in `localStorage`.

---

## 7. Backend API Audit (`backend/`)

### Route Architecture & Coverage

| Endpoint Path | Method | Auth Required | Status | File Location |
| :--- | :---: | :---: | :---: | :--- |
| `/api/health` | GET | None | Healthy | `backend/src/routes/health.js:5` |
| `/api/categories` | GET | None | Working | `backend/src/routes/categories.js:8` |
| `/api/products` | GET | None | Working | `backend/src/routes/products.js:8` |
| `/api/auth/register` | POST | None | Working | `backend/src/routes/customerAuth.js:14` |
| `/api/auth/login` | POST | None | Working | `backend/src/routes/customerAuth.js:77` |
| `/api/auth/me` | GET | Customer | Working | `backend/src/routes/customerAuth.js:134` |
| `/api/orders` | POST | Customer | Working (Idempotent) | `backend/src/routes/orders.js:49` |
| `/api/orders` | GET | Customer | Working (Owned) | `backend/src/routes/orders.js:174` |
| `/api/orders/lookup/phone` | GET | Customer | Working | `backend/src/routes/orders.js:186` |
| `/api/orders/:id` | GET | Customer | Working (Owned) | `backend/src/routes/orders.js:224` |
| `/api/admin/auth/login` | POST | None | Working | `backend/src/routes/admin/auth.js:10` |
| `/api/admin/auth/me` | GET | Staff/Admin | Working | `backend/src/routes/admin/auth.js:61` |
| `/api/admin/dashboard` | GET | Admin | Working | `backend/src/routes/admin/dashboard.js:8` |
| `/api/admin/reports/sales`| GET | Admin | Working | `backend/src/routes/admin/dashboard.js:46` |
| `/api/admin/categories` | GET/POST | Admin | Working | `backend/src/routes/admin/categories.js` |
| `/api/admin/products` | GET/POST | Admin | Working | `backend/src/routes/admin/products.js` |
| `/api/admin/orders` | GET | Staff/Admin | Working | `backend/src/routes/admin/orders.js:58` |
| `/api/admin/orders/:id/status`| PATCH | Staff/Admin | Working | `backend/src/routes/admin/orders.js:93` |
| `/api/admin/orders/:id/cash-settlement`| POST | Admin | Working | `backend/src/routes/admin/orders.js:18` |
| `/api/admin/staff` | GET/POST | Admin | Working | `backend/src/routes/admin/staff.js:10` |
| `/api/admin/staff/:id` | PATCH | Admin | Working (Last Admin Guard) | `backend/src/routes/admin/staff.js:78` |
| `/api/admin/customers` | GET | Admin | **Untracked in Git** | `backend/src/routes/admin/customers.js:20` |
| `/api/admin/customers/:id` | GET | Admin | **Untracked in Git** | `backend/src/routes/admin/customers.js:140` |
| `/api/admin/sellers` | GET/POST | Admin | **Untracked in Git** | `backend/src/routes/admin/sellers.js:19` |
| `/api/admin/sellers/:id` | PATCH | Admin | **MISSING (404)** | Expected in `admin/sellers.js` |
| `/api/admin/sellers/:id/status`| PATCH | Admin | **Untracked in Git** | `backend/src/routes/admin/sellers.js:381` |
| `/api/admin/stores` | GET/POST | Admin | **Untracked in Git** | `backend/src/routes/admin/stores.js:15` |
| `/api/seller/auth/login` | POST | None | **Untracked in Git** | `backend/src/routes/seller/auth.js:15` |
| `/api/seller/stores` | GET | Seller | **Untracked in Git** | `backend/src/routes/seller/stores.js:13` |
| `/api/seller/orders` | GET | Seller | **Untracked in Git** (Read-Only) | `backend/src/routes/seller/orders.js:30` |

### Key Backend Technical Findings
1. **Authoritative Financial Calculations:** Prices, customizations, and currency exchanges are calculated authoritatively on the server in `backend/src/utils/orderValidation.js`. Client-provided price parameters are discarded.
2. **Database Transactions:** Order creation and cash settlement run inside serializable/isolated transactions via `withTransaction()` in `database.js`. A failure during order-item creation or loyalty crediting rolls back the entire operation.
3. **Idempotency Protection:** Enforced via `order_idempotency` table using composite key `(customer_id, idempotency_key)` and payload hashing.
4. **Cash Settlement Integrity:** Supported by PostgreSQL table `payment_settlements` with procedural immutable triggers (`payment_audit_immutable`, `payment_audit_no_truncate`) preventing any UPDATE, DELETE, or TRUNCATE.
5. **Fail-Closed Security Event Logging:** `logSecurityEvent` in `backend/src/middleware/audit.js` persists audit records. However, because the `security_audit_logs` table has not been provisioned in Neon staging, audit attempts throw `SecurityAuditError` and abort transactions!

---

## 8. Flutter Mobile App Audit (`mobile_app/`)

### Source & Structure
- **SDK & Dependencies:** Dart 3.13.7, Flutter 3.47.9. Packages: `provider: ^6.1.5+1`, `http: ^1.6.0`, `shared_preferences: ^2.5.6`, `intl: ^0.20.3`.
- **Static Analysis:** Executed `flutter analyze` in `mobile_app/`: **0 issues found** (clean).
- **Automated Tests:** Executed `flutter test` in `mobile_app/`: **25/25 tests passed**.
- **State Architecture:** Clean provider model with `CartProvider`, `OrderProvider`, `UserProvider`, and `ShopProvider`.

### Order & Network Reliability
- In [order_repository.dart](file:///Users/bunvathana/Documents/Code/Project/coffee-milk-tea-shop/mobile_app/lib/data/repositories/order_repository.dart), the mobile app calculates a persistent SHA-256 payload identity and generates a 32-character hexadecimal idempotency key stored in `shared_preferences`.
- If a network error occurs during checkout, the app preserves the cart and retry key. It **never** converts a network failure into a fake or confirmed order.
- `OfflineOrderPreview` ([offline_order_preview.dart](file:///Users/bunvathana/Documents/Code/Project/coffee-milk-tea-shop/mobile_app/lib/data/models/offline_order_preview.dart)) is strictly an in-memory cart estimation helper with no server reference.

### Branding Discrepancy
- In [app_config.dart](file:///Users/bunvathana/Documents/Code/Project/coffee-milk-tea-shop/mobile_app/lib/core/config/app_config.dart#L10), the application name is hardcoded as `'Coffee Cute'`, whereas the web storefront and management portal are branded as `'Brew & Boba Café'`.

### Platform Readiness
- Android Gradle wrapper and iOS Podfile exist. However, no physical devices or emulators were connected during this audit; real-device hardware builds and push notifications remain untested.

---

## 9. Database and Migrations Audit (PostgreSQL & Neon)

### Database Schema Structure (Designed Locally)
The intended schema comprises 11 relational tables:
1. `categories` (PK: `id`)
2. `products` (PK: `id`, FK: `category_id -> categories.id`)
3. `customer_users` (PK: `id`, UNIQUE: `phone`, `email`)
4. `staff_users` (PK: `id`, UNIQUE: `email`, role: `admin|staff|seller`)
5. `orders` (PK: `id`, UNIQUE: `order_number`, FK: `customer_id`, `store_id`)
6. `order_items` (PK: `id`, FK: `order_id -> orders.id ON DELETE CASCADE`)
7. `order_idempotency` (PK: `(customer_id, idempotency_key)`)
8. `payment_settlements` (PK: `id`, UNIQUE: `order_id`, triggers: immutable)
9. `stores` (PK: `id`, UNIQUE: `code`)
10. `seller_store_assignments` (PK: `id`, UNIQUE: `(seller_id, store_id)`)
11. `security_audit_logs` (PK: `id`, indexes on `actor_id`, `action`)

---

### Verification of Previous Reported Blockers

| Previous Reported Blocker | Status | Verified Evidence from Live Inspection |
| :--- | :---: | :--- |
| **1. Migration 003 missing from Neon staging** | **STILL BROKEN** | Read-only inspection of Neon branch `br-silent-water-a1z4n5ct` reveals `schema_migrations` contains only versions `001` and `002` (applied Nov 7, 2026). Migration `003` has NOT been executed. |
| **2. security_audit_logs missing from schema** | **STILL BROKEN** | Table `security_audit_logs` DOES NOT EXIST on Neon staging (confirmed via `get_database_tables`). |
| **3. Store ownership tables missing from staging** | **STILL BROKEN** | Tables `stores` and `seller_store_assignments` DO NOT EXIST on Neon staging. |
| **4. orders.store_id migration inconsistency** | **STILL BROKEN** | Column `store_id` DOES NOT EXIST on `orders` table in Neon staging (confirmed via `describe_table_schema`). |
| **5. Production database reported as empty** | **STILL BROKEN** | Live inspection of Neon production branch `br-shy-sky-a14lgyqi` (`coffee_shop` database) returned `[]` (0 tables). Completely uninitialized. |
| **6. Backend startup requires migration verification** | **STILL ACTIVE (FATAL)** | `database.js:804` invokes `verifyMigrations()`. If `isProductionOrStaging()` is true, it compares local files (`001`, `002`, `003`) with `schema_migrations`. Because `003` is missing on staging, **the backend crashes immediately on startup**. |

---

## 10. RBAC Security Findings

### Permissions Matrix & Enforcement

| Role | Frontend Access | Permitted Endpoints | Denied Endpoints | Enforcing Middleware |
| :--- | :--- | :--- | :--- | :--- |
| **Administrator** | Full Management Portal | All `/api/admin/*`, `/api/orders/*`, `/api/*` | None | `authenticateStaff`, `requireAdmin` |
| **Staff** | Restricted Portal | `/api/admin/orders`, `/api/admin/orders/:id/status` | `/api/admin/staff`, `/api/admin/dashboard`, `/api/admin/sellers` | `requireAdmin` returns 403 |
| **Seller** | Planned Shells (Blocked) | `/api/seller/auth/*`, `/api/seller/stores`, `/api/seller/orders` (GET only) | All `/api/admin/*`, order mutations (405) | `authenticateSeller` |
| **Customer** | Storefront & Orders | `/api/orders` (owned), `/api/auth/me` | All `/api/admin/*`, `/api/seller/*` | `authenticateCustomer` returns 401/403 |

### Security Strengths Verified
1. **Dynamic Token Demotion Invalidation:** In `backend/src/middleware/auth.js:89`, `authenticateStaff` queries the live database for `staff.role` and compares it to `decoded.role`. If an administrator demotes a user from `admin` to `staff`, their existing admin JWT is immediately rejected with HTTP 403.
2. **Deactivation Lockout:** Inactive users (`is_active = FALSE`) have their tokens revoked on the very next HTTP request across staff, seller, and customer middleware.
3. **Last Administrator Protection:** In `backend/src/routes/admin/staff.js:58`, a database query checks `COUNT(*) WHERE role = 'admin' AND is_active = TRUE AND id != :id`. The system rejects demoting or deactivating the last active admin with HTTP 400.
4. **Fail-Closed Seller Isolation:** In `backend/src/routes/seller/orders.js:33`, an unassigned seller receives an empty array. Sellers can only view orders where `store_id = ANY(assigned_store_ids)`. Cross-store access returns HTTP 403.
5. **Mutation Lockout on Sellers:** `backend/src/routes/seller/orders.js:143` rejects `POST`, `PUT`, `PATCH`, and `DELETE` on seller orders with HTTP 405 Method Not Allowed.

---

## 11. Frontend/Backend Integration Findings

1. **Missing Backend Endpoint for Seller Profile Updates:**
   - **File:** [management-portal/src/lib/api.ts:414](file:///Users/bunvathana/Documents/Code/Project/coffee-milk-tea-shop/management-portal/src/lib/api.ts#L414)
   - **Call:** `PATCH /api/admin/sellers/:id`
   - **Backend File:** `backend/src/routes/admin/sellers.js`
   - **Defect:** `admin/sellers.js` contains `router.patch('/:id/status')` but has **no handler** for `router.patch('/:id')`. When an admin attempts to update a seller's full name or reset their password in the UI, Express returns **HTTP 404 Not Found**.
2. **Management Portal Login Rejection of Sellers:**
   - **File:** [management-portal/src/auth/AuthProvider.tsx:76](file:///Users/bunvathana/Documents/Code/Project/coffee-milk-tea-shop/management-portal/src/auth/AuthProvider.tsx#L76)
   - **Defect:** `AuthProvider.login` passes credentials to `loginStaff` (`POST /api/admin/auth/login`). If a seller tries to log in, the backend returns HTTP 403 (unsupported staff role). Even if it returned 200, `supportedLandingPath` explicitly returns `null` for non-admins, throwing *"This portal currently supports administrator accounts only."*
3. **Environment Variable Configuration Gap in Customer Frontend:**
   - **File:** [frontend/src/services/api.ts:4](file:///Users/bunvathana/Documents/Code/Project/coffee-milk-tea-shop/frontend/src/services/api.ts#L4)
   - **Defect:** If `VITE_API_URL` is omitted in Vercel production, `getBaseUrl()` defaults to `http://localhost:8001`. On an HTTPS domain, browser security blocks all requests due to Mixed Content restrictions. In contrast, `management-portal` correctly throws a build/runtime configuration error if `VITE_API_URL` is missing.

---

## 12. Deployment & Infrastructure Audit

### The Nested Git Repository Problem (CRITICAL ROOT CAUSE)
Inspection of the filesystem reveals a fatal version control split:
- Root repository `coffee-milk-tea-shop` (`https://github.com/Bunvathana876/coffee-milk-tea-shop.git`) is on branch `feature/brew-boba-rbac-updates`.
- Subdirectory `backend/` contains its **own independent `.git` repository** pointing to `https://github.com/Bunvathana876/coffee-milk-tea-shop-backend.git`!
- The remote `coffee-milk-tea-shop-backend` has NOT been updated since **October 28, 2026** (commit `189d001`).
- In the local working tree, `backend/` has 19 modified files and 21 untracked files.
- In the root repository, `backend/src/server.js` was committed in `592662b`, importing:
  ```javascript
  import adminCustomersRouter from './routes/admin/customers.js';
  import adminSellersRouter from './routes/admin/sellers.js';
  import adminStoresRouter from './routes/admin/stores.js';
  import sellerAuthRouter from './routes/seller/auth.js';
  import sellerStoresRouter from './routes/seller/stores.js';
  import sellerOrdersRouter from './routes/seller/orders.js';
  ```
  **NONE of these imported files are committed to either Git repository!**
- **Impact on Render:** If Render builds from `coffee-milk-tea-shop-backend`, it runs 2-week-old code missing all migrations and settlement logic. If Render builds from the root repository, it **crashes immediately** with `ERR_MODULE_NOT_FOUND` because the route files were never pushed to GitHub!

### Neon PostgreSQL Infrastructure
- **Project ID:** `spring-rain-57515077` (`brew-boba-cafe`)
- **Staging Branch:** `br-silent-water-a1z4n5ct` (Schema partially applied: migrations 001 and 002 present; 003 absent; audit logs absent).
- **Production Branch:** `br-shy-sky-a14lgyqi` (Empty: 0 tables in `public` schema).

---

## 13. Automated Test Results

All test suites were executed directly during this audit:

### Backend API Test Suite (`npm test --prefix backend`)
- **Command:** `node --test test/*.test.js`
- **Result:** **119 Passed, 3 Failed, 0 Skipped (Total: 122 tests)**
- **Failure 1:** `test/adminSellers.test.js:236`
  - *Test:* `14. Admin can update seller profile and password`
  - *Error:* `AssertionError: 404 !== 200`
  - *Cause:* Missing `PATCH /api/admin/sellers/:id` endpoint in `backend/src/routes/admin/sellers.js`.
- **Failure 2:** `test/stagingSafety.test.js:315`
  - *Test:* `migration verification rejects missing or disabled payment audit triggers`
  - *Error:* `Database migrations are missing or have changed.`
  - *Cause:* `stagingSafety.test.js` hardcoded the old checksum for `003_stores_and_assignments.sql` (`ef87f...`), but the file was edited, altering its SHA-256 hash to `ca18f...`.
- **Failure 3:** `test/storeSecurity.test.js:157`
  - *Test:* `3. Admin can list stores and view store details with metrics`
  - *Error:* `AssertionError: assert.ok(listRes.data.items.length >= 2)`
  - *Cause:* In-memory test mock database (`MemoryPgDb` in `database.js:506`) only matches queries without `JOIN`. The store query uses `LEFT JOIN seller_store_assignments`, causing the mock to return 0 rows.

### Management Portal Test Suite (`npm test --prefix management-portal`)
- **Command:** `tsx --test src/lib/*.test.ts*`
- **Result:** **74 Passed, 0 Failed (100% Pass Rate)**
- **Coverage:** Verified role gates, session invalidation, permission matrix badge mapping, currency formatting, accessible table skeletons, and high-contrast styling.

### Management Portal Production Build (`npm run build --prefix management-portal`)
- **Command:** `tsc --noEmit && vite build`
- **Result:** **SUCCESS** (Compiled 2,085 modules in 248ms; clean bundle generation).

### Customer Frontend Test Suite (`npm test --prefix frontend`)
- **Command:** `jiti src/features/cart/cart.test.ts && jiti src/utils/paymentStatus.test.ts && jiti src/features/auth/auth.test.ts`
- **Result:** **18 Passed, 0 Failed (100% Pass Rate)**
- **Coverage:** Cart calculations, dual currency conversion, localStorage corruption recovery, payment status decoupling, idempotency digest determinism.

### Customer Frontend Production Build (`npm run build --prefix frontend`)
- **Command:** `tsc -b && vite build`
- **Result:** **SUCCESS** (Compiled 2,153 modules in 298ms; chunks generated cleanly).

### Flutter Mobile Test Suite (`flutter test`)
- **Command:** `flutter test`
- **Result:** **25 Passed, 0 Failed (100% Pass Rate)**
- **Static Analysis:** `flutter analyze` reported **No issues found**.

---

## 14. UI/UX and Accessibility Audit

### Role Controller & Add Seller Contrast Review
- In previous audits, poor text contrast was flagged on form labels in the Add Seller drawer and section subtitles in the Role Controller.
- **Source Code Verification:**
  - In [management-portal/src/styles.css:5509](file:///Users/bunvathana/Documents/Code/Project/coffee-milk-tea-shop/management-portal/src/styles.css#L5509), `.form-label` has been assigned explicit high-contrast colors: `color: var(--text-label, #17294D) !important;` in light mode and `#E2E8F0` in dark mode.
  - In [RoleControllerPage.tsx:447-451](file:///Users/bunvathana/Documents/Code/Project/coffee-milk-tea-shop/management-portal/src/pages/RoleControllerPage.tsx#L447-L451), titles and subtitles utilize Tailwind classes `text-slate-900 dark:text-zinc-50` and `text-slate-800 dark:text-zinc-200`.
  - In [SellersPage.tsx:123-172](file:///Users/bunvathana/Documents/Code/Project/coffee-milk-tea-shop/management-portal/src/pages/SellersPage.tsx#L123), all form fields include semantic `<label className="form-label text-xs font-bold" htmlFor="...">` associations.
- **Strict Visual Verification Notice:** These styles are verified at the source and stylesheet level and validated via DOM unit tests. In accordance with strict audit rules, browser-rendered visual screenshots were not captured automatically.

---

## 15. Critical Bugs (Catalog of Defects)

### Bug 1: Nested Git Repository Split & Untracked Backend Files
- **Severity:** P0 (Critical / Deployment Blocker)
- **Location:** Project Root & `backend/`
- **Evidence:** `backend/.git` exists pointing to a separate remote; `backend/src/routes/admin/customers.js`, `sellers.js`, `stores.js`, `routes/seller/*`, and `migrations/003_stores_and_assignments.sql` are untracked in root git.
- **Impact:** Any deployment from GitHub will crash or run obsolete code.

### Bug 2: Missing `PATCH /api/admin/sellers/:id` Endpoint
- **Severity:** P1 (High / Broken Required Functionality)
- **Location:** `backend/src/routes/admin/sellers.js`
- **Evidence:** `management-portal` calls `PATCH /api/admin/sellers/:id` in `updateSeller()`. Express returns 404 because only `/:id/status` is implemented.
- **Impact:** Administrators cannot update seller profiles or reset seller passwords.

### Bug 3: Missing Migration 003 & Audit Table on Neon Staging
- **Severity:** P0 (Critical / Staging Blocker)
- **Location:** Neon Staging Branch (`br-silent-water-a1z4n5ct`)
- **Evidence:** Neon `schema_migrations` only lists `001` and `002`. Tables `stores`, `seller_store_assignments`, and `security_audit_logs` are missing.
- **Impact:** Backend `verifyMigrations()` crashes on boot. Security audit events fail and abort database transactions.

### Bug 4: Completely Empty Production Database
- **Severity:** P0 (Critical / Production Blocker)
- **Location:** Neon Production Branch (`br-shy-sky-a14lgyqi`)
- **Evidence:** Direct inspection returned 0 tables in `public` schema.
- **Impact:** Total failure if deployed to production.

### Bug 5: Stale Checksum in Staging Safety Unit Test
- **Severity:** P1 (High / Test Suite Failure)
- **Location:** `backend/test/stagingSafety.test.js:323`
- **Evidence:** Mock database specifies checksum `ef87f...`, but actual file hash is `ca18f...`.
- **Impact:** `npm test --prefix backend` fails during verification.

### Bug 6: In-Memory Test Mock Database Inability to Parse SQL JOINs
- **Severity:** P2 (Medium / Test Reliability)
- **Location:** `backend/src/db/database.js:506`
- **Evidence:** `MemoryPgDb` contains `!/JOIN/i.test(cleanSql)`. Any query joining `stores` with `seller_store_assignments` returns 0 rows in isolated tests.
- **Impact:** `backend/test/storeSecurity.test.js` fails assertion `items.length >= 2`.

---

## 16. Missing Features (Gap Analysis)

1. **Automated Payment Processing:** No payment gateway (Bakong KHQR Open API, ABA PayWay, Stripe) is integrated. KHQR is a client-rendered demo.
2. **Seller Self-Service Portal:** All routes under `/seller/*` in the management portal are dummy placeholder pages.
3. **Seller Login in Management Portal:** The portal login form only authenticates administrators and explicitly blocks sellers.
4. **SMS Phone OTP Verification:** Customer registration accepts any phone number without verifying ownership via SMS.
5. **Direct Media Uploads:** Products and categories require external image URLs; there is no direct S3/object storage file upload flow.

---

## 17. Technical Debt

1. **Dual Git Remotes:** The project must be unified into a single monorepo repository on GitHub so that frontend, backend, and portal changes are deployed atomically.
2. **Regex-Based Mock Database:** `MemoryPgDb` in `backend/src/db/database.js` uses complex regular expressions to simulate PostgreSQL in unit tests. It is brittle and fails when SQL queries use JOINs. A lightweight embedded database or ephemeral container (e.g. pg-mem or testcontainers) should be adopted.
3. **Legacy Admin Codebase:** Deprecated code remains in `archive/legacy-admin/`. While isolated, it should be permanently purged once all portal features are stable.
4. **Mobile App Branding Discrepancy:** The mobile app's `appName` is `'Coffee Cute'` instead of `'Brew & Boba Café'`.

---

## 18. Prioritized Remediation Roadmap

### Phase P0 — Critical Deployment & Infrastructure Fixes (Immediate)
1. **P0-1: Reconcile Git Repositories:** Commit all untracked backend files (`customers.js`, `sellers.js`, `stores.js`, `seller/*`, `audit.js`, `003_stores_and_assignments.sql`) into the primary repository and synchronize `coffee-milk-tea-shop-backend`.
2. **P0-2: Apply Migration 003 on Staging:** Execute `003_stores_and_assignments.sql` on the Neon staging branch (`br-silent-water-a1z4n5ct`) to create `stores`, `seller_store_assignments`, `security_audit_logs`, and `orders.store_id`.
3. **P0-3: Record Staging Migration Ledger:** Insert migration record `003` into `schema_migrations` so `verifyMigrations()` passes on boot.
4. **P0-4: Initialize Production Database:** Run migrations 001, 002, and 003 and configure required PostgreSQL triggers on Neon production (`br-shy-sky-a14lgyqi`).

### Phase P1 — High-Priority Functional & Test Fixes
5. **P1-1: Implement `PATCH /api/admin/sellers/:id`:** Add the missing handler in `backend/src/routes/admin/sellers.js` to support updating seller names and passwords.
6. **P1-2: Fix Staging Safety Test Checksum:** Update the mock SHA-256 hash in `backend/test/stagingSafety.test.js:323` to match `003_stores_and_assignments.sql`.
7. **P1-3: Fix Memory Database Mock for Stores JOIN:** Update `backend/src/db/database.js:506` so `MemoryPgDb` returns store rows when a `LEFT JOIN` is present.
8. **P1-4: Configure `VITE_API_URL` on Vercel:** Verify that both `frontend` and `management-portal` production deployments on Vercel have `VITE_API_URL` set to the live Render backend HTTPS URL.

### Phase P2 — Medium-Priority Roadmap Features
9. **P2-1: Build Seller Portal UI:** Replace `PlannedPage` shells in `management-portal/src/App.tsx` with functional views for store-assigned order viewing.
10. **P2-2: Add Seller Login Flow:** Allow sellers to authenticate into a store-scoped dashboard.
11. **P2-3: Standardize Mobile Branding:** Update `AppConfig.appName` in Flutter to `'Brew & Boba Café'`.

### Phase P3 — Low-Priority & Future Enhancements
12. **P3-1: Real Payment Gateway:** Integrate Bakong KHQR Open API or ABA PayWay webhook listeners.
13. **P3-2: Neon Object Storage Uploads:** Replace raw image URL inputs with direct S3-compatible image uploads.

---

## 19. Safe Staging Rollout Checklist

Before promoting this project to a live staging environment, the operator must execute and verify:

- [ ] Unify and push all untracked backend files to the primary GitHub repository.
- [ ] Ensure Render web service is connected to the primary repository and building the correct branch.
- [ ] Connect to Neon staging (`br-silent-water-a1z4n5ct`) and apply `003_stores_and_assignments.sql`.
- [ ] Verify `schema_migrations` contains rows for `001`, `002`, and `003` with correct SHA-256 checksums.
- [ ] Verify triggers `payment_audit_immutable` and `payment_audit_no_truncate` are enabled on `payment_settlements`.
- [ ] Deploy backend to Render with `ENVIRONMENT=staging`.
- [ ] Confirm backend boots successfully without `verifyMigrations` throwing errors (`GET /api/health` returns 200).
- [ ] Set `VITE_API_URL` on Vercel staging environments for both frontend and management portal.
- [ ] Execute an end-to-end smoke test on staging: Customer registration -> order checkout -> admin order view -> cash settlement.

---

## 20. Final Completion Decision

### Decision A: Is the current MVP feature-complete?
> **NO**
> 
> *Rationale:* While customer catalog ordering, digital receipts, cart persistence, and admin catalog/order workflows are functionally complete, **payment processing is completely unautomated** (KHQR is a visual mockup), and **seller profile management is broken** due to a missing backend PATCH endpoint. For a portfolio demonstration or in-store cash-only café, it is nearly ready; for an end-to-end commercial ordering MVP, payment automation is missing.

### Decision B: Is the project ready for Staging?
> **NO**
> 
> *Rationale:* Starting the backend against the current Neon staging database will **crash the application on boot** because Migration 003 has not been applied to staging, causing `verifyMigrations()` to abort. Furthermore, critical backend routes are untracked in the Git repository and will fail to build on remote cloud hosts.

### Decision C: Is the project ready for Production?
> **NO**
> 
> *Rationale:* The production database on Neon is completely empty (0 tables). The Render deployment is pointing to a stale repository from October 28. No live payment provider is connected.

---

## Summary Answers to Final Questions

### "IS BREW & BOBA CAFÉ FINISHED?"
**No, the project is not finished.**  
It is an advanced, well-structured, and high-quality prototype/pre-release build, but critical deployment, database migration, and backend integration gaps prevent it from being production-ready.

### "What is still missing?"
1. Migration 003 has not been run on Neon staging or production.
2. The production database is completely uninitialized.
3. Six backend route and test files are not committed to Git.
4. The backend is missing `PATCH /api/admin/sellers/:id`.
5. The Seller Portal UI (`/seller/*`) in the management portal is unbuilt.
6. Automated payment gateway integration (KHQR is a demo).

### "What should I fix first?"
**Fix the Git repository mismatch and commit the untracked backend files immediately.** Without this, no cloud deployment on Render or Vercel can run the latest code.

### "What features are safe to use now?"
- **Customer Storefront:** Menu browsing, cart operations, drink customizations, customer authentication, order history, and PDF receipt downloads.
- **Admin Management Portal:** Drink catalog CRUD, category CRUD, order queue status updates, customer directory search/metrics, and cash settlement recording.
- **Flutter App:** In-memory catalog browsing, cart operations, and local idempotency testing.

### "What is the exact next development phase?"
**Phase P0 & P1 Remediation:** Commit all backend files, apply migration 003 to Neon staging, implement `PATCH /api/admin/sellers/:id`, fix the 3 failing backend unit tests, and perform a successful staging deployment on Render and Vercel.
