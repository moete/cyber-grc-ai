## Cyber GRC Platform Monorepo

Monorepo with:
- **backend**: AdonisJS + PostgreSQL + Redis
- **frontend**: React + TypeScript + Vite
- **shared**: shared types, enums, RBAC permissions

---

## 1. Prerequisites

- **Node.js** 20+
- **pnpm** 9+ (`npm install -g pnpm`)
- **PostgreSQL** (local) — database user/password you control
- **Redis** (local) — default port `6379` is fine

---

## 2. Run with Docker (one command)

From the repo root (requires Docker and Docker Compose):

```bash
cp .env.example .env 
docker compose up --build
```

This will start PostgreSQL, Redis, backend, and frontend.
Open **http://localhost:5173**. 
First time only, in another terminal, seed the DB:

```bash
docker compose exec backend sh -c "pnpm run setup:fresh"
```


**How secrets work:** `docker-compose.yml` reads variables from the root `.env` file (gitignored). The `.env.example` template lists what you need (`DB_*`, `APP_KEY`, `JWT_SECRET`, `ANTHROPIC_API_KEY`). The backend validates all required vars at startup and refuses to run if any are missing. On a new machine: `cp .env.example .env`, fill in the values, and you're good. For production we can use  (Docker secrets, Vault, cloud env vars).

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
cp .env.example .env 
```

Edit `.env` to match your local PostgreSQL / Redis and set your Claude API key:

- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_DATABASE`
- `REDIS_HOST`, `REDIS_PORT`
- `JWT_SECRET` (any long random string)
- `ANTHROPIC_API_KEY` (required; get one at console.anthropic.com)

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

## 5. Frontend — start UI

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

## 6. AI analysis (Claude API + Redis + BullMQ)

AI analysis uses the **real Claude API only** (no mock). It runs **asynchronously** via BullMQ and **requires Redis** and **ANTHROPIC_API_KEY** (get a key at [console.anthropic.com](https://console.anthropic.com)).

### Option A — All in Docker (simplest)

1. In the repo root, create `.env` from `.env.example` and set your Anthropic key:
   ```bash
   cp .env.example .env
   # Edit .env and set: ANTHROPIC_API_KEY=sk-ant-api03-...
   ```
2. Start the full stack (Postgres, Redis, backend, frontend):
   ```bash
   docker compose up --build
   ```
3. Seed the DB once: `docker compose exec backend sh -c "pnpm run setup:fresh"`.
4. Open **http://localhost:5173**, create or edit a supplier. The backend will enqueue an AI job (Redis/BullMQ) and call the real Claude API; the supplier detail page will poll until the result appears.

### Option B — Backend on localhost, Redis + Postgres in Docker

Use this when you want to run the backend (and frontend) locally and only run Redis + Postgres in containers.

1. Start only Postgres and Redis:
   ```bash
   docker compose up -d postgres redis
   ```
2. In **backend**, create or edit `.env` with:
   - `DB_HOST=localhost`, `DB_PORT=5432`, `DB_USER`, `DB_PASSWORD`, `DB_DATABASE`
   - `REDIS_HOST=localhost`, `REDIS_PORT=6379`
   - `ANTHROPIC_API_KEY=sk-ant-api03-...` (your real key)
   - Other required vars: `APP_KEY`, `JWT_SECRET`, etc.
3. From repo root: run migrations + seed, then start backend and frontend:
   ```bash
   cd backend && pnpm run db:fresh && pnpm run db:seed && pnpm run dev
   # In another terminal:
   cd frontend && pnpm run dev
   ```
4. Open **http://localhost:5173**, create or update a supplier. Redis + BullMQ will process the job and the backend will call the real Claude API; the UI will show the result when it’s ready.

**Summary:** Redis and `ANTHROPIC_API_KEY` are required for AI analysis. The backend uses only the real Claude API.

---

## 7. Useful scripts (CI parity)

From the repo root:

```bash
cd backend
pnpm lint        # ESLint backend
pnpm typecheck   # tsc --noEmit
pnpm test:ci     # migrations + seeds + tests

cd ../frontend
pnpm lint        # ESLint frontend
```
