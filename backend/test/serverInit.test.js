import test from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';
process.env.ENVIRONMENT = 'test';
process.env.ALLOW_IN_MEMORY_DB = 'true';
process.env.DATABASE_URL = 'postgresql://127.0.0.1:1/isolated';

test('Application server module imports all route files successfully without ERR_MODULE_NOT_FOUND', async () => {
  // Test direct module imports for all newly added and existing routes
  const adminCustomers = await import('../src/routes/admin/customers.js');
  assert.equal(
    typeof adminCustomers.default,
    'function',
    'admin/customers must export an Express router',
  );

  const adminSellers = await import('../src/routes/admin/sellers.js');
  assert.equal(
    typeof adminSellers.default,
    'function',
    'admin/sellers must export an Express router',
  );

  const adminStores = await import('../src/routes/admin/stores.js');
  assert.equal(
    typeof adminStores.default,
    'function',
    'admin/stores must export an Express router',
  );

  const sellerAuth = await import('../src/routes/seller/auth.js');
  assert.equal(typeof sellerAuth.default, 'function', 'seller/auth must export an Express router');

  const sellerStores = await import('../src/routes/seller/stores.js');
  assert.equal(
    typeof sellerStores.default,
    'function',
    'seller/stores must export an Express router',
  );

  const sellerOrders = await import('../src/routes/seller/orders.js');
  assert.equal(
    typeof sellerOrders.default,
    'function',
    'seller/orders must export an Express router',
  );

  const auditModule = await import('../src/middleware/audit.js');
  assert.equal(
    typeof auditModule.logSecurityEvent,
    'function',
    'audit must export logSecurityEvent',
  );
});

test('Application server starts up, initializes router stack, and responds to HTTP requests', async () => {
  const { startServer } = await import('../src/server.js');
  const server = await startServer(0);
  assert.ok(server, 'Server should start successfully');

  try {
    const port = server.address().port;
    const baseUrl = `http://localhost:${port}`;

    // Verify root endpoint
    const rootRes = await fetch(`${baseUrl}/`);
    assert.equal(rootRes.status, 200);
    const rootData = await rootRes.json();
    assert.equal(rootData.app, 'Coffee & Milk Tea Shop API');

    // Verify health endpoint
    const healthRes = await fetch(`${baseUrl}/api/health`);
    assert.equal(healthRes.status, 200);
    const healthData = await healthRes.json();
    assert.equal(healthData.status, 'healthy');
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
