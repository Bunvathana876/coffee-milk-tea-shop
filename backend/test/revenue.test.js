import test from 'node:test';
import assert from 'node:assert/strict';
import { countsAsRevenue, sumRevenue } from '../src/utils/revenue.js';

test('revenue includes only recorded paid and completed orders', () => {
  const orders = [
    { total_usd: 2.3, total_khr: 9430, payment_status: 'paid', order_status: 'completed' },
    { total_usd: 3.1, total_khr: 12710, payment_status: 'unpaid', order_status: 'completed' },
    { total_usd: 4, total_khr: 16400, payment_status: 'paid', order_status: 'cancelled' },
    { total_usd: 5, total_khr: 20500, payment_status: 'paid', order_status: 'preparing' },
  ];
  assert.equal(countsAsRevenue(orders[0]), true);
  assert.deepEqual(sumRevenue(orders), { usd: 2.3, khr: 9430 });
});
