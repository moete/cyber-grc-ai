import type { HttpContext } from '@adonisjs/core/http';
import { logAudit } from '#services/audit_service';
import { enqueueAiJob } from '#services/ai_queue';
import { scopedSelect, scopedUpdate, scopedDelete, scopedInsert } from '#services/scoped_query';
import { createSupplierValidator, updateSupplierValidator } from '#validators/supplier_validator';
import { AiAnalysisStatus, RiskLevel, Status, Category, ENTITY_TYPES, Permission, AuditAction, type ISupplier } from '@shared';
import {
  applySupplierFilters,
  buildSupplierUpdateValues,
  getSort,
  toSupplierResponse,
  type SupplierQueryString
} from '#services/supplier_service';
import { parsePagination, countQuery, paginated } from '#helpers/pagination';
import { ok, created, deleted } from '#helpers/responses';
import { hasAccess, requireAccess } from '#helpers/access';
import NotFoundException from '#exceptions/not_found_exception';
import ForbiddenException from '#exceptions/forbidden_exception';

export default class SuppliersController {
  /**
   * GET /api/suppliers
   */
  async index({ auth, request, response }: HttpContext) {
    const qs = request.qs() as SupplierQueryString;
    const pg = parsePagination(qs);

    let query = scopedSelect('suppliers', auth.organizationId);
    query = applySupplierFilters(query, qs);

    const total = await countQuery(query);
    const { sortColumn, sortOrder } = getSort(qs);

    const rows = await query
      .selectAll()
      .orderBy(sortColumn as any, sortOrder)
      .limit(pg.limit)
      .offset(pg.offset)
      .execute();

    return paginated<ISupplier>(response, rows.map(toSupplierResponse), pg, total);
  }

  /**
   * GET /api/suppliers/:id
   */
  async show({ auth, params, response }: HttpContext) {
    const supplier = await this.findSupplier(auth.organizationId, params.id);
    requireAccess(auth, supplier.organization_id, Permission.SUPPLIER_READ, 'Supplier not found in your organization');
    return ok(response, toSupplierResponse(supplier));
  }

  /**
   * POST /api/suppliers
   */
  async store({ auth, request, response }: HttpContext) {
    const data = await request.validateUsing(createSupplierValidator);

    const [supplier] = await scopedInsert('suppliers')
      .values({
        organization_id: auth.organizationId,
        name: data.name,
        domain: data.domain,
        category: (data.category ?? Category.OTHER) as Category,
        risk_level: (data.riskLevel ?? RiskLevel.LOW) as RiskLevel,
        status: (data.status ?? Status.INACTIVE) as Status,
        contract_end_date: data.contractEndDate ? new Date(data.contractEndDate) : (null as Date | null),
        notes: data.notes ?? null,
        ai_status: AiAnalysisStatus.PENDING,
        ai_last_requested_at: new Date(),
        ai_last_completed_at: null,
        ai_error: null
      })
      .returningAll()
      .execute();

    await enqueueAiJob({ supplierId: supplier.id, organizationId: auth.organizationId });

    await this.audit(auth, AuditAction.CREATE, supplier.id, null, supplier, request.ip());

    return created(response, toSupplierResponse(supplier));
  }

  /**
   * PUT /api/suppliers/:id
   */
  async update({ auth, params, request, response }: HttpContext) {
    const existing = await this.findSupplier(auth.organizationId, params.id);

    const fullUpdate = hasAccess(auth, existing.organization_id, Permission.SUPPLIER_UPDATE);
    const canRisk = hasAccess(auth, existing.organization_id, Permission.RISK_LEVEL_UPDATE);
    const canNotes = hasAccess(auth, existing.organization_id, Permission.NOTES_ADD);

    if (!fullUpdate && !canRisk && !canNotes) {
      throw new ForbiddenException('You do not have permission to update this supplier');
    }

    const data = await request.validateUsing(updateSupplierValidator);

    if (!fullUpdate) {
      if (data.riskLevel !== undefined && !canRisk) {
        throw new ForbiddenException('You do not have permission to update risk level');
      }
      if (data.notes !== undefined && !canNotes) {
        throw new ForbiddenException('You do not have permission to update notes');
      }
    }

    const updateValues = buildSupplierUpdateValues(data, fullUpdate, canRisk, canNotes);

    const [updated] = await scopedUpdate('suppliers', auth.organizationId)
      .set({
        ...updateValues,
        ai_status: AiAnalysisStatus.PENDING,
        ai_last_requested_at: new Date(),
        ai_last_completed_at: null,
        ai_error: null
      })
      .where('id', '=', params.id)
      .returningAll()
      .execute();

    await enqueueAiJob({ supplierId: updated.id, organizationId: auth.organizationId });

    await this.audit(auth, AuditAction.UPDATE, params.id, existing, updated, request.ip());

    return ok(response, toSupplierResponse(updated));
  }

  /**
   * DELETE /api/suppliers/:id
   */
  async destroy({ auth, params, request, response }: HttpContext) {
    const existing = await this.findSupplier(auth.organizationId, params.id);
    requireAccess(auth, existing.organization_id, Permission.SUPPLIER_DELETE, 'You do not have permission to delete this supplier');

    await scopedDelete('suppliers', auth.organizationId).where('id', '=', params.id).execute();

    await this.audit(auth, AuditAction.DELETE, params.id, existing, null, request.ip());

    return deleted(response, 'Supplier deleted successfully');
  }

  // ── Private helpers ──────────────────────────────────────────────

  /**
   * Scoped find-or-404.
   */
  private async findSupplier(organizationId: string, id: string) {
    // Guard against invalid UUIDs early so we return a clean 404
    // instead of bubbling up a Postgres 22P02 error.
    if (!id || typeof id !== 'string' || !/^[0-9a-f-]{36}$/i.test(id)) {
      throw new NotFoundException('Supplier not found in your organization');
    }

    const row = await scopedSelect('suppliers', organizationId).where('id', '=', id).selectAll().executeTakeFirst();

    if (!row) throw new NotFoundException('Supplier not found in your organization');
    return row;
  }

  /**
   * audit wrapper
   */
  private async audit(auth: HttpContext['auth'], action: AuditAction, entityId: string, before: any, after: any, ipAddress: string) {
    await logAudit({
      organizationId: auth.organizationId,
      userId: auth.userId,
      action,
      entityType: ENTITY_TYPES.SUPPLIER,
      entityId,
      before: before ? (toSupplierResponse(before) as unknown as Record<string, unknown>) : null,
      after: after ? (toSupplierResponse(after) as unknown as Record<string, unknown>) : null,
      ipAddress
    });
  }
}
