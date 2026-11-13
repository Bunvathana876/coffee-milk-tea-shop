import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  ExternalLink,
  Lock,
  Mail,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Store,
  UserCheck,
  Users,
  XCircle,
} from 'lucide-react';
import { useAuth } from '../auth/authContext';
import { ConfirmAction } from '../components/ConfirmAction';
import { ErrorState } from '../components/States';
import {
  getSellers,
  getStaff,
  getStores,
  updateSellerStatus,
  type Seller,
  type SellerMetrics,
  type StaffUser,
  type Store as StoreType,
} from '../lib/api';

export type PermissionScope = 'allowed' | 'denied' | 'scoped' | 'not_implemented';

export interface PermissionRow {
  id: string;
  name: string;
  category: string;
  admin: PermissionScope;
  staff: PermissionScope;
  seller: PermissionScope;
  notes: string;
}

export const PERMISSION_MATRIX: PermissionRow[] = [
  {
    id: 'admin_dashboard',
    name: 'Access Administrator Dashboard',
    category: 'Administration',
    admin: 'allowed',
    staff: 'denied',
    seller: 'denied',
    notes: 'Restricted by requireAdmin middleware',
  },
  {
    id: 'manage_sellers',
    name: 'Manage Seller Accounts & Credentials',
    category: 'RBAC',
    admin: 'allowed',
    staff: 'denied',
    seller: 'denied',
    notes: 'Admin-only creation, password reset, and profiles',
  },
  {
    id: 'toggle_seller_status',
    name: 'Activate & Deactivate Sellers',
    category: 'RBAC',
    admin: 'allowed',
    staff: 'denied',
    seller: 'denied',
    notes: 'Immediate login lockout on deactivation',
  },
  {
    id: 'assign_stores',
    name: 'Assign Sellers to Café Stores',
    category: 'Tenancy',
    admin: 'allowed',
    staff: 'denied',
    seller: 'denied',
    notes: 'Relational mapping in seller_store_assignments',
  },
  {
    id: 'view_global_orders',
    name: 'View Global Customer Orders',
    category: 'Orders',
    admin: 'allowed',
    staff: 'allowed',
    seller: 'denied',
    notes: 'All store orders and unassigned historical orders',
  },
  {
    id: 'view_store_orders',
    name: 'View Assigned-Store Orders',
    category: 'Orders',
    admin: 'allowed',
    staff: 'allowed',
    seller: 'scoped',
    notes: 'Fail-closed: only active assigned store orders',
  },
  {
    id: 'manage_catalog',
    name: 'Manage Drink Products & Categories',
    category: 'Catalog',
    admin: 'allowed',
    staff: 'denied',
    seller: 'denied',
    notes: 'Authoritative brand prices and recipes',
  },
  {
    id: 'access_customers',
    name: 'Access Customer Directory & Stamps',
    category: 'Customers',
    admin: 'allowed',
    staff: 'denied',
    seller: 'denied',
    notes: 'Customer profiles and loyalty stamps registry',
  },
  {
    id: 'view_analytics',
    name: 'View Financial Analytics & Reports',
    category: 'Financial',
    admin: 'allowed',
    staff: 'denied',
    seller: 'denied',
    notes: 'Strict cash-flow and revenue recognition reporting',
  },
  {
    id: 'record_settlement',
    name: 'Record In-Person Cash Settlements',
    category: 'Financial',
    admin: 'allowed',
    staff: 'allowed',
    seller: 'denied',
    notes: 'Immutable audit trigger on payment_settlements',
  },
  {
    id: 'manage_staff',
    name: 'Manage Staff Roles & Accounts',
    category: 'Administration',
    admin: 'allowed',
    staff: 'denied',
    seller: 'denied',
    notes: 'Protected: cannot demote or deactivate last admin',
  },
];

