import { createContext, useContext } from 'react'
import type { StaffProfile } from '../lib/api'

export type AuthStatus = 'loading' | 'guest' | 'ready'

export interface AuthContextValue {
  status: AuthStatus
  token: string | null
  user: StaffProfile | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
