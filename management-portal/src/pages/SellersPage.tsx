import { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  Building2,
  Calendar,
  CheckCircle2,
  Eye,
  KeyRound,
  Lock,
  Mail,
  Plus,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Store as StoreIcon,
  UserCheck,
  Users,
  UserX,
} from 'lucide-react';
import { useAuth } from '../auth/authContext';
import { ConfirmAction } from '../components/ConfirmAction';
import { Drawer } from '../components/Drawer';
import {
  assignSellerStore,
  createSeller,
  getSeller,
  getSellers,
  getStores,
  unassignSellerStore,
  updateSeller,
  updateSellerStatus,
  type Seller,
  type SellerMetrics,
  type Store,
} from '../lib/api';

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
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getSellerStatusBadge(isActive: boolean) {
  if (isActive) {
    return { className: 'status-badge status-completed', label: 'Active' };
  }
  return { className: 'status-badge status-cancelled', label: 'Inactive' };
}

export interface AddSellerDrawerFormProps {
  name: string;
  setName: (val: string) => void;
  email: string;
  setEmail: (val: string) => void;
  password: string;
  setPassword: (val: string) => void;
  storeId: string;
  setStoreId: (val: string) => void;
  active: boolean;
  setActive: (val: boolean) => void;
  busy?: boolean;
  error?: string | null;
  stores: Store[];
  onSubmit: (e: React.FormEvent) => void;
}

export function AddSellerDrawerForm({
  name,
  setName,
  email,
  setEmail,
  password,
  setPassword,
  storeId,
  setStoreId,
  active,
  setActive,
  busy = false,
  error = null,
  stores,
  onSubmit,
}: AddSellerDrawerFormProps) {
  return (
    <form id="add-seller-form" onSubmit={onSubmit} className="flex flex-col gap-4 py-2">
      {error && (
        <div
          className="p-3 text-xs rounded-lg border border-red-500/30 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 flex items-center gap-2"
          role="alert"
        >
          <AlertCircle size={15} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="form-field">
        <label className="form-label text-xs font-bold" htmlFor="add-name">
          Full Name *
        </label>
        <input
          id="add-name"
          type="text"
          required
          className="text-input mt-1 w-full"
          placeholder="e.g. Sothea Chan"
          value={name}
          onChange={e => setName(e.target.value)}
          disabled={busy}
        />
      </div>

      <div className="form-field">
        <label className="form-label text-xs font-bold" htmlFor="add-email">
          Work Email Address *
        </label>
        <input
          id="add-email"
          type="email"
          required
          className="text-input mt-1 w-full"
          placeholder="e.g. seller.boba@brewboba.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          disabled={busy}
        />
      </div>

      <div className="form-field">
        <label className="form-label text-xs font-bold" htmlFor="add-password">
          Initial Password * (minimum 8 characters)
        </label>
        <input
          id="add-password"
          type="password"
          required
          minLength={8}
          className="text-input mt-1 w-full"
          placeholder="••••••••••••"
          value={password}
          onChange={e => setPassword(e.target.value)}
          disabled={busy}
        />
      </div>

      <div className="form-field">
        <label className="form-label text-xs font-bold" htmlFor="add-store">
          Assigned Store (Multi-Tenant)
        </label>
        <select
          id="add-store"
          className="text-input mt-1 w-full text-xs font-semibold"
          value={storeId}
          onChange={e => setStoreId(e.target.value)}
          disabled={busy}
        >
          <option value="">No store assigned initially (unassigned)</option>
          {stores
            .filter(s => s.is_active)
            .map(s => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.code})
              </option>
            ))}
        </select>
        <p className="form-helper-text">
          {stores.length === 0
            ? 'No active stores available in store registry.'
            : 'Sellers can also be assigned or re-assigned to stores anytime from their details drawer.'}
        </p>
      </div>

      <div className="flex items-center gap-2 mt-2">
        <input
          id="add-active"
          type="checkbox"
          checked={active}
          onChange={e => setActive(e.target.checked)}
          disabled={busy}
          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
        />
        <label htmlFor="add-active" className="form-checkbox-label">
          Account is Active (eligible to sign in immediately)
        </label>
      </div>
    </form>
  );
}

export function SellerTableSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="table-scroll">
      <table className="sellers-table">
        <caption className="sr-only">Loading seller records</caption>
        <thead>
          <tr>
            <th scope="col">Seller</th>
            <th scope="col">Contact</th>
            <th scope="col">Assigned Store</th>
            <th scope="col">Status</th>
            <th scope="col">Joined</th>
            <th scope="col" className="numeric">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <tr key={i} className="skeleton-row">
              <td>
                <div className="skeleton-cell w-36 h-4" />
              </td>
              <td>
                <div className="skeleton-cell w-40 h-4" />
              </td>
              <td>
                <div className="skeleton-cell w-28 h-4" />
              </td>
              <td>
                <div className="skeleton-cell w-16 h-4" />
              </td>
              <td>
                <div className="skeleton-cell w-24 h-4" />
              </td>
              <td className="numeric">
                <div className="skeleton-cell w-16 h-7 ml-auto" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Architectural roadmap component explaining multi-tenant prerequisites.
 */
