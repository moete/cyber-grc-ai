/**
 * Authorization guard — throws ForbiddenException when access is denied.
 * Eliminates the if(!access) return response.status(403)... pattern.
 */

import type { HttpContext } from '@adonisjs/core/http';
import { canAccessResource, type Permission } from '@shared';
import ForbiddenException from '#exceptions/forbidden_exception';

/**
 * Returns true/false (useful when you need to branch, not throw).
 */
export function hasAccess(auth: HttpContext['auth'], resourceOrgId: string, permission: Permission): boolean {
  return canAccessResource(auth.role, auth.organizationId, resourceOrgId, permission);
}

/**
 * Throws ForbiddenException when the user lacks the given permission.
 * Use in place of the old assertAccess + if-check pattern.
 */
export function requireAccess(
  auth: HttpContext['auth'],
  resourceOrgId: string,
  permission: Permission,
  message = 'Forbidden: insufficient permissions'
): void {
  if (!canAccessResource(auth.role, auth.organizationId, resourceOrgId, permission)) {
    throw new ForbiddenException(message);
  }
}
