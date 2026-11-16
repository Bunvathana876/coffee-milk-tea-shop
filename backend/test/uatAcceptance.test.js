import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

process.env.NODE_ENV = 'test';
process.env.ENVIRONMENT = 'test';
process.env.ALLOW_IN_MEMORY_DB = 'true';
process.env.DATABASE_URL = 'postgresql://127.0.0.1:1/isolated';

const { startServer } = await import('../src/server.js');
const { createToken } = await import('../src/middleware/auth.js');
const { dbQuery } = await import('../src/db/database.js');
const { seedDatabase } = await import('../src/db/seed.js');

let server;
let baseUrl;
let adminId;
let adminToken;
let testCustomerId;
let customerToken;
let testProductId;

test.before(async () => {
  server = await startServer(0);
  const port = server.address().port;
  baseUrl = `http://localhost:${port}`;

  await seedDatabase();

  // Create an administrator
  const adminRes = await dbQuery(
    `INSERT INTO staff_users (email, full_name, role, password_hash, is_active)
     VALUES ($1, $2, $3, $4, TRUE)
     RETURNING id`,
    ['uat-manager@brewboba.com', 'UAT Store Manager', 'admin', 'uat_hash'],
  );
  adminId = adminRes.rows[0].id;
  adminToken = createToken({ sub: adminId, role: 'admin' });

  // Get a seeded available product
  const productRes = await dbQuery(
    `SELECT id, name, base_price_usd FROM products WHERE is_available = TRUE LIMIT 1`,
  );
  assert.ok(productRes.rows.length > 0, 'Seed products must exist');
  testProductId = productRes.rows[0].id;
});

test.after(() => {
  if (server) {
    server.close();
  }
});

// =========================================================================
// Persona 1: Customer Acceptance Scenarios
// =========================================================================
test.describe('UAT Persona 1: Customer End-to-End Ordering & Loyalty Flow', () => {
  let createdOrderId;
  let createdOrderNumber;
  const idempotencyKey = randomUUID();

  test('UAT-C01: Customer discovers menu categories and products', async () => {
    // 1. Categories
    const catRes = await fetch(`${baseUrl}/api/categories`);
    assert.equal(catRes.status, 200);
    const categories = await catRes.json();
    assert.ok(Array.isArray(categories));
    assert.ok(categories.length >= 3, 'Expected at least 3 categories');

    // 2. Products with category filter and availability
    const prodRes = await fetch(`${baseUrl}/api/products?category_id=${categories[0].id}`);
    assert.equal(prodRes.status, 200);
    const products = await prodRes.json();
    assert.ok(Array.isArray(products));
    for (const p of products) {
      assert.equal(p.category_id, categories[0].id);
      assert.ok(p.base_price_usd > 0);
    }
  });

  test('UAT-C02: Customer registers account and verifies profile', async () => {
    const registerRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: 'Channary Seng',
        phone: '012889900',
        email: 'channary.uat@example.com',
        password: 'Password123!',
      }),
    });
    assert.equal(registerRes.status, 201);
    const regData = await registerRes.json();
    assert.ok(regData.access_token);
    assert.equal(regData.user.full_name, 'Channary Seng');
    assert.equal(regData.user.loyalty_stamps, 0);

    customerToken = regData.access_token;
    testCustomerId = regData.user.id;

    // Verify /me endpoint
    const meRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert.equal(meRes.status, 200);
    const meData = await meRes.json();
    assert.equal(meData.phone, '012889900');
  });

  test('UAT-C03: Customer submits customized drink order with idempotency protection', async () => {
    const orderPayload = {
      customer_name: 'Channary Seng',
      customer_phone: '012889900',
      customer_email: 'channary.uat@example.com',
      notes: 'Less sweet, please wrap for takeaway',
      payment_method: 'cash',
      items: [
        {
          product_id: testProductId,
          product_name: 'Signature Drink',
          quantity: 2,
          unit_price_usd: 3.50,
          subtotal_usd: 7.00,
          size: 'Large',
          sugar_level: '50%',
          ice_level: 'Less Ice',
          toppings: 'Brown Sugar Pearls, Coconut Jelly',
        },
      ],
    };

    // First attempt: create order
    const orderRes1 = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(orderPayload),
    });
    assert.equal(orderRes1.status, 201);
    const orderData1 = await orderRes1.json();
    assert.ok(orderData1.id);
    assert.ok(orderData1.order_number);
    assert.equal(orderData1.payment_status, 'unpaid');
    assert.equal(orderData1.order_status, 'pending');
    assert.equal(orderData1.items.length, 1);
    assert.equal(orderData1.items[0].toppings, 'Brown Sugar Pearls, Coconut Jelly');

    createdOrderId = orderData1.id;
    createdOrderNumber = orderData1.order_number;

    // Second attempt with SAME Idempotency-Key: must return the exact same order without duplicates
    const orderRes2 = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(orderPayload),
    });
    assert.equal(orderRes2.status, 200);
    const orderData2 = await orderRes2.json();
    assert.equal(orderData2.id, createdOrderId);
    assert.equal(orderData2.order_number, createdOrderNumber);
  });

  test('UAT-C04: Customer checks order history and tracks status by reference', async () => {
    // 1. Order history
    const historyRes = await fetch(`${baseUrl}/api/orders`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert.equal(historyRes.status, 200);
    const historyData = await historyRes.json();
    assert.ok(Array.isArray(historyData));
    const found = historyData.find((o) => o.id === createdOrderId);
    assert.ok(found, 'Placed order must appear in customer order history');
    assert.equal(found.order_status, 'pending');

    // 2. Track by reference number
    const trackRes = await fetch(`${baseUrl}/api/orders/ref/${createdOrderNumber}`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert.equal(trackRes.status, 200);
    const trackData = await trackRes.json();
    assert.equal(trackData.id, createdOrderId);
    assert.equal(trackData.customer_name, 'Channary Seng');
  });

  test('UAT-C05: Loyalty stamps increment on customer account', async () => {
    const meRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert.equal(meRes.status, 200);
    const meData = await meRes.json();
    assert.equal(meData.loyalty_stamps, 1, 'Customer earns 1 stamp for order');
  });
});

