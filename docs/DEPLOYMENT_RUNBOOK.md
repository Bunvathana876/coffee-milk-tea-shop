# Controlled deployment preparation

## Repeatable isolated verification

Build the three `Dockerfile.production` images with tags `brew-boba-backend:readiness`, `brew-boba-web:readiness`, and `brew-boba-portal:readiness`. With Docker and Node/PostgreSQL dependencies available, run from `backend/`:

```sh
RUN_ISOLATED_STAGING=true node test/stagingRehearsal.js
```

This creates only labelled disposable containers on a dedicated network, using tmpfs PostgreSQL 16 and loopback ports 55446, 18080, 18081. The ports must be free. It never attaches project volumes or uses project environment credentials. It prepares a synthetic baseline, applies 001/002, exercises production images with a restricted app role, then verifies the complete cash-order HTTP workflow and restores the archive into another empty database. Matching version 16 archive wrappers are created in a restricted temporary evidence directory. All test containers/networks are removed in `finally`; no volume-removal command is used. Final result: 12 check groups passed.

`databaseBackup.js` accepts `POSTGRES_TOOLS_DIRECTORY` to select a matching, trusted `pg_dump`/`pg_restore` toolchain. Match the tools to the server major version and rehearse restore; a newer-major archive must not be assumed compatible with an older server. Never point the disposable restore command at actual data. Source snapshots can be created outside the workspace with `python3 backend/scripts/sourceSnapshot.py /secure/new-source.tar.gz`; creation is exclusive and includes untracked portal/Flutter source while excluding environment/signing keys and build/dependency directories.

Live prerequisites remain: explicit authorization to start the existing Docker database for read-only comparison, an authoritative-database decision, approved backup and migration rollout, administrator provisioning and deployment approval. Passing the disposable rehearsal grants none of these approvals. TLS and interactive browser/device validation remain separate gates.

Status: blocked pending authoritative-database selection and an approved migration rollout. These commands describe future operator actions; nothing was deployed.

Prerequisites: select the authoritative database; restore a backup to isolated staging; review baseline schema drift; apply versions 001 and 002 through an approved migration identity; provision an administrator explicitly; use a separate application role without schema ownership/DDL privileges; configure TLS ingress and monitoring. The prepared migration runner remains disposable-only and cannot perform the actual rollout.

Required protected environment file: `DATABASE_URL`, strong `JWT_SECRET`, `CORS_ORIGINS` containing explicit HTTPS browser origins, non-default `ADMIN_INITIAL_EMAIL` and `ADMIN_INITIAL_PASSWORD` (retained validation requirements; production startup no longer seeds them), and optional `JWT_EXPIRES_IN`, `USD_TO_KHR_RATE`. Never commit this file. DATABASE_URL must use the selected private database endpoint and required TLS settings. No database port is published by the production Compose file.

```sh
PRODUCTION_ENV_FILE=/secure/brew.env docker compose -f compose.production.yaml config --quiet
PRODUCTION_ENV_FILE=/secure/brew.env docker compose -f compose.production.yaml build
# Only after explicit deployment approval:
PRODUCTION_ENV_FILE=/secure/brew.env docker compose -f compose.production.yaml up -d
curl --fail http://127.0.0.1:8080/api/ready
curl --fail http://127.0.0.1:8081/api/ready
```

Terminate TLS at an approved reverse proxy mapping `cafe.example.invalid` to loopback 8080 and `management.example.invalid` to loopback 8081; substitute only owned domains. Forward `/api` without stripping its prefix. Mobile must use an approved public HTTPS API origin with `BREW_BOBA_API_URL`; the web production image uses same-origin API requests. Production images serve compiled assets and run without root privileges. Development Compose and ports remain unchanged.

Before rollout: verify migration checksums, audit triggers, backups, secrets, CORS, readiness, administrator login, owned order access, one idempotent checkout, status propagation, and audited cash settlement on disposable staging data. Production startup refuses absent migration records and does not create schema or seed default accounts.

Rollback: freeze mutations, retain current image digests and the migration ledger, restore the previous compatible application image. Do not drop settlement or idempotency tables. If data recovery is required, restore into a new database and validate before an explicitly approved connection switch. No automatic down migration is provided. Pin image digests and establish resource limits, TLS renewal, backup retention, alerting, and shutdown handling before production acceptance.
