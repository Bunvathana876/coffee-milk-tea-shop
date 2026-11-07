# Brew & Boba Café — Online Ordering Platform

Production engineering status: **NOT READY — BLOCKERS REMAIN**. See [current report](docs/FINAL_PRODUCTION_READINESS_REPORT.md), [progress](docs/MASTER_IMPLEMENTATION_PROGRESS.md), and [deployment runbook](docs/DEPLOYMENT_RUNBOOK.md). Production startup checks migrations and never seeds accounts; actual migration of project data requires approval. Seller transactions remain disabled.

Full-stack platform for ordering coffee, milk tea and other drinks online.

| Part | Folder | Stack |
|------|--------|-------|
| Customer Web App | `frontend/` | React 19, TypeScript, Vite, Tailwind CSS v4, React Router, Lucide, jsPDF, canvas-confetti |
| Admin & Seller Management Website | `management-portal/` | React 19, TypeScript, Vite, Tailwind CSS v4, React Router, Lucide |
| REST API | `backend/` | Node.js, Express, PostgreSQL (`pg`), JWT, bcryptjs |
| Customer Mobile App | `mobile_app/` | Flutter (Dart), Provider, Clean Architecture |

## Features

- Customer sign up / sign in (JWT) — required before checkout
- Menu browsing by category, drink customization (size, sweetness, ice, quantity)
- Persistent cart, checkout, and receipt on the website; order history and tracking screens in Flutter
- Printable / downloadable PDF receipts
- Dual USD & KHR pricing (server-side price calculation)
- Admin API routes for menu, categories and orders
- Automatic schema creation and seeding on backend start

## Web App — Premium Café Storefront

The web app (`frontend/`) is a premium café storefront focused on a clean, simple ordering experience:

- **Striking home page** — a bold hero section that makes the café feel inviting from the first screen.
- **High-quality drink photography** — large photos on clean, consistent product cards.
- **Better discovery** — improved category filters and search to find a drink quickly.
- **Better customization** — a smoother drink customization flow (size, sweetness, ice, quantity).
- **Simple navigation** — a minimal menu and less unnecessary text throughout.

## Prerequisites

- Node.js 20+ and npm
- PostgreSQL (with a database such as `coffee_shop`)
- Flutter SDK (only for the mobile app)

## Getting Started

### 1. Backend (`backend/`)

```bash
cd backend
cp .env.example .env   # then edit DATABASE_URL and JWT_SECRET
npm install
npm run dev
```

- API: http://localhost:8001
- Health check: http://localhost:8001/api/health

Key `.env` variables: `PORT`, `DATABASE_URL`
(e.g. `postgresql://postgres:your_password@localhost:5432/coffee_shop`), `JWT_SECRET`,
`JWT_EXPIRES_IN`, `USD_TO_KHR_RATE`, `CORS_ORIGINS`, `ADMIN_INITIAL_EMAIL`,
`ADMIN_INITIAL_PASSWORD`, `ADMIN_INITIAL_NAME`.

> Change `JWT_SECRET` and the default admin password before any real deployment.
> Never commit your `.env` file.

Connecting pgAdmin 4: register a server with host `localhost`, the port and
credentials from your `DATABASE_URL`, then open the `coffee_shop` database.

Optional: `npm run seed` re-seeds the database.

### 2. Customer Web App (`frontend/`)

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

### 3. Management Portal (`management-portal/`)

A separate React application for management. Administrator login and the live dashboard summary are implemented. Products, categories, orders, customers, analytics, and settings are planned pages. Seller routes remain inaccessible until the backend has seller identities and store-scoped authorization.

```bash
cd management-portal
npm install
npm run dev
```

Open http://localhost:5175/login and use an existing administrator account. The portal proxies `/api` to the shared Express backend on port 8001 in native development.

The former `admin/` application is preserved at `archive/legacy-admin/` for reference. It is not a Compose service; its catalog and order request code has known API contract mismatches. See `docs/MANAGEMENT_PORTAL_PROGRESS.md` for the migration inventory.

### 4. Mobile app (`mobile_app/`)

```bash
cd mobile_app
flutter pub get
flutter run
```

Runs on iOS Simulator, Android Emulator, macOS or Chrome.

## Testing & Builds

```bash
# Backend tests use the explicit isolated test store; do not point them at user data
(cd backend && npm test)

# Web app
(cd frontend && npm test && npm run lint && npm run build)

# Management portal
(cd management-portal && npm test && npm run build)

# Mobile app
(cd mobile_app && flutter test)
```

## Project Structure

```
.
├── backend/
│   ├── src/
│   │   ├── server.js        # Express entry point
│   │   ├── config.js        # Environment config
│   │   ├── db/              # Schema, connection, seed
│   │   ├── middleware/      # Auth, etc.
│   │   ├── routes/          # categories, products, orders, customerAuth, health, admin/
│   │   └── utils/
│   └── test/
├── frontend/
│   └── src/pages/           # Home, Menu, Cart, Checkout, Receipt, Rewards, Profile
├── management-portal/       # Admin dashboard and guarded future management routes
├── archive/legacy-admin/    # Reversible archive of the former standalone console
├── mobile_app/              # Flutter customer client
└── compose.yaml             # db, backend, frontend, management-portal
```
