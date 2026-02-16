/**
 * App config and env-derived values.
 * Vite exposes env vars with VITE_ prefix.
 * In dev, empty base URL uses Vite's proxy (see vite.config.ts) so /api goes to the backend.
 */
export const config = {
  apiBaseUrl:
    import.meta.env.VITE_API_BASE_URL ??
    (import.meta.env.DEV ? '' : 'http://localhost:3333'),
} as const
