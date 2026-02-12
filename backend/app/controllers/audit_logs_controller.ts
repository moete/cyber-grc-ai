import type { HttpContext } from '@adonisjs/core/http'
import { scopedSelect } from '#services/scoped_query'
import { toAuditLogResponse } from '#services/audit_log_service'
import type { AuditLogRow } from '#types/audit_log'
import { parsePagination, countQuery, paginated } from '#helpers/pagination'
import { ok } from '#helpers/responses'
import NotFoundException from '#exceptions/not_found_exception'

export default class AuditLogsController {
  /**
   * GET /api/audit-logs
   *
   * Paginated, filterable audit trail — accessible only to Admin and Auditor roles
   * (enforced by rbac middleware on the route).
   */
  async index({ auth, request, response }: HttpContext) {
    const qs = request.qs()
    const pg = parsePagination(qs, 20)

    let query = scopedSelect('audit_logs', auth.organizationId)

    if (qs.entityType) query = query.where('entity_type', '=', qs.entityType)
    if (qs.entityId) query = query.where('entity_id', '=', qs.entityId)
    if (qs.userId) query = query.where('user_id', '=', qs.userId)
    if (qs.action) query = query.where('action', '=', qs.action)

    const total = await countQuery(query)

    const rows: AuditLogRow[] = await query
      .selectAll()
      .orderBy('created_at', 'desc')
      .limit(pg.limit)
      .offset(pg.offset)
      .execute()

    return paginated(response, rows.map(toAuditLogResponse), pg, total)
  }

  /**
   * GET /api/audit-logs/:id
   */
  async show({ auth, params, response }: HttpContext) {
    const log = await scopedSelect('audit_logs', auth.organizationId)
      .where('id', '=', params.id)
      .selectAll()
      .executeTakeFirst() as AuditLogRow | undefined

    if (!log) throw new NotFoundException('Audit log entry not found')

    return ok(response, toAuditLogResponse(log))
  }
}
