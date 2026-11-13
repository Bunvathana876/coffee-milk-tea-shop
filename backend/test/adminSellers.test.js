import test from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';
process.env.ENVIRONMENT = 'test';
process.env.ALLOW_IN_MEMORY_DB = 'true';
process.env.DATABASE_URL = 'postgresql://127.0.0.1:1/isolated';

const { startServer } = await import('../src/server.js');
const { createToken } = await import('../src/middleware/auth.js');
const { dbQuery } = await import('../src/db/database.js');

let server;
let baseUrl;
let adminToken;
let staffToken;
let customerToken;

test.before(async () => {
  server = await startServer(0);
  const port = server.address().port;
  baseUrl = `http://localhost:${port}`;

  const adminRes = await dbQuery(
    `
    INSERT INTO staff_users (email, full_name, role, password_hash, is_active)
    VALUES ($1, $2, $3, $4, TRUE)
    RETURNING id
  `,
    ['admin-seller-test@brewboba.com', 'Admin User', 'admin', 'hash'],
  );
  adminToken = createToken({ sub: adminRes.rows[0].id, role: 'admin' });

  const staffRes = await dbQuery(
    `
    INSERT INTO staff_users (email, full_name, role, password_hash, is_active)
    VALUES ($1, $2, $3, $4, TRUE)
    RETURNING id
  `,
    ['staff-seller-test@brewboba.com', 'Staff User', 'staff', 'hash'],
  );
  staffToken = createToken({ sub: staffRes.rows[0].id, role: 'staff' });

  customerToken = createToken({ sub: 999, role: 'customer' });
});

test.after(() => {
  if (server) {
    server.close();
  }
});

