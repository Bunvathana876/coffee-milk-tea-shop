import type { Category, Product, HealthCheckResponse } from '../types';

export type ApiErrorCode =
  | 'TIMEOUT'
  | 'NETWORK'
  | 'OFFLINE'
  | 'HTTP'
  | 'INVALID_RESPONSE'
  | 'ABORTED';

export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly retryable: boolean;

  constructor(
    message: string,
    options: {
      status?: number;
      code: ApiErrorCode;
      retryable?: boolean;
      cause?: unknown;
    },
  ) {
    super(message, options.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = 'ApiError';
    this.status = options.status ?? 0;
    this.code = options.code;
    this.retryable = options.retryable ?? false;
  }
}

export interface RetryInfo {
  attempt: number;
  maxAttempts: number;
  reason: 'timeout' | 'network' | 'gateway';
}

export interface ApiRequestOptions extends RequestInit {
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
  onRetry?: (info: RetryInfo) => void;
}

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

function createAttemptSignal(
  timeoutMs: number,
  userSignal?: AbortSignal,
): { signal?: AbortSignal; cleanup: () => void; didTimeout: () => boolean } {
  const safeTimeoutMs = Math.max(1, Math.floor(timeoutMs));

  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    const timeoutSignal = AbortSignal.timeout(safeTimeoutMs);
    if (!userSignal) {
      return {
        signal: timeoutSignal,
        cleanup: () => {},
        didTimeout: () => timeoutSignal.aborted,
      };
    }

    if (typeof AbortSignal.any === 'function') {
      return {
        signal: AbortSignal.any([userSignal, timeoutSignal]),
        cleanup: () => {},
        didTimeout: () => timeoutSignal.aborted && !userSignal.aborted,
      };
    }

    if (typeof AbortController !== 'undefined') {
      const controller = new AbortController();
      const onUserAbort = () => controller.abort(userSignal.reason);
      const onTimeoutAbort = () => controller.abort(timeoutSignal.reason);

      if (userSignal.aborted) {
        onUserAbort();
      } else if (timeoutSignal.aborted) {
        onTimeoutAbort();
      } else {
        userSignal.addEventListener('abort', onUserAbort, { once: true });
        timeoutSignal.addEventListener('abort', onTimeoutAbort, { once: true });
      }

      return {
        signal: controller.signal,
        cleanup: () => {
          userSignal.removeEventListener('abort', onUserAbort);
          timeoutSignal.removeEventListener('abort', onTimeoutAbort);
        },
        didTimeout: () => timeoutSignal.aborted && !userSignal.aborted,
      };
    }
  }

  if (typeof AbortController === 'undefined') {
    return {
      signal: userSignal,
      cleanup: () => {},
      didTimeout: () => false,
    };
  }

  const controller = new AbortController();
  let timedOut = false;

  const onUserAbort = () => {
    controller.abort(userSignal?.reason);
  };

  if (userSignal) {
    if (userSignal.aborted) {
      onUserAbort();
    } else {
      userSignal.addEventListener('abort', onUserAbort, { once: true });
    }
  }

  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort(new Error('Request timed out'));
  }, safeTimeoutMs);

  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timer);
      userSignal?.removeEventListener('abort', onUserAbort);
    },
    didTimeout: () => timedOut && !(userSignal?.aborted ?? false),
  };
}

function waitWithAbort(delayMs: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) {
    return Promise.reject(
      new ApiError('Request cancelled', { code: 'ABORTED', retryable: false }),
    );
  }
  if (delayMs <= 0) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const onAbort = () => {
      clearTimeout(timer);
      reject(new ApiError('Request cancelled', { code: 'ABORTED', retryable: false }));
    };

    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, delayMs);

    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

function getTimeoutMessage(cleanEndpoint: string, method: string): string {
  if (method === 'POST' && cleanEndpoint.startsWith('/api/orders')) {
    return 'Network timeout: The café server did not respond in time. Your order was not confirmed; please retry.';
  }
  return 'The café server is taking longer than expected to wake up. Please tap Try Again in a few seconds.';
}

/**
 * Core HTTP fetch wrapper that formats errors, retries safe reads during cold starts,
 * and handles JSON serialization safely.
 */
