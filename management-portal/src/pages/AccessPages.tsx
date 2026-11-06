import { LockKeyhole, ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/authContext'
import { supportedLandingPath } from '../lib/access'

export function AccessDeniedPage() {
  const { user } = useAuth()
  return <div className="center-page"><span className="planned-icon"><LockKeyhole size={28} /></span><div className="eyebrow">ACCESS RESTRICTED</div><h1>This workspace is unavailable.</h1><p>Seller access requires server-side seller roles, store ownership, and scoped APIs. Your current account cannot open this area.</p><Link className="button-primary" to={supportedLandingPath(user?.role) || '/login'}><ArrowLeft size={17} /> Return to workspace</Link></div>
}

export function NotFoundPage() {
  const { user } = useAuth()
  return <div className="center-page"><div className="eyebrow">PAGE NOT FOUND</div><h1>We could not find that page.</h1><Link className="button-primary" to={supportedLandingPath(user?.role) || '/login'}><ArrowLeft size={17} /> Return to workspace</Link></div>
}
