import { getBaseUrl, request } from './api';
import type {
  CustomerNotification,
  NotificationListResponse,
  NotificationSyncEvent,
} from '../types';

export interface NotificationQueryOptions {
  unreadOnly?: boolean;
  limit?: number;
  token?: string;
}

function buildAuthHeaders(token?: string): Record<string, string> | undefined {
  if (!token) return undefined;
  return { Authorization: `Bearer ${token}` };
}

/**
 * Fetch the authenticated customer's persisted notifications from GET /api/notifications.
 */
export async function getMyNotifications(
  options: NotificationQueryOptions = {},
): Promise<NotificationListResponse> {
  const params = new URLSearchParams();
  if (options.unreadOnly) params.set('unread_only', 'true');
  if (options.limit !== undefined) params.set('limit', String(options.limit));
  const query = params.toString() ? `?${params.toString()}` : '';
  return request<NotificationListResponse>(`/api/notifications${query}`, {
    headers: buildAuthHeaders(options.token),
    retries: 1,
    timeoutMs: 12_000,
  });
}

/**
 * Mark a single customer notification as read via PATCH /api/notifications/:id/read.
 */
export async function markNotificationRead(
  notificationId: number,
  token?: string,
): Promise<{ notification: CustomerNotification; unread_count: number }> {
  return request<{ notification: CustomerNotification; unread_count: number }>(
    `/api/notifications/${notificationId}/read`,
    {
      method: 'PATCH',
      headers: buildAuthHeaders(token),
      body: JSON.stringify({}),
    },
  );
}

/**
 * Mark all unread notifications for the customer as read via PATCH /api/notifications/read-all.
 */
export async function markAllNotificationsRead(
  token?: string,
): Promise<{ updated_count: number; unread_count: number }> {
  return request<{ updated_count: number; unread_count: number }>('/api/notifications/read-all', {
    method: 'PATCH',
    headers: buildAuthHeaders(token),
    body: JSON.stringify({}),
  });
}

export interface NotificationStreamHandlers {
  token: string;
  signal: AbortSignal;
  onConnected?: () => void;
  onNotification?: (notification: CustomerNotification) => void;
  onSync?: (event: NotificationSyncEvent) => void;
  onUnauthorized?: () => void;
}

/**
 * Parses a single Server-Sent Events block separated by a blank line.
 */
export function parseSseBlock(block: string): { event: string; data: string } | null {
  const lines = block.split(/\r?\n/);
  let event = 'message';
  const dataLines: string[] = [];

  for (const rawLine of lines) {
    if (!rawLine || rawLine.startsWith(':')) continue;
    const colonIndex = rawLine.indexOf(':');
    const field = colonIndex === -1 ? rawLine : rawLine.slice(0, colonIndex);
    let value = colonIndex === -1 ? '' : rawLine.slice(colonIndex + 1);
    if (value.startsWith(' ')) value = value.slice(1);

    if (field === 'event') {
      event = value || 'message';
    } else if (field === 'data') {
      dataLines.push(value);
    }
  }

  if (dataLines.length === 0) return null;
  return { event, data: dataLines.join('\n') };
}

/**
 * Connects to GET /api/notifications/stream using fetch + ReadableStream so the JWT
 * travels exclusively in the Authorization header (never in URL query parameters).
 */
export async function connectNotificationStream({
  token,
  signal,
  onConnected,
  onNotification,
  onSync,
  onUnauthorized,
}: NotificationStreamHandlers): Promise<void> {
  const baseUrl = getBaseUrl();
  const url = baseUrl ? `${baseUrl}/api/notifications/stream` : '/api/notifications/stream';

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'text/event-stream',
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
    signal,
  });

  if (response.status === 401 || response.status === 403) {
    onUnauthorized?.();
    return;
  }

  if (!response.ok || !response.body) {
    throw new Error(`Notification stream unavailable (HTTP ${response.status}).`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/event-stream')) {
    throw new Error('Notification stream returned non-SSE content type.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (!signal.aborted) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const parts = buffer.split(/\r?\n\r?\n/);
      buffer = parts.pop() ?? '';

      for (const part of parts) {
        const parsed = parseSseBlock(part);
        if (!parsed) continue;
        try {
          const payload = JSON.parse(parsed.data);
          if (parsed.event === 'connected') {
            onConnected?.();
          } else if (parsed.event === 'notification') {
            onNotification?.(payload as CustomerNotification);
          } else if (parsed.event === 'notifications_sync') {
            onSync?.(payload as NotificationSyncEvent);
          }
        } catch {
          // Ignore malformed keepalive/event payloads without breaking the stream.
        }
      }
    }
  } finally {
    try {
      await reader.cancel();
    } catch {
      // Ignore cancel errors on already-closed streams.
    }
  }
}
