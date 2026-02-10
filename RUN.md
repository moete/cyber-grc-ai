# Run locally (recruiter-friendly)

## Prerequisites

- Node.js 20+
- pnpm 10+
- Docker Desktop (for PostgreSQL)

## One-time setup

From the repo root (`packages/`):

```powershell
pnpm install
docker compose up -d
```

Copy the example env file and adjust if needed:

```powershell
cp backend/.env.example backend/.env
```

## Database setup (migrate + seed)

```powershell
pnpm --filter backend migrate
pnpm --filter backend seed
```

Or both in one command:

```powershell
pnpm --filter backend setup:db
```

## Start the backend

```powershell
pnpm --filter backend dev
```

You should see a line like:

`Server address: http://127.0.0.1:3333`

## API quick test

```powershell
# Login as Alice (Owner, Acme Corp)
curl -X POST http://localhost:3333/api/auth/login -H "Content-Type: application/json" -d '{"email":"alice@acme.com","password":"password123"}'

# Use the returned token for protected routes:
curl http://localhost:3333/api/suppliers -H "Authorization: Bearer <token>"
```

## Seed credentials

| Email              | Password      | Role    | Organisation       |
|--------------------|---------------|---------|--------------------|
| alice@acme.com     | password123   | Owner   | Acme Corp          |
| bob@acme.com       | password123   | Admin   | Acme Corp          |
| charlie@globex.com | password123   | Analyst | Globex Industries  |
| diana@globex.com   | password123   | Auditor | Globex Industries  |

## Stop

- Stop the backend: `Ctrl + C`
- Stop Postgres: `docker compose down`
