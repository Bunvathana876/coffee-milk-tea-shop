import { request } from './api';
import type { CreateOrderPayload, Order } from '../types';

/**
 * Sends a new order payload to POST /api/orders/.
 */
export async function createOrder(
  payload: CreateOrderPayload,
  idempotencyKey?: string,
): Promise<Order> {
  return request<Order>('/api/orders/', {
    method: 'POST',
    headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined,
    body: JSON.stringify(payload),
  });
}

/**
 * Fetches an existing order by its numeric ID
 */
export async function getOrderById(id: number): Promise<Order> {
  return request<Order>(`/api/orders/${id}`);
}

/**
 * Fetches an existing order by its alphanumeric order reference (e.g. ORD-20261008-ABC123)
 */
export async function getOrderByReference(orderNumber: string): Promise<Order> {
  return request<Order>(`/api/orders/ref/${encodeURIComponent(orderNumber)}`);
}

/**
 * Fetches all orders placed by the currently authenticated customer
 */
export async function getMyOrders(): Promise<Order[]> {
  return request<Order[]>('/api/orders');
}

/**
 * Fetches all orders placed with a customer's phone number
 */
export async function getOrdersByPhone(phone: string): Promise<Order[]> {
  return request<Order[]>(
    `/api/orders/lookup/phone?phone=${encodeURIComponent(phone.trim())}`,
  );
}