export async function request<T>(endpoint: string, options?: ApiRequestOptions): Promise<T> {
  const { timeoutMs, retries, retryDelayMs, onRetry, ...fetchOptions } = options ?? {};
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const baseUrl = getBaseUrl();
  const url = baseUrl ? `${baseUrl}${cleanEndpoint}` : cleanEndpoint;
  const method = (fetchOptions.method || 'GET').toUpperCase();
  const isSafeRead = method === 'GET' || method === 'HEAD';

  const effectiveTimeoutMs = timeoutMs ?? (isSafeRead ? 30_000 : 25_000);
  const maxRetries = Math.max(0, retries ?? (isSafeRead ? 2 : 0));
  const baseRetryDelayMs = Math.max(0, retryDelayMs ?? 1500);
  const maxAttempts = 1 + maxRetries;

  const headers = new Headers(fetchOptions.headers);
  if (!headers.has('Accept')) headers.set('Accept', 'application/json');
  // Avoid attaching Content-Type on bodyless GET/HEAD requests so browsers skip CORS preflights
  if (fetchOptions.body !== undefined && fetchOptions.body !== null && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (cleanEndpoint.startsWith('/api/orders')) {
    const token =
      typeof localStorage !== 'undefined' ? localStorage.getItem('coffee_customer_token') : null;
    if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);
  }

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const userSignal = fetchOptions.signal ?? undefined;
    if (userSignal?.aborted) {
      throw new ApiError('Request cancelled', { code: 'ABORTED', retryable: false });
    }
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      throw new ApiError(
        'You appear to be offline. Please check your internet connection and try again.',
        { code: 'OFFLINE', retryable: true },
      );
    }

    const { signal, cleanup, didTimeout } = createAttemptSignal(effectiveTimeoutMs, userSignal);
    let retryReason: RetryInfo['reason'] | null = null;

    try {
      const response = await fetch(url, {
        ...fetchOptions,
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
            } else if (typeof errorData.message === 'string' && errorData.message) {
              errorMessage = errorData.message;
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

        const isRetryableGateway =
          isSafeRead &&
          (response.status === 408 ||
            response.status === 502 ||
            response.status === 504 ||
            (response.status === 503 && !isJson));

        if (isRetryableGateway && attempt < maxAttempts) {
          retryReason = 'gateway';
        } else {
          throw new ApiError(errorMessage, {
            status: response.status,
            code: 'HTTP',
            retryable: isRetryableGateway,
          });
        }
      } else if (!isJson) {
        // Prevent Safari's cryptic "The string did not match the expected pattern."
        // by inspecting non-JSON bodies (e.g. HTML pages returned by an unproxied dev server)
        throw new ApiError(
          `The server returned an unexpected response (non-JSON). Please verify the backend is running at ${getBaseUrl() || 'the configured API origin'}.`,
          {
            status: response.status,
            code: 'INVALID_RESPONSE',
            retryable: false,
          },
        );
      } else {
        return await response.json();
      }
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      if (userSignal?.aborted) {
        throw new ApiError('Request cancelled', {
          code: 'ABORTED',
          retryable: false,
          cause: error,
        });
      }

      if (error instanceof Error) {
        const isTimeout =
          didTimeout() ||
          error.name === 'TimeoutError' ||
          error.name === 'AbortError' ||
          error.message.includes('aborted');

        if (isTimeout) {
          if (isSafeRead && attempt < maxAttempts) {
            retryReason = 'timeout';
          } else {
            throw new ApiError(getTimeoutMessage(cleanEndpoint, method), {
              code: 'TIMEOUT',
              retryable: true,
              cause: error,
            });
          }
        } else if (typeof navigator !== 'undefined' && navigator.onLine === false) {
          throw new ApiError(
            'You appear to be offline. Please check your internet connection and try again.',
            {
              code: 'OFFLINE',
              retryable: true,
              cause: error,
            },
          );
        } else if (
          error.message === 'Failed to fetch' ||
          error.name === 'TypeError' ||
          error.name === 'SyntaxError' ||
          error.message.includes('expected pattern')
        ) {
          if (isSafeRead && attempt < maxAttempts && !(error instanceof SyntaxError)) {
            retryReason = 'network';
          } else {
            throw new ApiError(
              `Network error: Unable to connect to the café server. Please verify the backend is running at ${getBaseUrl() || 'the configured API origin'}.`,
              {
                code: 'NETWORK',
                retryable: true,
                cause: error,
              },
            );
          }
        } else {
          throw error;
        }
      } else {
        throw new ApiError('An unknown network error occurred. Please check backend connection.', {
          code: 'NETWORK',
          retryable: true,
          cause: error,
        });
      }
    } finally {
      cleanup();
    }

    if (retryReason && attempt < maxAttempts) {
      onRetry?.({
        attempt: attempt + 1,
        maxAttempts,
        reason: retryReason,
      });
      await waitWithAbort(baseRetryDelayMs * attempt, userSignal);
    }
  }

  throw new ApiError(getTimeoutMessage(cleanEndpoint, method), {
    code: 'TIMEOUT',
    retryable: true,
  });
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
export async function getCategories(
  activeOnly: boolean = true,
  requestOptions?: ApiRequestOptions,
): Promise<Category[]> {
  const query = activeOnly ? '?active_only=true' : '';
  return request<Category[]>(`/api/categories${query}`, requestOptions);
}

/**
 * Fetch products with optional filtering from GET /api/products
 * Supports: category_id, category (name), search, is_available
 */
export async function getProducts(
  filters?: ProductFilters,
  requestOptions?: ApiRequestOptions,
): Promise<Product[]> {
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
  return request<Product[]>(`/api/products${query}`, requestOptions);
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
