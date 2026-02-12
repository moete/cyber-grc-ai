# Testing 

This document describes the test strategy, environment, and how to run tests .

## Prerequisites: PostgreSQL must be running

Commands that use the database (`migrate`, `migrate:fresh`, `seed`, `test:ci`, and the **functional** test suite) need a running PostgreSQL instance. Otherwise you get `ECONNREFUSED 127.0.0.1:5432`.

- **With Docker** (from the **repo root**):  
  `docker compose up -d postgres`  
  Then from `backend`: run `pnpm run test:ci` or `pnpm run setup:fresh` then `pnpm run test`.
- **Without Docker**: start PostgreSQL locally and ensure `backend/.env` has the correct `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_DATABASE`.

**Unit tests only** (`pnpm run test:unit`) do **not** need the database or Docker.

## Test suites

| Suite          | Location                        | Purpose                                                                         |
|----------------|---------------------------------|---------------------------------------------------------------------------------|
| **Unit**       | `tests/unit/**/*.spec.ts`       | Pure logic: permissions (`hasPermission`, `canAccessResource`). No DB, no HTTP. |
| **Functional** | `tests/functional/**/*.spec.ts` | HTTP API + DB: multi-tenant isolation, audit trail E2E. Require a running app and a seeded database. |

## What is tested

### Unit (invariants métier)

- **RBAC**: `hasPermission(role, permission)` — Owner has ORG_DELETE / USER_MANAGE; Admin does not have ORG_DELETE; Analyst cannot delete suppliers; Auditor is read-only on suppliers; string role normalization (e.g. `"owner"` from API).
- **Tenant isolation helper**: `canAccessResource(role, userOrgId, resourceOrgId, permission)` — user from org A cannot access resource from org B; same org + permission grants access.

### Functional / integration

- **Multi-tenant isolation**: A user from organisation B cannot read a supplier belonging to organisation A (404 when crossing tenant).
- **E2E (bonus)**: Login → create supplier → GET audit logs filtered by `entityType=supplier` and `entityId` → assert one `CREATE` entry exists.

## Isolated test environment

### Database

- **Unit tests** do not use the database.
- **Functional tests** use the same database as the application, configured via env (`DB_*`). 
   To avoid polluting development data, use a **dedicated test database**.

### Recommended setup

1. **Create a test database** (e.g. same host as dev):
   ```bash
   psql -U postgres -c "CREATE DATABASE cyber_grc_test;"
   ```

2. **Point the app to the test DB when running tests** (e.g. in `.env.test` or by overriding for the test command):
   ```bash
   DB_DATABASE=cyber_grc_test pnpm run test
   ```
   Or use a script in `package.json`:
   ```json
   "test:ci": "DB_DATABASE=cyber_grc_test pnpm run migrate:fresh && pnpm run seed && pnpm run test"
   ```

3. **Fixtures**: Functional tests rely on **seed data** (same as dev): 2 organisations, 4 users (alice@acme.com, bob@acme.com, charlie@globex.com, diana@globex.com), 15 suppliers. Run migrations and seed **before** functional tests so that:
   - Multi-tenant test can use Alice (Acme) and Charlie (Globex).
   - Audit trail E2E can use Bob (Admin, Acme) to create a supplier and read audit logs.

4. **Teardown**: No automatic teardown of the test DB. Options:
   - **Option A**: Reuse the same test DB; before functional suite run `migrate:fresh` + `seed` so each run starts from a known state.
   - **Option B**: Truncate tables after the functional suite (custom teardown in `tests/bootstrap.ts`).  
   The current setup assumes **Option A**: run `migrate:fresh` and `seed` once (or in CI) before `pnpm run test`, so fixtures are in place and tests are reproducible.

### Running tests

From the **backend** directory:

```bash
pnpm run test:unit

pnpm run test:functional

# All tests (unit + functional)
pnpm run test
```

**Full reset + seed + run all tests** (e.g. CI or clean run). **Start Postgres first** (e.g. `docker compose up -d postgres` from repo root):

```bash
pnpm run test:ci
```

For a **dedicated test database** (optional):

```bash
# Create DB once: psql -U postgres -c "CREATE DATABASE cyber_grc_test;"
$env:DB_DATABASE="cyber_grc_test"   # PowerShell
pnpm run test:ci
```

## CI (optional)

- Run tests in CI with `DB_DATABASE=cyber_grc_test`, and a Postgres service (and Redis if workers are run). 
Before the test step: run migrations and seed so functional tests have fixtures.
- Unit tests document permission and tenant-isolation invariants; functional tests document that the API enforces them.
