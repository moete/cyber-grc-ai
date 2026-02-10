import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('suppliers')
    .addColumn('id', 'uuid', (col) =>
      col.primaryKey().defaultTo(sql`gen_random_uuid()`)
    )
    .addColumn('organization_id', 'uuid', (col) =>
      col.notNull().references('organisations.id').onDelete('cascade')
    )
    .addColumn('name', 'varchar(255)', (col) => col.notNull())
    .addColumn('domain', 'varchar(255)', (col) => col.notNull())
    .addColumn('category', 'varchar(50)', (col) =>
      col
        .notNull()
        .check(sql`category IN ('SaaS', 'Infrastructure', 'Consulting', 'Other')`)
    )
    .addColumn('risk_level', 'varchar(50)', (col) =>
      col
        .notNull()
        .defaultTo('Medium')
        .check(sql`risk_level IN ('Critical', 'High', 'Medium', 'Low')`)
    )
    .addColumn('status', 'varchar(50)', (col) =>
      col
        .notNull()
        .defaultTo('Active')
        .check(sql`status IN ('Active', 'Under Review', 'Inactive')`)
    )
    .addColumn('contract_end_date', 'date')
    .addColumn('notes', 'text')
    .addColumn('ai_risk_score', 'double precision')
    .addColumn('ai_analysis', 'jsonb')
    .addColumn('created_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .addColumn('updated_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .execute()

  await db.schema
    .createIndex('idx_suppliers_organization_id')
    .on('suppliers')
    .column('organization_id')
    .execute()

  await db.schema
    .createIndex('idx_suppliers_category')
    .on('suppliers')
    .column('category')
    .execute()

  await db.schema
    .createIndex('idx_suppliers_risk_level')
    .on('suppliers')
    .column('risk_level')
    .execute()
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('suppliers').execute()
}
