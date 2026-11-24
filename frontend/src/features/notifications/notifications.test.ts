import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSseBlock } from '../../services/notificationService';
import { playDrinkReadyChime } from '../../utils/notificationSound';

test('1. parseSseBlock parses connected, notification, sync frames and ignores keepalive comments', () => {
  assert.equal(parseSseBlock(': keepalive'), null);
  assert.equal(parseSseBlock(''), null);

  const connected = parseSseBlock('event: connected\ndata: {"status":"connected"}');
  assert.deepEqual(connected, { event: 'connected', data: '{"status":"connected"}' });

  const notif = parseSseBlock(
    'event: notification\r\ndata: {"id":1,"order_number":"ORD-1","type":"order_ready","is_read":false}',
  );
  assert.equal(notif?.event, 'notification');
  assert.deepEqual(JSON.parse(notif!.data), {
    id: 1,
    order_number: 'ORD-1',
    type: 'order_ready',
    is_read: false,
  });

  const sync = parseSseBlock(
    'event: notifications_sync\ndata: {"order_id":5,"order_status":"completed"}',
  );
  assert.equal(sync?.event, 'notifications_sync');
  assert.equal(JSON.parse(sync!.data).order_status, 'completed');
});

test('2. parseSseBlock concatenates multi-line data fields and defaults event to message', () => {
  const multi = parseSseBlock('data: {"a":\ndata: 1}');
  assert.deepEqual(multi, { event: 'message', data: '{"a":\n1}' });
  assert.deepEqual(JSON.parse(multi!.data), { a: 1 });
});

test('3. playDrinkReadyChime degrades safely when Web Audio API is unavailable', () => {
  assert.doesNotThrow(() => playDrinkReadyChime());
});
