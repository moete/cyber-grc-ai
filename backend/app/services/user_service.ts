import db from '#services/db'
import { hashPassword } from '@shared/functions/hash'
import { scopedSelect, scopedUpdate, scopedInsert, scopedDelete } from '#services/scoped_query'
import { findUserById, toUserResponse } from '#services/auth_service'
import type { UserWithOrgRow } from '#types/user'
import NotFoundException from '#exceptions/not_found_exception'

export interface CreateUserInput {
  organizationId: string
  email: string
  firstName: string
  lastName: string
  password: string
  role: 'Owner' | 'Admin' | 'Analyst' | 'Auditor'
}

export interface UpdateUserInput {
  email?: string
  firstName?: string
  lastName?: string
  role?: 'Owner' | 'Admin' | 'Analyst' | 'Auditor'
  isActive?: boolean
  password?: string
}

/**
 * List users in an organisation (for Owner user management).
 */
export async function listByOrganization(organizationId: string) {
  const rows = await db
    .selectFrom('users')
    .innerJoin('organisations', 'organisations.id', 'users.organization_id')
    .where('users.organization_id', '=', organizationId)
    .select([
      'users.id',
      'users.email',
      'users.first_name',
      'users.last_name',
      'users.password_hash',
      'users.role',
      'users.is_active',
      'users.organization_id',
      'users.created_at',
      'organisations.name as organization_name',
    ])
    .orderBy('users.created_at', 'asc')
    .execute()
  return (rows as UserWithOrgRow[]).map(toUserResponse)
}

/**
 * Find user by id within an organisation, or throw 404.
 */
export async function findByIdInOrg(organizationId: string, userId: string) {
  if (!userId || typeof userId !== 'string' || !/^[0-9a-f-]{36}$/i.test(userId)) {
    throw new NotFoundException('User not found in your organisation')
  }
  const user = await findUserById(userId)
  if (!user || user.organization_id !== organizationId) {
    throw new NotFoundException('User not found in your organisation')
  }
  return user
}

/**
 * Create a user in the organisation.
 */
export async function createUser(input: CreateUserInput) {
  const [row] = await scopedInsert('users')
    .values({
      organization_id: input.organizationId,
      email: input.email.toLowerCase(),
      first_name: input.firstName,
      last_name: input.lastName,
      password_hash: hashPassword(input.password),
      role: input.role,
      is_active: true,
    })
    .returningAll()
    .execute()
  const withOrg = await findUserById(row.id)
  if (!withOrg) throw new NotFoundException('User not found')
  return toUserResponse(withOrg)
}

/**
 * Update a user in the organisation.
 */
export async function updateUser(
  organizationId: string,
  userId: string,
  input: UpdateUserInput
) {
  await findByIdInOrg(organizationId, userId)

  const updateValues: Record<string, unknown> = { updated_at: new Date() }
  if (input.email !== undefined) updateValues.email = input.email.toLowerCase()
  if (input.firstName !== undefined) updateValues.first_name = input.firstName
  if (input.lastName !== undefined) updateValues.last_name = input.lastName
  if (input.role !== undefined) updateValues.role = input.role
  if (input.isActive !== undefined) updateValues.is_active = input.isActive
  if (input.password !== undefined) updateValues.password_hash = hashPassword(input.password)

  await scopedUpdate('users', organizationId)
    .set(updateValues as any)
    .where('id', '=', userId)
    .execute()

  const updated = await findUserById(userId)
  if (!updated) throw new NotFoundException('User not found')
  return toUserResponse(updated)
}

/**
 * Check if an email is already used by another user in the organisation (excluding optional userId).
 */
export async function isEmailTakenInOrg(
  organizationId: string,
  email: string,
  excludeUserId?: string
): Promise<boolean> {
  let q = scopedSelect('users', organizationId)
    .where('email', '=', email.toLowerCase())
    .select('id')
  if (excludeUserId) {
    q = q.where('id', '!=', excludeUserId)
  }
  const existing = await q.executeTakeFirst()
  return Boolean(existing)
}

/**
 * Delete a user from the organisation (Owner only).
 * Fails if deleting self or if user is the last Owner in the org.
 */
export async function deleteUser(
  organizationId: string,
  userId: string,
  currentUserId: string
): Promise<void> {
  if (userId === currentUserId) {
    throw new Error('You cannot delete your own account')
  }
  const user = await findByIdInOrg(organizationId, userId)

  if (user.role === 'Owner') {
    const owners = await scopedSelect('users', organizationId)
      .where('role', '=', 'Owner')
      .select('id')
      .execute()
    if (owners.length <= 1) {
      throw new Error('Cannot delete the last Owner of the organisation')
    }
  }

  await scopedDelete('users', organizationId).where('id', '=', userId).execute()
}
