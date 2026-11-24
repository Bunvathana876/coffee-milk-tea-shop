import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

// Isolate test backend to in-memory database
process.env.NODE_ENV = 'test';
process.env.ENVIRONMENT = 'test';
process.env.ALLOW_IN_MEMORY_DB = 'true';
process.env.DATABASE_URL = 'postgresql://127.0.0.1:1/isolated';

// In-memory localStorage mock for Node test runner
const storage = new Map<string, string>();
const fakeLocalStorage = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, String(value)),
  removeItem: (key: string) => storage.delete(key),
  clear: () => storage.clear(),
};
(globalThis as any).localStorage = fakeLocalStorage;

const { startServer } = await import('../../../backend/src/server.js');
const { seedDatabase } = await import('../../../backend/src/db/seed.js');
const { closeDatabase } = await import('../../../backend/src/db/database.js');
const { createToken } = await import('../../../backend/src/middleware/auth.js');

import {
  setApiBaseUrl,
  checkBackendHealth,
  getCategories,
  getProducts,
  registerCustomer,
  loginCustomer,
  getCustomerProfile,
  updateCustomerProfile,
} from './api';
import {
  fetchCategories,
  fetchCategoryById,
} from './categoryService';
import {
  fetchProducts,
  fetchProductById,
} from './productService';
import {
  createOrder,
  getOrderById,
  getOrderByReference,
  getMyOrders,
  getOrdersByPhone,
} from './orderService';
import {
  connectNotificationStream,
  getMyNotifications,
  markNotificationRead,
} from './notificationService';

let server: any;
let baseUrl: string;

test.before(async () => {
  server = await startServer(0);
  const port = server.address().port;
  baseUrl = `http://localhost:${port}`;
  setApiBaseUrl(baseUrl);
  await seedDatabase();
});

