import type { ColumnType, Generated } from 'kysely';

export interface AuditLogTable {
  id: Generated<string>;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  /** State before modification (jsonb) */
  before: ColumnType<Record<string, unknown> | null, string | null, never>;
  /** State after modification (jsonb) */
  after: ColumnType<Record<string, unknown> | null, string | null, never>;
  ip_address: string;
  created_at: Generated<Date>;
}
