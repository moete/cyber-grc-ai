/**
 * App config and env-derived values.
 * Vite exposes env vars with VITE_ prefix.
 */
export const config = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3333',
} as const
