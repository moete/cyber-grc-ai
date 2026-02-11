/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| Route definitions for the Cyber Risk Intelligence Platform API.
|
| Middleware chain on protected routes:
|   auth     → verify JWT, load user, attach ctx.auth
|   orgScope → set PG session var for RLS defense-in-depth
|   rbac     → check hasPermission(role, permission) per route
|
*/

import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'
import { Permission } from '@shared'

// Lazy-load controllers (AdonisJS v6 pattern — tree-shakeable)
const AuthController = () => import('#controllers/auth_controller')
const SuppliersController = () => import('#controllers/suppliers_controller')
const AuditLogsController = () => import('#controllers/audit_logs_controller')

// ── Health check ──────────────────────────────────────────────
router.get('/', async () => ({
  status: 'ok',
  name: 'Cyber Risk Intelligence Platform',
  version: '0.0.1',
}))

// ── Public routes ─────────────────────────────────────────────
router
  .group(() => {
    router.post('/login', [AuthController, 'login'])
  })
  .prefix('/api/auth')

// ── Protected routes ──────────────────────────────────────────
router
  .group(() => {
    // Auth profile
    router.get('/auth/me', [AuthController, 'me'])
    router.post('/auth/logout', [AuthController, 'logout'])

    // ── Suppliers CRUD ──────────────────────────────────────
    router
      .get('/suppliers', [SuppliersController, 'index'])
      .use(middleware.rbac({ permission: Permission.SUPPLIER_READ }))

    router
      .post('/suppliers', [SuppliersController, 'store'])
      .use(middleware.rbac({ permission: Permission.SUPPLIER_CREATE }))

    router
      .get('/suppliers/:id', [SuppliersController, 'show'])
      .use(middleware.rbac({ permission: Permission.SUPPLIER_READ }))

    router
      .put('/suppliers/:id', [SuppliersController, 'update'])
      .use(middleware.rbac({ permission: Permission.SUPPLIER_UPDATE }))

    router
      .delete('/suppliers/:id', [SuppliersController, 'destroy'])
      .use(middleware.rbac({ permission: Permission.SUPPLIER_DELETE }))

    // ── Audit Logs (read-only) ──────────────────────────────
    router
      .get('/audit-logs', [AuditLogsController, 'index'])
      .use(middleware.rbac({ permission: Permission.AUDIT_READ }))

    router
      .get('/audit-logs/:id', [AuditLogsController, 'show'])
      .use(middleware.rbac({ permission: Permission.AUDIT_READ }))
  })
  .prefix('/api')
  .use([middleware.auth(), middleware.orgScope()])
