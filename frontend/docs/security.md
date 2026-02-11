# 🔐 Frontend Security

This document explains how the React frontend consumes the secure backend (AdonisJS + Kysely + PostgreSQL RLS) and how the browser side aligns with the security guidelines in `.cursorrules`.

---

## 1. Authentication (JWT in HttpOnly cookies)

- **Protocol**: the frontend authenticates against `POST /api/auth/login` and receives a **JWT** and a `user` object.
- **Token transport**:
  - The backend sets the JWT in an `HttpOnly`, `Secure`, `SameSite=Strict` cookie.
  - The frontend **never reads or stores the token directly**; the browser sends cookies automatically on same‑origin requests.
- **Usage**:
  - All authenticated API calls are “normal” HTTP requests; the cookie carries the JWT.
  - On `401 Unauthorized`, the app clears its in‑memory user state and redirects to the login route.
- **Logout**:
  - The frontend calls `POST /api/auth/logout`, and the backend clears the auth cookie(s).

---

## 2. Authorization (RBAC + permissions)

The **source of truth** for roles and permissions is the `shared` package (`ROLE_PERMISSIONS`, `hasPermission`, `canAccessResource`).

- The JWT payload contains `role` and `organizationId`.
- The frontend stores the current user in a global auth context and:
  - Uses the `role` to hide or disable UI actions the user cannot perform.
  - Uses `organizationId` only for display (backend enforces tenant isolation).
- All hard authorization (RBAC + tenant checks) still runs in backend middleware; the UI only **reflects** it to avoid presenting impossible actions.

---

## 3. Multi‑tenant awareness in the UI

Multi‑tenant isolation is enforced by:

- Application‑level scoping (`organization_id` filters) and `canAccessResource` in controllers.
- PostgreSQL Row‑Level Security, using `app.current_org_id`.

The frontend respects this by:

- Never trying to “switch org” on the client side.
- Treating 404s such as “Supplier not found in your organization” as a generic *not accessible* state without trying to infer cross‑tenant details.

---

## 4. XSS and untrusted content

From `.cursorrules`:

- Treat all user‑generated content as untrusted.
- Prefer plain text rendering; avoid `dangerouslySetInnerHTML`.
- If we later render rich text (e.g. Markdown notes on suppliers), we will:
  - Sanitize HTML on the client with a library like `DOMPurify` before injecting into the DOM.
  - Keep React components purely declarative, avoiding direct DOM manipulation.

Currently the UI uses only plain text data from the API and React’s default escaping, which keeps XSS surface small.

---

## 5. CSRF & security headers

Because authentication relies on **cookies**, CSRF must be considered:

- Auth cookies are set with `SameSite=Strict` (or `Lax`) to limit cross‑site requests.
- For any future cross‑origin embedding or complex flows, the backend can require an explicit CSRF token header; the frontend will include it when provided.

We also rely on the backend (see `SECURITY.md`) and reverse proxy to configure:

- **CSP**: strict Content‑Security‑Policy without inline scripts.
- **HSTS**: HTTP Strict‑Transport‑Security to force HTTPS.
- **X‑Frame‑Options** / `frame-ancestors`: prevent clickjacking.

---

## 6. Error handling on the client

- API errors are displayed as user‑friendly messages; we never show raw stack traces or internal error structures.
- We respect the backend’s structured error format:
  - `statusCode` (e.g. 401, 403, 404, 422).
  - `message` (human readable).
- Global handling:
  - `401` → clear auth state and redirect to login.
  - `403` → show “You don’t have permission to perform this action.”
  - `404` → show resource‑not‑found UI.

---

## 7. Styling and Tailwind

The frontend uses **Tailwind CSS** (`tailwind.config.js`, `postcss.config.js`, `src/index.css`) as the base styling system:

- Encourages small, composable components with utility classes.
- Avoids inline styles and script‑generated CSS that might mix behavior and presentation.
- Keeps the design consistent and easier to audit visually.

All components should:

- Use semantic HTML (`button`, `a`, `form`, etc.).
- Have accessible focus states.
- Avoid direct DOM writes (`innerHTML`) and unsafe patterns that could open XSS vectors.

