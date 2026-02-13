import type { AuditLogRow } from '#types/audit_log';

export function toAuditLogResponse(row: AuditLogRow) {
  return {
    id: row.id,
    organizationId: row.organization_id,
    userId: row.user_id,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    before: row.before,
    after: row.after,
    ipAddress: row.ip_address,
    createdAt: row.created_at
  };
}
