export interface StaffProfile {
  id: number;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: StaffProfile;
}

export interface RecentOrder {
  id: number;
  order_number: string;
  customer_name: string;
  total_usd: number;
  order_status: string;
  created_at: string;
}

export interface DashboardSummary {
  total_orders: number;
  total_sales_usd: number;
  pending_orders: number;
  completed_orders: number;
  total_customers: number;
  recent_orders: RecentOrder[];
}

export interface Category {
  id: number;
  name: string;
  description: string | null;
  image: string | null;
  is_active: boolean;
  product_count: number;
  available_product_count: number;
}

export interface Product {
  id: number;
  category_id: number;
  name: string;
  description: string | null;
  image: string | null;
  base_price_usd: number;
  is_available: boolean;
  category: { id: number; name: string };
}

export interface OrderItem {
  id: number;
  product_name: string;
  quantity: number;
  unit_price_usd: number;
  subtotal_usd: number;
  size: string;
  sugar_level: string;
  ice_level: string;
  toppings: string;
}

export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';

export interface AdminOrder {
  id: number;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  total_usd: number;
  total_khr: number;
  payment_method: string;
  payment_status: string;
  order_status: OrderStatus;
  created_at: string;
  items: OrderItem[];
}

export interface OrderList {
  items: AdminOrder[];
  total: number;
  limit: number;
  offset: number;
  counts_by_status: Record<OrderStatus, number>;
}

export interface SalesReportStatusBreakdown {
  status: string;
  order_count: number;
  total_usd: number;
  total_khr: number;
  recognized_revenue_usd: number;
  recognized_revenue_khr: number;
}

export interface SalesReport {
  date_from?: string;
  date_to?: string;
  total_revenue_usd: number;
  total_revenue_khr: number;
  total_orders: number;
  status_breakdown?: SalesReportStatusBreakdown[];
}

export const SESSION_INVALID_EVENT = 'brew-boba-management-session-invalid';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface ApiUrlResolverOptions {
  envUrl?: string;
  isProd?: boolean;
}

export type ApiResolverInput = ApiUrlResolverOptions | string;

export function getApiBaseUrl(options?: ApiResolverInput): string {
  const opts: ApiUrlResolverOptions =
    typeof options === 'string' ? { envUrl: options } : (options ?? {});

  const envUrl =
    opts.envUrl !== undefined
      ? opts.envUrl
      : typeof import.meta !== 'undefined' && import.meta?.env?.VITE_API_URL
        ? import.meta.env.VITE_API_URL
        : typeof process !== 'undefined'
          ? process.env?.VITE_API_URL
          : undefined;

  const isProd =
    opts.isProd !== undefined
      ? opts.isProd
      : typeof import.meta !== 'undefined' && import.meta?.env
        ? Boolean(import.meta.env.PROD)
        : typeof process !== 'undefined'
          ? process.env?.NODE_ENV === 'production'
          : false;

  const clean =
    typeof envUrl === 'string'
      ? envUrl
          .trim()
          .replace(/^["']|["']$/g, '')
          .replace(/\/+$/, '')
      : '';

  if (isProd) {
    if (!clean) {
      throw new ApiError(
        'Configuration error: VITE_API_URL must be configured in production builds.',
        0,
      );
    }
    try {
      const parsed = new URL(clean);
      if (
        parsed.protocol !== 'https:' &&
        parsed.hostname !== 'localhost' &&
        parsed.hostname !== '127.0.0.1'
      ) {
        throw new Error('Production API URL must use HTTPS.');
      }
    } catch (cause) {
      throw new ApiError(
        `Invalid VITE_API_URL configuration: ${cause instanceof Error ? cause.message : 'Invalid URL'}.`,
        0,
      );
    }
  }

  return clean;
}

export function resolveApiUrl(path: string, options?: ApiResolverInput): string {
  const base = getApiBaseUrl(options);
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  if (!base) {
    return cleanPath;
  }

  const baseEndsWithApi = base.toLowerCase().endsWith('/api');
  const pathStartsWithApi =
    cleanPath.toLowerCase().startsWith('/api/') || cleanPath.toLowerCase() === '/api';

  if (baseEndsWithApi && pathStartsWithApi) {
    const strippedBase = base.slice(0, -4);
    return `${strippedBase}${cleanPath}`;
  }

  return `${base}${cleanPath}`;
}

function notifyInvalidSession() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(SESSION_INVALID_EVENT));
}

