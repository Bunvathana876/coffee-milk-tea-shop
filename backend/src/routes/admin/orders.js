import { Router } from 'express';
import { dbQuery, withTransaction } from '../../db/database.js';
import { authenticateStaff, requireAdmin } from '../../middleware/auth.js';
import { validId } from '../../utils/adminCatalogValidation.js';
import { recordCashSettlement, SettlementError } from '../../utils/cashSettlement.js';

const router = Router();
router.use(authenticateStaff);

const transitions = {
  pending: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

router.post('/:id/cash-settlement', requireAdmin, async (req, res, next) => {
  try {
    if (!validId(req.params.id)) return res.status(400).json({ detail: 'Invalid order ID.' });
    const audit = await withTransaction(query => recordCashSettlement(query, Number(req.params.id), req.staff.id, req.body));
    res.status(201).json(audit);
  } catch (error) {
    if (error instanceof SettlementError) return res.status(error.status).json({ detail: error.message });
    if (error.code === '23505') return res.status(409).json({ detail: 'Cash settlement already recorded.' });
    if (error.code === '42P01') return res.status(503).json({ detail: 'Cash reconciliation requires the approved database migration.' });
    next(error);
  }
});

router.get('/:id/payment-audit', requireAdmin, async (req, res, next) => {
  try {
    if (!validId(req.params.id)) return res.status(400).json({ detail: 'Invalid order ID.' });
    const result = await dbQuery('SELECT id, order_id, staff_id, method, reference, amount_usd, recorded_at FROM payment_settlements WHERE order_id = $1', [Number(req.params.id)]);
    res.json(result.rows);
  } catch (error) { next(error); }
});

async function formatOrderWithItems(order, query = dbQuery) {
  if (!order) return null;
  const itemsRes = await query(`
    SELECT
      id, order_id, product_id, product_name, quantity,
      unit_price_usd, subtotal_usd, size, sugar_level, ice_level, toppings
    FROM order_items
    WHERE order_id = $1
    ORDER BY id ASC
  `, [order.id]);

  const items = itemsRes.rows.map(item => ({
    ...item,
    quantity: Number(item.quantity),
    unit_price_usd: Number(item.unit_price_usd),
    subtotal_usd: Number(item.subtotal_usd),
    toppings: item.toppings || '',
  }));

  return {
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
    created_at: order.created_at,
    items,
  };
}

// GET /api/admin/orders
router.get('/', requireAdmin, async (req, res, next) => {
  try {
    const { status, limit = '50', offset = '0' } = req.query;

    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
    const parsedOffset = Math.max(parseInt(offset, 10) || 0, 0);

    let query = 'SELECT * FROM orders WHERE 1=1';
    const params = [];

    if (status && String(status).trim()) {
      params.push(String(status).trim());
      query += ` AND order_status = $${params.length}`;
    }

    params.push(parsedLimit);
    query += ` ORDER BY id DESC LIMIT $${params.length}`;

    params.push(parsedOffset);
    query += ` OFFSET $${params.length}`;

    const ordersRes = await dbQuery(query, params);
    const orders = await Promise.all(ordersRes.rows.map(o => formatOrderWithItems(o)));

    let countQuery = 'SELECT COUNT(*) as count FROM orders WHERE 1=1';
    const countParams = [];
    if (status && String(status).trim()) {
      countParams.push(String(status).trim());
      countQuery += ` AND order_status = $${countParams.length}`;
    }
    const totalRes = await dbQuery(countQuery, countParams);
    const total = Number(totalRes.rows[0]?.count || 0);

    // Status counts
    const statusCountsRaw = await dbQuery(`
      SELECT order_status, COUNT(*) as count FROM orders GROUP BY order_status
    `);
    const counts_by_status = {
      pending: 0,
      preparing: 0,
      completed: 0,
      cancelled: 0,
    };
    for (const sc of statusCountsRaw.rows) {
      counts_by_status[sc.order_status] = Number(sc.count);
    }

    res.json({
      items: orders,
      total,
      limit: parsedLimit,
      offset: parsedOffset,
      counts_by_status,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/orders/:id
router.get('/:id', requireAdmin, async (req, res, next) => {
  try {
    if (!validId(req.params.id)) return res.status(400).json({ detail: 'Invalid order ID.' });
    const orderId = Number(req.params.id);
    const orderRes = await dbQuery('SELECT * FROM orders WHERE id = $1', [orderId]);
    if (orderRes.rows.length === 0) {
      return res.status(404).json({ detail: 'Order not found.' });
    }
    const formatted = await formatOrderWithItems(orderRes.rows[0]);
    res.json(formatted);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/orders/:id/status
router.patch('/:id/status', requireAdmin, async (req, res, next) => {
  try {
    if (!validId(req.params.id)) return res.status(400).json({ detail: 'Invalid order ID.' });
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body) ||
        Object.keys(req.body).some(key => key !== 'order_status') ||
        typeof req.body.order_status !== 'string' || !(req.body.order_status in transitions)) {
      return res.status(422).json({ detail: 'Only a valid order status can be changed. Payment changes require a verified workflow.' });
    }
    const orderId = Number(req.params.id);
    const nextStatus = req.body.order_status;
    const result = await withTransaction(async query => {
      const currentRes = await query('SELECT * FROM orders WHERE id = $1 FOR UPDATE', [orderId]);
      const current = currentRes.rows[0];
      if (!current) return { status: 404, detail: 'Order not found.' };
      if (current.order_status !== nextStatus && !transitions[current.order_status]?.includes(nextStatus)) {
        return { status: 409, detail: 'This order cannot move to the requested status.' };
      }
      if (nextStatus === 'cancelled' && current.payment_status === 'paid') {
        return { status: 409, detail: 'Paid orders require a verified refund workflow before cancellation.' };
      }
      if (current.order_status !== nextStatus) {
        await query('UPDATE orders SET order_status = $1 WHERE id = $2', [nextStatus, orderId]);
      }
      const updated = await query('SELECT * FROM orders WHERE id = $1', [orderId]);
      return { order: await formatOrderWithItems(updated.rows[0], query) };
    });
    if (result.status) return res.status(result.status).json({ detail: result.detail });
    res.json(result.order);
  } catch (err) {
    next(err);
  }
});

export default router;
