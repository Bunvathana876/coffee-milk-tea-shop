# Brew & Boba Management Portal

Standalone React application for the café management workspace. Phase 1 includes administrator login, server-verified session checks, a responsive layout, a basic dashboard populated from the existing Express API, and route shells for later phases. Seller pages are inaccessible until the backend has seller roles, store ownership, and scoped endpoints.

## Run locally

Start the existing Express backend on host port 8001, then:

```bash
cd management-portal
npm install
npm run dev
```

Open `http://localhost:5175`. Vite proxies `/api` to `http://localhost:8001` by default. Set `VITE_PROXY_TARGET` in a local `.env` to use another backend. The portal stores no catalog or order data and requires an existing administrator account. Do not put credentials in Vite environment variables.

```bash
npm test
npm run build
```

The Dockerfile is ready for a later Compose service. Compose integration and shared-database selection are planned for Phase 7; no container or database is started by this portal.
