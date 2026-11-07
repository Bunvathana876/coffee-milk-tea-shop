import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import pg from 'pg';

const testTarget = process.env.ORDER_TEST_DATABASE_URL && new URL(process.env.ORDER_TEST_DATABASE_URL);
if (process.env.ORDER_TEST_DISPOSABLE !== 'true' || !testTarget ||
    testTarget.pathname !== '/phase2_test' || testTarget.hostname !== '127.0.0.1' ||
    !testTarget.port || testTarget.port === '5432') {
  throw new Error('A disposable phase2_test PostgreSQL database is required.');
}

process.env.NODE_ENV = 'test';
process.env.ALLOW_IN_MEMORY_DB = 'false';
process.env.DATABASE_URL = process.env.ORDER_TEST_DATABASE_URL;

const { startServer } = await import('../src/server.js');
const { getDatabase } = await import('../src/db/database.js');
const { Pool } = pg;
const verificationPool = new Pool({ connectionString: process.env.ORDER_TEST_DATABASE_URL });
let server;
let baseUrl;
let appPool;

test.before(async () => {
  const existingTables = await verificationPool.query("SELECT tablename FROM pg_tables WHERE schemaname = current_schema() LIMIT 1");
  if (existingTables.rowCount !== 0) throw new Error('Disposable integration database must be empty.');
  // Simulate an older schema and verify the additive owner column preserves its row.
  await verificationPool.query(`
    CREATE TABLE orders (
      id SERIAL PRIMARY KEY, order_number VARCHAR(100) UNIQUE NOT NULL,
      customer_name VARCHAR(255) NOT NULL, customer_phone VARCHAR(50) NOT NULL,
      customer_email VARCHAR(255), notes TEXT, subtotal_usd NUMERIC(10,2) NOT NULL,
      total_usd NUMERIC(10,2) NOT NULL, total_khr NUMERIC(12,0) NOT NULL,
      payment_method VARCHAR(50) NOT NULL DEFAULT 'cash',
      payment_status VARCHAR(50) NOT NULL DEFAULT 'pending',
      order_status VARCHAR(50) NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    INSERT INTO orders (order_number, customer_name, customer_phone, subtotal_usd, total_usd, total_khr)
    VALUES ('PRE-PHASE2-TEST', 'Legacy Test', '00000000', 1, 1, 4100);
  `);
  server = await startServer(0);
  appPool = await getDatabase();
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  const legacy = await verificationPool.query("SELECT customer_id FROM orders WHERE order_number = 'PRE-PHASE2-TEST'");
  assert.equal(legacy.rows[0].customer_id, null);
});

test.after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  await verificationPool.end();
  if (appPool) await appPool.end();
});

async function request(path, method = 'GET', body, headers = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, data: await response.json() };
}

async function fixture() {
  const phone = `066${Math.floor(100000 + Math.random() * 900000)}`;
  const registered = await request('/api/auth/register', 'POST', {
    full_name: 'Postgres Order Test', phone, password: 'test-only-password',
  });
  assert.equal(registered.status, 201);
  const product = (await request('/api/products')).data[0];
  return {
    customerId: registered.data.user.id,
    headers: { Authorization: `Bearer ${registered.data.access_token}` },
    product,
    payload: { customer_name: 'Postgres Order Test', customer_phone: phone,
      items: [{ product_id: product.id, quantity: 1, size: 'Medium', sugar_level: '50%', ice_level: 'Normal Ice', toppings: [] }] },
  };
}

test('PostgreSQL creates one priced order and loyalty credit across concurrent retries', async () => {
  const { customerId, headers, payload, product } = await fixture();
  const key = `pg-${randomUUID()}`;
  const keyedHeaders = { ...headers, 'Idempotency-Key': key };
  const results = await Promise.all(Array.from({ length: 8 }, () =>
    request('/api/orders', 'POST', { ...payload, items: [{ ...payload.items[0], unit_price_usd: 0.01 }] }, keyedHeaders)));
  assert.deepEqual(results.map(result => result.status).sort(), [200, 200, 200, 200, 200, 200, 200, 201]);
  assert.equal(new Set(results.map(result => result.data.id)).size, 1);
  assert.equal(results[0].data.items[0].unit_price_usd, Number((product.base_price_usd + 0.3).toFixed(2)));
  const rows = await verificationPool.query('SELECT id FROM orders WHERE customer_id = $1', [customerId]);
  assert.equal(rows.rowCount, 1);
  const items = await verificationPool.query('SELECT id FROM order_items WHERE order_id = $1', [rows.rows[0].id]);
  assert.equal(items.rowCount, 1);
  const loyalty = await verificationPool.query('SELECT loyalty_stamps FROM customer_users WHERE id = $1', [customerId]);
  assert.equal(loyalty.rows[0].loyalty_stamps, 1);
  assert.equal((await request('/api/orders', 'POST', { ...payload, notes: 'Changed' }, keyedHeaders)).status, 409);
  const other = await fixture();
  assert.equal((await request(`/api/orders/${rows.rows[0].id}`, 'GET', undefined, other.headers)).status, 404);
  assert.equal((await request('/api/orders', 'POST', other.payload, { ...other.headers, 'Idempotency-Key': key })).status, 201);
});

test('PostgreSQL rejects unavailable products and rolls back failed order writes', async () => {
  const { customerId, headers, payload, product } = await fixture();
  const key = `pg-rollback-${randomUUID()}`;
  const keyedHeaders = { ...headers, 'Idempotency-Key': key };
  await verificationPool.query('UPDATE products SET is_available = false WHERE id = $1', [product.id]);
  try {
    assert.equal((await request('/api/orders', 'POST', payload, keyedHeaders)).status, 422);
  } finally {
    await verificationPool.query('UPDATE products SET is_available = true WHERE id = $1', [product.id]);
  }
  await verificationPool.query(`
    CREATE FUNCTION phase2_fail_item() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'Injected disposable item failure'; END
    $$;
    CREATE TRIGGER phase2_fail_item BEFORE INSERT ON order_items
      FOR EACH ROW EXECUTE FUNCTION phase2_fail_item();
  `);
  try {
    assert.equal((await request('/api/orders', 'POST', payload, keyedHeaders)).status, 500);
  } finally {
    await verificationPool.query('DROP TRIGGER phase2_fail_item ON order_items; DROP FUNCTION phase2_fail_item();');
  }
  const orders = await verificationPool.query('SELECT id FROM orders WHERE customer_id = $1', [customerId]);
  assert.equal(orders.rowCount, 0);
  const reservations = await verificationPool.query('SELECT order_id FROM order_idempotency WHERE customer_id = $1', [customerId]);
  assert.equal(reservations.rowCount, 0);
  const loyalty = await verificationPool.query('SELECT loyalty_stamps FROM customer_users WHERE id = $1', [customerId]);
  assert.equal(loyalty.rows[0].loyalty_stamps, 0);
  assert.equal((await request('/api/orders', 'POST', payload, keyedHeaders)).status, 201);
});
