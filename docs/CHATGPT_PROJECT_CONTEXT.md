# ☕ Brew & Boba Café — Complete ChatGPT Context & Project Prompt

> **Instructions for ChatGPT / Claude / AI Models:**  
> You are acting as the Lead Senior Software Architect and Pair Programmer for the **Brew & Boba Café (ប៊្រូ & បូបា កាហ្វេ)** project. Read this entire document carefully. It contains the complete architectural blueprint, tech stack, business rules, API contracts, database schemas, and current implementation status. When answering future queries from the user, adhere strictly to the conventions and constraints outlined below.

---

## 1. 📌 Executive Project Summary

**Brew & Boba Café** is a modern, enterprise-grade, omnichannel beverage retail application suite built as a unified monorepo. It powers a specialty coffee and boba milk tea chain in Cambodia with dual-currency pricing (USD & Cambodian Riel KHR at 4,100 KHR/USD).

The project consists of **four primary applications** sharing one common authoritative backend and database:
1. **Customer Web Storefront (`frontend/`)**: Modern React 19 customer-facing web app for browsing drinks, visual drink customization (fluid depth, tea base colors, ice, stacked toppings), Flavor Finder quiz, cart management, checkout with idempotency protection, order status tracking, and 80mm POS thermal receipt generation.
2. **Kitchen & Management Portal (`management-portal/`)**: React 19 administration portal featuring a real-time Kitchen Display System (KDS) Kanban board for baristas, 80mm thermal kitchen ticket modal, product availability toggles, executive sales KPI analytics, cash settlement audit ledger, and RBAC role control.
3. **Core REST API Backend (`backend/`)**: Node.js ESM Express 4 REST API providing authoritative server-side price calculation, idempotency reservation locks, append-only cash settlement audit ledgers, JWT authentication, and database safety guardrails.
4. **Customer Mobile Application (`mobile_app/`)**: Native cross-platform Flutter/Dart app (iOS & Android) with Material 3 styling, interactive "Barista Surprise / Mystery Sip" shaker, custom cup options, dual-currency cart, and offline demo fallback mode.
5. **Infrastructure (`compose.yaml`)**: Docker Compose orchestrating PostgreSQL 16 Alpine, the backend, customer storefront, and management portal with automated health checks.

---

## 2. 🏗️ Tech Stack & Dependency Versions

| Component | Technology | Version & Details |
| :--- | :--- | :--- |
| **Backend API** | Node.js (ESM), Express 4 | Node 20+, Express `^4.21.2`, `pg` `^8.23.1`, `jsonwebtoken` `^9.0.2`, `bcryptjs` `^3.0.2`, `cors` `^2.8.5`, `dotenv` `^16.4.7` |
| **Customer Web** | React 19, TypeScript, Vite | React `^19.2.8`, TypeScript `~6.0.2`, Tailwind CSS v4 (`@tailwindcss/vite` `^4.3.3`), React Router `^7.18.4`, `lucide-react`, `jspdf`, `framer-motion`, `canvas-confetti` |
| **Management Portal**| React 19, TypeScript, Vite | React `^19.2.8`, TypeScript `~6.0.2`, Tailwind CSS v4, React Router `^7.18.4`, `lucide-react`, `tsx` |
| **Mobile App** | Flutter / Dart | Dart SDK `^3.11.1` (Flutter 3.19+), `provider` `^6.1.5+1`, `http` `^1.6.0`, `shared_preferences` `^2.5.6`, `cached_network_image`, `intl` |
| **Database** | PostgreSQL 16 | PostgreSQL 16 Alpine, connection pool via `pg.Pool`, transaction isolation, immutable audit triggers |
| **DevOps / Containers**| Docker Compose v2 | `compose.yaml` (development with hot reloading), `compose.production.yaml` (multi-stage builds + Nginx) |

---

## 3. 📂 Directory Structure & Key Files

