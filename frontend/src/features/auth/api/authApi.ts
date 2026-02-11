import { apiPost } from '@/lib/api'
import type { ILoginRequest } from '@shared'
import type { LoginSuccessResponse } from '@/types'

export async function loginRequest(body: ILoginRequest) {
  const res = await apiPost<LoginSuccessResponse>('/api/auth/login', body)
  if (!res.success || !res.data) throw new Error('Invalid login response')
  return res.data
}

export async function meRequest() {
  return apiPost<{ success: true; data: unknown }>('/api/auth/me')
}
