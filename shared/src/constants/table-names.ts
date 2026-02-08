/**
 * Table name constants to avoid magic strings across the codebase.
 * Keys match the Database interface property names.
 */
export const TABLE_NAMES = {
  ORGANISATIONS: 'organisations',
  USERS: 'users',
  SUPPLIERS: 'suppliers',
  AUDIT_LOGS: 'audit_logs',
} as const;

export type TableName = (typeof TABLE_NAMES)[keyof typeof TABLE_NAMES];
