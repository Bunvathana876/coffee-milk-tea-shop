# Future Render backend deployment guide

This is a preparation guide. No service or database was created or changed during the audit. Do not deploy until the readiness gates in [BACKEND_PRODUCTION_READINESS.md](./BACKEND_PRODUCTION_READINESS.md) are complete.

## Service configuration to use later

| Setting | Planned value |
| --- | --- |
| Service type | Render Web Service, Node runtime; `backend/Dockerfile.production` is an alternative after separate image verification. |
| Root directory | `backend` in this monorepo. |
| Build command | `npm ci --omit=dev` (no application build step). |
| Start command | `npm start` (`node src/server.js`). |
| Node version | Pin Node 22 through the service's `NODE_VERSION` setting, matching `Dockerfile.production`, then test it. |
| HTTP health check | `/api/ready`, which runs a small database query and returns 503 on failure. `/api/health` is liveness only. |
| Listening address and port | Express listens on all interfaces. Render supplies `PORT`; local default is 8003. |
| Auto deploy | Keep off until staging validation and release review are complete. |

Render's current [web service guide](https://render.com/docs/web-services) requires binding to `0.0.0.0` and the configured port. Its [health-check guide](https://render.com/docs/health-checks) supports a configured HTTP path; [Node version guidance](https://render.com/docs/node-version) documents `NODE_VERSION`. Review these sources again at deployment time.

## Environment variables

Set secrets in the Render service environment, not in Git, Flutter, or either React bundle.

| Variable | Requirement |
| --- | --- |
| `NODE_ENV`, `ENVIRONMENT` | Use `production` for the live environment; use `staging` for a staging service. |
| `PORT` | Supplied by Render. Do not hardcode a production port. |
| `DATABASE_URL` | Required PostgreSQL URL for the intended isolated environment. Remote hosts must use `sslmode=verify-full` and a valid certificate chain. Percent-encode special password characters. Never reuse the local `coffee_shop` URL. |
| `JWT_SECRET` | Required unique random secret of at least 32 characters. Use separate values per environment. Do not place it in a client. |
| `CORS_ORIGINS` | Required comma-separated HTTPS browser origins, each without a path. Use only the intended customer and management website origins; no wildcard. Native Flutter calls do not depend on CORS. |
| `JWT_EXPIRES_IN` | Optional, default `7d`; supported range is one minute through 30 days using `m`, `h`, or `d`. |
| `USD_TO_KHR_RATE` | Optional server-side rate, default 4100. Review the business rate before release. |
| `DB_POOL_MAX`, `DB_CONNECTION_TIMEOUT_MS`, `DB_IDLE_TIMEOUT_MS` | Optional bounded pool and timeout settings; defaults are 10, 10000, and 30000. Size the pool against the database connection limit and Render instance count. |
| `ADMIN_INITIAL_EMAIL`, `ADMIN_INITIAL_PASSWORD`, `ADMIN_INITIAL_NAME` | Demo seed settings only. They are not required for staging/production startup and must not be used to create a production admin during normal startup. Use the reviewed bootstrap procedure separately. |

`backend/.env.example` is a key reference for local development. The real `.env` stays local and is never copied into an image or report.

## Database release sequence

1. Choose a disposable staging PostgreSQL database or a verified copy. Record its branch, database name, endpoint, backup, and restore procedure before any migration.
2. Compare its baseline schema with `backend/migrations/`. The current local `coffee_shop` does not have `schema_migrations` or `payment_settlements`; it cannot be treated as already migrated.
3. Rehearse the existing versioned migration workflow and its checks on the disposable target. Review SQL and rollback/restore plans. Do not run migration scripts against a production or unrelated database without explicit approval.
4. Provision an initial admin using the reviewed bootstrap workflow for the selected environment, separate from startup and demo seeding. Verify admin-only access and audit records.
5. Confirm catalog IDs, prices, image URLs, customer counts, orders, and foreign-key links before and after migration. Preserve historical order snapshots and product references.
6. Configure the service with that environment's own `DATABASE_URL`, JWT secret, and allowed browser origins. The process will refuse startup if configuration or migration verification fails.

For Neon, use the correct branch endpoint and database URL, `sslmode=verify-full`, a valid CA trust chain, and pool sizing suited to its connection limits. Confirm whether a pooled or direct connection is appropriate for runtime versus migration operations. No Neon connection was used in this audit.

## Local verification before creating a service

From `backend/`, run `npm test` with its isolated test setup. Run a separate real PostgreSQL integration rehearsal against a disposable database. Check `npm start` using the intended Node 22 runtime and a safe staging configuration, then call `/api/ready`, catalog endpoints, customer auth, order creation/retry/history, admin access, and settlement restrictions. Confirm that no sample data appears after restart. Do not use `npm run seed` on the existing catalog.

When a service is eventually created, keep automatic deploys off until readiness checks and migration rehearsals pass. Render's [deploy lifecycle documentation](https://render.com/docs/deploys) explains health-gated rollout and shutdown signals. The app handles `SIGTERM`/`SIGINT` and closes its HTTP listener and PostgreSQL pool. Verify this behavior on the chosen Render plan. Monitor server errors, rate limiting, database pool pressure, and health failures after the first staging deployment.
