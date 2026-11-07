# Brew & Boba Café — Docker Development Setup

The separate `compose.production.yaml` serves compiled clients and runs the API without development watch mode. It requires an explicit protected environment file and approved database migrations. It is preparation only; see [deployment runbook](docs/DEPLOYMENT_RUNBOOK.md) before any launch. The development instructions below preserve existing ports and volumes.

This document provides complete instructions for running the Brew & Boba Café ordering platform inside Docker containers using Docker Compose on Apple Silicon (ARM64) and Intel macOS.

---

## 1. Architecture Overview

The containerized stack consists of four services connected over a private bridge network (`brew_boba_network`):

| Service | Technology | Internal Port | Host Port | Role |
| :--- | :--- | :--- | :--- | :--- |
| **`db`** | PostgreSQL 16 Alpine | `5432` | `127.0.0.1:5432` by default | Relational database with persistent volume |
| **`backend`** | Node.js 22 + Express | `8000` | `http://localhost:8001` | REST API, JWT auth, schema initialization & seeding |
| **`frontend`** | React 19 + Vite | `5173` | `http://localhost:5173` | Customer storefront with Hot Module Replacement |
| **`management-portal`** | React 19 + Vite | `5175` | `http://localhost:5175` | Administrator login and dashboard; future management screens |

### Key Architectural Highlights
- **Apple Silicon Native**: Built using official `node:22-alpine` and `postgres:16-alpine` images that run natively on ARM64 without Rosetta emulation overhead.
- **Dependency Isolation**: Uses separate `/app/node_modules` volumes for `frontend`, `backend`, and `management-portal` so container-built binaries are not overwritten by host macOS dependencies.
- **Local database access**: PostgreSQL binds to `127.0.0.1:${POSTGRES_HOST_PORT:-5432}` for desktop tools such as pgAdmin. It is not published to other network interfaces. Set `POSTGRES_HOST_PORT` in `.env` if that host port is occupied.
- **Zero-Wait Auto-Initialization**: PostgreSQL runs health checks via `pg_isready`. When healthy, the backend connects using the Docker service name (`db:5432`), auto-creates required tables, and auto-seeds catalog data idempotently.
- **Hot Reloading**: Both React applications bind-mount their source and run Vite; the backend uses `node --watch`.
- **Shared API**: The management portal uses a same-origin `/api` proxy to `http://backend:8000` inside Docker. It has no database connection or API service of its own.

---

## 2. Prerequisites

- macOS with Docker Desktop installed and running.
- Verify Docker is active:
  ```bash
  docker --version
  docker compose version
  ```

---

## 3. Quick Start

### Step 1: Copy Environment Variables
If not already created, copy the environment template:
```bash
cp .env.example .env
```

### Step 2: Validate Docker Compose Configuration
```bash
docker compose config
```

### Step 3: Build the Container Images
```bash
docker compose build
```

### Step 4: Start All Services in the Background
```bash
docker compose up -d
```

### Step 5: Verify Service Status
```bash
docker compose ps
```
You should see all four containers running and healthy:
- `brew_boba_db`: `Up (healthy)`
- `brew_boba_backend`: `Up (healthy)`
- `brew_boba_frontend`: `Up (healthy)`
- `brew_boba_management_portal`: `Up (healthy)`

---

## 4. Application URLs & Endpoints

| Resource | URL | Description |
| :--- | :--- | :--- |
| **Frontend Storefront** | [http://localhost:5173](http://localhost:5173) | Customer café ordering website |
| **Management Portal** | [http://localhost:5175/login](http://localhost:5175/login) | Administrator login and live dashboard; seller access disabled |
| **Backend API Root** | [http://localhost:8001](http://localhost:8001) | Express REST API index |
| **Backend Health Check** | [http://localhost:8001/api/health](http://localhost:8001/api/health) | Database status and connectivity |
| **Product Catalog** | [http://localhost:8001/api/products](http://localhost:8001/api/products) | Drinks menu with category filters |
| **Categories API** | [http://localhost:8001/api/categories](http://localhost:8001/api/categories) | Active drink categories |

### pgAdmin 4 connection

Register or edit the server with host `127.0.0.1`, port `5432` (or `POSTGRES_HOST_PORT` from `.env`), maintenance database `POSTGRES_DB`, username `POSTGRES_USER`, and the existing `POSTGRES_PASSWORD` from `.env`. Use the same database name when browsing the project tables. The Compose database service must be running with the current port mapping; changing `compose.yaml` alone does not update an already running container.

---

## 5. Administrator Access

The backend seeds an initial administrator only when needed. Use the existing account configured for the Docker database. Change development defaults before any non-local deployment; never put credentials in documentation or source control. The portal verifies the current database-backed administrator role after login. Seller authentication and ownership are not implemented.

---

## 6. Daily Operations & Commands

### Viewing Container Logs
Follow live logs for all services:
```bash
docker compose logs -f
```

Follow logs for a specific service:
```bash
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f management-portal
docker compose logs -f db
```

### Stopping the Stack
Stop containers without deleting volume data:
```bash
docker compose stop
```
Or stop and remove containers and network:
```bash
docker compose down
```

### Restarting the Stack
```bash
docker compose restart
```

### Rebuilding After `package.json` Updates
If you add or update npm packages in a service's `package.json`:
```bash
docker compose build --no-cache
docker compose up -d
```

### Accessing a Container Shell
```bash
# Open shell in backend container
docker compose exec backend sh

# Open shell in frontend container
docker compose exec frontend sh

# Open interactive psql shell in database container
docker compose exec db psql -U postgres -d coffee_shop
```

The named `brew_boba_postgres_data` volume holds Docker PostgreSQL data. Do not reset it or copy native PostgreSQL records into it as part of portal setup. Native PostgreSQL on port 5433 is a separate database.

---

## 7. Troubleshooting

### Port 8001, 5173, or 5175 already in use
If another application on your Mac is occupying one of these ports:
1. Check what is occupying the port:
   ```bash
   lsof -i :8001
   lsof -i :5173
   lsof -i :5175
   ```
2. Or change the host port in `.env` without modifying code:
   ```env
   BACKEND_PORT=8002
   FRONTEND_PORT=5174
   MANAGEMENT_PORTAL_PORT=5176
   ```
   Then adjust `VITE_API_URL=http://localhost:8002` and restart:
   ```bash
   docker compose up -d
   ```
