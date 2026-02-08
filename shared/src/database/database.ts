import type { OrganisationTable } from './tables/organisation.table';
import type { UserTable } from './tables/user.table';
import type { SupplierTable } from './tables/supplier.table';
import type { AuditLogTable } from './tables/audit-log.table';

/**
 * Main Kysely Database interface.
 * Each key is a table name, each value is the row type for that table.
 *
 * Usage in backend:
 *   const db = new Kysely<Database>({ ... });
 *   db.selectFrom('suppliers').where('organization_id', '=', orgId).execute();
 */
export interface Database {
  organisations: OrganisationTable;
  users: UserTable;
  suppliers: SupplierTable;
  audit_logs: AuditLogTable;
}
