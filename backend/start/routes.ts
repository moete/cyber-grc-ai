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
const UsersController = () => import('#controllers/users_controller')
const OrganisationsController = () => import('#controllers/organisations_controller')

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
      .use(middleware.rbac({
        anyOf: [
          Permission.SUPPLIER_UPDATE,
          Permission.RISK_LEVEL_UPDATE,
          Permission.NOTES_ADD,
        ],
      }))

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

    router
      .get('/users', [UsersController, 'index'])
      .use(middleware.rbac({ permission: Permission.USER_MANAGE }))

    router
      .get('/users/:id', [UsersController, 'show'])
      .use(middleware.rbac({ permission: Permission.USER_MANAGE }))

    router
      .post('/users', [UsersController, 'store'])
      .use(middleware.rbac({ permission: Permission.USER_MANAGE }))

    router
      .patch('/users/:id', [UsersController, 'update'])
      .use(middleware.rbac({ permission: Permission.USER_MANAGE }))

    router
      .put('/users/:id', [UsersController, 'update'])
      .use(middleware.rbac({ permission: Permission.USER_MANAGE }))

    router
      .delete('/users/:id', [UsersController, 'destroy'])
      .use(middleware.rbac({ permission: Permission.USER_MANAGE }))

    // ── Organisation (Owner only: delete current org) ─────────────────────
    router
      .delete('/organisations/current', [OrganisationsController, 'destroyCurrent'])
      .use(middleware.rbac({ permission: Permission.ORG_DELETE }))
  })
  .prefix('/api')
  .use([middleware.auth(), middleware.orgScope()])
