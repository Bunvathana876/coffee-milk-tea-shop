@/Users/bunvathana/.codex/RTK.md

# Brew & Boba Café

## Purpose and stack

Online drink ordering project with a customer web app, a separate management portal, a shared REST API, and a Flutter customer app. The current source uses:

- `frontend/`: React 19, TypeScript, Vite, Tailwind CSS v4, React Router, Lucide.
- `management-portal/`: separate React 19, TypeScript, Vite, Tailwind CSS v4, React Router app. The former `admin/` source is preserved in `archive/legacy-admin/`.
- `backend/`: Node.js ESM, Express 4, PostgreSQL via `pg`, JWT, and bcryptjs.
- `mobile_app/`: Flutter/Dart with Provider, `http`, and SharedPreferences.
- `compose.yaml`: PostgreSQL 16 Alpine, backend, customer frontend, and management portal development services. The Flutter app is not a Compose service.

Check package manifests for exact dependency versions before changing dependencies. Current source is Express; older documentation and generated files may still mention FastAPI.

## Architecture

- Customer entry points: `frontend/src/main.tsx` and `frontend/src/App.tsx`. Routes are home, menu, rewards, profile, cart, checkout, receipt, and 404. Shared UI is under `frontend/src/components/`; authentication, cart, and favorites state is under `frontend/src/features/`. HTTP calls are in `frontend/src/services/`. There is currently no customer web `/orders` route.
- Management entry points: `management-portal/src/main.tsx` and `src/App.tsx`. Admin login and dashboard summary use the shared API; other admin pages are planned shells. Seller routes are blocked until the backend supports seller identity and store ownership. API calls are in `management-portal/src/lib/api.ts`. Legacy catalog, order, and report UI lives in `archive/legacy-admin/src/`; its API client has known contract mismatches, so do not copy it unchanged.
- API entry point: `backend/src/server.js`. Routes live in `backend/src/routes/`, including `routes/admin/`; authentication and errors are in `backend/src/middleware/`. Configuration is in `backend/src/config.js`.
- Database code is in `backend/src/db/database.js` and `seed.js`. The six tables are `categories`, `products`, `customer_users`, `staff_users`, `orders`, and `order_items`. Products reference categories; order items reference orders and optionally products. New orders link to `customer_users` through `orders.customer_id`; pre-existing unlinked orders remain staff-visible only. Startup creates missing tables and seeds missing catalog/admin data; there is no versioned migration system.
- Mobile entry point is `mobile_app/lib/main.dart`; code is organized into `core/`, `data/`, `providers/`, and `ui/`.

## Development workflow

- Use the RTK instruction above for shell commands.
- Local scripts: in `frontend/`, `npm run dev`, `npm test`, `npm run lint`, `npm run build`; in `management-portal/`, `npm run dev`, `npm test`, `npm run build`; in `backend/`, `npm run dev`, `npm test`; in `mobile_app/`, `flutter test` and `flutter analyze`.
- Backend tests start an HTTP server and can create database records. Confirm the target database and obtain authorization before running them against non-disposable data.
- `compose.yaml` defines `db`, `backend`, `frontend`, and `management-portal` with health checks, a named PostgreSQL volume, and bind-mounted source. The portal listens on host port 5175 and proxies `/api` to `backend:8000` inside Docker; browser requests use the same origin. Do not start, stop, or reset containers without the user's permission. Never run `docker compose down -v` unless explicitly requested.

## Coding conventions and constraints

- Follow existing TypeScript/React component and hook patterns, Tailwind theme tokens in `frontend/src/index.css`, and backend ESM imports. Keep API request/response types aligned across clients and routes.
- Keep prices and order totals authoritative on the server. Use parameterized SQL, validate input at API boundaries, and pass unexpected route errors to Express error handling.
- Preserve customer, admin, and mobile workflows when changing shared APIs. The KHQR UI is a demo; do not describe it as real payment processing. Mobile has an offline simulated-order fallback; do not present those orders as confirmed backend orders.
- Treat `.env` files, database URLs, JWT keys, tokens, and account credentials as sensitive. Never print or commit their values. Use `.env.example` files only as configuration-key references. Enforce authorization in backend routes rather than relying on frontend route guards.
- Check current code before relying on README claims: older documentation may describe removed routes or a former backend. Avoid changing generated API models by hand without checking their source and generation workflow.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:
- When graphify-out/graph.json exists, run `graphify query "<question>"` before your first grep, search or source-file read for a codebase question, and put this rule in every subagent prompt that explores code. Read raw files only for lines the graph or an earlier read already located. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
- A committed graphify-out/graph.json is rewritten whole on every build, so a large diff to it in a pull request is expected. Do not flag it as churn or suggest skipping the graph rebuild or its hooks.