async function readError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { detail?: string; message?: string };
    if (typeof body.detail === 'string') return body.detail;
    if (typeof body.message === 'string') return body.message;
  } catch {
    // Keep the HTTP status when the server did not send a JSON error.
  }
  return `Request failed (${response.status}).`;
}

async function request<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const resolvedUrl = resolveApiUrl(path);
  let response: Response;
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');
  if (options.body) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  try {
    response = await fetch(resolvedUrl, {
      ...options,
      headers,
    });
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError('The café API is unavailable. Check that the backend is running.', 0);
  }

  if (!response.ok) {
    const message = await readError(response);
    const isMeRequest = path.endsWith('/api/admin/auth/me');
    if (token && (response.status === 401 || (response.status === 403 && isMeRequest))) {
      notifyInvalidSession();
    }
    if (token && response.status === 403 && !isMeRequest) {
      try {
        const profileUrl = resolveApiUrl('/api/admin/auth/me');
        const profileResponse = await fetch(profileUrl, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!profileResponse.ok) notifyInvalidSession();
        else {
          const profile = (await profileResponse.json()) as StaffProfile;
          if (!profile.is_active || profile.role !== 'admin') notifyInvalidSession();
        }
      } catch {
        // A network failure is shown as the original request error.
      }
    }
    throw new ApiError(message, response.status);
  }
  if (!response.headers.get('content-type')?.includes('application/json')) {
    throw new ApiError('The café API returned an unexpected response.', 0);
  }
  try {
    return (await response.json()) as T;
  } catch {
    throw new ApiError('The café API returned invalid JSON.', 0);
  }
}

