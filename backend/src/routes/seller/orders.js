import { Router } from 'express';
import { dbQuery } from '../../db/database.js';
import { authenticateSeller } from '../../middleware/auth.js';

const router = Router();
router.use(authenticateSeller);

/**
 * Returns active store IDs assigned to the seller.
 */
async function getSellerActiveStoreIds(sellerId) {
  const result = await dbQuery(`
    SELECT sa.store_id
    FROM seller_store_assignments sa
    JOIN stores s ON sa.store_id = s.id
    WHERE sa.seller_id = $1 AND s.is_active = TRUE
  `, [sellerId]);

  return (result.rows || []).map(r => Number(r.store_id));
}

/**
 * GET /api/seller/orders
 * Read-only store-isolated order list for the authenticated seller.
 * Fail-closed: only returns orders where store_id matches an assigned active store.
 */
router.get('/', async (req, res, next) => {
  try {
    const activeStoreIds = await getSellerActiveStoreIds(req.seller.id);

    // Fail-closed: unassigned seller or seller with inactive stores receives empty list
    if (activeStoreIds.length === 0) {
      return res.json({
        items: [],
        total: 0,
        limit: 50,
        offset: 0,
        message: 'No active stores currently assigned to this seller account.',
      });
    }

    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const offset = Math.max(0, parseInt(req.query.offset, 10) || 0);
    const requestedStoreId = req.query.store_id ? parseInt(req.query.store_id, 10) : null;

    let targetStoreIds = activeStoreIds;
    if (requestedStoreId) {
      if (!activeStoreIds.includes(requestedStoreId)) {
        return res.status(403).json({ detail: 'Access denied: You are not assigned to this store.' });
      }
      targetStoreIds = [requestedStoreId];
    }

    const whereClauses = ['store_id = ANY($1)'];
    const params = [targetStoreIds];

    if (req.query.status) {
      params.push(String(req.query.status).trim().toLowerCase());
      whereClauses.push(`order_status = $${params.length}`);
    }

    const whereSql = `WHERE ${whereClauses.join(' AND ')}`;

    const countRes = await dbQuery(`SELECT COUNT(*)::int AS count FROM orders ${whereSql}`, params);
    const total = countRes.rows[0]?.count || 0;

    const listParams = [...params, limit, offset];
    const listRes = await dbQuery(`
      SELECT
        id, order_number, customer_name, customer_phone, customer_email,
        subtotal_usd, total_usd, total_khr, payment_method, payment_status,
        order_status, store_id, created_at
      FROM orders
      ${whereSql}
      ORDER BY id DESC
      LIMIT $${listParams.length - 1} OFFSET $${listParams.length}
    `, listParams);

    const items = listRes.rows.map(o => ({
      id: o.id,
      order_number: o.order_number,
      customer_name: o.customer_name,
      customer_phone: o.customer_phone,
      customer_email: o.customer_email || null,
      subtotal_usd: Number(o.subtotal_usd),
      total_usd: Number(o.total_usd),
      total_khr: Number(o.total_khr),
      payment_method: o.payment_method,
      payment_status: o.payment_status,
      order_status: o.order_status,
      store_id: o.store_id,
      created_at: o.created_at,
    }));

    res.json({
      items,
      total,
      limit,
      offset,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/seller/orders/:id
 * Read-only store-isolated order detail for the authenticated seller.
 */
router.get('/:id', async (req, res, next) => {
  try {
    const orderId = parseInt(req.params.id, 10);
    if (!Number.isInteger(orderId) || orderId <= 0) {
      return res.status(400).json({ detail: 'Invalid order ID.' });
    }

    const activeStoreIds = await getSellerActiveStoreIds(req.seller.id);
    if (activeStoreIds.length === 0) {
      return res.status(404).json({ detail: 'Order not found.' });
    }

    const orderRes = await dbQuery(`
      SELECT
        id, order_number, customer_name, customer_phone, customer_email,
        notes, subtotal_usd, total_usd, total_khr, payment_method,
        payment_status, order_status, store_id, created_at
      FROM orders
      WHERE id = $1 AND store_id = ANY($2)
    `, [orderId, activeStoreIds]);

    if (orderRes.rows.length === 0) {
      return res.status(404).json({ detail: 'Order not found.' });
    }

    const order = orderRes.rows[0];

    const itemsRes = await dbQuery(`
      SELECT
        id, order_id, product_id, product_name, quantity,
        unit_price_usd, subtotal_usd, size, sugar_level, ice_level, toppings
      FROM order_items
      WHERE order_id = $1
      ORDER BY id ASC
    `, [orderId]);

    res.json({
      id: order.id,
      order_number: order.order_number,
      customer_name: order.customer_name,
      customer_phone: order.customer_phone,
      customer_email: order.customer_email || null,
      notes: order.notes || null,
      subtotal_usd: Number(order.subtotal_usd),
      total_usd: Number(order.total_usd),
      total_khr: Number(order.total_khr),
      payment_method: order.payment_method,
      payment_status: order.payment_status,
      order_status: order.order_status,
      store_id: order.store_id,
      created_at: order.created_at,
      items: (itemsRes.rows || []).map(i => ({
        ...i,
        quantity: Number(i.quantity),
        unit_price_usd: Number(i.unit_price_usd),
        subtotal_usd: Number(i.subtotal_usd),
      })),
    });
  } catch (err) {
    next(err);
  }
});

// Reject order mutations fail-closed in this phase
router.all('*', (req, res) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return res.status(405).json({ detail: 'Seller order mutations are not permitted in this phase.' });
  }
  res.status(404).json({ detail: 'Not found.' });
});

export default router;
