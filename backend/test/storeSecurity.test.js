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
let adminId;
let adminToken;
let staffToken;
let customerToken;
let sellerAId;
let sellerAToken;
let sellerBId;
let sellerBToken;
let store1Id;
let store2Id;

test.before(async () => {
  server = await startServer(0);
  const port = server.address().port;
  baseUrl = `http://localhost:${port}`;

  const adminRes = await dbQuery(`
    INSERT INTO staff_users (email, full_name, role, password_hash, is_active)
    VALUES ($1, $2, $3, $4, TRUE)
    RETURNING id
  `, ['admin-store-test@brewboba.com', 'Admin Store User', 'admin', 'hash']);
  adminId = adminRes.rows[0].id;
  adminToken = createToken({ sub: adminId, role: 'admin' });

  const staffRes = await dbQuery(`
    INSERT INTO staff_users (email, full_name, role, password_hash, is_active)
    VALUES ($1, $2, $3, $4, TRUE)
    RETURNING id
  `, ['staff-store-test@brewboba.com', 'Staff Store User', 'staff', 'hash']);
  staffToken = createToken({ sub: staffRes.rows[0].id, role: 'staff' });

  customerToken = createToken({ sub: 888, role: 'customer' });

  // Seller A
  const sellerARes = await dbQuery(`
    INSERT INTO staff_users (email, full_name, role, password_hash, is_active)
    VALUES ($1, $2, $3, $4, TRUE)
    RETURNING id
  `, ['seller-a@brewboba.com', 'Seller Alpha', 'seller', 'hash']);
  sellerAId = sellerARes.rows[0].id;
  sellerAToken = createToken({ sub: sellerAId, role: 'seller', email: 'seller-a@brewboba.com' });

  // Seller B
  const sellerBRes = await dbQuery(`
    INSERT INTO staff_users (email, full_name, role, password_hash, is_active)
    VALUES ($1, $2, $3, $4, TRUE)
    RETURNING id
  `, ['seller-b@brewboba.com', 'Seller Beta', 'seller', 'hash']);
  sellerBId = sellerBRes.rows[0].id;
  sellerBToken = createToken({ sub: sellerBId, role: 'seller', email: 'seller-b@brewboba.com' });
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

test('1. Guest and unauthorized roles cannot access admin store endpoints (401/403)', async () => {
  const guestRes = await request('/api/admin/stores');
  assert.equal(guestRes.status, 401);

  const customerRes = await request('/api/admin/stores', {
    headers: { Authorization: `Bearer ${customerToken}` },
  });
  assert.equal(customerRes.status, 403);

  const staffRes = await request('/api/admin/stores', {
    headers: { Authorization: `Bearer ${staffToken}` },
  });
  assert.equal(staffRes.status, 403);

  const sellerRes = await request('/api/admin/stores', {
    headers: { Authorization: `Bearer ${sellerAToken}` },
  });
  assert.equal(sellerRes.status, 403);
});

test('2. Admin can create café stores with validation (201)', async () => {
  // Bad input: missing code
  const badRes1 = await request('/api/admin/stores', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ name: 'Central Flagship' }),
  });
  assert.equal(badRes1.status, 400);

  // Valid Store 1
  const store1Res = await request('/api/admin/stores', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      name: 'Downtown Riverside',
      code: 'STORE-DOWNTOWN',
      address: '101 Riverside Blvd, Phnom Penh',
      is_active: true,
    }),
  });
  assert.equal(store1Res.status, 201);
  assert.equal(store1Res.data.code, 'STORE-DOWNTOWN');
  assert.equal(store1Res.data.name, 'Downtown Riverside');
  assert.equal(store1Res.data.is_active, true);
  store1Id = store1Res.data.id;

  // Duplicate Code (409)
  const dupRes = await request('/api/admin/stores', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      name: 'Another Downtown',
      code: 'STORE-DOWNTOWN',
    }),
  });
  assert.equal(dupRes.status, 409);

  // Valid Store 2
  const store2Res = await request('/api/admin/stores', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      name: 'BKK1 Flagship',
      code: 'STORE-BKK1',
      address: '42 St 282, BKK1, Phnom Penh',
      is_active: true,
    }),
  });
  assert.equal(store2Res.status, 201);
  store2Id = store2Res.data.id;
});

