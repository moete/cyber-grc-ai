import type { SupplierRow } from '#types/supplier';
import { type ISupplier } from '@shared';

export type SupplierSortKey = keyof typeof SORT_COLUMN_MAP;

export type SupplierQueryString = {
  name?: string;
  category?: string;
  riskLevel?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: string;
  page?: string | number;
  limit?: string | number;
};

/**
 * Map camelCase sort param from the API to snake_case DB column names.
 * Only whitelisted columns can be sorted on — prevents SQL injection.
 */
export const SORT_COLUMN_MAP: Record<string, string> = {
  name: 'name',
  domain: 'domain',
  category: 'category',
  riskLevel: 'risk_level',
  status: 'status',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  contractEndDate: 'contract_end_date',
  aiRiskScore: 'ai_risk_score'
};

export function applySupplierFilters(query: any, qs: SupplierQueryString) {
  let q = query;
  if (qs.name) {
    q = q.where('name', 'ilike', `%${qs.name}%`);
  }
  if (qs.category) {
    q = q.where('category', '=', qs.category);
  }
  if (qs.riskLevel) {
    q = q.where('risk_level', '=', qs.riskLevel);
  }
  if (qs.status) {
    q = q.where('status', '=', qs.status);
  }
  return q;
}

export function getSort(qs: SupplierQueryString): { sortColumn: string; sortOrder: 'asc' | 'desc' } {
  const sortColumn = SORT_COLUMN_MAP[qs.sortBy as SupplierSortKey] ?? 'created_at';
  const sortOrder: 'asc' | 'desc' = qs.sortOrder === 'asc' ? 'asc' : 'desc';
  return { sortColumn, sortOrder };
}

export function buildSupplierUpdateValues(
  data: any,
  hasFullUpdate: boolean,
  canRiskLevel: boolean,
  canNotes: boolean
): Record<string, any> {
  const updateValues: Record<string, any> = { updated_at: new Date() };

  if (hasFullUpdate) {
    if (data.name !== undefined) updateValues.name = data.name;
    if (data.domain !== undefined) updateValues.domain = data.domain;
    if (data.category !== undefined) updateValues.category = data.category;
    if (data.riskLevel !== undefined) updateValues.risk_level = data.riskLevel;
    if (data.status !== undefined) updateValues.status = data.status;
    if (data.contractEndDate !== undefined) {
      updateValues.contract_end_date = data.contractEndDate ? new Date(data.contractEndDate) : null;
    }
    if (data.notes !== undefined) updateValues.notes = data.notes;
  } else {
    if (canRiskLevel && data.riskLevel !== undefined) {
      updateValues.risk_level = data.riskLevel;
    }
    if (canNotes && data.notes !== undefined) {
      updateValues.notes = data.notes;
    }
  }

  return updateValues;
}

export function toSupplierResponse(row: SupplierRow): ISupplier {
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
    updatedAt: row.updated_at
  };
}
