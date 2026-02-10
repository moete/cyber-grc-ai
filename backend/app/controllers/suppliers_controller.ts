import type { HttpContext } from '@adonisjs/core/http'
import db from '#services/db'
import { logAudit } from '#services/audit_service'
import { createSupplierValidator, updateSupplierValidator } from '#validators/supplier_validator'
import { AuditAction, ENTITY_TYPES, type ISupplier } from 'shared'

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

    let query = db
      .selectFrom('suppliers')
      .where('organization_id', '=', auth.organizationId)

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

    return response.status(200).send({
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
    const supplier = await db
      .selectFrom('suppliers')
      .where('id', '=', params.id)
      .where('organization_id', '=', auth.organizationId)
      .selectAll()
      .executeTakeFirst()

    if (!supplier) {
      return response.status(404).send({
        success: false,
        message: 'Supplier not found',
        statusCode: 404,
      })
    }

    return response.status(200).send({
      success: true,
      data: toSupplierResponse(supplier),
    })
  }

  /**
   * POST /api/suppliers
   */
  async store({ auth, request, response }: HttpContext) {
    const data = await request.validateUsing(createSupplierValidator)

    const [supplier] = await db
      .insertInto('suppliers')
      .values({
        organization_id: auth.organizationId,
        name: data.name,
        domain: data.domain,
        category: data.category,
        risk_level: data.riskLevel ?? 'Medium',
        status: data.status ?? 'Active',
        contract_end_date: data.contractEndDate ? new Date(data.contractEndDate) : null,
        notes: data.notes ?? null,
      })
      .returningAll()
      .execute()

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

    return response.status(201).send({
      success: true,
      data: toSupplierResponse(supplier),
    })
  }

  /**
   * PUT /api/suppliers/:id
   */
  async update({ auth, params, request, response }: HttpContext) {
    // Fetch existing (org-scoped) for audit "before" state
    const existing = await db
      .selectFrom('suppliers')
      .where('id', '=', params.id)
      .where('organization_id', '=', auth.organizationId)
      .selectAll()
      .executeTakeFirst()

    if (!existing) {
      return response.status(404).send({
        success: false,
        message: 'Supplier not found',
        statusCode: 404,
      })
    }

    const data = await request.validateUsing(updateSupplierValidator)

    // Build update payload — only include fields that were sent
    const updateValues: Record<string, any> = { updated_at: new Date() }
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

    const [updated] = await db
      .updateTable('suppliers')
      .set(updateValues)
      .where('id', '=', params.id)
      .where('organization_id', '=', auth.organizationId)
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

    return response.status(200).send({
      success: true,
      data: toSupplierResponse(updated),
    })
  }

  /**
   * DELETE /api/suppliers/:id
   */
  async destroy({ auth, params, request, response }: HttpContext) {
    const existing = await db
      .selectFrom('suppliers')
      .where('id', '=', params.id)
      .where('organization_id', '=', auth.organizationId)
      .selectAll()
      .executeTakeFirst()

    if (!existing) {
      return response.status(404).send({
        success: false,
        message: 'Supplier not found',
        statusCode: 404,
      })
    }

    await db
      .deleteFrom('suppliers')
      .where('id', '=', params.id)
      .where('organization_id', '=', auth.organizationId)
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

    return response.status(200).send({
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
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
