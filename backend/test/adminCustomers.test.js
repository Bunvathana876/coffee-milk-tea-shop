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

  // Ensure staff accounts exist in memory db
  const adminRes = await dbQuery(`
    INSERT INTO staff_users (email, full_name, role, password_hash, is_active)
    VALUES ($1, $2, $3, $4, TRUE)
    RETURNING id
  `, ['admin-test@brewboba.com', 'Admin User', 'admin', 'hash']);
  adminToken = createToken({ sub: adminRes.rows[0].id, role: 'admin' });

  const staffRes = await dbQuery(`
    INSERT INTO staff_users (email, full_name, role, password_hash, is_active)
    VALUES ($1, $2, $3, $4, TRUE)
    RETURNING id
  `, ['staff-test@brewboba.com', 'Staff User', 'staff', 'hash']);
  staffToken = createToken({ sub: staffRes.rows[0].id, role: 'staff' });

  customerToken = createToken({ sub: 999, role: 'customer' });

  // Insert two test customers
  await dbQuery(`
    INSERT INTO customer_users (full_name, phone, email, password_hash, loyalty_stamps, is_active, last_login_at)
    VALUES ($1, $2, $3, $4, 0, TRUE, CURRENT_TIMESTAMP)
  `, ['Alice Boba', '012345678', 'alice@example.com', 'supersecretpasswordhash']);

  await dbQuery(`
    INSERT INTO customer_users (full_name, phone, email, password_hash, loyalty_stamps, is_active, last_login_at)
    VALUES ($1, $2, $3, $4, 0, TRUE, CURRENT_TIMESTAMP)
  `, ['Bob Milk', '098765432', 'bob@example.com', 'anotherpasswordhash']);
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

test('1. Guest is denied access to admin customers (401)', async () => {
  const res = await request('/api/admin/customers');
  assert.equal(res.status, 401);
  assert.match(res.data.detail, /credentials/i);
});

test('2. Customer token is forbidden from admin customers (403)', async () => {
  const res = await request('/api/admin/customers', {
    headers: { Authorization: `Bearer ${customerToken}` },
  });
  assert.equal(res.status, 403);
});

test('3. General staff token is forbidden from admin customers (403)', async () => {
  const res = await request('/api/admin/customers', {
    headers: { Authorization: `Bearer ${staffToken}` },
  });
  assert.equal(res.status, 403);
  assert.match(res.data.detail, /administrator privileges required/i);
});

test('4. Admin is authorized and receives customers list with metrics', async () => {
  const res = await request('/api/admin/customers', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.data.items));
  assert.ok(res.data.total >= 2);
  assert.ok(res.data.metrics);
  assert.ok(res.data.metrics.total_customers >= 2);

  const alice = res.data.items.find(c => c.email === 'alice@example.com');
  assert.ok(alice);
  assert.equal(alice.full_name, 'Alice Boba');
  assert.equal(alice.phone, '012345678');
  assert.equal(alice.is_active, true);
});

test('5. Password hashes and sensitive fields are never returned in customer responses', async () => {
  const res = await request('/api/admin/customers', {
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

test('6. Filter by active and inactive customers works as expected', async () => {
  const resActive = await request('/api/admin/customers?status=active', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(resActive.status, 200);
  assert.ok(resActive.data.items.every(c => c.is_active === true));

  const resInactive = await request('/api/admin/customers?status=inactive', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(resInactive.status, 200);
  assert.ok(resInactive.data.items.every(c => c.is_active === false));
});

test('7. Search by customer name, email, or phone returns matching results', async () => {
  const res = await request('/api/admin/customers?search=Alice', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(res.status, 200);
  assert.equal(res.data.items.length, 1);
  assert.equal(res.data.items[0].full_name, 'Alice Boba');
});

test('8. Customer details endpoint returns 400 for invalid ID', async () => {
  const res = await request('/api/admin/customers/invalid-id', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(res.status, 400);
  assert.match(res.data.detail, /invalid customer id/i);
});

test('9. Customer details endpoint returns 404 for non-existent customer', async () => {
  const res = await request('/api/admin/customers/999999', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(res.status, 404);
  assert.match(res.data.detail, /customer account not found/i);
});

test('10. Customer details endpoint returns permitted fields for valid customer', async () => {
  // Get an existing customer id
  const listRes = await request('/api/admin/customers', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const firstId = listRes.data.items[0].id;

  const res = await request(`/api/admin/customers/${firstId}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(res.status, 200);
  assert.equal(res.data.id, firstId);
  assert.ok(res.data.full_name);
  assert.ok(res.data.phone);
  assert.equal(typeof res.data.is_active, 'boolean');
  assert.equal(typeof res.data.loyalty_stamps, 'number');
  assert.equal(typeof res.data.total_orders, 'number');
  assert.equal(typeof res.data.total_spent_usd, 'number');
  assert.equal(res.data.password_hash, undefined);
});
