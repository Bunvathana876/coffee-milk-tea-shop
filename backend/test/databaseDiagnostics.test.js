import test from 'node:test';
import assert from 'node:assert/strict';
import { migrationFiles } from '../scripts/prepareMigrations.js';
import { verifyMigrations } from '../src/db/verifyMigrations.js';
import { databaseFailure, formatDatabaseFailure } from '../src/db/diagnostics.js';
import { validateProductionConfig } from '../src/config.js';
import { AUTHORIZED_TARGETS } from '../src/db/targets.js';

const files = await migrationFiles();
const ledger = () => files.map(({ version, name, checksum }) => ({ version, name, checksum }));
const db = (rows, triggerCount = 2) => ({
  query: async sql => sql.includes('schema_migrations') ? { rows } : { rowCount: triggerCount },
});

test('connected database with no migration ledger reports the exact check and preserves cause', async () => {
  const cause = Object.assign(new Error('private connection string and customer data'), { code: '42P01' });
  await assert.rejects(verifyMigrations({ query: async () => { throw cause; } }), error => {
    assert.equal(error.code, 'DB_MIGRATION_TABLE_MISSING');
    assert.equal(error.cause, cause);
    assert.match(formatDatabaseFailure(error), /schema_migrations/);
    assert.doesNotMatch(formatDatabaseFailure(error), /private|customer data|connection failed/);
    return true;
  });
});

test('migration verification separates missing versions, names, and SHA-256 mismatches', async () => {
  for (const [field, code] of [[null, 'DB_MIGRATION_MISSING'], ['name', 'DB_MIGRATION_NAME_MISMATCH'], ['checksum', 'DB_MIGRATION_CHECKSUM_MISMATCH']]) {
    const rows = ledger();
    if (field) rows[2][field] = 'untrusted-value';
    else rows.pop();
    await assert.rejects(verifyMigrations(db(rows)), error => {
      assert.equal(error.code, code);
      assert.match(error.message, /003/);
      assert.doesNotMatch(error.message, /untrusted-value/);
      return true;
    });
  }
  await verifyMigrations(db(ledger()));
});

test('both payment audit triggers must remain enabled', async () => {
  for (const count of [0, 1]) {
    await assert.rejects(verifyMigrations(db(ledger(), count)), { code: 'DB_AUDIT_TRIGGERS_MISSING' });
  }
});

test('driver failure diagnostics distinguish failure types without leaking messages or details', () => {
  for (const [code, expected] of [
    ['28P01', 'DB_AUTHENTICATION_FAILED'], ['28000', 'DB_AUTHENTICATION_FAILED'],
    ['ERR_TLS_CERT_ALTNAME_INVALID', 'DB_TLS_FAILED'], ['SELF_SIGNED_CERT_IN_CHAIN', 'DB_TLS_FAILED'],
    ['42501', 'DB_PERMISSION_DENIED'], ['42703', 'DB_SCHEMA_MISMATCH'],
    ['ECONNREFUSED', 'DB_CONNECTION_FAILED'], ['23514', 'DB_QUERY_FAILED'],
    ['secret-in-code', 'DB_QUERY_FAILED'],
  ]) {
    const cause = Object.assign(new Error('postgresql://user:secret@host/db JWT_SECRET=secret'), {
      code, detail: 'customer@example.test',
    });
    const result = databaseFailure(cause);
    assert.equal(result.code, expected);
    assert.equal(result.cause, cause);
    assert.doesNotMatch(formatDatabaseFailure(result), /secret|postgresql:\/\/|customer@example/);
  }
});

test('staging rejects the production endpoint before connecting, including pooled URLs', () => {
  for (const suffix of ['', '-pooler']) {
    assert.throws(() => validateProductionConfig({
      NODE_ENV: 'production', ENVIRONMENT: 'staging',
      DATABASE_URL: `postgresql://user:private@${AUTHORIZED_TARGETS.productionEndpointId}${suffix}.ap-southeast-1.aws.neon.tech/coffee_shop?sslmode=verify-full`,
      JWT_SECRET: 'm7Qp4Vn8Rk2Ty6Wb9Hs3Ld5Fx7Zj1Ca0',
      CORS_ORIGINS: 'https://cafe.example.test',
    }), error => {
      assert.match(error.message, /Staging DATABASE_URL points to the production endpoint/);
      assert.doesNotMatch(error.message, /private|postgresql:\/\//);
      return true;
    });
  }
});
