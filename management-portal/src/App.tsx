import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth/authContext'
import { supportedLandingPath } from './lib/access'
import { RoleGate } from './components/RoleGate'
import { PortalLayout } from './components/PortalLayout'
import { LoadingState } from './components/States'
import { LoginPage } from './pages/LoginPage'
import { AdminDashboard } from './pages/AdminDashboard'
import { CategoriesPage } from './pages/CategoriesPage'
import { ProductsPage } from './pages/ProductsPage'
import { OrdersPage } from './pages/OrdersPage'
import { AnalyticsPage } from './pages/AnalyticsPage'
import { PlannedPage } from './pages/PlannedPage'
import { AccessDeniedPage, NotFoundPage } from './pages/AccessPages'

function HomeRedirect() {
  const { status, user } = useAuth()
  if (status === 'loading') return <LoadingState label="Checking your session…" />
  return <Navigate to={status === 'ready' ? supportedLandingPath(user?.role) || '/access-denied' : '/login'} replace />
}

export default function App() {
  return <Routes>
    <Route path="/" element={<HomeRedirect />} />
    <Route path="/login" element={<LoginPage />} />
    <Route path="/access-denied" element={<AccessDeniedPage />} />
    <Route element={<RoleGate area="admin" />}>
      <Route path="/admin" element={<PortalLayout area="admin" />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="categories" element={<CategoriesPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="customers" element={<PlannedPage title="Customers" description="Understand your café community." phase={2} />} />
        <Route path="sellers" element={<PlannedPage title="Sellers" description="Store ownership and seller accounts require new backend support." phase={5} />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="settings" element={<PlannedPage title="Settings" description="Configure the management workspace." phase={7} />} />
      </Route>
    </Route>
    <Route element={<RoleGate area="seller" />}>
      <Route path="/seller" element={<PortalLayout area="seller" />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        {['dashboard', 'products', 'orders', 'inventory', 'analytics', 'profile'].map(page => <Route key={page} path={page} element={<PlannedPage title={page[0].toUpperCase() + page.slice(1)} description="Seller access will be enabled after store-scoped server authorization is implemented." phase={page === 'inventory' ? 6 : 5} />} />)}
      </Route>
    </Route>
    <Route path="*" element={<NotFoundPage />} />
  </Routes>
}
