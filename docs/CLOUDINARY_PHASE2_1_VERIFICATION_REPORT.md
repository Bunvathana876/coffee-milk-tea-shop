# Cloudinary Phase 2.1 — local integration verification

Date: 2026-11-15. Scope: local development only. **No database rows were changed in this phase.**

## Port conflict and local routing

| Port | Listener observed before changes | Action |
|---:|---|---|
| 8000 | Unrelated Python/Uvicorn service | Left running |
| 8001 | Unrelated Python/Uvicorn services | Left running |
| 8002 | Docker listener for another service | Left running |
| 8003 | Available | Started Brew & Boba backend |

The backend is running on port 8003 with `npm run dev:readonly`. This development-only command skips startup schema creation and seeding, requires the configured database to be `localhost:5433/coffee_shop`, and connects with PostgreSQL `default_transaction_read_only=on`. It verifies that setting before serving requests. The local ignored `backend/.env` was changed from port 8001 to 8003 without printing or changing credentials. A local ignored `frontend/.env.development.local` points Vite development at `http://localhost:8003`; the existing general `.env` was preserved. Development proxy and documented example defaults for the website and management portal, and Flutter debug API defaults, now use port 8003. Production environment configuration and Flutter release configuration were not changed.

The backend returned HTTP 200 from `/api/health`. Its `/api/products` response contained 18 products. The customer Vite server at port 5173 and management Vite server at port 5175 each served their page and proxied `/api/products` to this backend. The portal's authenticated `/api/admin/products` proxy also reached it. Both expected development CORS origins were accepted.

## Database and approved images

A read-only PostgreSQL query identified database `coffee_shop` at server address `::1/128`, port 5433. Ordered `SELECT * FROM products` results had 18 rows and SHA-256 fingerprint `d0bd2253e487b0ebedf1694f415c3effc9a99300382f6a8be151435a5670fede` both before and after verification. Exactly three rows use Cloudinary URLs:

| ID | Product | Stored image URL |
|---:|---|---|
| 3 | Cappuccino | https://res.cloudinary.com/dr5o7ft6/image/upload/v1794704052/02_cappuccino.png |
| 4 | Caramel Macchiato | https://res.cloudinary.com/dr5o7ft6/image/upload/v1794704349/caramel_macchiato_with_caramel_lattice_foam_transparent.png |
| 16 | Iced Matcha Latte | https://res.cloudinary.com/dr5o7ft6/image/upload/v1794704051/08_iced_matcha_latte.png |

The live public product list, each public product detail endpoint, and the authenticated admin product list returned the same exact URL for each ID. The admin check used a short-lived token held only in process memory. No authentication implementation was changed.

The website and portal thumbnail helpers produced Cloudinary delivery URLs for all three products. All six derived image requests returned HTTP 200, `image/png`, and a valid PNG signature. A Flutter network smoke check parsed the live API response with `ProductModel.fromJson`, used the app's `productImageUrl` helper, and fetched each product's 320 px card and 800 px detail image. All six requests returned HTTP 200 PNG content with valid signatures. These checks verify data flow and image delivery; final visual layout and transparency appearance on devices remain for manual review.

## Test environment fix

Node 24 exposed a `localStorage` object without a working `setItem` in the management portal test process. The affected test now installs and restores a complete in-memory storage mock for its dark/system preference assertions. This preserves the assertions and lets the normal `npm test` command pass without `NODE_OPTIONS` or an authentication change.

## Verification results

| Check | Result |
|---|---|
| Backend `npm test` | 124 passed, 0 failed; isolated in-memory test database |
| Customer frontend `npm test` | Passed |
| Customer frontend `npm run build` | Passed |
| Management portal `npm test` | 83 passed, 0 failed, normal command |
| Management portal `npm run build` | Passed |
| Flutter `flutter analyze` | No issues |
| Flutter `flutter test` | 60 passed, 0 failed |
| `git diff --check` | Passed |

An initial Flutter test run found one stale expectation for debug port 8001. The expectation was updated to 8003 and the full Flutter test suite then passed. Backend tests were rerun after the final read-only pool guard and passed. No screenshots were captured.

## Files changed for Phase 2.1

- `backend/src/db/database.js`, `backend/src/server.js`, `backend/package.json`, `backend/.env.example`: guarded read-only local startup and example port.
- `frontend/src/services/api.ts`, `frontend/vite.config.ts`, `frontend/.env.example`: development API defaults and accurate connection error messages.
- `management-portal/vite.config.ts`, `management-portal/.env.example`, `management-portal/src/lib/api-and-light-mode.test.tsx`: development proxy defaults and Node 24 storage test setup.
- `mobile_app/lib/core/config/app_config.dart`, `mobile_app/test/unit/order_reliability_test.dart`: Flutter debug API port and matching test expectation.
- Local ignored files: `backend/.env` port only; new `frontend/.env.development.local`.

Existing unrelated uncommitted work was preserved. No products, prices, categories, availability, migrations, Cloudinary assets, Neon staging or production databases, containers, or unrelated services were changed. No commit, push, or deployment was performed.

## Manual verification remaining

Review the three product images in the customer website, management portal, and Flutter app, including sizing, transparency, and responsive layout. The local backend and both Vite development servers were left running for that review. The read-only backend intentionally rejects write operations during this verification session; use the normal authorized development startup when product editing is needed.