// =========================================================================
// Persona 2: Kitchen Staff & Barista Operations
// =========================================================================
test.describe('UAT Persona 2: Kitchen Display System (KDS) & Ticket Advancement', () => {
  let pendingOrderId;
  let pendingOrderNumber;

  test.before(async () => {
    // Create a new order with valid customer token for KDS progression
    const res = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        customer_name: 'Dara Pich',
        customer_phone: '011223344',
        payment_method: 'cash',
        items: [
          {
            product_id: testProductId,
            product_name: 'Iced Milk Tea',
            quantity: 1,
            unit_price_usd: 2.75,
            subtotal_usd: 2.75,
            size: 'Medium',
            sugar_level: '50%',
            ice_level: 'Normal Ice',
            toppings: 'Brown Sugar Pearls',
          },
        ],
      }),
    });
    assert.equal(res.status, 201);
    const data = await res.json();
    pendingOrderId = data.id;
    pendingOrderNumber = data.order_number;
  });

  test('UAT-K01: Kitchen accesses KDS order queue', async () => {
    const kdsRes = await fetch(`${baseUrl}/api/admin/orders`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(kdsRes.status, 200);
    const kdsData = await kdsRes.json();
    assert.ok(Array.isArray(kdsData.items), 'KDS orders must be an array');
    const ticket = kdsData.items.find((o) => o.id === pendingOrderId);
    assert.ok(ticket, 'KDS ticket must exist in queue');
    assert.equal(ticket.order_status, 'pending');
    assert.ok(kdsData.counts_by_status !== undefined);
  });

  test('UAT-K02: Kitchen advances ticket from Pending to Preparing', async () => {
    const patchRes = await fetch(`${baseUrl}/api/admin/orders/${pendingOrderId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ order_status: 'preparing' }),
    });
    assert.equal(patchRes.status, 200);
    const updated = await patchRes.json();
    assert.equal(updated.order_status, 'preparing');
  });

  test('UAT-K03: Kitchen advances ticket from Preparing to Ready', async () => {
    const patchRes = await fetch(`${baseUrl}/api/admin/orders/${pendingOrderId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ order_status: 'ready' }),
    });
    assert.equal(patchRes.status, 200);
    const updated = await patchRes.json();
    assert.equal(updated.order_status, 'ready');
  });

  test('UAT-K04: Kitchen marks ticket Completed upon customer handoff', async () => {
    const patchRes = await fetch(`${baseUrl}/api/admin/orders/${pendingOrderId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ order_status: 'completed' }),
    });
    assert.equal(patchRes.status, 200);
    const updated = await patchRes.json();
    assert.equal(updated.order_status, 'completed');
  });

  test('UAT-K05: Terminal state protection: Completed order cannot regress to Pending', async () => {
    const patchRes = await fetch(`${baseUrl}/api/admin/orders/${pendingOrderId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ order_status: 'pending' }),
    });
    // Completed orders cannot transition back to pending (409 Conflict)
    assert.equal(patchRes.status, 409);
  });
});

