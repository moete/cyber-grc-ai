import { apiGet } from '@/lib/api'
import type { IAuditLog } from '@shared'

interface AuditLogsResponse {
  data: IAuditLog[]
  meta?: { total: number; page: number; limit: number; totalPages: number }
}

export function listAuditLogs(params: { entityType?: string; entityId?: string; page?: number; limit?: number }) {
  const sp = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '') sp.set(k, String(v))
  })
  const qs = sp.toString()
  return apiGet<AuditLogsResponse>(`/api/audit-logs${qs ? `?${qs}` : ''}`)
}
