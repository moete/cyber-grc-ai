import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore, type AuthState } from '@/stores/auth'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const isAuthenticated = useAuthStore((s: AuthState) => s.isAuthenticated())

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}
