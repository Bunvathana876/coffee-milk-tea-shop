import test from 'node:test';
import assert from 'node:assert/strict';
import { runClientTransaction } from '../src/db/database.js';

test('a successful transaction uses one client and commits once', async () => {
  const statements = [];
  let workCalls = 0;
  const client = {
    async query(sql, params) {
      statements.push([sql, params]);
      return { rows: [{ id: 1 }] };
    },
  };

  const result = await runClientTransaction(client, async query => {
    workCalls += 1;
    return query('INSERT INTO orders (order_number) VALUES ($1) RETURNING id', ['order-1']);
  });

  assert.deepEqual(result.rows, [{ id: 1 }]);
  assert.equal(workCalls, 1);
  assert.deepEqual(
    statements.map(([sql]) => sql),
    ['BEGIN', 'INSERT INTO orders (order_number) VALUES ($1) RETURNING id', 'COMMIT'],
  );
  assert.deepEqual(statements[1][1], ['order-1']);
});

test('a failed write rolls back on the same client without committing', async () => {
  const statements = [];
  const failure = new Error('item insert failed');
  const client = {
    async query(sql) {
      statements.push(sql);
      if (sql === 'INSERT INTO order_items') throw failure;
      return { rows: [] };
    },
  };

  await assert.rejects(
    runClientTransaction(client, async query => {
      await query('INSERT INTO orders');
      await query('INSERT INTO order_items');
    }),
    err => err === failure,
  );
  assert.deepEqual(statements, [
    'BEGIN',
    'INSERT INTO orders',
    'INSERT INTO order_items',
    'ROLLBACK',
  ]);
});

test('a failed related operation rolls back before reporting the error', async () => {
  const statements = [];
  const client = {
    async query(sql) {
      statements.push(sql);
      return { rows: [] };
    },
  };

  await assert.rejects(
    runClientTransaction(client, async query => {
      await query('INSERT INTO orders');
      throw new Error('loyalty credit failed');
    }),
    /loyalty credit failed/,
  );
  assert.deepEqual(statements, ['BEGIN', 'INSERT INTO orders', 'ROLLBACK']);
});
