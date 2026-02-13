# Security — Cyber GRC Platform

This document describes what we do for security today and what we plan to add .

---

## Authentication and sessions

We use **JWT** for authentication. Login is done via `POST /api/auth/login`; the server returns a signed token (HS256). The frontend keeps it in memory and in `localStorage`, and sends it in the `Authorization: Bearer` header on each request. Token lifetime is configurable with `JWT_EXPIRES_IN` (default 2 hours). Logout is stateless: the client simply drops the token.

**Planned:** A refresh token in an `httpOnly`, `secure`, `sameSite=lax` cookie, with a `POST /api/auth/refresh` endpoint to get a new access token. That would reduce how long the main JWT is exposed.

---

## RBAC and multi-tenancy

Access is **role-based** and **per organisation**. Each user belongs to one organisation and has one role. Permissions are defined in `shared/src/constants/permissions.ts`.

- **Owner** — Full access: CRUD suppliers, user management, delete organisation, risk policies, audit trail.
- **Admin** — CRUD suppliers, configure risk policies, read audit trail.
- **Analyst** — Read suppliers, update risk level, add notes.
- **Auditor** — Read-only on everything, full access to audit trail.

In the backend, `auth_middleware.ts` checks the JWT and loads the user; `rbac_middleware.ts` checks that the user’s role has the permission required by the route. For resource-level checks we use `requireAccess` / `hasAccess` in `helpers/access.ts`: they verify both the permission and that the resource belongs to the user’s organisation.

---

## Tenant isolation (Row-Level Security)

We isolate data in two ways.

**1. Application layer (main guarantee)**  
All DB access goes through helpers in `scoped_query.ts` that add `WHERE organization_id = :orgId`. Controllers call `requireAccess(auth, resourceOrgId, permission)` before acting on a resource. So even in dev with a Postgres superuser, tenants are separated by application logic.

**2. PostgreSQL RLS (extra safety net)**  
Migration `005_enable_rls.ts` turns on Row-Level Security for `suppliers`, `audit_logs`, and `users`. The policy ties rows to `current_setting('app.current_org_id')`. The `org_scope_middleware.ts` sets that value at the start of each request. In production, with a non-superuser DB role, RLS blocks any row that doesn’t match the current org, even if the app had a bug. In dev, the superuser bypasses RLS, so isolation there relies only on the application layer.

---

## CSRF and XSS

**CSRF** — The JWT is sent in a header, not in a cookie, so classic cross-site form attacks don’t send it. If we add a refresh token in a cookie later, we’ll use `sameSite: 'lax'` (or `'strict'`) so cross-site requests don’t send the cookie.

**XSS** — React escapes output by default; we don’t use `dangerouslySetInnerHTML`. All user input is validated on the backend with AdonisJS (Vine) validators. Supplier notes are plain text for now; if we add Markdown later, we’ll sanitise (e.g. DOMPurify or rehype-sanitize) before rendering.

---

## Rate limiting and security headers

**Rate limiting** — Not implemented yet. We plan to limit login (e.g. 5 attempts per minute per IP), optional limits on AI endpoints, and a general cap per user. We’ll use something like `@adonisjs/limiter` with Redis (or in-memory in dev).

**Security headers** — Not set in code yet. We intend to add (or configure on the reverse proxy) headers such as `Content-Security-Policy`, `Strict-Transport-Security`, `X-Frame-Options`, `X-Content-Type-Options`, and `Referrer-Policy`. See common recommendations for exact values.

---

## Secrets

Secrets live in environment variables (e.g. `JWT_SECRET`, `DB_PASSWORD`, `APP_KEY`). The `.env` file is in `.gitignore` and is never committed. At startup, `backend/start/env.ts` validates required vars with `Env.create()`; if something is missing or invalid, the app won’t start. There are no hardcoded secrets in the repo. In production, use your platform’s secret mechanism (Docker secrets, Vault, CI/CD variables), not files baked into images.

---

## Dependency audit

We run `pnpm audit --audit-level=high --prod` in CI and it must pass. The `--prod` flag means we only check production dependencies; dev-only tools (e.g. test runners) are not part of that gate. You can run `pnpm audit` locally anytime. We aim to fix high/critical issues quickly and to prioritise updates for auth and core framework deps. Enabling Dependabot or Renovate for automated update alerts is on the roadmap.

---

## Risk policies (current state)

The RBAC permission `RISK_POLICY_CONFIGURE` exists (Owner and Admin have it), but there is no API yet to configure risk policies (no `/api/risk-policies`). That feature is planned for a later iteration; the permission is already in place so we won’t need to change the auth model when we add it.
