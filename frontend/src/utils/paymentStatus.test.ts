import test from 'node:test';
import assert from 'node:assert/strict';
import { isRecordedPaid, paymentStatusLabel } from './paymentStatus';

test('unpaid and pending KHQR previews cannot render as paid', () => {
  for (const status of ['unpaid', 'pending', 'failed', undefined, null]) {
    assert.equal(isRecordedPaid(status), false);
    assert.match(paymentStatusLabel(status), /NOT CONFIRMED PAID/);
  }
  assert.equal(isRecordedPaid('paid'), true);
  assert.equal(paymentStatusLabel('paid'), 'PAID (SERVER RECORD)');
});
