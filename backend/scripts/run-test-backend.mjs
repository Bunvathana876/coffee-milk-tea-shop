#!/usr/bin/env node

process.env.NODE_ENV = 'test';
process.env.ENVIRONMENT = 'test';
process.env.ALLOW_IN_MEMORY_DB = 'true';
process.env.DATABASE_URL = 'postgresql://127.0.0.1:1/isolated';
process.env.DEBUG_HTTP = 'true';

const { startServer } = await import('../src/server.js');
const { seedDatabase } = await import('../src/db/seed.js');

const requestedPort = process.env.TEST_SERVER_PORT
  ? parseInt(process.env.TEST_SERVER_PORT, 10)
  : 0;
const server = await startServer(requestedPort);
const actualPort = server.address().port;
await seedDatabase();

// Emit standard ready signal with port for client process listeners
console.log(`TEST_SERVER_READY:${actualPort}`);

const shutdown = () => {
  server.close(() => {
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
