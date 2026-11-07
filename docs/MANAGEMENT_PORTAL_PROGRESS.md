# Management portal progress

Master update: order details now offers a cash receipt action for unpaid cash orders ready/completed, with reference and confirmation. It uses the dedicated administrator endpoint and requires migration 002. Seller and remaining customer/staff/settings pages remain incomplete. Seller access remains blocked. Portal tests 11/11 and TypeScript/build passed.

Updated: 2026-11-06. Phase 4 connects the active portal to the Express admin catalog, order, and report APIs.

## Architecture and verified limits

- `management-portal/` is an independent React 19, TypeScript, Vite 8, Tailwind 4 application. It uses the existing Express API through a same-origin Vite `/api` proxy; it has no backend or data store of its own.
- Existing staff login is `POST /api/admin/auth/login`; `GET /api/admin/auth/me` validates the JWT against the current `staff_users` row. The backend currently recognizes `admin` and `staff` JWT roles only. New portal access is restricted to a server-verified `admin` profile. Tokens are stored in tab-scoped `sessionStorage`; the portal revalidates them on reload and clears invalid sessions.
- `staff_users.role` is a free-text column, but current staff creation and role changes accept only `admin` or `staff`; middleware rejects unsupported roles. There is no stores table, store owner relationship, product `store_id`, order assignment, seller inventory model, or seller-scoped API. Seller accounts and data views wait for backend ownership and authorization design.
- Dashboard, report, catalog, and order routes now require the current database-backed `admin` role. Staff-account management was already administrator-only. General staff accounts remain valid for staff authentication but cannot use these management operations.
- The former `admin/` application used port 5174. Its complete directory is now archived at `archive/legacy-admin/`; the active management portal uses port 5175. The backend is at host port 8001 and container port 8000.
- Compose now has a `management-portal` service built from `./management-portal`, with host/container port `5175:5175`, `VITE_PROXY_TARGET=http://backend:8000`, the existing app network, a healthy-backend dependency, a health check, bind-mounted source, and an isolated `/app/node_modules` volume. It has no database connection or API service of its own.
- Native PostgreSQL on port 5433 and Docker PostgreSQL on port 5432 hold separate records. At inspection, native PostgreSQL was accepting connections, while the café Compose services were stopped. Phase 1 does not choose, migrate, merge, or modify either database. The portal will display whichever database the running shared Express backend uses. A single authoritative database must be selected before rollout across web, mobile, and Docker.

## Phase 1 completed

- Independent app foundation: package manifest, TypeScript and Vite config, Tailwind tokens, environment example, Dockerfile, routing, and README.
- Responsive premium café layout with collapsible sidebar, mobile navigation, navigation search, accessible focus/skip link, and consistent loading, empty, and error states.
- Administrator login uses existing staff authentication and checks `/me` before admitting a session. Dashboard reads recheck the current database-backed role, and the session is revalidated when the window regains focus. Missing/invalid sessions return to login; authenticated non-admin roles are denied. Seller routes exist as inaccessible shells and show no seller data.
- Admin dashboard uses only live `/api/admin/dashboard/summary` values. Its KPIs, status bars, and recent-order table render real API results or a clear empty/error state. Other planned admin routes identify their later phase and show no sample data.
- No existing customer frontend, Flutter app, backend source, Compose file, PostgreSQL records, or Docker volume was changed in this phase.

## Verification

- `npm install` ran only in `management-portal/` and generated its lockfile; npm reported zero vulnerabilities.
- Portal `npm run build` passed, including strict TypeScript checking. Portal `npm test` passed 8/8: login endpoint and bearer header, server-role check, route guard, role-specific navigation, 403 handling, expired token rejection, and role demotion.
- The portal Vite server returned HTTP 200 for `/login` on port 5175. The existing admin app is configured for port 5174, so the ports do not conflict.
- Existing backend tests passed 16/16 in isolated test mode. Customer frontend tests passed 6/6 and its TypeScript/build passed with the pre-existing large-chunk warning.
- The live café backend was not running during this phase, so a real portal login/dashboard request was not exercised. Starting it would run schema/seed initialization against whichever PostgreSQL database is configured. Browser-based visual and viewport QA was unavailable; responsive behavior was reviewed in CSS and remains to be checked in a browser.

## Original portal phase plan (historical)

The catalog, order, and analytics shells listed below were replaced by live Phase 4 pages. The remaining seller and deployment work still applies.

2. Extend admin dashboard and analytics with verified backend data and appropriate authorization.
3. Implement product and category workflows against validated API contracts.
4. Implement order management with permission and payment-status checks.
5. Design seller accounts, store ownership, assignments, database constraints, and server-scoped APIs before enabling seller login.
6. Build seller dashboard and inventory against those verified scoped APIs.
7. Compose integration is complete. Select the authoritative shared database across native and Docker workflows, test all clients together, and polish responsive/accessibility behavior.

## Known risks

- Seller access is unavailable. The route shells are guarded and cannot display store data.
- Administrator data routes now enforce the admin role on the backend; frontend guards provide navigation and session handling as an additional layer.
- The older `admin/` app has known API contract mismatches documented in `PROJECT_AUDIT.md`; this portal does not copy its request layer.
- This portal does not resolve the native-versus-Docker database split or migrate historical customer/order records.

