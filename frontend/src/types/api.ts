/**
 * API response shapes used by the frontend.
 * Align with backend response formats.
 */
import type { ILoginResponse, ISupplier } from '@shared'

/** User as returned by /api/users (list/detail) — matches backend toUserResponse */
export interface IUserPublic {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  isActive: boolean
  organizationId: string
  organizationName: string
  createdAt: string
}

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

export interface UserListResponse {
  success: true
  data: IUserPublic[]
}

export interface UserDetailResponse {
  success: true
  data: IUserPublic
}

export interface ApiErrorResponse {
  success: false
  message: string
  errors?: Record<string, string[]>
  statusCode: number
}
