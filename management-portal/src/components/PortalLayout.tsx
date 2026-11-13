import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  BarChart3,
  Boxes,
  ChevronLeft,
  ChevronRight,
  Coffee,
  FolderTree,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Search,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Store,
  Users,
  UserRound,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuth } from '../auth/authContext';
import type { PortalRole } from '../lib/access';
import { useTheme } from './ThemeContext';
import { CommandPalette } from './CommandPalette';

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  planned?: boolean;
}

export interface NavGroup {
  groupTitle: string;
  items: NavItem[];
}

export const adminNavGroups: NavGroup[] = [
  {
    groupTitle: 'OVERVIEW',
    items: [
      { label: 'Dashboard', to: '/admin/dashboard', icon: LayoutDashboard },
      { label: 'Analytics', to: '/admin/analytics', icon: BarChart3 },
    ],
  },
  {
    groupTitle: 'MANAGEMENT',
    items: [
      { label: 'Orders', to: '/admin/orders', icon: ShoppingBag },
      { label: 'Products', to: '/admin/products', icon: Package },
      { label: 'Categories', to: '/admin/categories', icon: FolderTree },
      { label: 'Customers', to: '/admin/customers', icon: Users },
    ],
  },
  {
    groupTitle: 'ACCESS & SECURITY',
    items: [
      { label: 'Role Controller', to: '/admin/role-controller', icon: ShieldCheck },
      { label: 'Sellers', to: '/admin/sellers', icon: Store, planned: true },
      { label: 'Settings', to: '/admin/settings', icon: Settings },
    ],
  },
];

export const sellerNavGroups: NavGroup[] = [
  {
    groupTitle: 'OVERVIEW',
    items: [
      { label: 'Dashboard', to: '/seller/dashboard', icon: LayoutDashboard, planned: true },
      { label: 'Analytics', to: '/seller/analytics', icon: BarChart3, planned: true },
    ],
  },
  {
    groupTitle: 'MANAGEMENT',
    items: [
      { label: 'Orders', to: '/seller/orders', icon: ShoppingBag, planned: true },
      { label: 'Products', to: '/seller/products', icon: Package, planned: true },
      { label: 'Inventory', to: '/seller/inventory', icon: Boxes, planned: true },
    ],
  },
  {
    groupTitle: 'WORKSPACE',
    items: [{ label: 'Profile', to: '/seller/profile', icon: UserRound, planned: true }],
  },
];

