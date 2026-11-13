import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthContext, type AuthContextValue } from '../auth/authContext';
import { PortalLayout } from '../components/PortalLayout';
import { RoleGate } from '../components/RoleGate';
import {
  RoleControllerPage,
  PERMISSION_MATRIX,
  getPermissionBadge,
} from '../pages/RoleControllerPage';

const mockAdminUser = {
  id: 1,
  email: 'admin@brewboba.com',
  full_name: 'Elena Rostova',
  role: 'admin',
  is_active: true,
};

const mockStaffUser = {
  id: 2,
  email: 'staff@brewboba.com',
  full_name: 'Staff Operator',
  role: 'staff',
  is_active: true,
};

const mockSellerUser = {
  id: 3,
  email: 'seller@brewboba.com',
  full_name: 'Seller Partner',
  role: 'seller',
  is_active: true,
};

const mockAdminAuthContext: AuthContextValue = {
  status: 'ready',
  user: mockAdminUser,
  token: 'mock-admin-token-xyz',
  login: async () => {},
  logout: () => {},
};

const mockStaffAuthContext: AuthContextValue = {
  status: 'ready',
  user: mockStaffUser,
  token: 'mock-staff-token-xyz',
  login: async () => {},
  logout: () => {},
};

const mockSellerAuthContext: AuthContextValue = {
  status: 'ready',
  user: mockSellerUser,
  token: 'mock-seller-token-xyz',
  login: async () => {},
  logout: () => {},
};

test('getPermissionBadge maps allowed, scoped, denied, and not_implemented correctly', () => {
  const allowed = getPermissionBadge('allowed');
  assert.equal(allowed.label, 'Allowed');
  assert.match(allowed.className, /bg-emerald/);
  assert.match(allowed.className, /permission-badge-allowed/);
  assert.match(allowed.className, /text-emerald-800/);
  assert.ok(allowed.icon);

  const scoped = getPermissionBadge('scoped');
  assert.equal(scoped.label, 'Store-scoped');
  assert.match(scoped.className, /bg-blue/);
  assert.match(scoped.className, /permission-badge-scoped/);
  assert.match(scoped.className, /text-blue-800/);
  assert.ok(scoped.icon);

  const denied = getPermissionBadge('denied');
  assert.equal(denied.label, 'Denied');
  assert.match(denied.className, /bg-red/);
  assert.match(denied.className, /permission-badge-denied/);
  assert.match(denied.className, /text-red-800/);
  assert.ok(denied.icon);

  const notImplemented = getPermissionBadge('not_implemented');
  assert.equal(notImplemented.label, 'Not Implemented');
  assert.match(notImplemented.className, /bg-slate/);
  assert.match(notImplemented.className, /permission-badge-not-implemented/);
  assert.match(notImplemented.className, /text-slate-700/);
  assert.ok(notImplemented.icon);
});

test('PERMISSION_MATRIX defines all 11 required authorization policies', () => {
  assert.equal(PERMISSION_MATRIX.length, 11);

  const ids = PERMISSION_MATRIX.map(r => r.id);
  assert.ok(ids.includes('admin_dashboard'));
  assert.ok(ids.includes('manage_sellers'));
  assert.ok(ids.includes('toggle_seller_status'));
  assert.ok(ids.includes('assign_stores'));
  assert.ok(ids.includes('view_global_orders'));
  assert.ok(ids.includes('view_store_orders'));
  assert.ok(ids.includes('manage_catalog'));
  assert.ok(ids.includes('access_customers'));
  assert.ok(ids.includes('view_analytics'));
  assert.ok(ids.includes('record_settlement'));
  assert.ok(ids.includes('manage_staff'));

  // Verify key invariants
  const storeOrders = PERMISSION_MATRIX.find(r => r.id === 'view_store_orders');
  assert.equal(storeOrders?.seller, 'scoped');

  const globalOrders = PERMISSION_MATRIX.find(r => r.id === 'view_global_orders');
  assert.equal(globalOrders?.seller, 'denied');
  assert.equal(globalOrders?.staff, 'allowed');

  const settlements = PERMISSION_MATRIX.find(r => r.id === 'record_settlement');
  assert.equal(settlements?.seller, 'denied');
  assert.equal(settlements?.staff, 'allowed');
});

