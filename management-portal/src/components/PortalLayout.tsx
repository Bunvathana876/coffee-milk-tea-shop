import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import {
  BarChart3, Boxes, ChevronLeft, ChevronRight, Coffee, FolderTree,
  LayoutDashboard, LogOut, Menu, Package, Search, Settings, ShoppingBag,
  Store, Users, UserRound, X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useAuth } from '../auth/authContext'
import type { PortalRole } from '../lib/access'

interface NavItem { label: string; to: string; icon: LucideIcon }

const adminNavigation: NavItem[] = [
  { label: 'Dashboard', to: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Orders', to: '/admin/orders', icon: ShoppingBag },
  { label: 'Products', to: '/admin/products', icon: Package },
  { label: 'Categories', to: '/admin/categories', icon: FolderTree },
  { label: 'Customers', to: '/admin/customers', icon: Users },
  { label: 'Sellers', to: '/admin/sellers', icon: Store },
  { label: 'Analytics', to: '/admin/analytics', icon: BarChart3 },
  { label: 'Settings', to: '/admin/settings', icon: Settings },
]

const sellerNavigation: NavItem[] = [
  { label: 'Dashboard', to: '/seller/dashboard', icon: LayoutDashboard },
  { label: 'Products', to: '/seller/products', icon: Package },
  { label: 'Orders', to: '/seller/orders', icon: ShoppingBag },
  { label: 'Inventory', to: '/seller/inventory', icon: Boxes },
  { label: 'Analytics', to: '/seller/analytics', icon: BarChart3 },
  { label: 'Profile', to: '/seller/profile', icon: UserRound },
]

export function navigationFor(area: PortalRole): NavItem[] {
  return area === 'admin' ? adminNavigation : sellerNavigation
}

export function PortalLayout({ area }: { area: PortalRole }) {
  const { user, logout } = useAuth()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [search, setSearch] = useState('')
  const items = navigationFor(area).filter(item => item.label.toLowerCase().includes(search.toLowerCase()))

  return <div className={`portal-shell${collapsed ? ' is-collapsed' : ''}${mobileOpen ? ' mobile-open' : ''}`}>
    <a className="skip-link" href="#main-content">Skip to content</a>
    {mobileOpen && <button className="mobile-scrim" type="button" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}
    <aside className="sidebar" aria-label={`${area} navigation`}>
      <div className="brand-row">
        <Link to={`/${area}/dashboard`} className="brand" onClick={() => setMobileOpen(false)} aria-label="Brew and Boba management home">
          <span className="brand-mark"><Coffee size={22} strokeWidth={2.1} /></span>
          <span className="brand-copy"><strong>Brew & Boba</strong><small>MANAGEMENT</small></span>
        </Link>
        <button className="icon-button mobile-close" type="button" aria-label="Close navigation" onClick={() => setMobileOpen(false)}><X size={20} /></button>
      </div>
      <div className="workspace-badge"><span className="workspace-icon"><Store size={19} /></span><span className="workspace-copy"><strong>Platform workspace</strong><small>{area === 'admin' ? 'Administrator' : 'Seller'}</small></span></div>
      <label className="nav-search"><Search size={17} aria-hidden="true" /><span className="sr-only">Search navigation</span><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Find a page" /></label>
      <div className="nav-caption">WORKSPACE</div>
      <nav className="nav-list" aria-label="Main menu">
        {items.map(item => <NavLink key={item.to} to={item.to} onClick={() => setMobileOpen(false)} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} title={collapsed ? item.label : undefined}><item.icon size={19} aria-hidden="true" /><span>{item.label}</span></NavLink>)}
        {items.length === 0 && <p className="nav-empty">No matching pages</p>}
      </nav>
      <div className="sidebar-footer">
        <div className="identity"><span className="avatar">{user?.full_name?.slice(0, 1).toUpperCase() || 'A'}</span><span className="identity-copy"><strong>{user?.full_name}</strong><small>{user?.email}</small></span></div>
        <button type="button" className="logout-button" onClick={logout}><LogOut size={18} aria-hidden="true" /><span>Sign out</span></button>
      </div>
    </aside>
    <div className="main-column">
      <header className="topbar">
        <div className="topbar-left"><button className="icon-button mobile-menu" type="button" aria-label="Open navigation" aria-expanded={mobileOpen} onClick={() => setMobileOpen(true)}><Menu size={22} /></button><button className="icon-button collapse-toggle" type="button" aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'} aria-expanded={!collapsed} onClick={() => setCollapsed(value => !value)}>{collapsed ? <ChevronRight size={19} /> : <ChevronLeft size={19} />}</button><span className="topbar-divider" /><span className="topbar-label">{area === 'admin' ? 'Admin workspace' : 'Seller workspace'}</span></div>
        <div className="topbar-right"><span className="live-dot" /><span className="topbar-live">Connected workspace</span><span className="avatar avatar-small">{user?.full_name?.slice(0, 1).toUpperCase() || 'A'}</span></div>
      </header>
      <main id="main-content" className="content"><Outlet /></main>
    </div>
  </div>
}
