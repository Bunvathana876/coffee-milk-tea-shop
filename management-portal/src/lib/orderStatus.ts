/**
 * Brew & Boba — Standardized Order Status Presentation
 * Authoritative color mappings shared across Dashboard, Analytics, Orders, and badges:
 *
 * Pending:   Amber   #F59E0B
 * Preparing: Blue    #3B82F6
 * Ready:     Purple  #8B5CF6
 * Completed: Emerald #10B981
 * Cancelled: Red     #EF4444
 * Unknown:   Neutral #94A3B8
 *
 * Payment status is tracked independently from fulfillment status.
 */

export type CanonicalOrderStatus = 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled'

export interface OrderStatusConfig {
  key: string
  label: string
  color: string
  hex: string
  gradient: [string, string]
  badgeClass: string
  dotClass: string
  description: string
}

export const CANONICAL_ORDER_STATUSES: readonly CanonicalOrderStatus[] = [
  'pending',
  'preparing',
  'ready',
  'completed',
  'cancelled',
] as const

export const ORDER_STATUS_CONFIG: Record<CanonicalOrderStatus | 'unknown', OrderStatusConfig> = {
  pending: {
    key: 'pending',
    label: 'Pending',
    color: '#F59E0B',
    hex: '#F59E0B',
    gradient: ['#FBBF24', '#D97706'],
    badgeClass: 'status-badge status-pending',
    dotClass: 'status-dot-pending',
    description: 'Awaiting drink preparation in queue',
  },
  preparing: {
    key: 'preparing',
    label: 'Preparing',
    color: '#3B82F6',
    hex: '#3B82F6',
    gradient: ['#3B82F6', '#1D4ED8'],
    badgeClass: 'status-badge status-preparing',
    dotClass: 'status-dot-preparing',
    description: 'Drinks currently being crafted at the bar',
  },
  ready: {
    key: 'ready',
    label: 'Ready',
    color: '#8B5CF6',
    hex: '#8B5CF6',
    gradient: ['#A855F7', '#7C3AED'],
    badgeClass: 'status-badge status-ready',
    dotClass: 'status-dot-ready',
    description: 'Ready for customer counter pickup and handoff',
  },
  completed: {
    key: 'completed',
    label: 'Completed',
    color: '#10B981',
    hex: '#10B981',
    gradient: ['#34D399', '#059669'],
    badgeClass: 'status-badge status-completed',
    dotClass: 'status-dot-completed',
    description: 'Successfully picked up and handed to customer',
  },
  cancelled: {
    key: 'cancelled',
    label: 'Cancelled',
    color: '#EF4444',
    hex: '#EF4444',
    gradient: ['#F87171', '#DC2626'],
    badgeClass: 'status-badge status-cancelled',
    dotClass: 'status-dot-cancelled',
    description: 'Order voided or cancelled',
  },
  unknown: {
    key: 'unknown',
    label: 'Unknown',
    color: '#94A3B8',
    hex: '#94A3B8',
    gradient: ['#CBD5E1', '#94A3B8'],
    badgeClass: 'status-badge status-unknown',
    dotClass: 'status-dot-unknown',
    description: 'Unrecognized order status',
  },
}

export interface StatusBadgeResult {
  className: string
  label: string
  color: string
  hex: string
}

export function getOrderStatusBadge(status: string | null | undefined): StatusBadgeResult {
  const norm = (status || '').toLowerCase().trim() as CanonicalOrderStatus
  if (norm in ORDER_STATUS_CONFIG) {
    const config = ORDER_STATUS_CONFIG[norm]
    return {
      className: config.badgeClass,
      label: config.label,
      color: config.color,
      hex: config.hex,
    }
  }
  return {
    className: 'status-badge status-unknown',
    label: status ? String(status) : 'Unknown',
    color: '#94A3B8',
    hex: '#94A3B8',
  }
}

export interface PaymentBadgeResult {
  className: string
  label: string
}

export function getPaymentStatusBadge(status: string | null | undefined): PaymentBadgeResult {
  const norm = (status || '').toLowerCase().trim()
  switch (norm) {
    case 'paid':
      return { className: 'payment-badge payment-paid', label: 'Paid' }
    case 'unpaid':
      return { className: 'payment-badge payment-unpaid', label: 'Unpaid' }
    case 'failed':
      return { className: 'payment-badge payment-failed', label: 'Failed' }
    default:
      return { className: 'payment-badge payment-unknown', label: status || 'Unknown' }
  }
}
