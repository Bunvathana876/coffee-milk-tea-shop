import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext, type AuthContextValue } from '../auth/authContext';
import { PortalLayout, navigationFor } from '../components/PortalLayout';
import { Drawer } from '../components/Drawer';
import { ConfirmAction } from '../components/ConfirmAction';
import { PendingShortcutBanner, getStatusBadge } from '../pages/AdminDashboard';
import { OrdersPage, getOrderStatusBadge, getPaymentStatusBadge } from '../pages/OrdersPage';
import { calculatePercentage, formatKhr, formatUsd, ZeroRevenueCard } from '../pages/AnalyticsPage';
import { DRINK_THUMBNAIL_FALLBACK } from '../pages/ProductsPage';
import { CATEGORY_THUMBNAIL_FALLBACK } from '../pages/CategoriesPage';
import {
  CustomersPage,
  formatDate,
  getCustomerStatusBadge,
  getInitials,
  TableSkeleton,
} from '../pages/CustomersPage';

const mockAdminUser = {
  id: 1,
  email: 'admin@brewboba.com',
  full_name: 'Elena Rostova',
  role: 'admin',
  is_active: true,
};

const mockAuthContext: AuthContextValue = {
  status: 'ready',
  token: 'mock-jwt-token',
  user: mockAdminUser,
  login: async () => {},
  logout: () => {},
};

test('navigation items include all required destinations and mark planned features', () => {
  const adminItems = navigationFor('admin');
  const labels = adminItems.map(item => item.label);
  assert.deepEqual(labels, [
    'Dashboard',
    'Orders',
    'Products',
    'Categories',
    'Customers',
    'Role Controller',
    'Sellers',
    'Analytics',
    'Settings',
  ]);

  const plannedItems = adminItems.filter(item => item.planned).map(item => item.label);
  assert.deepEqual(plannedItems, ['Sellers']);

  const sellerItems = navigationFor('seller');
  assert.ok(sellerItems.every(item => item.planned));
});

test('order status mapping displays safe neutral fallback for unknown statuses', () => {
  assert.equal(getStatusBadge('completed').className, 'status-badge status-completed');
  assert.equal(getStatusBadge('ready').className, 'status-badge status-ready');
  assert.equal(getStatusBadge('preparing').className, 'status-badge status-preparing');
  assert.equal(getStatusBadge('pending').className, 'status-badge status-pending');
  assert.equal(getStatusBadge('cancelled').className, 'status-badge status-cancelled');

  // Unknown status must NOT fall back to pending
  const unknownBadge = getStatusBadge('refunded');
  assert.equal(unknownBadge.className, 'status-badge status-unknown');
  assert.notEqual(unknownBadge.className, 'status-badge status-pending');

  const arbitraryBadge = getStatusBadge('custom_state');
  assert.equal(arbitraryBadge.className, 'status-badge status-unknown');
});

test('OrdersPage status and payment badges maintain strict separation', () => {
  // Order statuses
  assert.equal(getOrderStatusBadge('completed').className, 'status-badge status-completed');
  assert.equal(getOrderStatusBadge('ready').className, 'status-badge status-ready');
  assert.equal(getOrderStatusBadge('preparing').className, 'status-badge status-preparing');
  assert.equal(getOrderStatusBadge('pending').className, 'status-badge status-pending');
  assert.equal(getOrderStatusBadge('cancelled').className, 'status-badge status-cancelled');
  assert.equal(getOrderStatusBadge('returned').className, 'status-badge status-unknown');

  // Payment statuses
  assert.equal(getPaymentStatusBadge('paid').className, 'payment-badge payment-paid');
  assert.equal(getPaymentStatusBadge('unpaid').className, 'payment-badge payment-unpaid');
  assert.equal(getPaymentStatusBadge('failed').className, 'payment-badge payment-failed');
  assert.equal(getPaymentStatusBadge('other').className, 'payment-badge payment-unknown');

  // Critical safety: unpaid never equals paid
  assert.notEqual(
    getPaymentStatusBadge('unpaid').className,
    getPaymentStatusBadge('paid').className,
  );
});

