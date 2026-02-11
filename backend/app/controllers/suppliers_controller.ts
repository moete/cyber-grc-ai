import type { HttpContext } from '@adonisjs/core/http'
import { logAudit } from '#services/audit_service'
import { enqueueAiJob } from '#services/ai_queue'
import { scopedSelect, scopedUpdate, scopedDelete, scopedInsert } from '#services/scoped_query'
import { createSupplierValidator, updateSupplierValidator } from '#validators/supplier_validator'
import {
  AiAnalysisStatus,
  AuditAction,
  canAccessResource,
  Category,
  ENTITY_TYPES,
  HttpStatusCode,
  Permission,
  RiskLevel,
  Status,
  type ISupplier,
} from '@shared'

/**
 * Map camelCase sort param from the API to snake_case DB column names.
 * Only whitelisted columns can be sorted on — prevents SQL injection.
 */
const SORT_COLUMN_MAP: Record<string, string> = {
  name: 'name',
  domain: 'domain',
  category: 'category',
  riskLevel: 'risk_level',
  status: 'status',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  contractEndDate: 'contract_end_date',
  aiRiskScore: 'ai_risk_score',
}

/**
 * Defense-in-depth: verify the loaded resource belongs to the user's org
 * AND the user has the required permission. Uses canAccessResource from shared.
 *
 * The scoped query is the primary filter; this is the application-level safety net.
 */
function assertAccess(
  auth: HttpContext['auth'],
  resourceOrgId: string,
  permission: Permission
): boolean {
  return canAccessResource(auth.role, auth.organizationId, resourceOrgId, permission)
}

export default class SuppliersController {
  /**
   * GET /api/suppliers
   * Server-side pagination, filtering, sorting.
   */
  async index({ auth, request, response }: HttpContext) {
    const qs = request.qs()
    const page = Math.max(1, Number(qs.page) || 1)
    const limit = Math.min(100, Math.max(1, Number(qs.limit) || 10))
    const offset = (page - 1) * limit

    let query = scopedSelect('suppliers', auth.organizationId)

    // Filters
    if (qs.name) {
      query = query.where('name', 'ilike', `%${qs.name}%`)
    }
    if (qs.category) {
      query = query.where('category', '=', qs.category)
    }
    if (qs.riskLevel) {
      query = query.where('risk_level', '=', qs.riskLevel)
    }
    if (qs.status) {
      query = query.where('status', '=', qs.status)
    }

    // Total count (before pagination)
    const countResult = await query
      .select((eb: any) => eb.fn.countAll().as('count'))
      .executeTakeFirst()
    const total = Number((countResult as any)?.count ?? 0)

    // Sorting — only whitelisted columns
    const sortColumn = SORT_COLUMN_MAP[qs.sortBy as string] ?? 'created_at'
    const sortOrder = qs.sortOrder === 'asc' ? 'asc' : 'desc'

    const rows = await query
      .selectAll()
      .orderBy(sortColumn as any, sortOrder)
      .limit(limit)
      .offset(offset)
      .execute()

    return response.status(HttpStatusCode.OK).send({
      data: rows.map(toSupplierResponse),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    })
  }

  /**
   * GET /api/suppliers/:id
   */
  async show({ auth, params, response }: HttpContext) {
    const supplier = await scopedSelect('suppliers', auth.organizationId)
      .where('id', '=', params.id)
      .selectAll()
      .executeTakeFirst()

    if (!supplier || !assertAccess(auth, supplier.organization_id, Permission.SUPPLIER_READ)) {
      return response.status(HttpStatusCode.NOT_FOUND).send({
        success: false,
        message: 'Supplier not found in your organization',
        statusCode: HttpStatusCode.NOT_FOUND,
      })
    }

    return response.status(HttpStatusCode.OK).send({
      success: true,
      data: toSupplierResponse(supplier),
    })
  }

  /**
   * POST /api/suppliers
   */
  async store({ auth, request, response }: HttpContext) {
    const data = await request.validateUsing(createSupplierValidator)

    const [supplier] = await scopedInsert('suppliers')
      .values({
        organization_id: auth.organizationId,
        name: data.name,
        domain: data.domain,
        category: (data.category ?? Category.OTHER) as Category,
        risk_level: (data.riskLevel ?? RiskLevel.LOW) as RiskLevel,
        status: (data.status ?? Status.INACTIVE) as Status,
        contract_end_date: data.contractEndDate ? new Date(data.contractEndDate) : null as Date | null,
        notes: data.notes ?? null,
        ai_status: AiAnalysisStatus.PENDING,
        ai_last_requested_at: new Date(),
        ai_last_completed_at: null,
        ai_error: null,
      })
      .returningAll()
      .execute()

    // Enqueue AI analysis job (async pipeline)
    await enqueueAiJob({
      supplierId: supplier.id,
      organizationId: auth.organizationId,
    })

    // Audit trail
    await logAudit({
      organizationId: auth.organizationId,
      userId: auth.userId,
      action: AuditAction.CREATE,
      entityType: ENTITY_TYPES.SUPPLIER,
      entityId: supplier.id,
      before: null,
      after: toSupplierResponse(supplier) as unknown as Record<string, unknown>,
      ipAddress: request.ip(),
    })

    return response.status(HttpStatusCode.CREATED).send({
      success: true,
      data: toSupplierResponse(supplier),
    })
  }

