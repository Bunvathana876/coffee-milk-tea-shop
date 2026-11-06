export interface StaffProfile {
  id: number
  email: string
  full_name: string
  role: string
  is_active: boolean
}

export interface LoginResponse {
  access_token: string
  token_type: string
  user: StaffProfile
}

export interface RecentOrder {
  id: number
  order_number: string
  customer_name: string
  total_usd: number
  order_status: string
  created_at: string
}

export interface DashboardSummary {
  total_orders: number
  total_sales_usd: number
  pending_orders: number
  completed_orders: number
  total_customers: number
  recent_orders: RecentOrder[]
}

export interface Category {
  id: number
  name: string
  description: string | null
  image: string | null
  is_active: boolean
  product_count: number
  available_product_count: number
}

export interface Product {
  id: number
  category_id: number
  name: string
  description: string | null
  image: string | null
  base_price_usd: number
  is_available: boolean
  category: { id: number; name: string }
}

export interface OrderItem {
  id: number
  product_name: string
  quantity: number
  unit_price_usd: number
  subtotal_usd: number
  size: string
  sugar_level: string
  ice_level: string
  toppings: string
}

export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled'

export interface AdminOrder {
  id: number
  order_number: string
  customer_name: string
  customer_phone: string
  total_usd: number
  total_khr: number
  payment_method: string
  payment_status: string
  order_status: OrderStatus
  created_at: string
  items: OrderItem[]
}

export interface OrderList {
  items: AdminOrder[]
  total: number
  limit: number
  offset: number
  counts_by_status: Record<OrderStatus, number>
}

export interface SalesReport {
  total_revenue_usd: number
  total_revenue_khr: number
  total_orders: number
}

export const SESSION_INVALID_EVENT = 'brew-boba-management-session-invalid'

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message)
    this.name = 'ApiError'
  }
}

function notifyInvalidSession() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(SESSION_INVALID_EVENT))
}

async function readError(response: Response): Promise<string> {
  try {
    const body = await response.json() as { detail?: string }
    if (typeof body.detail === 'string') return body.detail
  } catch {
    // Keep the HTTP status when the server did not send a JSON error.
  }
  return `Request failed (${response.status}).`
}

async function request<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  let response: Response
  const headers = new Headers(options.headers)
  headers.set('Accept', 'application/json')
  if (options.body) headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)
  try {
    response = await fetch(path, {
      ...options,
      headers,
    })
  } catch {
    throw new ApiError('The café API is unavailable. Check that the backend is running.', 0)
  }

  if (!response.ok) {
    const message = await readError(response)
    if (token && (response.status === 401 || (response.status === 403 && path === '/api/admin/auth/me'))) {
      notifyInvalidSession()
    }
    if (token && response.status === 403 && path !== '/api/admin/auth/me') {
      try {
        const profileResponse = await fetch('/api/admin/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!profileResponse.ok) notifyInvalidSession()
        else {
          const profile = await profileResponse.json() as StaffProfile
          if (!profile.is_active || profile.role !== 'admin') notifyInvalidSession()
        }
      } catch {
        // A network failure is shown as the original request error.
      }
    }
    throw new ApiError(message, response.status)
  }
  if (!response.headers.get('content-type')?.includes('application/json')) {
    throw new ApiError('The café API returned an unexpected response.', 0)
  }
  try {
    return await response.json() as T
  } catch {
    throw new ApiError('The café API returned invalid JSON.', 0)
  }
}

export function loginStaff(email: string, password: string): Promise<LoginResponse> {
  return request('/api/admin/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export function getStaffProfile(token: string): Promise<StaffProfile> {
  return request('/api/admin/auth/me', {}, token)
}

export async function getDashboardSummary(token: string): Promise<DashboardSummary> {
  const profile = await getStaffProfile(token)
  if (!profile.is_active || profile.role !== 'admin') {
    notifyInvalidSession()
    throw new ApiError('Administrator access is required.', 403)
  }
  return request('/api/admin/dashboard/summary', {}, token)
}

export const getCategories = (token: string) => request<Category[]>('/api/admin/categories', {}, token)
export const createCategory = (token: string, body: Pick<Category, 'name' | 'description' | 'image' | 'is_active'>) => request<Category>('/api/admin/categories', { method: 'POST', body: JSON.stringify(body) }, token)
export const updateCategory = (token: string, id: number, body: Partial<Pick<Category, 'name' | 'description' | 'image' | 'is_active'>>) => request<Category>(`/api/admin/categories/${id}`, { method: 'PATCH', body: JSON.stringify(body) }, token)
export const deleteCategory = (token: string, id: number) => request<{ message: string }>(`/api/admin/categories/${id}`, { method: 'DELETE' }, token)

export const getProducts = (token: string) => request<Product[]>('/api/admin/products', {}, token)
export const createProduct = (token: string, body: Pick<Product, 'category_id' | 'name' | 'description' | 'image' | 'base_price_usd' | 'is_available'>) => request<Product>('/api/admin/products', { method: 'POST', body: JSON.stringify(body) }, token)
export const updateProduct = (token: string, id: number, body: Partial<Pick<Product, 'category_id' | 'name' | 'description' | 'image' | 'base_price_usd' | 'is_available'>>) => request<Product>(`/api/admin/products/${id}`, { method: 'PATCH', body: JSON.stringify(body) }, token)
export const deleteProduct = (token: string, id: number) => request<{ message: string }>(`/api/admin/products/${id}`, { method: 'DELETE' }, token)

export const getOrders = (token: string, status: OrderStatus | 'all', offset = 0) => request<OrderList>(`/api/admin/orders?${new URLSearchParams({ ...(status === 'all' ? {} : { status }), limit: '50', offset: String(offset) })}`, {}, token)
export const getOrder = (token: string, id: number) => request<AdminOrder>(`/api/admin/orders/${id}`, {}, token)
export const updateOrderStatus = (token: string, id: number, order_status: OrderStatus) => request<AdminOrder>(`/api/admin/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ order_status }) }, token)
export const getSalesReport = (token: string) => request<SalesReport>('/api/admin/reports/sales', {}, token)
export const settleCash = (token: string, id: number, reference: string) => request<{ id: number; recorded_at: string }>(`/api/admin/orders/${id}/cash-settlement`, { method: 'POST', body: JSON.stringify({ reference, confirm_cash_received: true }) }, token)