// =========================================================================
// Persona 3: Store Manager & Admin Operations
// =========================================================================
test.describe('UAT Persona 3: Store Management, Revenue & Cash Settlement', () => {
  let cashOrderId;

  test.before(async () => {
    const res = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        customer_name: 'Vannak Kem',
        customer_phone: '017556677',
        payment_method: 'cash',
        items: [
          {
            product_id: testProductId,
            product_name: 'Latte',
            quantity: 1,
            unit_price_usd: 3.00,
            subtotal_usd: 3.00,
            size: 'Medium',
            sugar_level: '50%',
            ice_level: 'Normal Ice',
          },
        ],
      }),
    });
    assert.equal(res.status, 201);
    const data = await res.json();
    cashOrderId = data.id;

    // Advance order pending -> preparing -> ready so it qualifies for cash settlement
    await fetch(`${baseUrl}/api/admin/orders/${cashOrderId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ order_status: 'preparing' }),
    });
    const patchRes = await fetch(`${baseUrl}/api/admin/orders/${cashOrderId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ order_status: 'ready' }),
    });
    assert.equal(patchRes.status, 200);
  });

  test('UAT-A01: Store manager views dashboard KPI metrics and sales summary', async () => {
    const summaryRes = await fetch(`${baseUrl}/api/admin/dashboard/summary`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(summaryRes.status, 200);
    const summary = await summaryRes.json();
    assert.ok(summary.total_orders !== undefined);
    assert.ok(summary.pending_orders !== undefined);
    assert.ok(typeof summary.total_sales_usd === 'number');
  });

  test('UAT-A02: Manager audits and settles cash payment at register', async () => {
    // Check initial payment status
    const orderBefore = await fetch(`${baseUrl}/api/admin/orders/${cashOrderId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(orderBefore.status, 200);
    const beforeData = await orderBefore.json();
    assert.equal(beforeData.payment_status, 'unpaid');

    // Settle cash
    const settleRes = await fetch(`${baseUrl}/api/admin/orders/${cashOrderId}/cash-settlement`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        confirm_cash_received: true,
        reference: 'CASH-REC-UAT-991',
      }),
    });
    assert.equal(settleRes.status, 201);
    const settleData = await settleRes.json();
    assert.equal(settleData.reference, 'CASH-REC-UAT-991');

    // Verify order payment_status updated to paid
    const orderAfter = await fetch(`${baseUrl}/api/admin/orders/${cashOrderId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const afterData = await orderAfter.json();
    assert.equal(afterData.payment_status, 'paid');

    // Verify payment settlement audit log in database
    const settlements = await dbQuery(
      `SELECT * FROM payment_settlements WHERE order_id = $1`,
      [cashOrderId],
    );
    assert.equal(settlements.rows.length, 1);
    assert.equal(Number(settlements.rows[0].amount_usd), Number(beforeData.total_usd));
  });

  test('UAT-A03: Manager toggles drink inventory availability', async () => {
    // Deactivate product
    const patchRes1 = await fetch(`${baseUrl}/api/admin/products/${testProductId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        is_available: false,
      }),
    });
    assert.equal(patchRes1.status, 200);

    // Verify it disappears from active catalog
    const activeRes = await fetch(`${baseUrl}/api/products?is_available=true`);
    assert.equal(activeRes.status, 200);
    const activeProducts = await activeRes.json();
    const foundActive = activeProducts.find((p) => p.id === testProductId);
    assert.equal(foundActive, undefined, 'Deactivated drink must not show in active catalog');

    // Reactivate product
    const patchRes2 = await fetch(`${baseUrl}/api/admin/products/${testProductId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        is_available: true,
      }),
    });
    assert.equal(patchRes2.status, 200);

    // Verify it reappears in active catalog
    const activeRes2 = await fetch(`${baseUrl}/api/products?is_available=true`);
    const activeProducts2 = await activeRes2.json();
    const foundActive2 = activeProducts2.find((p) => p.id === testProductId);
    assert.ok(foundActive2, 'Reactivated drink must show in active catalog');
  });
});

