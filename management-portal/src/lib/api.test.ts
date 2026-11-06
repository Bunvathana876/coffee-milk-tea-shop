import test from 'node:test'
import assert from 'node:assert/strict'
import { ApiError, createCategory, createProduct, getCategories, getDashboardSummary, getOrder, getOrders, getProducts, getSalesReport, getStaffProfile, loginStaff, updateOrderStatus } from './api'

function jsonResponse(body: object, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

test('login sends credentials only to the existing staff-auth endpoint', async () => {
  const original = globalThis.fetch
  let requestedPath = ''
  let requestedBody = ''
  globalThis.fetch = async (input, init) => {
    requestedPath = String(input)
    requestedBody = String(init?.body)
    return jsonResponse({ access_token: 'test-token', token_type: 'bearer', user: { role: 'admin' } })
  }
  try {
    const result = await loginStaff('admin@example.test', 'example-only')
    assert.equal(requestedPath, '/api/admin/auth/login')
    assert.deepEqual(JSON.parse(requestedBody), { email: 'admin@example.test', password: 'example-only' })
    assert.equal(result.access_token, 'test-token')
  } finally { globalThis.fetch = original }
})

test('profile verification sends the bearer token and reads the server role', async () => {
  const original = globalThis.fetch
  let authorization = ''
  globalThis.fetch = async (_input, init) => {
    authorization = new Headers(init?.headers).get('Authorization') || ''
    return jsonResponse({ id: 2, email: 'staff@example.test', full_name: 'Staff', role: 'staff', is_active: true })
  }
  try {
    const profile = await getStaffProfile('test-token')
    assert.equal(authorization, 'Bearer test-token')
    assert.equal(profile.role, 'staff')
  } finally { globalThis.fetch = original }
})

test('a forbidden dashboard response remains a 403 when the session is valid', async () => {
  const original = globalThis.fetch
  const paths: string[] = []
  globalThis.fetch = async input => {
    paths.push(String(input))
    return String(input) === '/api/admin/auth/me'
      ? jsonResponse({ role: 'admin', is_active: true })
      : jsonResponse({ detail: 'Forbidden' }, 403)
  }
  try {
    await assert.rejects(getDashboardSummary('test-token'), error => error instanceof ApiError && error.status === 403)
    assert.deepEqual(paths, ['/api/admin/auth/me', '/api/admin/dashboard/summary', '/api/admin/auth/me'])
  } finally { globalThis.fetch = original }
})

test('a database-backed role change blocks dashboard data', async () => {
  const original = globalThis.fetch
  const paths: string[] = []
  globalThis.fetch = async input => {
    paths.push(String(input))
    return jsonResponse({ role: 'staff', is_active: true })
  }
  try {
    await assert.rejects(getDashboardSummary('test-token'), error => error instanceof ApiError && error.status === 403)
    assert.deepEqual(paths, ['/api/admin/auth/me'])
  } finally { globalThis.fetch = original }
})

test('an expired token is rejected by the profile endpoint', async () => {
  const original = globalThis.fetch
  globalThis.fetch = async () => jsonResponse({ detail: 'Forbidden: Insufficient privileges.' }, 403)
  try {
    await assert.rejects(getStaffProfile('expired-token'), error => error instanceof ApiError && error.status === 403)
  } finally { globalThis.fetch = original }
})

test('catalog requests use the live admin contract and preserve empty results', async () => {
  const original = globalThis.fetch
  const calls: { path: string; method: string; body: string; bearer: string }[] = []
  globalThis.fetch = async (input, init) => {
    calls.push({ path: String(input), method: init?.method || 'GET', body: String(init?.body || ''), bearer: new Headers(init?.headers).get('Authorization') || '' })
    if (String(input).endsWith('/categories') && !init?.method) return jsonResponse([])
    if (String(input).endsWith('/products') && !init?.method) return jsonResponse([])
    return jsonResponse({ id: 1 })
  }
  try {
    assert.deepEqual(await getCategories('token'), [])
    assert.deepEqual(await getProducts('token'), [])
    await createCategory('token', { name: 'Tea', description: null, image: null, is_active: true })
    await createProduct('token', { category_id: 1, name: 'Tea', description: null, image: null, base_price_usd: 2.5, is_available: true })
    assert.deepEqual(calls.map(call => call.path), ['/api/admin/categories', '/api/admin/products', '/api/admin/categories', '/api/admin/products'])
    assert.equal(calls[2].method, 'POST')
    assert.equal(JSON.parse(calls[3].body).base_price_usd, 2.5)
    assert.ok(calls.every(call => call.bearer === 'Bearer token'))
  } finally { globalThis.fetch = original }
})

test('order list, details, status update and sales report use server data', async () => {
  const original = globalThis.fetch
  const calls: string[] = []
  globalThis.fetch = async (input) => {
    calls.push(String(input))
    if (String(input).includes('/orders?')) return jsonResponse({ items: [], total: 0, limit: 50, offset: 0, counts_by_status: {} })
    if (String(input).includes('/reports/')) return jsonResponse({ total_revenue_usd: 0, total_revenue_khr: 0, total_orders: 0 })
    return jsonResponse({ id: 42, order_status: 'preparing' })
  }
  try {
    assert.deepEqual((await getOrders('token', 'pending')).items, [])
    assert.equal((await getOrder('token', 42)).id, 42)
    assert.equal((await updateOrderStatus('token', 42, 'preparing')).order_status, 'preparing')
    assert.equal((await getSalesReport('token')).total_revenue_usd, 0)
    assert.match(calls[0], /status=pending/)
    assert.equal(calls[1], '/api/admin/orders/42')
    assert.equal(calls[2], '/api/admin/orders/42/status')
    assert.equal(calls[3], '/api/admin/reports/sales')
  } finally { globalThis.fetch = original }
})

test('API failure and empty success body surface errors without mock data', async () => {
  const original = globalThis.fetch
  globalThis.fetch = async () => jsonResponse({ detail: 'Service unavailable' }, 503)
  try { await assert.rejects(getProducts('token'), error => error instanceof ApiError && error.status === 503) }
  finally { globalThis.fetch = original }
  globalThis.fetch = async () => new Response('', { status: 200, headers: { 'Content-Type': 'application/json' } })
  try { await assert.rejects(getCategories('token'), error => error instanceof ApiError && error.status === 0) }
  finally { globalThis.fetch = original }
})
