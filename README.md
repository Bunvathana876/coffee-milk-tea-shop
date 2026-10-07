# Coffee & Milk Tea Ordering Web App (Brew & Boba)

Full-stack web application designed for a small café ordering system with dual currency (USD & KHR), customizable drinks, and persistent shopping cart.

---

## 🐳 Run with Docker (Recommended - One Click!)

You can run both frontend and backend together with Docker Compose.

### Option A: Using Docker Desktop (GUI)
1. Open **Docker Desktop** on your Mac.
2. In Docker Desktop, go to **Containers** or open the project folder in Docker Desktop.
3. Click the **"Run"** / **"Play" ▶** button on the `coffee-milk-tea-shop` project stack.
4. Once the containers turn green:
   - Click the **`5173:80`** port link to open the **Frontend Web App**: [http://localhost:5173](http://localhost:5173)
   - Click the **`8000:8000`** port link to open the **FastAPI Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)

### Option B: Using Terminal Command
From the project root folder:

```bash
docker compose up --build
```

To run in the background (detached mode):
```bash
docker compose up -d
```

To stop the containers:
```bash
docker compose down
```

---

## 🛠 Manual Development Setup (Without Docker)

### 1. Start Backend (FastAPI)

```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

- API Base URL: `http://localhost:8000`
- Interactive Swagger Docs: `http://localhost:8000/docs`
- Health Check: `http://localhost:8000/api/health`

### 2. Start Frontend (React + Vite)

In a new terminal window:

```bash
cd frontend
npm run dev
```

- Web App URL: `http://localhost:5173`

---

## Project Structure

```text
coffee-milk-tea-shop/
├── docker-compose.yml     # Orchestrates frontend + backend containers
├── frontend/             # React + TypeScript + Vite + Tailwind CSS
│   ├── Dockerfile        # Multi-stage production container with Nginx
│   ├── nginx.conf        # Nginx SPA router & backend reverse proxy
│   ├── src/
│   │   ├── components/   # UI components (ProductCard, CartItem, CartSummary, etc.)
│   │   ├── config/       # Currency configuration & exchange rate utilities
│   │   ├── features/     # Feature modules (products, cart with localStorage)
│   │   ├── pages/        # Route pages (Home, Menu, Cart, Checkout, Receipt)
│   │   ├── services/     # API integration services (FastAPI consumer)
│   │   └── types/        # TypeScript interfaces & types
│   ├── package.json
│   └── vite.config.ts
└── backend/              # Python + FastAPI + SQLAlchemy + SQLite
    ├── Dockerfile        # Python 3.11 container with health check
    ├── app/
    │   ├── api/          # Route handlers & endpoints
    │   ├── core/         # Configuration & app settings
    │   ├── db/           # SQLAlchemy session, models & seeding
    │   ├── models/       # Database models (Category, Product, Order, OrderItem)
    │   ├── schemas/      # Pydantic validation schemas
    │   └── main.py       # FastAPI application entrypoint
    ├── tests/            # Pytest test suite
    ├── requirements.txt
    └── pytest.ini
```
