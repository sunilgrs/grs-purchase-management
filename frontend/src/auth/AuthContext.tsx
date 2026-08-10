import { createContext, useCallback, useMemo, useState, type ReactNode } from 'react'
import { api, clearSession, getSessionUser, getToken, setSession } from '../lib/api'
import type { AuthUser } from '../types'

export interface AuthContextValue {
  user: AuthUser | null
  token: string | null
  loading: boolean
  login: (username: string, password: string) => Promise<void>
  register: (payload: Record<string, unknown>) => Promise<void>
  logout: () => void
  hasFeature: (feature: string) => boolean
  isAdmin: boolean
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

type AuthResponse = AuthUser & { accessToken: string }

function extractAuth(res: AuthResponse): { token: string; user: AuthUser } {
  const { accessToken, ...user } = res
  return { token: accessToken, user }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => getSessionUser<AuthUser>())
  const [token, setToken] = useState<string | null>(() => getToken())
  const [loading, setLoading] = useState(false)

  const login = useCallback(async (username: string, password: string) => {
    setLoading(true)
    try {
      const res = await api.post<AuthResponse>('/auth/login', {
        username,
        password,
      })
      const { token, user } = extractAuth(res)
      setSession(token, user)
      setToken(token)
      setUser(user)
    } finally {
      setLoading(false)
    }
  }, [])

  const register = useCallback(async (payload: Record<string, unknown>) => {
    setLoading(true)
    try {
      const res = await api.post<AuthResponse>('/auth/register', payload)
      const { token, user } = extractAuth(res)
      setSession(token, user)
      setToken(token)
      setUser(user)
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    clearSession()
    setToken(null)
    setUser(null)
  }, [])

  const hasFeature = useCallback(
    (feature: string) => {
      if (!user) return false
      if (user.role === 'ADMIN' && (feature === 'users' || feature === 'settings'))
        return true
      if (user.permissions === null || user.permissions === undefined)
        return true
      return user.permissions.includes(feature)
    },
    [user],
  )

  const isAdmin = user?.role === 'ADMIN'

  const value = useMemo(
    () => ({ user, token, loading, login, register, logout, hasFeature, isAdmin }),
    [user, token, loading, login, register, logout, hasFeature, isAdmin],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export { AuthContext }