export function SellerArchitectureRoadmap() {
  const [isOpen, setIsOpen] = useState(false);
  const requirements = [
    {
      title: '1. Store Registry & Ownership Schema',
      desc: 'Dedicated stores table with physical/franchise locations, store identifiers, and operating status.',
      status: 'Active (Store Registry Live - Phase M5C)',
    },
    {
      title: '2. Multi-Tenant Seller Roles & Membership',
      desc: 'Separation of seller accounts from admin staff, linking seller profiles strictly to their assigned store.',
      status: 'Active (RBAC Foundation Implemented)',
    },
    {
      title: '3. Store-Scoped Data Isolation',
      desc: 'Row-level security ensuring sellers can only access orders for their assigned active store.',
      status: 'Active (Store-Scoped Isolation Enforced - Phase M5C)',
    },
    {
      title: '4. Dedicated Seller Portal Entry & Auth',
      desc: 'Independent seller authentication routes at /seller/* protected against cross-store escalation.',
      status: 'Active (Seller Auth & Order APIs Ready)',
    },
  ];

  return (
    <details
      className="seller-architecture-card group"
      open={isOpen}
      onToggle={e => setIsOpen(e.currentTarget.open)}
      role="region"
      aria-label="Seller multi-tenant roadmap"
    >
      <summary className="seller-arch-header list-none flex items-center justify-between cursor-pointer select-none">
        <div className="flex items-center gap-2.5">
          <span className="seller-arch-icon" aria-hidden="true">
            <Building2 size={18} />
          </span>
          <div>
            <h3>Multi-Store Seller Architecture Roadmap</h3>
            <p>Prerequisites required before onboarding independent café store sellers.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="status-pill-subtle">
            <Lock size={12} aria-hidden="true" />
            <span>Security Gated</span>
          </span>
          <span className="text-xs text-slate-800 dark:text-zinc-200 font-bold">
            {isOpen ? 'Collapse ▲' : 'Expand Details ▼'}
          </span>
        </div>
      </summary>

      <div className="seller-arch-grid mt-4 pt-4 border-t border-slate-100 dark:border-zinc-800">
        {requirements.map((req, idx) => (
          <div key={idx} className="seller-arch-step">
            <div className="seller-step-num">{idx + 1}</div>
            <div className="seller-step-content">
              <strong>{req.title}</strong>
              <p>{req.desc}</p>
              <span className="seller-step-status">{req.status}</span>
            </div>
          </div>
        ))}
      </div>
    </details>
  );
}

// Safe helper to categorize API error states without hiding the real message
function getSellerErrorTitle(error: string): string {
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
  return 'Unable to Load Seller Records';
}

