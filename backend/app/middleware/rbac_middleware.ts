import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { hasPermission, HttpStatusCode, type IApiErrorResponse, type Permission } from '@shared'

type RbacOptions =
  | { permission: Permission }
  | { anyOf: Permission[] }

/**
 * RBAC middleware — checks that the authenticated user's role
 * has the required permission (or any of the given permissions).
 *
 * Uses the static ROLE_PERMISSIONS map from shared/constants/permissions.ts.
 *
 * Usage in routes:
 *   middleware.rbac({ permission: Permission.SUPPLIER_READ })
 *   middleware.rbac({ anyOf: [Permission.SUPPLIER_UPDATE, Permission.RISK_LEVEL_UPDATE, Permission.NOTES_ADD] })
 */
export default class RbacMiddleware {
  async handle(
    ctx: HttpContext,
    next: NextFn,
    options: RbacOptions
  ) {
    if (!ctx.auth) {
      ctx.response.status(HttpStatusCode.UNAUTHORIZED).send(<IApiErrorResponse>{
        success: false,
        message: 'Authentication required',
        statusCode: HttpStatusCode.UNAUTHORIZED,
      })  
      return
    }

    const allowed =
      'permission' in options
        ? hasPermission(ctx.auth.role, options.permission)
        : options.anyOf.some((p) => hasPermission(ctx.auth!.role, p))

    if (!allowed) {
      const msg =
        'permission' in options
          ? `Forbidden: '${options.permission}' permission required`
          : `Forbidden: one of [${options.anyOf.join(', ')}] required`
      ctx.response.status(HttpStatusCode.FORBIDDEN).send(<IApiErrorResponse>{
        success: false,
        message: msg,
        statusCode: HttpStatusCode.FORBIDDEN,
        })
      return
    }

    return next()
  }
}
