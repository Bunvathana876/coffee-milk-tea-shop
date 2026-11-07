import { spawn } from 'node:child_process';
import { open, stat } from 'node:fs/promises';
import pg from 'pg';
import path from 'node:path';

const mode = process.argv[2];
const filename = process.argv[3];
async function main() {
  if (!['backup', 'restore-disposable'].includes(mode) || !filename) throw new Error('Use backup or restore-disposable and an explicit archive path.');
  const raw = process.env.BACKUP_DATABASE_URL;
  if (!raw) throw new Error('BACKUP_DATABASE_URL is required.');
  const target = new URL(raw);
  if (!['postgres:', 'postgresql:'].includes(target.protocol)) throw new Error('PostgreSQL URL required.');
  if (mode === 'restore-disposable') {
    if (process.env.RESTORE_DISPOSABLE !== 'true' || target.hostname !== '127.0.0.1' ||
        target.pathname !== '/phase5_restore_test' || !target.port || ['5432', '5433'].includes(target.port)) {
      throw new Error('Restore is restricted to a disposable phase5_restore_test database.');
    }
    await stat(filename);
    const client = new pg.Client({ connectionString: raw });
    await client.connect();
    try {
      const result = await client.query("SELECT 1 FROM pg_tables WHERE schemaname='public' LIMIT 1");
      if (result.rowCount) throw new Error('Restore target must be empty.');
    } finally { await client.end(); }
  }
  const env = { ...process.env, PGHOST: target.hostname, PGPORT: target.port || '5432',
    PGUSER: decodeURIComponent(target.username), PGPASSWORD: decodeURIComponent(target.password),
    PGDATABASE: decodeURIComponent(target.pathname.slice(1)) };
  const file = mode === 'backup' ? await open(filename, 'wx', 0o600) : null;
  try {
    await new Promise((resolve, reject) => {
      const tool = mode === 'backup' ? 'pg_dump' : 'pg_restore';
      const binary = process.env.POSTGRES_TOOLS_DIRECTORY ? path.join(process.env.POSTGRES_TOOLS_DIRECTORY, tool) : tool;
      const child = spawn(binary,
        mode === 'backup' ? ['--format=custom', '--no-owner', '--no-acl'] : ['--exit-on-error', '--single-transaction', '--no-owner', '--no-acl', '--dbname', env.PGDATABASE, filename],
        { env, stdio: ['ignore', file ? file.fd : 'ignore', 'ignore'] });
      child.on('error', () => reject(new Error('PostgreSQL backup tool could not start.')));
      child.on('close', code => code === 0 ? resolve() : reject(new Error('PostgreSQL backup/restore failed; archive must not be used until verified.')));
    });
  } finally { await file?.close(); }
  console.log('Database archive operation completed. Verify restoration before relying on the backup.');
}
main().catch(() => { console.error('Database archive operation failed. Check target, permissions, and PostgreSQL tools.'); process.exitCode = 1; });
