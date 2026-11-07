import test from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'production';
process.env.ALLOW_IN_MEMORY_DB = 'true';
process.env.DATABASE_URL = 'postgresql://127.0.0.1:1/isolated';
process.env.JWT_SECRET = 'm7Qp4Vn8Rk2Ty6Wb9Hs3Ld5Fx7Zj1Ca0';
process.env.ADMIN_INITIAL_EMAIL = 'startup-check@example.test';
process.env.ADMIN_INITIAL_PASSWORD = 'OnlyForIsolatedStartup42!';
process.env.CORS_ORIGINS = 'https://startup.example.test';
const { startServer } = await import('../src/server.js');
const { dbQuery } = await import('../src/db/database.js');

test('database startup fails without PostgreSQL outside explicit test mode', async () => {
  await assert.rejects(startServer(0), /PostgreSQL initialization failed/);
  await assert.rejects(dbQuery('SELECT 1'), /PostgreSQL is not initialized/);
});

test('production startup rejects a missing JWT secret before database initialization', async () => {
  const jwtSecret = process.env.JWT_SECRET;
  delete process.env.JWT_SECRET;
  try {
    await assert.rejects(startServer(0), /JWT_SECRET is required/);
  } finally {
    process.env.JWT_SECRET = jwtSecret;
  }
});
