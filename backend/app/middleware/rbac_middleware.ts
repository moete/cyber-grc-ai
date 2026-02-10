import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { hasPermission, type Permission } from 'shared'

/**
 * RBAC middleware — checks that the authenticated user's role
 * has the required permission.
 *
 * Uses the static ROLE_PERMISSIONS map from shared/constants/permissions.ts.
 * No DB query needed: the map is a closed set of 4 roles with fixed permissions.
 *
 * Usage in routes:
 *   middleware.rbac({ permission: Permission.SUPPLIER_READ })
 */
export default class RbacMiddleware {
  async handle(
    ctx: HttpContext,
    next: NextFn,
    options: { permission: Permission }
  ) {
    if (!ctx.auth) {
      ctx.response.status(401).send({
        success: false,
        message: 'Authentication required',
        statusCode: 401,
      })
      return
    }

    if (!hasPermission(ctx.auth.role, options.permission)) {
      ctx.response.status(403).send({
        success: false,
        message: `Forbidden: '${options.permission}' permission required`,
        statusCode: 403,
      })
      return
    }

    return next()
  }
}