// =========================================================================
// Persona 4: Multi-Tenant Store & RBAC Boundary Protection
// =========================================================================
test.describe('UAT Persona 4: Multi-Store RBAC & Data Isolation', () => {
  let storeId;
  let sellerStaffId;
  let sellerToken;

  test('UAT-S01: Admin creates a retail store location', async () => {
    const storeCode = `BKK1-${Date.now()}`;
    const storeRes = await fetch(`${baseUrl}/api/admin/stores`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'BKK1 Flagship Café',
        code: storeCode,
        address: 'St 306, BKK1, Phnom Penh',
      }),
    });
    assert.equal(storeRes.status, 201);
    const storeData = await storeRes.json();
    assert.ok(storeData.id);
    assert.equal(storeData.name, 'BKK1 Flagship Café');
    storeId = storeData.id;
  });

  test('UAT-S02: Admin registers seller and assigns to store', async () => {
    // 1. Create seller
    const sellerRes = await fetch(`${baseUrl}/api/admin/sellers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        full_name: 'Bopha Seller',
        email: `bopha.${Date.now()}@brewboba.com`,
        password: 'Password123!',
      }),
    });
    assert.equal(sellerRes.status, 201);
    const sellerData = await sellerRes.json();
    sellerStaffId = sellerData.id;
    sellerToken = createToken({ sub: sellerStaffId, role: 'seller' });

    // 2. Assign to store
    const assignRes = await fetch(`${baseUrl}/api/admin/sellers/${sellerStaffId}/stores`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ store_id: storeId }),
    });
    assert.equal(assignRes.status, 201);
  });

  test('UAT-S03: Seller reads assigned store data; unauthorized mutations rejected', async () => {
    // Seller gets assigned store
    const storeRes = await fetch(`${baseUrl}/api/seller/stores`, {
      headers: { Authorization: `Bearer ${sellerToken}` },
    });
    assert.equal(storeRes.status, 200);
    const storeData = await storeRes.json();
    const stores = storeData.items || storeData;
    assert.ok(Array.isArray(stores));
    assert.ok(stores.some((s) => s.id === storeId));

    // Seller tries unauthorized order mutation (POST/PUT/DELETE) -> 405 Method Not Allowed
    const mutateRes = await fetch(`${baseUrl}/api/seller/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sellerToken}`,
      },
      body: JSON.stringify({ notes: 'Hack' }),
    });
    assert.equal(mutateRes.status, 405);
  });

  test('UAT-S04: Protection: Store with orders cannot be deleted (ON DELETE RESTRICT)', async () => {
    // Create an order linked to this store
    await dbQuery(
      `INSERT INTO orders (order_number, customer_name, customer_phone, subtotal_usd, total_usd, total_khr, store_id)
       VALUES ($1, $2, $3, 3.5, 3.5, 14350, $4)`,
      ['ORD-STORE-PROTECT', 'Test Customer', '012998877', storeId],
    );

    // Attempt to delete store
    const deleteRes = await fetch(`${baseUrl}/api/admin/stores/${storeId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    // Must be rejected with 400 Bad Request protecting historical orders
    assert.equal(deleteRes.status, 400);
  });
});
