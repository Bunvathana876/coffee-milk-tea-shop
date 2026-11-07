import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import pg from 'pg';

const migrationDir = fileURLToPath(new URL('../migrations/', import.meta.url));

export function assertDisposableMigrationTarget(rawUrl, marker) {
  if (marker !== 'true' || !rawUrl) throw new Error('Disposable migration target must be explicitly selected.');
  let target;
  try { target = new URL(rawUrl); } catch { throw new Error('Invalid disposable migration URL.'); }
  if (!['postgres:', 'postgresql:'].includes(target.protocol) ||
      target.hostname !== '127.0.0.1' || target.pathname !== '/phase5_migration_test' ||
      !target.port || ['5432', '5433'].includes(target.port)) {
    throw new Error('Migration target must be the isolated phase5_migration_test database on a non-project loopback port.');
  }
  return rawUrl;
}

export async function migrationFiles() {
  const names = (await readdir(migrationDir)).filter(name => /^\d{3}_[a-z0-9_]+\.sql$/.test(name)).sort();
  if (new Set(names.map(name => name.slice(0, 3))).size !== names.length) {
    throw new Error('Migration versions must be unique.');
  }
  return Promise.all(names.map(async name => {
    const sql = await readFile(path.join(migrationDir, name), 'utf8');
    return { version: name.slice(0, 3), name, sql, checksum: createHash('sha256').update(sql).digest('hex') };
  }));
}

export async function applyDisposableMigrations(rawUrl, marker) {
  const connectionString = assertDisposableMigrationTarget(rawUrl, marker);
  const files = await migrationFiles();
  const client = new pg.Client({ connectionString, connectionTimeoutMillis: 2500 });
  await client.connect();
  try {
    await client.query('SET search_path TO public');
    const columns = await client.query(`SELECT table_name, column_name, data_type FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name IN ('orders', 'staff_users', 'customer_users')`);
    for (const [table, column, type] of [['orders', 'id', 'integer'], ['orders', 'order_number', 'character varying'],
      ['orders', 'payment_status', 'character varying'], ['staff_users', 'id', 'integer'], ['customer_users', 'id', 'integer']]) {
      if (!columns.rows.some(row => row.table_name === table && row.column_name === column && row.data_type === type)) {
        throw new Error('Migration preflight failed: required baseline columns differ. Restore and review schema before proceeding.');
      }
    }
    for (const file of files) {
      await client.query('BEGIN');
      try {
        await client.query('SELECT pg_advisory_xact_lock(85105001)');
        await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
          version VARCHAR(3) PRIMARY KEY, name TEXT NOT NULL, checksum CHAR(64) NOT NULL,
          applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`);
        const existing = await client.query('SELECT name, checksum FROM schema_migrations WHERE version = $1', [file.version]);
        if (existing.rowCount) {
          if (existing.rows[0].checksum !== file.checksum || existing.rows[0].name !== file.name) {
            throw new Error(`Migration ${file.version} has changed after application.`);
          }
        } else {
          await client.query(file.sql);
          await client.query('INSERT INTO schema_migrations (version, name, checksum) VALUES ($1, $2, $3)',
            [file.version, file.name, file.checksum]);
        }
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }
    return files.map(file => file.name);
  } finally { await client.end(); }
}

if (process.argv[1] && process.argv[1].endsWith('prepareMigrations.js')) {
  if (process.argv.includes('--apply-disposable')) {
    applyDisposableMigrations(process.env.MIGRATION_DATABASE_URL, process.env.MIGRATION_DISPOSABLE)
      .then(names => console.log(`Verified ${names.length} disposable migration(s).`))
      .catch(error => { console.error(error.message); process.exitCode = 1; });
  } else {
    migrationFiles().then(files => files.forEach(file => console.log(`${file.version} ${file.name}`)))
      .catch(error => { console.error(error.message); process.exitCode = 1; });
  }
}
