import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { getStaffProfile, loginStaff, SESSION_INVALID_EVENT, type StaffProfile } from '../lib/api'
import { supportedLandingPath } from '../lib/access'
import { AuthContext, type AuthStatus } from './authContext'

const TOKEN_KEY = 'brew_boba_management_token'

function readToken(): string | null {
  try { return sessionStorage.getItem(TOKEN_KEY) } catch { return null }
}

function saveToken(token: string | null) {
  try {
    if (token) sessionStorage.setItem(TOKEN_KEY, token)
    else sessionStorage.removeItem(TOKEN_KEY)
  } catch {
    // In-memory state still works when storage is disabled.
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [token, setToken] = useState<string | null>(null)
  const [user, setUser] = useState<StaffProfile | null>(null)

  const logout = useCallback(() => {
    saveToken(null)
    setToken(null)
    setUser(null)
    setStatus('guest')
  }, [])

  useEffect(() => {
    let active = true
    const storedToken = readToken()
    if (!storedToken) {
      setStatus('guest')
      return
    }
    getStaffProfile(storedToken)
      .then(profile => {
        if (!active) return
        if (!profile.is_active || !supportedLandingPath(profile.role)) {
          logout()
          return
        }
        setToken(storedToken)
        setUser(profile)
        setStatus('ready')
      })
      .catch(() => { if (active) logout() })
    return () => { active = false }
  }, [logout])

  useEffect(() => {
    window.addEventListener(SESSION_INVALID_EVENT, logout)
    return () => window.removeEventListener(SESSION_INVALID_EVENT, logout)
  }, [logout])

  useEffect(() => {
    if (!token) return
    let active = true
    async function verifyOnFocus() {
      try {
        const profile = await getStaffProfile(token as string)
        if (!active) return
        if (!profile.is_active || !supportedLandingPath(profile.role)) logout()
        else setUser(profile)
      } catch {
        if (active) logout()
      }
    }
    window.addEventListener('focus', verifyOnFocus)
    return () => { active = false; window.removeEventListener('focus', verifyOnFocus) }
  }, [token, logout])

  async function login(email: string, password: string) {
    const result = await loginStaff(email.trim().toLowerCase(), password)
    // The profile is loaded from the server's current database record.
    const profile = await getStaffProfile(result.access_token)
    if (!profile.is_active || !supportedLandingPath(profile.role)) {
      throw new Error('This portal currently supports administrator accounts only.')
    }
    saveToken(result.access_token)
    setToken(result.access_token)
    setUser(profile)
    setStatus('ready')
  }

  return (
    <AuthContext.Provider value={{ status, token, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
