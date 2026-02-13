import { type Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable('suppliers')
    .addColumn('ai_status', 'text', (col) =>
      col.check(sql`ai_status IN ('pending', 'processing', 'complete', 'error') OR ai_status IS NULL`)
    )
    .addColumn('ai_last_requested_at', 'timestamptz')
    .addColumn('ai_last_completed_at', 'timestamptz')
    .addColumn('ai_error', 'text')
    .execute();

  await db.schema.createIndex('idx_suppliers_ai_status').on('suppliers').column('ai_status').execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable('suppliers')
    .dropColumn('ai_error')
    .dropColumn('ai_last_completed_at')
    .dropColumn('ai_last_requested_at')
    .dropColumn('ai_status')
    .execute();
}
