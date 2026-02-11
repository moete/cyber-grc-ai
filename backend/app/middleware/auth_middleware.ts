import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import jwt from 'jsonwebtoken'
import env from '#start/env'
import db from '#services/db'
import type { IJwtPayload } from '@shared'
import { HttpStatusCode, type Roles } from '@shared'

/**
 * Auth state attached to HttpContext after successful JWT verification.
 */
export interface AuthState {
  userId: string
  email: string
  role: Roles
  organizationId: string
}

/**
 * JWT authentication middleware.
 *
 * Flow (inspired by passport-jwt pattern):
 *   1. Extract Bearer token from Authorization header
 *   2. Verify token signature + expiration via jsonwebtoken
 *   3. Load user from DB to ensure they still exist and are active
 *      (equivalent to the tokenValidator check in Express/passport)
 *   4. Attach typed AuthState to ctx.auth
 *
 * If any step fails → 401 Unauthorized.
 */
export default class AuthMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const authHeader = ctx.request.header('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      ctx.response.status(HttpStatusCode.UNAUTHORIZED).send({
        success: false,
        message: 'Missing or invalid authorization header',
        statusCode: HttpStatusCode.UNAUTHORIZED,
      })
      return
    }

    const token = authHeader.substring(7)
    let payload: IJwtPayload

    try {
      payload = jwt.verify(token, env.get('JWT_SECRET')) as IJwtPayload
    } catch {
      ctx.response.status(HttpStatusCode.UNAUTHORIZED).send({
        success: false,
        message: 'Invalid or expired token',
        statusCode: HttpStatusCode.UNAUTHORIZED,
      })
      return
    }

    // Verify user still exists and is active in the DB
    // This catches deactivated users or deleted accounts even if the JWT is valid
    const user = await db
      .selectFrom('users')
      .where('id', '=', payload.userId)
      .where('is_active', '=', true)
      .select(['id', 'email', 'role', 'organization_id'])
      .executeTakeFirst()

    if (!user) {
      ctx.response.status(HttpStatusCode.UNAUTHORIZED).send({
        success: false,
        message: 'User not found or deactivated',
        statusCode: HttpStatusCode.UNAUTHORIZED,
      })
      return
    }

    // Attach auth state to context — available to all downstream middleware and controllers
    ctx.auth = {
      userId: user.id,
      email: user.email,
      role: user.role as Roles,
      organizationId: user.organization_id,
    }

    return next()
  }
}

/**
 * Augment AdonisJS HttpContext with our custom auth state.
 * This replaces the @adonisjs/auth augmentation we removed.
 */
declare module '@adonisjs/core/http' {
  interface HttpContext {
    auth: AuthState
  }
}