test('PortalLayout renders ACCESS & SECURITY navigation section with Role Controller for administrators', () => {
  const html = renderToStaticMarkup(
    <AuthContext.Provider value={mockAdminAuthContext}>
      <MemoryRouter initialEntries={['/admin/role-controller']}>
        <PortalLayout area="admin" />
      </MemoryRouter>
    </AuthContext.Provider>,
  );

  // Verify group caption
  assert.match(html, /ACCESS &amp; SECURITY|ACCESS &amp;amp; SECURITY|ACCESS &amp; SECURITY/);

  // Verify Role Controller navigation link
  assert.match(html, /href="\/admin\/role-controller"/);
  assert.match(html, /Role Controller/);

  // Verify active class on current route
  assert.match(html, /class="nav-link active" href="\/admin\/role-controller"/);

  // Verify other links remain present
  assert.match(html, /href="\/admin\/dashboard"/);
  assert.match(html, /href="\/admin\/orders"/);
  assert.match(html, /href="\/admin\/products"/);
  assert.match(html, /href="\/admin\/categories"/);
  assert.match(html, /href="\/admin\/customers"/);
  assert.match(html, /href="\/admin\/sellers"/);
  assert.match(html, /href="\/admin\/analytics"/);
  assert.match(html, /href="\/admin\/settings"/);
});

