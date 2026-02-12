import { Permission, Roles } from '../enums';

/**
 * Role hierarchy:
 *   Owner   → Everything except audit trail (user management, org deletion, supplier CRUD)
 *   Admin   → CRUD suppliers, configure risk policies, read audit log
 *   Analyst → Read suppliers, update risk level, add notes
 *   Auditor → Read-only on everything, full access to audit trail
 *
 * Audit trail is accessible only to Admin and Auditor (spec: "Accessible uniquement aux rôles Admin et Auditor").
 */
export const ROLE_PERMISSIONS: Record<Roles, Permission[]> = {
  [Roles.OWNER]: [
    Permission.ORG_DELETE,
    Permission.USER_MANAGE,
    // Supplier CRUD
    Permission.SUPPLIER_CREATE,
    Permission.SUPPLIER_READ,
    Permission.SUPPLIER_UPDATE,
    Permission.SUPPLIER_DELETE,
    // Risk
    Permission.RISK_LEVEL_UPDATE,
    Permission.RISK_POLICY_CONFIGURE,
    // Notes
    Permission.NOTES_ADD,
    // Audit (Owner has "Tout" per spec but in audit trail accesible uniquement aux roles admin et auditor ? )
   // Permission.AUDIT_READ,
  ],

  [Roles.ADMIN]: [
    // Supplier CRUD
    Permission.SUPPLIER_CREATE,
    Permission.SUPPLIER_READ,
    Permission.SUPPLIER_UPDATE,
    Permission.SUPPLIER_DELETE,
    // Risk policies
    Permission.RISK_POLICY_CONFIGURE,
    // Audit
    Permission.AUDIT_READ,
  ],

  [Roles.ANALYST]: [
    Permission.SUPPLIER_READ,
    Permission.RISK_LEVEL_UPDATE,
    Permission.NOTES_ADD,
  ],

  [Roles.AUDITOR]: [
    Permission.SUPPLIER_READ,
    Permission.AUDIT_READ,
  ],
};

/** Normalize role string from API/store to Roles enum (case-insensitive for known values). */
function normalizeRole(role: string | Roles | undefined): Roles | undefined {
  if (!role || typeof role !== 'string') return undefined
  const lower = role.trim().toLowerCase()
  const map: Record<string, Roles> = {
    owner: Roles.OWNER,
    admin: Roles.ADMIN,
    analyst: Roles.ANALYST,
    auditor: Roles.AUDITOR,
  }
  return map[lower]
}

/**
 * Check if a given role has a specific permission.
 * Accepts role as string (e.g. from API) and normalizes to Roles so lookup always works.
 */
export function hasPermission(role: Roles | string | undefined, permission: Permission): boolean {
  const normalized = typeof role === 'string' ? normalizeRole(role) : role
  return ROLE_PERMISSIONS[normalized as Roles]?.includes(permission) ?? false
}

/**
 * Check if a user can access a resource within a specific organisation.
 * Ensures both permission check AND tenant isolation.
 */
export function canAccessResource(
  userRole: Roles | string,
  userOrganizationId: string,
  resourceOrganizationId: string,
  requiredPermission: Permission,
): boolean {
  // Tenant isolation: user must belong to the same organisation
  if (userOrganizationId !== resourceOrganizationId) {
    return false;
  }
  return hasPermission(userRole, requiredPermission);
}