test.after(async () => {
  setApiBaseUrl(null);
  storage.clear();
  if (server) {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
  await closeDatabase();
});

test('1. Website Storefront Integration: Health check returns healthy', async () => {
  const health = await checkBackendHealth();
  assert.equal(health.status, 'healthy');
  assert.equal(health.app, 'Coffee & Milk Tea Shop API');
});

test('2. Website Storefront Integration: Categories service retrieves categories with counts', async () => {
  const categories = await getCategories();
  assert.ok(Array.isArray(categories));
  assert.ok(categories.length > 0, 'Categories should not be empty');

  const firstCat = categories[0];
  assert.ok(firstCat.id > 0);
  assert.ok(firstCat.name);
  assert.equal(typeof firstCat.product_count, 'number');

  // Verify fetchCategories and fetchCategoryById
  const activeCats = await fetchCategories(true);
  assert.equal(activeCats.length, categories.length);

  const singleCat = await fetchCategoryById(firstCat.id);
  assert.equal(singleCat.id, firstCat.id);
  assert.equal(singleCat.name, firstCat.name);
});

test('3. Website Storefront Integration: Products service supports listing, filtering and detail lookup', async () => {
  const allProducts = await getProducts();
  assert.ok(Array.isArray(allProducts));
  assert.ok(allProducts.length > 0, 'Products should not be empty');

  const sample = allProducts[0];
  assert.ok(sample.id > 0);
  assert.ok(sample.name);
  assert.ok(typeof sample.base_price_usd === 'number');

  // Filter by category_id
  const filteredById = await fetchProducts({ categoryId: sample.category_id });
  assert.ok(filteredById.length > 0);
  for (const p of filteredById) {
    assert.equal(p.category_id, sample.category_id);
  }

  // Filter by search query
  const searchResults = await fetchProducts({ search: sample.name.slice(0, 4) });
  assert.ok(searchResults.length > 0);
  assert.ok(searchResults.some((p) => p.id === sample.id));

  // Single product fetch
  const singleProduct = await fetchProductById(sample.id);
  assert.equal(singleProduct.id, sample.id);
  assert.equal(singleProduct.name, sample.name);
});

test('4. Website Storefront Integration: Customer Auth lifecycle (register, login, me, patch profile)', async () => {
  const uniquePhone = `012${Math.floor(100000 + Math.random() * 900000)}`;
  const uniqueEmail = `testcustomer_${Date.now()}@example.com`;

  // Register
  const registerRes = await registerCustomer({
    full_name: 'Storefront Customer Test',
    phone: uniquePhone,
    email: uniqueEmail,
    password: 'password123',
  });
  assert.ok(registerRes.access_token);
  assert.equal(registerRes.user.full_name, 'Storefront Customer Test');
  assert.equal(registerRes.user.phone, uniquePhone);
  assert.equal(registerRes.user.loyalty_stamps, 0);

  // Login with phone
  const loginRes = await loginCustomer({
    identifier: uniquePhone,
    password: 'password123',
  });
  assert.ok(loginRes.access_token);
  assert.equal(loginRes.user.id, registerRes.user.id);

  // Fetch current profile
  const profile = await getCustomerProfile(loginRes.access_token);
  assert.equal(profile.id, registerRes.user.id);
  assert.equal(profile.phone, uniquePhone);

  // Update profile
  const updated = await updateCustomerProfile(loginRes.access_token, {
    full_name: 'Updated Storefront Customer',
    email: `updated_${uniqueEmail}`,
  });
  assert.equal(updated.full_name, 'Updated Storefront Customer');
  assert.equal(updated.email, `updated_${uniqueEmail}`);
});

test('5. Website Storefront Integration: Order placement, idempotency replay, lookup by ID/Ref/Phone, and customer orders', async () => {
  const products = await getProducts();
  assert.ok(products.length >= 2);
  const p1 = products[0];
  const p2 = products[1];

  const uniquePhone = `098${Math.floor(100000 + Math.random() * 900000)}`;
  const customerReg = await registerCustomer({
    full_name: 'Ordering Customer',
    phone: uniquePhone,
    password: 'securePassword123',
  });
  storage.set('coffee_customer_token', customerReg.access_token);

  const idempotencyKey = randomUUID();
  const orderPayload = {
    customer_name: 'Ordering Customer',
    customer_phone: uniquePhone,
    notes: 'Extra sweet, website test',
    payment_method: 'cash' as const,
    items: [
      {
        product_id: p1.id,
        quantity: 2,
        size: 'Large',
        sugar_level: '75%',
        ice_level: 'Normal Ice',
        toppings: ['Brown Sugar Pearls'],
      },
      {
        product_id: p2.id,
        quantity: 1,
        size: 'Medium',
        sugar_level: '100%',
        ice_level: 'No Ice',
        toppings: [],
      },
    ],
  };

  // Create order
  const createdOrder = await createOrder(orderPayload, idempotencyKey);
  assert.ok(createdOrder.id > 0);
  assert.ok(createdOrder.order_number.startsWith('ORD-'));
  assert.equal(createdOrder.customer_name, 'Ordering Customer');
  assert.equal(createdOrder.customer_phone, uniquePhone);
  assert.equal(createdOrder.order_status, 'pending');
  assert.equal(createdOrder.payment_status, 'unpaid');
  assert.equal(createdOrder.items.length, 2);
  assert.ok(createdOrder.total_usd > 0);
  assert.ok(createdOrder.total_khr > 0);

  // Idempotency replay: exact same payload and key returns exact same order without duplicate
  const replayedOrder = await createOrder(orderPayload, idempotencyKey);
  assert.equal(replayedOrder.id, createdOrder.id);
  assert.equal(replayedOrder.order_number, createdOrder.order_number);

  // Lookup by ID
  const fetchedById = await getOrderById(createdOrder.id);
  assert.equal(fetchedById.id, createdOrder.id);
  assert.equal(fetchedById.order_number, createdOrder.order_number);

  // Lookup by Reference
  const fetchedByRef = await getOrderByReference(createdOrder.order_number);
  assert.equal(fetchedByRef.id, createdOrder.id);
  assert.equal(fetchedByRef.customer_phone, uniquePhone);

  // Lookup by Phone
  const ordersForPhone = await getOrdersByPhone(uniquePhone);
  assert.ok(ordersForPhone.length >= 1);
  assert.ok(ordersForPhone.some((o) => o.id === createdOrder.id));

  // Get customer's orders using Bearer token (getMyOrders)
  const myOrders = await getMyOrders();
  assert.ok(myOrders.length >= 1);
  assert.ok(myOrders.some((o) => o.id === createdOrder.id));
});

test('6. Kitchen Display System (KDS) & Customer Tracking: Status advances through Pending -> Preparing -> Ready -> Completed and customer observes real-time updates', async () => {
  const adminToken = createToken({ sub: 1, role: 'admin' });
  const uniquePhone = `099${Math.floor(100000 + Math.random() * 900000)}`;

  // Register and authenticate customer
  const reg = await registerCustomer({
    full_name: 'KDS Tracking Customer',
    phone: uniquePhone,
    password: 'Password123!',
  });
  assert.ok(reg.access_token);
  storage.set('coffee_customer_token', reg.access_token);

  // Fetch product for order
  const products = await getProducts();
  const product = products[0];

  // Customer places order
  const idempotencyKey = `kds-${randomUUID()}`;
  const order = await createOrder(
    {
      customer_name: 'KDS Tracking Customer',
      customer_phone: uniquePhone,
      items: [
        {
          product_id: product.id,
          quantity: 1,
          size: 'Medium',
          sugar_level: '50%',
          ice_level: 'Normal Ice',
          toppings: [],
        },
      ],
      payment_method: 'cash',
    },
    idempotencyKey,
  );

  // Stage 1: Verified Pending
  assert.equal(order.order_status, 'pending');
  let customerView = await getOrderById(order.id);
  assert.equal(customerView.order_status, 'pending');

  // Customer phone lookup also verifies Pending
  let customerOrders = await getOrdersByPhone(uniquePhone);
  assert.equal(customerOrders[0].order_status, 'pending');

  // Invalid skip transition: Pending directly to Completed must be rejected (409)
  const invalidSkip = await fetch(`${baseUrl}/api/admin/orders/${order.id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ order_status: 'completed' }),
  });
  assert.equal(invalidSkip.status, 409);

  // Kitchen advances to Stage 2: Preparing ("Start Brewing")
  const toPreparingRes = await fetch(`${baseUrl}/api/admin/orders/${order.id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ order_status: 'preparing' }),
  });
  assert.equal(toPreparingRes.status, 200);
  const preparingOrder = (await toPreparingRes.json()) as any;
  assert.equal(preparingOrder.order_status, 'preparing');

  // Customer observes update to Preparing
  customerView = await getOrderById(order.id);
  assert.equal(customerView.order_status, 'preparing');
  customerOrders = await getOrdersByPhone(uniquePhone);
  assert.equal(customerOrders[0].order_status, 'preparing');

  // Kitchen advances to Stage 3: Ready ("Mark Ready")
  const toReadyRes = await fetch(`${baseUrl}/api/admin/orders/${order.id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ order_status: 'ready' }),
  });
  assert.equal(toReadyRes.status, 200);
  const readyOrder = (await toReadyRes.json()) as any;
  assert.equal(readyOrder.order_status, 'ready');

  // Customer observes update to Ready
  customerView = await getOrderById(order.id);
  assert.equal(customerView.order_status, 'ready');
  customerOrders = await getOrdersByPhone(uniquePhone);
  assert.equal(customerOrders[0].order_status, 'ready');

  // Kitchen advances to Stage 4: Completed ("Complete Order")
  const toCompletedRes = await fetch(`${baseUrl}/api/admin/orders/${order.id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ order_status: 'completed' }),
  });
  assert.equal(toCompletedRes.status, 200);
  const completedOrder = (await toCompletedRes.json()) as any;
  assert.equal(completedOrder.order_status, 'completed');

  // Customer observes update to Completed
  customerView = await getOrderById(order.id);
  assert.equal(customerView.order_status, 'completed');
  customerOrders = await getOrdersByPhone(uniquePhone);
  assert.equal(customerOrders[0].order_status, 'completed');

  // Terminal state: Completed order cannot transition backwards to Pending or Preparing
  const invalidBackward = await fetch(`${baseUrl}/api/admin/orders/${order.id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ order_status: 'pending' }),
  });
  assert.equal(invalidBackward.status, 409);
});

test('7. Checkout Reliability: Multiple rapid concurrent checkout taps collapse to single order and network retry preserves order identity', async () => {
  const uniquePhone = `088${Math.floor(100000 + Math.random() * 900000)}`;

  // Register and authenticate customer
  const reg = await registerCustomer({
    full_name: 'Concurrent Tap Customer',
    phone: uniquePhone,
    password: 'Password123!',
  });
  assert.ok(reg.access_token);
  storage.set('coffee_customer_token', reg.access_token);

  const products = await getProducts();
  const product = products[0];

  const payload: CreateOrderPayload = {
    customer_name: 'Concurrent Tap Customer',
    customer_phone: uniquePhone,
    customer_email: null,
    notes: '[STORE PICKUP: BKK1 Branch]',
    payment_method: 'cash',
    items: [
      {
        product_id: product.id,
        quantity: 1,
        size: 'Medium',
        sugar_level: '50%',
        ice_level: 'Normal Ice',
        toppings: [],
      },
    ],
  };

  const sharedIdempotencyKey = `concur-${randomUUID()}`;

  // Simulate 6 rapid, concurrent taps of "Place Order" using the same idempotency key
  const concurrentResults = await Promise.all(
    Array.from({ length: 6 }, () => createOrder(payload, sharedIdempotencyKey)),
  );

  // All 6 invocations must return the EXACT same order ID and order number
  const firstId = concurrentResults[0].id;
  const firstRef = concurrentResults[0].order_number;
  for (const res of concurrentResults) {
    assert.equal(res.id, firstId);
    assert.equal(res.order_number, firstRef);
  }

  // Customer order history must contain EXACTLY ONE order for this phone
  const customerOrders = await getOrdersByPhone(uniquePhone);
  assert.equal(customerOrders.length, 1);
  assert.equal(customerOrders[0].id, firstId);

  // Customer profile loyalty stamps must be incremented by EXACTLY 1, not 6
  const profile = await getCustomerProfile(reg.access_token);
  assert.equal(profile.loyalty_stamps, 1);

  // Simulate network retry: customer re-submits after timeout/disconnect with same key
  const retriedOrder = await createOrder(payload, sharedIdempotencyKey);
  assert.equal(retriedOrder.id, firstId);
  assert.equal(retriedOrder.order_number, firstRef);

  // Customer order history and loyalty stamps still remain exactly 1
  const afterRetryOrders = await getOrdersByPhone(uniquePhone);
  assert.equal(afterRetryOrders.length, 1);
  const afterRetryProfile = await getCustomerProfile(reg.access_token);
  assert.equal(afterRetryProfile.loyalty_stamps, 1);
});

test('8. Customer Pickup Notifications: Management portal marking drink Ready alerts customer in real time and persists unread notification', async () => {
  const adminToken = createToken({ sub: 1, role: 'admin' });
  const uniquePhone = `077${Math.floor(100000 + Math.random() * 900000)}`;

  const reg = await registerCustomer({
    full_name: 'Pickup Alert Customer',
    phone: uniquePhone,
    password: 'Password123!',
  });
  storage.set('coffee_customer_token', reg.access_token);

  const products = await getProducts();
  const drink = products[0];

  const order = await createOrder(
    {
      customer_name: 'Pickup Alert Customer',
      customer_phone: uniquePhone,
      payment_method: 'cash',
      items: [
        {
          product_id: drink.id,
          product_name: drink.name,
          quantity: 1,
          unit_price_usd: drink.base_price_usd,
          subtotal_usd: drink.base_price_usd,
          size: 'Medium',
          sugar_level: '50%',
          ice_level: 'Normal Ice',
          toppings: [],
        },
      ],
    },
    `notif-e2e-${randomUUID()}`,
  );

  // Connect live SSE notification stream as the signed-in customer
  const controller = new AbortController();
  let connectedResolve!: () => void;
  let readyNotifResolve!: (n: any) => void;
  let syncResolve!: (e: any) => void;

  const connectedPromise = new Promise<void>(resolve => {
    connectedResolve = resolve;
  });
  const readyNotifPromise = new Promise<any>(resolve => {
    readyNotifResolve = resolve;
  });
  const syncPromise = new Promise<any>(resolve => {
    syncResolve = resolve;
  });

  const streamTask = connectNotificationStream({
    token: reg.access_token,
    signal: controller.signal,
    onConnected: () => connectedResolve(),
    onNotification: n => readyNotifResolve(n),
    onSync: e => syncResolve(e),
  }).catch(() => {});

  try {
    await connectedPromise;

    // Management portal moves pending -> preparing (no ready alert yet)
    const prepRes = await fetch(`${baseUrl}/api/admin/orders/${order.id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ order_status: 'preparing' }),
    });
    assert.equal(prepRes.status, 200);

    // Management portal marks drink READY -> triggers live customer alert
    const readyRes = await fetch(`${baseUrl}/api/admin/orders/${order.id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ order_status: 'ready' }),
    });
    assert.equal(readyRes.status, 200);
    const readyBody = (await readyRes.json()) as { order_status: string; customer_notified: boolean };
    assert.equal(readyBody.order_status, 'ready');
    assert.equal(readyBody.customer_notified, true);

    const pushed = await readyNotifPromise;
    assert.equal(pushed.order_id, order.id);
    assert.equal(pushed.order_number, order.order_number);
    assert.equal(pushed.type, 'order_ready');
    assert.equal(pushed.is_read, false);

    // Persisted notifications API confirms unread alert
    const list = await getMyNotifications({ token: reg.access_token });
    assert.equal(list.unread_count, 1);
    assert.equal(list.items[0].order_number, order.order_number);

    // Customer marks alert read
    const readRes = await markNotificationRead(pushed.id, reg.access_token);
    assert.equal(readRes.notification.is_read, true);
    assert.equal(readRes.unread_count, 0);

    // Management portal completes order -> SSE sync fires
    const compRes = await fetch(`${baseUrl}/api/admin/orders/${order.id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ order_status: 'completed' }),
    });
    assert.equal(compRes.status, 200);
    const syncEvent = await syncPromise;
    assert.equal(syncEvent.order_id, order.id);
    assert.equal(syncEvent.order_status, 'completed');
  } finally {
    controller.abort();
    await streamTask;
  }
});
