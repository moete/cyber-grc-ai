# Architecture — Cyber GRC Platform

A short guide to how the project is structured and why we made the choices we did.

---

## Monorepo layout

```
packages/
├── backend/       AdonisJS API (Node + TypeScript + Kysely + BullMQ)
├── frontend/      React SPA (Vite + TypeScript + Tailwind)
├── shared/        Types, enums, interfaces, RBAC constants (used by both)
├── ai-service/    AI analysis package (mock today, real LLM tomorrow)
└── docker-compose.yml
```

Each folder is a **pnpm workspace**. 
`shared` is the glue: it defines the business domain (roles, permissions, supplier/user interfaces, DB schema types) once, and both backend and frontend import from it. This means a type change in `shared` breaks the build immediately if backend or frontend are out of sync.

---

## Backend — separation of responsibilities

The backend follows a layered architecture. Each layer has a single job:

```
Route  →  Middleware  →  Controller  →  Service  →  Database
```

- **Routes** — Map HTTP verbs and paths to controllers and attach middleware (`start/routes.ts`).
- **Middleware** — Cross-cutting concerns: auth, org scoping, RBAC. Runs before the controller (`auth_middleware.ts`, `rbac_middleware.ts`, `org_scope_middleware.ts`).
- **Controllers** — Receive the HTTP request, call validators, delegate to services, return a response. No business logic (`suppliers_controller.ts`, `users_controller.ts`).
- **Validators** — Validate and sanitise request input (VineJS). Reject bad data before it reaches the controller body (`supplier_validator.ts`, `user_validator.ts`).
- **Services** — Business logic: queries, transformations, side effects (audit, AI queue). Don't know about HTTP (`supplier_service.ts`, `audit_service.ts`, `ai_queue.ts`).
- **Helpers** — Small reusable utilities: pagination, standard responses, permission checks (`pagination.ts`, `responses.ts`, `access.ts`).
- **Exceptions** — Custom error classes (401, 403, 404) caught by a global handler that returns consistent JSON errors (`forbidden_exception.ts`, `handler.ts`).

**Why this split?** Controllers stay thin and testable. Services can be reused.
 Middleware handles auth/RBAC once, not per route.

---

## RBAC (Role-Based Access Control)

Roles and permissions are defined in `shared/src/constants/permissions.ts` and shared across the entire stack.

**Four roles, hierarchical:**

- **Owner** —Everything (user management, org deletion, all CRUD, audit trail).
- **Admin** —CRUD suppliers, configure risk policies, read audit trail.
- **Analyst** —Read suppliers, update risk level, add notes.
- **Auditor** —Read-only on everything, full access to audit trail.

**How it works at runtime:**

1. `auth_middleware` verifies the JWT and loads the user (role + org).
2. `rbac_middleware` checks `hasPermission(role, requiredPermission)` using the static map from `shared`. If the user's role doesn't have the permission, the request is rejected with 403.
3. For resource-level checks (e.g. "can this user touch *this* supplier?"), controllers call `requireAccess(auth, resource.organization_id, permission)` which verifies both the permission and org membership.

**Why static permissions?** No DB lookups for permission checks — it's a simple in-memory map. Adding a new permission means updating one file in `shared` and the relevant routes.

---

## Multi-tenancy

Every user belongs to one organisation. Every resource (supplier, audit log) belongs to one organisation. Tenants never see each other's data.

**Two layers of isolation:**

**1. Application layer (primary)**  
All database queries go through `scoped_query.ts` which adds `WHERE organization_id = :orgId` automatically. Controllers don't write raw queries — they call `scopedSelect`, `scopedUpdate`, `scopedDelete`, `scopedInsert`. This works regardless of the database role (even with Postgres superuser in dev).

**2. PostgreSQL Row-Level Security (safety net)**  
Migration `005_enable_rls.ts` enables RLS on tenant tables. The policy checks `organization_id` against a session variable `app.current_org_id`, set by `org_scope_middleware` at the start of each HTTP request. In production (with a non-superuser DB role), RLS blocks any row that doesn't match, even if a code bug skipped the application-level filter.

**Why both?** Defense in depth. The app layer is the guarantee; RLS is the last line of defense that catches mistakes.

---

## Async AI analysis

Supplier risk analysis is **asynchronous**. We don't block the HTTP request while waiting for an AI response.

**Flow:**

```
User creates/updates supplier
        │
        ▼
Controller saves to DB (ai_status = PENDING)
        │
        ▼
enqueueAiJob() → BullMQ queue ("ai-analysis")
        │                              │
        ▼                              ▼
HTTP response returned         Worker picks up job
immediately (201/200)                  │
                                       ▼
                              Sets ai_status = PROCESSING
                                       │
                                       ▼
                              Calls ai-service package
                              (MockClaudeService today)
                                       │
                               ┌───────┴───────┐
                               ▼               ▼
                           Success          Failure
                               │               │
                               ▼               ▼
                      ai_status = COMPLETE  ai_status = ERROR
                      ai_risk_score = N     ai_error = "..."
                      ai_analysis = {json}
```

**Key decisions:**

