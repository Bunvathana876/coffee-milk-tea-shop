import type { Category, Product, HealthCheckResponse } from '../types';

let customBaseUrl: string | null = null;

export function setApiBaseUrl(url: string | null): void {
  customBaseUrl = url
    ? url.trim().replace(/^["']|["']$/g, '').replace(/\/+$/, '')
    : null;
}

export const getBaseUrl = (): string => {
  if (customBaseUrl !== null) return customBaseUrl;
  const envUrl =
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) ||
    (typeof globalThis !== 'undefined' &&
      (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env
        ?.VITE_API_URL);
  if (typeof envUrl === 'string' && envUrl.trim()) {
    return envUrl
      .trim()
      .replace(/^["']|["']$/g, '')
      .replace(/\/+$/, '');
  }
  return 'http://localhost:8003';
};

export const API_BASE_URL = getBaseUrl();

export interface ProductFilters {
  categoryId?: number;
  category?: string;
  search?: string;
  isAvailable?: boolean;
}

/**
 * Core HTTP fetch wrapper that formats errors and handles JSON serialization safely.
 */
export async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const baseUrl = getBaseUrl();
  const url = baseUrl ? `${baseUrl}${cleanEndpoint}` : cleanEndpoint;

  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let signal = options?.signal;
  if (!signal && typeof AbortController !== 'undefined') {
    const controller = new AbortController();
    signal = controller.signal;
    // 20-second timeout avoids hanging indefinitely on dropped cellular or network connections
    timeoutId = setTimeout(() => {
      controller.abort();
    }, 20000);
  }

  try {
    const headers = new Headers(options?.headers);
    if (!headers.has('Accept')) headers.set('Accept', 'application/json');
    if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
    if (cleanEndpoint.startsWith('/api/orders')) {
      const token =
        typeof localStorage !== 'undefined' ? localStorage.getItem('coffee_customer_token') : null;
      if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);
    }
    const response = await fetch(url, {
      ...options,
      headers,
      signal,
    });

    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      if (isJson) {
        try {
          const errorData = await response.json();
          if (errorData.detail) {
            errorMessage =
              typeof errorData.detail === 'string'
                ? errorData.detail
                : JSON.stringify(errorData.detail);
          }
        } catch {
          // fallback to status text
        }
      } else {
        // Fallback for non-JSON error pages (e.g. 502 Bad Gateway or 404 from proxy)
        const text = await response.text();
        if (text && text.length < 200) {
          errorMessage = text;
        }
      }
      throw new Error(errorMessage);
    }

    if (!isJson) {
      // Prevent Safari's cryptic "The string did not match the expected pattern."
      // by inspecting non-JSON bodies (e.g. HTML pages returned by an unproxied dev server)
      throw new Error(
        `The server returned an unexpected response (non-JSON). Please verify the backend is running at ${getBaseUrl() || 'the configured API origin'}.`,
      );
    }

    return await response.json();
  } catch (error) {
    if (error instanceof Error) {
      if (
        error.name === 'AbortError' ||
        error.name === 'TimeoutError' ||
        error.message.includes('aborted')
      ) {
        throw new Error(
          'Network timeout: The café server did not respond in time. Your order was not confirmed; please retry.',
        );
      }
      if (
        error.message === 'Failed to fetch' ||
        error.name === 'TypeError' ||
        error.name === 'SyntaxError' ||
        error.message.includes('expected pattern') ||
        (typeof navigator !== 'undefined' && !navigator.onLine)
      ) {
        throw new Error(
          `Network error: Unable to connect to the café server. Please verify the backend is running at ${getBaseUrl() || 'the configured API origin'}.`,
        );
      }
      throw error;
    }
    throw new Error('An unknown network error occurred. Please check backend connection.');
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

/**
 * Health check endpoint
 */
export async function checkBackendHealth(): Promise<HealthCheckResponse> {
  return request<HealthCheckResponse>('/api/health');
}

/**
 * Fetch all categories with drink counts from GET /api/categories
 */
export async function getCategories(activeOnly: boolean = true): Promise<Category[]> {
  const query = activeOnly ? '?active_only=true' : '';
  return request<Category[]>(`/api/categories${query}`);
}

/**
 * Fetch products with optional filtering from GET /api/products
 * Supports: category_id, category (name), search, is_available
 */
export async function getProducts(filters?: ProductFilters): Promise<Product[]> {
  const params = new URLSearchParams();

  if (filters?.categoryId !== undefined) {
    params.append('category_id', filters.categoryId.toString());
  }
  if (filters?.category) {
    params.append('category', filters.category);
  }
  if (filters?.search && filters.search.trim()) {
    params.append('search', filters.search.trim());
  }
  if (filters?.isAvailable !== undefined) {
    params.append('is_available', filters.isAvailable.toString());
  }

  const query = params.toString() ? `?${params.toString()}` : '';
  return request<Product[]>(`/api/products${query}`);
}

/**
 * Fetch single product by ID from GET /api/products/{id}
 */
export async function getProductById(id: number): Promise<Product> {
  return request<Product>(`/api/products/${id}`);
}

/**
 * Submit order to backend POST /api/orders/
 */
export async function createOrder(
  payload: import('../types').CreateOrderPayload,
  idempotencyKey?: string,
): Promise<import('../types').Order> {
  return request<import('../types').Order>('/api/orders/', {
    method: 'POST',
    headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined,
    body: JSON.stringify(payload),
  });
}

/**
 * Fetch order by ID
 */
export async function getOrderById(id: number): Promise<import('../types').Order> {
  return request<import('../types').Order>(`/api/orders/${id}`);
}

/**
 * Fetch order by reference
 */
export async function getOrderByReference(orderNumber: string): Promise<import('../types').Order> {
  return request<import('../types').Order>(`/api/orders/ref/${encodeURIComponent(orderNumber)}`);
}

/**
 * Fetch all orders for the current customer from GET /api/orders
 */
export async function getMyOrders(): Promise<import('../types').Order[]> {
  return request<import('../types').Order[]>('/api/orders');
}

/**
 * Fetch all orders placed with a customer's phone number
 */
export async function getOrdersByPhone(phone: string): Promise<import('../types').Order[]> {
  return request<import('../types').Order[]>(
    `/api/orders/lookup/phone?phone=${encodeURIComponent(phone.trim())}`,
  );
}

export interface CustomerUser {
  id: number;
  full_name: string;
  phone: string;
  email?: string | null;
  loyalty_stamps: number;
  is_active: boolean;
  created_at?: string;
  last_login_at?: string | null;
}

export interface CustomerAuthResponse {
  access_token: string;
  token_type?: string;
  expires_in_minutes?: number;
  user: CustomerUser;
}

/**
 * Register a new customer account
 */
export async function registerCustomer(data: {
  full_name: string;
  phone: string;
  email?: string;
  password: string;
}): Promise<CustomerAuthResponse> {
  return request<CustomerAuthResponse>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Sign in as a customer using Phone or Email
 */
export async function loginCustomer(data: {
  identifier: string;
  password: string;
}): Promise<CustomerAuthResponse> {
  return request<CustomerAuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Get current customer profile
 */
export async function getCustomerProfile(token: string): Promise<CustomerUser> {
  return request<CustomerUser>('/api/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

/**
 * Update current customer profile
 */
export async function updateCustomerProfile(
  token: string,
  data: { full_name?: string; email?: string },
): Promise<CustomerUser> {
  return request<CustomerUser>('/api/auth/me', {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
}
