import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import {
  applyDisposableMigrations,
  assertDisposableMigrationTarget,
} from '../scripts/prepareMigrations.js';
import { recordCashSettlement } from '../src/utils/cashSettlement.js';
import { runClientTransaction } from '../src/db/database.js';
import { verifyMigrations } from '../src/db/verifyMigrations.js';

const url = assertDisposableMigrationTarget(
  process.env.MIGRATION_DATABASE_URL,
  process.env.MIGRATION_DISPOSABLE,
);
const pool = new pg.Pool({ connectionString: url });

test.before(async () => {
  const existing = await pool.query(
    "SELECT tablename FROM pg_tables WHERE schemaname = 'public' LIMIT 1",
  );
  if (existing.rowCount) throw new Error('Disposable migration test database must start empty.');
  await pool.query(`
    CREATE TABLE customer_users (id SERIAL PRIMARY KEY);
    CREATE TABLE staff_users (id SERIAL PRIMARY KEY);
    INSERT INTO staff_users DEFAULT VALUES;
    CREATE TABLE orders (id SERIAL PRIMARY KEY, order_number VARCHAR(100) UNIQUE NOT NULL,
      payment_status VARCHAR(50) NOT NULL DEFAULT 'pending',
      payment_method TEXT NOT NULL DEFAULT 'cash', order_status TEXT NOT NULL DEFAULT 'ready',
      total_usd NUMERIC(10,2) NOT NULL DEFAULT 2.50);
    INSERT INTO orders (order_number) VALUES ('ORD-HISTORICAL-KEEP');
  `);
});

test.after(async () => {
  await pool.end();
});

test('additive migration preserves a legacy order and is repeatable', async () => {
  assert.equal((await applyDisposableMigrations(url, 'true')).length, 2);
  assert.equal((await applyDisposableMigrations(url, 'true')).length, 2);
  const preserved = await pool.query(
    "SELECT order_number, customer_id FROM orders WHERE order_number = 'ORD-HISTORICAL-KEEP'",
  );
  assert.deepEqual(preserved.rows, [{ order_number: 'ORD-HISTORICAL-KEEP', customer_id: null }]);
  const defaults = await pool.query(`SELECT column_default FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'payment_status'`);
  assert.match(defaults.rows[0].column_default, /unpaid/);
  const tracking = await pool.query('SELECT version, name FROM schema_migrations');
  assert.equal(tracking.rowCount, 2);
  const constraints = await pool.query(`SELECT conname FROM pg_constraint
    WHERE conrelid = 'order_idempotency'::regclass AND contype IN ('p', 'u', 'f')`);
  assert.ok(constraints.rowCount >= 4);
});

test('cash settlement serializes concurrency, rolls back and preserves immutable evidence', async () => {
  await pool.query(
    "INSERT INTO orders (order_number, payment_status) VALUES ('CASH-TEST', 'unpaid')",
  );
  const id = (await pool.query("SELECT id FROM orders WHERE order_number='CASH-TEST'")).rows[0].id;
  const settle = async () => {
    const client = await pool.connect();
    try {
      return await runClientTransaction(client, query =>
        recordCashSettlement(query, id, 1, {
          confirm_cash_received: true,
          reference: 'COUNTER-RECEIPT-01',
        }),
      );
    } finally {
      client.release();
    }
  };
  const results = await Promise.allSettled([settle(), settle(), settle()]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(
    (await pool.query('SELECT * FROM payment_settlements WHERE order_id=$1', [id])).rowCount,
    1,
  );
  await assert.rejects(pool.query('DELETE FROM payment_settlements WHERE order_id=$1', [id]));
  await assert.rejects(pool.query('TRUNCATE payment_settlements'));
  await assert.rejects(
    pool.query("UPDATE payment_settlements SET reference='changed' WHERE order_id=$1", [id]),
  );
  const client = await pool.connect();
  try {
    await pool.query(
      "INSERT INTO orders (order_number, payment_status) VALUES ('ROLLBACK-CASH', 'unpaid')",
    );
    const other = (await pool.query("SELECT id FROM orders WHERE order_number='ROLLBACK-CASH'"))
      .rows[0].id;
    await assert.rejects(
      runClientTransaction(client, async query => {
        await recordCashSettlement(query, other, 1, {
          confirm_cash_received: true,
          reference: 'ROLLBACK-01',
        });
        throw new Error('Injected later failure');
      }),
    );
    assert.equal(
      (await pool.query('SELECT payment_status FROM orders WHERE id=$1', [other])).rows[0]
        .payment_status,
      'unpaid',
    );
    assert.equal(
      (await pool.query('SELECT * FROM payment_settlements WHERE order_id=$1', [other])).rowCount,
      0,
    );
  } finally {
    client.release();
  }
});

test('schema drift and changed migration checksums fail closed', async () => {
  await verifyMigrations(pool);
  await pool.query('ALTER TABLE orders RENAME COLUMN payment_status TO drifted_status');
  try {
    await assert.rejects(applyDisposableMigrations(url, 'true'), /preflight/);
  } finally {
    await pool.query('ALTER TABLE orders RENAME COLUMN drifted_status TO payment_status');
  }
  const original = (await pool.query("SELECT checksum FROM schema_migrations WHERE version='002'"))
    .rows[0].checksum;
  await pool.query("UPDATE schema_migrations SET checksum=$1 WHERE version='002'", [
    '0'.repeat(64),
  ]);
  try {
    await assert.rejects(applyDisposableMigrations(url, 'true'), /changed/);
  } finally {
    await pool.query("UPDATE schema_migrations SET checksum=$1 WHERE version='002'", [original]);
  }
});
