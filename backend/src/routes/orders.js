import { Router } from 'express';
import { dbQuery, withTransaction } from '../db/database.js';
import { config } from '../config.js';
import { generateOrderNumber } from '../utils/calculations.js';
import { OrderInputError, validateOrderPayload, readIdempotencyKey, hashOrderPayload, calculateOrderItem } from '../utils/orderValidation.js';
import { authenticateCustomer } from '../middleware/auth.js';

const router = Router();
router.use(authenticateCustomer);

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

// POST /api/orders (and /api/orders/)
router.post(['/', ''], async (req, res, next) => {
  try {
    const order = validateOrderPayload(req.body);
    const idempotencyKey = readIdempotencyKey(req.get('Idempotency-Key'));
    const requestHash = idempotencyKey ? hashOrderPayload(order) : null;

    const result = await withTransaction(async query => {
      if (idempotencyKey) {
        const reservation = await query(`
          INSERT INTO order_idempotency (customer_id, idempotency_key, request_hash)
          VALUES ($1, $2, $3)
          ON CONFLICT (customer_id, idempotency_key) DO NOTHING
          RETURNING order_id
        `, [req.customer.id, idempotencyKey, requestHash]);
        if (reservation.rowCount === 0) {
          const existing = await query(`
            SELECT request_hash, order_id FROM order_idempotency
            WHERE customer_id = $1 AND idempotency_key = $2 FOR UPDATE
          `, [req.customer.id, idempotencyKey]);
          const record = existing.rows[0];
          if (!record) throw new Error('Idempotency reservation was unavailable.');
          if (record.request_hash !== requestHash) {
            throw new OrderInputError('Idempotency-Key was already used for a different order.', 409);
          }
          if (!record.order_id) throw new Error('Completed idempotency reservation has no order.');
          const prior = await query('SELECT * FROM orders WHERE id = $1', [record.order_id]);
          if (!prior.rows[0] || Number(prior.rows[0].customer_id) !== Number(req.customer.id)) {
            throw new Error('Idempotent order was unavailable.');
          }
          return { formatted: await formatOrderWithItems(prior.rows[0], query), replay: true };
        }
      }

      const processedItems = [];
      let totalCents = 0;
      for (const item of order.items) {
        const productResult = await query(`
          SELECT p.id, p.name, p.base_price_usd, p.is_available, c.is_active
          FROM products p JOIN categories c ON c.id = p.category_id
          WHERE p.id = $1 FOR SHARE OF p, c
        `, [item.product_id]);
        const product = productResult.rows[0];
        if (!product) throw new OrderInputError(`Product ${item.product_id} does not exist.`);
        if (!product.is_available || !product.is_active) {
          throw new OrderInputError(`Product ${item.product_id} is unavailable.`);
        }
        const processed = calculateOrderItem(product, item);
        totalCents += processed.subtotalCents;
        if (!Number.isSafeInteger(totalCents) || totalCents > 9999999999) {
          throw new OrderInputError('Order exceeds the supported USD amount.');
        }
        processedItems.push(processed);
      }
      const totalUsd = totalCents / 100;
      if (!Number.isFinite(config.usdToKhrRate) || config.usdToKhrRate <= 0) {
        throw new Error('Invalid server currency conversion rate.');
      }
      const totalKhr = Math.round(totalUsd * config.usdToKhrRate);
      if (!Number.isSafeInteger(totalKhr) || totalKhr > 999999999999) {
        throw new OrderInputError('Order exceeds the supported KHR amount.');
      }
      const orderResult = await query(`
        INSERT INTO orders (
          order_number, customer_name, customer_phone, customer_email, notes,
          subtotal_usd, total_usd, total_khr, payment_method, customer_id, payment_status, order_status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'unpaid', 'pending')
        RETURNING *
      `, [
        generateOrderNumber(),
        order.customer_name,
        order.customer_phone,
        order.customer_email,
        order.notes,
        totalUsd,
        totalUsd,
        totalKhr,
        order.payment_method,
        req.customer.id
      ]);

      const createdOrder = orderResult.rows[0];
      const orderId = createdOrder.id;

      for (const item of processedItems) {
        await query(`
          INSERT INTO order_items (
            order_id, product_id, product_name, quantity,
            unit_price_usd, subtotal_usd, size, sugar_level, ice_level, toppings
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [
          orderId,
          item.product_id,
          item.product_name,
          item.quantity,
          item.unit_price_usd,
          item.subtotal_usd,
          item.size,
          item.sugar_level,
          item.ice_level,
          item.toppings
        ]);
      }

      // Credit the authenticated order owner, regardless of contact phone.
      const loyaltyResult = await query('UPDATE customer_users SET loyalty_stamps = loyalty_stamps + 1 WHERE id = $1', [req.customer.id]);
      if (loyaltyResult.rowCount !== 1) {
        throw new Error('Order owner was unavailable during loyalty credit.');
      }
      if (idempotencyKey) {
        const linked = await query(`
          UPDATE order_idempotency SET order_id = $3
          WHERE customer_id = $1 AND idempotency_key = $2
        `, [req.customer.id, idempotencyKey, orderId]);
        if (linked.rowCount !== 1) throw new Error('Idempotency order link was unavailable.');
      }
      return { formatted: await formatOrderWithItems(createdOrder, query), replay: false };
    });
    res.status(result.replay ? 200 : 201).json(result.formatted);
  } catch (err) {
    if (err instanceof OrderInputError) return res.status(err.status).json({ detail: err.message });
    next(err);
  }
});

// GET /api/orders — all server orders owned by the current customer.
router.get(['/', ''], async (req, res, next) => {
  try {
    const ordersRes = await dbQuery(`
      SELECT * FROM orders WHERE customer_id = $1 ORDER BY id DESC
    `, [req.customer.id]);
    res.json(await Promise.all(ordersRes.rows.map(order => formatOrderWithItems(order))));
  } catch (err) {
    next(err);
  }
});

// GET /api/orders/lookup/phone
router.get('/lookup/phone', async (req, res, next) => {
  try {
    const phone = req.query.phone;
    if (!phone || !String(phone).trim()) {
      return res.status(400).json({ detail: 'Phone query parameter is required.' });
    }
    const ordersRes = await dbQuery(`
      SELECT * FROM orders
      WHERE customer_id = $1 AND customer_phone = $2
      ORDER BY id DESC
    `, [req.customer.id, String(phone).trim()]);

    const orders = await Promise.all(ordersRes.rows.map(order => formatOrderWithItems(order)));

    res.json(orders);
  } catch (err) {
    next(err);
  }
});

// GET /api/orders/ref/:order_number
router.get('/ref/:order_number', async (req, res, next) => {
  try {
    const orderNumber = decodeURIComponent(req.params.order_number).trim();

    const orderRes = await dbQuery('SELECT * FROM orders WHERE order_number = $1', [orderNumber]);
    if (orderRes.rows.length === 0 || Number(orderRes.rows[0].customer_id) !== Number(req.customer.id)) {
      return res.status(404).json({ detail: 'Order not found.' });
    }

    const formatted = await formatOrderWithItems(orderRes.rows[0]);
    res.json(formatted);
  } catch (err) {
    next(err);
  }
});

// GET /api/orders/:id
router.get('/:id', async (req, res, next) => {
  try {
    const orderId = parseInt(req.params.id, 10);
    if (isNaN(orderId)) {
      return res.status(400).json({ detail: 'Invalid order ID.' });
    }

    const orderRes = await dbQuery('SELECT * FROM orders WHERE id = $1', [orderId]);
    if (orderRes.rows.length === 0 || Number(orderRes.rows[0].customer_id) !== Number(req.customer.id)) {
      return res.status(404).json({ detail: 'Order not found.' });
    }

    const formatted = await formatOrderWithItems(orderRes.rows[0]);
    res.json(formatted);
  } catch (err) {
    next(err);
  }
});

export default router;
