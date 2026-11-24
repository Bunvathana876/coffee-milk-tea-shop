import test from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';
process.env.ENVIRONMENT = 'test';
process.env.ALLOW_IN_MEMORY_DB = 'true';
process.env.DATABASE_URL = 'postgresql://127.0.0.1:1/isolated';

const { startServer } = await import('../src/server.js');
const { seedDatabase } = await import('../src/db/seed.js');
const { dbQuery, closeDatabase } = await import('../src/db/database.js');
const { createToken } = await import('../src/middleware/auth.js');
const { closeAllNotificationStreams } = await import('../src/utils/notificationHub.js');

let server;
let baseUrl;
let adminToken;
let firstProductId;

test.before(async () => {
  server = await startServer(0);
  baseUrl = `http://localhost:${server.address().port}`;
  await seedDatabase();
  adminToken = createToken({ sub: 1, role: 'admin' });
  const productsRes = await fetch(`${baseUrl}/api/products`);
  const products = await productsRes.json();
  firstProductId = products[0].id;
});

test.after(async () => {
  closeAllNotificationStreams();
  if (server) {
    await new Promise(resolve => server.close(() => resolve()));
  }
  await closeDatabase();
});

async function apiJson(path, options = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  let data = text;
  try {
    data = JSON.parse(text);
  } catch {
    // keep raw text
  }
  return { status: res.status, data };
}

async function registerTestCustomer(tag) {
  const phone = `017${String(Date.now()).slice(-4)}${Math.floor(100 + Math.random() * 899)}`;
  const res = await apiJson('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      full_name: `Customer ${tag}`,
      phone,
      email: `notif_${tag}_${Date.now()}@example.com`,
      password: 'Password123!',
    }),
  });
  assert.equal(res.status, 201);
  return {
    token: res.data.access_token,
    user: res.data.user,
    phone,
  };
}

async function placeCustomerOrder(customer, quantity = 2) {
  const res = await apiJson('/api/orders', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${customer.token}`,
      'Idempotency-Key': `notif-order-${Date.now()}-${Math.random()}`,
    },
    body: JSON.stringify({
      customer_name: customer.user.full_name,
      customer_phone: customer.phone,
      payment_method: 'cash',
      items: [
        {
          product_id: firstProductId,
          quantity,
          size: 'Large',
          sugar_level: '50%',
          ice_level: 'Normal Ice',
          toppings: ['Brown Sugar Pearls'],
        },
      ],
    }),
  });
  assert.equal(res.status, 201);
  return res.data;
}

async function readSseEvent(reader, decoder, targetEvent, timeoutMs = 4000) {
  let buffer = '';
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const remaining = Math.max(10, deadline - Date.now());
    const chunk = await Promise.race([
      reader.read(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Timed out waiting for SSE event "${targetEvent}"`)), remaining),
      ),
    ]);
    if (chunk.done) throw new Error('SSE stream ended unexpectedly');
    buffer += decoder.decode(chunk.value, { stream: true });
    const blocks = buffer.split(/\r?\n\r?\n/);
    buffer = blocks.pop() ?? '';
    for (const block of blocks) {
      let eventName = 'message';
      let dataLine = '';
      for (const line of block.split(/\r?\n/)) {
        if (line.startsWith('event:')) eventName = line.slice(6).trim();
        if (line.startsWith('data:')) dataLine += line.slice(5).trim();
      }
      if (eventName === targetEvent && dataLine) {
        return JSON.parse(dataLine);
      }
    }
  }
  throw new Error(`Timed out waiting for SSE event "${targetEvent}"`);
}

