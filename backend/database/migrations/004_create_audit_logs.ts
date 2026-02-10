import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('audit_logs')
    .addColumn('id', 'uuid', (col) =>
      col.primaryKey().defaultTo(sql`gen_random_uuid()`)
    )
    .addColumn('organization_id', 'uuid', (col) =>
      col.notNull().references('organisations.id').onDelete('cascade')
    )
    .addColumn('user_id', 'uuid', (col) =>
      col.notNull().references('users.id')
    )
    .addColumn('action', 'varchar(50)', (col) =>
      col.notNull().check(sql`action IN ('CREATE', 'UPDATE', 'DELETE')`)
    )
    .addColumn('entity_type', 'varchar(100)', (col) => col.notNull())
    .addColumn('entity_id', 'uuid', (col) => col.notNull())
    .addColumn('before', 'jsonb')
    .addColumn('after', 'jsonb')
    .addColumn('ip_address', 'varchar(45)', (col) => col.notNull())
    .addColumn('created_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .execute()

  // Append-only enforcement: prevent UPDATE and DELETE via rules
  await sql`CREATE RULE audit_logs_no_update AS ON UPDATE TO audit_logs DO INSTEAD NOTHING`.execute(db)
  await sql`CREATE RULE audit_logs_no_delete AS ON DELETE TO audit_logs DO INSTEAD NOTHING`.execute(db)

  // Indexes for common query patterns
  await db.schema
    .createIndex('idx_audit_logs_organization_id')
    .on('audit_logs')
    .column('organization_id')
    .execute()

  await db.schema
    .createIndex('idx_audit_logs_entity')
    .on('audit_logs')
    .columns(['entity_type', 'entity_id'])
    .execute()

  await db.schema
    .createIndex('idx_audit_logs_created_at')
    .on('audit_logs')
    .column('created_at')
    .execute()
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`DROP RULE IF EXISTS audit_logs_no_delete ON audit_logs`.execute(db)
  await sql`DROP RULE IF EXISTS audit_logs_no_update ON audit_logs`.execute(db)
  await db.schema.dropTable('audit_logs').execute()
}
