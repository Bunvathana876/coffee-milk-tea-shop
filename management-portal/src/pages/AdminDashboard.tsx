import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Coffee,
  FolderTree,
  Plus,
  ReceiptText,
  RotateCcw,
  ShoppingBag,
  Timer,
  Users,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/authContext'
import {
  getCategories,
  getDashboardSummary,
  getOrders,
  getProducts,
  type DashboardSummary,
  type OrderList,
} from '../lib/api'
import {
  ORDER_STATUS_CONFIG,
  getOrderStatusBadge,
} from '../lib/orderStatus'
import { EmptyState, ErrorState, LoadingState } from '../components/States'

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
const number = new Intl.NumberFormat('en-US')

export function getStatusBadge(status: string) {
  return getOrderStatusBadge(status)
}

/**
 * Custom count-up animation hook with ease-out cubic curve.
 * Automatically respects prefers-reduced-motion and falls back to target in SSR/tests.
 */
export function useCountUp(target: number, duration = 650, delay = 250, enabled = true): number {
  const [current, setCurrent] = useState<number>(() => {
    if (typeof window === 'undefined' || !enabled) return target
    return 0
  })

  useEffect(() => {
    if (typeof window === 'undefined' || !enabled || target === 0) {
      setCurrent(target)
      return
    }

    const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
    if (prefersReduced) {
      setCurrent(target)
      return
    }

    let frameId: number
    let startTimestamp: number | null = null

    const timeoutId = setTimeout(() => {
      const step = (timestamp: number) => {
        if (!startTimestamp) startTimestamp = timestamp
        const progress = Math.min((timestamp - startTimestamp) / duration, 1)
        const easeOut = 1 - Math.pow(1 - progress, 3)
        setCurrent(Math.round(easeOut * target * 100) / 100)

        if (progress < 1) {
          frameId = requestAnimationFrame(step)
        } else {
          setCurrent(target)
        }
      }
      frameId = requestAnimationFrame(step)
    }, delay)

    return () => {
      clearTimeout(timeoutId)
      cancelAnimationFrame(frameId)
    }
  }, [target, duration, delay, enabled])

  return current
}

/**
 * SECTION D — Café Operations Center
 * Real operational status panel driven by authoritative server counts:
 * Pending (awaiting prep), Preparing (being crafted at bar), Ready (awaiting pickup/handoff).
 * Accurately shows an all-clear state only when all actionable stages are zero.
 */
