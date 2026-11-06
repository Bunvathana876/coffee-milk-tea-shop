import { useCallback, useEffect, useState } from 'react'
import { ArrowUpRight, Clock3, Coffee, ReceiptText, Users } from 'lucide-react'
import { useAuth } from '../auth/authContext'
import { getDashboardSummary, type DashboardSummary } from '../lib/api'
import { EmptyState, ErrorState, LoadingState } from '../components/States'

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
const number = new Intl.NumberFormat('en-US')

export function AdminDashboard() {
  const { token, user } = useAuth()
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const retry = useCallback(() => {
    setError('')
    setLoading(true)
    setRevision(value => value + 1)
  }, [])

  useEffect(() => {
    if (!token) return
    let active = true
    getDashboardSummary(token).then(data => {
      if (active) { setSummary(data); setLoading(false) }
    }).catch(cause => {
      if (active) { setError(cause instanceof Error ? cause.message : 'Unable to load dashboard.'); setLoading(false) }
    })
    return () => { active = false }
  }, [token, revision])

  const firstName = user?.full_name?.trim().split(/\s+/)[0] || 'there'
  const completedShare = summary?.total_orders ? Math.round((summary.completed_orders / summary.total_orders) * 100) : 0
  const pendingShare = summary?.total_orders ? Math.round((summary.pending_orders / summary.total_orders) * 100) : 0

  return <div className="page-stack">
    <div className="page-heading"><div><div className="eyebrow">OVERVIEW</div><h1>Good day, {firstName}<span className="heading-period">.</span></h1><p>Here is what is happening across your café.</p></div><span className="heading-pill"><span className="live-dot" /> Live data</span></div>
    {loading ? <LoadingState label="Loading café overview…" /> : error ? <ErrorState message={error} retry={retry} /> : summary && <>
      <div className="kpi-grid">
        <article className="kpi-card"><div className="kpi-top"><span>Recorded revenue</span><span className="kpi-icon caramel"><ArrowUpRight size={20} /></span></div><strong>{money.format(summary.total_sales_usd)}</strong><small>Paid and completed orders only</small></article>
        <article className="kpi-card"><div className="kpi-top"><span>Total orders</span><span className="kpi-icon matcha"><ReceiptText size={20} /></span></div><strong>{number.format(summary.total_orders)}</strong><small>Across all statuses</small></article>
        <article className="kpi-card"><div className="kpi-top"><span>Pending orders</span><span className="kpi-icon cream"><Clock3 size={20} /></span></div><strong>{number.format(summary.pending_orders)}</strong><small>Waiting to be prepared</small></article>
        <article className="kpi-card"><div className="kpi-top"><span>Customers</span><span className="kpi-icon soft"><Users size={20} /></span></div><strong>{number.format(summary.total_customers)}</strong><small>Registered accounts</small></article>
      </div>
      <div className="dashboard-grid">
        <section className="panel recent-panel"><div className="panel-header"><div><div className="eyebrow">ACTIVITY</div><h2>Recent orders</h2></div><span className="panel-note">Latest 5</span></div>
          {summary.recent_orders.length === 0 ? <EmptyState title="No orders yet" detail="New orders will appear here when customers check out." /> : <div className="table-scroll"><table><caption className="sr-only">Five most recent café orders</caption><thead><tr><th scope="col">Order</th><th scope="col">Customer</th><th scope="col">Status</th><th scope="col" className="numeric">Total</th></tr></thead><tbody>{summary.recent_orders.map(order => <tr key={order.id}><td><strong>{order.order_number}</strong></td><td>{order.customer_name}</td><td><span className={`status-badge status-${order.order_status}`}>{order.order_status}</span></td><td className="numeric">{money.format(Number(order.total_usd))}</td></tr>)}</tbody></table></div>}
        </section>
        <section className="panel flow-panel"><div className="panel-header"><div><div className="eyebrow">ORDER FLOW</div><h2>At a glance</h2></div><span className="flow-icon"><Coffee size={19} /></span></div><p className="flow-intro">A simple view of current order statuses.</p><div className="flow-list"><div><div className="flow-row"><span>Completed</span><strong>{number.format(summary.completed_orders)}</strong></div><div className="flow-track"><span className="flow-fill matcha-fill" style={{ width: `${completedShare}%` }} /></div></div><div><div className="flow-row"><span>Pending</span><strong>{number.format(summary.pending_orders)}</strong></div><div className="flow-track"><span className="flow-fill caramel-fill" style={{ width: `${pendingShare}%` }} /></div></div></div><p className="flow-footnote">Based on {number.format(summary.total_orders)} recorded orders.</p></section>
      </div>
    </>}
  </div>
}
