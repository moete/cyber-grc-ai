# Architecture

## Project Structure

```
packages/
├── backend/                    # AdonisJS — HTTP layer + business logic
│   ├── app/
│   │   ├── controllers/
│   │   │   ├── auth_controller.ts        # POST login, GET me, POST logout
│   │   │   ├── suppliers_controller.ts   # CRUD + server-side pagination
│   │   │   └── audit_logs_controller.ts  # Read-only audit trail
│   │   ├── middleware/
│   │   │   ├── auth_middleware.ts         # JWT verification → loads user from DB
│   │   │   ├── rbac_middleware.ts         # Permission check (uses shared hasPermission)
│   │   │   ├── org_scope_middleware.ts    # Sets PG session var for RLS
│   │   │   ├── container_bindings_middleware.ts
│   │   │   └── force_json_response_middleware.ts
│   │   ├── services/
│   │   │   ├── db.ts                # Kysely singleton (AdonisJS context)
│   │   │   ├── hash.ts             # scrypt password hashing (zero deps)
│   │   │   └── audit_service.ts    # Centralised audit trail writer
│   │   ├── validators/
│   │   │   ├── auth_validator.ts    # Login schema (VineJS)
│   │   │   └── supplier_validator.ts # Create + Update schemas
│   │   └── exceptions/
│   │       └── handler.ts          # Global error → structured IApiErrorResponse
│   ├── config/                     # AdonisJS configs (app, cors, hash, logger, bodyparser)
│   ├── database/
│   │   ├── connection.ts           # Standalone Kysely factory (for scripts)
│   │   ├── migrator.ts             # Kysely migration runner
│   │   ├── migrations/
│   │   │   ├── 001_create_organisations.ts
│   │   │   ├── 002_create_users.ts
│   │   │   ├── 003_create_suppliers.ts
│   │   │   ├── 004_create_audit_logs.ts  # + append-only rules
│   │   │   └── 005_enable_rls.ts         # RLS policies
│   │   └── seeds/
│   │       └── run.ts              # 2 orgs, 4 users, 15 suppliers
│   └── start/
│       ├── env.ts                  # Fail-fast env validation (JWT_SECRET, DB_*, etc.)
│       ├── routes.ts               # All route declarations + middleware bindings
│       └── kernel.ts               # Named middleware registration
│
├── shared/                     # Types, constants, validation — used by ALL packages
│   └── src/
│       ├── enums/              # Roles, Permission, Category, RiskLevel, Status, AuditAction …
│       ├── interfaces/         # ISupplier, IUser, IAuditLog, IApiResponse, IJwtPayload …
│       ├── constants/
│       │   ├── permissions.ts  # ROLE_PERMISSIONS map + hasPermission() + canAccessResource()
│       │   ├── entity-types.ts # ENTITY_TYPES constant
│       │   └── table-names.ts
│       ├── database/
│       │   ├── database.ts     # Kysely Database interface (single source of truth)
│       │   └── tables/         # SupplierTable, UserTable, OrganisationTable, AuditLogTable
│       └── utils/
│           └── guards.ts       # isNullish / isNotNullish
│
├── frontend/                   # (planned) React + TypeScript + Vite
├── ai-service/                 # (planned) AI risk evaluation module
├── docker-compose.yml          # PostgreSQL 16 (postgres/postgres/cyber_grc)
├── tsconfig.base.json          # Shared compiler options
├── tsconfig.paths.json         # Path aliases (@shared, App/*)
├── .prettierrc                 # Code style
└── pnpm-workspace.yaml         # Workspace definition
```

---

## Key Architecture Decisions

### 1. Kysely as the sole database layer (no Lucid)

**Decision:** PostgreSQL is queried exclusively through Kysely. AdonisJS Lucid is not used.

**Why:**
- The test PDF specifies *"PostgreSQL (piloté par Kysely)"*. Kysely IS the ORM.
- Using both Lucid and Kysely would create two competing representations of the schema — one in Lucid models (camelCase), one in Kysely table types (snake_case). Maintenance nightmare.
- Kysely types live in `shared/src/database/tables/` and serve as the **single source of truth** for the DB schema. Both backend and frontend reference the same types.
- Kysely provides `Selectable<T>`, `Insertable<T>`, `Updateable<T>` — no need for hand-written row types.

**Trade-off:** We lose Lucid's auth integration, so we wrote a lightweight JWT middleware (~40 lines). This is simpler than configuring Lucid just for auth.

### 2. RBAC via role → permission map in shared (not a pivot table)

**Decision:** Permissions are statically mapped to roles in `shared/src/constants/permissions.ts`. No `roles`, `permissions`, `role_permissions` pivot tables.

**Why:**
- The PDF defines exactly 4 roles with fixed permissions. This is a closed set — it won't change at runtime.
- A pivot table with a `hasPermission()` DB query on every request adds latency for zero benefit when the mapping is static.
- The map lives in `shared` so it's reused by backend (middleware), frontend (UI guards), and tests — one source of truth, no duplication.
- If requirements evolve to dynamic roles, the `hasPermission()` function is the only thing to change.

### 3. Multi-tenant isolation: application-level scoping + PostgreSQL RLS (defense-in-depth)

