import test from 'node:test';
import assert from 'node:assert/strict';

process.env.CORS_ORIGINS = 'https://trusted.example';
const { requireAdmin } = await import('../src/middleware/auth.js');

test('staff-account management requires the current admin role', () => {
  const denied = { statusCode: null, body: null };
  const response = {
    status(code) { denied.statusCode = code; return this; },
    json(body) { denied.body = body; return this; },
  };
  let nextCalled = false;
  requireAdmin({ staff: { role: 'staff' } }, response, () => { nextCalled = true; });
  assert.equal(denied.statusCode, 403);
  assert.equal(nextCalled, false);

  requireAdmin({ staff: { role: 'admin' } }, response, () => { nextCalled = true; });
  assert.equal(nextCalled, true);
});

test('CORS exposes responses only to configured browser origins', async () => {
  const { default: app } = await import('../src/server.js');
  const server = app.listen(0);
  try {
    const url = `http://127.0.0.1:${server.address().port}/api/health`;
    const allowed = await fetch(url, { headers: { Origin: 'https://trusted.example' } });
    const denied = await fetch(url, { headers: { Origin: 'https://untrusted.example' } });
    assert.equal(allowed.status, 200);
    assert.equal(allowed.headers.get('access-control-allow-origin'), 'https://trusted.example');
    assert.equal(denied.status, 200);
    assert.equal(denied.headers.get('access-control-allow-origin'), null);
  } finally {
    server.close();
  }
});
