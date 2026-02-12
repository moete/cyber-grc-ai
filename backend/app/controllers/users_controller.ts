import type { HttpContext } from '@adonisjs/core/http'
import { createUserValidator, updateUserValidator } from '#validators/user_validator'
import { ok, created, deleted } from '#helpers/responses'
import { requireAccess } from '#helpers/access'
import { Permission } from '@shared'
import {
  listByOrganization,
  findByIdInOrg,
  createUser,
  updateUser,
  deleteUser,
  isEmailTakenInOrg,
} from '#services/user_service'

export default class UsersController {
  /**
   * GET /api/users — list users in the current organisation (Owner only).
   */
  async index({ auth, response }: HttpContext) {
    requireAccess(auth, auth.organizationId, Permission.USER_MANAGE, 'You do not have permission to manage users')
    const users = await listByOrganization(auth.organizationId)
    return ok(response, users)
  }

  /**
   * GET /api/users/:id
   */
  async show({ auth, params, response }: HttpContext) {
    requireAccess(auth, auth.organizationId, Permission.USER_MANAGE, 'You do not have permission to manage users')
    const user = await findByIdInOrg(auth.organizationId, params.id)
    const { toUserResponse } = await import('#services/auth_service')
    return ok(response, toUserResponse(user))
  }

  /**
   * POST /api/users — create user in the current organisation (Owner only).
   */
  async store({ auth, request, response }: HttpContext) {
    requireAccess(auth, auth.organizationId, Permission.USER_MANAGE, 'You do not have permission to manage users')
    const data = await request.validateUsing(createUserValidator)

    if (await isEmailTakenInOrg(auth.organizationId, data.email)) {
      return response.badRequest({
        success: false,
        message: 'A user with this email already exists in your organisation',
      })
    }

    const user = await createUser({
      organizationId: auth.organizationId,
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      password: data.password,
      role: data.role as 'Owner' | 'Admin' | 'Analyst' | 'Auditor',
    })
    return created(response, user)
  }

  /**
   * PATCH or PUT /api/users/:id — update user (Owner only).
   */
  async update({ auth, params, request, response }: HttpContext) {
    requireAccess(auth, auth.organizationId, Permission.USER_MANAGE, 'You do not have permission to manage users')
    const data = await request.validateUsing(updateUserValidator)

    if (data.email !== undefined) {
      if (await isEmailTakenInOrg(auth.organizationId, data.email, params.id)) {
        return response.badRequest({
          success: false,
          message: 'A user with this email already exists in your organisation',
        })
      }
    }

    const updated = await updateUser(auth.organizationId, params.id, {
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      role: data.role as 'Owner' | 'Admin' | 'Analyst' | 'Auditor' | undefined,
      isActive: data.isActive,
      password: data.password,
    })
    return ok(response, updated)
  }

  /**
   * DELETE /api/users/:id — remove user from organisation (Owner only).
   * Cannot delete self or the last Owner.
   */
  async destroy({ auth, params, response }: HttpContext) {
    requireAccess(auth, auth.organizationId, Permission.USER_MANAGE, 'You do not have permission to manage users')
    try {
      await deleteUser(auth.organizationId, params.id, auth.userId)
      return deleted(response, 'User removed from organisation')
    } catch (e: any) {
      if (e?.message === 'You cannot delete your own account' || e?.message?.includes('last Owner')) {
        return response.badRequest({ success: false, message: e.message })
      }
      throw e
    }
  }
}
