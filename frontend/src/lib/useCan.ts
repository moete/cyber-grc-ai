import { useAuthStore, type AuthState } from '@/stores/auth'
import { hasPermission } from '@shared'
import type { Permission } from '@shared'

/**
 * Hook: returns whether the current user has the given permission.
 * Useful for conditional rendering or disabling buttons.
 */
export function useCan(permission: Permission): boolean {
  const user = useAuthStore((s: AuthState) => s.user)
  const role = user?.role
  return Boolean(role && hasPermission(role, permission))
}