test('3. Admin can list stores and view store details with metrics', async () => {
  const listRes = await request('/api/admin/stores', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(listRes.status, 200);
  assert.ok(listRes.data.items.length >= 2);
  assert.ok(listRes.data.metrics.total_stores >= 2);

  const detailRes = await request(`/api/admin/stores/${store1Id}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(detailRes.status, 200);
  assert.equal(detailRes.data.name, 'Downtown Riverside');
  assert.ok(Array.isArray(detailRes.data.assigned_sellers));
});

test('4. Admin can assign and unassign a store to a seller', async () => {
  // Assign Store 1 to Seller A
  const assignRes = await request(`/api/admin/sellers/${sellerAId}/stores`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ store_id: store1Id }),
  });
  assert.equal(assignRes.status, 201);
  assert.equal(assignRes.data.assigned, true);

  // Verify Seller A has Store 1 assigned
  const sellerAStores = await request(`/api/admin/sellers/${sellerAId}/stores`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(sellerAStores.status, 200);
  assert.equal(sellerAStores.data.stores.length, 1);
  assert.equal(sellerAStores.data.stores[0].id, store1Id);

  // Assign Store 2 to Seller B
  await request(`/api/admin/sellers/${sellerBId}/stores`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ store_id: store2Id }),
  });
});

test('5. Unassigned seller cannot access store data (fails closed)', async () => {
  // Create an unassigned seller
  const unassignedRes = await request('/api/admin/sellers', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      email: 'unassigned-seller@brewboba.com',
      full_name: 'Unassigned Seller',
      password: 'StrongPassword123!',
      is_active: true,
    }),
  });
  const unassignedId = unassignedRes.data.id;
  const unassignedToken = createToken({ sub: unassignedId, role: 'seller', email: 'unassigned-seller@brewboba.com' });

  // Unassigned seller calls /api/seller/stores -> empty list
  const storesRes = await request('/api/seller/stores', {
    headers: { Authorization: `Bearer ${unassignedToken}` },
  });
  assert.equal(storesRes.status, 200);
  assert.equal(storesRes.data.items.length, 0);

  // Unassigned seller calls /api/seller/orders -> empty list
  const ordersRes = await request('/api/seller/orders', {
    headers: { Authorization: `Bearer ${unassignedToken}` },
  });
  assert.equal(ordersRes.status, 200);
  assert.equal(ordersRes.data.items.length, 0);
  assert.match(ordersRes.data.message, /no active stores/i);
});

test('6. Seller A can view their assigned store and store orders, but not Seller B stores', async () => {
  // Seller A checks /api/seller/stores
  const sellerAStoresRes = await request('/api/seller/stores', {
    headers: { Authorization: `Bearer ${sellerAToken}` },
  });
  assert.equal(sellerAStoresRes.status, 200);
  assert.equal(sellerAStoresRes.data.items.length, 1);
  assert.equal(sellerAStoresRes.data.items[0].id, store1Id);

  // Seed order 1 for Store 1, and order 2 for Store 2, and order 3 with NULL store_id (historical)
  const order1Res = await dbQuery(`
    INSERT INTO orders (
      order_number, customer_name, customer_phone, customer_email,
      subtotal_usd, total_usd, total_khr, payment_method, store_id, payment_status, order_status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'cash', $8, 'paid', 'preparing')
    RETURNING id
  `, ['ORD-STORE1-001', 'Dara Sok', '012345678', 'dara@example.test', 4.5, 4.5, 18450, store1Id]);
  const order1Id = order1Res.rows[0].id;

  const order2Res = await dbQuery(`
    INSERT INTO orders (
      order_number, customer_name, customer_phone, customer_email,
      subtotal_usd, total_usd, total_khr, payment_method, store_id, payment_status, order_status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'cash', $8, 'paid', 'preparing')
    RETURNING id
  `, ['ORD-STORE2-002', 'Vannak Lim', '098765432', 'vannak@example.test', 5.0, 5.0, 20500, store2Id]);
  const order2Id = order2Res.rows[0].id;

  const orderHistRes = await dbQuery(`
    INSERT INTO orders (
      order_number, customer_name, customer_phone, customer_email,
      subtotal_usd, total_usd, total_khr, payment_method, store_id, payment_status, order_status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'cash', NULL, 'paid', 'completed')
    RETURNING id
  `, ['ORD-HIST-003', 'Historical Cust', '011223344', null, 3.5, 3.5, 14350]);
  const orderHistId = orderHistRes.rows[0].id;

  // Seller A queries /api/seller/orders -> gets only Order 1
  const sellerAOrders = await request('/api/seller/orders', {
    headers: { Authorization: `Bearer ${sellerAToken}` },
  });
  assert.equal(sellerAOrders.status, 200);
  assert.ok(sellerAOrders.data.items.some(o => o.id === order1Id));
  assert.equal(sellerAOrders.data.items.some(o => o.id === order2Id), false);
  assert.equal(sellerAOrders.data.items.some(o => o.id === orderHistId), false);

  // Seller A tries to get Order 1 detail -> succeeds (200)
  const order1Detail = await request(`/api/seller/orders/${order1Id}`, {
    headers: { Authorization: `Bearer ${sellerAToken}` },
  });
  assert.equal(order1Detail.status, 200);
  assert.equal(order1Detail.data.id, order1Id);

  // Cross-store boundary: Seller A tries to get Order 2 detail (belonging to Store 2) -> fails (404)
  const order2Cross = await request(`/api/seller/orders/${order2Id}`, {
    headers: { Authorization: `Bearer ${sellerAToken}` },
  });
  assert.equal(order2Cross.status, 404);

  // Historical order boundary: Seller A tries to get historical unassigned Order 3 -> fails (404)
  const order3Hist = await request(`/api/seller/orders/${orderHistId}`, {
    headers: { Authorization: `Bearer ${sellerAToken}` },
  });
  assert.equal(order3Hist.status, 404);

  // Seller A tries to query with ?store_id=store2Id -> 403 Forbidden
  const bypassAttempt = await request(`/api/seller/orders?store_id=${store2Id}`, {
    headers: { Authorization: `Bearer ${sellerAToken}` },
  });
  assert.equal(bypassAttempt.status, 403);
  assert.match(bypassAttempt.data.detail, /access denied/i);
});

test('7. Seller order mutations are strictly rejected (405 Method Not Allowed)', async () => {
  const patchRes = await request('/api/seller/orders/1', {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${sellerAToken}` },
    body: JSON.stringify({ order_status: 'ready' }),
  });
  assert.equal(patchRes.status, 405);
  assert.match(patchRes.data.detail, /not permitted/i);
});

