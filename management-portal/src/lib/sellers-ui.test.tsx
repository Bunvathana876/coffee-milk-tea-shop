import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext, type AuthContextValue } from '../auth/authContext';
import {
  SellersPage,
  AddSellerDrawerForm,
  getInitials,
  formatDate,
  formatDateTime,
  getSellerStatusBadge,
  SellerTableSkeleton,
  SellerArchitectureRoadmap,
} from '../pages/SellersPage';

const mockAdminUser = {
  id: 1,
  email: 'admin@brewboba.com',
  full_name: 'Elena Rostova',
  role: 'admin',
  is_active: true,
};

const mockAuthContext: AuthContextValue = {
  status: 'ready',
  user: mockAdminUser,
  token: 'mock-admin-token-xyz',
  login: async () => {},
  logout: () => {},
};

test('SellersPage getInitials extracts clean uppercase initials from seller names', () => {
  assert.equal(getInitials('Boba Partner'), 'BP');
  assert.equal(getInitials('Artisan'), 'AR');
  assert.equal(getInitials(''), '?');
  assert.equal(getInitials('   '), '?');
  assert.equal(getInitials('Single'), 'SI');
  assert.equal(getInitials('First Middle Last'), 'FL');
});

test('SellersPage formatDate and formatDateTime handle valid, invalid, and empty strings gracefully', () => {
  assert.equal(formatDate(null), 'Never');
  assert.equal(formatDate(undefined), 'Never');
  assert.equal(formatDate(''), 'Never');
  assert.equal(formatDate('invalid-date-string'), 'Invalid date');
  assert.match(formatDate('2026-03-15T10:00:00Z'), /Mar 15, 2026/);

  assert.equal(formatDateTime(null), 'Never');
  assert.equal(formatDateTime('invalid-date-string'), 'Invalid date');
  assert.match(formatDateTime('2026-03-15T10:00:00Z'), /2026/);
});

test('SellersPage getSellerStatusBadge returns distinct active and inactive badge classes', () => {
  const active = getSellerStatusBadge(true);
  assert.equal(active.className, 'status-badge status-completed');
  assert.equal(active.label, 'Active');

  const inactive = getSellerStatusBadge(false);
  assert.equal(inactive.className, 'status-badge status-cancelled');
  assert.equal(inactive.label, 'Inactive');
});

test('SellerTableSkeleton renders accessible structure with proper headers and rows', () => {
  const html = renderToStaticMarkup(<SellerTableSkeleton rows={4} />);
  assert.match(html, /<caption class="sr-only">Loading seller records<\/caption>/);
  assert.match(html, /<th scope="col">Seller<\/th>/);
  assert.match(html, /<th scope="col">Contact<\/th>/);
  assert.match(html, /<th scope="col">Assigned Store<\/th>/);
  assert.match(html, /<th scope="col">Status<\/th>/);
  assert.match(html, /<th scope="col">Joined<\/th>/);
  assert.match(html, /<th scope="col" class="numeric">Actions<\/th>/);

  const rows = html.match(/class="skeleton-row"/g) || [];
  assert.equal(rows.length, 4);
});

test('SellerArchitectureRoadmap renders the 4 multi-tenant prerequisites', () => {
  const html = renderToStaticMarkup(<SellerArchitectureRoadmap />);
  assert.match(html, /Multi-Store Seller Architecture Roadmap/);
  assert.match(html, /Prerequisites required before onboarding independent café store sellers/);
  assert.match(html, /1\. Store Registry &amp; Ownership Schema/);
  assert.match(html, /2\. Multi-Tenant Seller Roles &amp; Membership/);
  assert.match(html, /3\. Store-Scoped Data Isolation/);
  assert.match(html, /4\. Dedicated Seller Portal Entry &amp; Auth/);
  assert.match(html, /Security Gated/);
});

test('SellersPage renders heading, subtitle, statistic cards, and search toolbar', () => {
  const html = renderToStaticMarkup(
    <AuthContext.Provider value={mockAuthContext}>
      <MemoryRouter initialEntries={['/admin/sellers']}>
        <SellersPage />
      </MemoryRouter>
    </AuthContext.Provider>,
  );

  // Title and subtitle
  assert.match(html, /MULTI-STORE MANAGEMENT/);
  assert.match(html, /Seller Management/);
  assert.match(html, /Manage your café seller accounts and their access\./);

  // Top action: Planned Invite Seller button (disabled)
  assert.match(html, /Invite Seller/);
  assert.match(html, /Planned/);

  // 3 Metric Cards (Total Sellers, Active Sellers, Inactive Sellers)
  assert.match(html, /Total Sellers/);
  assert.match(html, /Active Sellers/);
  assert.match(html, /Inactive Sellers/);

  // Search & Filter Tabs
  assert.match(html, /role="tablist"/);
  assert.match(html, /All Sellers/);
  assert.match(html, /Active/);
  assert.match(html, /Inactive/);
  assert.match(html, /placeholder="Search sellers by name or email…"/);

  // Initial loading state skeleton
  assert.match(html, /Loading seller records/);
});

test('SellersPage renders Add Seller button for administrative account creation', () => {
  const html = renderToStaticMarkup(
    <AuthContext.Provider value={mockAuthContext}>
      <MemoryRouter initialEntries={['/admin/sellers']}>
        <SellersPage />
      </MemoryRouter>
    </AuthContext.Provider>,
  );

  assert.match(html, /Add Seller/);
  assert.match(html, /Server Verified RBAC/);
});

test('AddSellerDrawerForm renders accessible form-label and form-helper-text in Add Seller drawer', () => {
  const html = renderToStaticMarkup(
    <AddSellerDrawerForm
      name=""
      setName={() => {}}
      email=""
      setEmail={() => {}}
      password=""
      setPassword={() => {}}
      storeId=""
      setStoreId={() => {}}
      active={true}
      setActive={() => {}}
      stores={[]}
      onSubmit={() => {}}
    />,
  );

  // Verify form labels have explicit form-label class
  assert.match(html, /class="form-label[^"]*"[^>]*for="add-name">[\s\S]*?Full Name \*/);
  assert.match(html, /class="form-label[^"]*"[^>]*for="add-email">[\s\S]*?Work Email Address \*/);
  assert.match(html, /class="form-label[^"]*"[^>]*for="add-password">[\s\S]*?Initial Password \*/);
  assert.match(
    html,
    /class="form-label[^"]*"[^>]*for="add-store">[\s\S]*?Assigned Store \(Multi-Tenant\)/,
  );
  assert.match(html, /class="form-checkbox-label"/);
  assert.match(html, /class="form-helper-text"/);
});
