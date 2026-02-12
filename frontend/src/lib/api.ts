import { config } from '@/config'
import type { IApiErrorResponse } from '@shared'

const AUTH_HEADER = 'Authorization'

function getToken(): string | null {
  return localStorage.getItem('token')
}

export function setAuthToken(token: string): void {
  localStorage.setItem('token', token)
}

export function clearAuthToken(): void {
  localStorage.removeItem('token')
}

export function getAuthHeader(): Record<string, string> | object {
  const token = getToken()
  return token ? { [AUTH_HEADER]: `Bearer ${token}` } : {}
}

export type ApiError = {
  statusCode: number
  message: string
  errors?: Record<string, string[]>
}

async function handleResponse<T>(res: Response): Promise<T> {
  const text = await res.text()
  const data = text ? (JSON.parse(text) as IApiErrorResponse | T) : undefined

  if (!res.ok) {
    const err: IApiErrorResponse = (data as IApiErrorResponse) ?? {
      success: false,
      message: res.statusText,
      statusCode: res.status,
    }
    throw {
      statusCode: err.statusCode,
      message: err.message ?? 'Request failed',
      errors: err.errors,
    } satisfies ApiError
  }

  return data as T
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${config.apiBaseUrl}${path}`
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...getAuthHeader(),
    ...(options.headers as Record<string, string>),
  }

  const res = await fetch(url, { ...options, headers })
  return handleResponse<T>(res)
}

export async function apiGet<T>(path: string): Promise<T> {
  return apiFetch<T>(path, { method: 'GET' })
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return apiFetch<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined })
}

export async function apiPut<T>(path: string, body?: unknown): Promise<T> {
  return apiFetch<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined })
}

export async function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  return apiFetch<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined })
}

export async function apiDelete<T>(path: string): Promise<T> {
  return apiFetch<T>(path, { method: 'DELETE' })
}