## Production readiness phase 4 — live operations

- The existing administrator routes now show live category and product records, with create/edit forms, category filtering, search, availability controls, and confirmed deactivation/deletion. API failure and empty results have distinct states; no sample catalog is substituted. Category deletion remains blocked while products reference it. Product deletion leaves historical order-item snapshots; deactivation is the preferred reversible action.
- Orders show the paginated server queue, status filter, reference, customer, payment state, details, and line items. The portal submits only an order-status change, with a confirmation step. The API enforces `pending → preparing → ready → completed`, permits cancellation before completion when payment is not recorded as paid, and rejects reversals. Completed and cancelled orders are terminal.
- The admin order-status endpoint rejects every `payment_status` update. There is no payment provider or verified manual reconciliation in this phase. KHQR is still a demo choice and creates an unpaid order. Cancelled, unpaid, pending, or failed-payment orders contribute zero recognized revenue. Dashboard and sales-report revenue include only rows with `order_status = completed` and `payment_status = paid`. Report status breakdown `total_*` fields remain gross order values; `recognized_revenue_*` fields identify revenue by status. Historical `paid` rows have no new provenance and require reconciliation before financial use.
- All dashboard, report, catalog, and order endpoints now require the database-backed administrator role. Staff and seller accounts cannot use these routes; seller access remains blocked. The portal retains its login, session revalidation, and navigation.
- Verification: management portal tests **11/11** and build passed; isolated backend tests **35/35** passed; customer frontend tests **6/6** passed; `docker compose config --quiet` passed. No project PostgreSQL record, Docker volume, deployment, or live payment provider was touched. Browser interaction and PostgreSQL-backed admin flows remain unverified.

## Compose integration and legacy retirement — 2026-11-05

- Added only the `management-portal` service to `compose.yaml`. Its Vite server already listened on `0.0.0.0:5175`; the browser uses same-origin `/api`, and Vite forwards requests to `backend:8000` within the Compose network. No CORS change or `VITE_API_URL` is required for this portal.
- Existing `db`, `backend`, and `frontend` containers were started with `--no-recreate --no-build`; the portal image was built and its container created separately. The existing named PostgreSQL volume was not reset, recreated, or migrated. Native PostgreSQL on port 5433 remains separate.
- The legacy `admin/` directory was a clean nested Git repository, but was untracked by the root repository. After the replacement passed live checks, the whole directory, including its own `.git` history, source, `node_modules`, and build output, was moved intact to `archive/legacy-admin/`. Restoration is a directory move back to `admin/`; no legacy files were deleted. The old app is not a Compose service or an application dependency.

### Legacy feature inventory for later migration

| Legacy UI | Replacement state | Notes |
| --- | --- | --- |
| Staff login and protected layout | Implemented in the portal for verified administrators | Portal rechecks `/api/admin/auth/me`; seller access remains disabled. |
| Dashboard summary and recent orders | Implemented with live API data | Legacy dashboard also offered order status controls; these are not yet in the portal. |
| Order list, search, status and payment controls | Planned page | Legacy client expects an order array instead of the paginated API object, sends `status` instead of `order_status`, and calls a nonexistent payment endpoint. Reuse UI ideas only after aligning contracts and permissions. |
| Product list, search/filter, create/edit/delete, availability | Planned page | Legacy client uses `PUT` for PATCH-only updates and a nonexistent `/toggle` endpoint. |
| Category list and create/edit/delete | Planned page | Legacy edit uses `PUT` where the API requires `PATCH`. |
| Sales report and date filter | Planned analytics page | Connect to the existing `/api/admin/reports/sales` endpoint after role review. |
| Customer, seller, settings, inventory screens | Not present in legacy app | Seller identity, store ownership, and scoped APIs do not exist yet. |

### Verification for this integration

- `docker compose config --quiet` passed; portal `npm test` passed 8/8; `npm run build` passed including `tsc --noEmit`; backend `npm test` passed 16/16 in its isolated test store. Portal Docker image built successfully.
- All four café containers reported `healthy`. `GET http://localhost:5175/login`, backend `/api/health`, customer homepage, and the portal's proxied `/api/health` returned HTTP 200. Backend catalog returned 18 products and 5 categories; the customer site's `/api/products` returned the same product count.
- Through the portal proxy, a live configured administrator login returned 200, `/api/admin/auth/me` returned an active `admin` profile, and `/api/admin/dashboard/summary` returned 200 with the expected fields. An anonymous dashboard request returned 401. No credentials, token, or customer/order records were printed.
- The backend tests did not exercise PostgreSQL transactions; live browser interaction and mobile runtime compatibility were not retested. Docker startup runs the backend's existing schema/seed initialization, so this check does not establish that existing Docker and native databases contain identical records.

### Files changed in this task

- `compose.yaml`
- `README.md`
- `DOCKER_SETUP.md`
- `AGENTS.md`
- `docs/MANAGEMENT_PORTAL_PROGRESS.md`
- `admin/` moved intact to `archive/legacy-admin/`
