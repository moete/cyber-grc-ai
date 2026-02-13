import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api'
import type { SupplierListResponse, SupplierDetailResponse } from '@/types'

export interface ListSuppliersParams {
  page?: number
  limit?: number
  name?: string
  category?: string
  riskLevel?: string
  status?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export function listSuppliers(params: ListSuppliersParams = {}) {
  const sp = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '') sp.set(k, String(v))
  })
  const qs = sp.toString()
  return apiGet<SupplierListResponse>(`/api/suppliers${qs ? `?${qs}` : ''}`)
}

export function getSupplier(id: string) {
  return apiGet<SupplierDetailResponse>(`/api/suppliers/${id}`)
}

export interface CreateSupplierBody {
  name: string
  domain: string
  category: string
  riskLevel?: string
  status?: string
  contractEndDate?: string | null
  notes?: string | null
}

export function createSupplier(body: CreateSupplierBody) {
  return apiPost<SupplierDetailResponse>('/api/suppliers', body)
}

export type UpdateSupplierBody = Partial<CreateSupplierBody>

export function updateSupplier(id: string, body: UpdateSupplierBody) {
  return apiPut<SupplierDetailResponse>(`/api/suppliers/${id}`, body)
}

export function deleteSupplier(id: string) {
  return apiDelete<{ success: true }>(`/api/suppliers/${id}`)
}
