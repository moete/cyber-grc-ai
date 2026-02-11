import type { HttpContext } from '@adonisjs/core/http'
import db from '#services/db'
import { HttpStatusCode } from 'shared'

export default class AuditLogsController {
  /**
   * GET /api/audit-logs
   *
   * Paginated, filterable audit trail — accessible only to Admin and Auditor roles
   * (enforced by rbac middleware on the route).
   *
   * Query params:
   *   page, limit          — pagination
   *   entityType, entityId — filter by entity (e.g. supplier timeline)
   *   userId               — filter by acting user
   *   action               — filter by action (CREATE, UPDATE, DELETE)
   */
  async index({ auth, request, response }: HttpContext) {
    const qs = request.qs()
    const page = Math.max(1, Number(qs.page) || 1)
    const limit = Math.min(100, Math.max(1, Number(qs.limit) || 20))
    const offset = (page - 1) * limit

    let query = db
      .selectFrom('audit_logs')
      .where('organization_id', '=', auth.organizationId)

    // Filters
    if (qs.entityType) {
      query = query.where('entity_type', '=', qs.entityType)
    }
    if (qs.entityId) {
      query = query.where('entity_id', '=', qs.entityId)
    }
    if (qs.userId) {
      query = query.where('user_id', '=', qs.userId)
    }
    if (qs.action) {
      query = query.where('action', '=', qs.action)
    }

    // Total count
    const countResult = await query
      .select((eb: any) => eb.fn.countAll().as('count'))
      .executeTakeFirst()
    const total = Number((countResult as any)?.count ?? 0)

    // Data (newest first — append-only log, chronological makes sense)
    const rows = await query
      .selectAll()
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset)
      .execute()

    const data = rows.map((row: any) => ({
      id: row.id,
      organizationId: row.organization_id,
      userId: row.user_id,
      action: row.action,
      entityType: row.entity_type,
      entityId: row.entity_id,
      before: row.before,
      after: row.after,
      ipAddress: row.ip_address,
      createdAt: row.created_at,
    }))

    return response.status(HttpStatusCode.OK).send({
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    })
  }

  /**
   * GET /api/audit-logs/:id
   */
  async show({ auth, params, response }: HttpContext) {
    const log = await db
      .selectFrom('audit_logs')
      .where('id', '=', params.id)
      .where('organization_id', '=', auth.organizationId)
      .selectAll()
      .executeTakeFirst()

    if (!log) {
      return response.status(HttpStatusCode.NOT_FOUND).send({
        success: false,
        message: 'Audit log entry not found',
        statusCode: HttpStatusCode.NOT_FOUND,
      })
    }

    return response.status(HttpStatusCode.OK).send({
      success: true,
      data: {
        id: log.id,
        organizationId: log.organization_id,
        userId: log.user_id,
        action: log.action,
        entityType: log.entity_type,
        entityId: log.entity_id,
        before: log.before,
        after: log.after,
        ipAddress: log.ip_address,
        createdAt: log.created_at,
      },
    })
  }
}