async function request(path, options = {}) {
  const url = `${baseUrl}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  const res = await fetch(url, { ...options, headers });
  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await res.json() : await res.text();
  return { status: res.status, data };
}

test('1. Guest is denied access to admin sellers (401)', async () => {
  const res = await request('/api/admin/sellers');
  assert.equal(res.status, 401);
  assert.match(res.data.detail, /credentials/i);
});

test('2. Customer token is forbidden from admin sellers (403)', async () => {
  const res = await request('/api/admin/sellers', {
    headers: { Authorization: `Bearer ${customerToken}` },
  });
  assert.equal(res.status, 403);
});

test('3. General staff token is forbidden from admin sellers (403)', async () => {
  const res = await request('/api/admin/sellers', {
    headers: { Authorization: `Bearer ${staffToken}` },
  });
  assert.equal(res.status, 403);
  assert.match(res.data.detail, /administrator privileges required/i);
});

test('4. Admin is authorized and receives sellers response with configured: false', async () => {
  const res = await request('/api/admin/sellers', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(res.status, 200);
  assert.equal(res.data.configured, false);
  assert.ok(Array.isArray(res.data.items));
  assert.equal(res.data.total, 0);
  assert.deepEqual(res.data.metrics, {
    total_sellers: 0,
    active_sellers: 0,
    inactive_sellers: 0,
  });
  assert.match(res.data.message, /secure seller access is configured/i);
});

test('5. Password hashes and sensitive fields are never returned in seller response', async () => {
  const res = await request('/api/admin/sellers', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(res.status, 200);
  for (const item of res.data.items) {
    assert.equal(item.password_hash, undefined);
    assert.equal(item.password, undefined);
    assert.equal(item.jwt, undefined);
    assert.equal(item.token, undefined);
  }
});

test('6. Seller details endpoint returns 400 for invalid ID', async () => {
  const res = await request('/api/admin/sellers/invalid-id', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(res.status, 400);
  assert.match(res.data.detail, /invalid seller id/i);
});

test('7. Seller details endpoint returns 404 for non-existent seller', async () => {
  const res = await request('/api/admin/sellers/999999', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(res.status, 404);
  assert.match(res.data.detail, /seller not found/i);
});

let createdSellerId;
let createdSellerEmail = 'artisan-seller@brewboba.com';
let createdSellerPassword = 'SecureSellerPass123!';
let sellerToken;

test('8. Admin creates authorized seller account (201)', async () => {
  const res = await request('/api/admin/sellers', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      email: createdSellerEmail,
      full_name: 'Artisan Boba Roaster',
      password: createdSellerPassword,
      is_active: true,
    }),
  });

  assert.equal(res.status, 201);
  assert.ok(res.data.id);
  assert.equal(res.data.email, createdSellerEmail);
  assert.equal(res.data.full_name, 'Artisan Boba Roaster');
  assert.equal(res.data.role, 'seller');
  assert.equal(res.data.is_active, true);
  assert.equal(res.data.password_hash, undefined);
  assert.equal(res.data.password, undefined);

  createdSellerId = res.data.id;
});

test('9. Creating seller with invalid email or short password returns 400', async () => {
  const res1 = await request('/api/admin/sellers', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      email: 'not-an-email',
      full_name: 'Invalid Test',
      password: 'validPassword123!',
    }),
  });
  assert.equal(res1.status, 400);

  const res2 = await request('/api/admin/sellers', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      email: 'test@brewboba.com',
      full_name: 'Valid Name',
      password: 'short',
    }),
  });
  assert.equal(res2.status, 400);
});

test('10. Creating seller with duplicate email returns 409', async () => {
  const res = await request('/api/admin/sellers', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      email: createdSellerEmail,
      full_name: 'Duplicate Seller',
      password: 'Password123!',
    }),
  });
  assert.equal(res.status, 409);
  assert.match(res.data.detail, /already exists/i);
});

test('11. Seller login succeeds with valid credentials (200)', async () => {
  const res = await request('/api/seller/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: createdSellerEmail,
      password: createdSellerPassword,
    }),
  });

  assert.equal(res.status, 200);
  assert.ok(res.data.token);
  assert.equal(res.data.seller.email, createdSellerEmail);
  assert.equal(res.data.seller.role, 'seller');
  assert.equal(res.data.seller.password_hash, undefined);

  sellerToken = res.data.token;
});

test('12. Seller profile (/me) returns authenticated seller profile', async () => {
  const res = await request('/api/seller/auth/me', {
    headers: { Authorization: `Bearer ${sellerToken}` },
  });

  assert.equal(res.status, 200);
  assert.equal(res.data.id, createdSellerId);
  assert.equal(res.data.email, createdSellerEmail);
  assert.equal(res.data.role, 'seller');
  assert.equal(res.data.store_id, null);
  assert.equal(res.data.password_hash, undefined);
});

test('13. Seller login fails with incorrect password (401)', async () => {
  const res = await request('/api/seller/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: createdSellerEmail,
      password: 'WrongPassword999!',
    }),
  });

  assert.equal(res.status, 401);
  assert.match(res.data.detail, /invalid email or password/i);
});

test('14. Admin can update seller profile and password', async () => {
  // 14a. Unauthorized access rejected (401 for guest, 403 for customer, 403 for general staff)
  const guestRes = await request(`/api/admin/sellers/${createdSellerId}`, {
    method: 'PATCH',
    body: JSON.stringify({ full_name: 'Hacker Name' }),
  });
  assert.equal(guestRes.status, 401);

  const customerRes = await request(`/api/admin/sellers/${createdSellerId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${customerToken}` },
    body: JSON.stringify({ full_name: 'Customer Edit' }),
  });
  assert.equal(customerRes.status, 403);

  const staffRes = await request(`/api/admin/sellers/${createdSellerId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${staffToken}` },
    body: JSON.stringify({ full_name: 'Staff Edit' }),
  });
  assert.equal(staffRes.status, 403);

  // 14b. Reject invalid seller ID
  const invalidIdRes = await request('/api/admin/sellers/invalid-id', {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ full_name: 'Valid Name' }),
  });
  assert.equal(invalidIdRes.status, 400);

  const notFoundIdRes = await request('/api/admin/sellers/999999', {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ full_name: 'Valid Name' }),
  });
  assert.equal(notFoundIdRes.status, 404);

  // 14c. Reject unsupported fields (prevent role escalation, email tampering)
  const unsupportedRes = await request(`/api/admin/sellers/${createdSellerId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ role: 'admin' }),
  });
  assert.equal(unsupportedRes.status, 400);
  assert.match(unsupportedRes.data.detail, /unsupported/i);

  // 14d. Reject weak password or short name
  const weakPassRes = await request(`/api/admin/sellers/${createdSellerId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ password: 'short' }),
  });
  assert.equal(weakPassRes.status, 400);

  const shortNameRes = await request(`/api/admin/sellers/${createdSellerId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ full_name: 'A' }),
  });
  assert.equal(shortNameRes.status, 400);

  // 14e. Admin successfully updates seller name
  const nameRes = await request(`/api/admin/sellers/${createdSellerId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      full_name: 'Master Artisan Boba',
    }),
  });

  assert.equal(nameRes.status, 200);
  assert.equal(nameRes.data.full_name, 'Master Artisan Boba');
  assert.equal(nameRes.data.password_hash, undefined);
  assert.equal(nameRes.data.password, undefined);

  // 14f. Admin resets seller password
  const oldPassword = createdSellerPassword;
  const newPassword = 'NewSecureSellerPass2026!';
  const resetRes = await request(`/api/admin/sellers/${createdSellerId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      password: newPassword,
    }),
  });

  assert.equal(resetRes.status, 200);
  assert.equal(resetRes.data.password_hash, undefined);
  assert.equal(resetRes.data.password, undefined);

  // 14g. Old password is now rejected
  const oldLoginRes = await request('/api/seller/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: createdSellerEmail,
      password: oldPassword,
    }),
  });
  assert.equal(oldLoginRes.status, 401);

  // 14h. New password works for seller login
  const newLoginRes = await request('/api/seller/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: createdSellerEmail,
      password: newPassword,
    }),
  });
  assert.equal(newLoginRes.status, 200);
  assert.ok(newLoginRes.data.token);
  // Update token and password for downstream tests
  sellerToken = newLoginRes.data.token;
  createdSellerPassword = newPassword;

  // 14i. Audit logs recorded for the update
  const auditRes = await dbQuery(
    `
    SELECT * FROM security_audit_logs
    WHERE target_id = $1 AND action = 'seller_updated'
  `,
    [createdSellerId],
  );
  assert.ok(auditRes.rows.length >= 1);
});

