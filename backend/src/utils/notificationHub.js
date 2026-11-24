import { dbQuery } from '../db/database.js';

const MAX_CONNECTIONS_PER_CUSTOMER = 10;
const HEARTBEAT_INTERVAL_MS = 25_000;
const MAX_FALLBACK_NOTIFICATIONS_PER_CUSTOMER = 50;

// Active SSE response streams keyed by numeric customer_id.
const customerStreams = new Map();

// Graceful fallback store used ONLY if a database returns 42P01 (table not yet created).
let fallbackSeq = 1;
const fallbackStore = new Map();

function getFallbackList(customerId) {
  const key = Number(customerId);
  let list = fallbackStore.get(key);
  if (!list) {
    list = [];
    fallbackStore.set(key, list);
  }
  return list;
}

export function resetFallbackNotificationStore() {
  fallbackSeq = 1;
  fallbackStore.clear();
}

export function buildDrinkSummary(items = []) {
  if (!Array.isArray(items) || items.length === 0) {
    return 'your drink order';
  }
  const normalized = items
    .filter(item => item && item.product_name)
    .map(item => `${Number(item.quantity) || 1}× ${String(item.product_name).trim()}`);

  if (normalized.length === 0) return 'your drink order';
  if (normalized.length <= 2) return normalized.join(', ');
  const rest = normalized.length - 2;
  return `${normalized.slice(0, 2).join(', ')} + ${rest} more`;
}

export function formatNotificationRow(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    customer_id: Number(row.customer_id),
    order_id: row.order_id == null ? null : Number(row.order_id),
    order_number: String(row.order_number),
    type: String(row.type || 'order_ready'),
    title: String(row.title),
    message: String(row.message),
    is_read: Boolean(row.is_read),
    read_at: row.read_at || null,
    created_at: row.created_at,
  };
}

function writeSseFrame(res, eventName, payload) {
  if (res.writableEnded || res.destroyed) return false;
  try {
    res.write(`event: ${eventName}\n`);
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
    return true;
  } catch {
    return false;
  }
}

export function publishCustomerEvent(customerId, eventName, payload) {
  const key = Number(customerId);
  const streams = customerStreams.get(key);
  if (!streams || streams.size === 0) return 0;

  let delivered = 0;
  for (const res of [...streams]) {
    if (writeSseFrame(res, eventName, payload)) {
      delivered += 1;
    } else {
      streams.delete(res);
    }
  }
  if (streams.size === 0) {
    customerStreams.delete(key);
  }
  return delivered;
}

export function subscribeCustomerStream(customerId, req, res) {
  const key = Number(customerId);
  let streams = customerStreams.get(key);
  if (!streams) {
    streams = new Set();
    customerStreams.set(key, streams);
  }

  // Enforce bounded concurrent SSE connections per customer (evict oldest if needed).
  while (streams.size >= MAX_CONNECTIONS_PER_CUSTOMER) {
    const oldest = streams.values().next().value;
    if (!oldest) break;
    streams.delete(oldest);
    try {
      oldest.end();
    } catch {
      // Ignore closed socket errors.
    }
  }

  res.status(200);
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  streams.add(res);
  writeSseFrame(res, 'connected', { status: 'connected', customer_id: key });

  const heartbeat = setInterval(() => {
    if (res.writableEnded || res.destroyed) {
      cleanup();
      return;
    }
    try {
      res.write(': keepalive\n\n');
    } catch {
      cleanup();
    }
  }, HEARTBEAT_INTERVAL_MS);
  heartbeat.unref?.();

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    clearInterval(heartbeat);
    const active = customerStreams.get(key);
    if (active) {
      active.delete(res);
      if (active.size === 0) customerStreams.delete(key);
    }
  };

  req.on('close', cleanup);
  res.on('close', cleanup);
  res.on('error', cleanup);
}

export function closeAllNotificationStreams() {
  for (const streams of customerStreams.values()) {
    for (const res of streams) {
      try {
        res.end();
      } catch {
        // Ignore already-closed responses.
      }
    }
  }
  customerStreams.clear();
}

export function getActiveNotificationStreamCount(customerId) {
  if (customerId !== undefined) {
    return customerStreams.get(Number(customerId))?.size ?? 0;
  }
  let total = 0;
  for (const streams of customerStreams.values()) {
    total += streams.size;
  }
  return total;
}

export async function createOrderReadyNotification(order, customerId) {
  if (!order || !customerId) return null;
  const numericCustomerId = Number(customerId);
  if (!Number.isInteger(numericCustomerId) || numericCustomerId <= 0) return null;

  const drinkSummary = buildDrinkSummary(order.items);
  const title = 'Your drink is ready for pickup!';
  const message = `Order ${order.order_number} (${drinkSummary}) is ready at the counter. Please come get your drink!`;

  let notification;
  try {
    const inserted = await dbQuery(
      `
      INSERT INTO customer_notifications (
        customer_id, order_id, order_number, type, title, message
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `,
      [numericCustomerId, order.id, order.order_number, 'order_ready', title, message],
    );
    notification = formatNotificationRow(inserted.rows[0]);
  } catch (err) {
    if (err?.code !== '42P01') throw err;
    // Table not yet created on an unmigrated database — keep live alerts working via memory buffer.
    const list = getFallbackList(numericCustomerId);
    const row = {
      id: fallbackSeq++,
      customer_id: numericCustomerId,
      order_id: order.id,
      order_number: order.order_number,
      type: 'order_ready',
      title,
      message,
      is_read: false,
      read_at: null,
      created_at: new Date().toISOString(),
    };
    list.unshift(row);
    if (list.length > MAX_FALLBACK_NOTIFICATIONS_PER_CUSTOMER) {
      list.length = MAX_FALLBACK_NOTIFICATIONS_PER_CUSTOMER;
    }
    notification = formatNotificationRow(row);
  }

  if (notification) {
    publishCustomerEvent(numericCustomerId, 'notification', notification);
  }
  return notification;
}

