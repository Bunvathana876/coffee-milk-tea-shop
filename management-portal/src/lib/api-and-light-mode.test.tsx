import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext, type AuthContextValue } from '../auth/authContext';
import { ThemeContext, getStoredTheme, type ThemeContextValue } from '../components/ThemeContext';
import { CustomersPage } from '../pages/CustomersPage';
import { SellersPage } from '../pages/SellersPage';
import { SettingsPage } from '../pages/SettingsPage';
import { PortalLayout } from '../components/PortalLayout';
import { CommandPalette } from '../components/CommandPalette';
import { ApiError, resolveApiUrl } from './api';

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

const mockThemeLight: ThemeContextValue = {
  theme: 'light',
  effectiveTheme: 'light',
  setTheme: () => {},
  density: 'default',
  setDensity: () => {},
  sidebarCollapsed: false,
  setSidebarCollapsed: () => {},
  toggleSidebar: () => {},
  isCommandPaletteOpen: false,
  setIsCommandPaletteOpen: () => {},
  openCommandPalette: () => {},
  closeCommandPalette: () => {},
};

// =============================================================================
// PART A & C: API CONTRACT & ERROR STATE TESTS
// =============================================================================

test('ApiError correctly captures HTTP status code and message', () => {
  const err404 = new ApiError('Route not found: GET /api/admin/customers', 404);
  assert.equal(err404.status, 404);
  assert.equal(err404.message, 'Route not found: GET /api/admin/customers');
  assert.equal(err404.name, 'ApiError');

  const err401 = new ApiError('Authentication credentials were not provided.', 401);
  assert.equal(err401.status, 401);

  const err403 = new ApiError('Administrator access is required.', 403);
  assert.equal(err403.status, 403);

  const err0 = new ApiError('The café API is unavailable. Check that the backend is running.', 0);
  assert.equal(err0.status, 0);
});

test('API URL resolver targets configured Render staging backend in production', () => {
  const prodUrl = resolveApiUrl('/api/admin/customers', {
    envUrl: 'https://brew-boba-cafe-api-staging.onrender.com',
    isProd: true,
  });
  assert.equal(prodUrl, 'https://brew-boba-cafe-api-staging.onrender.com/api/admin/customers');

  const sellerUrl = resolveApiUrl('/api/admin/sellers', {
    envUrl: 'https://brew-boba-cafe-api-staging.onrender.com',
    isProd: true,
  });
  assert.equal(sellerUrl, 'https://brew-boba-cafe-api-staging.onrender.com/api/admin/sellers');
});

test('CustomersPage renders authoritative table headers and does not display mock customer rows', () => {
  const html = renderToStaticMarkup(
    <AuthContext.Provider value={mockAdminAuth}>
      <ThemeContext.Provider value={mockThemeLight}>
        <MemoryRouter initialEntries={['/admin/customers']}>
          <CustomersPage />
        </MemoryRouter>
      </ThemeContext.Provider>
    </AuthContext.Provider>,
  );

  // Verify headers and structure exist
  assert.match(html, /Total Customers/);
  assert.match(html, /Active Accounts/);
  assert.match(html, /Inactive Accounts/);
  assert.match(html, /All Customers/);
  // Verify initial loading skeleton does not output fake customer names
  assert.doesNotMatch(html, /Mock Customer/);
  assert.doesNotMatch(html, /John Doe/);
});

test('SellersPage renders authoritative headers and does not display mock seller rows', () => {
  const html = renderToStaticMarkup(
    <AuthContext.Provider value={mockAdminAuth}>
      <ThemeContext.Provider value={mockThemeLight}>
        <MemoryRouter initialEntries={['/admin/sellers']}>
          <SellersPage />
        </MemoryRouter>
      </ThemeContext.Provider>
    </AuthContext.Provider>,
  );

  assert.match(html, /Total Sellers/);
  assert.match(html, /Active Sellers/);
  assert.match(html, /Inactive Sellers/);
  assert.match(html, /All Sellers/);
  // Verify initial loading skeleton does not output fake seller accounts
  assert.doesNotMatch(html, /Mock Seller/);
  assert.doesNotMatch(html, /Alice Seller/);
});

// =============================================================================
// PART B & C: LIGHT MODE REGRESSION TESTS
// =============================================================================

test('Light Mode Guarantee: getStoredTheme always returns light', () => {
  assert.equal(getStoredTheme(), 'light');
});

test('Light Mode Guarantee: legacy bb_theme=dark or system in localStorage is purged and ignored', () => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const values = new Map<string, string>();
  Object.defineProperty(globalThis, 'window', { configurable: true, value: globalThis });
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    },
  });

  try {
    globalThis.localStorage.setItem('bb_theme', 'dark');
    assert.equal(getStoredTheme(), 'light');
    assert.equal(globalThis.localStorage.getItem('bb_theme'), null);

    globalThis.localStorage.setItem('bb_theme', 'system');
    assert.equal(getStoredTheme(), 'light');
    assert.equal(globalThis.localStorage.getItem('bb_theme'), null);
  } finally {
    if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
    else Reflect.deleteProperty(globalThis, 'window');
    if (originalStorage) Object.defineProperty(globalThis, 'localStorage', originalStorage);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
});

test('Light Mode Guarantee: Top navbar in PortalLayout has no theme toggle button', () => {
  const html = renderToStaticMarkup(
    <AuthContext.Provider value={mockAdminAuth}>
      <ThemeContext.Provider value={mockThemeLight}>
        <MemoryRouter initialEntries={['/admin/dashboard']}>
          <PortalLayout area="admin" />
        </MemoryRouter>
      </ThemeContext.Provider>
    </AuthContext.Provider>,
  );

  // Must have search trigger
  assert.match(html, /topbar-search-trigger/);
  // Must NOT have theme toggle button
  assert.doesNotMatch(html, /theme-toggle-btn/);
  assert.doesNotMatch(html, /Switch to light theme/);
  assert.doesNotMatch(html, /Switch to dark theme/);
});

test('Light Mode Guarantee: SettingsPage has no Dark Mode, System Preference, or theme selector', () => {
  const html = renderToStaticMarkup(
    <AuthContext.Provider value={mockAdminAuth}>
      <ThemeContext.Provider value={mockThemeLight}>
        <MemoryRouter initialEntries={['/admin/settings']}>
          <SettingsPage />
        </MemoryRouter>
      </ThemeContext.Provider>
    </AuthContext.Provider>,
  );

  // Removed theme choices
  assert.doesNotMatch(html, /Dark Mode/);
  assert.doesNotMatch(html, /System Preference/);
  assert.doesNotMatch(html, /Theme &amp; Appearance/);
  assert.doesNotMatch(html, /Deep Ink canvas/);

  // Preserved density and layout controls
  assert.match(html, /Interface Density/);
  assert.match(html, /Compact/);
  assert.match(html, /Default/);
  assert.match(html, /Comfortable/);
  assert.match(html, /Sidebar &amp; Navigation Layout/);
  assert.match(html, /Collapse sidebar by default/);
  assert.match(html, /Local Storage &amp; Session Privacy/);
});

test('Light Mode Guarantee: CommandPalette has no theme toggle command', () => {
  const html = renderToStaticMarkup(
    <ThemeContext.Provider value={{ ...mockThemeLight, isCommandPaletteOpen: true }}>
      <MemoryRouter>
        <CommandPalette />
      </MemoryRouter>
    </ThemeContext.Provider>,
  );

  assert.doesNotMatch(html, /Switch to Dark Theme/);
  assert.doesNotMatch(html, /Switch to Light Theme/);
  assert.doesNotMatch(html, /pref-toggle-theme/);
});
