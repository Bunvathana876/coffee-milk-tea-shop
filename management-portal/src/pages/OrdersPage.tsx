import { useEffect, useState } from 'react'
import { useAuth } from '../auth/authContext'
import { ConfirmAction } from '../components/ConfirmAction'
import { EmptyState, ErrorState, LoadingState } from '../components/States'
import { getOrder, getOrders, updateOrderStatus, settleCash, type AdminOrder, type OrderList, type OrderStatus } from '../lib/api'

const statuses: (OrderStatus | 'all')[] = ['all', 'pending', 'preparing', 'ready', 'completed', 'cancelled']
const transitions: Record<OrderStatus, OrderStatus[]> = {
  pending: ['preparing', 'cancelled'], preparing: ['ready', 'cancelled'],
  ready: ['completed', 'cancelled'], completed: [], cancelled: [],
}
const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

export function OrdersPage() {
  const { token } = useAuth()
  const [status, setStatus] = useState<OrderStatus | 'all'>('all')
  const [offset, setOffset] = useState(0)
  const [revision, setRevision] = useState(0)
  const [list, setList] = useState<OrderList | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<AdminOrder | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')
  const [confirm, setConfirm] = useState<OrderStatus | null>(null)
  const [busy, setBusy] = useState(false)
  const [receiptReference, setReceiptReference] = useState('')

  useEffect(() => {
    if (!token) return
    let active = true
    getOrders(token, status, offset).then(data => { if (active) { setList(data); setLoading(false) } })
      .catch(cause => { if (active) { setError(cause instanceof Error ? cause.message : 'Orders are unavailable.'); setLoading(false) } })
    return () => { active = false }
  }, [token, status, offset, revision])

  function reload() { setError(''); setLoading(true); setRevision(value => value + 1) }
  async function openOrder(id: number) {
    if (!token) return
    setDetailLoading(true); setDetailError(''); setSelected(null)
    try { setSelected(await getOrder(token, id)) }
    catch (cause) { setDetailError(cause instanceof Error ? cause.message : 'Order details are unavailable.') }
    finally { setDetailLoading(false) }
  }
  async function changeStatus() {
    if (!token || !selected || !confirm) return
    setBusy(true); setDetailError('')
    try {
      const updated = await updateOrderStatus(token, selected.id, confirm)
      setSelected(updated); setConfirm(null); reload()
    } catch (cause) { setDetailError(cause instanceof Error ? cause.message : 'Could not update order status.'); setConfirm(null) }
    finally { setBusy(false) }
  }

  async function recordCash() {
    if (!token || !selected || busy) return
    if (!window.confirm('Record your observation that cash was received? This creates an immutable audit entry and does not verify any bank transfer.')) return
    setBusy(true)
    try {
      await settleCash(token, selected.id, receiptReference)
      setSelected(await getOrder(token, selected.id)); setReceiptReference(''); reload()
    } catch (cause) { setDetailError(cause instanceof Error ? cause.message : 'Cash settlement could not be recorded.') }
    finally { setBusy(false) }
  }

  return <div className="page-stack">
    <div className="page-heading"><div><div className="eyebrow">OPERATIONS</div><h1>Orders<span className="heading-period">.</span></h1><p>Follow confirmed server orders through preparation and handoff.</p></div></div>
    <section className="panel"><div className="panel-header"><div><div className="eyebrow">ORDER QUEUE</div><h2>Live orders</h2></div><select className="text-input filter-select" aria-label="Filter order status" value={status} onChange={event => { setStatus(event.target.value as OrderStatus | 'all'); setOffset(0); setLoading(true); setError('') }}>{statuses.map(value => <option key={value} value={value}>{value === 'all' ? 'All statuses' : value[0].toUpperCase() + value.slice(1)}</option>)}</select></div>
      {loading ? <LoadingState label="Loading orders…" /> : error ? <ErrorState message={error} retry={reload} /> : !list || list.items.length === 0 ? <EmptyState title="No orders found" detail="No server orders match this status." /> : <><div className="table-scroll"><table><thead><tr><th>Reference</th><th>Customer</th><th>Status</th><th>Payment</th><th>Total</th><th>Action</th></tr></thead><tbody>{list.items.map(order => <tr key={order.id}><td><strong>{order.order_number}</strong></td><td>{order.customer_name}</td><td><span className={`status-badge status-${order.order_status}`}>{order.order_status}</span></td><td>{order.payment_status}</td><td>{money.format(order.total_usd)}</td><td><button className="text-link" onClick={() => openOrder(order.id)}>View details</button></td></tr>)}</tbody></table></div><div className="pager"><span>{offset + 1}–{Math.min(offset + list.items.length, list.total)} of {list.total}</span><div className="row-actions"><button className="button-secondary" disabled={offset === 0} onClick={() => { setOffset(Math.max(0, offset - 50)); setLoading(true) }}>Previous</button><button className="button-secondary" disabled={offset + list.limit >= list.total} onClick={() => { setOffset(offset + 50); setLoading(true) }}>Next</button></div></div></>}
    </section>
    {(detailLoading || detailError || selected) && <section className="panel" aria-live="polite"><div className="panel-header"><div><div className="eyebrow">ORDER DETAILS</div><h2>{selected?.order_number ?? 'Order details'}</h2></div>{selected && <button className="button-secondary" onClick={() => setSelected(null)}>Close</button>}</div>
      {detailLoading ? <LoadingState label="Loading order details…" /> : detailError ? <ErrorState message={detailError} retry={selected ? () => openOrder(selected.id) : reload} /> : selected && <>
        <div className="detail-grid"><p><span>Customer</span><strong>{selected.customer_name}</strong></p><p><span>Phone</span><strong>{selected.customer_phone}</strong></p><p><span>Order status</span><strong>{selected.order_status}</strong></p><p><span>Payment</span><strong>{selected.payment_status} · {selected.payment_method}</strong></p></div>
        <p className="policy-note">KHQR is a demo choice. Cash settlement records the administrator's observation, without verifying a bank transfer. Revenue requires paid and completed status.</p>
        {selected.payment_method === 'cash' && selected.payment_status === 'unpaid' && ['ready', 'completed'].includes(selected.order_status) && <form className="form-actions" onSubmit={event => { event.preventDefault(); recordCash() }}>
          <label>Cash receipt reference<input className="text-input" required minLength={3} maxLength={160} pattern="[A-Za-z0-9 ._:/-]+" value={receiptReference} onChange={event => setReceiptReference(event.target.value)} /></label>
          <button className="button-primary" disabled={busy}>Record cash received</button>
        </form>}
        <div className="table-scroll"><table><thead><tr><th>Drink</th><th>Customization</th><th>Qty</th><th>Total</th></tr></thead><tbody>{selected.items.map(item => <tr key={item.id}><td><strong>{item.product_name}</strong></td><td>{item.size} · {item.sugar_level} sugar · {item.ice_level}{item.toppings ? ` · ${item.toppings}` : ''}</td><td>{item.quantity}</td><td>{money.format(item.subtotal_usd)}</td></tr>)}</tbody></table></div>
        <div className="order-footer"><strong>Total {money.format(selected.total_usd)}</strong><div className="row-actions">{transitions[selected.order_status].filter(next => !(next === 'cancelled' && selected.payment_status === 'paid')).map(next => <button key={next} className={next === 'cancelled' ? 'button-secondary' : 'button-primary'} onClick={() => setConfirm(next)}>{next === 'cancelled' ? 'Cancel order' : `Mark ${next}`}</button>)}</div></div>
      </>}
    </section>}
    {confirm && selected && <ConfirmAction title={`${confirm === 'cancelled' ? 'Cancel' : 'Update'} ${selected.order_number}?`} detail={`Move this order from ${selected.order_status} to ${confirm}. Payment status will not change.`} busy={busy} onCancel={() => setConfirm(null)} onConfirm={changeStatus} />}
  </div>
}