test('Drawer renders accessible dialog with proper attributes and title when open', () => {
  const closedHtml = renderToStaticMarkup(
    <Drawer isOpen={false} onClose={() => {}} title="Test Drawer">
      <p>Drawer Content</p>
    </Drawer>,
  );
  assert.equal(closedHtml, '');

  const openHtml = renderToStaticMarkup(
    <Drawer
      isOpen={true}
      onClose={() => {}}
      eyebrow="DRAWER EYEBROW"
      title="Edit Drink Item"
      description="Update pricing and availability"
      footer={<button type="button">Save</button>}
    >
      <p>Drawer Form Content</p>
    </Drawer>,
  );

  assert.match(openHtml, /role="dialog"/);
  assert.match(openHtml, /aria-modal="true"/);
  assert.match(openHtml, /Edit Drink Item/);
  assert.match(openHtml, /DRAWER EYEBROW/);
  assert.match(openHtml, /Drawer Form Content/);
  assert.match(openHtml, /aria-label="Close panel"/);
  assert.match(openHtml, /Save/);
});

test('ConfirmAction renders accessible alertdialog before destructive operations', () => {
  const html = renderToStaticMarkup(
    <ConfirmAction
      title="Delete Roasted Oolong Boba?"
      detail="This permanently removes the catalog product. Historical order line-item snapshots remain."
      busy={false}
      onCancel={() => {}}
      onConfirm={() => {}}
    />,
  );

  assert.match(html, /role="alertdialog"/);
  assert.match(html, /aria-modal="true"/);
  assert.match(html, /Delete Roasted Oolong Boba\?/);
  assert.match(html, /Historical order line-item snapshots remain/);
  assert.match(html, /Cancel/);
  assert.match(html, /Confirm/);
});

test('PortalLayout renders header, sidebar, brand identity, and user info', () => {
  const html = renderToStaticMarkup(
    <AuthContext.Provider value={mockAuthContext}>
      <MemoryRouter initialEntries={['/admin/dashboard']}>
        <PortalLayout area="admin" />
      </MemoryRouter>
    </AuthContext.Provider>,
  );

  assert.match(html, /Brew &amp; Boba/);
  assert.match(html, /MANAGEMENT WORKSPACE/);
  assert.match(html, /Control Center/);
  assert.match(html, /Elena Rostova/);
  assert.match(html, /admin@brewboba\.com/);
  assert.match(html, /Server Verified/);
  assert.match(html, /Sign out/);
});

test('AnalyticsPage currency formatters render authoritative USD and KHR strings', () => {
  assert.equal(formatUsd(1250.5), '$1,250.50');
  assert.equal(formatUsd(0), '$0.00');
  assert.equal(formatUsd(NaN), '$0.00');

  assert.equal(formatKhr(5000000), '៛5,000,000');
  assert.equal(formatKhr(0), '៛0');
  assert.equal(formatKhr(NaN), '៛0');
});

test('AnalyticsPage calculatePercentage handles non-zero, zero, and invalid totals safely', () => {
  assert.equal(calculatePercentage(25, 100), 25);
  assert.equal(calculatePercentage(1, 3), 33);
  assert.equal(calculatePercentage(2, 3), 67);
  assert.equal(calculatePercentage(0, 100), 0);

  // Zero and negative division must return 0 instead of NaN or Infinity
  assert.equal(calculatePercentage(10, 0), 0);
  assert.equal(calculatePercentage(0, 0), 0);
  assert.equal(calculatePercentage(-5, 100), 0);
  assert.equal(calculatePercentage(10, -50), 0);
});

test('PendingShortcutBanner displays urgent alert and pending orders link when pending > 0', () => {
  const html = renderToStaticMarkup(
    <MemoryRouter>
      <PendingShortcutBanner pendingOrders={5} />
    </MemoryRouter>,
  );

  assert.match(html, /Orders need attention/);
  assert.match(html, /You have <strong>5<\/strong> orders waiting in the queue/);
  assert.match(html, /href="\/admin\/orders\?status=pending"/);
  assert.match(html, /View Pending Orders/);
});

test('PendingShortcutBanner displays calm all-clear state when pending is 0', () => {
  const html = renderToStaticMarkup(
    <MemoryRouter>
      <PendingShortcutBanner pendingOrders={0} />
    </MemoryRouter>,
  );

  assert.match(html, /All orders up to date/);
  assert.match(html, /No pending orders waiting in the queue/);
  assert.match(html, /View Order Queue/);
  assert.doesNotMatch(html, /Orders need attention/);
});

