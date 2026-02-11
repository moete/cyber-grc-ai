import type { HttpContext } from '@adonisjs/core/http'
import jwt, { type SignOptions } from 'jsonwebtoken'
import env from '#start/env'
import db from '#services/db'
import { verifyPassword, HttpStatusCode, type IJwtPayload, type Roles } from '@shared'
import { loginValidator } from '#validators/auth_validator'

export default class AuthController {
  /**
   * POST /api/auth/login
   *
   * Authenticates a user with email + password.
   * Returns a JWT containing userId, email, role, organizationId.
   */
  async login({ request, response }: HttpContext) {
    const { email, password } = await request.validateUsing(loginValidator)

    // Join with organisations to include org name in the response
    const user = await db
      .selectFrom('users')
      .innerJoin('organisations', 'organisations.id', 'users.organization_id')
      .where('users.email', '=', email)
      .where('users.is_active', '=', true)
      .select([
        'users.id',
        'users.email',
        'users.first_name',
        'users.last_name',
        'users.password_hash',
        'users.role',
        'users.organization_id',
        'organisations.name as organization_name',
      ])
      .executeTakeFirst()

    if (!user || !verifyPassword(password, user.password_hash)) {
      ctx_unauthorized(response, 'Invalid email or password')
      return
    }

    const payload: IJwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.role as Roles,
      organizationId: user.organization_id,
    }

    const signOptions: SignOptions = {
      expiresIn: (env.get('JWT_EXPIRES_IN') ?? '2h') as SignOptions['expiresIn'],
    }
    const token = jwt.sign(payload, env.get('JWT_SECRET') as jwt.Secret, signOptions)

    return response.status(HttpStatusCode.OK).send({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
          organizationId: user.organization_id,
          organizationName: user.organization_name,
        },
      },
    })
  }

  /**
   * GET /api/auth/me
   *
   * Returns the profile of the currently authenticated user.
   * Requires the auth middleware to have run first.
   */
  async me({ auth, response }: HttpContext) {
    const user = await db
      .selectFrom('users')
      .innerJoin('organisations', 'organisations.id', 'users.organization_id')
      .where('users.id', '=', auth.userId)
      .select([
        'users.id',
        'users.email',
        'users.first_name',
        'users.last_name',
        'users.role',
        'users.is_active',
        'users.organization_id',
        'users.created_at',
        'organisations.name as organization_name',
      ])
      .executeTakeFirst()

    if (!user) {
      return response.status(HttpStatusCode.NOT_FOUND).send({
        success: false,
        message: 'User not found',
        statusCode: HttpStatusCode.NOT_FOUND,
      })
    }

    return response.status(HttpStatusCode.OK).send({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        isActive: user.is_active,
        organizationId: user.organization_id,
        organizationName: user.organization_name,
        createdAt: user.created_at,
      },
    })
  }

  /**
   * POST /api/auth/logout
   *
   * Stateless JWT — logout is handled client-side by discarding the token.
   * This endpoint exists for API completeness and audit logging.
   */
  async logout({ response }: HttpContext) {
    return response.status(HttpStatusCode.OK).send({
      success: true,
      message: 'Logged out successfully (discard the token client-side)',
    })
  }
}

/** Helper — send a 401 with consistent format */
function ctx_unauthorized(response: any, message: string) {
  response.status(HttpStatusCode.UNAUTHORIZED).send({
    success: false,
    message,
    statusCode: HttpStatusCode.UNAUTHORIZED,
  })
}
