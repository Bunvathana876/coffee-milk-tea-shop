import test from 'node:test'
import assert from 'node:assert/strict'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AuthContext, type AuthContextValue } from '../auth/authContext'
import { RoleGate } from '../components/RoleGate'
import { navigationFor } from '../components/PortalLayout'
import { canAccess, supportedLandingPath } from './access'

const admin = { id: 1, email: 'admin@example.test', full_name: 'Admin', role: 'admin', is_active: true }

function renderGuard(status: AuthContextValue['status'], role: string | null, area: 'admin' | 'seller') {
  const context: AuthContextValue = {
    status,
    token: status === 'ready' ? 'test-token' : null,
    user: role ? { ...admin, role } : null,
    login: async () => {},
    logout: () => {},
  }
  return renderToStaticMarkup(<AuthContext.Provider value={context}><MemoryRouter initialEntries={['/workspace']}><Routes><Route element={<RoleGate area={area} />}><Route path="/workspace" element={<p>Protected workspace</p>} /></Route><Route path="/login" element={<p>Sign in</p>} /><Route path="/access-denied" element={<p>Access denied</p>} /></Routes></MemoryRouter></AuthContext.Provider>)
}

test('only a verified admin role can enter admin routes', () => {
  assert.equal(canAccess('admin', 'admin'), true)
  assert.equal(canAccess('staff', 'admin'), false)
  assert.equal(canAccess('admin', 'seller'), false)
  assert.match(renderGuard('ready', 'admin', 'admin'), /Protected workspace/)
  assert.doesNotMatch(renderGuard('ready', 'staff', 'admin'), /Protected workspace/)
  assert.doesNotMatch(renderGuard('guest', null, 'admin'), /Protected workspace/)
})

test('seller access is not activated from an unsupported staff role', () => {
  assert.equal(supportedLandingPath('admin'), '/admin/dashboard')
  assert.equal(supportedLandingPath('staff'), null)
  assert.equal(supportedLandingPath('seller'), null)
  assert.doesNotMatch(renderGuard('ready', 'staff', 'seller'), /Protected workspace/)
  assert.doesNotMatch(renderGuard('ready', 'admin', 'seller'), /Protected workspace/)
})

test('admin and seller navigation remain separate', () => {
  const adminPaths = navigationFor('admin').map(item => item.to)
  const sellerPaths = navigationFor('seller').map(item => item.to)
  assert.ok(adminPaths.every(path => path.startsWith('/admin/')))
  assert.ok(sellerPaths.every(path => path.startsWith('/seller/')))
  assert.ok(adminPaths.includes('/admin/sellers'))
  assert.ok(sellerPaths.includes('/seller/inventory'))
})
