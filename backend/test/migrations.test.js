import test from 'node:test';
import assert from 'node:assert/strict';
import { assertDisposableMigrationTarget, migrationFiles } from '../scripts/prepareMigrations.js';

test('migration runner refuses project and unmarked databases', () => {
  assert.throws(() =>
    assertDisposableMigrationTarget('postgresql://127.0.0.1:5433/coffee_shop', 'true'),
  );
  assert.throws(() =>
    assertDisposableMigrationTarget('postgresql://127.0.0.1:5544/phase5_migration_test', 'false'),
  );
  assert.equal(
    assertDisposableMigrationTarget('postgresql://127.0.0.1:5544/phase5_migration_test', 'true'),
    'postgresql://127.0.0.1:5544/phase5_migration_test',
  );
});

test('versioned migration inventory has unique versions and checksums', async () => {
  const files = await migrationFiles();
  assert.ok(files.length >= 1);
  assert.equal(new Set(files.map(file => file.version)).size, files.length);
  assert.ok(files.every(file => /^[a-f0-9]{64}$/.test(file.checksum)));
});
