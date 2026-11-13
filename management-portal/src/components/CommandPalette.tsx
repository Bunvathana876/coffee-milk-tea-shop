import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Check,
  Clock,
  FolderTree,
  LayoutDashboard,
  Package,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Store,
  Users,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useTheme } from './ThemeContext';

export interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  category: 'Navigation' | 'Actions' | 'Preferences';
  icon: LucideIcon;
  action: () => void;
  keywords?: string[];
}

export function CommandPalette() {
  const navigate = useNavigate();
  const { isCommandPaletteOpen, closeCommandPalette } = useTheme();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Focus management
  useEffect(() => {
    if (isCommandPaletteOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement;
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    } else {
      previousActiveElement.current?.focus?.();
    }
  }, [isCommandPaletteOpen]);

  // All permitted commands
  const items: CommandItem[] = useMemo(
    () => [
      {
        id: 'nav-dashboard',
        title: 'Dashboard',
        subtitle: 'Overview of sales, revenue, and order queue',
        category: 'Navigation',
        icon: LayoutDashboard,
        keywords: ['home', 'overview', 'summary', 'sales'],
        action: () => navigate('/admin/dashboard'),
      },
      {
        id: 'nav-orders',
        title: 'Orders',
        subtitle: 'Live customer order fulfillment queue',
        category: 'Navigation',
        icon: ShoppingBag,
        keywords: ['queue', 'drinks', 'settlement', 'kitchen'],
        action: () => navigate('/admin/orders'),
      },
      {
        id: 'nav-pending-orders',
        title: 'Pending Orders',
        subtitle: 'Filter orders requiring immediate preparation',
        category: 'Navigation',
        icon: Clock,
        keywords: ['urgent', 'attention', 'waiting'],
        action: () => navigate('/admin/orders?status=pending'),
      },
      {
        id: 'nav-products',
        title: 'Products',
        subtitle: 'Drink catalog, pricing, and availability',
        category: 'Navigation',
        icon: Package,
        keywords: ['drinks', 'menu', 'items', 'tea', 'coffee'],
        action: () => navigate('/admin/products'),
      },
      {
        id: 'act-add-drink',
        title: 'Add New Drink',
        subtitle: 'Open create beverage editor drawer',
        category: 'Actions',
        icon: Plus,
        keywords: ['create', 'new', 'beverage', 'item'],
        action: () => navigate('/admin/products?action=new'),
      },
      {
        id: 'nav-categories',
        title: 'Categories',
        subtitle: 'Menu groupings and drink sections',
        category: 'Navigation',
        icon: FolderTree,
        keywords: ['grouping', 'sections', 'menu'],
        action: () => navigate('/admin/categories'),
      },
      {
        id: 'nav-customers',
        title: 'Customers',
        subtitle: 'Customer accounts directory & loyalty stamps',
        category: 'Navigation',
        icon: Users,
        keywords: ['users', 'loyalty', 'stamps', 'community'],
        action: () => navigate('/admin/customers'),
      },
      {
        id: 'nav-role-controller',
        title: 'Role Controller',
        subtitle: 'Manage role access, seller accounts, and store permissions',
        category: 'Navigation',
        icon: ShieldCheck,
        keywords: ['rbac', 'roles', 'permissions', 'access', 'security', 'controller', 'admin'],
        action: () => navigate('/admin/role-controller'),
      },
      {
        id: 'nav-sellers',
        title: 'Sellers',
        subtitle: 'Directory of café seller accounts & store assignments',
        category: 'Navigation',
        icon: Store,
        keywords: ['sellers', 'partners', 'stores', 'multi-tenant'],
        action: () => navigate('/admin/sellers'),
      },
      {
        id: 'nav-analytics',
        title: 'Analytics & Reporting',
        subtitle: 'Verified financial insights & order breakdown',
        category: 'Navigation',
        icon: BarChart3,
        keywords: ['reports', 'revenue', 'money', 'charts', 'kpi'],
        action: () => navigate('/admin/analytics'),
      },
      {
        id: 'nav-settings',
        title: 'Workspace Settings',
        subtitle: 'Workspace table density, layout, and preferences',
        category: 'Preferences',
        icon: Settings,
        keywords: ['settings', 'density', 'sidebar', 'configure', 'workspace'],
        action: () => navigate('/admin/settings'),
      },
    ],
    [navigate],
  );

  // Filter items by search query
  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(item => {
      if (item.title.toLowerCase().includes(q)) return true;
      if (item.subtitle?.toLowerCase().includes(q)) return true;
      if (item.category.toLowerCase().includes(q)) return true;
      return item.keywords?.some(kw => kw.toLowerCase().includes(q)) ?? false;
    });
  }, [items, query]);

  // Reset selectedIndex if out of bounds
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredItems]);

  function handleSelect(item: CommandItem) {
    closeCommandPalette();
    item.action();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setSelectedIndex(idx => (idx + 1) % Math.max(1, filteredItems.length));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setSelectedIndex(idx => (idx - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const selected = filteredItems[selectedIndex];
      if (selected) {
        handleSelect(selected);
      }
    } else if (event.key === 'Escape') {
      event.preventDefault();
      closeCommandPalette();
    }
  }

  if (!isCommandPaletteOpen) return null;

  // Group filtered items by category
  const categories = ['Navigation', 'Actions', 'Preferences'] as const;

  return (
    <div
      className="command-palette-backdrop"
      onClick={closeCommandPalette}
      onKeyDown={handleKeyDown}
      role="presentation"
    >
      <div
        ref={dialogRef}
        className="command-palette-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Command Palette"
        onClick={e => e.stopPropagation()}
      >
        <div className="command-palette-search">
          <Search size={18} className="command-search-icon" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            className="command-search-input"
            placeholder="Type a command or search destination…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            aria-label="Search command palette"
          />
          <button
            type="button"
            className="command-close-button"
            onClick={closeCommandPalette}
            aria-label="Close command palette"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <div className="command-palette-content">
          {filteredItems.length === 0 ? (
            <div className="command-empty-state">
              <p>No results found for &ldquo;{query}&rdquo;</p>
              <small>Try searching for dashboard, orders, products, or customers</small>
            </div>
          ) : (
            <div className="command-groups" role="listbox">
              {categories.map(cat => {
                const groupItems = filteredItems.filter(i => i.category === cat);
                if (groupItems.length === 0) return null;

                return (
                  <div key={cat} className="command-group">
                    <div className="command-group-heading">{cat}</div>
                    {groupItems.map(item => {
                      const itemIndex = filteredItems.indexOf(item);
                      const isSelected = itemIndex === selectedIndex;
                      const Icon = item.icon;

                      return (
                        <div
                          key={item.id}
                          role="option"
                          aria-selected={isSelected}
                          className={`command-item ${isSelected ? 'selected' : ''}`}
                          onClick={() => handleSelect(item)}
                          onMouseEnter={() => setSelectedIndex(itemIndex)}
                        >
                          <div className="command-item-icon" aria-hidden="true">
                            <Icon size={16} />
                          </div>
                          <div className="command-item-text">
                            <span className="command-item-title">{item.title}</span>
                            {item.subtitle && (
                              <span className="command-item-subtitle">{item.subtitle}</span>
                            )}
                          </div>
                          {isSelected && (
                            <span className="command-item-badge">
                              <span>Jump</span>
                              <Check size={12} aria-hidden="true" />
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="command-palette-footer">
          <div className="command-shortcuts">
            <span className="shortcut-item">
              <kbd>↑</kbd> <kbd>↓</kbd> Navigate
            </span>
            <span className="shortcut-item">
              <kbd>↵</kbd> Select
            </span>
            <span className="shortcut-item">
              <kbd>ESC</kbd> Close
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