test('15. Admin deactivates seller account', async () => {
  const res = await request(`/api/admin/sellers/${createdSellerId}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ is_active: false }),
  });

  assert.equal(res.status, 200);
  assert.equal(res.data.is_active, false);
});

test('16. Deactivated seller cannot log in (401)', async () => {
  const res = await request('/api/seller/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: createdSellerEmail,
      password: createdSellerPassword,
    }),
  });

  assert.equal(res.status, 401);
  assert.match(res.data.detail, /inactive/i);
});

test('17. Deactivated seller existing token is rejected by /me (401)', async () => {
  const res = await request('/api/seller/auth/me', {
    headers: { Authorization: `Bearer ${sellerToken}` },
  });

  assert.equal(res.status, 401);
  assert.match(res.data.detail, /inactive/i);
});

test('18. Seller cannot access admin endpoints (403)', async () => {
  // Re-activate seller to obtain a fresh active token
  await request(`/api/admin/sellers/${createdSellerId}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ is_active: true }),
  });

  const loginRes = await request('/api/seller/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: createdSellerEmail,
      password: createdSellerPassword,
    }),
  });
  const activeSellerToken = loginRes.data.token;

  const adminSellersRes = await request('/api/admin/sellers', {
    headers: { Authorization: `Bearer ${activeSellerToken}` },
  });
  assert.equal(adminSellersRes.status, 403);

  const adminDashboardRes = await request('/api/admin/dashboard/summary', {
    headers: { Authorization: `Bearer ${activeSellerToken}` },
  });
  assert.equal(adminDashboardRes.status, 403);

  const adminCustomersRes = await request('/api/admin/customers', {
    headers: { Authorization: `Bearer ${activeSellerToken}` },
  });
  assert.equal(adminCustomersRes.status, 403);
});

test('19. Customer and staff tokens cannot access seller /me endpoint (403)', async () => {
  const customerRes = await request('/api/seller/auth/me', {
    headers: { Authorization: `Bearer ${customerToken}` },
  });
  assert.equal(customerRes.status, 403);

  const staffRes = await request('/api/seller/auth/me', {
    headers: { Authorization: `Bearer ${staffToken}` },
  });
  assert.equal(staffRes.status, 403);
});

test('20. Security audit events are recorded for seller operations', async () => {
  const auditRes = await dbQuery('SELECT * FROM security_audit_logs ORDER BY id DESC');
  assert.ok(auditRes.rows.length >= 3);
  const actions = auditRes.rows.map(r => r.action);
  assert.ok(actions.includes('seller_created'));
  assert.ok(actions.includes('seller_login'));
  assert.ok(actions.includes('seller_deactivated') || actions.includes('seller_activated'));
});