export function getPermissionBadge(scope: PermissionScope) {
  switch (scope) {
    case 'allowed':
      return {
        label: 'Allowed',
        className:
          'permission-badge permission-badge-allowed bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-600',
        icon: CheckCircle2,
      };
    case 'scoped':
      return {
        label: 'Store-scoped',
        className:
          'permission-badge permission-badge-scoped bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/70 dark:text-blue-300 dark:border-blue-600',
        icon: Building2,
      };
    case 'denied':
      return {
        label: 'Denied',
        className:
          'permission-badge permission-badge-denied bg-red-100 text-red-800 border-red-300 dark:bg-red-950/70 dark:text-red-300 dark:border-red-600',
        icon: XCircle,
      };
    case 'not_implemented':
    default:
      return {
        label: 'Not Implemented',
        className:
          'permission-badge permission-badge-not-implemented bg-slate-200 text-slate-700 border-slate-300 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-600',
        icon: AlertCircle,
      };
  }
}

export function RoleControllerPage() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [revision, setRevision] = useState(0);

  // Data states
  const [staffUsers, setStaffUsers] = useState<StaffUser[] | null>(null);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [sellerMetrics, setSellerMetrics] = useState<SellerMetrics | null>(null);
  const [stores, setStores] = useState<StoreType[] | null>(null);

  // Filter & Search states
  const [sellerSearch, setSellerSearch] = useState('');
  const [sellerStatusFilter, setSellerStatusFilter] = useState<'all' | 'active' | 'inactive'>(
    'all',
  );

  // Action states
  const [statusConfirmSeller, setStatusConfirmSeller] = useState<Seller | null>(null);
  const [statusBusy, setStatusBusy] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');

  const reload = useCallback(() => {
    setRevision(r => r + 1);
  }, []);

  useEffect(() => {
    if (!token) return;
    let active = true;
    setLoading(true);
    setError('');

    Promise.allSettled([getStaff(token), getSellers(token, { limit: 100 }), getStores(token)])
      .then(([staffRes, sellersRes, storesRes]) => {
        if (!active) return;

        if (staffRes.status === 'fulfilled') {
          setStaffUsers(staffRes.value);
        } else {
          setStaffUsers(null);
        }

        if (sellersRes.status === 'fulfilled') {
          setSellers(sellersRes.value.items || []);
          setSellerMetrics(sellersRes.value.metrics || null);
        } else {
          setSellers([]);
          setSellerMetrics(null);
        }

        if (storesRes.status === 'fulfilled') {
          setStores(storesRes.value.items || []);
        } else {
          setStores(null);
        }

        setLastRefreshed(new Date());
        setLoading(false);
      })
      .catch(err => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Failed to load role controller data.');
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [token, revision]);

  // Count administrators and staff safely from real database records
  const adminCount = useMemo(() => {
    if (!staffUsers) return null;
    return staffUsers.filter(u => u.role === 'admin' && u.is_active).length;
  }, [staffUsers]);

  const staffCount = useMemo(() => {
    if (!staffUsers) return null;
    return staffUsers.filter(u => u.role === 'staff' && u.is_active).length;
  }, [staffUsers]);

  const sellerCount = useMemo(() => {
    if (sellerMetrics) return sellerMetrics.total_sellers;
    return sellers.length;
  }, [sellerMetrics, sellers]);

  // Filtered sellers for table
  const filteredSellers = useMemo(() => {
    return sellers.filter(s => {
      if (sellerStatusFilter === 'active' && !s.is_active) return false;
      if (sellerStatusFilter === 'inactive' && s.is_active) return false;
      if (sellerSearch.trim()) {
        const query = sellerSearch.trim().toLowerCase();
        const matchesName = s.full_name?.toLowerCase().includes(query);
        const matchesEmail = s.email?.toLowerCase().includes(query);
        if (!matchesName && !matchesEmail) return false;
      }
      return true;
    });
  }, [sellers, sellerStatusFilter, sellerSearch]);

  // Toggle seller status handler
  async function handleConfirmStatusChange() {
    if (!token || !statusConfirmSeller) return;
    setStatusBusy(true);
    try {
      const nextActive = !statusConfirmSeller.is_active;
      await updateSellerStatus(token, statusConfirmSeller.id, nextActive);
      setStatusConfirmSeller(null);
      setFeedbackMessage(
        nextActive
          ? `Seller ${statusConfirmSeller.full_name} activated successfully.`
          : `Seller ${statusConfirmSeller.full_name} deactivated successfully.`,
      );
      setTimeout(() => setFeedbackMessage(''), 4000);
      reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update seller status.');
    } finally {
      setStatusBusy(false);
    }
  }

  return (
    <div className="page-stack role-controller-enter">
      {/* Toast Feedback */}
      {feedbackMessage && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/60 p-4 text-emerald-900 dark:text-emerald-100 text-sm flex items-center justify-between shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2
              size={16}
              className="text-emerald-700 dark:text-emerald-400 shrink-0"
              aria-hidden="true"
            />
            <span className="font-medium">{feedbackMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackMessage('')}
            className="text-xs text-emerald-800 dark:text-emerald-200 font-semibold underline ml-4 hover:opacity-80"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Page Heading */}
      <div className="page-heading">
        <div>
          <div className="eyebrow">ACCESS &amp; SECURITY</div>
          <h1>
            Role Controller
            <span className="heading-period">.</span>
          </h1>
          <p className="page-subtitle">
            Manage role access, seller accounts, and store permissions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="heading-pill">
            <span className="live-dot" aria-hidden="true" />
            <span>Server Verified RBAC</span>
            {lastRefreshed && (
              <span className="text-xs font-semibold text-blue-800 dark:text-blue-200 ml-1">
                · {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </span>

          <button
            type="button"
            className="icon-button"
            onClick={reload}
            disabled={loading}
            aria-label="Refresh role controller data"
            title="Refresh role controller data"
          >
            <RotateCcw size={15} className={loading ? 'animate-spin' : ''} aria-hidden="true" />
          </button>

          <Link
            to="/admin/sellers"
            className="button-primary flex items-center gap-1.5 text-xs font-semibold"
            aria-label="Manage Sellers Directory"
          >
            <Users size={14} aria-hidden="true" />
            <span>Manage Sellers</span>
          </Link>
        </div>
      </div>

      {error && <ErrorState message={error} retry={reload} />}

      {/* SECTION 1: ROLE OVERVIEW (3 CARDS) */}
      <section aria-labelledby="role-overview-heading" className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2
            id="role-overview-heading"
            className="text-sm font-extrabold tracking-wide uppercase text-slate-900 dark:text-zinc-200"
          >
            System Roles Overview
          </h2>
          <span className="text-xs font-bold text-slate-700 dark:text-zinc-300">
            Authoritative database accounts
          </span>
        </div>

        <div className="seller-stats-grid">
          {/* Card 1: Administrators */}
          <article className="seller-stat-card">
            <div className="seller-stat-header">
              <span className="seller-stat-label">Administrators</span>
              <span className="seller-stat-icon cobalt" aria-hidden="true">
                <ShieldCheck size={20} />
              </span>
            </div>
            <strong className="seller-stat-value">{adminCount !== null ? adminCount : '—'}</strong>
            <p className="role-card-subtitle admin text-xs font-bold text-blue-900 dark:text-blue-300 mt-1">
              Full Governance &amp; Security Authority
            </p>
            <small className="seller-stat-subtext mt-1 font-medium">
              Catalog CRUD, seller account provisioning, store assignments, financial analytics, and
              last-admin lockout protection.
            </small>
          </article>

          {/* Card 2: Staff */}
          <article className="seller-stat-card">
            <div className="seller-stat-header">
              <span className="seller-stat-label">Staff Members</span>
              <span className="seller-stat-icon amber" aria-hidden="true">
                <UserCheck size={20} />
              </span>
            </div>
            <strong className="seller-stat-value">{staffCount !== null ? staffCount : '—'}</strong>
            <p className="role-card-subtitle staff text-xs font-bold text-amber-900 dark:text-amber-300 mt-1">
              In-Store Operations &amp; Cash Settlement
            </p>
            <small className="seller-stat-subtext mt-1 font-medium">
              Order preparation queue management, drink status progression, and verified cash
              settlement recording. No administrative access.
            </small>
          </article>

          {/* Card 3: Sellers */}
          <article className="seller-stat-card">
            <div className="seller-stat-header">
              <span className="seller-stat-label">Seller Partners</span>
              <span className="seller-stat-icon emerald" aria-hidden="true">
                <Store size={20} />
              </span>
            </div>
            <strong className="seller-stat-value">
              {sellerCount !== null ? sellerCount : '—'}
            </strong>
            <p className="role-card-subtitle seller text-xs font-bold text-emerald-900 dark:text-emerald-300 mt-1">
              Store-Scoped Read-Only Isolation
            </p>
            <small className="seller-stat-subtext mt-1 font-medium">
              Multi-tenant store order monitoring for assigned active café branches. Fail-closed:
              cannot view global orders or cash records.
            </small>
          </article>
        </div>
      </section>

      {/* SECTION 2: PERMISSION MATRIX */}
      <section
        aria-labelledby="permission-matrix-heading"
        className="panel p-6 flex flex-col gap-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-zinc-800 pb-4">
          <div>
            <div className="eyebrow text-cobalt dark:text-blue-400 mb-1">POLICY SPECIFICATION</div>
            <h2
              id="permission-matrix-heading"
              className="matrix-title text-lg sm:text-xl font-bold text-slate-900 dark:text-zinc-50 flex items-center gap-2"
            >
              <ShieldAlert
                size={20}
                className="text-blue-600 dark:text-blue-400 shrink-0"
                aria-hidden="true"
              />
              <span>Role &amp; Permission Policy Matrix</span>
            </h2>
            <p className="matrix-subtitle text-xs sm:text-sm text-slate-800 dark:text-zinc-200 mt-1 font-medium">
              Authoritative server middleware enforcement across API boundaries.
            </p>
          </div>
          <span className="matrix-badge-readonly inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold self-start sm:self-auto">
            <Lock size={12} className="text-current" aria-hidden="true" />
            <span>Read-Only Policy Specification</span>
          </span>
        </div>

        <div className="table-scroll">
          <table className="sellers-table" aria-label="Role permission policy matrix">
            <thead>
              <tr>
                <th scope="col" style={{ width: '38%' }}>
                  Permission / Capability
                </th>
                <th scope="col" style={{ width: '18%' }}>
                  Administrator
                </th>
                <th scope="col" style={{ width: '18%' }}>
                  Staff
                </th>
                <th scope="col" style={{ width: '26%' }}>
                  Seller Partner
                </th>
              </tr>
            </thead>
            <tbody>
              {PERMISSION_MATRIX.map(row => {
                const adminBadge = getPermissionBadge(row.admin);
                const staffBadge = getPermissionBadge(row.staff);
                const sellerBadge = getPermissionBadge(row.seller);

                const AdminIcon = adminBadge.icon;
                const StaffIcon = staffBadge.icon;
                const SellerIcon = sellerBadge.icon;

                return (
                  <tr key={row.id}>
                    <td>
                      <div className="flex flex-col py-0.5">
                        <strong className="matrix-row-name text-xs sm:text-sm font-bold text-slate-900 dark:text-zinc-100">
                          {row.name}
                        </strong>
                        <span className="matrix-row-desc text-xs font-medium text-slate-700 dark:text-zinc-200 mt-0.5 leading-normal">
                          {row.notes}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className={adminBadge.className}>
                        <AdminIcon size={13} aria-hidden="true" />
                        <span>{adminBadge.label}</span>
                      </span>
                    </td>
                    <td>
                      <span className={staffBadge.className}>
                        <StaffIcon size={13} aria-hidden="true" />
                        <span>{staffBadge.label}</span>
                      </span>
                    </td>
                    <td>
                      <span className={sellerBadge.className}>
                        <SellerIcon size={13} aria-hidden="true" />
                        <span>{sellerBadge.label}</span>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="matrix-policy-note flex items-start gap-2.5">
          <Lock
            size={15}
            className="shrink-0 mt-0.5 text-blue-800 dark:text-blue-400"
            aria-hidden="true"
          />
          <span className="leading-relaxed">
            <strong className="font-bold">Policy Lockdown Note:</strong> Permissions are strictly
            enforced by backend route middleware (
            <code className="bg-slate-200 dark:bg-zinc-800 px-1 py-0.5 rounded font-mono font-bold text-slate-900 dark:text-zinc-100 border border-slate-300 dark:border-zinc-700">
              requireAdmin
            </code>
            ,{' '}
            <code className="bg-slate-200 dark:bg-zinc-800 px-1 py-0.5 rounded font-mono font-bold text-slate-900 dark:text-zinc-100 border border-slate-300 dark:border-zinc-700">
              authenticateStaff
            </code>
            ,{' '}
            <code className="bg-slate-200 dark:bg-zinc-800 px-1 py-0.5 rounded font-mono font-bold text-slate-900 dark:text-zinc-100 border border-slate-300 dark:border-zinc-700">
              authenticateSeller
            </code>
            ). Role capabilities cannot be modified by client-side state manipulation.
          </span>
        </div>
      </section>

      {/* SECTION 3: SELLER ACCESS MANAGEMENT */}
      <section aria-labelledby="seller-access-heading" className="panel p-6 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-zinc-800 pb-4">
          <div>
            <div className="eyebrow text-cobalt dark:text-blue-400 mb-1">
              DIRECTORY &amp; STATUS
            </div>
            <h2
              id="seller-access-heading"
              className="text-base sm:text-lg font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2"
            >
              <Users
                size={18}
                className="text-blue-600 dark:text-blue-400 shrink-0"
                aria-hidden="true"
              />
              <span>Seller Account Access &amp; Status</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-800 dark:text-zinc-200 mt-1 font-medium">
              Control seller activation status and store eligibility.
            </p>
          </div>

          <Link
            to="/admin/sellers"
            className="text-xs sm:text-sm text-blue-800 dark:text-blue-300 hover:underline font-bold flex items-center gap-1 self-start sm:self-auto"
          >
            <span>Open Full Seller Management</span>
            <ExternalLink size={13} aria-hidden="true" />
          </Link>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="status-tabs" role="tablist" aria-label="Filter sellers by status">
            <button
              type="button"
              role="tab"
              aria-selected={sellerStatusFilter === 'all'}
              className={`status-tab ${sellerStatusFilter === 'all' ? 'active' : ''}`}
              onClick={() => setSellerStatusFilter('all')}
            >
              <span>All Sellers</span>
              <span className="status-tab-count">{sellers.length}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={sellerStatusFilter === 'active'}
              className={`status-tab ${sellerStatusFilter === 'active' ? 'active' : ''}`}
              onClick={() => setSellerStatusFilter('active')}
            >
              <span>Active</span>
              <span className="status-tab-count">{sellers.filter(s => s.is_active).length}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={sellerStatusFilter === 'inactive'}
              className={`status-tab ${sellerStatusFilter === 'inactive' ? 'active' : ''}`}
              onClick={() => setSellerStatusFilter('inactive')}
            >
              <span>Inactive</span>
              <span className="status-tab-count">{sellers.filter(s => !s.is_active).length}</span>
            </button>
          </div>

          <div className="seller-search-wrapper w-full sm:w-64">
            <input
              id="role-seller-search"
              type="search"
              className="text-input seller-search-input text-xs text-slate-900 dark:text-zinc-100 font-semibold placeholder:text-slate-500 placeholder:font-normal"
              placeholder="Search sellers…"
              aria-label="Search sellers by name or email"
              value={sellerSearch}
              onChange={e => setSellerSearch(e.target.value)}
            />
            <Search size={14} className="seller-search-icon" aria-hidden="true" />
          </div>
        </div>

        {/* Table */}
        {sellers.length === 0 ? (
          <div className="p-8 text-center flex flex-col items-center border border-dashed border-slate-300 dark:border-zinc-700 rounded-xl">
            <Store
              size={28}
              className="text-slate-600 dark:text-zinc-400 mb-2"
              aria-hidden="true"
            />
            <p className="text-sm font-extrabold text-slate-900 dark:text-zinc-100">
              No sellers provisioned
            </p>
            <p className="text-xs text-slate-800 dark:text-zinc-200 mt-1 max-w-sm font-medium">
              Use the Seller Management workspace to create and provision authorized seller
              accounts.
            </p>
            <Link to="/admin/sellers" className="button-primary text-xs mt-3 font-semibold">
              Go to Sellers Page
            </Link>
          </div>
        ) : filteredSellers.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-800 dark:text-zinc-200 font-semibold">
            No sellers match the search or status filter.
          </div>
        ) : (
          <div className="table-scroll">
            <table className="sellers-table" aria-label="Seller accounts access directory">
              <thead>
                <tr>
                  <th scope="col">Seller Partner</th>
                  <th scope="col">Email Contact</th>
                  <th scope="col">Assigned Store</th>
                  <th scope="col">Status</th>
                  <th scope="col" className="numeric">
                    Quick Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredSellers.map(seller => (
                  <tr key={seller.id}>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <div className="seller-avatar" aria-hidden="true">
                          <span>{seller.full_name?.slice(0, 2).toUpperCase() || 'SP'}</span>
                        </div>
                        <div className="flex flex-col">
                          <strong className="text-xs sm:text-sm font-bold text-slate-900 dark:text-zinc-100">
                            {seller.full_name}
                          </strong>
                          <span className="text-xs font-mono font-bold text-slate-700 dark:text-zinc-300">
                            #SELLER-{seller.id}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="text-xs text-slate-900 dark:text-zinc-100 flex items-center gap-1.5 font-semibold">
                        <Mail
                          size={13}
                          className="text-slate-700 dark:text-zinc-300 shrink-0"
                          aria-hidden="true"
                        />
                        <span>{seller.email}</span>
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5 text-xs text-slate-900 dark:text-zinc-100 font-semibold">
                        <Building2
                          size={13}
                          className="text-slate-700 dark:text-zinc-300 shrink-0"
                          aria-hidden="true"
                        />
                        <span>
                          {seller.store_name || (
                            <span className="italic font-semibold text-slate-600 dark:text-zinc-400">
                              Unassigned (Fails Closed)
                            </span>
                          )}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span
                        className={
                          seller.is_active
                            ? 'status-badge status-completed'
                            : 'status-badge status-cancelled'
                        }
                      >
                        {seller.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="numeric">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          className={`button-secondary seller-action-button text-xs font-bold text-slate-900 dark:text-zinc-100 ${
                            seller.is_active
                              ? 'hover:text-amber-700 dark:hover:text-amber-300'
                              : 'hover:text-emerald-700 dark:hover:text-emerald-300'
                          }`}
                          onClick={() => setStatusConfirmSeller(seller)}
                          aria-label={`${seller.is_active ? 'Deactivate' : 'Activate'} seller ${seller.full_name}`}
                        >
                          {seller.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                        <Link
                          to="/admin/sellers"
                          className="button-secondary seller-action-button text-xs font-bold text-slate-900 dark:text-zinc-100"
                          aria-label={`Manage store assignments for ${seller.full_name}`}
                          title="Manage store assignments in Sellers workspace"
                        >
                          <span>Manage</span>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* SECTION 4: STORE ACCESS OVERVIEW */}
      <section aria-labelledby="store-access-heading" className="panel p-6 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-zinc-800 pb-4">
          <div>
            <div className="eyebrow text-cobalt dark:text-blue-400 mb-1">
              PHYSICAL &amp; FRANCHISE LOCATIONS
            </div>
            <h2
              id="store-access-heading"
              className="text-base sm:text-lg font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2"
            >
              <Building2
                size={18}
                className="text-blue-600 dark:text-blue-400 shrink-0"
                aria-hidden="true"
              />
              <span>Café Store Registry &amp; Assignment Status</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-800 dark:text-zinc-200 mt-1 font-medium">
              Verified physical and franchise locations registered in database.
            </p>
          </div>

          <Link
            to="/admin/sellers"
            className="button-secondary text-xs font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Store size={13} aria-hidden="true" />
            <span>Manage Store Assignments</span>
          </Link>
        </div>

        {stores === null ? (
          <div className="p-6 text-center rounded-xl border border-amber-300 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/30 text-amber-950 dark:text-amber-100">
            <h3 className="text-sm font-extrabold">Store access setup required.</h3>
            <p className="text-xs mt-1 text-amber-950 dark:text-amber-100 font-medium max-w-lg mx-auto">
              The stores database schema migration (
              <code className="bg-amber-100/90 dark:bg-amber-900/50 text-amber-950 dark:text-amber-100 px-1 py-0.5 rounded font-mono font-bold border border-amber-300/60 dark:border-amber-700/60">
                003_stores_and_assignments.sql
              </code>
              ) must be approved and applied in the target database. Historical orders remain
              staff-visible only and fail closed against tenant queries.
            </p>
          </div>
        ) : stores.length === 0 ? (
          <div className="p-6 text-center rounded-xl border border-dashed border-slate-300 dark:border-zinc-700 text-slate-800 dark:text-zinc-200 text-xs font-semibold">
            No stores registered in the database registry yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stores.map(st => (
              <article
                key={st.id}
                className="p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col justify-between shadow-sm hover:border-slate-300 dark:hover:border-zinc-700 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono px-2.5 py-0.5 rounded bg-slate-200 dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 border border-slate-300 dark:border-zinc-700 font-extrabold">
                      {st.code}
                    </span>
                    <span
                      className={
                        st.is_active
                          ? 'status-badge status-completed text-xs'
                          : 'status-badge status-cancelled text-xs'
                      }
                    >
                      {st.is_active ? 'Active Store' : 'Inactive'}
                    </span>
                  </div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-zinc-50">
                    {st.name}
                  </h3>
                  {st.address && (
                    <p className="text-xs text-slate-800 dark:text-zinc-200 mt-1.5 line-clamp-2 leading-relaxed font-medium">
                      {st.address}
                    </p>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200 dark:border-zinc-800/80 flex items-center justify-between text-xs">
                  <span className="text-slate-800 dark:text-zinc-200 font-bold">
                    {st.assigned_sellers
                      ? `${st.assigned_sellers.length} assigned`
                      : 'Store registered'}
                  </span>
                  <Link
                    to="/admin/sellers"
                    className="text-blue-800 dark:text-blue-300 font-extrabold hover:underline flex items-center gap-1"
                  >
                    <span>Assign</span>
                    <ExternalLink size={12} aria-hidden="true" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* SECTION 5: SECURITY AUDIT ARCHITECTURE NOTICE */}
      <section
        className="seller-privacy-callout"
        aria-label="Security audit logging architecture notice"
      >
        <div className="privacy-callout-icon" aria-hidden="true">
          <ShieldAlert size={20} />
        </div>
        <div className="privacy-callout-text">
          <h3 className="text-sm font-extrabold text-red-950 dark:text-red-300 mb-1">
            Security Audit Logging Architecture
          </h3>
          <p className="text-xs text-red-950 dark:text-red-200 font-medium leading-relaxed">
            Security audit logging is active on the backend. All seller account provisioning, status
            toggles, store assignments, and staff modifications are permanently recorded in{' '}
            <code className="bg-red-100 dark:bg-red-950/80 text-red-950 dark:text-red-100 px-1.5 py-0.5 rounded font-mono font-bold border border-red-300/70 dark:border-red-800/80">
              security_audit_logs
            </code>
            . Audit log retrieval is currently restricted to direct database queries and not exposed
            via public API routes.
          </p>
        </div>
      </section>

      {/* Confirm Status Change Modal */}
      {statusConfirmSeller && (
        <ConfirmAction
          title={
            statusConfirmSeller.is_active
              ? 'Deactivate Seller Account?'
              : 'Activate Seller Account?'
          }
          detail={
            statusConfirmSeller.is_active
              ? `Are you sure you want to deactivate ${statusConfirmSeller.full_name}? They will immediately be denied login to the seller portal.`
              : `Are you sure you want to activate ${statusConfirmSeller.full_name}? They will be permitted to log in with their credentials.`
          }
          busy={statusBusy}
          onCancel={() => setStatusConfirmSeller(null)}
          onConfirm={handleConfirmStatusChange}
        />
      )}
    </div>
  );
}