test('1. Notifications endpoints require valid customer JWT (reject guests and staff/admin tokens)', async () => {
  const guestList = await apiJson('/api/notifications');
  assert.equal(guestList.status, 401);

  const guestStream = await fetch(`${baseUrl}/api/notifications/stream`);
  assert.equal(guestStream.status, 401);

  const adminAttempt = await apiJson('/api/notifications', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(adminAttempt.status, 401);

  const guestReadAll = await apiJson('/api/notifications/read-all', {
    method: 'PATCH',
    body: JSON.stringify({}),
  });
  assert.equal(guestReadAll.status, 401);
});

test('2. Marking an order Ready persists a pickup notification and pushes real-time SSE alert to the customer', async () => {
  const customerA = await registerTestCustomer('alpha');
  const customerB = await registerTestCustomer('beta');
  const order = await placeCustomerOrder(customerA, 2);

  // Open Customer A's live SSE stream
  const abortController = new AbortController();
  const streamRes = await fetch(`${baseUrl}/api/notifications/stream`, {
    headers: {
      Accept: 'text/event-stream',
      Authorization: `Bearer ${customerA.token}`,
    },
    signal: abortController.signal,
  });
  assert.equal(streamRes.status, 200);
  assert.ok(streamRes.headers.get('content-type')?.includes('text/event-stream'));

  const reader = streamRes.body.getReader();
  const decoder = new TextDecoder();

  try {
    const connectedPayload = await readSseEvent(reader, decoder, 'connected');
    assert.equal(connectedPayload.status, 'connected');
    assert.equal(connectedPayload.customer_id, customerA.user.id);

    // Step 1: Pending -> Preparing must NOT send a drink-ready notification yet
    const prepRes = await apiJson(`/api/admin/orders/${order.id}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ order_status: 'preparing' }),
    });
    assert.equal(prepRes.status, 200);
    assert.equal(prepRes.data.order_status, 'preparing');
    assert.equal(prepRes.data.customer_notified, false);

    const beforeReady = await apiJson('/api/notifications', {
      headers: { Authorization: `Bearer ${customerA.token}` },
    });
    assert.equal(beforeReady.status, 200);
    assert.equal(beforeReady.data.unread_count, 0);
    assert.equal(beforeReady.data.items.length, 0);

    // Step 2: Preparing -> Ready triggers notification persistence AND live SSE push
    const ssePromise = readSseEvent(reader, decoder, 'notification');
    const readyRes = await apiJson(`/api/admin/orders/${order.id}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ order_status: 'ready' }),
    });
    assert.equal(readyRes.status, 200);
    assert.equal(readyRes.data.order_status, 'ready');
    assert.equal(readyRes.data.customer_notified, true);

    const pushed = await ssePromise;
    assert.equal(pushed.order_id, order.id);
    assert.equal(pushed.order_number, order.order_number);
    assert.equal(pushed.type, 'order_ready');
    assert.equal(pushed.is_read, false);
    assert.ok(pushed.message.includes(order.order_number));
    assert.ok(pushed.message.includes('2×'));

    // Step 3: Persisted GET /api/notifications returns the unread pickup alert for Customer A
    const afterReady = await apiJson('/api/notifications', {
      headers: { Authorization: `Bearer ${customerA.token}` },
    });
    assert.equal(afterReady.status, 200);
    assert.equal(afterReady.data.unread_count, 1);
    assert.equal(afterReady.data.items.length, 1);
    assert.equal(afterReady.data.items[0].id, pushed.id);

    // Step 4: Strict isolation — Customer B cannot see or mark Customer A's notification
    const otherList = await apiJson('/api/notifications', {
      headers: { Authorization: `Bearer ${customerB.token}` },
    });
    assert.equal(otherList.status, 200);
    assert.equal(otherList.data.items.length, 0);
    assert.equal(otherList.data.unread_count, 0);

    const crossMark = await apiJson(`/api/notifications/${pushed.id}/read`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${customerB.token}` },
      body: JSON.stringify({}),
    });
    assert.equal(crossMark.status, 404);

    // Step 5: Repeating PATCH with same status 'ready' must NOT duplicate notification
    const idempotentReady = await apiJson(`/api/admin/orders/${order.id}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ order_status: 'ready' }),
    });
    assert.equal(idempotentReady.status, 200);
    assert.equal(idempotentReady.data.customer_notified, false);

    const listNoDup = await apiJson('/api/notifications', {
      headers: { Authorization: `Bearer ${customerA.token}` },
    });
    assert.equal(listNoDup.data.items.length, 1);

    // Step 6: Completing the order auto-resolves unread pickup alert & pushes notifications_sync
    const syncPromise = readSseEvent(reader, decoder, 'notifications_sync');
    const completeRes = await apiJson(`/api/admin/orders/${order.id}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ order_status: 'completed' }),
    });
    assert.equal(completeRes.status, 200);

    const syncEvent = await syncPromise;
    assert.equal(syncEvent.order_id, order.id);
    assert.equal(syncEvent.order_status, 'completed');

    const afterComplete = await apiJson('/api/notifications', {
      headers: { Authorization: `Bearer ${customerA.token}` },
    });
    assert.equal(afterComplete.data.unread_count, 0);
    assert.equal(afterComplete.data.items.length, 1);
    assert.equal(afterComplete.data.items[0].is_read, true);
  } finally {
    abortController.abort();
    await reader.cancel().catch(() => {});
  }
});

test('3. Mark single notification read, mark all read, query validation, and unlinked legacy order safety', async () => {
  const customer = await registerTestCustomer('gamma');
  const order1 = await placeCustomerOrder(customer, 1);
  const order2 = await placeCustomerOrder(customer, 1);

  for (const ord of [order1, order2]) {
    await apiJson(`/api/admin/orders/${ord.id}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ order_status: 'preparing' }),
    });
    const ready = await apiJson(`/api/admin/orders/${ord.id}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ order_status: 'ready' }),
    });
    assert.equal(ready.status, 200);
    assert.equal(ready.data.customer_notified, true);
  }

  // Bad query & ID validation
  const badQuery = await apiJson('/api/notifications?unread_only=invalid', {
    headers: { Authorization: `Bearer ${customer.token}` },
  });
  assert.equal(badQuery.status, 400);

  const badId = await apiJson('/api/notifications/not-a-number/read', {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${customer.token}` },
    body: JSON.stringify({}),
  });
  assert.equal(badId.status, 400);

  // Unread list should have 2 items
  const unreadRes = await apiJson('/api/notifications?unread_only=true', {
    headers: { Authorization: `Bearer ${customer.token}` },
  });
  assert.equal(unreadRes.status, 200);
  assert.equal(unreadRes.data.unread_count, 2);
  assert.equal(unreadRes.data.items.length, 2);

  // Mark one read
  const firstId = unreadRes.data.items[0].id;
  const markOne = await apiJson(`/api/notifications/${firstId}/read`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${customer.token}` },
    body: JSON.stringify({}),
  });
  assert.equal(markOne.status, 200);
  assert.equal(markOne.data.notification.is_read, true);
  assert.equal(markOne.data.unread_count, 1);

  // Mark all remaining read
  const markAll = await apiJson('/api/notifications/read-all', {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${customer.token}` },
    body: JSON.stringify({}),
  });
  assert.equal(markAll.status, 200);
  assert.equal(markAll.data.updated_count, 1);
  assert.equal(markAll.data.unread_count, 0);

  // Unlinked legacy order (customer_id = NULL) moves to ready cleanly without throwing
  const legacyInsert = await dbQuery(
    `
    INSERT INTO orders (
      order_number, customer_name, customer_phone, subtotal_usd, total_usd, total_khr,
      payment_method, payment_status, order_status, customer_id
    ) VALUES ($1, $2, $3, $4, $5, $6, 'cash', 'unpaid', 'preparing', NULL)
    RETURNING *
  `,
    [`ORD-LEGACY-${Date.now()}`, 'Walk-in Guest', '011000111', 3.0, 3.0, 12300],
  );
  const legacyId = legacyInsert.rows[0].id;
  const legacyReady = await apiJson(`/api/admin/orders/${legacyId}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ order_status: 'ready' }),
  });
  assert.equal(legacyReady.status, 200);
  assert.equal(legacyReady.data.order_status, 'ready');
  assert.equal(legacyReady.data.customer_notified, false);
});