test('OrdersPage parses and selects ?status=pending from URL query parameters', () => {
  const html = renderToStaticMarkup(
    <AuthContext.Provider value={mockAuthContext}>
      <MemoryRouter initialEntries={['/admin/orders?status=pending']}>
        <OrdersPage />
      </MemoryRouter>
    </AuthContext.Provider>,
  );

  // Pending tab should be selected
  assert.match(html, /aria-selected="true"[^>]*><span>Pending<\/span>/);
  // Search input with shorter placeholder
  assert.match(html, /placeholder="Search orders…"/);
  // Helper label describing filter scope
  assert.match(html, /Filters loaded page records/);
});

test('OrdersPage defaults to all orders when no status parameter is supplied', () => {
  const html = renderToStaticMarkup(
    <AuthContext.Provider value={mockAuthContext}>
      <MemoryRouter initialEntries={['/admin/orders']}>
        <OrdersPage />
      </MemoryRouter>
    </AuthContext.Provider>,
  );

  // All Orders tab should be selected
  assert.match(html, /aria-selected="true"[^>]*><span>All Orders<\/span>/);
  assert.match(html, /aria-selected="false"[^>]*><span>Pending<\/span>/);
});

test('ZeroRevenueCard renders concise authoritative revenue recognition explanation', () => {
  const html = renderToStaticMarkup(<ZeroRevenueCard />);

  assert.match(html, /Revenue Recognition Policy/);
  assert.match(
    html,
    /No recognized revenue yet\. Revenue is counted only for orders marked both Paid and Completed\. Other orders remain excluded from recorded sales\./,
  );
});

test('Drink and category thumbnail fallbacks reference verified brand assets', () => {
  assert.equal(DRINK_THUMBNAIL_FALLBACK, '/brand/brew-boba-cup-icon.webp');
  assert.equal(CATEGORY_THUMBNAIL_FALLBACK, '/brand/brew-boba-mascot-badge.png');
});

test('CustomersPage getInitials extracts clean uppercase initials from customer names', () => {
  assert.equal(getInitials('Alice Boba'), 'AB');
  assert.equal(getInitials('Alice'), 'AL');
  assert.equal(getInitials('John Jacob Astor'), 'JA');
  assert.equal(getInitials(''), '?');
  assert.equal(getInitials('   '), '?');
});

test('CustomersPage formatDate formats ISO strings and handles empty values gracefully', () => {
  assert.equal(formatDate('2026-03-15T12:00:00.000Z'), 'Mar 15, 2026');
  assert.equal(formatDate(null), 'Never');
  assert.equal(formatDate(undefined), 'Never');
  assert.equal(formatDate('invalid-date-string'), 'Invalid date');
});

test('CustomersPage getCustomerStatusBadge renders distinct active and inactive badges', () => {
  const activeBadge = getCustomerStatusBadge(true);
  assert.equal(activeBadge.className, 'status-badge status-completed');
  assert.equal(activeBadge.label, 'Active');

  const inactiveBadge = getCustomerStatusBadge(false);
  assert.equal(inactiveBadge.className, 'status-badge status-cancelled');
  assert.equal(inactiveBadge.label, 'Inactive');
});

test('TableSkeleton renders accessible structure with proper headers and rows', () => {
  const html = renderToStaticMarkup(<TableSkeleton rows={4} />);
  assert.match(html, /<table class="customers-table"/);
  assert.match(html, /<caption class="sr-only">Loading customer records<\/caption>/);
  assert.match(html, /<th scope="col">Customer<\/th>/);
  assert.match(html, /<th scope="col">Contact<\/th>/);
  assert.match(html, /<th scope="col">Loyalty<\/th>/);
  assert.match(html, /<th scope="col">Orders &amp; Spend<\/th>/);
  assert.match(html, /<th scope="col">Status<\/th>/);
  assert.match(html, /<th scope="col">Joined<\/th>/);
  // Should have 4 skeleton rows
  const matches = html.match(/class="skeleton-row"/g);
  assert.equal(matches?.length, 4);
});

