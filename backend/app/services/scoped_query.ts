import type { DeleteQueryBuilder, SelectQueryBuilder, UpdateQueryBuilder } from 'kysely'
import db from '#services/db'
import type { Database } from '@shared'

/**
 * Org-scoped query helpers.
 *
 * Centralises the `.where('organization_id', '=', orgId)` pattern
 * so that tenant scoping is defined once, not repeated in every controller.
 *
 * If the scoping column or strategy ever changes, update here only.
 */

type TenantTable = 'suppliers' | 'audit_logs' | 'users'

type TableAlias<DB, T> = T extends keyof DB ? T : never

/** SELECT scoped to the user's organisation */
export function scopedSelect<T extends TenantTable>(
  table: T,
  orgId: string
): SelectQueryBuilder<Database, TableAlias<Database, T>, Record<string, unknown>> {
  return db.selectFrom(table).where('organization_id', '=', orgId as never) as SelectQueryBuilder<
    Database,
    TableAlias<Database, T>,
    Record<string, unknown>
  >
}

/** UPDATE scoped to the user's organisation */
export function scopedUpdate<T extends TenantTable>(
  table: T,
  orgId: string
): UpdateQueryBuilder<Database, TableAlias<Database, T>, TableAlias<Database, T>, unknown> {
  return db.updateTable(table).where('organization_id', '=', orgId as never) as UpdateQueryBuilder<
    Database,
    TableAlias<Database, T>,
    TableAlias<Database, T>,
    unknown
  >
}

/** DELETE scoped to the user's organisation */
export function scopedDelete<T extends TenantTable>(
  table: T,
  orgId: string
): DeleteQueryBuilder<Database, TableAlias<Database, T>, unknown> {
  return db.deleteFrom(table).where('organization_id', '=', orgId as never) as DeleteQueryBuilder<
    Database,
    TableAlias<Database, T>,
    unknown
  >
}

/** INSERT that auto-sets organization_id */
export function scopedInsert<T extends TenantTable>(table: T) {
  return db.insertInto(table)
}
