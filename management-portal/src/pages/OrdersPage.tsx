import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  Banknote,
  CheckCircle2,
  Clock,
  Coffee,
  RotateCcw,
  Search,
  ShoppingBag,
} from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/authContext'
import { ConfirmAction } from '../components/ConfirmAction'
import { Drawer } from '../components/Drawer'
import { EmptyState, ErrorState, LoadingState } from '../components/States'
import {
  getOrder,
  getOrders,
  settleCash,
  updateOrderStatus,
  type AdminOrder,
  type OrderList,
  type OrderStatus,
} from '../lib/api'

const statuses: (OrderStatus | 'all')[] = [
  'all',
  'pending',
  'preparing',
  'ready',
  'completed',
  'cancelled',
]

const transitions: Record<OrderStatus, OrderStatus[]> = {
  pending: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
}

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
const khr = new Intl.NumberFormat('en-US', { style: 'decimal', maximumFractionDigits: 0 })

import {
  getOrderStatusBadge,
  getPaymentStatusBadge,
} from '../lib/orderStatus'

export { getOrderStatusBadge, getPaymentStatusBadge }

export function OrdersPage() {
  const { token } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const statusParam = searchParams.get('status')?.toLowerCase()
  const initialStatus: OrderStatus | 'all' =
    statusParam && statuses.includes(statusParam as OrderStatus | 'all')
      ? (statusParam as OrderStatus | 'all')
      : 'all'

  const [status, setStatus] = useState<OrderStatus | 'all'>(initialStatus)
  const [offset, setOffset] = useState(0)
  const [revision, setRevision] = useState(0)
  const [list, setList] = useState<OrderList | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Sync state when URL search parameter changes
  useEffect(() => {
    const param = searchParams.get('status')?.toLowerCase()
    if (param && statuses.includes(param as OrderStatus | 'all')) {
      if (param !== status) {
        setStatus(param as OrderStatus | 'all')
        setOffset(0)
        setLoading(true)
        setError('')
      }
    } else if (!param && status !== 'all') {
      setStatus('all')
      setOffset(0)
      setLoading(true)
      setError('')
    }
  }, [searchParams])

  function handleSelectStatus(value: OrderStatus | 'all') {
    setStatus(value)
    setOffset(0)
    setLoading(true)
    setError('')
    if (value === 'all') {
      setSearchParams({}, { replace: true })
    } else {
      setSearchParams({ status: value }, { replace: true })
    }
  }

  // Search on currently loaded page
  const [localSearch, setLocalSearch] = useState('')

  // Selected order details drawer
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [selected, setSelected] = useState<AdminOrder | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')

  // Consequential action confirmation
  const [confirmStatus, setConfirmStatus] = useState<OrderStatus | null>(null)
  const [confirmCash, setConfirmCash] = useState(false)
  const [busy, setBusy] = useState(false)
  const [receiptReference, setReceiptReference] = useState('')

  useEffect(() => {
    if (!token) return
    let active = true
    getOrders(token, status, offset)
      .then(data => {
        if (active) {
          setList(data)
          setLoading(false)
        }
      })
      .catch(cause => {
        if (active) {
          setError(cause instanceof Error ? cause.message : 'Orders are unavailable.')
          setLoading(false)
        }
      })
    return () => {
      active = false
    }
  }, [token, status, offset, revision])

  function reload() {
    setError('')
    setLoading(true)
    setRevision(value => value + 1)
  }

  async function openOrder(id: number) {
    if (!token) return
    setSelectedId(id)
    setDetailLoading(true)
    setDetailError('')
    setSelected(null)
    setReceiptReference('')
    try {
      const order = await getOrder(token, id)
      setSelected(order)
    } catch (cause) {
      setDetailError(cause instanceof Error ? cause.message : 'Order details are unavailable.')
    } finally {
      setDetailLoading(false)
    }
  }

  function closeDetails() {
    setSelectedId(null)
    setSelected(null)
    setDetailError('')
    setConfirmStatus(null)
    setConfirmCash(false)
  }

  async function handleStatusChange() {
    if (!token || !selected || !confirmStatus) return
    setBusy(true)
    setDetailError('')
    try {
      const updated = await updateOrderStatus(token, selected.id, confirmStatus)
      setSelected(updated)
      setConfirmStatus(null)
      reload()
    } catch (cause) {
      setDetailError(cause instanceof Error ? cause.message : 'Could not update order status.')
      setConfirmStatus(null)
    } finally {
      setBusy(false)
    }
  }

  async function handleRecordCashSubmit(event: FormEvent) {
    event.preventDefault()
    if (!token || !selected || busy || !receiptReference.trim()) return
    setConfirmCash(true)
  }

  async function executeCashSettlement() {
    if (!token || !selected || busy || !receiptReference.trim()) return
    setBusy(true)
    try {
      await settleCash(token, selected.id, receiptReference.trim())
      const refreshed = await getOrder(token, selected.id)
      setSelected(refreshed)
      setReceiptReference('')
      setConfirmCash(false)
      reload()
    } catch (cause) {
      setDetailError(cause instanceof Error ? cause.message : 'Cash settlement could not be recorded.')
      setConfirmCash(false)
    } finally {
      setBusy(false)
    }
  }

  // Filter loaded items by search keyword
  const visibleItems = useMemo(() => {
    if (!list?.items) return []
    const q = localSearch.trim().toLowerCase()
    if (!q) return list.items
    return list.items.filter(
      order =>
        order.order_number.toLowerCase().includes(q) ||
        order.customer_name.toLowerCase().includes(q) ||
        (order.customer_phone ?? '').toLowerCase().includes(q)
    )
  }, [list?.items, localSearch])

  return (
    <div className="page-stack">
      {/* Page Heading */}
      <div className="page-heading">
        <div>
          <div className="eyebrow">OPERATIONS</div>
          <h1>
            Order Management
            <span className="heading-period">.</span>
          </h1>
          <p>Track and manage café orders in one place.</p>
        </div>
        <button
          type="button"
          className="button-secondary"
          onClick={reload}
          disabled={loading}
          aria-label="Refresh orders"
        >
          <RotateCcw size={16} aria-hidden="true" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Real Server Order Count Statistics */}
      {list && !loading && (
        <div className="quick-stats-grid">
          <div className="quick-stat-card">
            <span className="quick-stat-icon cobalt" aria-hidden="true">
              <ShoppingBag size={20} />
            </span>
            <div className="quick-stat-info">
              <span>Total Orders</span>
              <strong>{list.total}</strong>
            </div>
          </div>
          <div className="quick-stat-card">
            <span className="quick-stat-icon amber" aria-hidden="true">
              <Clock size={20} />
            </span>
            <div className="quick-stat-info">
              <span>Pending</span>
              <strong>{list.counts_by_status?.pending ?? 0}</strong>
            </div>
          </div>
          <div className="quick-stat-card">
            <span className="quick-stat-icon cobalt" aria-hidden="true">
              <Coffee size={20} />
            </span>
            <div className="quick-stat-info">
              <span>Preparing</span>
              <strong>{list.counts_by_status?.preparing ?? 0}</strong>
            </div>
          </div>
          <div className="quick-stat-card">
            <span className="quick-stat-icon emerald" aria-hidden="true">
              <CheckCircle2 size={20} />
            </span>
            <div className="quick-stat-info">
              <span>Ready / Completed</span>
              <strong>
                {(list.counts_by_status?.ready ?? 0) + (list.counts_by_status?.completed ?? 0)}
              </strong>
            </div>
          </div>
        </div>
      )}

      {/* Main Order Queue Section */}
      <section className="panel">
        <div className="page-toolbar orders-toolbar">
          <div className="status-tabs" role="tablist" aria-label="Filter orders by status">
            {statuses.map(value => {
              const count =
                value === 'all'
                  ? list?.total
                  : list?.counts_by_status?.[value as OrderStatus] ?? 0
              const label = value === 'all' ? 'All Orders' : value[0].toUpperCase() + value.slice(1)
              return (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={status === value}
                  className={`status-tab ${status === value ? 'active' : ''}`}
                  onClick={() => handleSelectStatus(value)}
                >
                  <span>{label}</span>
                  {typeof count === 'number' && (
                    <span className="status-tab-count">{count}</span>
                  )}
                </button>
              )
            })}
          </div>

          <div className="orders-toolbar-search">
            <label className="sr-only" htmlFor="order-page-search">
              Search orders
            </label>
            <div className="orders-search-wrapper">
              <input
                id="order-page-search"
                className="text-input search-input orders-search"
                aria-label="Search orders"
                aria-describedby="order-search-helper"
                placeholder="Search orders…"
                value={localSearch}
                onChange={event => setLocalSearch(event.target.value)}
              />
              <Search
                size={15}
                className="search-icon"
                aria-hidden="true"
              />
            </div>
            <span className="search-helper-label" id="order-search-helper">
              Filters loaded page records
            </span>
          </div>
        </div>

        {loading ? (
          <LoadingState label="Loading orders queue…" />
        ) : error ? (
          <ErrorState message={error} retry={reload} />
        ) : !list || list.items.length === 0 ? (
          <EmptyState
            title="No orders found"
            detail="No server orders match this status."
          />
        ) : visibleItems.length === 0 ? (
          <EmptyState
            title="No matching orders on this page"
            detail={`No orders match "${localSearch}" on the current page.`}
          />
        ) : (
          <>
            <div className="table-scroll">
              <table>
                <caption className="sr-only">Live Café Orders List</caption>
                <thead>
                  <tr>
                    <th scope="col">Reference</th>
                    <th scope="col">Customer</th>
                    <th scope="col">Order Status</th>
                    <th scope="col">Payment</th>
                    <th scope="col">Total</th>
                    <th scope="col" className="numeric">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleItems.map(order => {
                    const orderBadge = getOrderStatusBadge(order.order_status)
                    const payBadge = getPaymentStatusBadge(order.payment_status)
                    return (
                      <tr key={order.id}>
                        <td>
                          <div className="flex flex-col">
                            <strong>{order.order_number}</strong>
                            <span className="text-xs text-slate-500 font-mono">
                              {new Date(order.created_at).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-800">
                              {order.customer_name}
                            </span>
                            {order.customer_phone && (
                              <span className="text-xs text-slate-500">
                                {order.customer_phone}
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <span className={orderBadge.className}>{orderBadge.label}</span>
                        </td>
                        <td>
                          <div className="flex items-center gap-1.5">
                            <span className={payBadge.className}>{payBadge.label}</span>
                            <span className="text-xs text-slate-500 uppercase font-semibold">
                              {order.payment_method}
                            </span>
                          </div>
                        </td>
                        <td>
                          <strong className="text-slate-900">
                            {money.format(order.total_usd)}
                          </strong>
                        </td>
                        <td className="numeric">
                          <button
                            type="button"
                            className="text-link"
                            onClick={() => openOrder(order.id)}
                          >
                            View details
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="pager">
              <span>
                Showing {offset + 1}–{Math.min(offset + list.items.length, list.total)} of{' '}
                {list.total} server orders
              </span>
              <div className="row-actions">
                <button
                  type="button"
                  className="button-secondary"
                  disabled={offset === 0}
                  onClick={() => {
                    setOffset(Math.max(0, offset - 50))
                    setLoading(true)
                  }}
                >
                  Previous
                </button>
                <button
                  type="button"
                  className="button-secondary"
                  disabled={offset + list.limit >= list.total}
                  onClick={() => {
                    setOffset(offset + 50)
                    setLoading(true)
                  }}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      {/* Order Details Drawer */}
      <Drawer
        isOpen={Boolean(selectedId)}
        onClose={closeDetails}
        eyebrow="ORDER DETAILS"
        title={selected ? selected.order_number : 'Order Details'}
        description={
          selected
            ? `Placed on ${new Date(selected.created_at).toLocaleString()}`
            : 'Loading order specifications…'
        }
        width="lg"
        footer={
          selected ? (
            <div className="flex items-center justify-between w-full">
              <div className="flex flex-col">
                <span className="text-xs text-slate-500 font-semibold uppercase">Total Due</span>
                <strong className="text-lg text-slate-900">
                  {money.format(selected.total_usd)}{' '}
                  <span className="text-xs font-normal text-slate-500">
                    (៛{khr.format(selected.total_khr)})
                  </span>
                </strong>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="button-secondary"
                  onClick={closeDetails}
                >
                  Close
                </button>
                {transitions[selected.order_status]
                  .filter(next => !(next === 'cancelled' && selected.payment_status === 'paid'))
                  .map(next => (
                    <button
                      key={next}
                      type="button"
                      className={next === 'cancelled' ? 'button-secondary danger-link' : 'button-primary'}
                      onClick={() => setConfirmStatus(next)}
                    >
                      {next === 'cancelled'
                        ? 'Cancel order'
                        : `Mark ${next[0].toUpperCase() + next.slice(1)}`}
                    </button>
                  ))}
              </div>
            </div>
          ) : undefined
        }
      >
        {detailLoading ? (
          <LoadingState label="Loading order details…" />
        ) : detailError ? (
          <ErrorState message={detailError} retry={() => selectedId && openOrder(selectedId)} />
        ) : selected ? (
          <div className="flex flex-col gap-5">
            {/* Customer & Status Cards */}
            <div className="detail-grid">
              <p>
                <span>Customer</span>
                <strong>{selected.customer_name}</strong>
              </p>
              <p>
                <span>Contact Phone</span>
                <strong>{selected.customer_phone || 'None provided'}</strong>
              </p>
              <p>
                <span>Order Status</span>
                <strong>
                  <span className={getOrderStatusBadge(selected.order_status).className}>
                    {getOrderStatusBadge(selected.order_status).label}
                  </span>
                </strong>
              </p>
              <p>
                <span>Payment</span>
                <strong>
                  <span className={getPaymentStatusBadge(selected.payment_status).className}>
                    {getPaymentStatusBadge(selected.payment_status).label}
                  </span>{' '}
                  · <span className="uppercase">{selected.payment_method}</span>
                </strong>
              </p>
            </div>

            {/* Policy Note */}
            <div className="policy-note">
              KHQR is a demo choice. Cash settlement records the administrator's observation, without verifying a bank transfer. Revenue requires paid and completed status.
            </div>

            {/* Cash Settlement Action Form */}
            {selected.payment_method === 'cash' &&
              selected.payment_status === 'unpaid' &&
              ['ready', 'completed'].includes(selected.order_status) && (
                <form
                  onSubmit={handleRecordCashSubmit}
                  className="p-4 rounded-xl border border-amber-200 bg-amber-50/60 flex flex-col gap-3"
                >
                  <div className="flex items-center gap-2 text-amber-900 font-bold text-xs uppercase tracking-wide">
                    <Banknote size={16} /> Record Cash Settlement
                  </div>
                  <label className="flex flex-col gap-1 text-xs text-amber-950 font-semibold">
                    Cash receipt reference
                    <input
                      className="text-input"
                      required
                      minLength={3}
                      maxLength={160}
                      pattern="[A-Za-z0-9 ._:/-]+"
                      placeholder="e.g. CASH-REGISTER-01-REC-948"
                      value={receiptReference}
                      onChange={event => setReceiptReference(event.target.value)}
                    />
                  </label>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="button-primary"
                      disabled={busy || !receiptReference.trim()}
                    >
                      Record Cash Received
                    </button>
                  </div>
                </form>
              )}

            {/* Line Items Table */}
            <div>
              <div className="eyebrow mb-2">ORDER ITEMS ({selected.items.length})</div>
              <div className="table-scroll border border-slate-200 rounded-xl">
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Drink</th>
                      <th scope="col">Customizations</th>
                      <th scope="col">Qty</th>
                      <th scope="col" className="numeric">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.items.map(item => (
                      <tr key={item.id}>
                        <td>
                          <strong>{item.product_name}</strong>
                        </td>
                        <td>
                          <span className="text-xs text-slate-600">
                            {item.size} · {item.sugar_level} sugar · {item.ice_level}
                            {item.toppings ? ` · ${item.toppings}` : ''}
                          </span>
                        </td>
                        <td>{item.quantity}</td>
                        <td className="numeric font-semibold">
                          {money.format(item.subtotal_usd)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : null}
      </Drawer>

      {/* Status Transition Confirmation */}
      {confirmStatus && selected && (
        <ConfirmAction
          title={`${confirmStatus === 'cancelled' ? 'Cancel' : 'Update'} ${selected.order_number}?`}
          detail={`Move this order from ${selected.order_status} to ${confirmStatus}. Payment status will not change.`}
          busy={busy}
          onCancel={() => setConfirmStatus(null)}
          onConfirm={handleStatusChange}
        />
      )}

      {/* Cash Settlement Confirmation */}
      {confirmCash && selected && (
        <ConfirmAction
          title={`Confirm Cash Receipt for ${selected.order_number}?`}
          detail="Record your observation that cash was received? This creates an immutable audit entry and does not verify any bank transfer."
          busy={busy}
          onCancel={() => setConfirmCash(false)}
          onConfirm={executeCashSettlement}
        />
      )}
    </div>
  )
}