test('CustomersPage renders breadcrumb, heading, metrics, and search toolbar', () => {
  const html = renderToStaticMarkup(
    <AuthContext.Provider value={mockAuthContext}>
      <MemoryRouter initialEntries={['/admin/customers']}>
        <CustomersPage />
      </MemoryRouter>
    </AuthContext.Provider>,
  );

  // Breadcrumb
  assert.match(html, /aria-label="Breadcrumb"/);
  assert.match(html, /Dashboard/);
  assert.match(html, /Customers/);

  // Page Heading & Subtitle
  assert.match(html, /COMMUNITY &amp; LOYALTY/);
  assert.match(html, /View and manage your café customer records\./);

  // Metric Cards
  assert.match(html, /Total Customers/);
  assert.match(html, /Active Accounts/);
  assert.match(html, /Inactive Accounts/);

  // Status Tabs
  assert.match(html, /role="tablist"/);
  assert.match(html, /All Customers/);
  assert.match(html, /Active/);
  assert.match(html, /Inactive/);

  // Search & Sort
  assert.match(html, /placeholder="Search customers by name, phone, or email…"/);
  assert.match(html, /Newest first/);
  assert.match(html, /Most loyalty stamps/);
});

import { ThemeContext, type ThemeContextValue } from '../components/ThemeContext';
import { CommandPalette } from '../components/CommandPalette';
import { SettingsPage } from '../pages/SettingsPage';
import {
  QuickActionsBar,
  OrderPipelineWidget,
  MenuHealthWidget,
  OperationsCenterPanel,
} from '../pages/AdminDashboard';
import { ORDER_STATUS_CONFIG } from './orderStatus';

const mockThemeContext: ThemeContextValue = {
  theme: 'light',
  effectiveTheme: 'light',
  setTheme: () => {},
  density: 'default',
  setDensity: () => {},
  sidebarCollapsed: false,
  setSidebarCollapsed: () => {},
  toggleSidebar: () => {},
  isCommandPaletteOpen: true,
  setIsCommandPaletteOpen: () => {},
  openCommandPalette: () => {},
  closeCommandPalette: () => {},
};

test('SettingsPage renders density modes, sidebar preferences, and local storage notice with theme options removed', () => {
  const html = renderToStaticMarkup(
    <AuthContext.Provider value={mockAuthContext}>
      <ThemeContext.Provider value={mockThemeContext}>
        <MemoryRouter initialEntries={['/admin/settings']}>
          <SettingsPage />
        </MemoryRouter>
      </ThemeContext.Provider>
    </AuthContext.Provider>,
  );

  // Title and typography (duplicate breadcrumb removed)
  assert.match(html, /PREFERENCES &amp; WORKSPACE/);
  assert.match(html, /Workspace Settings/);
  assert.match(html, /class="page-heading"/);
  assert.doesNotMatch(html, /class="breadcrumb"/);

  // Theme section completely removed for light-mode only workspace
  assert.doesNotMatch(html, /Theme &amp; Appearance/);
  assert.doesNotMatch(html, /Dark Mode/);
  assert.doesNotMatch(html, /System Preference/);

  // Density section preserved
  assert.match(html, /Interface Density/);
  assert.match(html, /High Density/);
  assert.match(html, /Recommended/);
  assert.match(html, /Spacious/);

  // Sidebar preferences & Local storage info preserved
  assert.match(html, /Collapse sidebar by default/);
  assert.match(html, /Local Storage &amp; Session Privacy/);
  assert.match(html, /Elena Rostova|admin@brewboba\.com/);
});

test('QuickActionsBar renders primary links including Add Drink with action=new', () => {
  const html = renderToStaticMarkup(
    <MemoryRouter>
      <QuickActionsBar />
    </MemoryRouter>,
  );

  assert.match(html, /href="\/admin\/orders"/);
  assert.match(html, /href="\/admin\/products\?action=new"/);
  assert.match(html, /href="\/admin\/categories"/);
  assert.match(html, /href="\/admin\/analytics"/);
  assert.match(html, /Manage Orders/);
  assert.match(html, /Add Drink/);
});

test('OrderPipelineWidget accurately computes order distribution percentages', () => {
  const mockSummary = {
    total_sales_usd: 500,
    total_orders: 10,
    completed_orders: 7,
    pending_orders: 2,
    total_customers: 25,
    recent_orders: [],
  };

  const html = renderToStaticMarkup(<OrderPipelineWidget summary={mockSummary} />);

  assert.match(html, /Fulfillment Pipeline/);
  assert.match(html, /Completed &amp; Settled|Completed/);
  assert.match(html, /\(70%\)/);
  assert.match(html, /Pending Attention|Pending/);
  assert.match(html, /\(20%\)/);
  assert.match(html, /Preparing \/ In-Flight/);
  assert.match(html, /\(10%\)/);
});

