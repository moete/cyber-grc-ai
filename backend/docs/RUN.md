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

### Development (local)

Runs the server with file watching; no build step.

```powershell
pnpm --filter backend dev
```

You should see a line like: `started HTTP server on localhost:3333`

**Note:** The standard Adonis command is `node ace serve --watch`. In this pnpm monorepo that can fail (assembler/picomatch resolution), so we use `tsx --watch bin/server.ts` for dev. Behaviour is the same: HTTP server with reload on file change.

### Production (build then run)

Build compiles TypeScript to `build/`; then run the compiled server (e.g. behind PM2).

```powershell
pnpm --filter backend build
NODE_ENV=production pnpm --filter backend start
```

Or with PM2: `pm2 start ecosystem.config.js` (pointing to `node build/bin/server.js`).

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
