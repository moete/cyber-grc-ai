export enum Permission {
  // Organisation management
  ORG_DELETE = 'org:delete',

  // User management
  USER_MANAGE = 'user:manage',

  // Supplier CRUD
  SUPPLIER_CREATE = 'supplier:create',
  SUPPLIER_READ = 'supplier:read',
  SUPPLIER_UPDATE = 'supplier:update',
  SUPPLIER_DELETE = 'supplier:delete',

  // Risk management
  RISK_LEVEL_UPDATE = 'risk_level:update',
  RISK_POLICY_CONFIGURE = 'risk_policy:configure',

  // Notes
  NOTES_ADD = 'notes:add',

  // Audit trail
  AUDIT_READ = 'audit:read',
}