test('MenuHealthWidget displays item counts and availability rate', () => {
  const catalog = {
    totalProducts: 20,
    availableProducts: 18,
    categoriesCount: 4,
  };

  const html = renderToStaticMarkup(
    <MemoryRouter>
      <MenuHealthWidget catalogHealth={catalog} />
    </MemoryRouter>,
  );

  assert.match(html, /CATALOG HEALTH/);
  assert.match(html, /Drink Menu Status/);
  assert.match(html, /20/);
  assert.match(html, /Total Items/);
  assert.match(html, /4/);
  assert.match(html, /Categories/);
  assert.match(html, /90%/);
  assert.match(html, /Available/);
});

test('CommandPalette renders accessible modal dialog with navigation and actions when open', () => {
  const html = renderToStaticMarkup(
    <ThemeContext.Provider value={mockThemeContext}>
      <MemoryRouter>
        <CommandPalette />
      </MemoryRouter>
    </ThemeContext.Provider>,
  );

  assert.match(html, /role="dialog"/);
  assert.match(html, /aria-label="Command Palette"/);
  assert.match(html, /placeholder="Type a command or search destination…"/);
  assert.match(html, /Navigation/);
  assert.match(html, /Dashboard/);
  assert.match(html, /Orders/);
  assert.match(html, /Products/);
  assert.match(html, /Customers/);
  assert.match(html, /Actions/);
  assert.match(html, /Add New Drink/);
  assert.match(html, /Preferences/);
  // Theme toggle command completely removed
  assert.doesNotMatch(html, /Switch to Dark Theme/);
});

test('PortalLayout includes topbar command palette trigger and excludes theme toggle button', () => {
  const html = renderToStaticMarkup(
    <AuthContext.Provider value={mockAuthContext}>
      <ThemeContext.Provider value={mockThemeContext}>
        <MemoryRouter initialEntries={['/admin/dashboard']}>
          <PortalLayout area="admin" />
        </MemoryRouter>
      </ThemeContext.Provider>
    </AuthContext.Provider>,
  );

  // Topbar search / command palette trigger
  assert.match(html, /topbar-search-trigger/);
  assert.match(html, /Search destinations, orders, or actions…/);
  assert.match(html, /⌘K/);

  // Theme toggle button completely removed for light mode only
  assert.doesNotMatch(html, /theme-toggle-btn/);
});

import { AdminDashboard, OrderActivityChart, OrderBreakdownDonut } from '../pages/AdminDashboard';
import { getStoredTheme } from '../components/ThemeContext';

test('PortalLayout topbar focuses on search without theme toggle or redundant action buttons', () => {
  const html = renderToStaticMarkup(
    <AuthContext.Provider value={mockAuthContext}>
      <ThemeContext.Provider value={mockThemeContext}>
        <MemoryRouter initialEntries={['/admin/dashboard']}>
          <PortalLayout area="admin" />
        </MemoryRouter>
      </ThemeContext.Provider>
    </AuthContext.Provider>,
  );

  assert.match(html, /topbar-search-trigger/);
  assert.doesNotMatch(html, /theme-toggle-btn/);
  assert.doesNotMatch(html, /class="topbar-action-button"/);
});

test('OrderActivityChart calculates status percentages and renders accessible bar visualization', () => {
  const statusCounts = {
    completed: 15,
    pending: 5,
    preparing: 3,
    ready: 2,
    cancelled: 0,
  };
  const totalOrders = 25;

  const html = renderToStaticMarkup(
    <OrderActivityChart statusCounts={statusCounts} totalOrders={totalOrders} />,
  );

  assert.match(html, /ORDER ACTIVITY/);
  assert.match(html, /Order Activity/);
  assert.match(html, /Latest available order status counts/);
  assert.match(html, /25 Total Orders/);
  assert.match(html, /role="img"/);
  assert.match(html, /Completed: 15 \(60%\)/);
  assert.match(html, /Pending: 5 \(20%\)/);
  assert.match(html, /Preparing: 3 \(12%\)/);
  assert.match(html, /Ready: 2 \(8%\)/);
  assert.match(html, /Cancelled: 0 \(0%\)/);
});

