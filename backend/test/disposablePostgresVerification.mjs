// Explicit native PostgreSQL rehearsal. Creates and removes only its own temp cluster.
// No DROP, DELETE, or TRUNCATE SQL is issued. Never point this at coffee_shop.
import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import { applyDisposableMigrations, migrationFiles } from '../scripts/prepareMigrations.js';
import { verifyMigrations } from '../src/db/verifyMigrations.js';

if (process.env.RUN_DISPOSABLE_POSTGRES !== 'true') {
  throw new Error('Set RUN_DISPOSABLE_POSTGRES=true to create an isolated temporary PostgreSQL cluster.');
}

const temporary = await mkdtemp(path.join(tmpdir(), 'brew-order-pg-'));
const dataDirectory = path.join(temporary, 'data');
const socketDirectory = path.join(temporary, 'socket');
const passwordFile = path.join(temporary, 'password');
const databaseUser = 'brew_disposable';
const databasePassword = randomBytes(24).toString('hex');
let started = false;
let stopped = false;
let verificationPool;
let applicationPool;
let server;
let checks = 0;
let stage = 'cluster setup';

function pass(label) {
  checks += 1;
  console.log(`PASS ${label}`);
}

function command(program, args, options = {}) {
  return execFileSync(program, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 30000,
    ...options,
  });
}

async function freeLoopbackPort() {
  const listener = createServer();
  await new Promise(resolve => listener.listen(0, '127.0.0.1', resolve));
  const port = listener.address().port;
  await new Promise(resolve => listener.close(resolve));
  return port;
}

async function http(base, endpoint, { method = 'GET', token, body, key } = {}) {
  const response = await fetch(`${base}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(key ? { 'Idempotency-Key': key } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  });
  return { status: response.status, data: await response.json() };
}

function productionProbe(databaseUrl, expectedSuccess, expectedCode) {
  const code = `
    import { startServer } from './src/server.js';
    import { closeDatabase } from './src/db/database.js';
    let server;
    try {
      server = await startServer(0);
      const base = 'http://127.0.0.1:' + server.address().port;
      const health = await fetch(base + '/api/health');
      const ready = await fetch(base + '/api/ready');
      if (health.status !== 200 || ready.status !== 200) process.exitCode = 24;
    } catch { process.exitCode = 23; }
    finally {
      if (server) await new Promise(resolve => server.close(resolve));
      await closeDatabase();
    }
  `;
  const env = productionEnvironment(databaseUrl, '8003');
  try {
    command(process.execPath, ['--input-type=module', '-e', code], { env });
    assert.equal(expectedSuccess, true, 'Production startup unexpectedly succeeded.');
  } catch (error) {
    if (error instanceof assert.AssertionError) throw error;
    assert.equal(expectedSuccess, false, 'Production startup unexpectedly failed.');
    assert.equal(error.status, 23, 'Production probe failed for an unrelated reason.');
    assert.ok(String(error.stdout).includes('Connected to PostgreSQL.'));
    assert.ok(String(error.stderr).includes(`[${expectedCode}]`));
    assert.ok(!String(error.stderr).includes('PostgreSQL connection failed'));
    assert.ok(!String(error.stderr).includes(databasePassword));
  }
}

function productionEnvironment(databaseUrl, port) {
  return {
    ...process.env,
    NODE_ENV: 'production',
    ENVIRONMENT: 'production',
    PORT: String(port),
    DATABASE_URL: databaseUrl,
    JWT_SECRET: randomBytes(32).toString('hex'),
    CORS_ORIGINS: 'https://verification.example.invalid',
    ADMIN_INITIAL_EMAIL: 'verification@example.invalid',
    ADMIN_INITIAL_PASSWORD: randomBytes(24).toString('hex'),
  };
}

async function signalShutdownProbe(databaseUrl) {
  const port = await freeLoopbackPort();
  const child = spawn(process.execPath, ['src/server.js'], {
    cwd: path.resolve(import.meta.dirname, '..'),
    env: productionEnvironment(databaseUrl, port),
    stdio: 'ignore',
  });
  try {
    let ready = false;
    for (let attempt = 0; attempt < 50; attempt += 1) {
      if (child.exitCode !== null) throw new Error('Production process exited before readiness.');
      try {
        const response = await fetch(`http://127.0.0.1:${port}/api/ready`, { signal: AbortSignal.timeout(300) });
        if (response.status === 200) { ready = true; break; }
      } catch {}
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert.ok(ready, 'Production process did not become ready.');
    const exit = new Promise(resolve => child.once('exit', (code, signal) => resolve({ code, signal })));
    child.kill('SIGTERM');
    let deadline;
    const timeout = new Promise((_, reject) => {
      deadline = setTimeout(() => reject(new Error('SIGTERM shutdown timed out.')), 10000);
    });
    const result = await Promise.race([exit, timeout]).finally(() => clearTimeout(deadline));
    assert.equal(result.code, 0);
    assert.equal(result.signal, null);
  } finally {
    if (child.exitCode === null) child.kill('SIGKILL');
  }
}