export async function resolveOrderReadyNotifications(orderId, customerId, nextStatus) {
  if (!orderId || !customerId) return 0;
  const numericCustomerId = Number(customerId);
  const numericOrderId = Number(orderId);
  if (!Number.isInteger(numericCustomerId) || numericCustomerId <= 0) return 0;

  let resolvedCount = 0;
  try {
    const res = await dbQuery(
      `
      UPDATE customer_notifications
      SET is_read = TRUE, read_at = CURRENT_TIMESTAMP
      WHERE order_id = $1 AND customer_id = $2 AND type = 'order_ready' AND is_read = FALSE
    `,
      [numericOrderId, numericCustomerId],
    );
    resolvedCount = res.rowCount || 0;
  } catch (err) {
    if (err?.code !== '42P01') throw err;
    const list = getFallbackList(numericCustomerId);
    const now = new Date().toISOString();
    for (const item of list) {
      if (item.order_id === numericOrderId && item.type === 'order_ready' && !item.is_read) {
        item.is_read = true;
        item.read_at = now;
        resolvedCount += 1;
      }
    }
  }

  publishCustomerEvent(numericCustomerId, 'notifications_sync', {
    order_id: numericOrderId,
    order_status: nextStatus,
  });
  return resolvedCount;
}

export async function listCustomerNotifications(
  customerId,
  { unreadOnly = false, limit = 30 } = {},
) {
  const numericCustomerId = Number(customerId);
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 30, 1), 100);

  try {
    const query = unreadOnly
      ? `
        SELECT id, customer_id, order_id, order_number, type, title, message, is_read, read_at, created_at
        FROM customer_notifications
        WHERE customer_id = $1 AND is_read = FALSE
        ORDER BY id DESC
        LIMIT $2
      `
      : `
        SELECT id, customer_id, order_id, order_number, type, title, message, is_read, read_at, created_at
        FROM customer_notifications
        WHERE customer_id = $1
        ORDER BY id DESC
        LIMIT $2
      `;
    const [listRes, unreadRes] = await Promise.all([
      dbQuery(query, [numericCustomerId, safeLimit]),
      dbQuery(
        'SELECT COUNT(*)::int AS count FROM customer_notifications WHERE customer_id = $1 AND is_read = FALSE',
        [numericCustomerId],
      ),
    ]);

    return {
      items: listRes.rows.map(formatNotificationRow),
      unread_count: Number(unreadRes.rows[0]?.count || 0),
    };
  } catch (err) {
    if (err?.code !== '42P01') throw err;
    const all = getFallbackList(numericCustomerId);
    const unread_count = all.filter(n => !n.is_read).length;
    const filtered = unreadOnly ? all.filter(n => !n.is_read) : all;
    return {
      items: filtered.slice(0, safeLimit).map(formatNotificationRow),
      unread_count,
    };
  }
}

export async function markNotificationRead(customerId, notificationId) {
  const numericCustomerId = Number(customerId);
  const numericId = Number(notificationId);

  try {
    const updatedRes = await dbQuery(
      `
      UPDATE customer_notifications
      SET is_read = TRUE, read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
      WHERE id = $1 AND customer_id = $2
      RETURNING id, customer_id, order_id, order_number, type, title, message, is_read, read_at, created_at
    `,
      [numericId, numericCustomerId],
    );
    if (updatedRes.rows.length === 0) return null;

    const unreadRes = await dbQuery(
      'SELECT COUNT(*)::int AS count FROM customer_notifications WHERE customer_id = $1 AND is_read = FALSE',
      [numericCustomerId],
    );

    return {
      notification: formatNotificationRow(updatedRes.rows[0]),
      unread_count: Number(unreadRes.rows[0]?.count || 0),
    };
  } catch (err) {
    if (err?.code !== '42P01') throw err;
    const all = getFallbackList(numericCustomerId);
    const target = all.find(n => n.id === numericId);
    if (!target) return null;
    if (!target.is_read) {
      target.is_read = true;
      target.read_at = new Date().toISOString();
    }
    return {
      notification: formatNotificationRow(target),
      unread_count: all.filter(n => !n.is_read).length,
    };
  }
}

export async function markAllNotificationsRead(customerId) {
  const numericCustomerId = Number(customerId);

  try {
    const res = await dbQuery(
      `
      UPDATE customer_notifications
      SET is_read = TRUE, read_at = CURRENT_TIMESTAMP
      WHERE customer_id = $1 AND is_read = FALSE
    `,
      [numericCustomerId],
    );
    return {
      updated_count: res.rowCount || 0,
      unread_count: 0,
    };
  } catch (err) {
    if (err?.code !== '42P01') throw err;
    const all = getFallbackList(numericCustomerId);
    const now = new Date().toISOString();
    let updated_count = 0;
    for (const item of all) {
      if (!item.is_read) {
        item.is_read = true;
        item.read_at = now;
        updated_count += 1;
      }
    }
    return { updated_count, unread_count: 0 };
  }
}
