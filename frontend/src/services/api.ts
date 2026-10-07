import type { Category, Product, HealthCheckResponse } from '../types';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface ProductFilters {
  categoryId?: number;
  category?: string;
  search?: string;
  isAvailable?: boolean;
}

/**
 * Core HTTP fetch wrapper that formats errors and handles JSON serialization.
 */
export async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json();
        if (errorData.detail) {
          errorMessage = typeof errorData.detail === 'string' ? errorData.detail : JSON.stringify(errorData.detail);
        }
      } catch {
        // fallback to standard status message
      }
      throw new Error(errorMessage);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('An unknown network error occurred. Please check backend connection.');
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
