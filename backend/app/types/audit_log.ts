export type AuditLogRow = {
  id: string
  organization_id: string
  user_id: string
  action: string
  entity_type: string
  entity_id: string | null
  before: Record<string, unknown> | null
  after: Record<string, unknown> | null
  ip_address: string | null
  created_at: Date
}
