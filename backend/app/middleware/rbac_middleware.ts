import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { hasPermission, HttpStatusCode, type Permission } from '@shared'

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
      ctx.response.status(HttpStatusCode.UNAUTHORIZED).send({
        success: false,
        message: 'Authentication required',
        statusCode: HttpStatusCode.UNAUTHORIZED,
      })
      return
    }

    if (!hasPermission(ctx.auth.role, options.permission)) {
      ctx.response.status(HttpStatusCode.FORBIDDEN).send({
        success: false,
        message: `Forbidden: '${options.permission}' permission required`,
        statusCode: HttpStatusCode.FORBIDDEN,
      })
      return
    }

    return next()
  }
}