test('OrderActivityChart does not render bar fill for zero-count status', () => {
  const statusCounts = {
    completed: 10,
    pending: 2,
    preparing: 0,
    ready: 0,
    cancelled: 0,
  };
  const html = renderToStaticMarkup(
    <OrderActivityChart statusCounts={statusCounts} totalOrders={12} />,
  );
  // There should be exactly 2 activity-bar-fill divs (for completed and pending)
  const fillMatches = html.match(/class="activity-bar-fill"/g) || [];
  assert.equal(fillMatches.length, 2);
});

test('OrderActivityChart renders the 5 stages in canonical sequence', () => {
  const statusCounts = { completed: 1, pending: 1, preparing: 1, ready: 1, cancelled: 1 };
  const html = renderToStaticMarkup(
    <OrderActivityChart statusCounts={statusCounts} totalOrders={5} />,
  );
  const pendingIndex = html.indexOf('activity-bar-label">Pending<');
  const preparingIndex = html.indexOf('activity-bar-label">Preparing<');
  const readyIndex = html.indexOf('activity-bar-label">Ready<');
  const completedIndex = html.indexOf('activity-bar-label">Completed<');
  const cancelledIndex = html.indexOf('activity-bar-label">Cancelled<');

  assert.ok(pendingIndex < preparingIndex, 'Pending before Preparing');
  assert.ok(preparingIndex < readyIndex, 'Preparing before Ready');
  assert.ok(readyIndex < completedIndex, 'Ready before Completed');
  assert.ok(completedIndex < cancelledIndex, 'Completed before Cancelled');
});

test('OrderActivityChart displays calm neutral empty state when total orders is zero', () => {
  const emptyCounts = {
    completed: 0,
    pending: 0,
    preparing: 0,
    ready: 0,
    cancelled: 0,
  };

  const html = renderToStaticMarkup(
    <OrderActivityChart statusCounts={emptyCounts} totalOrders={0} />,
  );

  assert.match(
    html,
    /No orders recorded yet\. As orders are placed, the activity distribution will display here\./,
  );
  assert.doesNotMatch(html, /class="activity-bar-track"/);
});

test('OrderBreakdownDonut renders SVG donut arcs, total count, and status legend', () => {
  const statusCounts = {
    completed: 8,
    pending: 2,
    preparing: 0,
    ready: 0,
    cancelled: 0,
  };
  const totalOrders = 10;

  const html = renderToStaticMarkup(
    <OrderBreakdownDonut statusCounts={statusCounts} totalOrders={totalOrders} />,
  );

  assert.match(html, /DISTRIBUTION/);
  assert.match(html, /Order Breakdown/);
  assert.match(html, /class="donut-svg"/);
  assert.match(html, /class="donut-segment"/);
  assert.match(html, /Total Orders/);
  assert.match(html, /Completed/);
  assert.match(html, /8/);
  assert.match(html, /\(80%\)/);
  assert.match(html, /Pending/);
  assert.match(html, /2/);
  assert.match(html, /\(20%\)/);
});

test('OrderBreakdownDonut handles zero orders with empty ring and clear indicator', () => {
  const emptyCounts = {
    completed: 0,
    pending: 0,
    preparing: 0,
    ready: 0,
    cancelled: 0,
  };

  const html = renderToStaticMarkup(
    <OrderBreakdownDonut statusCounts={emptyCounts} totalOrders={0} />,
  );

  assert.match(html, /0 recorded orders/);
  assert.match(html, /class="donut-svg"/);
});

test('Theme preference permanently enforces light mode and rejects dark/system preferences', () => {
  // New users always default to light mode
  assert.equal(getStoredTheme(), 'light');
});

test('AdminDashboard renders page entrance class, header, and loading indicator initially', () => {
  const html = renderToStaticMarkup(
    <AuthContext.Provider value={mockAuthContext}>
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>
    </AuthContext.Provider>,
  );

  assert.match(html, /class="page-stack dashboard-page-enter"/);
  assert.match(html, /Dashboard/);
  assert.match(html, /Welcome back, Elena Rostova\./);
  assert.match(html, /Loading café overview…/);
});