- **BullMQ + Redis** for the queue. Gives us retries (3 attempts, exponential backoff), persistence, and job visibility.
- **Separate `ai-service` package** so the AI implementation can be swapped. Today it's `MockClaudeService` (deterministic, no API calls). Tomorrow it can be `ClaudeService` or any LLM we need just implement the `IAiService` interface.
- **Status tracking on the supplier row** (`ai_status`, `ai_risk_score`, `ai_analysis` JSONB, `ai_error`). The frontend polls or queries the supplier to show analysis progress.
- **Non-blocking**: the user gets an immediate response. The analysis result appears later.

---

## Frontend architecture

The frontend uses a **feature-based** structure:

```
frontend/src/
├── features/          Feature modules (auth, suppliers, users)
│   └── suppliers/
│       ├── api/       API client functions for this feature
│       └── routes/    Page components (list, detail, form)
├── stores/            Zustand stores (auth state)
├── components/        Shared UI components (layout, badges, guards)
├── lib/               Utilities (API client, RBAC hooks)
├── providers/         React context (QueryClient, Router, Toaster)
├── routes/            Route definitions
└── config/            Environment config
```

**State management:**

- **Zustand** for client state (auth token, user info). 
  **Why:** Minimal API, no boilerplate (unlike Redux). Auth is a small, global slice; we don't need Redux's middleware or DevTools for it. Zustand supports persistence out of the box and works well with selectors, so only the auth store subscribes to token/user. React Context would work but would force more re-renders unless we split many contexts; one small store is simpler.

- **React Query** for server state (suppliers list, user data). Handles caching, refetching, loading/error states.  
  **Why:** Server data (lists, details) is cached and invalidated by key; we don't put it in Zustand or Redux. React Query gives us cache keys, background refetch, loading/error states and retries without writing that logic ourselves. Keeps client state (auth) and server state (API data) clearly separated.

**Data fetching pattern:**  
Each feature has its own API file (e.g. `suppliersApi.ts`) with typed functions (`listSuppliers`, `createSupplier`, etc.). Page components use React Query hooks (`useQuery`, `useMutation`) to call them. The base API client (`lib/api.ts`) handles auth headers and error formatting.

**RBAC in the frontend:**  
`useCan(permission)` hook checks the user's role against the shared permission map. `<RequirePermission>` component conditionally renders UI elements (e.g. delete button only for users with `SUPPLIER_DELETE`).

---

## Database

- **Kysely** as the query builder (type-safe SQL, no ORM magic).
- **PostgreSQL 16** in production and Docker.
- **Migrations** in `backend/database/migrations/` (organisations â†’ users â†’ suppliers â†’ audit_logs â†’ RLS â†’ AI fields).
- **Seeds** in `backend/database/seeds/run.ts` for dev/test data.
- Schema types live in `shared/src/database/` so both backend and frontend know the shape of the data.

---

## Audit trail

Every create, update, and delete on suppliers is logged to `audit_logs` with:
- Who did it (`user_id`)
- What changed (`before` / `after` JSON snapshots)
- When (`created_at`)
- From where (`ip_address`)
- What entity (`entity_type`, `entity_id`)

The audit service is called from controllers after each mutation. Audit logs are read-only (no update/delete API) and scoped to the organisation like everything else.

---

## Documented choices


**Backend — **

- **Kysely instead of Lucid ORM** — Adonis ships with Lucid, but we went with Kysely. We wanted a type-safe query builder that uses the same TypeScript types as the frontend (from `shared`). With Kysely, the schema lives in `shared` and we get autocomplete and compile-time errors without the abstraction layer of an ORM. Migrations stay plain SQL, so we keep full control and no magic. Lucid is great for classic ActiveRecord-style usage; for this project we preferred explicit queries and a single source of truth for types.

- **Vine for validation** — Comes with Adonis; we use it so every request body is validated and typed in one place before it hits the controller. Keeps validation out of business logic.
- **BullMQ + Redis** — We needed a job queue for async AI. Redis was already there; BullMQ gives retries, backoff, and a clear worker model. An in-memory queue wouldn't survive restarts or scale across processes.

**Frontend**

- **Zustand** — Client state (auth only). We wanted something minimal: no Redux boilerplate, persistence built in, and a single small store. Auth is one slice; Zustand fits that. Context would work but would push us toward many contexts or more re-renders; one store is simpler.

- **React Query** — Server state and API caching. We didn't put API data in Zustand or Redux. React Query handles cache keys, refetch, loading and error states, and retries. That keeps client state (auth) and server state (what the API returns) clearly separate.

- **React Hook Form + Zod** — Forms stay light on re-renders; Zod gives us shared validation and types and can mirror backend rules where it matters.
- **Tailwind** — Utility-first CSS so we don't maintain a separate styling layer; tokens stay consistent.
- **React Router** — Declarative routes and a single place to guard protected routes (redirect to login when not authenticated).

**Shared**

- **Single `shared` package** — All enums, RBAC constants, and domain types (including DB schema for Kysely) live here. Backend and frontend both depend on it. So when we change a type or a permission, both sides see it and the compiler catches mismatches. We didn't want two copies of the same business rules.

**With more time we would**

- Add a refresh token (httpOnly cookie).
- Introduce rate limiting on login and possibly on AI endpoints.
- Add security headers via middleware or reverse proxy.
- Consider a dedicated analytics or reporting schema if we need heavy "who did what to which supplier" reporting, instead of querying raw audit_logs every time.
- Add E2E tests (Playwright for example) against the real UI and API.