**Decision:** Every query includes `WHERE organization_id = ?` (application-level scoping) **and** PostgreSQL RLS policies filter rows by `app.current_org_id` session variable (defense-in-depth).

**Why:**
- Application-level scoping is explicit, testable, and debuggable. You can read any controller and see the org filter.
- PostgreSQL RLS provides a safety net: even if a developer forgets a WHERE clause, the DB itself blocks cross-tenant access.
- The `OrgScopeMiddleware` sets `SET app.current_org_id` per request for RLS, while controllers always include `WHERE organization_id = ctx.auth.organizationId`.

**Trade-off:** RLS is only enforced for non-superuser connections. In development (connecting as `postgres`), app-level scoping is the primary mechanism. In production, a dedicated `app_user` role should be used so RLS policies are enforced. See migration `005_enable_rls.ts`.

### 4. Audit trail via middleware-level service (not PostgreSQL triggers)

**Decision:** Audit logs are written by `AuditService.logAudit()` called explicitly in controllers.

**Why:**
- Triggers are invisible — a developer modifying a controller won't know audit logging happens behind the scenes. Explicit calls are self-documenting.
- We need `userId`, `ipAddress`, and `organizationId` in the audit log. PostgreSQL triggers don't have access to HTTP context.
- The `AuditService` is a single function. Adding audit trail to any new entity is one `logAudit()` call.
- The audit_logs table is append-only (no UPDATE, no DELETE). This is enforced at the application level and can be reinforced with a PostgreSQL policy.

### 5. JWT auth middleware instead of @adonisjs/auth

**Decision:** Custom `Auth.ts` middleware that verifies JWT and loads the user via Kysely.

**Why:**
- `@adonisjs/auth` is tightly coupled to Lucid models. Since we use Kysely, the built-in auth package has no model to work with.
- A manual JWT middleware is ~40 lines, does exactly what we need (verify token → load user → attach to context), and is fully transparent.
- Token signing uses `jsonwebtoken` (battle-tested, 50M+ weekly downloads).

### 6. Validators: one file per resource, not one file per operation

**Decision:** `SupplierValidator.ts` exports `CreateSupplierValidator`, `UpdateSupplierValidator`, `ListSuppliersValidator`.

**Why:** Three tiny files with identical imports and 10 lines each is noise. One file groups related schemas, is easier to navigate, and still follows AdonisJS validator conventions (class with `schema` property).

### 7. No access-rights provider utility

**Decision:** We do NOT have a separate `access-rights.provider.ts` utility.

**Why:**
- The reference project needed it because Express has no built-in middleware chain — you need a utility to manually compute access rights and inject them into `req.filters`.
- AdonisJS has a declarative middleware chain: `auth → organizationScope → rbac:permission → controller`. Access rights are resolved step by step through the chain, not by a single utility.
- The permission check is one function call (`hasPermission()` from shared). Wrapping it in another utility adds indirection with no benefit.

### 8. Config: fail-fast env validation at boot

**Decision:** `config/env.ts` validates all required env vars at import time. If `DB_HOST` or `JWT_SECRET` is missing, the process crashes immediately with a clear error.

**Why:** The PDF requires *"gestion des secrets: .env + validation au boot"*. A missing env var discovered at runtime (e.g., when the first request hits the DB) is much harder to debug than a crash at startup with `Missing required environment variable: JWT_SECRET`.

---

## Request Lifecycle

```
Client
  │
  ▼
[Route] ─── public? ──→ AuthController.login
  │
  │ (protected route)
  ▼
[Auth middleware]          → verify JWT, load user from DB
  ▼
[OrganizationScope]       → inject organizationId into context
  ▼
[Rbac middleware]          → check hasPermission(role, required)
  ▼
[Controller]              → validate input → query DB (Kysely) → return JSON
  ▼
[ExceptionHandler]        → catch errors → structured IApiErrorResponse
  ▼
Client receives JSON
```

---

## What Has Been Implemented

- **Database migrations** — 5 Kysely migrations (organisations, users, suppliers, audit_logs, RLS policies)
- **Seed script** — 2 orgs, 4 users (one per role), 15 suppliers with realistic data
- **Custom JWT auth middleware** — replaces @adonisjs/auth, ~90 lines, DB user verification
- **RBAC middleware** — layered permission checks via static role-permission map
- **OrgScope middleware** — sets PG session variable for RLS defense-in-depth
- **PostgreSQL RLS policies** — tenant isolation on suppliers, users, audit_logs tables
- **Audit trail** — append-only audit_logs with PostgreSQL rules preventing UPDATE/DELETE
- **Suppliers CRUD** — full create/read/update/delete with pagination, filtering, sorting
- **Exception handler** — structured JSON errors matching IApiErrorResponse

## What We Would Add With More Time

- **Rate limiting** on auth + AI endpoints (AdonisJS throttle or custom)
- **Security headers** middleware (CSP, HSTS, X-Frame-Options)
- **AI service package** with BullMQ job queue, retry, dead letter
- **Non-superuser DB role** (`app_user`) for production RLS enforcement
- **Integration tests** verifying multi-tenant isolation
- **Refresh tokens** for production-grade session management
- **Docker Compose** for one-command local setup (PG + Redis + app)