export function loginStaff(email: string, password: string): Promise<LoginResponse> {
  return request('/api/admin/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function getStaffProfile(token: string): Promise<StaffProfile> {
  return request('/api/admin/auth/me', {}, token);
}

export async function getDashboardSummary(token: string): Promise<DashboardSummary> {
  const profile = await getStaffProfile(token);
  if (!profile.is_active || profile.role !== 'admin') {
    notifyInvalidSession();
    throw new ApiError('Administrator access is required.', 403);
  }
  return request('/api/admin/dashboard/summary', {}, token);
}

export const getCategories = (token: string) =>
  request<Category[]>('/api/admin/categories', {}, token);
export const createCategory = (
  token: string,
  body: Pick<Category, 'name' | 'description' | 'image' | 'is_active'>,
) =>
  request<Category>('/api/admin/categories', { method: 'POST', body: JSON.stringify(body) }, token);
export const updateCategory = (
  token: string,
  id: number,
  body: Partial<Pick<Category, 'name' | 'description' | 'image' | 'is_active'>>,
) =>
  request<Category>(
    `/api/admin/categories/${id}`,
    { method: 'PATCH', body: JSON.stringify(body) },
    token,
  );
export const deleteCategory = (token: string, id: number) =>
  request<{ message: string }>(`/api/admin/categories/${id}`, { method: 'DELETE' }, token);

export const getProducts = (token: string) => request<Product[]>('/api/admin/products', {}, token);
export const createProduct = (
  token: string,
  body: Pick<
    Product,
    'category_id' | 'name' | 'description' | 'image' | 'base_price_usd' | 'is_available'
  >,
) => request<Product>('/api/admin/products', { method: 'POST', body: JSON.stringify(body) }, token);
export const updateProduct = (
  token: string,
  id: number,
  body: Partial<
    Pick<
      Product,
      'category_id' | 'name' | 'description' | 'image' | 'base_price_usd' | 'is_available'
    >
  >,
) =>
  request<Product>(
    `/api/admin/products/${id}`,
    { method: 'PATCH', body: JSON.stringify(body) },
    token,
  );
export const deleteProduct = (token: string, id: number) =>
  request<{ message: string }>(`/api/admin/products/${id}`, { method: 'DELETE' }, token);

export const getOrders = (token: string, status: OrderStatus | 'all', offset = 0) =>
  request<OrderList>(
    `/api/admin/orders?${new URLSearchParams({ ...(status === 'all' ? {} : { status }), limit: '50', offset: String(offset) })}`,
    {},
    token,
  );
export const getOrder = (token: string, id: number) =>
  request<AdminOrder>(`/api/admin/orders/${id}`, {}, token);
export const updateOrderStatus = (token: string, id: number, order_status: OrderStatus) =>
  request<AdminOrder>(
    `/api/admin/orders/${id}/status`,
    { method: 'PATCH', body: JSON.stringify({ order_status }) },
    token,
  );
export const getSalesReport = (token: string) =>
  request<SalesReport>('/api/admin/reports/sales', {}, token);
export const settleCash = (token: string, id: number, reference: string) =>
  request<{ id: number; recorded_at: string }>(
    `/api/admin/orders/${id}/cash-settlement`,
    { method: 'POST', body: JSON.stringify({ reference, confirm_cash_received: true }) },
    token,
  );

export interface Customer {
  id: number;
  full_name: string;
  phone: string;
  email: string | null;
  loyalty_stamps: number;
  is_active: boolean;
  created_at: string;
  last_login_at: string | null;
  total_orders: number;
  total_spent_usd: number;
}

export interface CustomerMetrics {
  total_customers: number;
  active_customers: number;
  inactive_customers: number;
}

export interface CustomerListResponse {
  items: Customer[];
  total: number;
  limit: number;
  offset: number;
  metrics: CustomerMetrics;
}

export interface GetCustomersParams {
  search?: string;
  status?: 'all' | 'active' | 'inactive';
  sort_by?: 'created_at' | 'full_name' | 'loyalty_stamps' | 'id';
  sort_order?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export const getCustomers = (token: string, params: GetCustomersParams = {}) => {
  const query = new URLSearchParams();
  if (params.search && params.search.trim()) query.set('search', params.search.trim());
  if (params.status && params.status !== 'all') query.set('status', params.status);
  if (params.sort_by) query.set('sort_by', params.sort_by);
  if (params.sort_order) query.set('sort_order', params.sort_order);
  if (params.limit != null) query.set('limit', String(params.limit));
  if (params.offset != null) query.set('offset', String(params.offset));
  const queryString = query.toString();
  return request<CustomerListResponse>(
    `/api/admin/customers${queryString ? `?${queryString}` : ''}`,
    {},
    token,
  );
};

export const getCustomer = (token: string, id: number) =>
  request<Customer>(`/api/admin/customers/${id}`, {}, token);

export interface StaffUser {
  id: number;
  email: string;
  full_name: string;
  role: 'admin' | 'staff' | 'seller';
  is_active: boolean;
  created_at: string;
  last_login_at: string | null;
}

export const getStaff = (token: string) => request<StaffUser[]>('/api/admin/staff', {}, token);

export interface Seller {
  id: number;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
  last_login_at: string | null;
  assigned_stores?: Store[];
  store_name?: string | null;
  store_id?: number | null;
}

export interface SellerMetrics {
  total_sellers: number;
  active_sellers: number;
  inactive_sellers: number;
}

export interface SellerListResponse {
  configured: boolean;
  items: Seller[];
  total: number;
  limit: number;
  offset: number;
  metrics: SellerMetrics;
  message?: string;
}

export interface GetSellersParams {
  search?: string;
  status?: 'all' | 'active' | 'inactive';
  limit?: number;
  offset?: number;
}

export const getSellers = (token: string, params: GetSellersParams = {}) => {
  const query = new URLSearchParams();
  if (params.search && params.search.trim()) query.set('search', params.search.trim());
  if (params.status && params.status !== 'all') query.set('status', params.status);
  if (params.limit != null) query.set('limit', String(params.limit));
  if (params.offset != null) query.set('offset', String(params.offset));
  const queryString = query.toString();
  return request<SellerListResponse>(
    `/api/admin/sellers${queryString ? `?${queryString}` : ''}`,
    {},
    token,
  );
};

export const getSeller = (token: string, id: number) =>
  request<Seller>(`/api/admin/sellers/${id}`, {}, token);

export interface CreateSellerInput {
  email: string;
  full_name: string;
  password: string;
  is_active?: boolean;
}

export const createSeller = (token: string, input: CreateSellerInput) =>
  request<Seller>(
    '/api/admin/sellers',
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
    token,
  );

export interface UpdateSellerInput {
  full_name?: string;
  password?: string;
}

export const updateSeller = (token: string, id: number, input: UpdateSellerInput) =>
  request<Seller>(
    `/api/admin/sellers/${id}`,
    {
      method: 'PATCH',
      body: JSON.stringify(input),
    },
    token,
  );

export const updateSellerStatus = (token: string, id: number, isActive: boolean) =>
  request<Seller>(
    `/api/admin/sellers/${id}/status`,
    {
      method: 'PATCH',
      body: JSON.stringify({ is_active: isActive }),
    },
    token,
  );

export interface SellerLoginResponse {
  token: string;
  access_token: string;
  token_type: string;
  seller: Seller;
}

export const loginSeller = (email: string, password: string) =>
  request<SellerLoginResponse>('/api/seller/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

export const getSellerProfile = (token: string) =>
  request<Seller>('/api/seller/auth/me', {}, token);

// =============================================================================
// STORE REGISTRY & SELLER ASSIGNMENTS (PHASE M5C)
// =============================================================================

export interface Store {
  id: number;
  name: string;
  code: string;
  address: string | null;
  is_active: boolean;
  created_at: string;
  assigned_sellers?: {
    id: number;
    email: string;
    full_name: string;
    assigned_at: string;
  }[];
  order_count?: number;
}

export interface StoreMetrics {
  total_stores: number;
  active_stores: number;
  inactive_stores: number;
}

export interface StoreListResponse {
  items: Store[];
  total: number;
  metrics: StoreMetrics;
}

export interface CreateStoreInput {
  name: string;
  code: string;
  address?: string | null;
  is_active?: boolean;
}

export interface UpdateStoreInput {
  name?: string;
  code?: string;
  address?: string | null;
  is_active?: boolean;
}

export const getStores = (token: string, params: { is_active?: boolean } = {}) => {
  const query = new URLSearchParams();
  if (params.is_active !== undefined) query.set('is_active', String(params.is_active));
  const qs = query.toString();
  return request<StoreListResponse>(`/api/admin/stores${qs ? `?${qs}` : ''}`, {}, token);
};

export const getStore = (token: string, id: number) =>
  request<Store>(`/api/admin/stores/${id}`, {}, token);

export const createStore = (token: string, input: CreateStoreInput) =>
  request<Store>(
    '/api/admin/stores',
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
    token,
  );

export const updateStore = (token: string, id: number, input: UpdateStoreInput) =>
  request<Store>(
    `/api/admin/stores/${id}`,
    {
      method: 'PATCH',
      body: JSON.stringify(input),
    },
    token,
  );

export const updateStoreStatus = (token: string, id: number, isActive: boolean) =>
  request<Store>(
    `/api/admin/stores/${id}/status`,
    {
      method: 'PATCH',
      body: JSON.stringify({ is_active: isActive }),
    },
    token,
  );

export const deleteStore = (token: string, id: number) =>
  request<{ success: boolean; message: string }>(
    `/api/admin/stores/${id}`,
    {
      method: 'DELETE',
    },
    token,
  );

export interface SellerStoreAssignmentResponse {
  seller_id: number;
  seller_email: string;
  seller_name: string;
  stores: Store[];
}

export const getSellerStores = (token: string, sellerId: number) =>
  request<SellerStoreAssignmentResponse>(`/api/admin/sellers/${sellerId}/stores`, {}, token);

export const assignSellerStore = (token: string, sellerId: number, storeId: number) =>
  request<{ assigned: boolean; seller_id: number; store_id: number }>(
    `/api/admin/sellers/${sellerId}/stores`,
    {
      method: 'POST',
      body: JSON.stringify({ store_id: storeId }),
    },
    token,
  );

export const unassignSellerStore = (token: string, sellerId: number, storeId: number) =>
  request<{ unassigned: boolean; seller_id: number; store_id: number }>(
    `/api/admin/sellers/${sellerId}/stores/${storeId}`,
    {
      method: 'DELETE',
    },
    token,
  );

export interface SellerStoresResponse {
  items: (Store & { assigned_at?: string })[];
  total: number;
}

export interface SellerOrdersResponse {
  items: AdminOrder[];
  total: number;
  limit: number;
  offset: number;
  message?: string;
}

export const getMyStores = (token: string) =>
  request<SellerStoresResponse>('/api/seller/stores', {}, token);

export const getMyOrders = (
  token: string,
  params: { store_id?: number; status?: string; limit?: number; offset?: number } = {},
) => {
  const query = new URLSearchParams();
  if (params.store_id) query.set('store_id', String(params.store_id));
  if (params.status) query.set('status', params.status);
  if (params.limit != null) query.set('limit', String(params.limit));
  if (params.offset != null) query.set('offset', String(params.offset));
  const qs = query.toString();
  return request<SellerOrdersResponse>(`/api/seller/orders${qs ? `?${qs}` : ''}`, {}, token);
};

export const getMyOrderDetail = (token: string, orderId: number) =>
  request<AdminOrder>(`/api/seller/orders/${orderId}`, {}, token);