export function OperationsCenterPanel({
  statusCounts,
  pendingOrders = 0,
}: {
  statusCounts?: StatusCounts
  pendingOrders?: number
}) {
  const pending = statusCounts ? (statusCounts.pending || 0) : pendingOrders
  const preparing = statusCounts ? (statusCounts.preparing || 0) : 0
  const ready = statusCounts ? (statusCounts.ready || 0) : 0
  const totalActionable = pending + preparing + ready

  if (totalActionable === 0) {
    return (
      <div className="operations-center-panel all-clear" role="region" aria-label="Café Operations Status">
        <div className="operations-header-content">
          <div className="operations-icon-badge emerald" aria-hidden="true">
            <CheckCircle2 size={20} />
          </div>
          <div className="operations-header-text">
            <h3>Café floor is clear</h3>
            <p>No active orders waiting in the barista queue, at crafting stations, or at the pickup counter.</p>
          </div>
        </div>
        <Link
          to="/admin/orders"
          className="button-secondary operations-all-clear-btn"
        >
          <span>View All Orders</span>
          <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </div>
    )
  }

  return (
    <div className="operations-center-panel active-work" role="region" aria-label="Café Operations Center">
      <div className="operations-summary-bar">
        <div className="flex items-center gap-2">
          <span className="live-dot" aria-hidden="true" />
          <span className="eyebrow">CAFÉ OPERATIONS CENTER</span>
        </div>
        <span className="operations-status-pill">
          {totalActionable} {totalActionable === 1 ? 'active order' : 'active orders'} in progress
        </span>
      </div>

      <div className="operations-stages-grid">
        {/* Stage 1: Pending */}
        <div className={`operations-stage-card ${pending > 0 ? 'stage-pending' : 'stage-idle'}`}>
          <div className="stage-card-top">
            <span className="stage-label flex items-center gap-1.5">
              <Clock3 size={14} className={pending > 0 ? 'text-amber-500' : 'text-slate-400'} aria-hidden="true" />
              Awaiting Preparation
            </span>
            <strong className="stage-count">{pending}</strong>
          </div>
          <p className="stage-desc">
            {pending > 0
              ? `${pending} ${pending === 1 ? 'order waiting' : 'orders waiting'} in queue.`
              : 'Barista queue is clear.'}
          </p>
          {pending > 0 ? (
            <Link
              to="/admin/orders?status=pending"
              className="button-primary stage-action-link"
              title="Filter orders by Pending"
            >
              <span>View Pending ({pending})</span>
              <ArrowRight size={13} aria-hidden="true" />
            </Link>
          ) : (
            <span className="stage-cleared-tag">Cleared</span>
          )}
        </div>

        {/* Stage 2: Preparing */}
        <div className={`operations-stage-card ${preparing > 0 ? 'stage-preparing' : 'stage-idle'}`}>
          <div className="stage-card-top">
            <span className="stage-label flex items-center gap-1.5">
              <Coffee size={14} className={preparing > 0 ? 'text-blue-500' : 'text-slate-400'} aria-hidden="true" />
              At Crafting Station
            </span>
            <strong className="stage-count">{preparing}</strong>
          </div>
          <p className="stage-desc">
            {preparing > 0
              ? `${preparing} ${preparing === 1 ? 'drink' : 'drinks'} currently being prepared.`
              : 'Bar is ready for incoming orders.'}
          </p>
          {preparing > 0 ? (
            <Link
              to="/admin/orders?status=preparing"
              className="button-secondary stage-action-link"
              title="Filter orders by Preparing"
            >
              <span>In Prep ({preparing})</span>
              <ArrowRight size={13} aria-hidden="true" />
            </Link>
          ) : (
            <span className="stage-cleared-tag">Idle</span>
          )}
        </div>

        {/* Stage 3: Ready */}
        <div className={`operations-stage-card ${ready > 0 ? 'stage-ready' : 'stage-idle'}`}>
          <div className="stage-card-top">
            <span className="stage-label flex items-center gap-1.5">
              <CheckCircle2 size={14} className={ready > 0 ? 'text-purple-500' : 'text-slate-400'} aria-hidden="true" />
              Ready for Pickup
            </span>
            <strong className="stage-count">{ready}</strong>
          </div>
          <p className="stage-desc">
            {ready > 0
              ? `${ready} ${ready === 1 ? 'order' : 'orders'} waiting for counter handoff.`
              : 'No orders awaiting customer pickup.'}
          </p>
          {ready > 0 ? (
            <Link
              to="/admin/orders?status=ready"
              className="button-secondary stage-action-link"
              title="Filter orders by Ready"
            >
              <span>Ready for Handoff ({ready})</span>
              <ArrowRight size={13} aria-hidden="true" />
            </Link>
          ) : (
            <span className="stage-cleared-tag">None</span>
          )}
        </div>
      </div>

      <div className="operations-footnote">
        <span className="text-xs text-slate-500 dark:text-zinc-400">
          Payment status is independent from fulfillment stage. Orders ready for counter handoff require customer receipt verification.
        </span>
      </div>
    </div>
  )
}

export function PendingShortcutBanner({
  pendingOrders,
  statusCounts,
}: {
  pendingOrders: number
  statusCounts?: StatusCounts
}) {
  if (statusCounts) {
    return <OperationsCenterPanel statusCounts={statusCounts} pendingOrders={pendingOrders} />
  }

  // Standalone shortcut banner backward-compatibility
  if (pendingOrders > 0) {
    return (
      <div className="pending-alert-banner" role="region" aria-label="Order action alert">
        <div className="pending-alert-content">
          <div className="pending-alert-icon" aria-hidden="true">
            <AlertCircle size={20} />
          </div>
          <div className="pending-alert-text">
            <h3>Orders need attention</h3>
            <p>
              You have <strong>{pendingOrders}</strong>{' '}
              {pendingOrders === 1 ? 'order' : 'orders'} waiting in the queue.
            </p>
          </div>
        </div>
        <Link
          to="/admin/orders?status=pending"
          className="button-primary pending-alert-button"
        >
          <span>View Pending Orders</span>
          <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </div>
    )
  }

  return (
    <div className="all-clear-banner" role="region" aria-label="Queue status">
      <div className="all-clear-content">
        <div className="all-clear-icon" aria-hidden="true">
          <CheckCircle2 size={18} />
        </div>
        <div className="all-clear-text">
          <h3>All orders up to date</h3>
          <p>No pending orders waiting in the queue.</p>
        </div>
      </div>
      <Link
        to="/admin/orders"
        className="button-secondary all-clear-button"
      >
        <span>View Order Queue</span>
        <ArrowRight size={14} aria-hidden="true" />
      </Link>
    </div>
  )
}

