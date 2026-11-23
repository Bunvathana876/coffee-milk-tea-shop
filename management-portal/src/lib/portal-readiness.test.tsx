import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext, type AuthContextValue } from '../auth/authContext';
import { ConfirmAction } from '../components/ConfirmAction';
import { CommandPalette } from '../components/CommandPalette';
import { ThemeContext, type ThemeContextValue } from '../components/ThemeContext';
import { ToastProvider } from '../components/ToastContext';
import { OperationsCenterPanel } from '../pages/AdminDashboard';
import { AnalyticsPage, buildSalesReportCsv } from '../pages/AnalyticsPage';
import { LoginPage } from '../pages/LoginPage';
import { OrdersPage } from '../pages/OrdersPage';
import { RoleControllerPage } from '../pages/RoleControllerPage';

const mockAdminAuth: AuthContextValue = {
  status: 'ready',
  token: 'mock-valid-admin-token',
  user: {
    id: 1,
    email: 'admin@brewboba.com',
    full_name: 'Elena Rostova',
    role: 'admin',
    is_active: true,
  },
  login: async () => {},
  logout: () => {},
};

const mockGuestAuth: AuthContextValue = {
  status: 'guest',
  token: null,
  user: null,
  login: async () => {},
  logout: () => {},
};

const mockThemeOpenPalette: ThemeContextValue = {
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

test('ConfirmAction renders explicit type="button" on Cancel and Confirm buttons', () => {
  const html = renderToStaticMarkup(
    <ConfirmAction
      title="Confirm action?"
      detail="Detail"
      busy={false}
      tone="danger"
      confirmLabel="Delete Store"
      onCancel={() => {}}
      onConfirm={() => {}}
    />,
  );
  const buttonMatches = html.match(/<button type="button"/g) || [];
  assert.equal(buttonMatches.length, 2);
  assert.match(html, /Delete Store/);
  assert.match(html, /button-danger/);
});

test('OrdersPage honors ?view=kds URL parameter and renders accessible <search> landmark', () => {
  const html = renderToStaticMarkup(
    <AuthContext.Provider value={mockAdminAuth}>
      <MemoryRouter initialEntries={['/admin/orders?view=kds']}>
        <OrdersPage />
      </MemoryRouter>
    </AuthContext.Provider>,
  );

  assert.match(html, /<search class="page-toolbar orders-toolbar">/);
  assert.match(html, /Kitchen Board \(KDS\)/);
  assert.match(html, /Auto-Refresh: ON/);
});

test('AnalyticsPage renders date range presets and builds safe escaped CSV reports', () => {
  const html = renderToStaticMarkup(
    <AuthContext.Provider value={mockAdminAuth}>
      <MemoryRouter initialEntries={['/admin/analytics']}>
        <AnalyticsPage />
      </MemoryRouter>
    </AuthContext.Provider>,
  );

  assert.match(html, /All Time/);
  assert.match(html, /Today/);
  assert.match(html, /Last 7 Days/);
  assert.match(html, /Last 30 Days/);
  assert.match(html, /Custom/);

  const csv = buildSalesReportCsv({
    date_from: '2026-11-01',
    date_to: '2026-11-21',
    total_orders: 4,
    total_revenue_usd: 15.5,
    total_revenue_khr: 63550,
    status_breakdown: [
      {
        status: 'completed',
        order_count: 3,
        total_usd: 15.5,
        total_khr: 63550,
        recognized_revenue_usd: 15.5,
        recognized_revenue_khr: 63550,
      },
      {
        status: '=CMD("calc")',
        order_count: 1,
        total_usd: 4.0,
        total_khr: 16400,
        recognized_revenue_usd: 0,
        recognized_revenue_khr: 0,
      },
    ],
  });

  assert.match(csv, /Summary,Total Orders,4/);
  assert.match(csv, /Summary,Recognized Revenue \(USD\),15\.50/);
  assert.match(csv, /completed,3,75,15\.50,63550,15\.50,63550/);
  assert.match(csv, /"'=CMD\(""calc""\)"/);
});

test('RoleControllerPage renders Staff & Administrator Accounts CRUD and Add Store trigger', () => {
  const html = renderToStaticMarkup(
    <AuthContext.Provider value={mockAdminAuth}>
      <MemoryRouter initialEntries={['/admin/role-controller']}>
        <RoleControllerPage />
      </MemoryRouter>
    </AuthContext.Provider>,
  );

  assert.match(html, /Staff &amp; Administrator Accounts/);
  assert.match(html, /Add Staff \/ Admin/);
  assert.match(html, /Add Store/);
});

test('ToastProvider renders accessible Notifications region and live announcement containers', () => {
  const html = renderToStaticMarkup(
    <ToastProvider>
      <div>Portal content</div>
    </ToastProvider>,
  );

  assert.match(html, /role="region"/);
  assert.match(html, /aria-label="Notifications"/);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /aria-live="assertive"/);
});

test('LoginPage renders accessible password toggle state and form autofill attributes', () => {
  const html = renderToStaticMarkup(
    <AuthContext.Provider value={mockGuestAuth}>
      <MemoryRouter initialEntries={['/login']}>
        <LoginPage />
      </MemoryRouter>
    </AuthContext.Provider>,
  );

  assert.match(html, /autoComplete="username"|autocomplete="username"/i);
  assert.match(html, /autoComplete="current-password"|autocomplete="current-password"/i);
  assert.match(html, /aria-pressed="false"/);
  assert.match(html, /aria-label="Show password"/);
});

test('CommandPalette and OperationsCenterPanel expose direct Kitchen Board (KDS) navigation', () => {
  const paletteHtml = renderToStaticMarkup(
    <ThemeContext.Provider value={mockThemeOpenPalette}>
      <MemoryRouter>
        <CommandPalette />
      </MemoryRouter>
    </ThemeContext.Provider>,
  );
  assert.match(paletteHtml, /Kitchen Board \(KDS\)/);

  const opsHtml = renderToStaticMarkup(
    <MemoryRouter>
      <OperationsCenterPanel
        pendingOrders={0}
        statusCounts={{ pending: 0, preparing: 0, ready: 0, completed: 0, cancelled: 0 }}
      />
    </MemoryRouter>,
  );
  assert.match(opsHtml, /href="\/admin\/orders\?view=kds"/);
  assert.match(opsHtml, /Open Kitchen Board/);
});
