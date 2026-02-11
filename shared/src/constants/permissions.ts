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
    // Audit: intentionally not included — only Admin and Auditor can read audit
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

/**
 * Check if a given role has a specific permission.
 */
export function hasPermission(role: Roles, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/**
 * Check if a user can access a resource within a specific organisation.
 * Ensures both permission check AND tenant isolation.
 */
export function canAccessResource(
  userRole: Roles,
  userOrganizationId: string,
  resourceOrganizationId: string,
  requiredPermission: Permission,
): boolean {
  // Tenant isolation: user must belong to the same organisation
  if (userOrganizationId !== resourceOrganizationId) {
    return false;
  }
  // Permission check
  return hasPermission(userRole, requiredPermission);
}
