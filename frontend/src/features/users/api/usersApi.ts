import { apiGet, apiPost, apiPatch, apiPut, apiDelete } from '@/lib/api'
import type { UserListResponse, UserDetailResponse, IUserPublic } from '@/types'

export function listUsers() {
  return apiGet<UserListResponse>('/api/users')
}

export function getUser(id: string) {
  return apiGet<UserDetailResponse>(`/api/users/${id}`)
}

export interface CreateUserBody {
  email: string
  firstName: string
  lastName: string
  password: string
  role: string
}

export function createUser(body: CreateUserBody) {
  return apiPost<UserDetailResponse>('/api/users', body)
}

export interface UpdateUserBody {
  email?: string
  firstName?: string
  lastName?: string
  role?: string
  isActive?: boolean
  password?: string
}

export function updateUser(id: string, body: UpdateUserBody) {
  return apiPatch<UserDetailResponse>(`/api/users/${id}`, body)
}

export function deleteUser(id: string) {
  return apiDelete<{ success: true; message?: string }>(`/api/users/${id}`)
}

export type { IUserPublic }