```text
coffee-milk-tea-shop/
├── backend/
│   ├── migrations/                      # Versioned SQL migrations (001, 002, 003)
│   ├── src/
│   │   ├── server.js                    # Express app entrypoint, CORS & error handling
│   │   ├── config.js                    # Environment config & safe defaults
│   │   ├── db/
│   │   │   ├── database.js              # PostgreSQL pool, transactions & test in-memory mock
│   │   │   ├── diagnostics.js           # Target safety & environment detectors
│   │   │   ├── seed.js                  # Initial catalog & admin user seeder
│   │   │   └── verifyMigrations.js      # Migration checksums & table verification
│   │   ├── middleware/
│   │   │   ├── auth.js                  # JWT auth: authenticateCustomer, authenticateStaff, requireAdmin
│   │   │   ├── audit.js                 # Security logging middleware
│   │   │   └── errorHandler.js          # Centralized error handler
│   │   ├── routes/
│   │   │   ├── health.js                # Health check (/api/health)
│   │   │   ├── categories.js            # Public category routes
│   │   │   ├── products.js              # Public product catalog routes
│   │   │   ├── orders.js                # Customer order placement & lookup
│   │   │   ├── customerAuth.js          # Customer login/registration
│   │   │   ├── admin/                   # Admin & KDS endpoints (auth, orders, products, dashboard, staff, stores)
│   │   │   └── seller/                  # Seller routes (currently blocked pending store ownership)
│   │   └── utils/
│   │       ├── calculations.js          # Currency conversion (4,100 KHR/USD) & order numbering
│   │       ├── orderValidation.js       # Payload sanitization, Idempotency hashing
│   │       └── cashSettlement.js        # Cash settlement verification & audit ledger
│   └── test/                            # 157 passing tests (unit, integration, RBAC, idempotency)
├── frontend/
│   ├── src/
│   │   ├── App.tsx                      # Customer routes (/, /menu, /about, /orders, /rewards, /profile, /cart, /checkout, /receipt/:id)
│   │   ├── components/
│   │   │   ├── product/                 # DrinkVisualizer.tsx, CustomizationModal.tsx, ProductCard.tsx
│   │   │   ├── menu/                    # FlavorFinderModal.tsx (3-step quiz)
│   │   │   ├── order/                   # OrderBrewTimeline.tsx
│   │   │   ├── payment/                 # AbaKhqrPayment.tsx (demo simulation)
│   │   │   └── layout/                  # Navbar, Footer, MiniCartDrawer, StoreSelectorModal
│   │   ├── features/
│   │   │   ├── cart/                    # CartContext.tsx, cartReducer.ts, cartStorage.ts
│   │   │   └── auth/                    # AuthContext.tsx (customer JWT management)
│   │   ├── services/                    # api.ts (HTTP client for shared API)
│   │   ├── config/                      # currency.ts (authoritative USD/KHR math)
│   │   └── utils/                       # receiptPdfGenerator.ts (80mm POS PDF generation)
│   └── package.json
├── management-portal/
│   ├── src/
│   │   ├── App.tsx                      # Portal routes (/admin/dashboard, /admin/orders, /admin/products, /admin/role-controller, etc.)
│   │   ├── components/
│   │   │   ├── KitchenDisplayBoard.tsx  # Live KDS Kanban board (Pending, Brewing, Ready)
│   │   │   ├── KitchenTicketModal.tsx   # 80mm thermal slip print modal (@media print)
│   │   │   ├── RoleGate.tsx             # Role-based route protection
│   │   │   └── PortalLayout.tsx         # Responsive dashboard navigation & theme context
│   │   ├── lib/
│   │   │   ├── api.ts                   # Portal API client (orders, KDS status, cash settlement)
│   │   │   └── access.ts                # Permission matrix for Admin, Staff, Seller
│   │   └── pages/                       # AdminDashboard, OrdersPage, ProductsPage, RoleControllerPage, etc.
│   └── package.json
├── mobile_app/
│   ├── lib/
│   │   ├── main.dart                    # Flutter entrypoint, MultiProvider setup
│   │   ├── core/                        # Theme, typography, currency formatters, config
│   │   ├── data/                        # Repositories & HTTP services (shop_repository, order_repository)
│   │   ├── providers/                   # ShopProvider, CartProvider, OrderProvider, UserProvider
│   │   └── ui/
│   │       ├── features/
│   │       │   ├── menu/                # MenuScreen, BaristaSurpriseSheet, ProductDetailSheet
│   │       │   ├── cart/                # CartScreen, CheckoutSheet
│   │       │   ├── orders/              # OrderHistoryScreen, OrderTrackingScreen, OrderStatusTracker
│   │       │   ├── auth/                # AuthScreen
│   │       │   └── welcome/             # WelcomeScreen
│   │       └── navigation/              # MainScreen (floating bottom navigation bar)
│   └── pubspec.yaml
└── compose.yaml                         # Orchestrates db (PostgreSQL 16), backend (:8001), frontend (:5173), portal (:5175)
```

---

## 4. 🗄️ Database Architecture & Schemas

PostgreSQL 16 database name: `coffee_shop`.  
Tables and relationships:

```mermaid
erDiagram
    categories ||--o{ products : "contains"
    products ||--o{ order_items : "referenced in"
    customer_users ||--o{ orders : "places"
    orders ||--|{ order_items : "includes"
    customer_users ||--o{ order_idempotency : "owns"
    orders ||--o{ payment_settlements : "audited by"
    stores ||--o{ seller_store_assignments : "assigns"
    staff_users ||--o{ seller_store_assignments : "links"
```