function getSellerErrorDescription(error: string): string {
  const lower = error.toLowerCase();
  if (lower.includes('route not found') || lower.includes('404')) {
    return `The server returned: "${error}". The seller administration endpoint is not mounted on the deployed backend service. Verify that the backend has deployed the latest RBAC routes.`;
  }
  if (
    lower.includes('forbidden') ||
    lower.includes('privilege') ||
    lower.includes('credential') ||
    lower.includes('401') ||
    lower.includes('403')
  ) {
    return 'Administrator authorization is required to access seller records. Your current session does not have sufficient permissions.';
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

export function SellersPage() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [total, setTotal] = useState(0);
  const [metrics, setMetrics] = useState<SellerMetrics>({
    total_sellers: 0,
    active_sellers: 0,
    inactive_sellers: 0,
  });
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [page, setPage] = useState(0);
  const limit = 20;
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [revision, setRevision] = useState(0);

  // Add Seller Drawer state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addName, setAddName] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addPassword, setAddPassword] = useState('');
  const [addStoreId, setAddStoreId] = useState('');
  const [addActive, setAddActive] = useState(true);
  const [addBusy, setAddBusy] = useState(false);
  const [addError, setAddError] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');

  // View / Edit Drawer state
  const [selectedSellerId, setSelectedSellerId] = useState<number | null>(null);
  const [selectedSeller, setSelectedSeller] = useState<Seller | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerError, setDrawerError] = useState('');
  const [editName, setEditName] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editBusy, setEditBusy] = useState(false);
  const [editSuccess, setEditSuccess] = useState('');

  // Store Management state
  const [stores, setStores] = useState<Store[]>([]);
  const [assignStoreId, setAssignStoreId] = useState('');
  const [storeActionBusy, setStoreActionBusy] = useState(false);
  const [storeActionError, setStoreActionError] = useState('');
  const [storeActionSuccess, setStoreActionSuccess] = useState('');

  // Confirm Status Change Modal state
  const [statusConfirmSeller, setStatusConfirmSeller] = useState<Seller | null>(null);
  const [statusBusy, setStatusBusy] = useState(false);

  const reload = useCallback(() => {
    setRevision(r => r + 1);
  }, []);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch sellers from authorized backend endpoint
  useEffect(() => {
    if (!token) return;

    let active = true;
    setLoading(true);
    setError('');

    getSellers(token, {
      search: debouncedSearch,
      status: statusFilter,
      limit,
      offset: page * limit,
    })
      .then(res => {
        if (!active) return;
        setSellers(res.items || []);
        setTotal(res.total || 0);
        setMetrics(
          res.metrics || {
            total_sellers: 0,
            active_sellers: 0,
            inactive_sellers: 0,
          },
        );
        setLastRefreshed(new Date());
        setLoading(false);
      })
      .catch(cause => {
        if (!active) return;
        setError(
          cause instanceof Error ? cause.message : 'Seller records are currently unavailable.',
        );
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [token, debouncedSearch, statusFilter, page, revision]);

  // Fetch stores for multi-tenant assignment
  useEffect(() => {
    if (!token) return;
    getStores(token, { is_active: true })
      .then(res => setStores(res.items || []))
      .catch(() => {});
  }, [token, revision]);

  // Open seller detail drawer
  async function handleOpenDetails(id: number) {
    if (!token) return;
    setSelectedSellerId(id);
    setDrawerLoading(true);
    setDrawerError('');
    setEditSuccess('');
    setStoreActionError('');
    setStoreActionSuccess('');
    setAssignStoreId('');

    try {
      const seller = await getSeller(token, id);
      setSelectedSeller(seller);
      setEditName(seller.full_name);
      setEditPassword('');
    } catch (err) {
      setDrawerError(err instanceof Error ? err.message : 'Failed to load seller details.');
    } finally {
      setDrawerLoading(false);
    }
  }

  function handleCloseDrawer() {
    setSelectedSellerId(null);
    setSelectedSeller(null);
    setDrawerError('');
    setEditSuccess('');
    setEditPassword('');
    setStoreActionError('');
    setStoreActionSuccess('');
    setAssignStoreId('');
  }

  // Handle Add Seller Submit
  async function handleCreateSeller(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;

    if (!addName.trim() || addName.trim().length < 2) {
      setAddError('Full name must be at least 2 characters.');
      return;
    }
    if (!addEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addEmail.trim())) {
      setAddError('A valid email address is required.');
      return;
    }
    if (!addPassword || addPassword.length < 8) {
      setAddError('Password must be at least 8 characters long.');
      return;
    }

    setAddBusy(true);
    setAddError('');

    try {
      const created = await createSeller(token, {
        full_name: addName.trim(),
        email: addEmail.trim().toLowerCase(),
        password: addPassword,
        is_active: addActive,
      });
      if (addStoreId) {
        try {
          await assignSellerStore(token, created.id, Number(addStoreId));
        } catch {
          // Non-blocking: store assignment can also be performed in detail drawer
        }
      }
      setIsAddOpen(false);
      setAddName('');
      setAddEmail('');
      setAddPassword('');
      setAddStoreId('');
      setAddActive(true);
      setFeedbackMessage(`Seller account for ${created.full_name} created successfully.`);
      setTimeout(() => setFeedbackMessage(''), 5000);
      reload();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Failed to create seller account.');
    } finally {
      setAddBusy(false);
    }
  }

  // Handle Assign Store to Seller
  async function handleAssignStore(sellerId: number, storeId: number) {
    if (!token) return;
    setStoreActionBusy(true);
    setStoreActionError('');
    setStoreActionSuccess('');
    try {
      await assignSellerStore(token, sellerId, storeId);
      setStoreActionSuccess('Store successfully assigned to seller.');
      setAssignStoreId('');
      const refreshed = await getSeller(token, sellerId);
      setSelectedSeller(refreshed);
      reload();
    } catch (err) {
      setStoreActionError(err instanceof Error ? err.message : 'Failed to assign store.');
    } finally {
      setStoreActionBusy(false);
    }
  }

  // Handle Unassign Store from Seller
  async function handleUnassignStore(sellerId: number, storeId: number) {
    if (!token) return;
    setStoreActionBusy(true);
    setStoreActionError('');
    setStoreActionSuccess('');
    try {
      await unassignSellerStore(token, sellerId, storeId);
      setStoreActionSuccess('Store unassigned successfully.');
      const refreshed = await getSeller(token, sellerId);
      setSelectedSeller(refreshed);
      reload();
    } catch (err) {
      setStoreActionError(err instanceof Error ? err.message : 'Failed to unassign store.');
    } finally {
      setStoreActionBusy(false);
    }
  }

  // Handle Edit Seller Submit
  async function handleUpdateSeller(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !selectedSeller) return;

    if (!editName.trim() || editName.trim().length < 2) {
      setDrawerError('Full name must be at least 2 characters.');
      return;
    }
    if (editPassword && editPassword.length < 8) {
      setDrawerError('Password must be at least 8 characters long if resetting.');
      return;
    }

    setEditBusy(true);
    setDrawerError('');
    setEditSuccess('');

    try {
      const updated = await updateSeller(token, selectedSeller.id, {
        full_name: editName.trim(),
        password: editPassword || undefined,
      });
      setSelectedSeller(updated);
      setEditPassword('');
      setEditSuccess('Seller profile updated successfully.');
      reload();
    } catch (err) {
      setDrawerError(err instanceof Error ? err.message : 'Failed to update seller.');
    } finally {
      setEditBusy(false);
    }
  }

  // Handle Toggle Seller Status
  async function handleConfirmStatusChange() {
    if (!token || !statusConfirmSeller) return;
    setStatusBusy(true);
    try {
      const nextActive = !statusConfirmSeller.is_active;
      await updateSellerStatus(token, statusConfirmSeller.id, nextActive);
      if (selectedSeller && selectedSeller.id === statusConfirmSeller.id) {
        setSelectedSeller({ ...selectedSeller, is_active: nextActive });
      }
      setStatusConfirmSeller(null);
      setFeedbackMessage(
        nextActive
          ? `Seller ${statusConfirmSeller.full_name} activated.`
          : `Seller ${statusConfirmSeller.full_name} deactivated.`,
      );
      setTimeout(() => setFeedbackMessage(''), 4000);
      reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update seller status.');
    } finally {
      setStatusBusy(false);
    }
  }

  const isFiltered = Boolean(debouncedSearch || statusFilter !== 'all');

  return (
    <div className="page-stack sellers-page-enter">
      {/* Toast Feedback */}
      {feedbackMessage && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/40 p-4 text-emerald-800 dark:text-emerald-200 text-sm flex items-center justify-between shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2
              size={16}
              className="text-emerald-600 dark:text-emerald-400 shrink-0"
              aria-hidden="true"
            />
            <span>{feedbackMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackMessage('')}
            className="text-xs text-emerald-700 dark:text-emerald-300 underline ml-4 hover:opacity-80"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Page Heading (Standard Apex Layout) */}
      <div className="page-heading">
        <div>
          <div className="eyebrow">MULTI-STORE MANAGEMENT</div>
          <h1>
            Seller Management
            <span className="heading-period">.</span>
          </h1>
          <p className="page-subtitle">Manage your café seller accounts and their access.</p>
        </div>

        <div className="flex items-center gap-2">
          <span className="heading-pill">
            <span className="live-dot" aria-hidden="true" />
            <span>Server Verified RBAC</span>
            {lastRefreshed && (
              <span className="text-xs font-semibold text-blue-800 ml-1">
                · {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </span>

          <button
            type="button"
            className="icon-button"
            onClick={reload}
            disabled={loading}
            aria-label="Refresh seller records"
            title="Refresh seller records"
          >
            <RotateCcw size={15} className={loading ? 'animate-spin' : ''} aria-hidden="true" />
          </button>

          {/* Add Seller Action (Real Server-Authorized RBAC) */}
          <button
            type="button"
            className="button-primary flex items-center gap-1.5 text-xs font-semibold"
            onClick={() => {
              setAddError('');
              setIsAddOpen(true);
            }}
            aria-label="Add Seller Account"
          >
            <Plus size={14} aria-hidden="true" />
            <span>Add Seller</span>
          </button>

          {/* Planned Store Invite Action (Preserves test contract) */}
          <button
            type="button"
            className="button-secondary opacity-65 cursor-not-allowed text-xs font-semibold hidden sm:inline-flex"
            disabled
            title="Automated store invite onboarding requires multi-tenant store schema provisioning (Phase 6)"
            aria-label="Invite Seller (Requires Store Setup)"
          >
            <Lock size={13} aria-hidden="true" />
            <span>Invite Seller</span>
            <span className="badge-planned-inline">Planned</span>
          </button>
        </div>
      </div>

      {/* Authoritative Metric Cards */}
      <div className="seller-stats-grid">
        <article className="seller-stat-card">
          <div className="seller-stat-header">
            <span className="seller-stat-label">Total Sellers</span>
            <span className="seller-stat-icon cobalt" aria-hidden="true">
              <StoreIcon size={20} />
            </span>
          </div>
          <strong className="seller-stat-value">
            {error ? '—' : number.format(metrics.total_sellers)}
          </strong>
          <small className="seller-stat-subtext">
            {error
              ? 'Metrics unavailable'
              : metrics.total_sellers > 0
                ? 'Provisioned seller accounts'
                : 'No sellers provisioned yet'}
          </small>
        </article>

        <article className="seller-stat-card">
          <div className="seller-stat-header">
            <span className="seller-stat-label">Active Sellers</span>
            <span className="seller-stat-icon emerald" aria-hidden="true">
              <UserCheck size={20} />
            </span>
          </div>
          <strong className="seller-stat-value">
            {error ? '—' : number.format(metrics.active_sellers)}
          </strong>
          <small className="seller-stat-subtext">
            {error ? 'Metrics unavailable' : 'Eligible to log into seller workspace'}
          </small>
        </article>

        <article className="seller-stat-card">
          <div className="seller-stat-header">
            <span className="seller-stat-label">Inactive Sellers</span>
            <span className="seller-stat-icon amber" aria-hidden="true">
              <UserX size={20} />
            </span>
          </div>
          <strong className="seller-stat-value">
            {error ? '—' : number.format(metrics.inactive_sellers)}
          </strong>
          <small className="seller-stat-subtext">
            {error ? 'Metrics unavailable' : 'Deactivated / blocked from login'}
          </small>
        </article>
      </div>

      {/* Main Sellers Panel */}
      <section className="panel sellers-panel">
        {/* Status Tabs and Search Toolbar */}
        <div className="sellers-toolbar">
          <div className="status-tabs" role="tablist" aria-label="Filter sellers by status">
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
              <span>All Sellers</span>
              <span className="status-tab-count">{error ? '—' : metrics.total_sellers}</span>
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
              <span className="status-tab-count">{error ? '—' : metrics.active_sellers}</span>
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
              <span className="status-tab-count">{error ? '—' : metrics.inactive_sellers}</span>
            </button>
          </div>

          <div className="sellers-toolbar-controls">
            <label className="sr-only" htmlFor="seller-search">
              Search sellers by name or email
            </label>
            <div className="seller-search-wrapper">
              <input
                id="seller-search"
                className="text-input seller-search-input text-slate-900 font-semibold placeholder:text-slate-500 placeholder:font-normal"
                aria-label="Search sellers"
                type="search"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search sellers by name or email…"
              />
              <Search size={15} className="seller-search-icon" aria-hidden="true" />
            </div>
          </div>
        </div>

        {/* Panel Content / States */}
        {loading ? (
          <SellerTableSkeleton rows={4} />
        ) : error ? (
          <div
            className="state-panel error-panel p-8 flex flex-col items-center text-center"
            role="alert"
          >
            <AlertCircle size={32} className="text-red-500 mb-2" aria-hidden="true" />
            <strong className="text-base font-bold text-slate-900 mb-1">
              {getSellerErrorTitle(error)}
            </strong>
            <span className="text-xs text-slate-600 max-w-md leading-relaxed mb-4">
              {getSellerErrorDescription(error)}
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
        ) : sellers.length === 0 ? (
          /* Real backend configured but 0 matching records */
          <div className="empty-sellers-state p-8 text-center flex flex-col items-center">
            <div
              className="empty-sellers-icon mb-3 p-3 rounded-full bg-blue-50 dark:bg-zinc-800 text-blue-600 dark:text-blue-400"
              aria-hidden="true"
            >
              <Users size={32} />
            </div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-zinc-100 mb-1">
              {isFiltered ? 'No matching sellers found' : 'No Sellers Yet'}
            </h3>
            <p className="text-sm text-slate-800 dark:text-zinc-200 max-w-sm mb-4 font-medium">
              {isFiltered
                ? 'Try adjusting your search criteria or status filter.'
                : 'Click "Add Seller" to create your first authorized seller account.'}
            </p>
            {!isFiltered && (
              <button
                type="button"
                className="button-primary text-xs font-medium"
                onClick={() => {
                  setAddError('');
                  setIsAddOpen(true);
                }}
              >
                <Plus size={14} className="mr-1 inline" aria-hidden="true" />
                Add First Seller
              </button>
            )}
          </div>
        ) : (
          /* Table of real sellers */
          <div className="table-scroll">
            <table className="sellers-table">
              <caption className="sr-only">Directory of café sellers</caption>
              <thead>
                <tr>
                  <th scope="col">Seller</th>
                  <th scope="col">Contact</th>
                  <th scope="col">Assigned Store</th>
                  <th scope="col">Status</th>
                  <th scope="col">Joined</th>
                  <th scope="col" className="numeric">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {sellers.map(seller => {
                  const statusBadge = getSellerStatusBadge(seller.is_active);
                  const initials = getInitials(seller.full_name);

                  return (
                    <tr key={seller.id} className="seller-row">
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="seller-avatar" aria-hidden="true">
                            <span>{initials}</span>
                          </div>
                          <div className="flex flex-col min-w-0">
                            <strong className="text-slate-900 dark:text-zinc-100 text-sm font-bold truncate">
                              {seller.full_name}
                            </strong>
                            <span className="text-xs text-slate-700 dark:text-zinc-300 font-mono font-bold">
                              #SELLER-{seller.id}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="flex flex-col gap-1 text-xs">
                          <span className="flex items-center gap-1.5 text-slate-900 dark:text-zinc-100 font-semibold">
                            <Mail
                              size={12}
                              className="text-slate-700 dark:text-zinc-300 shrink-0"
                              aria-hidden="true"
                            />
                            <span className="truncate max-w-xs">{seller.email}</span>
                          </span>
                        </div>
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
                                Unassigned
                              </span>
                            )}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className={statusBadge.className}>{statusBadge.label}</span>
                      </td>
                      <td>
                        <div className="text-xs text-slate-800 dark:text-zinc-200 font-semibold">
                          {formatDate(seller.created_at)}
                        </div>
                      </td>
                      <td className="numeric">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            className="button-secondary seller-action-button text-xs font-bold text-slate-900 dark:text-zinc-100"
                            onClick={() => handleOpenDetails(seller.id)}
                            aria-label={`View profile for ${seller.full_name}`}
                          >
                            <Eye size={13} aria-hidden="true" />
                            <span>Details</span>
                          </button>
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
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {total > 0 && (
              <div className="customer-pagination">
                <span className="customer-pagination-info">
                  Showing <strong>{page * limit + 1}</strong> to{' '}
                  <strong>{Math.min((page + 1) * limit, total)}</strong> of <strong>{total}</strong>{' '}
                  sellers
                </span>
              </div>
            )}
          </div>
        )}

        {/* Informative Roadmap Blueprint */}
        <div className="p-4 border-t border-slate-100 dark:border-zinc-800">
          <SellerArchitectureRoadmap />
        </div>
      </section>

      {/* Add Seller Drawer */}
      <Drawer
        isOpen={isAddOpen}
        onClose={() => {
          if (!addBusy) setIsAddOpen(false);
        }}
        eyebrow="RBAC PROVISIONING"
        title="Add New Seller"
        description="Create an authorized seller account for partner store operations."
        footer={
          <div className="flex items-center gap-2 w-full justify-end">
            <button
              type="button"
              className="button-secondary text-xs"
              onClick={() => setIsAddOpen(false)}
              disabled={addBusy}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="add-seller-form"
              className="button-primary text-xs font-semibold"
              disabled={addBusy}
            >
              {addBusy ? 'Creating…' : 'Create Seller Account'}
            </button>
          </div>
        }
      >
        <AddSellerDrawerForm
          name={addName}
          setName={setAddName}
          email={addEmail}
          setEmail={setAddEmail}
          password={addPassword}
          setPassword={setAddPassword}
          storeId={addStoreId}
          setStoreId={setAddStoreId}
          active={addActive}
          setActive={setAddActive}
          busy={addBusy}
          error={addError}
          stores={stores}
          onSubmit={handleCreateSeller}
        />
      </Drawer>

      {/* Accessible Seller Details & Edit Drawer */}
      <Drawer
        isOpen={selectedSellerId !== null}
        onClose={handleCloseDrawer}
        eyebrow="SELLER ACCOUNT PROFILE"
        title={selectedSeller?.full_name || 'Seller Details'}
        description={
          selectedSeller
            ? `#SELLER-${selectedSeller.id} · Registered ${formatDate(selectedSeller.created_at)}`
            : ''
        }
        footer={
          <div className="flex items-center justify-between w-full">
            {selectedSeller && (
              <button
                type="button"
                className={`text-xs font-bold px-3 py-1.5 rounded-lg border ${
                  selectedSeller.is_active
                    ? 'border-amber-500/50 text-amber-900 dark:text-amber-200 bg-amber-50/60 dark:bg-amber-950/40 hover:bg-amber-100'
                    : 'border-emerald-500/50 text-emerald-900 dark:text-emerald-200 bg-emerald-50/60 dark:bg-emerald-950/40 hover:bg-emerald-100'
                }`}
                onClick={() => setStatusConfirmSeller(selectedSeller)}
              >
                {selectedSeller.is_active ? 'Deactivate Account' : 'Activate Account'}
              </button>
            )}
            <button
              type="button"
              className="button-secondary text-xs font-bold text-slate-900 dark:text-zinc-100"
              onClick={handleCloseDrawer}
            >
              Close Profile
            </button>
          </div>
        }
      >
        {drawerLoading && !selectedSeller ? (
          <div className="py-8 text-center text-sm text-slate-800 dark:text-zinc-200 font-medium">
            Loading seller profile…
          </div>
        ) : drawerError && !selectedSeller ? (
          <div className="form-error" role="alert">
            {drawerError}
          </div>
        ) : selectedSeller ? (
          <div className="seller-drawer-content flex flex-col gap-6">
            {/* Header card with avatar */}
            <div className="seller-drawer-header-card">
              <div className="seller-avatar large" aria-hidden="true">
                <span>{getInitials(selectedSeller.full_name)}</span>
              </div>
              <div className="seller-drawer-header-info">
                <h3>{selectedSeller.full_name}</h3>
                <span className="seller-drawer-id">Seller ID: #SELLER-{selectedSeller.id}</span>
                <div className="mt-1">
                  <span className={getSellerStatusBadge(selectedSeller.is_active).className}>
                    {getSellerStatusBadge(selectedSeller.is_active).label}
                  </span>
                </div>
              </div>
            </div>

            {/* Contact Details */}
            <div className="drawer-section">
              <h4 className="drawer-section-title">Contact &amp; Identity</h4>
              <div className="drawer-kv-grid">
                <div className="drawer-kv-item">
                  <span className="drawer-kv-label">Email Address</span>
                  <strong className="drawer-kv-value flex items-center gap-1.5">
                    <Mail
                      size={13}
                      className="text-slate-700 dark:text-zinc-300"
                      aria-hidden="true"
                    />
                    <span>{selectedSeller.email}</span>
                  </strong>
                </div>
                <div className="drawer-kv-item">
                  <span className="drawer-kv-label">System Role</span>
                  <strong className="drawer-kv-value flex items-center gap-1.5">
                    <ShieldCheck
                      size={13}
                      className="text-blue-700 dark:text-blue-300"
                      aria-hidden="true"
                    />
                    <span>Seller Partner</span>
                  </strong>
                </div>
                <div className="drawer-kv-item">
                  <span className="drawer-kv-label">Assigned Store</span>
                  <strong className="drawer-kv-value flex items-center gap-1.5">
                    <Building2
                      size={13}
                      className="text-slate-700 dark:text-zinc-300"
                      aria-hidden="true"
                    />
                    <span>{selectedSeller.store_name || 'No store assigned yet'}</span>
                  </strong>
                </div>
                <div className="drawer-kv-item">
                  <span className="drawer-kv-label">Account Created</span>
                  <strong className="drawer-kv-value flex items-center gap-1.5 text-xs text-slate-900 dark:text-zinc-100 font-semibold">
                    <Calendar
                      size={13}
                      className="text-slate-700 dark:text-zinc-300"
                      aria-hidden="true"
                    />
                    <span>{formatDateTime(selectedSeller.created_at)}</span>
                  </strong>
                </div>
              </div>
            </div>

            {/* Assigned Stores Management */}
            <div className="drawer-section">
              <div className="flex items-center justify-between mb-2">
                <h4 className="drawer-section-title">Assigned Café Stores</h4>
                <span className="text-xs text-slate-800 dark:text-zinc-200 font-bold">
                  {selectedSeller.assigned_stores?.length || 0} assigned
                </span>
              </div>

              {storeActionError && (
                <div
                  className="p-2.5 mb-2 text-xs rounded-lg border border-red-500/30 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300"
                  role="alert"
                >
                  {storeActionError}
                </div>
              )}
              {storeActionSuccess && (
                <div
                  className="p-2.5 mb-2 text-xs rounded-lg border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200"
                  role="status"
                >
                  {storeActionSuccess}
                </div>
              )}

              <div className="flex flex-col gap-2">
                {selectedSeller.assigned_stores && selectedSeller.assigned_stores.length > 0 ? (
                  selectedSeller.assigned_stores.map(st => (
                    <div
                      key={st.id}
                      className="p-2.5 rounded-lg border border-slate-300 dark:border-zinc-700 bg-slate-100/90 dark:bg-zinc-800/80 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <Building2
                          size={15}
                          className="text-blue-700 dark:text-blue-400 shrink-0"
                          aria-hidden="true"
                        />
                        <div className="flex flex-col">
                          <span className="text-xs font-extrabold text-slate-900 dark:text-zinc-100">
                            {st.name}
                          </span>
                          <span className="text-xs font-mono font-bold text-slate-700 dark:text-zinc-300">
                            {st.code}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="text-xs text-red-700 dark:text-red-300 font-bold hover:underline px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                        disabled={storeActionBusy}
                        onClick={() => handleUnassignStore(selectedSeller.id, st.id)}
                        aria-label={`Unassign ${st.name} from seller`}
                      >
                        Unassign
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="p-3 text-xs text-slate-800 dark:text-zinc-200 font-medium rounded-lg border border-dashed border-slate-300 dark:border-zinc-700 text-center">
                    No café store currently assigned. This seller cannot view store orders (fails
                    closed).
                  </div>
                )}
              </div>

              {/* Assign new store selector */}
              {stores.filter(
                s => s.is_active && !selectedSeller.assigned_stores?.some(as => as.id === s.id),
              ).length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-200 dark:border-zinc-800 flex items-center gap-2">
                  <select
                    aria-label="Select store to assign"
                    className="text-input text-xs flex-1 text-slate-900 dark:text-zinc-100 font-semibold"
                    value={assignStoreId}
                    onChange={e => setAssignStoreId(e.target.value)}
                    disabled={storeActionBusy}
                  >
                    <option value="">Select an active store to assign…</option>
                    {stores
                      .filter(
                        s =>
                          s.is_active &&
                          !selectedSeller.assigned_stores?.some(as => as.id === s.id),
                      )
                      .map(s => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.code})
                        </option>
                      ))}
                  </select>
                  <button
                    type="button"
                    className="button-primary text-xs font-semibold shrink-0"
                    disabled={!assignStoreId || storeActionBusy}
                    onClick={() => handleAssignStore(selectedSeller.id, Number(assignStoreId))}
                  >
                    {storeActionBusy ? 'Assigning…' : 'Assign'}
                  </button>
                </div>
              )}
            </div>

            {/* Edit Profile Form */}
            <div className="drawer-section">
              <h4 className="drawer-section-title">Edit Seller Details</h4>
              {drawerError && (
                <div
                  className="p-2.5 mb-3 text-xs rounded-lg border border-red-500/30 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300"
                  role="alert"
                >
                  {drawerError}
                </div>
              )}
              {editSuccess && (
                <div
                  className="p-2.5 mb-3 text-xs rounded-lg border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200"
                  role="status"
                >
                  {editSuccess}
                </div>
              )}

              <form onSubmit={handleUpdateSeller} className="flex flex-col gap-3">
                <div className="form-field">
                  <label className="form-label text-xs font-bold" htmlFor="edit-name">
                    Full Name
                  </label>
                  <input
                    id="edit-name"
                    type="text"
                    required
                    className="text-input mt-1 w-full"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    disabled={editBusy}
                  />
                </div>

                <div className="form-field">
                  <label className="form-label text-xs font-bold" htmlFor="edit-password">
                    <KeyRound size={12} className="text-current" />
                    <span>Reset Password (leave blank to keep current)</span>
                  </label>
                  <input
                    id="edit-password"
                    type="password"
                    minLength={8}
                    className="text-input mt-1 w-full"
                    placeholder="New 8+ character password"
                    value={editPassword}
                    onChange={e => setEditPassword(e.target.value)}
                    disabled={editBusy}
                  />
                </div>

                <button
                  type="submit"
                  className="button-primary text-xs font-semibold self-start mt-1"
                  disabled={editBusy}
                >
                  {editBusy ? 'Saving…' : 'Save Changes'}
                </button>
              </form>
            </div>

            {/* Read-Only Governance Notice */}
            <div className="seller-privacy-callout">
              <div className="privacy-callout-icon" aria-hidden="true">
                <ShieldAlert size={20} />
              </div>
              <div className="privacy-callout-text">
                <h3 className="text-sm font-extrabold text-red-950 dark:text-red-300 mb-1">
                  Multi-Tenant Security Boundary
                </h3>
                <p className="text-xs text-red-950 dark:text-red-200 font-medium leading-relaxed">
                  Store metrics, revenue, and order totals are protected and store-isolated. Seller
                  partners only receive access to orders belonging to their verified assigned store.
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </Drawer>

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
              ? `Are you sure you want to deactivate ${statusConfirmSeller.full_name}? They will be immediately blocked from logging into the seller portal.`
              : `Are you sure you want to activate ${statusConfirmSeller.full_name}? They will be able to log in with their credentials.`
          }
          busy={statusBusy}
          onCancel={() => setStatusConfirmSeller(null)}
          onConfirm={handleConfirmStatusChange}
        />
      )}
    </div>
  );
}
