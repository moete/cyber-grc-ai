import { type Kysely, sql } from 'kysely';

/**
 * Drop the rule that prevents DELETE on audit_logs so that when an organisation
 * is deleted (Owner action), its audit trail can be removed in a controlled order.
 * Application code must only delete audit_logs as part of organisation deletion.
 */
export async function up(db: Kysely<any>): Promise<void> {
  await sql`DROP RULE IF EXISTS audit_logs_no_delete ON audit_logs`.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`
    CREATE RULE audit_logs_no_delete AS ON DELETE TO audit_logs DO INSTEAD NOTHING
  `.execute(db);
}
