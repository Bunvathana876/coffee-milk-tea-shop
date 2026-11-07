// Explicit opt-in, isolated Docker PostgreSQL and production-image HTTP rehearsal.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import { applyDisposableMigrations } from '../scripts/prepareMigrations.js';

if (process.env.RUN_ISOLATED_STAGING !== 'true') throw new Error('Explicit isolated staging opt-in required.');
const name = `brew-rehearsal-${process.pid}`;
const temporary = await mkdtemp(path.join(tmpdir(), 'brew-staging-'));
const containers = [];
let network = false;
let db;
let checks = 0;
let stage = 'network setup';
function pass(label) { checks++; console.log(`PASS ${label}`); }
function docker(args) { return execFileSync('docker', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 30000 }); }
function runContainer(suffix, args) {
  const container = `${name}-${suffix}`;
  docker(['run', '-d', '--name', container, '--label', 'brew.disposable=true', '--network', name, ...args]);
  containers.push(container);
  return container;
}
async function waitFor(work) {
  let lastCode = 'not-ready';
  for (let attempt = 0; attempt < 50; attempt++) {
    try { if (await work()) return; } catch (error) { lastCode = error.code || error.name; }
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  const error = new Error('Isolated service did not become ready.'); error.code = lastCode; throw error;
}
async function http(base, endpoint, { method = 'GET', token, body, key } = {}) {
  const response = await fetch(`${base}${endpoint}`, { method, headers: {
    'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(key ? { 'Idempotency-Key': key } : {}),
  }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(10000) });
  const data = response.headers.get('content-type')?.includes('application/json') ? await response.json() : await response.text();
  return { status: response.status, data };
}
try {
  docker(['network', 'create', '--label', 'brew.disposable=true', name]); network = true;
  const databaseContainer = runContainer('db', ['--network-alias', 'db', '--tmpfs', '/var/lib/postgresql/data',
    '--mount', `type=bind,src=${temporary},dst=${temporary}`,
    '-e', 'POSTGRES_HOST_AUTH_METHOD=trust', '-e', 'POSTGRES_DB=phase5_migration_test',
    '-p', '127.0.0.1:55446:5432', 'postgres:16-alpine']);
  const url = 'postgresql://postgres@127.0.0.1:55446/phase5_migration_test';
  stage = 'database readiness';
  db = new pg.Pool({ connectionString: url });
  await waitFor(async () => { await db.query('SELECT 1'); return true; });
  stage = 'baseline preparation';
  const source = await readFile(new URL('../src/db/database.js', import.meta.url), 'utf8');
  const matched = source.match(/const schemaSql = `([\s\S]*?)`;/);
  assert.ok(matched, 'Development baseline SQL located');
  await db.query(matched[1].replace(/CREATE TABLE IF NOT EXISTS order_idempotency[\s\S]*?\);/, ''));
  await db.query(`INSERT INTO orders (order_number,customer_name,customer_phone,subtotal_usd,total_usd,total_khr)
    VALUES ('HISTORICAL-REHEARSAL','Synthetic fixture','00000000',2,2,8200)`);
  const password = randomBytes(20).toString('hex');
  const appPassword = randomBytes(20).toString('hex');
  const hash = await bcrypt.hash(password, 10);
  await db.query(`INSERT INTO staff_users(email,full_name,role,password_hash) VALUES
    ('admin@rehearsal.example','Synthetic admin','admin',$1),('staff@rehearsal.example','Synthetic staff','staff',$1)`, [hash]);
  await db.query(`CREATE ROLE staging_app LOGIN PASSWORD '${appPassword}'`);
  const envPath = path.join(temporary, 'backend.env');
  await writeFile(envPath, `NODE_ENV=production\nENVIRONMENT=production\nPORT=8000\nDATABASE_URL=postgresql://staging_app:${appPassword}@db:5432/phase5_migration_test\nJWT_SECRET=${randomBytes(40).toString('hex')}\nADMIN_INITIAL_EMAIL=bootstrap@rehearsal.example\nADMIN_INITIAL_PASSWORD=${password}\nCORS_ORIGINS=https://cafe.example.invalid\n`, { mode: 0o600 });
  function startupMustFail(label) {
    let failed = false;
    try { docker(['run', '--rm', '--network', name, '--env-file', envPath, 'brew-boba-backend:readiness']); }
    catch (error) { assert.equal(error.status, 1); failed = true; }
    assert.ok(failed); pass(label);
  }
  await db.query('GRANT USAGE ON SCHEMA public TO staging_app');
  startupMustFail('production startup rejects missing migration ledger');
  stage = 'migration application';
  await applyDisposableMigrations(url, 'true');
  await applyDisposableMigrations(url, 'true');
  assert.equal((await db.query('SELECT * FROM schema_migrations')).rowCount, 2);
  const indexes = await db.query("SELECT indexname FROM pg_indexes WHERE tablename='order_idempotency'");
  assert.equal(indexes.rowCount, 2);
  const constraints = await db.query("SELECT contype FROM pg_constraint WHERE conrelid='payment_settlements'::regclass");
  assert.ok(constraints.rows.some(row => row.contype === 'u'));
  assert.equal(constraints.rows.filter(row => row.contype === 'f').length, 2);
  assert.equal((await db.query("SELECT * FROM orders WHERE order_number='HISTORICAL-REHEARSAL'")).rowCount, 1);
  pass('001/002 repeatability and historical reference preservation');
  await db.query(`GRANT SELECT,INSERT,UPDATE,DELETE ON categories,products,customer_users,staff_users,orders,order_items,order_idempotency TO staging_app;
    GRANT SELECT,INSERT ON payment_settlements TO staging_app;
    GRANT SELECT ON schema_migrations TO staging_app;
    GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA public TO staging_app;
    REVOKE CREATE ON SCHEMA public FROM PUBLIC;`);
  const checksum = (await db.query("SELECT checksum FROM schema_migrations WHERE version='002'")).rows[0].checksum;
  await db.query("UPDATE schema_migrations SET checksum=$1 WHERE version='002'", ['0'.repeat(64)]);
  await assert.rejects(applyDisposableMigrations(url, 'true'), /changed/);
  startupMustFail('production startup rejects invalid migration checksum');
  await db.query("UPDATE schema_migrations SET checksum=$1 WHERE version='002'", [checksum]);
  await db.query('ALTER TABLE payment_settlements DISABLE TRIGGER payment_audit_no_truncate');
  startupMustFail('production startup rejects disabled truncate audit protection');
  await db.query('ALTER TABLE payment_settlements ENABLE TRIGGER payment_audit_no_truncate');
  runContainer('api', ['--network-alias', 'backend', '--env-file', envPath, 'brew-boba-backend:readiness']);
  runContainer('web', ['-p', '127.0.0.1:18080:8080', 'brew-boba-web:readiness']);
  runContainer('portal', ['-p', '127.0.0.1:18081:8080', 'brew-boba-portal:readiness']);
  stage = 'production HTTP readiness';
  const web = 'http://127.0.0.1:18080'; const portal = 'http://127.0.0.1:18081';
  await waitFor(async () => (await http(web, '/api/ready')).status === 200);
  assert.equal((await http(portal, '/api/ready')).status, 200);
  assert.equal((await http(web, '/')).status, 200); assert.equal((await http(portal, '/login')).status, 200);
  assert.equal((await db.query('SELECT * FROM staff_users')).rowCount, 2);
  assert.equal((await db.query('SELECT * FROM products')).rowCount, 0);
  pass('production startup without schema/seed writes; both compiled websites and readiness');
  const admin = await http(portal, '/api/admin/auth/login', { method: 'POST', body: { email: 'admin@rehearsal.example', password } });
  assert.equal(admin.status, 200); const token = admin.data.access_token;
  const staff = await http(portal, '/api/admin/auth/login', { method: 'POST', body: { email: 'staff@rehearsal.example', password } });
  assert.equal(staff.status, 200);
  assert.equal((await http(portal, '/api/admin/orders', { token: staff.data.access_token })).status, 403);
  assert.equal((await http(portal, '/api/admin/orders')).status, 401);
  pass('administrator authentication and staff/anonymous authorization');
  const category = await http(portal, '/api/admin/categories', { method: 'POST', token, body: { name: 'Rehearsal', is_active: true } });
  assert.equal(category.status, 201);
  const product = await http(portal, '/api/admin/products', { method: 'POST', token, body: { name: 'Synthetic coffee', category_id: category.data.id, base_price_usd: 2, is_available: true } });
  assert.equal(product.status, 201);
  assert.equal((await http(web, '/api/products')).data.length, 1);
  pass('admin category/product creation and public catalog');
  const customerBody = { full_name: 'Synthetic customer', phone: '0990000001', password };
  const registration = await http(web, '/api/auth/register', { method: 'POST', body: customerBody });
  assert.equal(registration.status, 201);
  const login = await http(web, '/api/auth/login', { method: 'POST', body: { identifier: customerBody.phone, password } });
  assert.equal(login.status, 200); const customerToken = login.data.access_token;
  const payload = { customer_name: customerBody.full_name, customer_phone: customerBody.phone, payment_method: 'cash', items: [{ product_id: product.data.id, quantity: 1 }] };
  const responses = await Promise.all(Array.from({ length: 4 }, () => http(web, '/api/orders', { method: 'POST', token: customerToken, body: payload, key: 'staging-order-0001' })));
  assert.deepEqual(responses.map(row => row.status).sort(), [200,200,200,201]);
  assert.equal(new Set(responses.map(row => row.data.id)).size, 1);
  const order = responses[0].data; assert.equal(order.payment_status, 'unpaid');
  pass('customer registration/login and concurrent idempotent checkout');
  assert.equal((await http(portal, `/api/admin/orders/${order.id}/cash-settlement`, { method: 'POST', token: customerToken,
    body: { confirm_cash_received: true, reference: 'FORBIDDEN' } })).status, 403);
  const other = await http(web, '/api/auth/register', { method: 'POST', body: { ...customerBody, phone: '0990000002' } });
  assert.equal(other.status, 201);
  assert.equal((await http(web, `/api/orders/${order.id}`, { token: other.data.access_token })).status, 404);
  pass('customer ownership and forbidden settlement authorization');
  assert.equal((await http(portal, `/api/admin/orders/${order.id}`, { token })).status, 200);
  for (const order_status of ['preparing','ready']) assert.equal((await http(portal, `/api/admin/orders/${order.id}/status`, { method: 'PATCH', token, body: { order_status } })).status, 200);
  const settlementBody = { confirm_cash_received: true, reference: 'SYNTHETIC-COUNTER-01' };
  assert.equal((await http(portal, `/api/admin/orders/${order.id}/cash-settlement`, { method: 'POST', token: staff.data.access_token, body: settlementBody })).status, 403);
  const settlements = await Promise.all([1,2,3].map(() => http(portal, `/api/admin/orders/${order.id}/cash-settlement`, { method: 'POST', token, body: settlementBody })));
  assert.deepEqual(settlements.map(row => row.status).sort(), [201,409,409]);
  assert.equal((await http(portal, '/api/admin/reports/sales', { token })).data.total_revenue_usd, 0);
  assert.equal((await http(portal, `/api/admin/orders/${order.id}/status`, { method: 'PATCH', token, body: { order_status: 'completed' } })).status, 200);
  assert.equal((await http(portal, '/api/admin/reports/sales', { token })).data.total_revenue_usd, order.total_usd);
  assert.equal((await http(web, `/api/orders/${order.id}`, { token: customerToken })).data.order_status, 'completed');
  pass('admin processing, concurrent cash settlement, customer tracking and revenue');
  const khqr = await http(web, '/api/orders', { method: 'POST', token: customerToken, body: { ...payload, payment_method: 'khqr' }, key: 'staging-khqr-0001' });
  assert.equal(khqr.status, 201); assert.equal(khqr.data.payment_status, 'unpaid');
  assert.equal((await http(portal, `/api/admin/orders/${khqr.data.id}/cash-settlement`, { method: 'POST', token, body: settlementBody })).status, 409);
  await assert.rejects(db.query('DELETE FROM payment_settlements'));
  await assert.rejects(db.query('TRUNCATE payment_settlements'));
  pass('KHQR remains unpaid and audit mutations are blocked');
  stage = 'backup and restoration with matching PostgreSQL tools';
  const toolsDirectory = path.join(temporary, 'tools'); await mkdir(toolsDirectory);
  for (const tool of ['pg_dump', 'pg_restore']) {
    await writeFile(path.join(toolsDirectory, tool), `#!/bin/sh\nexec docker exec -e PGDATABASE -e PGUSER ${databaseContainer} ${tool} "$@"\n`, { mode: 0o700 });
  }
  const archive = path.join(temporary, 'backup.dump');
  execFileSync(process.execPath, [new URL('../scripts/databaseBackup.js', import.meta.url).pathname, 'backup', archive], { env: { ...process.env, POSTGRES_TOOLS_DIRECTORY: toolsDirectory, BACKUP_DATABASE_URL: url }, stdio: 'pipe' });
  await db.query('CREATE DATABASE phase5_restore_test');
  const restoredUrl = url.replace('phase5_migration_test', 'phase5_restore_test');
  execFileSync(process.execPath, [new URL('../scripts/databaseBackup.js', import.meta.url).pathname, 'restore-disposable', archive], { env: { ...process.env, POSTGRES_TOOLS_DIRECTORY: toolsDirectory, BACKUP_DATABASE_URL: restoredUrl, RESTORE_DISPOSABLE: 'true' }, stdio: 'pipe' });
  const restored = new pg.Client({ connectionString: restoredUrl }); await restored.connect();
  try {
    for (const table of ['orders','order_items','customer_users','payment_settlements','order_idempotency','schema_migrations']) {
      assert.deepEqual((await restored.query(`SELECT * FROM ${table} ORDER BY 1`)).rows, (await db.query(`SELECT * FROM ${table} ORDER BY 1`)).rows);
    }
  } finally { await restored.end(); }
  pass('backup restore preserves complete synthetic orders, customers, audit and migration data');
  await writeFile(path.join(temporary, 'result.json'), JSON.stringify({ checks, status: 'passed', resources: name }));
  console.log(`RESULT ${checks} checks passed; evidence directory ${temporary}`);
} catch (error) {
  // Do not print HTTP bodies, credentials, SQL values, or child-process environments.
  console.error(`REHEARSAL FAILED at ${stage}: ${error.code || error.name || 'Error'}`);
  process.exitCode = 1;
} finally {
  await db?.end();
  for (const container of containers.reverse()) { try { docker(['rm', '-f', container]); } catch {} }
  if (network) { try { docker(['network', 'rm', name]); } catch {} }
  console.log('Isolated containers stopped and removed; no project volumes accessed.');
}
