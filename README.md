# ☕ Brew & Boba Café (ប៊្រូ & បូបា កាហ្វេ)

[![Node.js](https://img.shields.io/badge/Node.js-20.x%20%7C%2022.x-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.21-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-v4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Flutter](https://img.shields.io/badge/Flutter-3.19%2B-02569B?logo=flutter&logoColor=white)](https://flutter.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Docker Compose](https://img.shields.io/badge/Docker%20Compose-v2-2496ED?logo=docker&logoColor=white)](https://docs.docker.com/compose/)
[![Tests Passing](https://img.shields.io/badge/Tests-407%20Passed-brightgreen?logo=checkmarx&logoColor=white)](#-testing--verification)

> **Modern, full-stack omnichannel drink ordering, Kitchen Display System (KDS), and multi-store management platform for specialty coffee and boba milk tea shops.**

---

## 📌 Overview

**Brew & Boba Café** is an enterprise-grade beverage retail application suite engineered as a unified monorepo. It encompasses a customer-facing web storefront, a dedicated kitchen and store management portal, an authoritative Node.js/Express REST API backend, and a native Flutter mobile application for iOS and Android.

The platform orchestrates the complete operational lifecycle of modern café commerce:
- **Customers** browse drink menus, interact with a dynamic SVG/CSS **Drink Visualizer**, receive tailored recommendations via the **Flavor Finder Taste Matcher Quiz**, order with dual-currency pricing (USD / KHR), and monitor preparation live on a dedicated tracking timeline.
- **Baristas** operate a real-time **Kitchen Display System (KDS)** Kanban board, track elapsed order timers, inspect recipe ticket specifications, print 80mm thermal order slips, and advance orders safely through validated state machines.
- **Store Managers & Admins** supervise executive revenue KPIs, reconcile cash register handoffs into an append-only immutable audit ledger, manage catalog stock, and configure multi-tenant store assignments with role-based access control.

```mermaid
flowchart TB
    subgraph Clients["Customer & Staff Touchpoints"]
        WebStore["Customer Web Storefront\n(React 19 + Tailwind v4 + Vite)\n:5173"]
        MobileApp["Customer Mobile App\n(Flutter + Material 3)\niOS & Android"]
        Portal["Kitchen & Management Portal\n(React 19 + Tailwind v4 + Vite)\n:5175"]
    end

    subgraph BackendGateway["Backend & API Services"]
        API["Shared REST API\n(Node.js ESM + Express 4)\n:8001 / :8000"]
        AuthMiddleware["JWT Auth & RBAC\n(Customer, Staff, Admin, Seller)"]
        Idempotency["Idempotency Protection\n(SHA-256 Composite Request Hashing)"]
        Diagnostics["Startup Diagnostics &\nTarget Safety Verification"]
    end

    subgraph Storage["Data Tier & Cloud Infrastructure"]
        PostgresLocal["PostgreSQL 16 Engine\n(Docker Compose :5432)"]
        NeonCloud["Neon Serverless PostgreSQL\n(Cloud Staging / Production)"]
        AuditTriggers["Append-Only Audit Ledger\n& Safety Triggers"]
    end

    WebStore -->|"Browse, Customize & Order"| API
    MobileApp -->|"Browse, Mystery Sip & Poll"| API
    Portal -->|"KDS Board & Management"| API

    API --> AuthMiddleware
    API --> Idempotency
    API --> Diagnostics
    API --> PostgresLocal
    API -.-> NeonCloud
    PostgresLocal --> AuditTriggers
    NeonCloud --> AuditTriggers
```

---

## 🏗️ Monorepo Architecture

The repository is structured into isolated, purpose-built workspaces:

| Directory | Stack | Purpose & Capabilities |
| :--- | :--- | :--- |
| [frontend/](./frontend) | React 19, TypeScript, Vite, Tailwind CSS v4, Lucide, Framer Motion, jsPDF | **Customer Web Storefront**: Drink builder, interactive liquid/topping visualizer, Flavor Finder quiz, dual-currency cart, idempotent checkout, order tracking, and 80mm PDF receipts. |
| [management-portal/](./management-portal) | React 19, TypeScript, Vite, Tailwind CSS v4, Lucide | **Kitchen Display System & Admin Portal**: Live KDS Kanban board, 80mm thermal slip print modal, revenue KPI dashboard, product stock toggle, cash settlement auditing, and RBAC role controller. |
| [backend/](./backend) | Node.js ESM, Express 4, PostgreSQL (`pg`), JWT, bcryptjs | **Core REST API Backend**: Authoritative dual-currency pricing, order idempotency, append-only payment audit ledger, multi-store RBAC, and database startup safety guards. |
| [mobile_app/](./mobile_app) | Flutter (Dart 3), Provider, Material 3, HTTP | **Customer Mobile App**: Cross-platform iOS & Android app with drink customization, Barista Surprise randomizer, offline fallback mode, and order polling. |
| [compose.yaml](./compose.yaml) | Docker Compose v2 | **Local Multi-Service Orchestration**: Coordinates PostgreSQL 16, backend REST API, customer web storefront, and management portal with automated health checks. |
| `archive/legacy-admin/` | Vite, React | *(Local archive)* Preserved legacy admin interface kept for historical reference. |

---

## ✨ Key Features & Capabilities

### 1. 🛍️ Customer Ordering & Web Storefront (`frontend/`)
- **Interactive Drink Visualizer**: Dynamic visual rendering of custom drinks. Updates tea base color (matcha green, espresso brown, boba amber, fruit crimson), sweetness liquid depth, floating ice cubes, and physically stacked toppings (brown sugar pearls, cheese foam, coconut jelly, egg pudding).
- **Taste Matcher / Flavor Finder Quiz**: 3-step interactive recommendation wizard guiding customers by mood/vibe, flavor profile, and caffeine tolerance to tailored beverage recommendations.
- **Customizable Drink Builder**: Multi-tier cup sizes (`Small`, `Medium`, `Large`), sweetness levels (`0%`, `25%`, `50%`, `75%`, `100%`), ice amounts (`No Ice`, `Less Ice`, `Normal Ice`, `Extra Ice`), and add-on toppings.
- **Dual-Currency Authoritative Pricing**: Real-time display in US Dollars (`USD $`) and Cambodian Riel (`KHR ៛`) at the authoritative rate (4,100 KHR/USD). Base prices, customizations, and totals are strictly calculated and locked by the server.
- **Idempotent Checkout**: Every checkout submission transmits a unique `Idempotency-Key` and SHA-256 payload digest. Duplicate button taps or network retries safely replay the confirmed order without double-charging or duplicate database entries.
- **Customer Order Tracking (`/orders`)**: Dedicated customer order tracking timeline showing stage progression (`Received` $\rightarrow$ `Preparing` $\rightarrow$ `Ready for Pick-up` $\rightarrow$ `Completed`) with live polling and order history.
- **80mm POS Thermal Receipt Generation**: Client-side generation of standard 80mm point-of-sale thermal receipts formatted for thermal slip printers and exported as downloadable PDF slips.
- **Loyalty Rewards Program (`/rewards`)**: 10-stamp customer loyalty stamp card granting a free specialty drink upon completion.
- **Payment Methods**: Cash on Delivery / Counter Pick-up and an interactive ABA KHQR demo payment flow (*demonstration interface; no real banking funds processed*).

### 2. 🧑‍🍳 Kitchen Display System (KDS) & Barista Station (`management-portal/`)
- **Real-Time Kanban Ticket Board**: Live multi-column dispatch board partitioning active kitchen orders into `Pending`, `Preparing`, and `Ready` swimlanes.
- **Ticket Timers & Urgency Highlights**: Dynamic elapsed time counters (`Just now`, `5m ago`, `15m ago`) with visual urgency badges for tickets needing expedited preparation.
- **Monospace Recipe Breakdown**: Detailed specification tickets displaying cup size, sweetness percentage, ice level, stacked toppings, customer notes, and order timestamps.
- **One-Click Safe Progression**: Baristas advance tickets via explicit stage transitions: `pending` $\rightarrow$ `preparing` $\rightarrow$ `ready` $\rightarrow$ `completed`.
- **State Machine Safeguards**: Terminal states (`completed`, `cancelled`) are protected by backend validation against accidental rewind or unauthorized modification.
- **80mm Kitchen Thermal Slip Modal**: Dedicated print-ready modal applying print-isolation CSS styles (`@media print`) for barcode/thermal label printers.

### 3. 📊 Store Administration & RBAC (`management-portal/` & `backend/`)
- **Executive Sales Analytics**: Real-time KPIs covering gross revenue, total orders, completed order volume, and pending ticket alerts.
- **Authoritative Revenue Recognition**: Revenue is recognized strictly upon completed order status and verified payment settlement.
- **Register Cash Settlement Auditing**: Cash register receipts can be settled at customer handoff (`POST /api/admin/orders/:id/cash-settlement`), recording an immutable audit entry into `payment_settlements`.
- **Inventory & Menu Availability**: Instant toggling of product stock availability; sold-out items are automatically excluded from customer menu discovery.
- **Multi-Store RBAC & Data Isolation**:
  - Centralized store registry for multi-branch café locations.
  - Dedicated `seller` role assigned to specific stores with strict row-level read isolation.
  - Relational `ON DELETE RESTRICT` foreign key constraints preventing deletion of stores with historical transaction records.
  - Administrative protection rules preventing demotion or deactivation of the last active administrator.

### 4. 📱 Customer Mobile App (`mobile_app/`)
- **Flutter Material 3 Architecture**: Cross-platform application for iOS and Android with responsive layouts and accessible typography.
- **Barista Surprise / Mystery Sip Generator**: Interactive shake/tap randomizer that selects a curated mystery drink and customized configuration for indecisive guests.
- **Drink Detail Customization**: Full cup sizing, sweetness selector, ice level adjustment, and toppings picker.
- **Dual-Currency Cart**: Automatic USD and KHR price formatting throughout the shopping experience.
- **Offline Demonstration Fallback**: Graceful fallback mode allowing UI evaluation even when offline or disconnected from the local backend API.
- **Order Status & Digital Receipt**: Live polling of active orders with visual progress timelines.

---

## 🌐 Network Ports & Service Topology

| Service | Environment | Host Port | Internal Port | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Customer Storefront** | Vite Dev Server | `5173` | `5173` | Customer web application |
| **Kitchen & Management Portal** | Vite Dev Server | `5175` | `5175` | KDS and admin dashboard |
| **Backend REST API** | Docker Compose | `8001` | `8000` | Node.js Express API |
| **Backend REST API** | Standalone Local | `8000` | `8000` | Node.js Express API |
| **PostgreSQL Database** | Docker Compose | `5432` | `5432` | PostgreSQL 16 engine (`coffee_shop`) |

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: `v20.x` or `v22.x` (LTS recommended)
- **Docker & Docker Compose**: Recommended for running the complete local stack
- **Flutter SDK**: `v3.19+` / Dart `3.3+` (only required for running `mobile_app/`)
- **Git**: For source version control

---

### Option A: Run via Docker Compose (Recommended)

The fastest way to spin up the entire database, backend, customer storefront, and management portal:

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Bunvathana876/coffee-milk-tea-shop.git
   cd coffee-milk-tea-shop
   ```

2. **Configure environment variables**:
   ```bash
   cp .env.example .env
   ```

3. **Start all services**:
   ```bash
   docker compose up --build
   ```

4. **Access the running applications**:
   - **Customer Web Storefront**: [http://localhost:5173](http://localhost:5173)
   - **Kitchen Display & Management Portal**: [http://localhost:5175](http://localhost:5175)
   - **Backend REST API**: [http://localhost:8001](http://localhost:8001) (Health: [http://localhost:8001/api/health](http://localhost:8001/api/health))
   - **PostgreSQL Database**: `localhost:5432` (database: `coffee_shop`)

5. **Default Admin Credentials**:
   - **Email**: `admin@coffeeshop.com`
   - **Password**: `admin123`

---

### Option B: Run Services Locally (Standalone)

You can also run each monorepo package independently in separate terminal windows.

#### 1. Backend REST API
```bash
cd backend
npm install
npm run dev
```
*Listens on [http://localhost:8000](http://localhost:8000). If a local PostgreSQL instance is not running, the backend seamlessly falls back to an isolated in-memory test database.*

#### 2. Customer Web Storefront
```bash
cd frontend
npm install
npm run dev
```
*Listens on [http://localhost:5173](http://localhost:5173). Proxies `/api` requests to the local backend.*

#### 3. Kitchen & Management Portal
```bash
cd management-portal
npm install
npm run dev
```
*Listens on [http://localhost:5175](http://localhost:5175). Proxies `/api` requests to the local backend.*

#### 4. Customer Mobile App (Flutter)
```bash
cd mobile_app
flutter pub get

# Run on macOS desktop:
flutter run -d macos

# Run on iOS Simulator:
flutter run -d "iPhone 16"

# Run on Android Emulator:
flutter run -d "Pixel 7"

# Run in Chrome:
flutter run -d chrome
```

---

## 🧪 Testing & Verification

The repository contains an exhaustive test suite of **407 automated unit, integration, and end-to-end user acceptance tests** with zero warnings and zero failures:

```bash
# 1. Run all backend tests (157 unit, integration, RBAC & diagnostics tests)
npm test --prefix backend

# 2. Run management portal & KDS tests (98 component, state & API tests)
npm test --prefix management-portal

# 3. Run customer storefront tests (34 cart, currency & checkout tests)
npm test --prefix frontend

# 4. Run Flutter mobile app tests (118 widget & unit tests)
cd mobile_app && flutter test

# 5. Run static code analysis across projects
npm run lint --prefix frontend
cd mobile_app && flutter analyze
```

### Test Suite Summary
| Subsystem | Test Command | Tests Passing | Focus Area |
| :--- | :--- | :--- | :--- |
| **Backend API** | `npm test --prefix backend` | **157 / 157** | Pricing integrity, idempotency, RBAC, cash settlement, diagnostics, and UAT personas. |
| **Management Portal** | `npm test --prefix management-portal` | **98 / 98** | KDS Kanban columns, ticket modal, sales charts, role matrix, and access gates. |
| **Customer Web** | `npm test --prefix frontend` | **34 / 34** | Cart reducer, dual-currency math, 80mm receipt generation, and idempotency recovery. |
| **Flutter Mobile** | `flutter test` (in `mobile_app/`) | **118 / 118** | Screen responsiveness, drink details, cart state, mystery sip, and catalog API. |
| **Total Automated Tests** | | **407 / 407** | **100% Pass Rate** |

---

## 🗄️ Database Schemas & Migrations

Database tables are versioned and audited under [backend/migrations/](./backend/migrations):

- **`001_order_idempotency_alignment.sql`**: Creates the `order_idempotency` table with composite primary key (`customer_id`, `idempotency_key`), SHA-256 request payload hashing, and atomic transaction locks.
- **`002_cash_settlement.sql`**: Introduces the `payment_settlements` table with immutable audit triggers (`BEFORE UPDATE OR DELETE` and `BEFORE TRUNCATE` rejections) for cash register reconciliation.
- **`003_stores_and_assignments.sql`**: Introduces the multi-store registry (`stores`) and seller assignments (`seller_store_assignments`) with `ON DELETE RESTRICT` transaction safeguards.

### Core Relational Schema
```mermaid
erDiagram
    categories ||--o{ products : contains
    products ||--o{ order_items : "referenced in"
    customer_users ||--o{ orders : places
    orders ||--|{ order_items : includes
    customer_users ||--o{ order_idempotency : owns
    orders ||--o{ payment_settlements : audits
    stores ||--o{ seller_store_assignments : assigns
    staff_users ||--o{ seller_store_assignments : links
```

To dry-run or reconcile database migrations:
```bash
node backend/scripts/reconcileMigrations.js --dry-run
```

---

## 📡 Core API Endpoints

### Public & Storefront API
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Service health status | No |
| `GET` | `/api/categories` | List active categories with product counts | No |
| `GET` | `/api/products` | Browse drink catalog with category filter & search | No |
| `POST` | `/api/auth/customer/register` | Customer account registration | No |
| `POST` | `/api/auth/customer/login` | Customer login (returns JWT token) | No |
| `GET` | `/api/auth/customer/me` | Fetch authenticated customer profile & stamps | Customer Bearer |
| `POST` | `/api/orders` | Place order (supports `Idempotency-Key` header) | Optional |
| `GET` | `/api/orders/:id` | Fetch order details by ID | Owner / Staff |
| `GET` | `/api/orders/customer/:id` | Fetch customer order history | Owner / Staff |

### Management & Kitchen Display API
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/admin/auth/login` | Staff / Admin login | No |
| `GET` | `/api/admin/auth/me` | Verify staff session and active role | Staff Bearer |
| `GET` | `/api/admin/dashboard/summary` | Executive KPI analytics & recent sales | Admin / Staff |
| `GET` | `/api/admin/orders` | List kitchen orders (filterable by status) | Staff Bearer |
| `PATCH` | `/api/admin/orders/:id/status` | Advance ticket status (`pending` $\rightarrow$ `completed`) | Staff Bearer |
| `POST` | `/api/admin/orders/:id/cash-settlement` | Register cash handoff settlement audit | Admin / Staff |
| `GET` | `/api/admin/products` | Manage product catalog & stock availability | Admin / Staff |
| `GET` | `/api/admin/stores` | List store locations and assigned sellers | Admin Bearer |
| `POST` | `/api/admin/stores` | Register a new store branch | Admin Bearer |
| `PATCH` | `/api/admin/sellers/:id/store` | Assign or reassign seller store location | Admin Bearer |
| `POST` | `/api/seller/auth/login` | Seller login | No |
| `GET` | `/api/seller/orders` | View store-scoped orders for assigned seller | Seller Bearer |

---

## ⚙️ Environment Variables Reference

Copy `.env.example` to `.env` before starting services:

```ini
# --- Database Configuration ---
POSTGRES_DB=coffee_shop
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres_dev_password
POSTGRES_HOST_PORT=5432

# --- Backend API ---
PORT=8000
BACKEND_PORT=8001
ENVIRONMENT=development
DATABASE_URL=postgresql://postgres:postgres_dev_password@localhost:5432/coffee_shop
JWT_SECRET=super-secret-coffee-jwt-key-change-in-production
JWT_EXPIRES_IN=7d
USD_TO_KHR_RATE=4100
CORS_ORIGINS=http://localhost:5173,http://localhost:5175,http://localhost:3000

# --- Seed Accounts ---
ADMIN_INITIAL_EMAIL=admin@coffeeshop.com
ADMIN_INITIAL_PASSWORD=admin123
ADMIN_INITIAL_NAME=Store Administrator

# --- Frontend & Portal Clients ---
FRONTEND_PORT=5173
MANAGEMENT_PORTAL_PORT=5175
VITE_API_URL=http://localhost:8001
VITE_USD_TO_KHR=4100
```

> [!WARNING]
> Never commit active `.env` files, production database connection strings, or JWT secret keys to version control. The repository's root `.gitignore` is pre-configured to strictly ignore all `.env` files while preserving `.env.example` templates.

---

## 🎨 Asset Kits & Brand Identity

- **Brand Color Palette**:
  - **Cobalt**: `#1345A3`
  - **Navy**: `#17294D`
  - **Cream**: `#FFF8DF`
  - **Butter Accent**: `#F5E4AD`
- **Asset Directory Locations**:
  - `mobile_app/assets/images/orders_v4/`: Transparent barista illustrations and 48/96/192px status icons.
  - `mobile_app/assets/welcome/`: Walking café mascot illustrations and typographic brand graphics.
  - `frontend/public/brand/`: Vector badges, favicon suites, and brand cup art.
  - `frontend/public/assets/drinks/`: High-resolution drink photography for espresso, matcha latte, and boba milk teas.

---

## 🔒 Security & Safe Operation Notes

1. **Authoritative Pricing**: All drink customizations, cup size modifiers, topping additions, and dual-currency conversions are strictly computed and validated on the backend. Client payloads cannot alter unit prices or order sums.
2. **Payment Safety**: The ABA KHQR feature is a front-end simulation created for user experience testing and demonstration. It does not initiate real banking transactions.
3. **Database Guardrails**: The backend includes database diagnostics (`backend/src/db/diagnostics.js` and `targets.js`) that automatically detect target environments and prevent test suites or staging migrations from running against production databases.
4. **Idempotency Protection**: Order checkout uses composite SHA-256 request hashing to ensure zero duplicate orders occur during unstable network conditions or rapid customer taps.

---

## 📄 License

This project is licensed under the [ISC License](backend/package.json).