export function QuickActionsBar() {
  return (
    <div className="quick-actions-bar" aria-label="Quick management actions">
      <Link to="/admin/orders" className="quick-action-pill">
        <ShoppingBag size={14} aria-hidden="true" />
        <span>Manage Orders</span>
      </Link>
      <Link to="/admin/products?action=new" className="quick-action-pill highlight">
        <Plus size={14} aria-hidden="true" />
        <span>Add Drink</span>
      </Link>
      <Link to="/admin/categories" className="quick-action-pill">
        <FolderTree size={14} aria-hidden="true" />
        <span>Categories</span>
      </Link>
      <Link to="/admin/analytics" className="quick-action-pill">
        <BarChart3 size={14} aria-hidden="true" />
        <span>View Analytics</span>
      </Link>
    </div>
  )
}

export interface StatusCounts {
  pending: number
  preparing: number
  ready: number
  completed: number
  cancelled: number
}

/**
 * Large Panel (~65% width): Order Activity Bar Chart
 * Visualizes real order activity across authoritative café order stages:
 * Pending -> Preparing -> Ready -> Completed -> Cancelled
 * Features clean grid lines, integer Y-axis ticks, rounded gradient bars,
 * and subtle baseline markers for zero-count stages.
 */
export function OrderActivityChart({
  statusCounts,
  totalOrders,
}: {
  statusCounts: StatusCounts
  totalOrders: number
}) {
  const statuses: {
    key: keyof StatusCounts
    label: string
    color: string
    gradient: [string, string]
  }[] = [
    { key: 'pending', label: ORDER_STATUS_CONFIG.pending.label, color: ORDER_STATUS_CONFIG.pending.color, gradient: ORDER_STATUS_CONFIG.pending.gradient },
    { key: 'preparing', label: ORDER_STATUS_CONFIG.preparing.label, color: ORDER_STATUS_CONFIG.preparing.color, gradient: ORDER_STATUS_CONFIG.preparing.gradient },
    { key: 'ready', label: ORDER_STATUS_CONFIG.ready.label, color: ORDER_STATUS_CONFIG.ready.color, gradient: ORDER_STATUS_CONFIG.ready.gradient },
    { key: 'completed', label: ORDER_STATUS_CONFIG.completed.label, color: ORDER_STATUS_CONFIG.completed.color, gradient: ORDER_STATUS_CONFIG.completed.gradient },
    { key: 'cancelled', label: ORDER_STATUS_CONFIG.cancelled.label, color: ORDER_STATUS_CONFIG.cancelled.color, gradient: ORDER_STATUS_CONFIG.cancelled.gradient },
  ]

  const maxCount = Math.max(0, ...Object.values(statusCounts))

  // Compute sensible integer ticks for Y-axis (from yMax down to 0)
  const { yMax, ticks } = useMemo(() => {
    let top = 5
    if (maxCount <= 6) {
      top = Math.max(5, maxCount)
      const list: number[] = []
      for (let i = top; i >= 0; i--) list.push(i)
      return { yMax: top, ticks: list }
    } else if (maxCount <= 12) {
      top = Math.ceil(maxCount / 2) * 2
      const list: number[] = []
      for (let i = top; i >= 0; i -= 2) list.push(i)
      return { yMax: top, ticks: list }
    } else if (maxCount <= 30) {
      top = Math.ceil(maxCount / 5) * 5
      const list: number[] = []
      for (let i = top; i >= 0; i -= 5) list.push(i)
      return { yMax: top, ticks: list }
    } else {
      const step = Math.ceil(maxCount / 5 / 10) * 10
      top = step * 5
      const list: number[] = []
      for (let i = top; i >= 0; i -= step) list.push(i)
      return { yMax: top, ticks: list }
    }
  }, [maxCount])

  const ariaDescription = statuses
    .map(s => {
      const cnt = statusCounts[s.key] || 0
      const pct = totalOrders > 0 ? Math.round((cnt / totalOrders) * 100) : 0
      return `${s.label}: ${cnt} (${pct}%)`
    })
    .join(', ')

  return (
    <section className="panel order-activity-panel" aria-labelledby="order-activity-heading">
      <div className="panel-header">
        <div>
          <div className="eyebrow">ORDER ACTIVITY</div>
          <h2 id="order-activity-heading">Order Activity</h2>
        </div>
        <div className="panel-badge-pill">
          <span>{totalOrders} Total Orders</span>
        </div>
      </div>
      <p className="panel-subtitle">Latest available order status counts</p>

      {totalOrders === 0 ? (
        <div className="empty-chart-state" role="status">
          <p>No orders recorded yet. As orders are placed, the activity distribution will display here.</p>
        </div>
      ) : (
        <div
          className="order-activity-chart-container"
          role="img"
          aria-label={`Order activity chart: ${ariaDescription}`}
        >
          {/* Top row with bold count and percentage */}
          <div className="activity-chart-stat-row">
            <div className="activity-yaxis-spacer" aria-hidden="true" />
            <div className="activity-columns-stat-grid">
              {statuses.map(s => {
                const count = statusCounts[s.key] || 0
                const pct = totalOrders > 0 ? Math.round((count / totalOrders) * 100) : 0
                return (
                  <div key={`stat-${s.key}`} className="activity-stat-cell">
                    <strong className="activity-stat-count">{number.format(count)}</strong>
                    <span className="activity-stat-pct">{pct}%</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Plot Area with Y-axis ticks, Grid lines, and Vertical Bars */}
          <div className="activity-plot-wrapper">
            <div className="activity-yaxis" aria-hidden="true">
              {ticks.map(t => (
                <span key={`tick-${t}`} className="activity-yaxis-tick">
                  {t}
                </span>
              ))}
            </div>

            <div className="activity-plot-area">
              {/* Horizontal Grid lines */}
              <div className="activity-grid-lines" aria-hidden="true">
                {ticks.map(t => {
                  const isBaseline = t === 0
                  return (
                    <div
                      key={`grid-${t}`}
                      className={`activity-grid-line ${isBaseline ? 'is-baseline' : ''}`}
                    />
                  )
                })}
              </div>

              {/* Vertical Bars layer */}
              <div className="activity-bars-layer">
                {statuses.map(s => {
                  const count = statusCounts[s.key] || 0
                  const pct = totalOrders > 0 ? Math.round((count / totalOrders) * 100) : 0
                  const hasActivity = count > 0
                  const barHeightPct = hasActivity && yMax > 0
                    ? Math.round((count / yMax) * 100)
                    : 0

                  return (
                    <div key={s.key} className="activity-bar-slot">
                      {hasActivity ? (
                        <div
                          className="activity-bar-fill"
                          style={{
                            height: `${barHeightPct}%`,
                            background: `linear-gradient(180deg, ${s.gradient[0]} 0%, ${s.gradient[1]} 100%)`,
                            boxShadow: `0 4px 14px ${s.color}33`,
                          }}
                          title={`${s.label}: ${count} (${pct}%)`}
                        />
                      ) : (
                        <div
                          className="activity-bar-baseline-pill"
                          title={`${s.label}: 0 (0%)`}
                          aria-hidden="true"
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Bottom row with stage labels */}
          <div className="activity-labels-row">
            <div className="activity-yaxis-spacer" aria-hidden="true" />
            <div className="activity-labels-grid">
              {statuses.map(s => (
                <span key={`label-${s.key}`} className="activity-bar-label">
                  {s.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

/**
 * Small Panel (~35% width): Order Breakdown Donut Chart
 * Large centered donut SVG with centered total orders and cleanly aligned legend.
 * Correctly displays all 5 stage labels in legend.
 */
export function OrderBreakdownDonut({
  statusCounts,
  totalOrders,
}: {
  statusCounts: StatusCounts
  totalOrders: number
}) {
  const animatedTotal = useCountUp(totalOrders, 650, 250)

  // Donut geometry:
  // ViewBox: 0 0 240 240, Center = (120, 120), Radius = 76, StrokeWidth = 26
  // Circumference = 2 * PI * 76 ≈ 477.522
  const radius = 76
  const strokeWidth = 26
  const circumference = 2 * Math.PI * radius

  const config: { key: keyof StatusCounts; label: string; color: string }[] = [
    { key: 'pending', label: ORDER_STATUS_CONFIG.pending.label, color: ORDER_STATUS_CONFIG.pending.color },
    { key: 'preparing', label: ORDER_STATUS_CONFIG.preparing.label, color: ORDER_STATUS_CONFIG.preparing.color },
    { key: 'ready', label: ORDER_STATUS_CONFIG.ready.label, color: ORDER_STATUS_CONFIG.ready.color },
    { key: 'completed', label: ORDER_STATUS_CONFIG.completed.label, color: ORDER_STATUS_CONFIG.completed.color },
    { key: 'cancelled', label: ORDER_STATUS_CONFIG.cancelled.label, color: ORDER_STATUS_CONFIG.cancelled.color },
  ]

  const activeSegmentsCount = config.filter(c => (statusCounts[c.key] || 0) > 0).length

  const segments = useMemo(() => {
    if (totalOrders <= 0) return []
    const list: {
      key: keyof StatusCounts
      label: string
      count: number
      pct: number
      color: string
      dashArray: string
      dashOffset: number
    }[] = []

    const gap = activeSegmentsCount > 1 ? 5 : 0
    let accumulatedOffset = 0

    for (const item of config) {
      const count = statusCounts[item.key] || 0
      if (count > 0) {
        const fraction = count / totalOrders
        const rawArc = fraction * circumference
        const arcLength = Math.max(2, rawArc - gap)
        const dashOffset = -accumulatedOffset

        list.push({
          key: item.key,
          label: item.label,
          count,
          pct: Math.round(fraction * 100),
          color: item.color,
          dashArray: `${arcLength} ${circumference}`,
          dashOffset,
        })
        accumulatedOffset += rawArc
      }
    }
    return list
  }, [statusCounts, totalOrders, circumference, activeSegmentsCount])

  return (
    <section className="panel order-breakdown-panel" aria-labelledby="order-breakdown-heading">
      <div className="panel-header">
        <div>
          <div className="eyebrow">DISTRIBUTION</div>
          <h2 id="order-breakdown-heading">Order Breakdown</h2>
        </div>
        <span className="flow-icon" aria-hidden="true">
          <Coffee size={18} />
        </span>
      </div>
      <p className="panel-subtitle">Status share of total café orders</p>

      <div className="donut-visualization-area">
        <div className="donut-svg-wrapper">
          <svg
            className="donut-svg"
            viewBox="0 0 240 240"
            role="img"
            aria-label={`Donut chart showing order breakdown. Total: ${totalOrders}`}
          >
            {/* Background track circle */}
            <circle
              className="donut-bg-track"
              cx="120"
              cy="120"
              r={radius}
              fill="transparent"
              strokeWidth={strokeWidth}
            />
            {totalOrders > 0 &&
              segments.map(seg => (
                <circle
                  key={seg.key}
                  className="donut-segment"
                  cx="120"
                  cy="120"
                  r={radius}
                  fill="transparent"
                  stroke={seg.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={seg.dashArray}
                  strokeDashoffset={seg.dashOffset}
                  strokeLinecap="round"
                  transform="rotate(-90 120 120)"
                />
              ))}
          </svg>
          <div className="donut-center-copy" aria-hidden="true">
            <span className="donut-center-value">
              {number.format(Math.round(animatedTotal))}
            </span>
            <span className="donut-center-label">Total Orders</span>
          </div>
        </div>

        {/* Accessible Legend showing all 5 order stages */}
        <div className="donut-legend" role="list" aria-label="Status distribution legend">
          {totalOrders === 0 ? (
            <p className="donut-legend-empty">0 recorded orders</p>
          ) : (
            config.map(item => {
              const count = statusCounts[item.key] || 0
              const pct = totalOrders > 0 ? Math.round((count / totalOrders) * 100) : 0
              const isActive = count > 0

              return (
                <div key={item.key} className="donut-legend-item" role="listitem">
                  <span className="donut-legend-left">
                    <span
                      className={`donut-legend-dot ${isActive ? 'is-active' : 'is-zero'}`}
                      style={{ backgroundColor: isActive ? item.color : undefined }}
                      aria-hidden="true"
                    />
                    <span className="donut-legend-name">{item.label}</span>
                  </span>
                  <span className="donut-legend-right">
                    <strong>{number.format(count)}</strong>
                    <span className="donut-legend-pct">({pct}%)</span>
                  </span>
                </div>
              )
            })
          )}
        </div>
      </div>
    </section>
  )
}

/**
 * Backward-compatible OrderPipelineWidget for test assertions.
 */
export function OrderPipelineWidget({ summary }: { summary: DashboardSummary }) {
  const total = summary.total_orders || 0
  const completed = summary.completed_orders || 0
  const pending = summary.pending_orders || 0
  const other = Math.max(0, total - completed - pending)

  const completedPct = total > 0 ? Math.round((completed / total) * 100) : 0
  const pendingPct = total > 0 ? Math.round((pending / total) * 100) : 0
  const otherPct = total > 0 ? Math.round((other / total) * 100) : 0

  return (
    <section className="panel flow-panel" aria-labelledby="pipeline-heading">
      <div className="panel-header">
        <div>
          <div className="eyebrow">ORDER PIPELINE</div>
          <h2 id="pipeline-heading">Fulfillment Pipeline</h2>
        </div>
        <span className="flow-icon" aria-hidden="true">
          <Coffee size={18} />
        </span>
      </div>
      <p className="flow-intro">Status breakdown across all recorded orders.</p>

      <div className="pipeline-segment-bar" role="progressbar" aria-label="Order distribution">
        {completedPct > 0 && (
          <span
            className="pipeline-segment bg-emerald-500"
            style={{ width: `${completedPct}%` }}
            title={`Completed: ${completed} (${completedPct}%)`}
          />
        )}
        {pendingPct > 0 && (
          <span
            className="pipeline-segment bg-amber-500"
            style={{ width: `${pendingPct}%` }}
            title={`Pending: ${pending} (${pendingPct}%)`}
          />
        )}
        {otherPct > 0 && (
          <span
            className="pipeline-segment bg-blue-500"
            style={{ width: `${otherPct}%` }}
            title={`In-Flight/Other: ${other} (${otherPct}%)`}
          />
        )}
      </div>

      <div className="flow-list">
        <div className="flow-item">
          <div className="flow-row">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-emerald-500 inline mr-1" aria-hidden="true" />
              Completed
            </span>
            <strong>
              {number.format(completed)}
              <span className="text-zinc-500 font-normal text-xs ml-1.5">({completedPct}%)</span>
            </strong>
          </div>
          <div className="flow-track">
            <span
              className="flow-fill emerald-fill"
              style={{ width: `${completedPct}%` }}
              aria-label={`Completed orders: ${completedPct}%`}
            />
          </div>
        </div>

        <div className="flow-item">
          <div className="flow-row">
            <span className="flex items-center gap-1.5">
              <Timer size={14} className="text-amber-500 inline mr-1" aria-hidden="true" />
              Pending
            </span>
            <strong>
              {number.format(pending)}
              <span className="text-zinc-500 font-normal text-xs ml-1.5">({pendingPct}%)</span>
            </strong>
          </div>
          <div className="flow-track">
            <span
              className="flow-fill amber-fill"
              style={{ width: `${pendingPct}%` }}
              aria-label={`Pending orders: ${pendingPct}%`}
            />
          </div>
        </div>

        {other > 0 && (
          <div className="flow-item">
            <div className="flow-row">
              <span className="flex items-center gap-1.5">
                <Clock3 size={14} className="text-blue-500 inline mr-1" aria-hidden="true" />
                Preparing / In-Flight
              </span>
              <strong>
                {number.format(other)}
                <span className="text-zinc-500 font-normal text-xs ml-1.5">({otherPct}%)</span>
              </strong>
            </div>
            <div className="flow-track">
              <span
                className="flow-fill slate-fill"
                style={{ width: `${otherPct}%` }}
                aria-label={`In-flight orders: ${otherPct}%`}
              />
            </div>
          </div>
        )}
      </div>

      <p className="flow-footnote">
        Based on {number.format(total)} recorded {total === 1 ? 'order' : 'orders'}.
      </p>
    </section>
  )
}

export function MenuHealthWidget({
  catalogHealth,
}: {
  catalogHealth: { totalProducts: number; availableProducts: number; categoriesCount: number } | null
}) {
  if (!catalogHealth) return null
  const { totalProducts, availableProducts, categoriesCount } = catalogHealth
  const unavailable = totalProducts - availableProducts
  const healthRate = totalProducts > 0 ? Math.round((availableProducts / totalProducts) * 100) : 100

  return (
    <section className="panel menu-health-panel" aria-labelledby="menu-health-heading">
      <div className="panel-header">
        <div>
          <div className="eyebrow">CATALOG HEALTH</div>
          <h2 id="menu-health-heading">Drink Menu Status</h2>
        </div>
        <Link to="/admin/products" className="text-link text-xs flex items-center gap-1 font-bold">
          <span>Manage drinks</span>
          <ArrowRight size={13} aria-hidden="true" />
        </Link>
      </div>

      <div className="menu-health-metrics">
        <div className="menu-health-stat">
          <span className="stat-num">{totalProducts}</span>
          <span className="stat-desc">Total Items</span>
        </div>
        <div className="menu-health-stat">
          <span className="stat-num">{categoriesCount}</span>
          <span className="stat-desc">Categories</span>
        </div>
        <div className="menu-health-stat">
          <span className={`stat-num ${unavailable > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
            {healthRate}%
          </span>
          <span className="stat-desc">Available</span>
        </div>
      </div>
    </section>
  )
}

export function AdminDashboard() {
  const { token, user } = useAuth()
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [orderList, setOrderList] = useState<OrderList | null>(null)
  const [catalogHealth, setCatalogHealth] = useState<{
    totalProducts: number
    availableProducts: number
    categoriesCount: number
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)

  const retry = useCallback(() => {
    setError('')
    setLoading(true)
    setRevision(value => value + 1)
  }, [])

  useEffect(() => {
    if (!token) return
    let active = true

    Promise.all([
      getDashboardSummary(token),
      getOrders(token, 'all', 0).catch(() => null),
      getProducts(token).catch(() => []),
      getCategories(token).catch(() => []),
    ])
      .then(([summaryData, ordersData, productsData, categoriesData]) => {
        if (active) {
          setSummary(summaryData)
          if (ordersData) {
            setOrderList(ordersData)
          }
          if (Array.isArray(productsData) && Array.isArray(categoriesData)) {
            const avail = productsData.filter(p => p.is_available).length
            setCatalogHealth({
              totalProducts: productsData.length,
              availableProducts: avail,
              categoriesCount: categoriesData.length,
            })
          }
          setLastRefreshed(new Date())
          setLoading(false)
        }
      })
      .catch(cause => {
        if (active) {
          setError(
            cause instanceof Error ? cause.message : 'Unable to load dashboard overview.'
          )
          setLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [token, revision])

  // Compute status counts for charts derived strictly from server records
  const statusCounts: StatusCounts = useMemo(() => {
    if (orderList?.counts_by_status) {
      return {
        pending: Number(orderList.counts_by_status.pending || 0),
        preparing: Number(orderList.counts_by_status.preparing || 0),
        ready: Number(orderList.counts_by_status.ready || 0),
        completed: Number(orderList.counts_by_status.completed || 0),
        cancelled: Number(orderList.counts_by_status.cancelled || 0),
      }
    }
    if (orderList?.items && orderList.items.length > 0) {
      const counts: StatusCounts = { pending: 0, preparing: 0, ready: 0, completed: 0, cancelled: 0 }
      for (const order of orderList.items) {
        const s = (order.order_status || '').toLowerCase() as keyof StatusCounts
        if (s in counts) {
          counts[s] = (counts[s] || 0) + 1
        }
      }
      return counts
    }
    const completed = Number(summary?.completed_orders || 0)
    const pending = Number(summary?.pending_orders || 0)
    return {
      pending,
      preparing: 0,
      ready: 0,
      completed,
      cancelled: 0,
    }
  }, [orderList, summary])

  // Count-up values (waits 250ms for card entrance, counts over 650ms, ends at ~900ms)
  const animatedRevenue = useCountUp(summary?.total_sales_usd || 0, 650, 250, !loading && !!summary)
  const animatedCustomers = useCountUp(summary?.total_customers || 0, 600, 250, !loading && !!summary)
  const animatedOrders = useCountUp(summary?.total_orders || 0, 600, 250, !loading && !!summary)
  const animatedPending = useCountUp(summary?.pending_orders || 0, 500, 250, !loading && !!summary)

  return (
    <div className="page-stack dashboard-page-enter">
      {/* SECTION A — Page Header */}
      <div className="page-heading dashboard-welcome-header">
        <div>
          <div className="eyebrow">CONTROL CENTER</div>
          <h1>Dashboard</h1>
          <p>
            Welcome back, {user?.full_name || 'Administrator'}. Here&apos;s what&apos;s happening at your café.
          </p>
        </div>
        <div className="dashboard-header-actions flex items-center gap-2">
          <span className="heading-pill">
            <span className="live-dot" aria-hidden="true" />
            <span>Latest available data</span>
            {lastRefreshed && (
              <span className="text-xs font-normal text-emerald-500 dark:text-emerald-400 ml-1">
                · {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </span>
          <button
            type="button"
            className="icon-button"
            onClick={retry}
            aria-label="Refresh café overview"
            title="Refresh café overview"
          >
            <RotateCcw size={15} aria-hidden="true" />
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingState label="Loading café overview…" />
      ) : error ? (
        <ErrorState message={error} retry={retry} />
      ) : summary ? (
        <>
          {/* SECTION B — Four KPI Cards */}
          <div className="kpi-grid">
            <article className="kpi-card kpi-card-animated">
              <div className="kpi-top">
                <span>Recorded revenue</span>
                <span className="kpi-icon kpi-icon-emerald" aria-hidden="true">
                  <CircleDollarSign size={20} />
                </span>
              </div>
              <strong className="kpi-value-text">{money.format(animatedRevenue)}</strong>
              <small>Paid and completed orders only</small>
            </article>

            <article className="kpi-card kpi-card-animated">
              <div className="kpi-top">
                <span>Registered customers</span>
                <span className="kpi-icon kpi-icon-blue" aria-hidden="true">
                  <Users size={20} />
                </span>
              </div>
              <strong className="kpi-value-text">{number.format(Math.round(animatedCustomers))}</strong>
              <small>Customer accounts in database</small>
            </article>

            <article className="kpi-card kpi-card-animated">
              <div className="kpi-top">
                <span>Total orders</span>
                <span className="kpi-icon kpi-icon-purple" aria-hidden="true">
                  <ReceiptText size={20} />
                </span>
              </div>
              <strong className="kpi-value-text">{number.format(Math.round(animatedOrders))}</strong>
              <small>Across all order statuses</small>
            </article>

            <article className="kpi-card kpi-card-animated">
              <div className="kpi-top">
                <span>Pending orders</span>
                <span className="kpi-icon kpi-icon-amber" aria-hidden="true">
                  <Clock3 size={20} />
                </span>
              </div>
              <strong className="kpi-value-text">{number.format(Math.round(animatedPending))}</strong>
              <small>Waiting to be prepared</small>
            </article>
          </div>

          {/* SECTION C — Main Analytics Area (65% / 35% Layout) */}
          <div className="analytics-main-grid">
            <OrderActivityChart
              statusCounts={statusCounts}
              totalOrders={summary.total_orders}
            />
            <OrderBreakdownDonut
              statusCounts={statusCounts}
              totalOrders={summary.total_orders}
            />
          </div>

          {/* SECTION D — Café Operations Center */}
          <OperationsCenterPanel
            statusCounts={statusCounts}
            pendingOrders={summary.pending_orders}
          />

          {/* SECTION E — Compact Lower Dashboard */}
          <div className="dashboard-grid lower-panels-animated">
            <section className="panel recent-panel">
              <div className="panel-header">
                <div>
                  <div className="eyebrow">ACTIVITY</div>
                  <h2>Recent orders</h2>
                </div>
                <div className="flex items-center gap-3">
                  <span className="panel-note">Latest 5 orders</span>
                  <Link
                    to="/admin/orders"
                    className="text-link text-xs flex items-center gap-1 font-bold"
                  >
                    <span>View all</span>
                    <ArrowRight size={13} aria-hidden="true" />
                  </Link>
                </div>
              </div>

              {summary.recent_orders.length === 0 ? (
                <EmptyState
                  title="No orders yet"
                  detail="New orders will appear here when customers check out."
                />
              ) : (
                <div className="table-scroll">
                  <table className="recent-orders-table">
                    <caption className="sr-only">Five most recent café orders</caption>
                    <thead>
                      <tr>
                        <th scope="col">Order ID</th>
                        <th scope="col">Customer</th>
                        <th scope="col">Status</th>
                        <th scope="col" className="numeric">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.recent_orders.map((order, idx) => {
                        const statusBadge = getStatusBadge(order.order_status)
                        return (
                          <tr
                            key={order.id}
                            className="staggered-row"
                            style={{ animationDelay: `${(idx + 1) * 60}ms` }}
                          >
                            <td>
                              <Link
                                to="/admin/orders"
                                className="text-link font-bold hover:underline"
                                title="Open order queue"
                              >
                                {order.order_number}
                              </Link>
                            </td>
                            <td>{order.customer_name}</td>
                            <td>
                              <span className={statusBadge.className}>
                                {statusBadge.label}
                              </span>
                            </td>
                            <td className="numeric">
                              <strong>{money.format(Number(order.total_usd))}</strong>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <div className="dashboard-sidebar-column">
              <MenuHealthWidget catalogHealth={catalogHealth} />
              <div className="panel quick-actions-panel">
                <div className="panel-header">
                  <div>
                    <div className="eyebrow">WORKSPACE</div>
                    <h2>Quick Actions</h2>
                  </div>
                </div>
                <QuickActionsBar />
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}
