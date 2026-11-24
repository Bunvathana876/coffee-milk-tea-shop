import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  Banknote,
  CheckCircle2,
  Clock,
  Coffee,
  RotateCcw,
  Search,
  ShieldCheck,
  ShoppingBag,
  Printer,
  LayoutList,
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/authContext';
import { ConfirmAction } from '../components/ConfirmAction';
import { Drawer } from '../components/Drawer';
import { EmptyState, ErrorState, LoadingState } from '../components/States';
import { KitchenTicketModal } from '../components/KitchenTicketModal';
import { KitchenDisplayBoard } from '../components/KitchenDisplayBoard';
import { useToast } from '../components/ToastContext';
import {
  getOrder,
  getOrderPaymentAudit,
  getOrders,
  settleCash,
  updateOrderStatus,
  type AdminOrder,
  type OrderList,
  type OrderStatus,
  type PaymentSettlementAudit,
} from '../lib/api';

const statuses: (OrderStatus | 'all')[] = [
  'all',
  'pending',
  'preparing',
  'ready',
  'completed',
  'cancelled',
];

const transitions: Record<OrderStatus, OrderStatus[]> = {
  pending: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const khr = new Intl.NumberFormat('en-US', { style: 'decimal', maximumFractionDigits: 0 });

import { getOrderStatusBadge, getPaymentStatusBadge } from '../lib/orderStatus';

export { getOrderStatusBadge, getPaymentStatusBadge };

export function OrdersPage() {
  const { token } = useAuth();
  const { notify } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const statusParam = searchParams.get('status')?.toLowerCase();
  const viewParam = searchParams.get('view')?.toLowerCase();
  const orderIdParam = searchParams.get('orderId');

  const initialStatus: OrderStatus | 'all' =
    statusParam && statuses.includes(statusParam as OrderStatus | 'all')
      ? (statusParam as OrderStatus | 'all')
      : 'all';
  const initialView: 'table' | 'kds' = viewParam === 'kds' ? 'kds' : 'table';

  const [status, setStatus] = useState<OrderStatus | 'all'>(initialStatus);
  const [offset, setOffset] = useState(0);
  const [revision, setRevision] = useState(0);
  const [list, setList] = useState<OrderList | null>(null);
  const [kdsOrders, setKdsOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [error, setError] = useState('');
  const [kdsActionError, setKdsActionError] = useState('');

  // View mode: standard table or live kitchen Kanban board (KDS)
  const [viewMode, setViewMode] = useState<'table' | 'kds'>(initialView);
  const [ticketOrder, setTicketOrder] = useState<AdminOrder | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(initialView === 'kds');
  const hasLoadedRef = useRef(false);

  // Sync state when URL search parameters change
  useEffect(() => {
    const param = searchParams.get('status')?.toLowerCase();
    const nextViewParam = searchParams.get('view')?.toLowerCase();
    if (nextViewParam === 'kds' && viewMode !== 'kds') {
      setViewMode('kds');
      setAutoRefresh(true);
    }
    if (param && statuses.includes(param as OrderStatus | 'all')) {
      if (param !== status) {
        setStatus(param as OrderStatus | 'all');
        setOffset(0);
        setLoading(true);
        setError('');
      }
    } else if (!param && status !== 'all') {
      setStatus('all');
      setOffset(0);
      setLoading(true);
      setError('');
    }
  }, [searchParams]);

  function handleSelectStatus(value: OrderStatus | 'all') {
    setStatus(value);
    setOffset(0);
    setLoading(true);
    setError('');
    setKdsActionError('');
    if (viewMode === 'kds' && value !== 'all') {
      setViewMode('table');
    }
    const nextParams = new URLSearchParams(searchParams);
    if (value === 'all') {
      nextParams.delete('status');
    } else {
      nextParams.set('status', value);
      nextParams.delete('view');
    }
    setSearchParams(nextParams, { replace: true });
  }

  function handleSelectViewMode(mode: 'table' | 'kds') {
    setViewMode(mode);
    setKdsActionError('');
    const nextParams = new URLSearchParams(searchParams);
    if (mode === 'kds') {
      setAutoRefresh(true);
      setStatus('all');
      setOffset(0);
      nextParams.set('view', 'kds');
      nextParams.delete('status');
    } else {
      nextParams.delete('view');
    }
    setSearchParams(nextParams, { replace: true });
  }

  // Search on currently loaded page
  const [localSearch, setLocalSearch] = useState('');

  // Selected order details drawer
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selected, setSelected] = useState<AdminOrder | null>(null);
  const [paymentAudit, setPaymentAudit] = useState<PaymentSettlementAudit[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [detailActionError, setDetailActionError] = useState('');

  // Consequential action confirmation
  const [confirmStatus, setConfirmStatus] = useState<OrderStatus | null>(null);
  const [confirmCash, setConfirmCash] = useState(false);
  const [busy, setBusy] = useState(false);
  const [receiptReference, setReceiptReference] = useState('');

  useEffect(() => {
    if (!token) return;
    let active = true;

    if (!hasLoadedRef.current) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    const fetchPromise =
      viewMode === 'kds'
        ? Promise.all([
            getOrders(token, 'pending', 0, 200),
            getOrders(token, 'preparing', 0, 200),
            getOrders(token, 'ready', 0, 200),
          ]).then(([pendingList, preparingList, readyList]) => {
            if (!active) return;
            const merged = [...pendingList.items, ...preparingList.items, ...readyList.items];
            setKdsOrders(merged);
            setList({
              ...pendingList,
              items: merged,
            });
          })
        : getOrders(token, status, offset, 50).then(data => {
            if (!active) return;
            setList(data);
          });

    fetchPromise
      .then(() => {
        if (!active) return;
        hasLoadedRef.current = true;
        setError('');
        setLastRefreshed(new Date());
        setLoading(false);
        setRefreshing(false);
      })
      .catch(cause => {
        if (!active) return;
        setError(cause instanceof Error ? cause.message : 'Orders are unavailable.');
        setLoading(false);
        setRefreshing(false);
      });

    return () => {
      active = false;
    };
  }, [token, status, offset, viewMode, revision]);

  // Auto-refresh interval (every 15s) for live kitchen board or active queue
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      setRevision(value => value + 1);
    }, 15000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const reload = useCallback((silent = false) => {
    setError('');
    setKdsActionError('');
    if (!silent || !hasLoadedRef.current) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    setRevision(value => value + 1);
  }, []);

  const openOrder = useCallback(
    async (id: number) => {
      if (!token) return;
      setSelectedId(id);
      setDetailLoading(true);
      setDetailError('');
      setDetailActionError('');
      setSelected(null);
      setPaymentAudit([]);
      setReceiptReference('');
      try {
        const [order, audit] = await Promise.all([
          getOrder(token, id),
          getOrderPaymentAudit(token, id).catch(() => [] as PaymentSettlementAudit[]),
        ]);
        setSelected(order);
        setPaymentAudit(Array.isArray(audit) ? audit : []);
      } catch (cause) {
        setDetailError(cause instanceof Error ? cause.message : 'Order details are unavailable.');
      } finally {
        setDetailLoading(false);
      }
    },
    [token],
  );

  // Open specific order drawer when ?orderId=<id> is provided in URL
  const handledOrderIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!orderIdParam || !token) return;
    if (handledOrderIdRef.current === orderIdParam) return;
    const parsedId = Number(orderIdParam);
    if (Number.isInteger(parsedId) && parsedId > 0) {
      handledOrderIdRef.current = orderIdParam;
      void openOrder(parsedId);
    }
  }, [orderIdParam, token, openOrder]);

  function closeDetails() {
    setSelectedId(null);
    setSelected(null);
    setPaymentAudit([]);
    setDetailError('');
    setDetailActionError('');
    setConfirmStatus(null);
    setConfirmCash(false);
    if (searchParams.has('orderId')) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('orderId');
      setSearchParams(nextParams, { replace: true });
    }
  }

  async function handleAdvanceStatus(orderId: number, nextStatus: OrderStatus) {
    if (!token || busy) return;
    setBusy(true);
    setKdsActionError('');
    try {
      const updated = await updateOrderStatus(token, orderId, nextStatus);
      notify({
        tone: 'success',
        message:
          nextStatus === 'ready' && updated.customer_notified
            ? `Order ${updated.order_number} is Ready — pickup alert sent to ${updated.customer_name}.`
            : `Order ${updated.order_number} moved to ${nextStatus}.`,
      });
      reload(true);
    } catch (cause) {
      const msg = cause instanceof Error ? cause.message : 'Could not update order status.';
      setKdsActionError(msg);
      notify({ tone: 'error', message: msg });
    } finally {
      setBusy(false);
    }
  }

  async function handleStatusChange() {
    if (!token || !selected || !confirmStatus) return;
    setBusy(true);
    setDetailActionError('');
    try {
      const updated = await updateOrderStatus(token, selected.id, confirmStatus);
      setSelected(updated);
      setConfirmStatus(null);
      notify({
        tone: 'success',
        message:
          updated.order_status === 'ready' && updated.customer_notified
            ? `Order ${updated.order_number} is Ready — pickup alert sent to ${updated.customer_name}.`
            : `Order ${updated.order_number} updated to ${updated.order_status}.`,
      });
      reload(true);
    } catch (cause) {
      const msg = cause instanceof Error ? cause.message : 'Could not update order status.';
      setDetailActionError(msg);
      setConfirmStatus(null);
    } finally {
      setBusy(false);
    }
  }

  async function handleRecordCashSubmit(event: FormEvent) {
    event.preventDefault();
    if (!token || !selected || busy) return;
    const cleanRef = receiptReference.trim();
    if (cleanRef.length < 3 || cleanRef.length > 160) {
      setDetailActionError('Cash receipt reference must be between 3 and 160 characters.');
      return;
    }
    setDetailActionError('');
    setConfirmCash(true);
  }

  async function executeCashSettlement() {
    if (!token || !selected || busy || !receiptReference.trim()) return;
    setBusy(true);
    setDetailActionError('');
    try {
      await settleCash(token, selected.id, receiptReference.trim());
      const [refreshed, audit] = await Promise.all([
        getOrder(token, selected.id),
        getOrderPaymentAudit(token, selected.id).catch(() => [] as PaymentSettlementAudit[]),
      ]);
      setSelected(refreshed);
      setPaymentAudit(Array.isArray(audit) ? audit : []);
      setReceiptReference('');
      setConfirmCash(false);
      notify({
        tone: 'success',
        message: `Cash settlement recorded for ${refreshed.order_number}.`,
      });
      reload(true);
    } catch (cause) {
      setDetailActionError(
        cause instanceof Error ? cause.message : 'Cash settlement could not be recorded.',
      );
      setConfirmCash(false);
    } finally {
      setBusy(false);
    }
  }

  const allOrdersTotal = useMemo(() => {
    if (!list?.counts_by_status) return list?.total ?? 0;
    return Object.values(list.counts_by_status).reduce((sum, count) => sum + Number(count || 0), 0);
  }, [list]);

  // Filter loaded items (or active KDS items) by search keyword
  const visibleItems = useMemo(() => {
    const source = viewMode === 'kds' ? kdsOrders : (list?.items ?? []);
    const q = localSearch.trim().toLowerCase();
    if (!q) return source;
    return source.filter(
      order =>
        order.order_number.toLowerCase().includes(q) ||
        order.customer_name.toLowerCase().includes(q) ||
        (order.customer_phone ?? '').toLowerCase().includes(q),
    );
  }, [viewMode, kdsOrders, list?.items, localSearch]);

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
        <div className="flex items-center gap-2.5 flex-wrap">
          {lastRefreshed && !loading && (
            <span className="text-xs font-semibold text-slate-500">
              Updated {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          {/* View Toggle */}
          <div className="flex rounded-lg border border-slate-300 bg-white p-0.5 shadow-2xs">
            <button
              type="button"
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              onClick={() => handleSelectViewMode('table')}
              aria-label="Table view"
            >
              <LayoutList size={14} />
              <span>Table View</span>
            </button>
            <button
              type="button"
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'kds'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              onClick={() => handleSelectViewMode('kds')}
              aria-label="Kitchen Board KDS view"
            >
              <Coffee size={14} />
              <span>☕ Kitchen Board (KDS)</span>
            </button>
          </div>

          {/* Auto Refresh Toggle */}
          <button
            type="button"
            className={`button-secondary text-xs flex items-center gap-1.5 ${
              autoRefresh ? 'bg-amber-50 border-amber-300 text-amber-900 font-bold' : ''
            }`}
            onClick={() => setAutoRefresh(v => !v)}
            title="Auto-refresh order queue every 15 seconds"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                autoRefresh ? 'bg-emerald-500 animate-ping' : 'bg-slate-400'
              }`}
            />
            <span>Auto-Refresh: {autoRefresh ? 'ON' : 'OFF'}</span>
          </button>

          <button
            type="button"
            className="button-secondary"
            onClick={() => reload(true)}
            disabled={loading || refreshing}
            aria-label="Refresh orders"
          >
            <RotateCcw size={16} className={refreshing ? 'animate-spin' : ''} aria-hidden="true" />
            <span>Refresh</span>
          </button>
        </div>
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
              <strong>{allOrdersTotal}</strong>
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
        <search className="page-toolbar orders-toolbar">
          <div className="status-tabs" role="tablist" aria-label="Filter orders by status">
            {statuses.map(value => {
              const count =
                value === 'all'
                  ? allOrdersTotal
                  : (list?.counts_by_status?.[value as OrderStatus] ?? 0);
              const label =
                value === 'all' ? 'All Orders' : value[0].toUpperCase() + value.slice(1);
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
                  {list && <span className="status-tab-count">{count}</span>}
                </button>
              );
            })}
          </div>

          <div className="orders-toolbar-search">
            <label className="sr-only" htmlFor="order-page-search">
              Search orders
            </label>
            <div className="orders-search-wrapper">
              <input
                id="order-page-search"
                name="order_search"
                type="search"
                className="text-input search-input orders-search"
                aria-label="Search orders"
                aria-describedby="order-search-helper"
                placeholder="Search orders…"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                value={localSearch}
                onChange={event => setLocalSearch(event.target.value)}
              />
              <Search size={15} className="search-icon" aria-hidden="true" />
            </div>
            <span className="search-helper-label" id="order-search-helper">
              Filters loaded page records
            </span>
          </div>
        </search>

        {loading ? (
          <LoadingState label="Loading orders queue…" />
        ) : error ? (
          <ErrorState message={error} retry={() => reload(false)} />
        ) : viewMode === 'kds' ? (
          <>
            {kdsActionError && (
              <div
                role="alert"
                className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs font-bold flex items-center justify-between"
              >
                <span>{kdsActionError}</span>
                <button
                  type="button"
                  onClick={() => setKdsActionError('')}
                  className="text-rose-600 hover:text-rose-900 font-bold ml-2 underline cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            )}
            <KitchenDisplayBoard
              orders={visibleItems}
              loading={loading}
              onAdvanceStatus={handleAdvanceStatus}
              onOpenDetails={openOrder}
              onPrintTicket={setTicketOrder}
              busy={busy}
            />
          </>
        ) : !list || list.items.length === 0 ? (
          <EmptyState title="No orders found" detail="No server orders match this status." />
        ) : visibleItems.length === 0 ? (
          <EmptyState
            title="No matching orders on this page"
            detail={`No orders match "${localSearch}" on the current page.`}
          />
        ) : (
          <>
            <div
              className="table-scroll"
              tabIndex={0}
              role="region"
              aria-label="Live Café Orders List"
            >
              <table>
                <caption className="sr-only">Live Café Orders List</caption>
                <thead>
                  <tr>
                    <th scope="col">Reference</th>
                    <th scope="col">Customer</th>
                    <th scope="col">Order Status</th>
                    <th scope="col">Payment</th>
                    <th scope="col">Total</th>
                    <th scope="col" className="numeric">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visibleItems.map(order => {
                    const orderBadge = getOrderStatusBadge(order.order_status);
                    const payBadge = getPaymentStatusBadge(order.payment_status);
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
                              <span className="text-xs text-slate-500">{order.customer_phone}</span>
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
                    );
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
                    setOffset(Math.max(0, offset - 50));
                    setLoading(true);
                  }}
                >
                  Previous
                </button>
                <button
                  type="button"
                  className="button-secondary"
                  disabled={offset + list.limit >= list.total}
                  onClick={() => {
                    setOffset(offset + 50);
                    setLoading(true);
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
            <div className="flex items-center justify-between w-full gap-2 flex-wrap">
              <div className="flex flex-col">
                <span className="text-xs text-slate-500 font-semibold uppercase">Total Due</span>
                <strong className="text-lg text-slate-900">
                  {money.format(selected.total_usd)}{' '}
                  <span className="text-xs font-normal text-slate-500">
                    (៛{khr.format(selected.total_khr)})
                  </span>
                </strong>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  className="button-secondary flex items-center gap-1.5"
                  onClick={() => setTicketOrder(selected)}
                >
                  <Printer size={15} />
                  <span>Print Ticket</span>
                </button>
                <button type="button" className="button-secondary" onClick={closeDetails}>
                  Close
                </button>
                {transitions[selected.order_status]
                  .filter(next => !(next === 'cancelled' && selected.payment_status === 'paid'))
                  .map(next => (
                    <button
                      key={next}
                      type="button"
                      className={
                        next === 'cancelled' ? 'button-secondary danger-link' : 'button-primary'
                      }
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
            {detailActionError && (
              <div className="form-error" role="alert">
                <AlertCircle size={16} aria-hidden="true" className="shrink-0" />
                <span>{detailActionError}</span>
              </div>
            )}

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
              {selected.customer_email && (
                <p>
                  <span>Email</span>
                  <strong>{selected.customer_email}</strong>
                </p>
              )}
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

            {selected.notes && selected.notes.trim() && (
              <div className="p-3 rounded-xl border border-amber-200 bg-amber-50/70 text-amber-950 text-xs">
                <strong className="uppercase tracking-wide block mb-1 text-[11px] text-amber-800">
                  Customer Order Note
                </strong>
                <span>{selected.notes}</span>
              </div>
            )}

            {/* Policy Note */}
            <div className="policy-note">
              KHQR is a demo choice. Cash settlement records the administrator&apos;s observation,
              without verifying a bank transfer. Revenue requires paid and completed status.
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
                  <label
                    htmlFor="cash-receipt-ref"
                    className="flex flex-col gap-1 text-xs text-amber-950 font-semibold"
                  >
                    Cash receipt reference
                    <input
                      id="cash-receipt-ref"
                      name="receipt_reference"
                      className="text-input"
                      required
                      minLength={3}
                      maxLength={160}
                      pattern="[A-Za-z0-9 ._:/-]+"
                      autoCorrect="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      placeholder="e.g. CASH-REGISTER-01-REC-948"
                      value={receiptReference}
                      onChange={event => {
                        setReceiptReference(event.target.value);
                        if (detailActionError) setDetailActionError('');
                      }}
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

            {/* Cash Settlement Audit Trail */}
            {paymentAudit.length > 0 && (
              <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/60 flex flex-col gap-2">
                <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs uppercase tracking-wide">
                  <ShieldCheck size={16} aria-hidden="true" />
                  <span>Cash Settlement Audit Trail (Immutable)</span>
                </div>
                {paymentAudit.map(entry => (
                  <div
                    key={entry.id}
                    className="text-xs text-emerald-950 flex flex-col gap-0.5 border-t border-emerald-200/70 pt-2 first:border-t-0 first:pt-0"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <strong>Reference: {entry.reference}</strong>
                      <span className="font-mono font-bold">
                        {money.format(Number(entry.amount_usd))}
                      </span>
                    </div>
                    <span className="text-emerald-800">
                      Recorded {new Date(entry.recorded_at).toLocaleString()} · Staff #{entry.staff_id}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Line Items Table */}
            <div>
              <div className="eyebrow mb-2">ORDER ITEMS ({selected.items.length})</div>
              <div
                className="table-scroll border border-slate-200 rounded-xl"
                tabIndex={0}
                role="region"
                aria-label="Order Line Items"
              >
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Drink</th>
                      <th scope="col">Customizations</th>
                      <th scope="col">Qty</th>
                      <th scope="col" className="numeric">
                        Subtotal
                      </th>
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
                        <td className="numeric font-semibold">{money.format(item.subtotal_usd)}</td>
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
          detail={
            confirmStatus === 'ready'
              ? `Move this order from ${selected.order_status} to ready and send a pickup notification alert to ${selected.customer_name}. Payment status will not change.`
              : `Move this order from ${selected.order_status} to ${confirmStatus}. Payment status will not change.`
          }
          busy={busy}
          confirmLabel={
            confirmStatus === 'cancelled'
              ? 'Cancel order'
              : confirmStatus === 'ready'
                ? 'Mark Ready & Notify'
                : 'Confirm'
          }
          tone={confirmStatus === 'cancelled' ? 'danger' : 'primary'}
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
      {/* Kitchen Ticket Modal */}
      <KitchenTicketModal
        order={ticketOrder}
        isOpen={Boolean(ticketOrder)}
        onClose={() => setTicketOrder(null)}
      />
    </div>
  );
}