// Preserved flat item sequence for backwards compatibility with tests and lookups
const adminNavigationFlat: NavItem[] = [
  { label: 'Dashboard', to: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Orders', to: '/admin/orders', icon: ShoppingBag },
  { label: 'Products', to: '/admin/products', icon: Package },
  { label: 'Categories', to: '/admin/categories', icon: FolderTree },
  { label: 'Customers', to: '/admin/customers', icon: Users },
  { label: 'Role Controller', to: '/admin/role-controller', icon: ShieldCheck },
  { label: 'Sellers', to: '/admin/sellers', icon: Store, planned: true },
  { label: 'Analytics', to: '/admin/analytics', icon: BarChart3 },
  { label: 'Settings', to: '/admin/settings', icon: Settings },
];

const sellerNavigationFlat: NavItem[] = [
  { label: 'Dashboard', to: '/seller/dashboard', icon: LayoutDashboard, planned: true },
  { label: 'Products', to: '/seller/products', icon: Package, planned: true },
  { label: 'Orders', to: '/seller/orders', icon: ShoppingBag, planned: true },
  { label: 'Inventory', to: '/seller/inventory', icon: Boxes, planned: true },
  { label: 'Analytics', to: '/seller/analytics', icon: BarChart3, planned: true },
  { label: 'Profile', to: '/seller/profile', icon: UserRound, planned: true },
];

const routeTitles: Record<string, { title: string; section: string }> = {
  '/admin/dashboard': { title: 'Café Overview', section: 'Overview' },
  '/admin/orders': { title: 'Order Management', section: 'Management' },
  '/admin/products': { title: 'Product Catalog', section: 'Management' },
  '/admin/categories': { title: 'Drink Categories', section: 'Management' },
  '/admin/customers': { title: 'Customers', section: 'Management' },
  '/admin/role-controller': { title: 'Role Controller', section: 'Access & Security' },
  '/admin/sellers': { title: 'Seller Management', section: 'Access & Security' },
  '/admin/analytics': { title: 'Sales & Analytics', section: 'Overview' },
  '/admin/settings': { title: 'Workspace Settings', section: 'Access & Security' },
  '/seller/dashboard': { title: 'Seller Overview', section: 'Overview' },
  '/seller/products': { title: 'Store Products', section: 'Management' },
  '/seller/orders': { title: 'Store Orders', section: 'Management' },
  '/seller/inventory': { title: 'Inventory', section: 'Management' },
  '/seller/analytics': { title: 'Store Analytics', section: 'Overview' },
  '/seller/profile': { title: 'Seller Profile', section: 'Workspace' },
};

export function navigationFor(area: PortalRole): NavItem[] {
  return area === 'admin' ? adminNavigationFlat : sellerNavigationFlat;
}

export function groupsFor(area: PortalRole): NavGroup[] {
  return area === 'admin' ? adminNavGroups : sellerNavGroups;
}

export function PortalLayout({ area }: { area: PortalRole }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const { sidebarCollapsed, toggleSidebar, openCommandPalette } = useTheme();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && mobileOpen) {
        setMobileOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileOpen]);

  const groups = groupsFor(area);
  const allItems = navigationFor(area);
  const filteredItems = search.trim()
    ? allItems.filter(item => item.label.toLowerCase().includes(search.toLowerCase()))
    : null;

  const currentRouteMeta = routeTitles[location.pathname] || {
    title: area === 'admin' ? 'Admin Workspace' : 'Seller Workspace',
    section: 'Control Center',
  };

  return (
    <div
      className={`portal-shell${sidebarCollapsed ? ' is-collapsed' : ''}${
        mobileOpen ? ' mobile-open' : ''
      }`}
    >
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>

      {mobileOpen && (
        <button
          className="mobile-scrim"
          type="button"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside className="sidebar" aria-label={`${area} navigation`}>
        <div className="brand-row">
          <Link
            to={`/${area}/dashboard`}
            className="brand"
            onClick={() => setMobileOpen(false)}
            aria-label="Brew and Boba management home"
          >
            <span className="brand-mark">
              <img
                src="/brand/brew-boba-mascot-badge.png"
                alt="Brew & Boba Mascot"
                onError={e => {
                  (e.currentTarget as HTMLElement).style.display = 'none';
                }}
              />
              <Coffee size={22} strokeWidth={2.2} aria-hidden="true" />
            </span>
            <span className="brand-copy">
              <strong>Brew &amp; Boba</strong>
              <small>MANAGEMENT WORKSPACE</small>
            </span>
          </Link>
          <button
            className="icon-button mobile-close"
            type="button"
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className="workspace-badge">
          <span className="workspace-icon">
            <Store size={18} aria-hidden="true" />
          </span>
          <span className="workspace-copy">
            <strong>Control Center</strong>
            <small>{area === 'admin' ? 'Administrator' : 'Seller'}</small>
          </span>
        </div>

        <label className="nav-search">
          <Search size={16} aria-hidden="true" />
          <span className="sr-only">Search navigation pages</span>
          <input
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Find a page…"
            aria-label="Filter navigation pages"
          />
        </label>

        <nav className="nav-list" aria-label="Main menu">
          {filteredItems ? (
            <div>
              <div className="nav-caption">FILTERED PAGES</div>
              {filteredItems.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <item.icon size={18} aria-hidden="true" />
                  <span>{item.label}</span>
                  {item.planned && <span className="planned-tag">Planned</span>}
                </NavLink>
              ))}
              {filteredItems.length === 0 && <p className="nav-empty">No matching pages</p>}
            </div>
          ) : (
            groups.map(group => (
              <div key={group.groupTitle} className="nav-group-section">
                <div className="nav-caption">{group.groupTitle}</div>
                {group.items.map(item => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                    title={sidebarCollapsed ? item.label : undefined}
                  >
                    <item.icon size={18} aria-hidden="true" />
                    <span>{item.label}</span>
                    {item.planned && <span className="planned-tag">Planned</span>}
                  </NavLink>
                ))}
              </div>
            ))
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="identity">
            <span className="avatar">{user?.full_name?.slice(0, 1).toUpperCase() || 'A'}</span>
            <div className="identity-copy">
              <strong>{user?.full_name || 'Administrator'}</strong>
              <small>{user?.email || 'admin@brewboba.com'}</small>
            </div>
          </div>
          <button
            type="button"
            className="logout-button"
            onClick={logout}
            aria-label="Sign out of management workspace"
          >
            <LogOut size={17} aria-hidden="true" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      <div className="main-column">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="icon-button mobile-menu"
              type="button"
              aria-label="Open navigation menu"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen(true)}
            >
              <Menu size={20} aria-hidden="true" />
            </button>
            <button
              className="icon-button collapse-toggle"
              type="button"
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-expanded={!sidebarCollapsed}
              onClick={toggleSidebar}
            >
              {sidebarCollapsed ? (
                <ChevronRight size={18} aria-hidden="true" />
              ) : (
                <ChevronLeft size={18} aria-hidden="true" />
              )}
            </button>
            <span className="topbar-divider" />
            <div className="topbar-breadcrumb" aria-label="Breadcrumb">
              <span>{area === 'admin' ? 'Control Center' : 'Seller Hub'}</span>
              <span className="topbar-crumb-sep" aria-hidden="true">
                /
              </span>
              <strong>{currentRouteMeta.title}</strong>
            </div>
          </div>

          <div className="topbar-right">
            <button
              type="button"
              className="topbar-search-trigger"
              onClick={openCommandPalette}
              aria-label="Open command palette (Press Command+K)"
            >
              <Search size={15} aria-hidden="true" />
              <span className="topbar-search-label">Search destinations, orders, or actions…</span>
              <kbd className="kbd-shortcut" title="Command + K">
                ⌘K
              </kbd>
            </button>

            <span className="session-status-badge">
              <span className="live-dot" aria-hidden="true" />
              <span>Server Verified</span>
            </span>

            <span
              className="avatar avatar-small"
              aria-hidden="true"
              title={user?.full_name || 'Administrator'}
            >
              {user?.full_name?.slice(0, 1).toUpperCase() || 'A'}
            </span>
          </div>
        </header>

        <main id="main-content" className="content">
          <Outlet />
        </main>
      </div>

      <CommandPalette />
    </div>
  );
}
