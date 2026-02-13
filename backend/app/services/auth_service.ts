import db from '#services/db';
import type { UserWithOrgRow } from '#types/user';

/** Shared user columns used by both login() and me(). */
const USER_COLUMNS = [
  'users.id',
  'users.email',
  'users.first_name',
  'users.last_name',
  'users.password_hash',
  'users.role',
  'users.is_active',
  'users.organization_id',
  'users.created_at',
  'organisations.name as organization_name'
] as const;

/**
 * Find an active user by email (for login).
 */
export async function findActiveUserByEmail(email: string): Promise<UserWithOrgRow | undefined> {
  return db
    .selectFrom('users')
    .innerJoin('organisations', 'organisations.id', 'users.organization_id')
    .where('users.email', '=', email)
    .where('users.is_active', '=', true)
    .select([...USER_COLUMNS])
    .executeTakeFirst() as Promise<UserWithOrgRow | undefined>;
}

/**
 * Find user by id (for /me endpoint).
 */
export async function findUserById(userId: string): Promise<UserWithOrgRow | undefined> {
  return db
    .selectFrom('users')
    .innerJoin('organisations', 'organisations.id', 'users.organization_id')
    .where('users.id', '=', userId)
    .select([...USER_COLUMNS])
    .executeTakeFirst() as Promise<UserWithOrgRow | undefined>;
}

/**
 * List users in an organisation (for Owner user management).
 */
export async function listUsersByOrganization(organizationId: string): Promise<UserWithOrgRow[]> {
  return db
    .selectFrom('users')
    .innerJoin('organisations', 'organisations.id', 'users.organization_id')
    .where('users.organization_id', '=', organizationId)
    .select([...USER_COLUMNS])
    .orderBy('users.created_at', 'asc')
    .execute() as Promise<UserWithOrgRow[]>;
}

/**
 * Map a DB row to the camelCase user profile returned by the API.
 */
export function toUserResponse(user: UserWithOrgRow) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.first_name,
    lastName: user.last_name,
    role: user.role,
    isActive: user.is_active,
    organizationId: user.organization_id,
    organizationName: user.organization_name,
    createdAt: user.created_at
  };
}
