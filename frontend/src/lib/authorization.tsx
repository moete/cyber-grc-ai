import type { ReactNode } from 'react'
import { useAuthStore } from '@/stores/auth'
import { hasPermission } from '@shared'
import type { Roles } from '@shared'
import { Permission } from '@shared'

/**
 * RBAC: show content only when the current user has one of the allowed roles.
 * Use for role-based restrictions (e.g. only Owner and Admin can delete).
 */
interface RBACProps {
  allowedRoles: Roles[]
  children: ReactNode
}

export function RBAC({ allowedRoles, children }: RBACProps) {
  const user = useAuthStore((s) => s.user)
  const role = user?.role
  if (!role || !allowedRoles.includes(role)) return null
  return <>{children}</>
}

/**
 * PBAC-style: show content only when the current user has the required permission.
 * Uses shared ROLE_PERMISSIONS (same source of truth as backend).
 * Use when you want to guard by permission instead of listing roles.
 */
interface RequirePermissionProps {
  permission: Permission
  children: ReactNode
}

export function RequirePermission({ permission, children }: RequirePermissionProps) {
  const user = useAuthStore((s) => s.user)
  const role = user?.role
  if (!role || !hasPermission(role, permission)) return null
  return <>{children}</>
}

/**
 * Hook: returns whether the current user has the given permission.
 * Useful for conditional rendering or disabling buttons.
 */
export function useCan(permission: Permission): boolean {
  const user = useAuthStore((s) => s.user)
  const role = user?.role
  return Boolean(role && hasPermission(role, permission))
}
