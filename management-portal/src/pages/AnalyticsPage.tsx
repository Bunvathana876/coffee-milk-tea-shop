import { useEffect, useState } from 'react'
import { useAuth } from '../auth/authContext'
import { EmptyState, ErrorState, LoadingState } from '../components/States'
import { getSalesReport, type SalesReport } from '../lib/api'

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
const khr = new Intl.NumberFormat('en-US', { style: 'decimal', maximumFractionDigits: 0 })

export function AnalyticsPage() {
  const { token } = useAuth()
  const [report, setReport] = useState<SalesReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    if (!token) return
    let active = true
    getSalesReport(token).then(value => { if (active) { setReport(value); setLoading(false) } })
      .catch(cause => { if (active) { setError(cause instanceof Error ? cause.message : 'Report is unavailable.'); setLoading(false) } })
    return () => { active = false }
  }, [token, revision])
  function retry() { setError(''); setLoading(true); setRevision(value => value + 1) }
  return <div className="page-stack"><div className="page-heading"><div><div className="eyebrow">REPORTING</div><h1>Analytics<span className="heading-period">.</span></h1><p>Recorded revenue from paid, completed orders.</p></div></div>
    {loading ? <LoadingState label="Loading sales report…" /> : error ? <ErrorState message={error} retry={retry} /> : !report || report.total_orders === 0 ? <EmptyState title="No orders yet" detail="The sales report will appear after server orders are recorded." /> : <><div className="kpi-grid"><article className="kpi-card"><div className="kpi-top">Recorded revenue · USD</div><strong>{usd.format(report.total_revenue_usd)}</strong><small>Paid and completed orders</small></article><article className="kpi-card"><div className="kpi-top">Recorded revenue · KHR</div><strong>៛{khr.format(report.total_revenue_khr)}</strong><small>Server-recorded conversion totals</small></article><article className="kpi-card"><div className="kpi-top">Total orders</div><strong>{report.total_orders}</strong><small>All payment and order statuses</small></article></div><p className="policy-note">Unpaid, pending, failed, and cancelled orders contribute zero revenue. KHQR selection is a demo and does not confirm payment. Historical paid records should be reconciled before financial use.</p></>}
  </div>
}
