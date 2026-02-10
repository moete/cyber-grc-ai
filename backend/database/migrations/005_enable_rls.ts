import { type Kysely, sql } from 'kysely'

/**
 * Defense-in-depth: enable PostgreSQL Row-Level Security on tenant-scoped tables.
 *
 * Policies filter rows by matching `organization_id` against the session variable
 * `app.current_org_id`, which is set per-request by the OrgScope middleware.
 *
 * IMPORTANT: RLS is only enforced for non-superuser connections. In development
 * (connecting as `postgres`), application-level scoping is the primary mechanism.
 * In production, use a dedicated non-superuser role (e.g. `app_user`) so that
 * RLS policies are enforced as a safety net.
 */
export async function up(db: Kysely<any>): Promise<void> {
  // --- suppliers ---
  await sql`ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY`.execute(db)
  await sql`
    CREATE POLICY tenant_isolation_suppliers ON suppliers
      FOR ALL
      USING (organization_id::text = current_setting('app.current_org_id', true))
  `.execute(db)

  // --- audit_logs ---
  await sql`ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY`.execute(db)
  await sql`
    CREATE POLICY tenant_isolation_audit_logs ON audit_logs
      FOR ALL
      USING (organization_id::text = current_setting('app.current_org_id', true))
  `.execute(db)

  // --- users ---
  await sql`ALTER TABLE users ENABLE ROW LEVEL SECURITY`.execute(db)
  await sql`
    CREATE POLICY tenant_isolation_users ON users
      FOR ALL
      USING (organization_id::text = current_setting('app.current_org_id', true))
  `.execute(db)
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`DROP POLICY IF EXISTS tenant_isolation_users ON users`.execute(db)
  await sql`ALTER TABLE users DISABLE ROW LEVEL SECURITY`.execute(db)

  await sql`DROP POLICY IF EXISTS tenant_isolation_audit_logs ON audit_logs`.execute(db)
  await sql`ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY`.execute(db)

  await sql`DROP POLICY IF EXISTS tenant_isolation_suppliers ON suppliers`.execute(db)
  await sql`ALTER TABLE suppliers DISABLE ROW LEVEL SECURITY`.execute(db)
}
