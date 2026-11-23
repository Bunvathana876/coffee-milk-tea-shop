# Brew & Boba Management Portal

Standalone React 19 + TypeScript + Vite 8 + Tailwind CSS v4 management portal for the Brew & Boba Café shared Express API.

## Included Operations

- **Authentication & Access Control**: Server-verified administrator login (`POST /api/admin/auth/login` + `GET /api/admin/auth/me` revalidation on reload, focus, and 403 responses).
- **Dashboard Overview**: Live KPIs, order activity bar & donut visualizations, Café Operations Center, catalog health summary, and recent orders linked directly to order detail drawers.
- **Order Management & Kitchen Display System (KDS)**: Status-filtered order queue (`pending`, `preparing`, `ready`, `completed`, `cancelled`), Kanban Kitchen Board (`?view=kds`), 15s auto-refresh, 80mm thermal ticket printing (`KitchenTicketModal`), status transition confirmations, and immutable cash settlement + audit trail (`payment_settlements`).
- **Menu Catalog**: Category and product CRUD with live search, filtering, availability toggles, and HTTPS image validation/previews.
- **Customer Directory**: Server-paginated customer list, loyalty stamp tracking, and recognized spend summary.
- **Sales & Analytics**: Date-range filtering (`All Time`, `Today`, `Last 7 Days`, `Last 30 Days`, `Custom`), revenue recognition breakdown (paid & completed orders only), and CSV export.
- **Role Controller & Sellers**: 11-policy RBAC matrix, full Staff & Administrator CRUD with last-admin protection, Store Registry CRUD, and Seller account + store assignment management. (Seller login routes `/seller/*` remain gated until store-scoped seller UI activation.)

## Run Locally

Start the shared Express backend (default local dev port `8003`, or Docker backend on host port `8001`), then:

```bash
cd management-portal
npm install
npm run dev
```

Open `http://localhost:5175`. Vite proxies `/api` to `VITE_PROXY_TARGET` (defaults to `http://localhost:8003`). Set `VITE_PROXY_TARGET=http://localhost:8001` in `management-portal/.env.local` when targeting the Docker Compose backend. Do not put account credentials in Vite environment variables.

## Production & Docker Builds

- **Vercel / Static CDN** targeting a remote HTTPS API: set `VITE_API_URL=https://your-api-domain.example` at build time (`management-portal/vercel.json` handles SPA rewrites).
- **Docker / Nginx** (`management-portal/Dockerfile.production`, `compose.production.yaml`): builds with `VITE_API_URL=/` by default so requests use same-origin `/api/` reverse-proxied to `http://backend:8000` (`management-portal/deploy/nginx.conf`).

## Verification

```bash
cd management-portal
npm test
npm run typecheck
npm run build
```