test('RoleGate protects /admin/role-controller and rejects staff and seller roles', () => {
  function renderGuardedRoute(context: AuthContextValue) {
    return renderToStaticMarkup(
      <AuthContext.Provider value={context}>
        <MemoryRouter initialEntries={['/admin/role-controller']}>
          <Routes>
            <Route element={<RoleGate area="admin" />}>
              <Route
                path="/admin/role-controller"
                element={<div>Authoritative Role Controller Page</div>}
              />
            </Route>
            <Route path="/access-denied" element={<div>Access Denied Page</div>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    );
  }

  // Admin allowed
  const adminHtml = renderGuardedRoute(mockAdminAuthContext);
  assert.match(adminHtml, /Authoritative Role Controller Page/);

  // Staff denied
  const staffHtml = renderGuardedRoute(mockStaffAuthContext);
  assert.doesNotMatch(staffHtml, /Authoritative Role Controller Page/);

  // Seller denied
  const sellerHtml = renderGuardedRoute(mockSellerAuthContext);
  assert.doesNotMatch(sellerHtml, /Authoritative Role Controller Page/);
});

test('RoleControllerPage renders page heading, eyebrow, subtitle, and live server pill', () => {
  const html = renderToStaticMarkup(
    <AuthContext.Provider value={mockAdminAuthContext}>
      <MemoryRouter initialEntries={['/admin/role-controller']}>
        <RoleControllerPage />
      </MemoryRouter>
    </AuthContext.Provider>,
  );

  assert.match(html, /ACCESS &amp; SECURITY/);
  assert.match(html, /Role Controller/);
  assert.match(html, /Manage role access, seller accounts, and store permissions\./);
  assert.match(html, /Server Verified RBAC/);
  assert.match(html, /Manage Sellers/);
});

test('RoleControllerPage renders the 3 role overview cards with proper labels and verified descriptions', () => {
  const html = renderToStaticMarkup(
    <AuthContext.Provider value={mockAdminAuthContext}>
      <MemoryRouter initialEntries={['/admin/role-controller']}>
        <RoleControllerPage />
      </MemoryRouter>
    </AuthContext.Provider>,
  );

  // Card 1: Administrators
  assert.match(html, /Administrators/);
  assert.match(html, /Full Governance &amp; Security Authority/);

  // Card 2: Staff Members
  assert.match(html, /Staff Members/);
  assert.match(html, /In-Store Operations &amp; Cash Settlement/);

  // Card 3: Seller Partners
  assert.match(html, /Seller Partners/);
  assert.match(html, /Store-Scoped Read-Only Isolation/);
});

test('RoleControllerPage renders Permission Matrix with all column headers and policy note', () => {
  const html = renderToStaticMarkup(
    <AuthContext.Provider value={mockAdminAuthContext}>
      <MemoryRouter initialEntries={['/admin/role-controller']}>
        <RoleControllerPage />
      </MemoryRouter>
    </AuthContext.Provider>,
  );

  assert.match(html, /Role &amp; Permission Policy Matrix/);
  assert.match(html, /Permission \/ Capability/);
  assert.match(html, /Administrator/);
  assert.match(html, /Staff/);
  assert.match(html, /Seller Partner/);
  assert.match(html, /Access Administrator Dashboard/);
  assert.match(html, /Manage Seller Accounts &amp; Credentials/);
  assert.match(html, /Record In-Person Cash Settlements/);
  assert.match(html, /Policy Lockdown Note:/);
});

test('RoleControllerPage renders Seller Access Management and Store Registry sections', () => {
  const html = renderToStaticMarkup(
    <AuthContext.Provider value={mockAdminAuthContext}>
      <MemoryRouter initialEntries={['/admin/role-controller']}>
        <RoleControllerPage />
      </MemoryRouter>
    </AuthContext.Provider>,
  );

  assert.match(html, /Seller Account Access &amp; Status/);
  assert.match(html, /Café Store Registry &amp; Assignment Status/);
  assert.match(html, /Security Audit Logging Architecture/);
});

test('RoleControllerPage preserves accessible semantic heading hierarchy and readable table structures', () => {
  const html = renderToStaticMarkup(
    <AuthContext.Provider value={mockAdminAuthContext}>
      <MemoryRouter initialEntries={['/admin/role-controller']}>
        <RoleControllerPage />
      </MemoryRouter>
    </AuthContext.Provider>,
  );

  // Verify h1 presence
  assert.match(html, /<h1[^>]*>[\s\S]*?Role Controller[\s\S]*?<\/h1>/);

  // Verify all 4 major h2 section headings
  assert.match(
    html,
    /<h2 id="role-overview-heading"[^>]*>[\s\S]*?System Roles Overview[\s\S]*?<\/h2>/,
  );
  assert.match(
    html,
    /<h2 id="permission-matrix-heading"[^>]*>[\s\S]*?Role &amp; Permission Policy Matrix[\s\S]*?<\/h2>/,
  );
  assert.match(
    html,
    /<h2 id="seller-access-heading"[^>]*>[\s\S]*?Seller Account Access &amp; Status[\s\S]*?<\/h2>/,
  );
  assert.match(
    html,
    /<h2 id="store-access-heading"[^>]*>[\s\S]*?Café Store Registry &amp; Assignment Status[\s\S]*?<\/h2>/,
  );

  // Verify table accessibility with scope="col"
  assert.match(html, /<th scope="col"[^>]*>Permission \/ Capability<\/th>/);
  assert.match(html, /<th scope="col"[^>]*>Administrator<\/th>/);
  assert.match(html, /<th scope="col"[^>]*>Staff<\/th>/);
  assert.match(html, /<th scope="col"[^>]*>Seller Partner<\/th>/);

  // Verify permission badge class application in static render
  assert.match(html, /permission-badge permission-badge-allowed/);
  assert.match(html, /permission-badge permission-badge-scoped/);
  assert.match(html, /permission-badge permission-badge-denied/);
});

test('RoleControllerPage applies high-contrast semantic classes to matrix title and role subtitles', () => {
  const html = renderToStaticMarkup(
    <AuthContext.Provider value={mockAdminAuthContext}>
      <MemoryRouter initialEntries={['/admin/role-controller']}>
        <RoleControllerPage />
      </MemoryRouter>
    </AuthContext.Provider>,
  );

  assert.match(html, /class="[^"]*matrix-title[^"]*"/);
  assert.match(html, /class="[^"]*matrix-subtitle[^"]*"/);
  assert.match(html, /class="[^"]*role-card-subtitle admin[^"]*"/);
  assert.match(html, /class="[^"]*role-card-subtitle staff[^"]*"/);
  assert.match(html, /class="[^"]*role-card-subtitle seller[^"]*"/);
});