test('OrderActivityChart calculates accurate bar heights and renders integer Y-axis ticks for reference data', () => {
  // Reference data: Preparing = 6, Ready = 1, others = 0, Total = 7
  const statusCounts = {
    pending: 0,
    preparing: 6,
    ready: 1,
    completed: 0,
    cancelled: 0,
  };
  const html = renderToStaticMarkup(
    <OrderActivityChart statusCounts={statusCounts} totalOrders={7} />,
  );

  // Y-axis integer ticks from 6 down to 0
  assert.match(html, /activity-yaxis-tick">6</);
  assert.match(html, /activity-yaxis-tick">5</);
  assert.match(html, /activity-yaxis-tick">4</);
  assert.match(html, /activity-yaxis-tick">3</);
  assert.match(html, /activity-yaxis-tick">2</);
  assert.match(html, /activity-yaxis-tick">1</);
  assert.match(html, /activity-yaxis-tick">0</);

  // Grid lines
  assert.match(html, /class="activity-grid-line /);
  assert.match(html, /class="activity-grid-line is-baseline"/);

  // Stat numbers at top
  assert.match(html, />6<\/strong><span class="activity-stat-pct">86%<\/span>/);
  assert.match(html, />1<\/strong><span class="activity-stat-pct">14%<\/span>/);

  // Preparing bar (count 6 / max 6 = 100% height)
  assert.match(
    html,
    /style="height:100%;background:linear-gradient\(180deg, #3B82F6 0%, #1D4ED8 100%\)/,
  );

  // Ready bar (count 1 / max 6 = 17% height)
  assert.match(
    html,
    /style="height:17%;background:linear-gradient\(180deg, #A855F7 0%, #7C3AED 100%\)/,
  );

  // Zero-count stages render baseline pill, not bar fill
  const baselinePillMatches = html.match(/class="activity-bar-baseline-pill"/g) || [];
  assert.equal(baselinePillMatches.length, 3, 'Pending, Completed, Cancelled render baseline pill');
  const barFillMatches = html.match(/class="activity-bar-fill"/g) || [];
  assert.equal(barFillMatches.length, 2, 'Only Preparing and Ready render bar fills');
});

test('OrderBreakdownDonut matches reference segment distribution (6 Preparing, 1 Ready)', () => {
  const statusCounts = {
    pending: 0,
    preparing: 6,
    ready: 1,
    completed: 0,
    cancelled: 0,
  };
  const html = renderToStaticMarkup(
    <OrderBreakdownDonut statusCounts={statusCounts} totalOrders={7} />,
  );

  // SVG viewBox and background track
  assert.match(html, /viewBox="0 0 240 240"/);
  assert.match(html, /class="donut-bg-track"/);

  // Two active segments rendered with status colors
  const segmentMatches = html.match(/class="donut-segment"/g) || [];
  assert.equal(segmentMatches.length, 2);
  assert.match(html, /stroke="#3B82F6"/); // Preparing Blue (standardized)
  assert.match(html, /stroke="#8B5CF6"/); // Ready Purple (standardized)

  // Center total
  assert.match(html, /class="donut-center-value">7<\/span>/);
  assert.match(html, /class="donut-center-label">Total Orders<\/span>/);

  // Legend rows with active and zero dots
  assert.match(html, /donut-legend-dot is-active/);
  assert.match(html, /donut-legend-dot is-zero/);
  assert.match(html, />6<\/strong><span class="donut-legend-pct">\(86%\)<\/span>/);
  assert.match(html, />1<\/strong><span class="donut-legend-pct">\(14%\)<\/span>/);
  assert.match(html, />0<\/strong><span class="donut-legend-pct">\(0%\)<\/span>/);
});

test('OrderActivityChart adapts Y-axis scaling smoothly for larger orders volumes', () => {
  const highVolumeCounts = {
    pending: 5,
    preparing: 24,
    ready: 10,
    completed: 25,
    cancelled: 2,
  };
  const html = renderToStaticMarkup(
    <OrderActivityChart statusCounts={highVolumeCounts} totalOrders={66} />,
  );

  // For maxCount = 25, yMax should be 25 with step of 5 (25, 20, 15, 10, 5, 0)
  assert.match(html, /activity-yaxis-tick">25</);
  assert.match(html, /activity-yaxis-tick">20</);
  assert.match(html, /activity-yaxis-tick">15</);
  assert.match(html, /activity-yaxis-tick">10</);
  assert.match(html, /activity-yaxis-tick">5</);
  assert.match(html, /activity-yaxis-tick">0</);
  assert.match(html, /66 Total Orders/);
});

test('OperationsCenterPanel highlights crafting and pickup stages with direct links when actionable orders exist', () => {
  // Scenario matching real user screenshot: 0 pending, 6 preparing, 1 ready
  const statusCounts = {
    pending: 0,
    preparing: 6,
    ready: 1,
    completed: 0,
    cancelled: 0,
  };

  const html = renderToStaticMarkup(
    <MemoryRouter>
      <OperationsCenterPanel statusCounts={statusCounts} pendingOrders={0} />
    </MemoryRouter>,
  );

  // It should NOT show all-clear
  assert.doesNotMatch(html, /Café floor is clear/);
  assert.match(html, /active-work/);
  assert.match(html, /7 active orders in progress/);

  // Pending is cleared
  assert.match(html, /stage-idle/);
  assert.match(html, /Barista queue is clear/);
  assert.match(html, /Cleared/);

  // Preparing is active with direct link
  assert.match(html, /stage-preparing/);
  assert.match(html, /At Crafting Station/);
  assert.match(html, /href="\/admin\/orders\?status=preparing"/);
  assert.match(html, />6<\/strong>/);

  // Ready is active with direct link
  assert.match(html, /stage-ready/);
  assert.match(html, /Ready for Pickup/);
  assert.match(html, /href="\/admin\/orders\?status=ready"/);
  assert.match(html, />1<\/strong>/);
});

test('OperationsCenterPanel displays calm all-clear state only when all actionable stages are zero', () => {
  const statusCounts = {
    pending: 0,
    preparing: 0,
    ready: 0,
    completed: 12,
    cancelled: 1,
  };

  const html = renderToStaticMarkup(
    <MemoryRouter>
      <OperationsCenterPanel statusCounts={statusCounts} pendingOrders={0} />
    </MemoryRouter>,
  );

  // Genuine all-clear state
  assert.match(html, /all-clear/);
  assert.match(html, /Café floor is clear/);
  assert.match(html, /No active orders waiting in the barista queue/);
  assert.match(html, /href="\/admin\/orders"/);
  assert.match(html, /View All Orders/);
});

test('getOrderStatusBadge and getPaymentStatusBadge standardize canonical badges with safe fallback', () => {
  // Canonical order status configs
  assert.equal(ORDER_STATUS_CONFIG.pending.color, '#F59E0B');
  assert.equal(ORDER_STATUS_CONFIG.preparing.color, '#3B82F6');
  assert.equal(ORDER_STATUS_CONFIG.ready.color, '#8B5CF6');
  assert.equal(ORDER_STATUS_CONFIG.completed.color, '#10B981');
  assert.equal(ORDER_STATUS_CONFIG.cancelled.color, '#EF4444');
  assert.equal(ORDER_STATUS_CONFIG.unknown.color, '#94A3B8');

  // Badges
  assert.deepEqual(getOrderStatusBadge('pending'), {
    className: 'status-badge status-pending',
    label: 'Pending',
    color: '#F59E0B',
    hex: '#F59E0B',
  });
  assert.deepEqual(getOrderStatusBadge('preparing'), {
    className: 'status-badge status-preparing',
    label: 'Preparing',
    color: '#3B82F6',
    hex: '#3B82F6',
  });
  assert.deepEqual(getOrderStatusBadge('ready'), {
    className: 'status-badge status-ready',
    label: 'Ready',
    color: '#8B5CF6',
    hex: '#8B5CF6',
  });
  assert.deepEqual(getOrderStatusBadge('completed'), {
    className: 'status-badge status-completed',
    label: 'Completed',
    color: '#10B981',
    hex: '#10B981',
  });
  assert.deepEqual(getOrderStatusBadge('cancelled'), {
    className: 'status-badge status-cancelled',
    label: 'Cancelled',
    color: '#EF4444',
    hex: '#EF4444',
  });
  assert.deepEqual(getOrderStatusBadge('unexpected_status'), {
    className: 'status-badge status-unknown',
    label: 'unexpected_status',
    color: '#94A3B8',
    hex: '#94A3B8',
  });

  // Payment badges
  assert.deepEqual(getPaymentStatusBadge('paid'), {
    className: 'payment-badge payment-paid',
    label: 'Paid',
  });
  assert.deepEqual(getPaymentStatusBadge('unpaid'), {
    className: 'payment-badge payment-unpaid',
    label: 'Unpaid',
  });
  assert.deepEqual(getPaymentStatusBadge('failed'), {
    className: 'payment-badge payment-failed',
    label: 'Failed',
  });
});
