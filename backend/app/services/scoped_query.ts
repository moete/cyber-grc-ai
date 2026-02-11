import db from '#services/db'
import type { Database } from 'shared'

/**
 * Org-scoped query helpers.
 *
 * Centralises the `.where('organization_id', '=', orgId)` pattern
 * so that tenant scoping is defined once, not repeated in every controller.
 *
 * If the scoping column or strategy ever changes, update here only.
 */

type TenantTable = 'suppliers' | 'audit_logs' | 'users'

/** SELECT scoped to the user's organisation */
export function scopedSelect<T extends TenantTable>(table: T, orgId: string) {
  return db.selectFrom(table).where('organization_id', '=', orgId)
}

/** UPDATE scoped to the user's organisation */
export function scopedUpdate<T extends TenantTable>(table: T, orgId: string) {
  return db.updateTable(table).where('organization_id', '=', orgId)
}

/** DELETE scoped to the user's organisation */
export function scopedDelete<T extends TenantTable>(table: T, orgId: string) {
  return db.deleteFrom(table).where('organization_id', '=', orgId)
}

/** INSERT that auto-sets organization_id */
export function scopedInsert<T extends TenantTable>(table: T) {
  return db.insertInto(table)
}
