import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from './useAuth'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { token, loading } = useAuth()
  const location = useLocation()

  if (loading) return null
  if (!token) return <Navigate to="/login" state={{ from: location }} replace />

  return <>{children}</>
}
