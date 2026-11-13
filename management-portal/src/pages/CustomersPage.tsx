import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Award,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coffee,
  Eye,
  Mail,
  Phone,
  RotateCcw,
  Search,
  ShieldCheck,
  ShoppingBag,
  UserCheck,
  Users,
  UserX,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/authContext';
import { Drawer } from '../components/Drawer';
import { EmptyState } from '../components/States';
import { getCustomer, getCustomers, type Customer, type CustomerMetrics } from '../lib/api';

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const number = new Intl.NumberFormat('en-US');

export function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function formatDate(isoString: string | null | undefined): string {
  if (!isoString) return 'Never';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return 'Invalid date';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDateTime(isoString: string | null | undefined): string {
  if (!isoString) return 'Never';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return 'Invalid date';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function getCustomerStatusBadge(isActive: boolean) {
  if (isActive) {
    return { className: 'status-badge status-completed', label: 'Active' };
  }
  return { className: 'status-badge status-cancelled', label: 'Inactive' };
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="table-scroll">
      <table className="customers-table">
        <caption className="sr-only">Loading customer records</caption>
        <thead>
          <tr>
            <th scope="col">Customer</th>
            <th scope="col">Contact</th>
            <th scope="col">Loyalty</th>
            <th scope="col">Orders &amp; Spend</th>
            <th scope="col">Status</th>
            <th scope="col">Joined</th>
            <th scope="col" className="numeric">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, index) => (
            <tr key={index} className="skeleton-row">
              <td>
                <div className="flex items-center gap-3">
                  <div className="skeleton-circle" />
                  <div className="flex flex-col gap-1.5 flex-1">
                    <div className="skeleton-line" style={{ width: '130px' }} />
                    <div className="skeleton-line short" style={{ width: '70px' }} />
                  </div>
                </div>
              </td>
              <td>
                <div className="flex flex-col gap-1.5">
                  <div className="skeleton-line" style={{ width: '160px' }} />
                  <div className="skeleton-line short" style={{ width: '100px' }} />
                </div>
              </td>
              <td>
                <div className="skeleton-pill" style={{ width: '85px' }} />
              </td>
              <td>
                <div className="flex flex-col gap-1.5">
                  <div className="skeleton-line" style={{ width: '90px' }} />
                  <div className="skeleton-line short" style={{ width: '60px' }} />
                </div>
              </td>
              <td>
                <div className="skeleton-pill" style={{ width: '65px' }} />
              </td>
              <td>
                <div className="skeleton-line" style={{ width: '90px' }} />
              </td>
              <td className="numeric">
                <div className="skeleton-pill" style={{ width: '80px', marginLeft: 'auto' }} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Safe helper to categorize API error states without hiding the real message
function getCustomerErrorTitle(error: string): string {
  const lower = error.toLowerCase();
  if (lower.includes('route not found') || lower.includes('404')) {
    return 'Endpoint Unavailable';
  }
  if (
    lower.includes('forbidden') ||
    lower.includes('privilege') ||
    lower.includes('credential') ||
    lower.includes('401') ||
    lower.includes('403')
  ) {
    return 'Access Restricted';
  }
  if (
    lower.includes('unavailable') ||
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    lower.includes('timeout')
  ) {
    return 'Café API Unavailable';
  }
  return 'Unable to Load Customer Records';
}

function getCustomerErrorDescription(error: string): string {
  const lower = error.toLowerCase();
  if (lower.includes('route not found') || lower.includes('404')) {
    return `The server returned: "${error}". The customer administration endpoint is not mounted on the deployed backend service. Verify that the backend has deployed the latest RBAC routes.`;
  }
  if (
    lower.includes('forbidden') ||
    lower.includes('privilege') ||
    lower.includes('credential') ||
    lower.includes('401') ||
    lower.includes('403')
  ) {
    return 'Administrator authorization is required to access customer records. Your current session does not have sufficient permissions.';
  }
  if (
    lower.includes('unavailable') ||
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    lower.includes('timeout')
  ) {
    return 'Could not reach the café backend API. Please check that the server is online and your network connection is active.';
  }
  return error;
}

export function CustomersPage() {
  const { token } = useAuth();

  // Data states
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [metrics, setMetrics] = useState<CustomerMetrics>({
    total_customers: 0,
    active_customers: 0,
    inactive_customers: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [revision, setRevision] = useState(0);

  // Filter & pagination states
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortOption, setSortOption] = useState<
    | 'created_at:desc'
    | 'created_at:asc'
    | 'full_name:asc'
    | 'full_name:desc'
    | 'loyalty_stamps:desc'
  >('created_at:desc');
  const [page, setPage] = useState(0);
  const limit = 20;

  // Customer drawer state
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerError, setDrawerError] = useState('');

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const [sortBy, sortOrder] = useMemo(() => {
    const [by, order] = sortOption.split(':') as [
      'created_at' | 'full_name' | 'loyalty_stamps',
      'asc' | 'desc',
    ];
    return [by, order];
  }, [sortOption]);

  // Fetch customers
  const reload = useCallback(() => {
    setError('');
    setLoading(true);
    setRevision(val => val + 1);
  }, []);

  useEffect(() => {
    if (!token) return;
    let active = true;

    getCustomers(token, {
      search: debouncedSearch,
      status: statusFilter,
      sort_by: sortBy,
      sort_order: sortOrder,
      limit,
      offset: page * limit,
    })
      .then(res => {
        if (!active) return;
        setCustomers(res.items);
        setTotal(res.total);
        setMetrics(res.metrics);
        setLastRefreshed(new Date());
        setLoading(false);
      })
      .catch(cause => {
        if (!active) return;
        setError(cause instanceof Error ? cause.message : 'Customer records are unavailable.');
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [token, debouncedSearch, statusFilter, sortBy, sortOrder, page, revision]);

  // Open customer drawer
  async function handleOpenDetails(id: number) {
    if (!token) return;
    setSelectedCustomerId(id);
    setDrawerLoading(true);
    setDrawerError('');
    setSelectedCustomer(null);

    // Prepopulate from existing row for instantaneous feedback
    const existing = customers.find(c => c.id === id);
    if (existing) setSelectedCustomer(existing);

    try {
      const detailed = await getCustomer(token, id);
      setSelectedCustomer(detailed);
    } catch (cause) {
      setDrawerError(cause instanceof Error ? cause.message : 'Could not load customer profile.');
    } finally {
      setDrawerLoading(false);
    }
  }

  function handleCloseDrawer() {
    setSelectedCustomerId(null);
    setSelectedCustomer(null);
    setDrawerError('');
  }

  const totalPages = Math.ceil(total / limit);
  const isFiltered = Boolean(
    debouncedSearch || statusFilter !== 'all' || sortOption !== 'created_at:desc',
  );

  return (
    <div className="page-stack">
      {/* Breadcrumb & Page Heading */}
      <div className="customers-page-header">
        <div>
          <nav aria-label="Breadcrumb" className="breadcrumb">
            <Link to="/admin/dashboard" className="breadcrumb-link">
              Dashboard
            </Link>
            <ChevronRight size={13} className="breadcrumb-separator" aria-hidden="true" />
            <span className="breadcrumb-current" aria-current="page">
              Customers
            </span>
          </nav>
          <div className="eyebrow mt-1">COMMUNITY &amp; LOYALTY</div>
          <h1>
            Customers
            <span className="heading-period">.</span>
          </h1>
          <p className="page-subtitle">View and manage your café customer records.</p>
        </div>

        <div className="flex items-center gap-2">
          <span className="heading-pill">
            <span className="live-dot" aria-hidden="true" />
            <span>Latest available data</span>
            {lastRefreshed && (
              <span className="text-xs font-normal text-blue-700 ml-1">
                · {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </span>
          <button
            type="button"
            className="icon-button"
            onClick={reload}
            disabled={loading}
            aria-label="Refresh customer records"
            title="Refresh customer records"
          >
            <RotateCcw size={15} className={loading ? 'animate-spin' : ''} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Authoritative Metric Cards (Apex Inspired) */}
      <div className="customer-stats-grid">
        <article className="customer-stat-card">
          <div className="customer-stat-header">
            <span className="customer-stat-label">Total Customers</span>
            <span className="customer-stat-icon cobalt" aria-hidden="true">
              <Users size={20} />
            </span>
          </div>
          <strong className="customer-stat-value">
            {error ? '—' : number.format(metrics.total_customers)}
          </strong>
          <small className="customer-stat-subtext">
            {error ? 'Metrics unavailable' : 'Registered customer accounts'}
          </small>
        </article>

        <article className="customer-stat-card">
          <div className="customer-stat-header">
            <span className="customer-stat-label">Active Accounts</span>
            <span className="customer-stat-icon emerald" aria-hidden="true">
              <UserCheck size={20} />
            </span>
          </div>
          <strong className="customer-stat-value">
            {error ? '—' : number.format(metrics.active_customers)}
          </strong>
          <small className="customer-stat-subtext">
            {error ? 'Metrics unavailable' : 'Eligible for ordering & loyalty'}
          </small>
        </article>

        <article className="customer-stat-card">
          <div className="customer-stat-header">
            <span className="customer-stat-label">Inactive Accounts</span>
            <span className="customer-stat-icon amber" aria-hidden="true">
              <UserX size={20} />
            </span>
          </div>
          <strong className="customer-stat-value">
            {error ? '—' : number.format(metrics.inactive_customers)}
          </strong>
          <small className="customer-stat-subtext">
            {error ? 'Metrics unavailable' : 'Deactivated or dormant'}
          </small>
        </article>
      </div>

      {/* Main Customers Panel */}
      <section className="panel customers-panel">
        {/* Status Tabs and Search/Sort Toolbar */}
        <div className="customers-toolbar">
          <div className="status-tabs" role="tablist" aria-label="Filter customers by status">
            <button
              type="button"
              role="tab"
              aria-selected={statusFilter === 'all'}
              className={`status-tab ${statusFilter === 'all' ? 'active' : ''}`}
              onClick={() => {
                setStatusFilter('all');
                setPage(0);
              }}
            >
              <span>All Customers</span>
              <span className="status-tab-count">{error ? '—' : metrics.total_customers}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={statusFilter === 'active'}
              className={`status-tab ${statusFilter === 'active' ? 'active' : ''}`}
              onClick={() => {
                setStatusFilter('active');
                setPage(0);
              }}
            >
              <span>Active</span>
              <span className="status-tab-count">{error ? '—' : metrics.active_customers}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={statusFilter === 'inactive'}
              className={`status-tab ${statusFilter === 'inactive' ? 'active' : ''}`}
              onClick={() => {
                setStatusFilter('inactive');
                setPage(0);
              }}
            >
              <span>Inactive</span>
              <span className="status-tab-count">{error ? '—' : metrics.inactive_customers}</span>
            </button>
          </div>

          <div className="customers-toolbar-controls">
            <label className="sr-only" htmlFor="customer-search">
              Search customers by name, phone, or email
            </label>
            <div className="customer-search-wrapper">
              <input
                id="customer-search"
                className="text-input customer-search-input"
                aria-label="Search customers"
                placeholder="Search customers by name, phone, or email…"
                value={search}
                onChange={event => setSearch(event.target.value)}
              />
              <Search size={15} className="customer-search-icon" aria-hidden="true" />
            </div>

            <label className="sr-only" htmlFor="customer-sort">
              Sort customer records
            </label>
            <select
              id="customer-sort"
              className="text-input customer-sort-select"
              aria-label="Sort customer records"
              value={sortOption}
              onChange={event => {
                setSortOption(event.target.value as any);
                setPage(0);
              }}
            >
              <option value="created_at:desc">Newest first</option>
              <option value="created_at:asc">Oldest first</option>
              <option value="full_name:asc">Name (A–Z)</option>
              <option value="full_name:desc">Name (Z–A)</option>
              <option value="loyalty_stamps:desc">Most loyalty stamps</option>
            </select>

            {isFiltered && (
              <button
                type="button"
                className="button-secondary text-xs h-10 px-3"
                onClick={() => {
                  setSearch('');
                  setStatusFilter('all');
                  setSortOption('created_at:desc');
                  setPage(0);
                }}
              >
                Reset filters
              </button>
            )}
          </div>
        </div>

        {/* Content States */}
        {loading ? (
          <TableSkeleton rows={6} />
        ) : error ? (
          <div
            className="state-panel error-panel p-8 flex flex-col items-center text-center"
            role="alert"
          >
            <AlertCircle size={32} className="text-red-500 mb-2" aria-hidden="true" />
            <strong className="text-base font-bold text-slate-900 mb-1">
              {getCustomerErrorTitle(error)}
            </strong>
            <span className="text-xs text-slate-600 max-w-md leading-relaxed mb-4">
              {getCustomerErrorDescription(error)}
            </span>
            <button
              className="button-secondary flex items-center gap-1.5 text-xs font-semibold px-4 py-2"
              type="button"
              onClick={reload}
            >
              <RotateCcw size={14} aria-hidden="true" />
              <span>Retry</span>
            </button>
          </div>
        ) : customers.length === 0 ? (
          <EmptyState
            title={isFiltered ? 'No matching customers found' : 'No customers registered yet'}
            detail={
              isFiltered
                ? 'Try adjusting your search keywords or switching status tabs.'
                : 'Customer accounts created via the mobile app or customer storefront will populate here automatically.'
            }
          />
        ) : (
          <>
            <div className="table-scroll">
              <table className="customers-table">
                <caption className="sr-only">Café Customer Accounts Directory</caption>
                <thead>
                  <tr>
                    <th scope="col">Customer</th>
                    <th scope="col">Contact</th>
                    <th scope="col">Loyalty</th>
                    <th scope="col">Orders &amp; Recognized Spend</th>
                    <th scope="col">Status</th>
                    <th scope="col">Joined</th>
                    <th scope="col" className="numeric">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map(customer => {
                    const statusBadge = getCustomerStatusBadge(customer.is_active);
                    const initials = getInitials(customer.full_name);

                    return (
                      <tr key={customer.id} className="customer-row">
                        <td>
                          <div className="flex items-center gap-3">
                            <div className="customer-avatar" aria-hidden="true">
                              <span>{initials}</span>
                            </div>
                            <div className="flex flex-col min-w-0">
                              <strong className="text-slate-900 dark:text-zinc-100 text-sm font-semibold truncate">
                                {customer.full_name}
                              </strong>
                              <span className="text-xs text-slate-500 dark:text-zinc-400 font-mono">
                                #CUST-{customer.id}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="flex flex-col gap-1 text-xs">
                            {customer.email ? (
                              <span className="flex items-center gap-1.5 text-slate-800 dark:text-zinc-200">
                                <Mail
                                  size={12}
                                  className="text-slate-500 dark:text-zinc-400 shrink-0"
                                  aria-hidden="true"
                                />
                                <span className="truncate max-w-xs">{customer.email}</span>
                              </span>
                            ) : (
                              <span className="text-slate-400 dark:text-zinc-500 italic">
                                No email
                              </span>
                            )}
                            <span className="flex items-center gap-1.5 text-slate-700 dark:text-zinc-300 font-mono">
                              <Phone
                                size={12}
                                className="text-slate-500 dark:text-zinc-400 shrink-0"
                                aria-hidden="true"
                              />
                              <span>{customer.phone}</span>
                            </span>
                          </div>
                        </td>
                        <td>
                          <div
                            className="customer-loyalty-chip"
                            title={`${customer.loyalty_stamps} loyalty stamps collected`}
                          >
                            <Award
                              size={13}
                              className="text-amber-600 shrink-0"
                              aria-hidden="true"
                            />
                            <span className="font-bold text-amber-900 dark:text-amber-300">
                              {customer.loyalty_stamps}
                            </span>
                            <span className="text-amber-800 dark:text-amber-400 text-xs">
                              stamps
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="flex flex-col text-xs">
                            <span className="font-bold text-slate-900 dark:text-zinc-100">
                              {customer.total_orders}{' '}
                              {customer.total_orders === 1 ? 'order' : 'orders'}
                            </span>
                            <span className="text-slate-600 dark:text-zinc-300 font-medium">
                              {money.format(customer.total_spent_usd)} recognized
                            </span>
                          </div>
                        </td>
                        <td>
                          <span className={statusBadge.className}>{statusBadge.label}</span>
                        </td>
                        <td>
                          <div className="flex flex-col text-xs text-slate-600 dark:text-zinc-400">
                            <span>{formatDate(customer.created_at)}</span>
                            <span className="text-slate-400 dark:text-zinc-500 text-xxs">
                              Active: {formatDate(customer.last_login_at)}
                            </span>
                          </div>
                        </td>
                        <td className="numeric">
                          <button
                            type="button"
                            className="button-secondary customer-action-button"
                            onClick={() => handleOpenDetails(customer.id)}
                            aria-label={`View profile for ${customer.full_name}`}
                          >
                            <Eye size={14} aria-hidden="true" />
                            <span>Details</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="customer-pagination">
              <span className="customer-pagination-info">
                Showing <strong>{page * limit + 1}</strong> to{' '}
                <strong>{Math.min((page + 1) * limit, total)}</strong> of <strong>{total}</strong>{' '}
                customers
              </span>

              <div className="customer-pagination-actions">
                <button
                  type="button"
                  className="button-secondary pagination-btn"
                  disabled={page === 0}
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  aria-label="Previous page"
                >
                  <ChevronLeft size={16} aria-hidden="true" />
                  <span>Previous</span>
                </button>
                <span className="pagination-page-indicator">
                  Page {page + 1} of {Math.max(1, totalPages)}
                </span>
                <button
                  type="button"
                  className="button-secondary pagination-btn"
                  disabled={page + 1 >= totalPages}
                  onClick={() => setPage(p => p + 1)}
                  aria-label="Next page"
                >
                  <span>Next</span>
                  <ChevronRight size={16} aria-hidden="true" />
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      {/* Slide-Over Customer Detail Drawer */}
      <Drawer
        isOpen={selectedCustomerId !== null}
        onClose={handleCloseDrawer}
        eyebrow="CUSTOMER ACCOUNT PROFILE"
        title={selectedCustomer?.full_name || 'Customer Details'}
        description={
          selectedCustomer
            ? `#CUST-${selectedCustomer.id} · Registered ${formatDate(selectedCustomer.created_at)}`
            : ''
        }
        footer={
          <button type="button" className="button-secondary w-full" onClick={handleCloseDrawer}>
            Close Profile
          </button>
        }
      >
        {drawerLoading && !selectedCustomer ? (
          <div className="py-8 text-center text-sm text-slate-500">Loading customer profile…</div>
        ) : drawerError && !selectedCustomer ? (
          <div className="form-error" role="alert">
            {drawerError}
          </div>
        ) : selectedCustomer ? (
          <div className="customer-drawer-content">
            {/* Header card with avatar */}
            <div className="customer-drawer-header-card">
              <div className="customer-avatar large" aria-hidden="true">
                <span>{getInitials(selectedCustomer.full_name)}</span>
              </div>
              <div className="customer-drawer-header-info">
                <h3>{selectedCustomer.full_name}</h3>
                <span className="customer-drawer-id">Customer ID: #CUST-{selectedCustomer.id}</span>
                <div className="mt-1">
                  <span className={getCustomerStatusBadge(selectedCustomer.is_active).className}>
                    {getCustomerStatusBadge(selectedCustomer.is_active).label}
                  </span>
                </div>
              </div>
            </div>

            {/* Contact Details */}
            <div className="drawer-section">
              <h4 className="drawer-section-title">Contact Information</h4>
              <div className="drawer-kv-grid">
                <div className="drawer-kv-item">
                  <span className="drawer-kv-label">Phone Number</span>
                  <strong className="drawer-kv-value flex items-center gap-1.5 font-mono">
                    <Phone
                      size={13}
                      className="text-slate-400 dark:text-zinc-500"
                      aria-hidden="true"
                    />
                    <span>{selectedCustomer.phone}</span>
                  </strong>
                </div>
                <div className="drawer-kv-item">
                  <span className="drawer-kv-label">Email Address</span>
                  <strong className="drawer-kv-value flex items-center gap-1.5">
                    <Mail
                      size={13}
                      className="text-slate-400 dark:text-zinc-500"
                      aria-hidden="true"
                    />
                    <span>{selectedCustomer.email || 'None provided'}</span>
                  </strong>
                </div>
              </div>
            </div>

            {/* Loyalty Stamps Meter */}
            <div className="drawer-section">
              <div className="flex items-center justify-between">
                <h4 className="drawer-section-title">Loyalty Rewards</h4>
                <span className="loyalty-pill">
                  <Coffee size={12} aria-hidden="true" />
                  <span>10 stamps = 1 free beverage</span>
                </span>
              </div>
              <div className="loyalty-progress-card">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-amber-950 dark:text-amber-200 flex items-center gap-1.5">
                    <Award
                      size={14}
                      className="text-amber-600 dark:text-amber-400"
                      aria-hidden="true"
                    />
                    Current Balance
                  </span>
                  <span className="text-xs font-bold text-amber-900 dark:text-amber-300">
                    {selectedCustomer.loyalty_stamps} / 10 stamps
                  </span>
                </div>
                <div
                  className="progress-bar-track"
                  role="progressbar"
                  aria-valuenow={selectedCustomer.loyalty_stamps % 10}
                  aria-valuemin={0}
                  aria-valuemax={10}
                >
                  <div
                    className="progress-bar-fill"
                    style={{
                      width: `${Math.min(100, ((selectedCustomer.loyalty_stamps % 10) / 10) * 100)}%`,
                    }}
                  />
                </div>
                <p className="text-xxs text-amber-800 dark:text-amber-300 mt-2">
                  {selectedCustomer.loyalty_stamps >= 10
                    ? `🎉 Customer has unlocked free drinks! (Total stamps earned: ${selectedCustomer.loyalty_stamps})`
                    : `${10 - (selectedCustomer.loyalty_stamps % 10)} more order${10 - (selectedCustomer.loyalty_stamps % 10) === 1 ? '' : 's'} needed for next reward.`}
                </p>
              </div>
            </div>

            {/* Café Activity Summary */}
            <div className="drawer-section">
              <h4 className="drawer-section-title">Café Activity</h4>
              <div className="drawer-kv-grid">
                <div className="drawer-kv-item">
                  <span className="drawer-kv-label">Total Café Orders</span>
                  <strong className="drawer-kv-value flex items-center gap-1.5">
                    <ShoppingBag
                      size={13}
                      className="text-slate-400 dark:text-zinc-500"
                      aria-hidden="true"
                    />
                    <span>{number.format(selectedCustomer.total_orders)} orders</span>
                  </strong>
                </div>
                <div className="drawer-kv-item">
                  <span className="drawer-kv-label">Recognized Spend (Paid &amp; Completed)</span>
                  <strong className="drawer-kv-value font-display text-base text-emerald-700 dark:text-emerald-400">
                    {money.format(selectedCustomer.total_spent_usd)}
                  </strong>
                </div>
                <div className="drawer-kv-item">
                  <span className="drawer-kv-label">Account Created</span>
                  <strong className="drawer-kv-value flex items-center gap-1.5 text-xs text-slate-700 dark:text-zinc-300">
                    <Calendar
                      size={13}
                      className="text-slate-400 dark:text-zinc-500"
                      aria-hidden="true"
                    />
                    <span>{formatDateTime(selectedCustomer.created_at)}</span>
                  </strong>
                </div>
                <div className="drawer-kv-item">
                  <span className="drawer-kv-label">Last Active Login</span>
                  <strong className="drawer-kv-value flex items-center gap-1.5 text-xs text-slate-700 dark:text-zinc-300">
                    <Clock
                      size={13}
                      className="text-slate-400 dark:text-zinc-500"
                      aria-hidden="true"
                    />
                    <span>{formatDateTime(selectedCustomer.last_login_at)}</span>
                  </strong>
                </div>
              </div>
            </div>

            {/* Read-Only Governance & Privacy Notice */}
            <div className="customer-privacy-callout">
              <div className="privacy-callout-icon" aria-hidden="true">
                <ShieldCheck size={20} />
              </div>
              <div className="privacy-callout-text">
                <h5>Privacy &amp; Credential Governance</h5>
                <p>
                  Customer accounts are self-managed through the customer web and mobile apps.
                  Passwords and payment instruments are never stored in plaintext or accessible in
                  management tools.
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs text-slate-600 dark:text-zinc-400 flex items-center justify-between">
              <span>Looking for line-item receipts?</span>
              <Link to="/admin/orders" className="text-link font-bold">
                Go to Orders &rarr;
              </Link>
            </div>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}
