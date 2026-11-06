import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { canAccess, type PortalRole } from '../lib/access'
import { useAuth } from '../auth/authContext'
import { LoadingState } from './States'

export function RoleGate({ area }: { area: PortalRole }) {
  const { status, user } = useAuth()
  const location = useLocation()
  if (status === 'loading') return <LoadingState label="Checking your session…" />
  if (status === 'guest') return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (!canAccess(user?.role, area)) return <Navigate to="/access-denied" replace />
  return <Outlet />
}