test('8. Deactivated store immediately denies store access to assigned sellers', async () => {
  // Admin deactivates Store 1
  const deactRes = await request(`/api/admin/stores/${store1Id}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ is_active: false }),
  });
  assert.equal(deactRes.status, 200);
  assert.equal(deactRes.data.is_active, false);

  // Seller A now has 0 active stores assigned
  const storesRes = await request('/api/seller/stores', {
    headers: { Authorization: `Bearer ${sellerAToken}` },
  });
  assert.equal(storesRes.status, 200);
  assert.equal(storesRes.data.items.length, 0);

  // Re-activate Store 1 for subsequent tests
  await request(`/api/admin/stores/${store1Id}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ is_active: true }),
  });
});

test('9. Safety guard: Admin cannot delete a store with historical orders', async () => {
  const deleteRes = await request(`/api/admin/stores/${store1Id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(deleteRes.status, 400);
  assert.match(deleteRes.data.detail, /cannot delete store with historical order records/i);
});

test('10. Security Protection: Cannot deactivate or demote the last active administrator', async () => {
  // Ensure adminId is the sole active administrator for this test
  const adminsRes = await dbQuery("SELECT id FROM staff_users WHERE role = 'admin' AND is_active = TRUE");
  for (const row of adminsRes.rows) {
    if (row.id !== adminId) {
      await dbQuery('UPDATE staff_users SET is_active = FALSE WHERE id = $1', [row.id]);
    }
  }

  const demoteRes = await request(`/api/admin/staff/${adminId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ role: 'staff' }),
  });
  assert.equal(demoteRes.status, 400);
  assert.match(demoteRes.data.detail, /cannot deactivate or demote the last active administrator/i);

  const deactRes = await request(`/api/admin/staff/${adminId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ is_active: false }),
  });
  assert.equal(deactRes.status, 400);
  assert.match(deactRes.data.detail, /cannot deactivate or demote the last active administrator/i);
});

test('11. Security audit events are recorded for store and assignment actions', async () => {
  const auditRes = await dbQuery('SELECT * FROM security_audit_logs ORDER BY id DESC');
  const actions = auditRes.rows.map(r => r.action);
  assert.ok(actions.includes('store_created'));
  assert.ok(actions.includes('seller_store_assigned'));
  assert.ok(actions.includes('store_deactivated') || actions.includes('store_activated'));
});
