import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

// Keep the API suite isolated from any configured PostgreSQL database.
process.env.NODE_ENV = 'test';
process.env.ENVIRONMENT = 'test';
process.env.ALLOW_IN_MEMORY_DB = 'true';
process.env.DATABASE_URL = 'postgresql://127.0.0.1:1/isolated';
const { startServer } = await import('../src/server.js');
const { createToken } = await import('../src/middleware/auth.js');
const { dbQuery, getDatabase } = await import('../src/db/database.js');

let server;
let baseUrl;

test.before(async () => {
  // Start on an ephemeral port for testing
  server = await startServer(0);
  const port = server.address().port;
  baseUrl = `http://localhost:${port}`;
});

test.after(() => {
  if (server) {
    server.close();
  }
});

async function apiRequest(path, options = {}) {
  const url = `${baseUrl}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const res = await fetch(url, {
    ...options,
    headers,
  });

  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await res.json() : await res.text();
  return { status: res.status, data };
}

test('1. Health check returns 200 and healthy status', async () => {
  const res = await apiRequest('/api/health');
  assert.equal(res.status, 200);
  assert.equal(res.data.status, 'healthy');
  assert.equal(res.data.app, 'Coffee & Milk Tea Shop API');
});

test('2. Categories endpoint returns seeded categories with product counts', async () => {
  const res = await apiRequest('/api/categories?active_only=true');
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.data));
  assert.ok(res.data.length >= 5);

  const coffee = res.data.find(c => c.name === 'Coffee');
  assert.ok(coffee);
  assert.ok(coffee.product_count >= 1);
});

test('3. Products endpoint supports category filtering and search', async () => {
  // All products
  const resAll = await apiRequest('/api/products');
  assert.equal(resAll.status, 200);
  assert.ok(resAll.data.length >= 10);

  // Filter by category name
  const resCoffee = await apiRequest('/api/products?category=Coffee');
  assert.equal(resCoffee.status, 200);
  assert.ok(resCoffee.data.every(p => p.category.name === 'Coffee'));

  // Search by keyword
  const resSearch = await apiRequest('/api/products?search=Matcha');
  assert.equal(resSearch.status, 200);
  assert.ok(resSearch.data.length >= 1);
  assert.ok(resSearch.data.some(p => p.name.includes('Matcha')));
});

test('4. Customer Registration, Login and Profile (/me)', async () => {
  const phone = `099${Math.floor(100000 + Math.random() * 900000)}`;
  const email = `test.${Date.now()}@coffeeshop.com`;
  const password = 'mysecurepassword123';

  // 1. Register
  const regRes = await apiRequest('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      full_name: 'Sophea NodeTester',
      phone,
      email,
      password,
    }),
  });
  assert.equal(regRes.status, 201);
  assert.ok(regRes.data.access_token);
  assert.equal(regRes.data.user.full_name, 'Sophea NodeTester');
  assert.equal(regRes.data.user.phone, phone);

  // 2. Login with phone
  const loginRes = await apiRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      identifier: phone,
      password,
    }),
  });
  assert.equal(loginRes.status, 200);
  const token = loginRes.data.access_token;
  assert.ok(token);

  // 3. Get profile
  const meRes = await apiRequest('/api/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(meRes.status, 200);
  assert.equal(meRes.data.email, email);

  // 4. Customer token CANNOT access admin endpoints
  const adminRes = await apiRequest('/api/admin/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(adminRes.status, 403);
});

test('5. Order Creation with Size & Toppings calculations and Loyalty increment', async () => {
  const phone = `088${Math.floor(100000 + Math.random() * 900000)}`;

  // Register customer first to test loyalty punch card
  const registration = await apiRequest('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      full_name: 'Loyal Drinker',
      phone,
      password: 'password123',
    }),
  });
  assert.equal(registration.status, 201);
  const customerHeaders = { Authorization: `Bearer ${registration.data.access_token}` };

  // Get products to order
  const prodRes = await apiRequest('/api/products');
  const drink = prodRes.data[0]; // e.g. Iced Americano ($2.00)

  // Order with Large (+0.60) and Brown Sugar Pearls (+0.50)
  const orderRes = await apiRequest('/api/orders', {
    method: 'POST',
    headers: customerHeaders,
    body: JSON.stringify({
      customer_name: 'Loyal Drinker',
      customer_phone: phone,
      items: [
        {
          product_id: drink.id,
          size: 'Large',
          sugar_level: '50%',
          ice_level: 'Normal Ice',
          toppings: ['Brown Sugar Pearls'],
          quantity: 2,
        },
      ],
    }),
  });

  assert.equal(orderRes.status, 201);
  const order = orderRes.data;
  assert.ok(order.order_number.startsWith('ORD-'));
  assert.match(order.order_number, /^ORD-\d{8}-[A-Z2-9]{10}$/);
  // Expected price: (2.00 + 0.60 + 0.50) = 3.10 * 2 = 6.20
  const expectedUnitPrice = parseFloat((drink.base_price_usd + 0.60 + 0.50).toFixed(2));
  const expectedTotal = parseFloat((expectedUnitPrice * 2).toFixed(2));
  assert.equal(order.total_usd, expectedTotal);
  assert.equal(order.total_khr, Math.round(expectedTotal * 4100));
  assert.equal(order.items.length, 1);
  assert.equal(order.items[0].size, 'Large');
  assert.equal(order.items[0].toppings, 'Brown Sugar Pearls');
  assert.equal(order.payment_method, 'cash');
  assert.equal(order.payment_status, 'unpaid');
  assert.equal(order.order_status, 'pending');

  // Verify phone lookup
  const lookupRes = await apiRequest(`/api/orders/lookup/phone?phone=${phone}`, { headers: customerHeaders });
  assert.equal(lookupRes.status, 200);
  assert.ok(lookupRes.data.length >= 1);
  assert.equal(lookupRes.data[0].order_number, order.order_number);

  // Verify reference lookup
  const refRes = await apiRequest(`/api/orders/ref/${encodeURIComponent(order.order_number)}`, { headers: customerHeaders });
  assert.equal(refRes.status, 200);
  assert.equal(refRes.data.id, order.id);

  const idRes = await apiRequest(`/api/orders/${order.id}`, { headers: customerHeaders });
  assert.equal(idRes.status, 200);
  assert.equal(idRes.data.order_number, order.order_number);

  // Verify loyalty stamps incremented
  const loginRes = await apiRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier: phone, password: 'password123' }),
  });
  assert.equal(loginRes.data.user.loyalty_stamps, 1);
});

test('6. Order access requires a current customer and database-backed ownership', async () => {
  const number = Math.floor(100000 + Math.random() * 900000);
  const ownerPhone = `071${number}`;
  const otherPhone = `072${number}`;
  const register = async (phone) => apiRequest('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ full_name: 'Order Customer', phone, password: 'test-only-password' }),
  });
  const owner = await register(ownerPhone);
  const other = await register(otherPhone);
  assert.equal(owner.status, 201);
  assert.equal(other.status, 201);
  const ownerHeaders = { Authorization: `Bearer ${owner.data.access_token}` };
  const otherHeaders = { Authorization: `Bearer ${other.data.access_token}` };
  const product = (await apiRequest('/api/products')).data[0];
  const payload = {
    customer_name: 'Order Customer',
    customer_phone: ownerPhone,
    items: [{ product_id: product.id, quantity: 1 }],
  };

  assert.equal((await apiRequest('/api/orders', { method: 'POST', body: JSON.stringify(payload) })).status, 401);
  const created = await apiRequest('/api/orders', {
    method: 'POST', headers: ownerHeaders, body: JSON.stringify(payload),
  });
  assert.equal(created.status, 201);
  const order = created.data;
  const customerPaths = [
    `/api/orders/${order.id}`,
    `/api/orders/ref/${encodeURIComponent(order.order_number)}`,
    `/api/orders/lookup/phone?phone=${ownerPhone}`,
  ];
  for (const path of customerPaths) {
    assert.equal((await apiRequest(path)).status, 401);
    assert.equal((await apiRequest(path, { headers: ownerHeaders })).status, 200);
  }
  assert.equal((await apiRequest(customerPaths[0], { headers: otherHeaders })).status, 404);
  assert.equal((await apiRequest(customerPaths[1], { headers: otherHeaders })).status, 404);
  const misleadingPhoneClaim = {
    Authorization: `Bearer ${createToken({ sub: other.data.user.id, role: 'customer', phone: ownerPhone })}`,
  };
  assert.equal((await apiRequest(customerPaths[0], { headers: misleadingPhoneClaim })).status, 404);
  const otherPhoneLookup = await apiRequest(customerPaths[2], { headers: otherHeaders });
  assert.equal(otherPhoneLookup.status, 200);
  assert.deepEqual(otherPhoneLookup.data, []);

  // Contact numbers may differ from account numbers, but ownership and rewards do not.
  const alternateContactOrder = await apiRequest('/api/orders', {
    method: 'POST', headers: otherHeaders, body: JSON.stringify(payload),
  });
  assert.equal(alternateContactOrder.status, 201);
  assert.equal((await apiRequest(`/api/orders/${alternateContactOrder.data.id}`, { headers: ownerHeaders })).status, 404);
  const otherOwnLookup = await apiRequest(customerPaths[2], { headers: otherHeaders });
  assert.equal(otherOwnLookup.data.length, 1);

  const invalidHeaders = { Authorization: 'Bearer invalid-token' };
  const expiredHeaders = { Authorization: `Bearer ${createToken({ sub: owner.data.user.id, role: 'customer' }, '-1s')}` };
  const missingUserHeaders = { Authorization: `Bearer ${createToken({ sub: 999999, role: 'customer' })}` };
  for (const headers of [invalidHeaders, expiredHeaders, missingUserHeaders]) {
    assert.equal((await apiRequest(customerPaths[0], { headers })).status, 401);
  }

  const customerPatch = await apiRequest(`/api/admin/orders/${order.id}/status`, {
    method: 'PATCH', headers: ownerHeaders, body: JSON.stringify({ order_status: 'completed' }),
  });
  assert.equal(customerPatch.status, 403);
  assert.equal((await apiRequest(`/api/admin/orders/${order.id}/status`, {
    method: 'PATCH', body: JSON.stringify({ order_status: 'completed' }),
  })).status, 401);
  assert.equal((await apiRequest(`/api/orders/${order.id}`, {
    method: 'PATCH', headers: otherHeaders, body: JSON.stringify({ order_status: 'completed' }),
  })).status, 404);
  assert.equal((await apiRequest(customerPaths[0], { headers: ownerHeaders })).data.order_status, 'pending');

  const adminLogin = await apiRequest('/api/admin/auth/login', {
    method: 'POST', body: JSON.stringify({ email: 'admin@coffeeshop.com', password: 'admin123' }),
  });
  assert.equal(adminLogin.status, 200);
  const adminHeaders = { Authorization: `Bearer ${adminLogin.data.access_token}` };
  assert.equal((await apiRequest(`/api/admin/orders/${order.id}`, { headers: adminHeaders })).status, 200);
  assert.equal((await apiRequest('/api/admin/orders', { headers: adminHeaders })).status, 200);
  assert.equal((await apiRequest(customerPaths[0], { headers: adminHeaders })).status, 401);
  assert.equal((await apiRequest(`/api/admin/orders/${order.id}`, { headers: invalidHeaders })).status, 403);
  const missingStaffHeaders = { Authorization: `Bearer ${createToken({ sub: 999999, role: 'admin' })}` };
  assert.equal((await apiRequest(`/api/admin/orders/${order.id}`, { headers: missingStaffHeaders })).status, 401);

  const adminUpdate = await apiRequest(`/api/admin/orders/${order.id}/status`, {
    method: 'PATCH', headers: adminHeaders, body: JSON.stringify({ order_status: 'preparing' }),
  });
  assert.equal(adminUpdate.status, 200);
  assert.equal(adminUpdate.data.order_status, 'preparing');

  // Pre-existing rows have no owner. Do not infer ownership from an unverified phone.
  const legacy = await dbQuery(`
    INSERT INTO orders (order_number, customer_name, customer_phone, customer_email, notes,
      subtotal_usd, total_usd, total_khr, payment_method, customer_id)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *
  `, ['LEGACY-TEST-ORDER', 'Legacy Customer', ownerPhone, null, null, 1, 1, 4100, 'cash', null]);
  const legacyId = legacy.rows[0].id;
  assert.equal((await apiRequest(`/api/orders/${legacyId}`, { headers: ownerHeaders })).status, 404);
  assert.equal((await apiRequest(`/api/admin/orders/${legacyId}`, { headers: adminHeaders })).status, 200);
  assert.equal((await apiRequest('/api/orders', { headers: ownerHeaders })).data.some(row => row.id === legacyId), false);
  assert.equal((await apiRequest('/api/orders', { headers: ownerHeaders })).data.some(row => row.id === order.id), true);
  assert.equal((await apiRequest('/api/orders', { headers: otherHeaders })).data.some(row => row.id === order.id), false);
  assert.equal((await apiRequest('/api/orders')).status, 401);
});

async function assertOrderRollback(failureKind) {
  const phone = `070${Math.floor(100000 + Math.random() * 900000)}`;
  const registered = await apiRequest('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ full_name: 'Rollback Tester', phone, password: 'test-only-password' }),
  });
  assert.equal(registered.status, 201);
  const headers = { Authorization: `Bearer ${registered.data.access_token}` };
  const product = (await apiRequest('/api/products')).data[0];
  const beforeOrders = Number((await dbQuery('SELECT COUNT(*) as count FROM orders')).rows[0].count);
  const beforeItems = Number((await dbQuery('SELECT COUNT(*) as count FROM order_items')).rows[0].count);
  const memoryDb = await getDatabase();
  const originalQuery = memoryDb.query;
  let itemWrites = 0;

  memoryDb.query = function (sql, params) {
    const statement = sql.trim();
    if (/^INSERT INTO order_items/i.test(statement) && ++itemWrites === 2 && failureKind === 'item') {
      throw new Error('Injected item write failure');
    }
    if (/^UPDATE customer_users SET loyalty_stamps/i.test(statement) && failureKind === 'loyalty') {
      throw new Error('Injected loyalty write failure');
    }
    if (/^UPDATE customer_users SET loyalty_stamps/i.test(statement) && failureKind === 'missing-owner') {
      return { rows: [], rowCount: 0 };
    }
    return originalQuery.call(this, sql, params);
  };

  try {
    const response = await apiRequest('/api/orders', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        customer_name: 'Rollback Tester', customer_phone: phone,
        items: [
          { product_id: product.id, quantity: 1 },
          { product_id: product.id, quantity: 1 },
        ],
      }),
    });
    assert.equal(response.status, 500);
  } finally {
    memoryDb.query = originalQuery;
  }

  assert.equal(Number((await dbQuery('SELECT COUNT(*) as count FROM orders')).rows[0].count), beforeOrders);
  assert.equal(Number((await dbQuery('SELECT COUNT(*) as count FROM order_items')).rows[0].count), beforeItems);
  const profile = await apiRequest('/api/auth/me', { headers });
  assert.equal(profile.data.loyalty_stamps, 0);
}

test('7. Failed order-item write rolls back the order and prior item', async () => {
  await assertOrderRollback('item');
});

test('8. Failed loyalty write rolls back the order and items', async () => {
  await assertOrderRollback('loyalty');
});

test('9. Missing order owner at loyalty credit rolls back the order and items', async () => {
  await assertOrderRollback('missing-owner');
});

test('10. Admin Authentication & Dashboard Summary', async () => {
  // Login as seeded admin
  const loginRes = await apiRequest('/api/admin/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'admin@coffeeshop.com',
      password: 'admin123',
    }),
  });
  assert.equal(loginRes.status, 200);
  const adminToken = loginRes.data.access_token;
  assert.ok(adminToken);

  // Dashboard summary
  const summaryRes = await apiRequest('/api/admin/dashboard/summary', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(summaryRes.status, 200);
  assert.ok(summaryRes.data.total_orders >= 1);
  assert.equal(summaryRes.data.total_sales_usd, 0); // New unpaid orders are not revenue.

  const ordersRes = await apiRequest('/api/admin/orders', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(ordersRes.status, 200);
  const order = ordersRes.data.items[0];
  const paymentRes = await apiRequest(`/api/admin/orders/${order.id}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ payment_status: 'paid' }),
  });
  assert.equal(paymentRes.status, 422);
  assert.equal((await apiRequest(`/api/admin/orders/${order.id}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  })).data.payment_status, 'unpaid');
});

test('11. Staff access follows the active database role and rejects unsupported roles', async () => {
  const memoryDb = await getDatabase();
  const admin = memoryDb.tables.staff_users.find(row => row.role === 'admin' && row.is_active);
  assert.ok(admin);
  const adminHeaders = { Authorization: `Bearer ${createToken({ sub: admin.id, role: 'admin' })}` };

  assert.equal((await apiRequest('/api/admin/staff', { headers: adminHeaders })).status, 200);
  const email = `role-check-${Date.now()}@example.test`;
  const password = 'OnlyForRoleCheck42!';
  const created = await apiRequest('/api/admin/staff', {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({ email, full_name: 'Role Check', password, role: 'staff' }),
  });
  assert.equal(created.status, 201);
  const staffId = created.data.id;
  const staffRow = memoryDb.tables.staff_users.find(row => row.id === staffId);
  assert.ok(staffRow);

  const login = () => apiRequest('/api/admin/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  const staffLogin = await login();
  assert.equal(staffLogin.status, 200);
  const staffHeaders = { Authorization: `Bearer ${staffLogin.data.access_token}` };

  assert.equal((await apiRequest('/api/admin/auth/me', { headers: staffHeaders })).status, 200);
  assert.equal((await apiRequest('/api/admin/dashboard/summary', { headers: staffHeaders })).status, 403);
  assert.equal((await apiRequest('/api/admin/orders', { headers: staffHeaders })).status, 403);
  assert.equal((await apiRequest('/api/admin/staff', { headers: staffHeaders })).status, 403);
  assert.equal((await apiRequest(`/api/admin/staff/${staffId}`, {
    method: 'PATCH', headers: staffHeaders, body: JSON.stringify({ role: 'admin' }),
  })).status, 403);

  assert.equal((await apiRequest('/api/admin/staff', {
    method: 'POST', headers: adminHeaders,
    body: JSON.stringify({ email: 'unsupported@example.test', full_name: 'Unsupported', password, role: 'seller' }),
  })).status, 422);
  assert.equal((await apiRequest(`/api/admin/staff/${staffId}`, {
    method: 'PATCH', headers: adminHeaders, body: JSON.stringify({ role: 'seller' }),
  })).status, 422);

  try {
    staffRow.is_active = false;
    assert.equal((await apiRequest('/api/admin/auth/me', { headers: staffHeaders })).status, 401);
    assert.equal((await login()).status, 401);
    staffRow.is_active = true;

    staffRow.role = 'seller';
    assert.equal((await apiRequest('/api/admin/auth/me', { headers: staffHeaders })).status, 403);
    assert.equal((await apiRequest('/api/admin/dashboard/summary', { headers: staffHeaders })).status, 403);
    assert.equal((await login()).status, 403);
    staffRow.role = 'staff';
    const promoted = await apiRequest(`/api/admin/staff/${staffId}`, {
      method: 'PATCH', headers: adminHeaders, body: JSON.stringify({ role: 'admin' }),
    });
    assert.equal(promoted.status, 200);
    assert.equal(promoted.data.role, 'admin');
    assert.equal((await apiRequest('/api/admin/staff', { headers: staffHeaders })).status, 403);

    const promotedLogin = await login();
    assert.equal(promotedLogin.status, 200);
    const promotedHeaders = { Authorization: `Bearer ${promotedLogin.data.access_token}` };
    assert.equal((await apiRequest('/api/admin/staff', { headers: promotedHeaders })).status, 200);
    const demoted = await apiRequest(`/api/admin/staff/${staffId}`, {
      method: 'PATCH', headers: adminHeaders, body: JSON.stringify({ role: 'staff' }),
    });
    assert.equal(demoted.status, 200);
    assert.equal((await apiRequest('/api/admin/staff', { headers: promotedHeaders })).status, 403);
  } finally {
    staffRow.is_active = true;
    staffRow.role = 'staff';
  }
});

test('phase 4 catalog CRUD is admin-only and validates input', async () => {
  const memory = await getDatabase();
  const admin = memory.tables.staff_users.find(row => row.role === 'admin' && row.is_active);
  const staff = memory.tables.staff_users.find(row => row.role === 'staff' && row.is_active);
  const adminHeaders = { Authorization: `Bearer ${createToken({ sub: admin.id, role: 'admin' })}` };
  const staffHeaders = { Authorization: `Bearer ${createToken({ sub: staff.id, role: 'staff' })}` };
  assert.equal((await apiRequest('/api/admin/categories', { headers: staffHeaders })).status, 403);
  assert.equal((await apiRequest('/api/admin/products', { headers: staffHeaders })).status, 403);
  assert.equal((await apiRequest('/api/admin/categories', {
    method: 'POST', headers: staffHeaders, body: JSON.stringify({ name: 'Forbidden' }),
  })).status, 403);
  const category = await apiRequest('/api/admin/categories', {
    method: 'POST', headers: adminHeaders,
    body: JSON.stringify({ name: 'Phase Four Test', description: 'Test only', is_active: true }),
  });
  assert.equal(category.status, 201);
  const categoryId = category.data.id;
  const duplicate = await apiRequest('/api/admin/categories', {
    method: 'POST', headers: adminHeaders, body: JSON.stringify({ name: 'phase four test' }),
  });
  assert.equal(duplicate.status, 400);
  const product = await apiRequest('/api/admin/products', {
    method: 'POST', headers: adminHeaders,
    body: JSON.stringify({ category_id: categoryId, name: 'Phase Four Drink', base_price_usd: 2.3, is_available: true }),
  });
  assert.equal(product.status, 201);
  const productId = product.data.id;
  assert.equal((await apiRequest('/api/admin/products', {
    method: 'POST', headers: adminHeaders,
    body: JSON.stringify({ category_id: categoryId, name: 'Bad Price', base_price_usd: '2.3oops' }),
  })).status, 422);
  assert.equal((await apiRequest(`/api/admin/products/${productId}`, {
    method: 'PATCH', headers: staffHeaders, body: JSON.stringify({ is_available: false }),
  })).status, 403);
  const updated = await apiRequest(`/api/admin/products/${productId}`, {
    method: 'PATCH', headers: adminHeaders,
    body: JSON.stringify({ name: 'Renamed Drink', base_price_usd: 3.25, is_available: false }),
  });
  assert.equal(updated.status, 200);
  assert.equal(updated.data.name, 'Renamed Drink');
  assert.equal(updated.data.base_price_usd, 3.25);
  assert.equal(updated.data.is_available, false);
  assert.equal((await apiRequest(`/api/admin/categories/${categoryId}`, {
    method: 'DELETE', headers: adminHeaders,
  })).status, 400);
  const renamedCategory = await apiRequest(`/api/admin/categories/${categoryId}`, {
    method: 'PATCH', headers: adminHeaders, body: JSON.stringify({ name: 'Renamed Category', is_active: false }),
  });
  assert.equal(renamedCategory.data.name, 'Renamed Category');
  assert.equal(renamedCategory.data.is_active, false);
  assert.equal((await apiRequest(`/api/admin/products/${productId}`, { method: 'DELETE', headers: adminHeaders })).status, 200);
  assert.equal((await apiRequest(`/api/admin/categories/${categoryId}`, { method: 'DELETE', headers: adminHeaders })).status, 200);
});

test('phase 4 order transitions, payment restrictions, and revenue policy', async () => {
  const memory = await getDatabase();
  const admin = memory.tables.staff_users.find(row => row.role === 'admin' && row.is_active);
  const staff = memory.tables.staff_users.find(row => row.role === 'staff' && row.is_active);
  const adminHeaders = { Authorization: `Bearer ${createToken({ sub: admin.id, role: 'admin' })}` };
  const staffHeaders = { Authorization: `Bearer ${createToken({ sub: staff.id, role: 'staff' })}` };
  const existing = memory.tables.orders.find(row => row.payment_status === 'unpaid' && row.order_status === 'pending');
  assert.ok(existing);
  const id = existing.id;
  assert.equal((await apiRequest(`/api/admin/orders/${id}`, { headers: adminHeaders })).status, 200);
  assert.equal((await apiRequest('/api/admin/orders?status=pending', { headers: adminHeaders })).data.items.every(row => row.order_status === 'pending'), true);
  assert.equal((await apiRequest(`/api/admin/orders/${id}/status`, {
    method: 'PATCH', headers: staffHeaders, body: JSON.stringify({ order_status: 'preparing' }),
  })).status, 403);
  assert.equal((await apiRequest(`/api/admin/orders/${id}/status`, {
    method: 'PATCH', headers: adminHeaders, body: JSON.stringify({ order_status: 'completed' }),
  })).status, 409);
  assert.equal((await apiRequest(`/api/admin/orders/${id}/status`, {
    method: 'PATCH', headers: adminHeaders, body: JSON.stringify({ payment_status: 'paid' }),
  })).status, 422);
  for (const next of ['preparing', 'ready', 'completed']) {
    const result = await apiRequest(`/api/admin/orders/${id}/status`, {
      method: 'PATCH', headers: adminHeaders, body: JSON.stringify({ order_status: next }),
    });
    assert.equal(result.status, 200);
    assert.equal(result.data.order_status, next);
    assert.equal(result.data.payment_status, 'unpaid');
  }
  assert.equal((await apiRequest(`/api/admin/orders/${id}/status`, {
    method: 'PATCH', headers: adminHeaders, body: JSON.stringify({ order_status: 'cancelled' }),
  })).status, 409);
  const report = await apiRequest('/api/admin/reports/sales', { headers: adminHeaders });
  assert.equal(report.status, 200);
  assert.equal(report.data.total_revenue_usd, 0);
  const summary = await apiRequest('/api/admin/dashboard/summary', { headers: adminHeaders });
  assert.equal(summary.data.total_sales_usd, 0);
});

test('phase 4 reports count only historical paid and completed rows', async () => {
  const memory = await getDatabase();
  const admin = memory.tables.staff_users.find(row => row.role === 'admin' && row.is_active);
  const headers = { Authorization: `Bearer ${createToken({ sub: admin.id, role: 'admin' })}` };
  const first = memory.tables.orders[0];
  const second = memory.tables.orders[1];
  assert.ok(first && second);
  const before = [first.payment_status, first.order_status, second.payment_status, second.order_status];
  try {
    first.payment_status = 'paid'; first.order_status = 'completed';
    second.payment_status = 'paid'; second.order_status = 'cancelled';
    const summary = await apiRequest('/api/admin/dashboard/summary', { headers });
    const report = await apiRequest('/api/admin/reports/sales', { headers });
    assert.equal(summary.data.total_sales_usd, first.total_usd);
    assert.equal(report.data.total_revenue_usd, first.total_usd);
    assert.equal(report.data.total_revenue_khr, first.total_khr);
  } finally {
    [first.payment_status, first.order_status, second.payment_status, second.order_status] = before;
  }
});

test('phase 5 rejects repeated settlement claims and keeps cash cancellation unpaid', async () => {
  const memory = await getDatabase();
  const admin = memory.tables.staff_users.find(row => row.role === 'admin' && row.is_active);
  const staff = memory.tables.staff_users.find(row => row.role === 'staff' && row.is_active);
  const adminHeaders = { Authorization: `Bearer ${createToken({ sub: admin.id, role: 'admin' })}` };
  const staffHeaders = { Authorization: `Bearer ${createToken({ sub: staff.id, role: 'staff' })}` };
  assert.equal((await apiRequest('/api/admin/orders/1/cash-settlement', {
    method: 'POST', body: JSON.stringify({ reference: 'TEST', confirm_cash_received: true }),
  })).status, 401);
  assert.equal((await apiRequest('/api/admin/orders/1/cash-settlement', {
    method: 'POST', headers: staffHeaders, body: JSON.stringify({ reference: 'TEST', confirm_cash_received: true }),
  })).status, 403);
  const cash = memory.tables.orders.find(row => row.payment_method === 'cash' && row.payment_status === 'unpaid' && row.order_status === 'pending');
  assert.ok(cash);
  const originalCashStatus = cash.order_status;
  try {
  for (const headers of [staffHeaders, adminHeaders, adminHeaders]) {
    const response = await apiRequest(`/api/admin/orders/${cash.id}/status`, {
      method: 'PATCH', headers, body: JSON.stringify({ payment_status: 'paid' }),
    });
    assert.equal(response.status, headers === staffHeaders ? 403 : 422);
  }
  assert.equal(cash.payment_status, 'unpaid');
  const cancelled = await apiRequest(`/api/admin/orders/${cash.id}/status`, {
    method: 'PATCH', headers: adminHeaders, body: JSON.stringify({ order_status: 'cancelled' }),
  });
  assert.equal(cancelled.status, 200);
  assert.equal(cancelled.data.payment_status, 'unpaid');
  assert.equal((await apiRequest(`/api/admin/orders/${cash.id}/status`, {
    method: 'PATCH', headers: adminHeaders, body: JSON.stringify({ order_status: 'preparing' }),
  })).status, 409);
  } finally { cash.order_status = originalCashStatus; }

  const historical = memory.tables.orders.find(row => row.id !== cash.id);
  assert.ok(historical);
  const before = [historical.payment_status, historical.order_status];
  try {
    historical.payment_status = 'paid'; historical.order_status = 'ready';
    assert.equal((await apiRequest(`/api/admin/orders/${historical.id}/status`, {
      method: 'PATCH', headers: adminHeaders, body: JSON.stringify({ order_status: 'cancelled' }),
    })).status, 409);
    assert.equal(historical.payment_status, 'paid');
  } finally { [historical.payment_status, historical.order_status] = before; }
});

async function orderFixture() {
  const phone = `067${Math.floor(100000 + Math.random() * 900000)}`;
  const registration = await apiRequest('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ full_name: 'Order Test', phone, password: 'test-only-password' }),
  });
  assert.equal(registration.status, 201);
  const product = (await apiRequest('/api/products')).data[0];
  return {
    phone,
    userId: registration.data.user.id,
    headers: { Authorization: `Bearer ${registration.data.access_token}` },
    product,
    payload: {
      customer_name: 'Order Test', customer_phone: phone,
      items: [{ product_id: product.id, quantity: 1, size: 'Medium', sugar_level: '50%', ice_level: 'Normal Ice', toppings: [] }],
    },
  };
}

test('order boundary rejects malformed products, quantities, customizations and currency methods', async () => {
  const { headers, product, payload } = await orderFixture();
  const submit = body => apiRequest('/api/orders', { method: 'POST', headers, body: JSON.stringify(body) });
  const invalidBodies = [
    null, [], { ...payload, items: [] },
    { ...payload, items: [null] },
    { ...payload, items: [{ ...payload.items[0], product_id: 999999 }] },
    { ...payload, items: [{ ...payload.items[0], product_id: '1' }] },
    { ...payload, items: [{ ...payload.items[0], quantity: 0 }] },
    { ...payload, items: [{ ...payload.items[0], quantity: 51 }] },
    { ...payload, items: [{ ...payload.items[0], quantity: 1.5 }] },
    { ...payload, items: [{ ...payload.items[0], quantity: '2' }] },
    { ...payload, items: [{ ...payload.items[0], size: 'Huge' }] },
    { ...payload, items: [{ ...payload.items[0], sugar_level: '200%' }] },
    { ...payload, items: [{ ...payload.items[0], ice_level: 'Icy' }] },
    { ...payload, items: [{ ...payload.items[0], toppings: ['Unknown topping'] }] },
    { ...payload, items: [{ ...payload.items[0], toppings: ['Pudding', 'Pudding'] }] },
    { ...payload, items: [{ ...payload.items[0], syrup: 'unpriced' }] },
    { ...payload, payment_method: 'free' },
    { ...payload, currency: 'EUR' },
  ];
  for (const body of invalidBodies) {
    const response = await submit(body);
    assert.equal(response.status, body === null ? 400 : 422, response.data.detail);
    assert.equal(typeof response.data.detail, 'string');
  }
  const db = await getDatabase();
  const productRow = () => db.tables.products.find(row => row.id === product.id);
  const categoryRow = () => db.tables.categories.find(row => row.id === productRow().category_id);
  try {
    productRow().is_available = false;
    assert.equal((await submit(payload)).status, 422);
    productRow().is_available = true;
    categoryRow().is_active = false;
    assert.equal((await submit(payload)).status, 422);
  } finally {
    productRow().is_available = true;
    categoryRow().is_active = true;
  }
});

test('web and Flutter order bodies use catalog prices and server currency totals', async () => {
  const { headers, product, payload } = await orderFixture();
  const webPayload = {
    ...payload, payment_method: 'khqr', currency: 'USD', total_usd: 0.01, total_khr: 1,
    items: [{ ...payload.items[0], quantity: 2, product_name: 'Fake', unit_price_usd: 0.01, subtotal_usd: 0.02, toppings: ['Pudding'] }],
  };
  const web = await apiRequest('/api/orders', { method: 'POST', headers, body: JSON.stringify(webPayload) });
  assert.equal(web.status, 201);
  const expected = Number((product.base_price_usd + 0.3 + 0.5).toFixed(2));
  assert.equal(web.data.items[0].product_name, product.name);
  assert.equal(web.data.items[0].unit_price_usd, expected);
  assert.equal(web.data.total_usd, expected * 2);
  assert.equal(web.data.total_khr, Math.round(expected * 2 * 4100));
  assert.equal(web.data.payment_status, 'unpaid');
  const mobile = await apiRequest('/api/orders', { method: 'POST', headers, body: JSON.stringify(payload) });
  assert.equal(mobile.status, 201);
  assert.equal(mobile.data.items[0].unit_price_usd, Number((product.base_price_usd + 0.3).toFixed(2)));
});

test('idempotency replays one owned order, rejects payload conflicts and serializes concurrent requests', async () => {
  const { headers, payload, phone } = await orderFixture();
  const key = `test-${randomUUID()}`;
  const submit = (body, idempotencyKey = key) => apiRequest('/api/orders', {
    method: 'POST', headers: { ...headers, 'Idempotency-Key': idempotencyKey }, body: JSON.stringify(body),
  });
  const [first, concurrent] = await Promise.all([submit(payload), submit(payload)]);
  assert.deepEqual([first.status, concurrent.status].sort(), [200, 201]);
  assert.equal(first.data.id, concurrent.data.id);
  assert.equal((await submit(payload)).data.id, first.data.id);
  assert.equal((await submit({ ...payload, notes: 'Different' })).status, 409);
  assert.equal((await submit(payload, 'bad')).status, 400);
  const lookup = await apiRequest(`/api/orders/lookup/phone?phone=${phone}`, { headers });
  assert.equal(lookup.data.filter(order => order.id === first.data.id).length, 1);
  const profile = await apiRequest('/api/auth/me', { headers });
  assert.equal(profile.data.loyalty_stamps, 1);
  const other = await orderFixture();
  const sameKeyOtherOwner = await apiRequest('/api/orders', {
    method: 'POST', headers: { ...other.headers, 'Idempotency-Key': key },
    body: JSON.stringify(other.payload),
  });
  assert.equal(sameKeyOtherOwner.status, 201);
  assert.notEqual(sameKeyOtherOwner.data.id, first.data.id);
});

test('a failed idempotent write rolls back the reservation, order, items and loyalty credit', async () => {
  const { headers, payload } = await orderFixture();
  const key = `rollback-${randomUUID()}`;
  const db = await getDatabase();
  const originalQuery = db.query;
  db.query = function (sql, params) {
    if (/^INSERT INTO order_items/i.test(sql.trim())) throw new Error('Injected write failure');
    return originalQuery.call(this, sql, params);
  };
  try {
    const failed = await apiRequest('/api/orders', {
      method: 'POST', headers: { ...headers, 'Idempotency-Key': key }, body: JSON.stringify(payload),
    });
    assert.equal(failed.status, 500);
  } finally {
    db.query = originalQuery;
  }
  assert.equal(db.tables.order_idempotency.some(row => row.idempotency_key === key), false);
  assert.equal((await apiRequest('/api/auth/me', { headers })).data.loyalty_stamps, 0);
  const retried = await apiRequest('/api/orders', {
    method: 'POST', headers: { ...headers, 'Idempotency-Key': key }, body: JSON.stringify(payload),
  });
  assert.equal(retried.status, 201);
  assert.equal((await apiRequest('/api/auth/me', { headers })).data.loyalty_stamps, 1);
});

test('browser preflight permits the order idempotency header', async () => {
  const response = await fetch(`${baseUrl}/api/orders`, {
    method: 'OPTIONS',
    headers: {
      Origin: 'http://localhost:5173',
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'authorization,content-type,idempotency-key',
    },
  });
  assert.equal(response.status, 204);
  assert.match(response.headers.get('access-control-allow-headers') || '', /Idempotency-Key/i);
});
