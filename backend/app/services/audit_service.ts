import db from '#services/db'
import type { AuditAction } from 'shared'
import type { EntityType } from 'shared'

interface AuditLogEntry {
  organizationId: string
  userId: string
  action: AuditAction
  entityType: EntityType
  entityId: string
  before: Record<string, unknown> | null
  after: Record<string, unknown> | null
  ipAddress: string
}

/**
 * Centralised audit trail writer.
 *
 * Design choice: explicit calls in controllers rather than DB triggers.
 * Why:
 *   - Triggers are invisible; explicit calls are self-documenting
 *   - We need HTTP context (userId, ipAddress, orgId) which triggers lack
 *   - Easy to unit-test by mocking the DB insert
 *
 * The audit_logs table is append-only — PostgreSQL rules prevent UPDATE/DELETE.
 */
export async function logAudit(entry: AuditLogEntry): Promise<void> {
  await db
    .insertInto('audit_logs')
    .values({
      organization_id: entry.organizationId,
      user_id: entry.userId,
      action: entry.action,
      entity_type: entry.entityType,
      entity_id: entry.entityId,
      before: entry.before ? JSON.stringify(entry.before) : null,
      after: entry.after ? JSON.stringify(entry.after) : null,
      ip_address: entry.ipAddress,
    })
    .execute()
}
