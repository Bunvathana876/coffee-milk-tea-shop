import test from 'node:test';
import assert from 'node:assert/strict';
import { getStatusBadge, getPaymentBadge } from './orderStatusBadge';

test('getStatusBadge maps canonical order statuses with distinct styling', () => {
  assert.match(getStatusBadge('pending'), /bg-amber-100/);
  assert.match(getStatusBadge('preparing'), /bg-indigo-100/);
  assert.match(getStatusBadge('ready'), /bg-emerald-100/);
  assert.match(getStatusBadge('completed'), /bg-teal-100/);
  assert.match(getStatusBadge('cancelled'), /bg-rose-100/);
  assert.match(getStatusBadge('unknown'), /bg-stone-100/);
});

test('getPaymentBadge maps canonical payment statuses with distinct styling', () => {
  assert.match(getPaymentBadge('paid'), /bg-emerald-100/);
  assert.match(getPaymentBadge('unpaid'), /bg-amber-100/);
  assert.match(getPaymentBadge('pending'), /bg-amber-100/);
  assert.match(getPaymentBadge('failed'), /bg-rose-100/);
  assert.match(getPaymentBadge('unknown'), /bg-stone-100/);
});

test('Kitchen status transitions cover the canonical 4 stages', () => {
  const canonicalStages = ['pending', 'preparing', 'ready', 'completed'];
  for (const stage of canonicalStages) {
    const badge = getStatusBadge(stage);
    assert.ok(badge.length > 0, `Stage ${stage} must have a valid badge`);
    assert.ok(!badge.includes('bg-stone-100'), `Stage ${stage} must not fall back to neutral stone`);
  }
});
