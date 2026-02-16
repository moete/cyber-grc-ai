import { type Kysely } from 'kysely';

/**
 * Add missing indexes for suppliers filter & sort columns.
 *
 * Gaps identified during performance review:
 * - `status` had no index (used as WHERE filter)
 * - No composite indexes for the common org-scoped queries
 */
export async function up(db: Kysely<any>): Promise<void> {
  // Single-column index for status filter
  await db.schema.createIndex('idx_suppliers_status').on('suppliers').column('status').execute();

  // Composite: org + status (common list filter combo)
  await db.schema.createIndex('idx_suppliers_org_status').on('suppliers').columns(['organization_id', 'status']).execute();

  // Composite: org + created_at desc (default sort for paginated list)
  await db.schema.createIndex('idx_suppliers_org_created_at').on('suppliers').columns(['organization_id', 'created_at']).execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropIndex('idx_suppliers_org_created_at').execute();
  await db.schema.dropIndex('idx_suppliers_org_status').execute();
  await db.schema.dropIndex('idx_suppliers_status').execute();
}
