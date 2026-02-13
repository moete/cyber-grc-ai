## Cyber GRC Platform Monorepo

Monorepo with:
- **backend**: AdonisJS + PostgreSQL + Redis
- **frontend**: React + TypeScript + Vite
- **shared**: shared types, enums, RBAC permissions

---

## 1. Prerequisites

- **Node.js** 20+
- **pnpm** 9+ (`npm install -g pnpm`)
- **PostgreSQL** (local)  database user/password you control
- **Redis** (local)  default port `6379` is fine

---

## 2. Run with Docker (one command)

From the repo root (requires Docker and Docker Compose):

```bash
docker compose up --build
```

Starts PostgreSQL, Redis, backend, and frontend. Open **http://localhost:5173**. 
First time only, in another terminal, seed the DB:

```bash
docker compose exec backend sh -c "pnpm run db:fresh && pnpm run db:seed"
```

---

## 3. First install (without Docker)

From the repo root:

```bash
pnpm install
```

---

## 4. Backend config & DB

From the repo root:

```bash
cd backend
cp .env.example .env          # if the file exists, otherwise create .env
```

Edit `.env` to match your local PostgreSQL / Redis:

- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_DATABASE`
- `REDIS_HOST`, `REDIS_PORT`
- `JWT_SECRET` (any long random string)

Then run migrations + seeds:

```bash
pnpm run db:fresh   # tsx database/migrator.ts fresh
pnpm run db:seed    # tsx database/seeds/run.ts
```

Start the backend API (default: `http://localhost:3333`):

```bash
pnpm dev
```

---

## 5. Frontend  start UI

In another terminal, from the repo root:

```bash
cd frontend
cp .env.example .env.local  # if provided, otherwise create .env.local
```

Make sure it points to the backend:

```bash
VITE_API_BASE_URL=http://localhost:3333
```

Then start the frontend:

```bash
pnpm dev
```

Open the app at the URL Vite prints (usually `http://localhost:5173`).

---

## 6. Useful scripts (CI parity)

From the repo root:

```bash
cd backend
pnpm lint        # ESLint backend
pnpm typecheck   # tsc --noEmit
pnpm test:ci     # migrations + seeds + tests

cd ../frontend
pnpm lint        # ESLint frontend
```

