import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ILoginResponse } from '@shared'
import { clearAuthToken, setAuthToken } from '@/lib/api'

type AuthUser = ILoginResponse['user']

export interface AuthState {
  token: string | null
  user: AuthUser | null
  setAuth: (data: ILoginResponse) => void
  logout: () => void
  isAuthenticated: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set): AuthState => ({
      token: null,
      user: null,
      setAuth: (data) => {
        setAuthToken(data.token)
        set({ token: data.token, user: data.user })
      },
      logout: () => {
        clearAuthToken()
        set({ token: null, user: null })
      },
      isAuthenticated: (): boolean => {
        const state = useAuthStore.getState() as AuthState
        return Boolean(state.token)
      },
    }),
    { name: 'auth-storage' }
  )
)
