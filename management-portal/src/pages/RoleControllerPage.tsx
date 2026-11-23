import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  ExternalLink,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Store,
  Trash2,
  UserCheck,
  Users,
  XCircle,
} from 'lucide-react';
import { useAuth } from '../auth/authContext';
import { ConfirmAction } from '../components/ConfirmAction';
import { Drawer } from '../components/Drawer';
import { ErrorState } from '../components/States';
import { useToast } from '../components/ToastContext';
import {
  createStaff,
  createStore,
  deleteStore,
  getSellers,
  getStaff,
  getStores,
  updateSellerStatus,
  updateStaff,
  updateStore,
  updateStoreStatus,
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
  const { token, user: currentUser } = useAuth();
  const { notify } = useToast();
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
  const [staffSearch, setStaffSearch] = useState('');

  // Seller action states
  const [statusConfirmSeller, setStatusConfirmSeller] = useState<Seller | null>(null);
  const [statusBusy, setStatusBusy] = useState(false);

  // Staff / Admin drawer & modal states
  const [staffDrawerOpen, setStaffDrawerOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffUser | null>(null);
  const [staffName, setStaffName] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [showStaffPassword, setShowStaffPassword] = useState(false);
  const [staffRole, setStaffRole] = useState<'admin' | 'staff'>('staff');
  const [staffActive, setStaffActive] = useState(true);
  const [staffBusy, setStaffBusy] = useState(false);
  const [staffFormError, setStaffFormError] = useState('');
  const [confirmStaffToggle, setConfirmStaffToggle] = useState<StaffUser | null>(null);

  // Store Registry drawer & modal states
  const [storeDrawerOpen, setStoreDrawerOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<StoreType | null>(null);
  const [storeName, setStoreName] = useState('');
  const [storeCode, setStoreCode] = useState('');
  const [storeAddress, setStoreAddress] = useState('');
  const [storeActive, setStoreActive] = useState(true);
  const [storeBusy, setStoreBusy] = useState(false);
  const [storeFormError, setStoreFormError] = useState('');
  const [confirmStoreAction, setConfirmStoreAction] = useState<{
    store: StoreType;
    action: 'toggle' | 'delete';
  } | null>(null);

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

  const adminAndStaffAccounts = useMemo(() => {
    if (!staffUsers) return [];
    const accounts = staffUsers.filter(u => u.role === 'admin' || u.role === 'staff');
    const q = staffSearch.trim().toLowerCase();
    if (!q) return accounts;
    return accounts.filter(
      u => u.full_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
    );
  }, [staffUsers, staffSearch]);

  // Toggle seller status handler
  async function handleConfirmStatusChange() {
    if (!token || !statusConfirmSeller) return;
    setStatusBusy(true);
    try {
      const nextActive = !statusConfirmSeller.is_active;
      await updateSellerStatus(token, statusConfirmSeller.id, nextActive);
      const sellerName = statusConfirmSeller.full_name;
      setStatusConfirmSeller(null);
      notify({
        tone: 'success',
        message: nextActive
          ? `Seller ${sellerName} activated successfully.`
          : `Seller ${sellerName} deactivated successfully.`,
      });
      reload();
    } catch (err) {
      notify({
        tone: 'error',
        message: err instanceof Error ? err.message : 'Failed to update seller status.',
      });
      setStatusConfirmSeller(null);
    } finally {
      setStatusBusy(false);
    }
  }

  function openCreateStaffDrawer() {
    setEditingStaff(null);
    setStaffName('');
    setStaffEmail('');
    setStaffPassword('');
    setShowStaffPassword(false);
    setStaffRole('staff');
    setStaffActive(true);
    setStaffFormError('');
    setStaffDrawerOpen(true);
  }

  function openEditStaffDrawer(member: StaffUser) {
    setEditingStaff(member);
    setStaffName(member.full_name);
    setStaffEmail(member.email);
    setStaffPassword('');
    setShowStaffPassword(false);
    setStaffRole(member.role === 'admin' ? 'admin' : 'staff');
    setStaffActive(member.is_active);
    setStaffFormError('');
    setStaffDrawerOpen(true);
  }

  function closeStaffDrawer(force = false) {
    if (staffBusy && !force) return;
    setStaffDrawerOpen(false);
    setEditingStaff(null);
    setStaffFormError('');
    setStaffPassword('');
  }

  async function handleStaffSubmit(event: FormEvent) {
    event.preventDefault();
    if (!token) return;

    const cleanName = staffName.trim();
    const cleanEmail = staffEmail.trim().toLowerCase();
    if (cleanName.length < 2 || cleanName.length > 255) {
      setStaffFormError('Full name must be between 2 and 255 characters.');
      return;
    }

    if (!editingStaff) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        setStaffFormError('Enter a valid work email address.');
        return;
      }
      if (!staffPassword || staffPassword.length < 6) {
        setStaffFormError('Initial password must be at least 6 characters.');
        return;
      }
    } else if (staffPassword && staffPassword.length < 6) {
      setStaffFormError('New password must be at least 6 characters.');
      return;
    }

    setStaffBusy(true);
    setStaffFormError('');
    try {
      if (editingStaff) {
        await updateStaff(token, editingStaff.id, {
          full_name: cleanName,
          role: staffRole,
          is_active: staffActive,
          ...(staffPassword ? { password: staffPassword } : {}),
        });
        notify({ tone: 'success', message: `Account "${cleanName}" updated.` });
      } else {
        await createStaff(token, {
          email: cleanEmail,
          full_name: cleanName,
          password: staffPassword,
          role: staffRole,
        });
        notify({
          tone: 'success',
          message: `${staffRole === 'admin' ? 'Administrator' : 'Staff'} account "${cleanName}" created.`,
        });
      }
      closeStaffDrawer(true);
      reload();
    } catch (err) {
      setStaffFormError(err instanceof Error ? err.message : 'Failed to save staff account.');
    } finally {
      setStaffBusy(false);
    }
  }

  async function executeStaffToggle() {
    if (!token || !confirmStaffToggle) return;
    setStaffBusy(true);
    try {
      const nextActive = !confirmStaffToggle.is_active;
      await updateStaff(token, confirmStaffToggle.id, { is_active: nextActive });
      notify({
        tone: 'success',
        message: nextActive
          ? `${confirmStaffToggle.full_name} activated.`
          : `${confirmStaffToggle.full_name} deactivated.`,
      });
      setConfirmStaffToggle(null);
      reload();
    } catch (err) {
      notify({
        tone: 'error',
        message: err instanceof Error ? err.message : 'Failed to update staff status.',
      });
      setConfirmStaffToggle(null);
    } finally {
      setStaffBusy(false);
    }
  }

  function openCreateStoreDrawer() {
    setEditingStore(null);
    setStoreName('');
    setStoreCode('');
    setStoreAddress('');
    setStoreActive(true);
    setStoreFormError('');
    setStoreDrawerOpen(true);
  }

  function openEditStoreDrawer(store: StoreType) {
    setEditingStore(store);
    setStoreName(store.name);
    setStoreCode(store.code);
    setStoreAddress(store.address ?? '');
    setStoreActive(store.is_active);
    setStoreFormError('');
    setStoreDrawerOpen(true);
  }

  function closeStoreDrawer(force = false) {
    if (storeBusy && !force) return;
    setStoreDrawerOpen(false);
    setEditingStore(null);
    setStoreFormError('');
  }

  async function handleStoreSubmit(event: FormEvent) {
    event.preventDefault();
    if (!token) return;

    const cleanName = storeName.trim();
    const cleanCode = storeCode.trim().toUpperCase();
    const cleanAddress = storeAddress.trim() || null;

    if (cleanName.length < 2) {
      setStoreFormError('Store name must be at least 2 characters.');
      return;
    }
    if (!/^[A-Z0-9-]{2,50}$/.test(cleanCode)) {
      setStoreFormError('Store code must be 2–50 uppercase letters, numbers, or hyphens.');
      return;
    }

    setStoreBusy(true);
    setStoreFormError('');
    try {
      if (editingStore) {
        await updateStore(token, editingStore.id, {
          name: cleanName,
          code: cleanCode,
          address: cleanAddress,
        });
        notify({ tone: 'success', message: `Store "${cleanName}" updated.` });
      } else {
        await createStore(token, {
          name: cleanName,
          code: cleanCode,
          address: cleanAddress,
          is_active: storeActive,
        });
        notify({ tone: 'success', message: `Store "${cleanName}" created.` });
      }
      closeStoreDrawer(true);
      reload();
    } catch (err) {
      setStoreFormError(err instanceof Error ? err.message : 'Failed to save store.');
    } finally {
      setStoreBusy(false);
    }
  }

  async function executeStoreConfirmAction() {
    if (!token || !confirmStoreAction) return;
    const { store, action } = confirmStoreAction;
    setStoreBusy(true);
    try {
      if (action === 'delete') {
        await deleteStore(token, store.id);
        notify({ tone: 'success', message: `Store "${store.name}" deleted.` });
      } else {
        const nextActive = !store.is_active;
        await updateStoreStatus(token, store.id, nextActive);
        notify({
          tone: 'success',
          message: nextActive ? `Store "${store.name}" activated.` : `Store "${store.name}" deactivated.`,
        });
      }
      setConfirmStoreAction(null);
      reload();
    } catch (err) {
      notify({
        tone: 'error',
        message: err instanceof Error ? err.message : 'Failed to update store.',
      });
      setConfirmStoreAction(null);
    } finally {
      setStoreBusy(false);
    }
  }

  return (
    <div className="page-stack role-controller-enter">

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

      {/* SECTION 2B: STAFF & ADMINISTRATOR ACCOUNTS */}
      <section aria-labelledby="staff-accounts-heading" className="panel p-6 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div>
            <div className="eyebrow text-cobalt mb-1">TEAM &amp; ACCESS ACCOUNTS</div>
            <h2
              id="staff-accounts-heading"
              className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2"
            >
              <UserCheck size={18} className="text-blue-600 shrink-0" aria-hidden="true" />
              <span>Staff &amp; Administrator Accounts</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-700 mt-1 font-medium">
              Create, update, and manage administrator and café staff accounts with last-admin protection.
            </p>
          </div>
          <button
            type="button"
            className="button-primary text-xs font-semibold flex items-center gap-1.5 self-start sm:self-auto"
            onClick={openCreateStaffDrawer}
          >
            <Plus size={14} aria-hidden="true" />
            <span>Add Staff / Admin</span>
          </button>
        </div>

        <search className="flex items-center justify-between gap-3 flex-wrap">
          <div className="seller-search-wrapper w-full sm:w-72">
            <input
              id="staff-account-search"
              name="staff_search"
              type="search"
              className="text-input seller-search-input text-xs text-slate-900 font-semibold placeholder:text-slate-500 placeholder:font-normal"
              placeholder="Search staff or admins…"
              aria-label="Search staff or administrator accounts"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              value={staffSearch}
              onChange={e => setStaffSearch(e.target.value)}
            />
            <Search size={14} className="seller-search-icon" aria-hidden="true" />
          </div>
          <span className="text-xs font-semibold text-slate-600">
            {adminAndStaffAccounts.length}{' '}
            {adminAndStaffAccounts.length === 1 ? 'account' : 'accounts'}
          </span>
        </search>

        {staffUsers === null ? (
          <div className="p-6 text-center text-xs text-slate-600 font-medium">
            {loading ? 'Loading staff and administrator accounts…' : 'Staff account directory unavailable.'}
          </div>
        ) : adminAndStaffAccounts.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-600 font-medium border border-dashed border-slate-300 rounded-xl">
            No matching staff or administrator accounts found.
          </div>
        ) : (
          <div
            className="table-scroll"
            tabIndex={0}
            role="region"
            aria-label="Staff and Administrator Accounts"
          >
            <table className="sellers-table">
              <thead>
                <tr>
                  <th scope="col">Account</th>
                  <th scope="col">Email</th>
                  <th scope="col">Role</th>
                  <th scope="col">Status</th>
                  <th scope="col" className="numeric">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {adminAndStaffAccounts.map(member => (
                  <tr key={member.id}>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <div className="seller-avatar" aria-hidden="true">
                          <span>{member.full_name?.slice(0, 2).toUpperCase() || 'ST'}</span>
                        </div>
                        <div className="flex flex-col">
                          <strong className="text-xs sm:text-sm font-bold text-slate-900">
                            {member.full_name}
                            {currentUser?.id === member.id ? ' (You)' : ''}
                          </strong>
                          <span className="text-xs font-mono text-slate-600">
                            #STAFF-{member.id}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="text-xs text-slate-800 font-semibold">{member.email}</span>
                    </td>
                    <td>
                      <span
                        className={`status-badge ${
                          member.role === 'admin' ? 'status-preparing' : 'status-pending'
                        }`}
                      >
                        {member.role === 'admin' ? 'Administrator' : 'Staff'}
                      </span>
                    </td>
                    <td>
                      <span
                        className={
                          member.is_active
                            ? 'status-badge status-completed'
                            : 'status-badge status-cancelled'
                        }
                      >
                        {member.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="numeric">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          className="button-secondary seller-action-button text-xs font-bold"
                          onClick={() => openEditStaffDrawer(member)}
                        >
                          <Pencil size={12} aria-hidden="true" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          className="button-secondary seller-action-button text-xs font-bold"
                          onClick={() => setConfirmStaffToggle(member)}
                        >
                          {member.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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

          <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
            <button
              type="button"
              className="button-primary text-xs font-semibold flex items-center gap-1.5"
              onClick={openCreateStoreDrawer}
              disabled={stores === null}
            >
              <Plus size={14} aria-hidden="true" />
              <span>Add Store</span>
            </button>
            <Link
              to="/admin/sellers"
              className="button-secondary text-xs font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-1.5"
            >
              <Store size={13} aria-hidden="true" />
              <span>Manage Store Assignments</span>
            </Link>
          </div>
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
          <div className="p-6 text-center rounded-xl border border-dashed border-slate-300 dark:border-zinc-700 text-slate-800 dark:text-zinc-200 text-xs font-semibold flex flex-col items-center gap-3">
            <span>No stores registered in the database registry yet.</span>
            <button
              type="button"
              className="button-primary text-xs font-semibold"
              onClick={openCreateStoreDrawer}
            >
              <Plus size={14} aria-hidden="true" />
              <span>Create First Store</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stores.map(st => {
              const sellerCountForStore =
                st.assigned_sellers_count ?? st.assigned_sellers?.length ?? 0;
              const orderCountForStore = st.total_orders_count ?? st.total_orders ?? 0;
              return (
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

                  <div className="mt-4 pt-3 border-t border-slate-200 dark:border-zinc-800/80 flex flex-col gap-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-800 dark:text-zinc-200 font-bold">
                        {sellerCountForStore} assigned · {orderCountForStore} orders
                      </span>
                      <Link
                        to="/admin/sellers"
                        className="text-blue-800 dark:text-blue-300 font-extrabold hover:underline flex items-center gap-1"
                      >
                        <span>Assign</span>
                        <ExternalLink size={12} aria-hidden="true" />
                      </Link>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        className="button-secondary seller-action-button text-xs font-bold"
                        onClick={() => openEditStoreDrawer(st)}
                      >
                        <Pencil size={12} aria-hidden="true" />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        className="button-secondary seller-action-button text-xs font-bold"
                        onClick={() => setConfirmStoreAction({ store: st, action: 'toggle' })}
                      >
                        {st.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        type="button"
                        className="button-secondary seller-action-button text-xs font-bold text-rose-700"
                        onClick={() => setConfirmStoreAction({ store: st, action: 'delete' })}
                      >
                        <Trash2 size={12} aria-hidden="true" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
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
          confirmLabel={statusConfirmSeller.is_active ? 'Deactivate' : 'Activate'}
          onCancel={() => setStatusConfirmSeller(null)}
          onConfirm={handleConfirmStatusChange}
        />
      )}

      {/* Confirm Staff / Admin Status Toggle */}
      {confirmStaffToggle && (
        <ConfirmAction
          title={
            confirmStaffToggle.is_active
              ? `Deactivate ${confirmStaffToggle.full_name}?`
              : `Activate ${confirmStaffToggle.full_name}?`
          }
          detail={
            confirmStaffToggle.is_active
              ? 'This immediately blocks login for this account. The last active administrator cannot be deactivated.'
              : 'This restores login eligibility for this account.'
          }
          busy={staffBusy}
          confirmLabel={confirmStaffToggle.is_active ? 'Deactivate' : 'Activate'}
          onCancel={() => setConfirmStaffToggle(null)}
          onConfirm={executeStaffToggle}
        />
      )}

      {/* Confirm Store Action */}
      {confirmStoreAction && (
        <ConfirmAction
          title={
            confirmStoreAction.action === 'delete'
              ? `Delete store ${confirmStoreAction.store.name}?`
              : confirmStoreAction.store.is_active
                ? `Deactivate store ${confirmStoreAction.store.name}?`
                : `Activate store ${confirmStoreAction.store.name}?`
          }
          detail={
            confirmStoreAction.action === 'delete'
              ? 'Stores with historical order records cannot be deleted and must be deactivated instead.'
              : confirmStoreAction.store.is_active
                ? 'Assigned sellers immediately lose access to orders for an inactive store.'
                : 'Assigned sellers will regain read access for this active store.'
          }
          busy={storeBusy}
          confirmLabel={
            confirmStoreAction.action === 'delete'
              ? 'Delete Store'
              : confirmStoreAction.store.is_active
                ? 'Deactivate'
                : 'Activate'
          }
          tone={confirmStoreAction.action === 'delete' ? 'danger' : 'primary'}
          onCancel={() => setConfirmStoreAction(null)}
          onConfirm={executeStoreConfirmAction}
        />
      )}

      {/* Staff / Admin Editor Drawer */}
      <Drawer
        isOpen={staffDrawerOpen}
        onClose={() => closeStaffDrawer(false)}
        eyebrow="STAFF & ADMIN ACCESS"
        title={editingStaff ? `Edit ${editingStaff.full_name}` : 'Add Staff or Administrator'}
        description={
          editingStaff
            ? `${editingStaff.email} · Update role, active status, or reset password.`
            : 'Provision a new staff operator or administrator account.'
        }
        width="md"
        footer={
          <>
            <button
              type="button"
              className="button-secondary"
              onClick={() => closeStaffDrawer(false)}
              disabled={staffBusy}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="staff-account-form"
              className="button-primary"
              disabled={staffBusy}
            >
              {staffBusy ? 'Saving…' : editingStaff ? 'Save Account' : 'Create Account'}
            </button>
          </>
        }
      >
        <form id="staff-account-form" onSubmit={handleStaffSubmit} className="flex flex-col gap-4">
          {staffFormError && (
            <div className="form-error" role="alert">
              <AlertCircle size={16} aria-hidden="true" className="shrink-0" />
              <span>{staffFormError}</span>
            </div>
          )}

          <label className="flex flex-col gap-1.5 font-bold text-xs text-slate-800">
            Full name
            <input
              name="full_name"
              type="text"
              className="text-input"
              required
              minLength={2}
              maxLength={255}
              autoComplete="name"
              placeholder="e.g. Dara Sok"
              value={staffName}
              onChange={e => setStaffName(e.target.value)}
              disabled={staffBusy}
            />
          </label>

          {!editingStaff && (
            <label className="flex flex-col gap-1.5 font-bold text-xs text-slate-800">
              Work email address
              <input
                name="email"
                type="email"
                className="text-input"
                required
                maxLength={255}
                autoComplete="email"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="staff@brewboba.com"
                value={staffEmail}
                onChange={e => setStaffEmail(e.target.value)}
                disabled={staffBusy}
              />
            </label>
          )}

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="staff-password-input"
              className="font-bold text-xs text-slate-800 flex items-center gap-1.5"
            >
              <KeyRound size={12} aria-hidden="true" />
              <span>
                {editingStaff
                  ? 'Reset password (optional, 6+ characters)'
                  : 'Initial password (6+ characters)'}
              </span>
            </label>
            <div className="password-wrap">
              <input
                id="staff-password-input"
                name="password"
                type={showStaffPassword ? 'text' : 'password'}
                className="text-input"
                required={!editingStaff}
                minLength={6}
                maxLength={72}
                autoComplete="new-password"
                placeholder={editingStaff ? 'Leave blank to keep current password' : 'Minimum 6 characters'}
                value={staffPassword}
                onChange={e => setStaffPassword(e.target.value)}
                disabled={staffBusy}
              />
              <button
                type="button"
                className="password-toggle"
                aria-pressed={showStaffPassword}
                aria-label={showStaffPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowStaffPassword(v => !v)}
              >
                {showStaffPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <fieldset className="staff-role-fieldset">
            <legend className="font-bold text-xs text-slate-800 mb-2">Account role</legend>
            <div className="staff-role-radios">
              <label className="staff-role-option">
                <input
                  type="radio"
                  name="staff_role"
                  value="staff"
                  checked={staffRole === 'staff'}
                  onChange={() => setStaffRole('staff')}
                  disabled={staffBusy}
                />
                <span>
                  <strong>Staff</strong>
                  <small>In-store barista &amp; cashier operations</small>
                </span>
              </label>
              <label className="staff-role-option">
                <input
                  type="radio"
                  name="staff_role"
                  value="admin"
                  checked={staffRole === 'admin'}
                  onChange={() => setStaffRole('admin')}
                  disabled={staffBusy}
                />
                <span>
                  <strong>Administrator</strong>
                  <small>Full management portal &amp; security access</small>
                </span>
              </label>
            </div>
          </fieldset>

          {editingStaff && (
            <label className="check-field flex items-center gap-2 cursor-pointer font-bold text-xs text-slate-800">
              <input
                name="is_active"
                type="checkbox"
                checked={staffActive}
                onChange={e => setStaffActive(e.target.checked)}
                disabled={staffBusy}
              />
              <span>Account is active (allowed to sign in)</span>
            </label>
          )}
        </form>
      </Drawer>

      {/* Store Editor Drawer */}
      <Drawer
        isOpen={storeDrawerOpen}
        onClose={() => closeStoreDrawer(false)}
        eyebrow="STORE REGISTRY"
        title={editingStore ? `Edit ${editingStore.name}` : 'Add Café Store'}
        description={
          editingStore
            ? `Store code ${editingStore.code} · Update branch name, code, or address.`
            : 'Register a physical café branch or partner kiosk.'
        }
        width="md"
        footer={
          <>
            <button
              type="button"
              className="button-secondary"
              onClick={() => closeStoreDrawer(false)}
              disabled={storeBusy}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="store-registry-form"
              className="button-primary"
              disabled={storeBusy}
            >
              {storeBusy ? 'Saving…' : editingStore ? 'Save Store' : 'Create Store'}
            </button>
          </>
        }
      >
        <form id="store-registry-form" onSubmit={handleStoreSubmit} className="flex flex-col gap-4">
          {storeFormError && (
            <div className="form-error" role="alert">
              <AlertCircle size={16} aria-hidden="true" className="shrink-0" />
              <span>{storeFormError}</span>
            </div>
          )}

          <label className="flex flex-col gap-1.5 font-bold text-xs text-slate-800">
            Store name
            <input
              name="store_name"
              type="text"
              className="text-input"
              required
              minLength={2}
              maxLength={120}
              placeholder="e.g. Brew & Boba BKK1 Flagship"
              value={storeName}
              onChange={e => setStoreName(e.target.value)}
              disabled={storeBusy}
            />
          </label>

          <label className="flex flex-col gap-1.5 font-bold text-xs text-slate-800">
            Store code (2–50 uppercase alphanumeric or hyphens)
            <input
              name="store_code"
              type="text"
              className="text-input font-mono uppercase"
              required
              minLength={2}
              maxLength={50}
              pattern="[A-Za-z0-9-]{2,50}"
              autoCorrect="off"
              autoCapitalize="characters"
              spellCheck={false}
              placeholder="e.g. BKK1-01"
              value={storeCode}
              onChange={e => setStoreCode(e.target.value.toUpperCase())}
              disabled={storeBusy}
            />
          </label>

          <label className="flex flex-col gap-1.5 font-bold text-xs text-slate-800">
            Street address (Optional)
            <textarea
              name="store_address"
              className="text-input"
              style={{ minHeight: '80px', padding: '10px 14px' }}
              autoComplete="street-address"
              maxLength={300}
              placeholder="e.g. Street 214, Boeung Keng Kang 1, Phnom Penh"
              value={storeAddress}
              onChange={e => setStoreAddress(e.target.value)}
              disabled={storeBusy}
            />
          </label>

          {!editingStore && (
            <label className="check-field flex items-center gap-2 cursor-pointer font-bold text-xs text-slate-800">
              <input
                name="store_is_active"
                type="checkbox"
                checked={storeActive}
                onChange={e => setStoreActive(e.target.checked)}
                disabled={storeBusy}
              />
              <span>Store is active immediately</span>
            </label>
          )}
        </form>
      </Drawer>
    </div>
  );
}
