import test from 'node:test';
import assert from 'node:assert/strict';
import { recordCashSettlement } from '../src/utils/cashSettlement.js';
import { verifyMigrations } from '../src/db/verifyMigrations.js';
import { validateProductionConfig } from '../src/config.js';

test('settlement requires explicit confirmation and safe reference', async () => {
  for (const body of [{}, { reference: 'abc' }, { confirm_cash_received: true, reference: 'bank@secret' }]) {
    await assert.rejects(recordCashSettlement(() => { throw new Error('must not query'); }, 1, 1, body), error => error.status === 422);
  }
});

test('cash settlement rejects KHQR, cancelled, unpaid-in-progress and historical paid rows', async () => {
  for (const row of [
    { payment_method: 'khqr', payment_status: 'unpaid', order_status: 'ready' },
    { payment_method: 'cash', payment_status: 'unpaid', order_status: 'cancelled' },
    { payment_method: 'cash', payment_status: 'unpaid', order_status: 'preparing' },
    { payment_method: 'cash', payment_status: 'paid', order_status: 'completed' },
  ]) {
    await assert.rejects(recordCashSettlement(async () => ({ rows: [row] }), 1, 1,
      { reference: 'RECEIPT-01', confirm_cash_received: true }), error => error.status === 409);
  }
});

test('production migration verification rejects missing records without writing schema', async () => {
  const calls = [];
  await assert.rejects(verifyMigrations({ query: async sql => { calls.push(sql); return { rows: [] }; } }));
  assert.ok(calls.every(sql => sql.startsWith('SELECT')));
});

test('production CORS rejects paths and insecure origins', () => {
  for (const CORS_ORIGINS of ['http://example.test', 'https://example.test/path']) {
    assert.throws(() => validateProductionConfig({ NODE_ENV: 'production', CORS_ORIGINS }), /HTTPS origins/);
  }
});
