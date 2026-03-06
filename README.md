# ShopTrack POS

> **Locally hosted inventory and sales management system for a retail shop selling phone accessories and electronic gadgets.**

## Stack

| Layer        | Technology                             |
|--------------|----------------------------------------|
| Backend      | FastAPI (Python 3.12) + SQLAlchemy 2   |
| Frontend     | React 18 + Vite + TypeScript           |
| Database     | PostgreSQL 16                          |
| Auth         | JWT (python-jose + passlib)            |
| ORM / DB     | SQLAlchemy 2 + Alembic Migrations      |
| Containers   | Docker + Docker Compose                |
| Reverse proxy| Nginx                                  |
| Remote access| Tailscale VPN                          |

---

## Quick Start

### 1. Prerequisites

- **Docker** and **Docker Compose** installed on the host machine.
- **Tailscale** installed and authenticated on the host machine and all remote devices.

### 2. Clone and Configure

```bash
git clone <repo-url> shoptrack-pos
cd shoptrack-pos

# Copy environment templates
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Edit `backend/.env`:
- Set `POSTGRES_PASSWORD` to a strong password.
- Set `JWT_SECRET_KEY` to a long random secret (generate with `openssl rand -hex 32`).

Edit `frontend/.env` (for remote Tailscale access):
- Set `VITE_API_BASE_URL=http://<your-tailscale-ip>/api/v1`

### 3. Build and Start

```bash
docker-compose up -d --build
```

### 4. Initialize Database

```bash
# Run database migrations
docker-compose exec backend alembic upgrade head

# Seed default admin user and categories
docker-compose exec backend python app/seed.py
```

> ⚠️ Default credentials: **admin / admin123** — **Change immediately after first login!**

### 5. Access

| Context              | URL                                 |
|----------------------|-------------------------------------|
| Local (same machine) | `http://localhost`                  |
| Local network        | `http://<local-ip>`                 |
| Remote (Tailscale)   | `http://<tailscale-ip>`             |
| API Docs (Swagger)   | `http://localhost/api/docs`         |

---

## Features

- 🛒 **POS Interface** — Fast product search, cart management, checkout with payment method selection (Cash/MoMo/Split).
- 📶 **Offline Resilience (PWA)** — App continues to function globally during network outages, quietly queuing offline sales in IndexedDB and syncing when reconnected.
- ⚙️ **Settings Dashboard** — Admins can dynamically change the Store Name, Currency Symbol ($, ₦, GH₵, etc.), and Global Tax Rates without code changes.
- 🧾 **Thermal Receipt Printing** — High-fidelity 80mm thermal receipt generation with auto-print capability after every sale.
- 📊 **Data Export (CSV)** — One-click export for Sales History and Analytics Reports to Excel-compatible CSV files.
- 💳 **Credit Sales** — Dedicated tracking module for unpaid store credits with status badges and itemized breakdowns.
- 🌓 **Dynamic Theming** — Built-in Light and Dark Mode toggle stored in Zustand.
- 📦 **Inventory Management** — Add, edit, archive products with SKU, category, cost/selling price, and stock tracking.
- 📊 **Analytics Dashboard** — Revenue trends, profit analysis, top products, and payment method breakdowns.
- 🔔 **Low Stock Alerts** — Visual badges and dashboard alerts for products below reorder level.
- 🔐 **Role-Based Auth** — Admin vs Staff access levels, JWT-secured API.
- 🐳 **Fully Dockerized** — One command to run the entire backend/frontend stack via Nginx.

---

## Development (without Docker)

**Backend:**
```bash
cd backend
python -m venv venv && venv\Scripts\activate  # Windows
pip install -r requirements.txt
alembic upgrade head
python app/seed.py
uvicorn app.main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

---

## Database Backup

```bash
# Create a backup
docker-compose exec db pg_dump -U shoptrack_user shoptrack_db > backup_$(date +%Y%m%d).sql

# Restore from backup
docker-compose exec -T db psql -U shoptrack_user shoptrack_db < backup_20250302.sql
```

> **Recommended:** Schedule daily backups via Task Scheduler (Windows) or cron (Linux).

---

## Project Structure

```
shoptrack-pos/
├── backend/
│   ├── app/
│   │   ├── api/v1/   (auth, products, categories, sales, analytics, credits, settings, users)
│   │   ├── core/     (config, security/JWT)
│   │   ├── db/       (session, base_class)
│   │   ├── models/   (user, category, product, sale, credit, shop_settings)
│   │   ├── schemas/  (pydantic validation)
│   │   ├── main.py
│   │   └── seed.py
│   ├── alembic/
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── pages/    (Dashboard, Inventory, POS, Sales, Analytics, Credits, Settings, etc.)
│   │   ├── components/ (Sidebar, Topbar, ReceiptPrinter)
│   │   ├── store/    (auth, settings, theme stores)
│   │   ├── services/ (Axios API client)
│   │   └── types/    (TypeScript interfaces)
│   └── Dockerfile
├── nginx/
│   └── default.conf
└── docker-compose.yml
```
