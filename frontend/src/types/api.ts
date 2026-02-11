/**
 * API response shapes used by the frontend.
 * Align with backend response formats.
 */
import type { ILoginResponse, ISupplier } from '@shared'

export interface LoginSuccessResponse {
  success: true
  data: ILoginResponse
}

export interface SupplierListResponse {
  data: ISupplier[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export interface SupplierDetailResponse {
  success: true
  data: ISupplier
}

export interface ApiErrorResponse {
  success: false
  message: string
  errors?: Record<string, string[]>
  statusCode: number
}