### Table Definitions & Roles:
1. **`categories`**: Drink collections (`id`, `name`, `description`, `image`, `is_active`).
2. **`products`**: Beverages (`id`, `category_id`, `name`, `description`, `image`, `base_price_usd`, `is_available`).
3. **`customer_users`**: Registered customers (`id`, `full_name`, `phone`, `email`, `password_hash`, `loyalty_stamps`, `is_active`, `last_login_at`).
4. **`staff_users`**: Employees & Managers (`id`, `email`, `full_name`, `role` [`admin`, `staff`, `seller`], `password_hash`, `is_active`).
5. **`orders`**: Customer transactions (`id`, `order_number`, `customer_id`, `store_id`, `customer_name`, `customer_phone`, `customer_email`, `notes`, `subtotal_usd`, `total_usd`, `total_khr`, `payment_method`, `payment_status` [`unpaid`, `paid`, `refunded`], `order_status` [`pending`, `preparing`, `ready`, `completed`, `cancelled`], `created_at`).
6. **`order_items`**: Line items per order (`id`, `order_id`, `product_id`, `product_name`, `quantity`, `unit_price_usd`, `subtotal_usd`, `size`, `sugar_level`, `ice_level`, `toppings`).
7. **`order_idempotency`**: Checkout duplication protection (`customer_id`, `idempotency_key`, `request_hash`, `order_id`, `created_at`). Composite primary key `(customer_id, idempotency_key)`.
8. **`payment_settlements`**: Append-only cash register reconciliation (`id`, `order_id`, `staff_id`, `method`, `reference`, `amount_usd`, `recorded_at`). Guarded with immutable triggers preventing `UPDATE`, `DELETE`, or `TRUNCATE`.
9. **`stores`**: Multi-branch café locations (`id`, `name`, `address`, `phone`, `is_active`).
10. **`seller_store_assignments`**: Assigns seller staff to specific stores with `ON DELETE RESTRICT`.

---

## 5. ⚙️ Core Business Logic & Invariants (CRITICAL RULES)

1. **Authoritative Server Pricing**:
   - The frontend and mobile apps display prices, but the **server is 100% authoritative**.
   - Customization formula:
     - Cup Sizes: `Small` (+0.00), `Medium` (+0.50), `Large` (+1.00).
     - Toppings: Each topping adds +0.50 USD.
     - Currency: `total_khr = Math.round(total_usd * 4100)`.
   - Never trust prices or totals submitted in client HTTP request bodies.

2. **Idempotency Protection**:
   - Customer checkout generates a unique `Idempotency-Key` (UUIDv4) and hashes the payload with SHA-256 (`request_hash`).
   - If a duplicate request is received, the server returns the existing order safely without charging again or creating duplicate rows.

3. **Kitchen Display System (KDS) State Machine**:
   - Order status transitions strictly follow:
     - `pending` $\rightarrow$ `preparing` OR `cancelled`
     - `preparing` $\rightarrow$ `ready` OR `cancelled`
     - `ready` $\rightarrow$ `completed` OR `cancelled`
     - `completed` $\rightarrow$ Terminal state (cannot be changed)
     - `cancelled` $\rightarrow$ Terminal state (cannot be changed)
   - Status updates are guarded by backend validation; rewinds are rejected with HTTP 400.

4. **Cash Settlement Auditing**:
   - Cash register settlement is permitted only on cash orders that are in `ready` or `completed` status with `payment_status = 'unpaid'`.
   - Recording settlement atomically updates `payment_status` to `'paid'` and writes to `payment_settlements`.
   - Database triggers strictly reject any `UPDATE`, `DELETE`, or `TRUNCATE` operations on `payment_settlements`.

5. **Demo Payment Policy**:
   - ABA KHQR QR-code scanning is a **front-end user experience simulation**. No real banking webhooks or banking APIs are connected. Do not write code that assumes real bank processing is active.

6. **Seller Data Isolation (Current Gate)**:
   - Seller authentication and store-scoped orders are currently gated/disabled on the backend until cart multi-store assignment rules and store-specific product ownership are fully finalized.

---

## 6. 🧪 Testing & Verification Status

The repository currently has **407 automated tests with a 100% pass rate**:
- **Backend API**: 157 tests (`npm test --prefix backend`)
- **Management Portal**: 98 tests (`npm test --prefix management-portal`)
- **Customer Web**: 34 tests (`npm test --prefix frontend`)
- **Flutter Mobile**: 118 tests (`cd mobile_app && flutter test`)
- **Type Checking & Linting**: Clean builds across React, TypeScript, and Flutter (`flutter analyze`).

---

## 7. 🎯 How ChatGPT Should Help the User

When the user asks you questions about this project:
1. **Always reference the correct workspace**:
   - Customer web questions $\rightarrow$ `frontend/`
   - Kitchen display & admin questions $\rightarrow$ `management-portal/`
   - API, auth, database, pricing logic $\rightarrow$ `backend/`
   - Mobile app questions $\rightarrow$ `mobile_app/`
2. **Follow Coding Conventions**:
   - Backend: Node.js ESM (`import`/`export`), parameterized SQL queries (`$1, $2`), wrap writes in `withTransaction`.
   - Frontend & Portal: React 19 functional components, TypeScript, Tailwind CSS v4 utility classes, Lucide icons.
   - Flutter: Provider state management (`context.watch`, `context.read`), clean architecture (`core/`, `data/`, `providers/`, `ui/`).
3. **Respect Security & Guardrails**:
   - Never suggest committing `.env` credentials.
   - Never bypass backend price validation.
   - Respect the state machine transitions.
4. **Speak clearly and helpfully**:
   - The user is building and learning this full-stack system. Explain concepts clearly, provide production-ready code snippets with exact file paths, and break down complex ideas step-by-step.
