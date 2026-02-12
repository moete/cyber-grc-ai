import type { HttpContext } from '@adonisjs/core/http'
import jwt, { type SignOptions } from 'jsonwebtoken'
import env from '#start/env'
import { verifyPassword } from '@shared/functions/hash'
import { type IJwtPayload, type Roles } from '@shared'
import { loginValidator } from '#validators/auth_validator'
import { findActiveUserByEmail, findUserById, toUserResponse } from '#services/auth_service'
import { ok } from '#helpers/responses'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import NotFoundException from '#exceptions/not_found_exception'

export default class AuthController {
  /**
   * POST /api/auth/login
   */
  async login({ request, response }: HttpContext) {
    const { email, password } = await request.validateUsing(loginValidator)

    const user = await findActiveUserByEmail(email)
    if (!user || !verifyPassword(password, user.password_hash)) {
      throw new UnauthorizedException('Invalid email or password')
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

    return ok(response, {
      token,
      user: toUserResponse(user),
    })
  }

  /**
   * GET /api/auth/me
   */
  async me({ auth, response }: HttpContext) {
    const user = await findUserById(auth.userId)
    if (!user) throw new NotFoundException('User not found')

    return ok(response, toUserResponse(user))
  }

  /**
   * POST /api/auth/logout
   */
  async logout({ response }: HttpContext) {
    return ok(response, null, 'Logged out successfully (discard the token client-side)')
  }
}
