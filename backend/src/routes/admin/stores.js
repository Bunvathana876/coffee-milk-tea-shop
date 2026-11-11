import { Router } from 'express';
import { dbQuery, withTransaction } from '../../db/database.js';
import { authenticateStaff, requireAdmin } from '../../middleware/auth.js';
import { logSecurityEvent } from '../../middleware/audit.js';

const router = Router();
router.use(authenticateStaff, requireAdmin);

const STORE_CODE_REGEX = /^[A-Z0-9-]{2,50}$/;

/**
 * GET /api/admin/stores
 * Administrator-only endpoint to list all café stores with active metrics.
 */
router.get('/', async (req, res, next) => {
  try {
    const status = req.query.status ? String(req.query.status).trim().toLowerCase() : 'all';
    const whereClauses = [];
    const params = [];

    if (status === 'active') {
      whereClauses.push('s.is_active = TRUE');
    } else if (status === 'inactive') {
      whereClauses.push('s.is_active = FALSE');
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const listRes = await dbQuery(`
      SELECT
        s.id, s.name, s.code, s.address, s.is_active, s.created_at,
        COUNT(DISTINCT sa.seller_id)::int AS assigned_sellers_count,
        COUNT(DISTINCT o.id)::int AS total_orders_count
      FROM stores s
      LEFT JOIN seller_store_assignments sa ON s.id = sa.store_id
      LEFT JOIN orders o ON s.id = o.store_id
      ${whereSql}
      GROUP BY s.id
      ORDER BY s.id ASC
    `, params);

    const metricsRes = await dbQuery(`
      SELECT
        COUNT(*)::int AS total_stores,
        COUNT(CASE WHEN is_active = TRUE THEN 1 END)::int AS active_stores,
        COUNT(CASE WHEN is_active = FALSE THEN 1 END)::int AS inactive_stores
      FROM stores
    `);
    const metricsRow = metricsRes.rows[0] || {};
    const metrics = {
      total_stores: metricsRow.total_stores || 0,
      active_stores: metricsRow.active_stores || 0,
      inactive_stores: metricsRow.inactive_stores || 0,
    };

    const items = listRes.rows.map(s => ({
      id: s.id,
      name: s.name,
      code: s.code,
      address: s.address || null,
      is_active: Boolean(s.is_active),
      created_at: s.created_at,
      assigned_sellers_count: s.assigned_sellers_count || 0,
      total_orders_count: s.total_orders_count || 0,
    }));

    res.json({
      items,
      total: items.length,
      metrics,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/stores/:id
 * Administrator-only endpoint for store details and assigned sellers.
 */
router.get('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ detail: 'Invalid store ID.' });
    }

    const storeRes = await dbQuery(`
      SELECT s.id, s.name, s.code, s.address, s.is_active, s.created_at
      FROM stores s
      WHERE s.id = $1
    `, [id]);

    if (storeRes.rows.length === 0) {
      return res.status(404).json({ detail: 'Store not found.' });
    }

    const store = storeRes.rows[0];

    // Query assigned sellers
    const assignmentsRes = await dbQuery(`
      SELECT su.id, su.full_name, su.email, su.is_active, sa.created_at AS assigned_at
      FROM seller_store_assignments sa
      JOIN staff_users su ON sa.seller_id = su.id
      WHERE sa.store_id = $1
      ORDER BY su.full_name ASC
    `, [id]);

    // Query order metrics
    const orderStatsRes = await dbQuery(`
      SELECT
        COUNT(*)::int AS total_orders,
        COALESCE(SUM(CASE WHEN payment_status = 'paid' AND order_status = 'completed' THEN total_usd ELSE 0 END), 0) AS revenue_usd
      FROM orders
      WHERE store_id = $1
    `, [id]);
    const orderStats = orderStatsRes.rows[0] || {};

    res.json({
      id: store.id,
      name: store.name,
      code: store.code,
      address: store.address || null,
      is_active: Boolean(store.is_active),
      created_at: store.created_at,
      total_orders: Number(orderStats.total_orders || 0),
      revenue_usd: Number(orderStats.revenue_usd || 0),
      assigned_sellers: assignmentsRes.rows.map(s => ({
        id: s.id,
        full_name: s.full_name,
        email: s.email,
        is_active: Boolean(s.is_active),
        assigned_at: s.assigned_at,
      })),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/admin/stores
 * Administrator-only endpoint to create a new café store.
 */
router.post('/', async (req, res, next) => {
  try {
    const { name, code, address = null, is_active = true } = req.body;

    if (!name || !code) {
      return res.status(400).json({ detail: 'Store name and unique code are required.' });
    }

    const cleanName = String(name).trim();
    const cleanCode = String(code).trim().toUpperCase();
    const cleanAddress = address ? String(address).trim() : null;

    if (cleanName.length < 2) {
      return res.status(400).json({ detail: 'Store name must be at least 2 characters.' });
    }

    if (!STORE_CODE_REGEX.test(cleanCode)) {
      return res.status(400).json({ detail: 'Store code must be 2-50 alphanumeric characters or hyphens.' });
    }

    // Check code uniqueness
    const existing = await dbQuery('SELECT id FROM stores WHERE LOWER(code) = LOWER($1)', [cleanCode]);
    if (existing.rows && existing.rows.length > 0) {
      return res.status(409).json({ detail: 'A store with this code already exists.' });
    }

    const activeBool = Boolean(is_active);

    const newStore = await withTransaction(async (query) => {
      const insertRes = await query(`
        INSERT INTO stores (name, code, address, is_active)
        VALUES ($1, $2, $3, $4)
        RETURNING id, name, code, address, is_active, created_at
      `, [cleanName, cleanCode, cleanAddress, activeBool]);

      const created = insertRes.rows[0];

      await logSecurityEvent({
        actor_id: req.staff.id,
        actor_role: req.staff.role,
        action: 'store_created',
        target_type: 'store',
        target_id: created.id,
        details: { name: created.name, code: created.code, is_active: created.is_active },
        ip_address: req.ip,
        queryClient: query,
      });

      return created;
    });

    res.status(201).json({
      ...newStore,
      is_active: Boolean(newStore.is_active),
      message: 'Store created successfully.',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/admin/stores/:id
 * Administrator-only endpoint to update store details.
 */
router.patch('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ detail: 'Invalid store ID.' });
    }

    const checkRes = await dbQuery('SELECT * FROM stores WHERE id = $1', [id]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ detail: 'Store not found.' });
    }

    const { name, code, address } = req.body;
    if (name === undefined && code === undefined && address === undefined) {
      return res.status(400).json({ detail: 'At least one field must be provided for update.' });
    }

    const updates = [];
    const params = [];

    if (name !== undefined) {
      const cleanName = String(name).trim();
      if (cleanName.length < 2) {
        return res.status(400).json({ detail: 'Store name must be at least 2 characters.' });
      }
      params.push(cleanName);
      updates.push(`name = $${params.length}`);
    }

    if (code !== undefined) {
      const cleanCode = String(code).trim().toUpperCase();
      if (!STORE_CODE_REGEX.test(cleanCode)) {
        return res.status(400).json({ detail: 'Store code must be 2-50 alphanumeric characters or hyphens.' });
      }
      // Check code uniqueness across other stores
      const codeCheck = await dbQuery('SELECT id FROM stores WHERE LOWER(code) = LOWER($1) AND id != $2', [cleanCode, id]);
      if (codeCheck.rows && codeCheck.rows.length > 0) {
        return res.status(409).json({ detail: 'Another store with this code already exists.' });
      }
      params.push(cleanCode);
      updates.push(`code = $${params.length}`);
    }

    if (address !== undefined) {
      params.push(address ? String(address).trim() : null);
      updates.push(`address = $${params.length}`);
    }

    params.push(id);

    const updated = await withTransaction(async (query) => {
      await query(`UPDATE stores SET ${updates.join(', ')} WHERE id = $${params.length}`, params);
      const updatedRes = await query('SELECT id, name, code, address, is_active, created_at FROM stores WHERE id = $1', [id]);
      const storeUpdated = updatedRes.rows[0];

      await logSecurityEvent({
        actor_id: req.staff.id,
        actor_role: req.staff.role,
        action: 'store_updated',
        target_type: 'store',
        target_id: id,
        details: { updated_fields: updates.map(u => u.split(' = ')[0]) },
        ip_address: req.ip,
        queryClient: query,
      });

      return storeUpdated;
    });

    res.json({
      ...updated,
      is_active: Boolean(updated.is_active),
      message: 'Store updated successfully.',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/admin/stores/:id/status
 * Administrator-only endpoint to activate or deactivate a store.
 */
router.patch('/:id/status', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ detail: 'Invalid store ID.' });
    }

    const { is_active } = req.body;
    if (typeof is_active !== 'boolean') {
      return res.status(400).json({ detail: 'is_active must be a boolean.' });
    }

    const checkRes = await dbQuery('SELECT id, name, code, is_active FROM stores WHERE id = $1', [id]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ detail: 'Store not found.' });
    }

    const store = checkRes.rows[0];

    await withTransaction(async (query) => {
      await query('UPDATE stores SET is_active = $1 WHERE id = $2', [is_active, id]);

      await logSecurityEvent({
        actor_id: req.staff.id,
        actor_role: req.staff.role,
        action: is_active ? 'store_activated' : 'store_deactivated',
        target_type: 'store',
        target_id: id,
        details: { previous_state: store.is_active, new_state: is_active },
        ip_address: req.ip,
        queryClient: query,
      });
    });

    res.json({
      id: store.id,
      name: store.name,
      code: store.code,
      is_active,
      message: is_active ? 'Store activated successfully.' : 'Store deactivated successfully.',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/admin/stores/:id
 * Safeguarded endpoint: prohibits deleting stores with historical orders.
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ detail: 'Invalid store ID.' });
    }

    const checkRes = await dbQuery('SELECT id, name FROM stores WHERE id = $1', [id]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ detail: 'Store not found.' });
    }

    // Safety guard: reject deletion if orders exist for this store
    const orderCountRes = await dbQuery('SELECT COUNT(*)::int AS count FROM orders WHERE store_id = $1', [id]);
    const orderCount = orderCountRes.rows[0]?.count || 0;
    if (orderCount > 0) {
      return res.status(400).json({
        detail: 'Cannot delete store with historical order records. Deactivate the store instead.',
      });
    }

    await withTransaction(async (query) => {
      // Remove any seller assignments
      await query('DELETE FROM seller_store_assignments WHERE store_id = $1', [id]);

      // Delete store
      await query('DELETE FROM stores WHERE id = $1', [id]);

      await logSecurityEvent({
        actor_id: req.staff.id,
        actor_role: req.staff.role,
        action: 'store_deleted',
        target_type: 'store',
        target_id: id,
        details: { name: checkRes.rows[0].name },
        ip_address: req.ip,
        queryClient: query,
      });
    });

    res.json({
      id,
      deleted: true,
      message: 'Store deleted successfully.',
    });
  } catch (err) {
    next(err);
  }
});

export default router;