try {
  const port = await freeLoopbackPort();
  assert.ok(port !== 5432 && port !== 5433);
  await mkdir(socketDirectory, { mode: 0o700 });
  await writeFile(passwordFile, databasePassword, { mode: 0o600 });
  command('initdb', [
    '-D', dataDirectory, '-U', databaseUser, '--pwfile', passwordFile,
    '--auth-local=trust', '--auth-host=scram-sha-256', '--no-instructions',
  ]);
  command('pg_ctl', [
    '-D', dataDirectory, '-l', path.join(temporary, 'postgres.log'),
    '-o', `-h 127.0.0.1 -p ${port} -k ${socketDirectory}`,
    '-w', 'start',
  ]);
  started = true;
  const adminUrl = `postgresql://${databaseUser}:${databasePassword}@127.0.0.1:${port}/postgres`;
  const databaseUrl = `postgresql://${databaseUser}:${databasePassword}@127.0.0.1:${port}/phase5_migration_test`;
  const admin = new pg.Client({ connectionString: adminUrl });
  await admin.connect();
  try {
    await admin.query('CREATE DATABASE phase5_migration_test');
  } finally {
    await admin.end();
  }
  verificationPool = new pg.Pool({ connectionString: databaseUrl, max: 3 });
  assert.equal((await verificationPool.query("SELECT COUNT(*)::int AS count FROM pg_tables WHERE schemaname='public'")).rows[0].count, 0);
  pass('fresh disposable database is empty');
  await assert.rejects(applyDisposableMigrations(databaseUrl, 'true'), /preflight/);
  assert.equal((await verificationPool.query("SELECT COUNT(*)::int AS count FROM pg_tables WHERE schemaname='public'")).rows[0].count, 0);
  pass('migration preflight failure leaves a fresh database untouched');

  process.env.NODE_ENV = 'development';
  process.env.ENVIRONMENT = 'development';
  process.env.ALLOW_IN_MEMORY_DB = 'false';
  process.env.DATABASE_URL = databaseUrl;
  process.env.JWT_SECRET = randomBytes(32).toString('hex');
  const { getDatabase, closeDatabase } = await import('../src/db/database.js');
  const { startServer } = await import('../src/server.js');
  applicationPool = await getDatabase();
  const baseline = (await verificationPool.query("SELECT tablename FROM pg_tables WHERE schemaname='public'")).rows.map(row => row.tablename);
  for (const name of ['categories', 'products', 'customer_users', 'staff_users', 'orders', 'order_items', 'order_idempotency', 'stores', 'seller_store_assignments', 'security_audit_logs']) {
    assert.ok(baseline.includes(name), `Missing baseline table ${name}`);
  }
  assert.ok(!baseline.includes('schema_migrations'));
  assert.ok(!baseline.includes('payment_settlements'));
  assert.equal((await verificationPool.query('SELECT COUNT(*)::int AS count FROM products')).rows[0].count, 0);
  await assert.rejects(verifyMigrations(verificationPool), /schema_migrations/);
  pass('fresh development schema has no demo seed or versioned migration tables');

  stage = 'production fail-closed preflight';
  productionProbe(databaseUrl, false, 'DB_MIGRATION_TABLE_MISSING');
  pass('production startup fails closed before migrations');

  stage = 'versioned migrations';
  const files = await migrationFiles();
  assert.equal(files.length, 3);
  assert.equal((await applyDisposableMigrations(databaseUrl, 'true')).length, files.length);
  assert.equal((await applyDisposableMigrations(databaseUrl, 'true')).length, files.length);
  const ledger = await verificationPool.query('SELECT version, name, checksum FROM schema_migrations ORDER BY version');
  assert.equal(ledger.rowCount, files.length);
  for (const file of files) {
    const row = ledger.rows.find(entry => entry.version === file.version);
    assert.equal(row.name, file.name);
    assert.equal(row.checksum, file.checksum);
  }
  await verifyMigrations(verificationPool);
  pass('all three migrations apply and repeat without changes');

  const requiredIndexes = [
    'idx_products_category', 'idx_orders_customer', 'idx_orders_ref', 'idx_orders_store',
    'idx_order_items_order', 'idx_seller_assignments_seller', 'idx_seller_assignments_store',
    'idx_audit_actor', 'idx_audit_action',
  ];
  const indexes = (await verificationPool.query('SELECT indexname FROM pg_indexes WHERE schemaname=$1', ['public'])).rows.map(row => row.indexname);
  for (const name of requiredIndexes) assert.ok(indexes.includes(name), `Missing index ${name}`);
  const constraints = await verificationPool.query("SELECT conrelid::regclass::text AS table_name, contype FROM pg_constraint WHERE conrelid IN ('order_idempotency'::regclass, 'payment_settlements'::regclass)");
  assert.ok(constraints.rows.some(row => row.table_name === 'order_idempotency' && row.contype === 'p'));
  assert.ok(constraints.rows.some(row => row.table_name === 'payment_settlements' && row.contype === 'u'));
  assert.equal(constraints.rows.filter(row => row.table_name === 'payment_settlements' && row.contype === 'f').length, 2);
  const triggers = await verificationPool.query("SELECT tgname FROM pg_trigger WHERE tgrelid='payment_settlements'::regclass AND tgenabled='O'");
  assert.ok(['payment_audit_immutable', 'payment_audit_no_truncate'].every(name => triggers.rows.some(row => row.tgname === name)));
  pass('required indexes, keys, foreign keys and audit triggers exist');

  stage = 'migration failure recovery';
  const originalChecksum = ledger.rows.find(row => row.version === '003').checksum;
  await verificationPool.query('UPDATE schema_migrations SET checksum=$1 WHERE version=$2', ['0'.repeat(64), '003']);
  await assert.rejects(applyDisposableMigrations(databaseUrl, 'true'), /changed/);
  await assert.rejects(verifyMigrations(verificationPool), { code: 'DB_MIGRATION_CHECKSUM_MISMATCH' });
  productionProbe(databaseUrl, false, 'DB_MIGRATION_CHECKSUM_MISMATCH');
  assert.equal((await verificationPool.query('SELECT COUNT(*)::int AS count FROM schema_migrations')).rows[0].count, 3);
  await verificationPool.query('UPDATE schema_migrations SET checksum=$1 WHERE version=$2', [originalChecksum, '003']);
  await verifyMigrations(verificationPool);
  pass('checksum mismatch fails closed and restored ledger verifies');

  stage = 'production startup';
  await closeDatabase();
  applicationPool = null;
  productionProbe(databaseUrl, true);
  pass('production-mode startup, health and readiness pass after migrations');
  await signalShutdownProbe(databaseUrl);
  pass('production process exits cleanly on SIGTERM');

  // Reopen in development mode for synthetic write-only integration checks.
  applicationPool = await getDatabase();
  server = await startServer(0);
  const base = `http://127.0.0.1:${server.address().port}`;
  assert.equal((await http(base, '/api/health')).status, 200);
  assert.equal((await http(base, '/api/ready')).status, 200);
  assert.ok(applicationPool.totalCount >= 1 && applicationPool.totalCount <= applicationPool.options.max);
  pass('real PostgreSQL pool, health and readiness are available');

  stage = 'authentication and catalog';
  const adminPassword = randomBytes(20).toString('hex');
  await verificationPool.query(
    'INSERT INTO staff_users (email, full_name, role, password_hash, is_active) VALUES ($1,$2,$3,$4,TRUE)',
    ['disposable-admin@example.invalid', 'Disposable Admin', 'admin', await bcrypt.hash(adminPassword, 10)],
  );
  const adminLogin = await http(base, '/api/admin/auth/login', {
    method: 'POST', body: { email: 'disposable-admin@example.invalid', password: adminPassword },
  });
  assert.equal(adminLogin.status, 200);
  const adminToken = adminLogin.data.access_token;
  for (let attempt = 0; attempt < 19; attempt += 1) {
    const invalid = await http(base, '/api/admin/auth/login', { method: 'POST', body: {} });
    assert.equal(invalid.status, 422);
  }
  assert.equal((await http(base, '/api/admin/auth/login', { method: 'POST', body: {} })).status, 429);
  pass('authentication rate limiting returns 429 on the real HTTP server');
  const category = await http(base, '/api/admin/categories', {
    method: 'POST', token: adminToken, body: { name: 'Disposable Coffee', is_active: true },
  });
  assert.equal(category.status, 201);
  const product = await http(base, '/api/admin/products', {
    method: 'POST', token: adminToken,
    body: { category_id: category.data.id, name: 'Synthetic Latte', image: 'https://res.cloudinary.com/demo/image/upload/sample.jpg', base_price_usd: 2, is_available: true },
  });
  assert.equal(product.status, 201);
  const products = await http(base, '/api/products');
  assert.equal(products.status, 200);
  assert.equal(products.data.length, 1);
  assert.equal(products.data[0].image, product.data.image);
  assert.ok(['id', 'category_id', 'name', 'description', 'image', 'base_price_usd', 'is_available'].every(key => Object.hasOwn(products.data[0], key)));
  pass('admin management API and public product contract retain image and price fields');

  const customerPassword = randomBytes(20).toString('hex');
  const customer = await http(base, '/api/auth/register', {
    method: 'POST', body: { full_name: 'Disposable Customer', phone: '0991234567', password: customerPassword },
  });
  assert.equal(customer.status, 201);
  const login = await http(base, '/api/auth/login', {
    method: 'POST', body: { identifier: '0991234567', password: customerPassword },
  });
  assert.equal(login.status, 200);
  const customerToken = login.data.access_token;
  assert.equal((await http(base, '/api/auth/me', { token: customerToken })).status, 200);
  pass('customer registration, login and profile work on PostgreSQL');

  stage = 'order workflow';
  const payload = {
    customer_name: 'Disposable Customer', customer_phone: '0991234567', payment_method: 'cash',
    items: [{ product_id: product.data.id, quantity: 2, size: 'Large', sugar_level: '50%', ice_level: 'Normal Ice', toppings: ['Brown Sugar Pearls'] }],
  };
  const order = await http(base, '/api/orders', { method: 'POST', token: customerToken, body: { ...payload, items: [{ ...payload.items[0], unit_price_usd: 0.01 }] }, key: `first-${randomUUID()}` });
  assert.equal(order.status, 201);
  assert.equal(order.data.items[0].unit_price_usd, 3.1);
  assert.equal(order.data.total_usd, 6.2);
  assert.equal(order.data.payment_status, 'unpaid');
  assert.equal(order.data.order_status, 'pending');
  assert.equal((await verificationPool.query('SELECT COUNT(*)::int AS count FROM order_items WHERE order_id=$1', [order.data.id])).rows[0].count, 1);
  const history = await http(base, '/api/orders', { token: customerToken });
  assert.equal(history.status, 200);
  assert.ok(history.data.some(row => row.id === order.data.id));
  pass('customization and server prices persist atomically in order history');

  const other = await http(base, '/api/auth/register', {
    method: 'POST', body: { full_name: 'Other Customer', phone: '0997654321', password: customerPassword },
  });
  assert.equal(other.status, 201);
  assert.equal((await http(base, `/api/orders/${order.data.id}`, { token: other.data.access_token })).status, 404);
  assert.equal((await http(base, `/api/orders/${order.data.id}`, { token: customerToken })).status, 200);
  assert.equal((await http(base, '/api/admin/orders', { token: customerToken })).status, 403);
  pass('customer ownership and admin authorization hold on PostgreSQL');

  const retryKey = `retry-${randomUUID()}`;
  const retries = await Promise.all(Array.from({ length: 4 }, () =>
    http(base, '/api/orders', { method: 'POST', token: customerToken, body: payload, key: retryKey })));
  assert.deepEqual(retries.map(row => row.status).sort(), [200, 200, 200, 201]);
  assert.equal(new Set(retries.map(row => row.data.id)).size, 1);
  const totalBeforeLegacy = (await verificationPool.query('SELECT COUNT(*)::int AS count FROM orders WHERE customer_id=$1', [customer.data.user.id])).rows[0].count;
  const legacyOne = await http(base, '/api/orders', { method: 'POST', token: customerToken, body: payload });
  const legacyTwo = await http(base, '/api/orders', { method: 'POST', token: customerToken, body: payload });
  assert.equal(legacyOne.status, 201);
  assert.equal(legacyTwo.status, 201);
  assert.notEqual(legacyOne.data.id, legacyTwo.data.id);
  assert.equal((await verificationPool.query('SELECT COUNT(*)::int AS count FROM orders WHERE customer_id=$1', [customer.data.user.id])).rows[0].count, totalBeforeLegacy + 2);
  pass('keyed retries collapse; legacy no-key retries create separate orders');

  const statusPatch = await http(base, `/api/admin/orders/${order.data.id}/status`, {
    method: 'PATCH', token: adminToken, body: { order_status: 'preparing' },
  });
  assert.equal(statusPatch.status, 200);
  assert.equal((await http(base, `/api/admin/orders/${order.data.id}/status`, { method: 'PATCH', token: adminToken, body: { order_status: 'ready' } })).status, 200);
  assert.equal((await http(base, `/api/admin/orders/${order.data.id}/status`, { method: 'PATCH', token: adminToken, body: { order_status: 'completed' } })).status, 200);
  assert.equal((await http(base, `/api/admin/orders/${order.data.id}/status`, { method: 'PATCH', token: adminToken, body: { payment_status: 'paid' } })).status, 422);
  assert.equal((await http(base, `/api/orders/${order.data.id}`, { token: customerToken })).data.payment_status, 'unpaid');
  const khqr = await http(base, '/api/orders', { method: 'POST', token: customerToken, body: { ...payload, payment_method: 'khqr' }, key: `khqr-${randomUUID()}` });
  assert.equal(khqr.status, 201);
  assert.equal(khqr.data.payment_status, 'unpaid');
  assert.equal((await http(base, `/api/admin/orders/${khqr.data.id}/cash-settlement`, { method: 'POST', token: adminToken, body: { confirm_cash_received: true, reference: 'TEST-ONLY' } })).status, 409);
  assert.equal((await verificationPool.query('SELECT COUNT(*)::int AS count FROM payment_settlements')).rows[0].count, 0);
  pass('status transitions cannot forge payment and KHQR remains unpaid');

  stage = 'transaction rollback';
  // NOT VALID preserves existing synthetic rows; new quantity-two inserts fail after the order insert.
  await verificationPool.query('ALTER TABLE order_items ADD CONSTRAINT disposable_quantity_limit CHECK (quantity < 2) NOT VALID');
  const ordersBefore = (await verificationPool.query('SELECT COUNT(*)::int AS count FROM orders WHERE customer_id=$1', [customer.data.user.id])).rows[0].count;
  const loyaltyBefore = (await verificationPool.query('SELECT loyalty_stamps FROM customer_users WHERE id=$1', [customer.data.user.id])).rows[0].loyalty_stamps;
  const failedKey = `rollback-${randomUUID()}`;
  const failed = await http(base, '/api/orders', { method: 'POST', token: customerToken, body: payload, key: failedKey });
  assert.equal(failed.status, 500);
  assert.equal((await verificationPool.query('SELECT COUNT(*)::int AS count FROM orders WHERE customer_id=$1', [customer.data.user.id])).rows[0].count, ordersBefore);
  assert.equal((await verificationPool.query('SELECT COUNT(*)::int AS count FROM order_idempotency WHERE customer_id=$1 AND idempotency_key=$2', [customer.data.user.id, failedKey])).rows[0].count, 0);
  assert.equal((await verificationPool.query('SELECT loyalty_stamps FROM customer_users WHERE id=$1', [customer.data.user.id])).rows[0].loyalty_stamps, loyaltyBefore);
  pass('failed item write rolls back order, retry reservation and loyalty credit');

  stage = 'graceful shutdown';
  await new Promise(resolve => server.close(resolve));
  server = null;
  await closeDatabase();
  assert.equal(applicationPool.ending, true);
  applicationPool = null;
  pass('HTTP listener and PostgreSQL pool close cleanly');
  console.log(`RESULT ${checks} disposable PostgreSQL checks passed (PostgreSQL 18; no project database touched).`);
} catch (error) {
  console.error(`DISPOSABLE VERIFICATION FAILED at ${stage}: ${error.code || error.name || 'Error'}`);
  process.exitCode = 1;
} finally {
  if (server) await new Promise(resolve => server.close(resolve));
  if (applicationPool && !applicationPool.ending) await applicationPool.end();
  if (verificationPool) await verificationPool.end();
  if (started) {
    try { command('pg_ctl', ['-D', dataDirectory, '-m', 'fast', '-w', 'stop']); stopped = true; }
    catch { console.error('Disposable PostgreSQL did not stop cleanly; inspect the temporary cluster before cleanup.'); process.exitCode = 1; }
  }
  if (!started || stopped) await rm(temporary, { recursive: true, force: true });
}