  /**
   * PUT /api/suppliers/:id
   * Full update: Owner, Admin (SUPPLIER_UPDATE).
   * Partial update for Analyst: risk level only (RISK_LEVEL_UPDATE), notes only (NOTES_ADD).
   */
  async update({ auth, params, request, response }: HttpContext) {
    const existing = await scopedSelect('suppliers', auth.organizationId)
      .where('id', '=', params.id)
      .selectAll()
      .executeTakeFirst()

    if (!existing) {
      return response.status(HttpStatusCode.NOT_FOUND).send({
        success: false,
        message: 'Supplier not found in your organization',
        statusCode: HttpStatusCode.NOT_FOUND,
      })
    }

    const hasFullUpdate = assertAccess(auth, existing.organization_id, Permission.SUPPLIER_UPDATE)
    const canRiskLevel = assertAccess(auth, existing.organization_id, Permission.RISK_LEVEL_UPDATE)
    const canNotes = assertAccess(auth, existing.organization_id, Permission.NOTES_ADD)

    if (!hasFullUpdate && !canRiskLevel && !canNotes) {
      return response.status(HttpStatusCode.NOT_FOUND).send({
        success: false,
        message: 'Supplier not found in your organization',
        statusCode: HttpStatusCode.NOT_FOUND,
      })
    }

    const data = await request.validateUsing(updateSupplierValidator)

    // Analyst can only change riskLevel and/or notes; other fields are ignored, not rejected
    if (!hasFullUpdate) {
      if (data.riskLevel !== undefined && !canRiskLevel) {
        return response.status(HttpStatusCode.FORBIDDEN).send({
          success: false,
          message: 'Forbidden: you do not have permission to update risk level',
          statusCode: HttpStatusCode.FORBIDDEN,
        })
      }
      if (data.notes !== undefined && !canNotes) {
        return response.status(HttpStatusCode.FORBIDDEN).send({
          success: false,
          message: 'Forbidden: you do not have permission to update notes',
          statusCode: HttpStatusCode.FORBIDDEN,
        })
      }
    }

    const updateValues: Record<string, any> = { updated_at: new Date() }
    if (hasFullUpdate) {
      if (data.name !== undefined) updateValues.name = data.name
      if (data.domain !== undefined) updateValues.domain = data.domain
      if (data.category !== undefined) updateValues.category = data.category
      if (data.riskLevel !== undefined) updateValues.risk_level = data.riskLevel
      if (data.status !== undefined) updateValues.status = data.status
      if (data.contractEndDate !== undefined) {
        updateValues.contract_end_date = data.contractEndDate
          ? new Date(data.contractEndDate)
          : null
      }
      if (data.notes !== undefined) updateValues.notes = data.notes
    } else {
      if (canRiskLevel && data.riskLevel !== undefined) updateValues.risk_level = data.riskLevel
      if (canNotes && data.notes !== undefined) updateValues.notes = data.notes
    }

    const [updated] = await scopedUpdate('suppliers', auth.organizationId)
      .set({
        ...updateValues,
        ...(hasFullUpdate
          ? {
              ai_status: AiAnalysisStatus.PENDING,
              ai_last_requested_at: new Date(),
              ai_last_completed_at: null,
              ai_error: null,
            }
          : {}),
      })
      .where('id', '=', params.id)
      .returningAll()
      .execute()

    // Audit trail
    await logAudit({
      organizationId: auth.organizationId,
      userId: auth.userId,
      action: AuditAction.UPDATE,
      entityType: ENTITY_TYPES.SUPPLIER,
      entityId: params.id,
      before: toSupplierResponse(existing) as unknown as Record<string, unknown>,
      after: toSupplierResponse(updated) as unknown as Record<string, unknown>,
      ipAddress: request.ip(),
    })

    return response.status(HttpStatusCode.OK).send({
      success: true,
      data: toSupplierResponse(updated),
    })
  }

  /**
   * DELETE /api/suppliers/:id
   */
  async destroy({ auth, params, request, response }: HttpContext) {
    const existing = await scopedSelect('suppliers', auth.organizationId)
      .where('id', '=', params.id)
      .selectAll()
      .executeTakeFirst()

    if (!existing || !assertAccess(auth, existing.organization_id, Permission.SUPPLIER_DELETE)) {
      return response.status(HttpStatusCode.NOT_FOUND).send({
        success: false,
        message: 'Supplier not found in your organization',
        statusCode: HttpStatusCode.NOT_FOUND,
      })
    }

    await scopedDelete('suppliers', auth.organizationId)
      .where('id', '=', params.id)
      .execute()

    // Audit trail
    await logAudit({
      organizationId: auth.organizationId,
      userId: auth.userId,
      action: AuditAction.DELETE,
      entityType: ENTITY_TYPES.SUPPLIER,
      entityId: params.id,
      before: toSupplierResponse(existing) as unknown as Record<string, unknown>,
      after: null,
      ipAddress: request.ip(),
    })

    return response.status(HttpStatusCode.OK).send({
      success: true,
      message: 'Supplier deleted successfully',
    })
  }
}

/**
 * Transform a DB row (snake_case) to the API response format (camelCase).
 */
function toSupplierResponse(row: any): ISupplier {
  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    domain: row.domain,
    category: row.category,
    riskLevel: row.risk_level,
    status: row.status,
    contractEndDate: row.contract_end_date,
    notes: row.notes,
    aiRiskScore: row.ai_risk_score,
    aiAnalysis: row.ai_analysis,
    aiStatus: row.ai_status ?? null,
    aiLastRequestedAt: row.ai_last_requested_at ?? null,
    aiLastCompletedAt: row.ai_last_completed_at ?? null,
    aiError: row.ai_error ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

