import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { dbQuery, withTransaction } from '../../db/database.js';
import { authenticateStaff, requireAdmin } from '../../middleware/auth.js';
import { logSecurityEvent } from '../../middleware/audit.js';

const router = Router();
router.use(authenticateStaff, requireAdmin);

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * GET /api/admin/sellers
 * Administrator-only read endpoint to inspect registered seller accounts.
 * Reports configured: false when multi-tenant store schema is not yet provisioned.
 */
router.get('/', async (req, res, next) => {
  try {
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const offset = Math.max(0, parseInt(req.query.offset, 10) || 0);
    const search = req.query.search ? String(req.query.search).trim().toLowerCase() : '';
    const status = req.query.status ? String(req.query.status).trim().toLowerCase() : 'all';

    // Query staff_users for role = 'seller'
    const whereClauses = ["role = 'seller'"];
    const params = [];

    if (status === 'active') {
      whereClauses.push('is_active = TRUE');
    } else if (status === 'inactive') {
      whereClauses.push('is_active = FALSE');
    }

    if (search) {
      params.push(`%${search}%`);
      whereClauses.push(
        `(LOWER(full_name) LIKE $${params.length} OR LOWER(email) LIKE $${params.length})`,
      );
    }

    const whereSql = `WHERE ${whereClauses.join(' AND ')}`;

    // Query total matching
    const countRes = await dbQuery(
      `SELECT COUNT(*)::int AS count FROM staff_users ${whereSql}`,
      params,
    );
    const total = countRes.rows[0]?.count || 0;

    // Metrics query for all sellers
    const metricsRes = await dbQuery(`
      SELECT
        COUNT(*)::int AS total_sellers,
        COUNT(CASE WHEN is_active = TRUE THEN 1 END)::int AS active_sellers,
        COUNT(CASE WHEN is_active = FALSE THEN 1 END)::int AS inactive_sellers
      FROM staff_users
      WHERE role = 'seller'
    `);
    const metricsRow = metricsRes.rows[0] || {};
    const metrics = {
      total_sellers: metricsRow.total_sellers || 0,
      active_sellers: metricsRow.active_sellers || 0,
      inactive_sellers: metricsRow.inactive_sellers || 0,
    };

    // Pagination query
    const listParams = [...params];
    listParams.push(limit);
    const limitIdx = listParams.length;
    listParams.push(offset);
    const offsetIdx = listParams.length;

    const listRes = await dbQuery(
      `
      SELECT id, email, full_name, role, is_active, created_at, last_login_at
      FROM staff_users
      ${whereSql}
      ORDER BY id ASC
      LIMIT $${limitIdx} OFFSET $${offsetIdx}
    `,
      listParams,
    );

    const storesCountRes = await dbQuery('SELECT COUNT(*)::int AS count FROM stores');
    const storeCount = storesCountRes.rows[0]?.count || 0;
    const configured = storeCount > 0;

    const items = await Promise.all(
      listRes.rows.map(async row => {
        const assignments = await dbQuery(
          `
        SELECT s.id, s.name, s.code, s.is_active
        FROM seller_store_assignments sa
        JOIN stores s ON sa.store_id = s.id
        WHERE sa.seller_id = $1
      `,
          [row.id],
        );
        const assignedStores = (assignments.rows || []).map(s => ({
          id: s.id,
          name: s.name,
          code: s.code,
          is_active: Boolean(s.is_active),
        }));

        return {
          id: row.id,
          email: row.email,
          full_name: row.full_name,
          role: row.role,
          is_active: Boolean(row.is_active),
          created_at: row.created_at,
          last_login_at: row.last_login_at || null,
          store_name: assignedStores[0]?.name || null,
          store_id: assignedStores[0]?.id || null,
          assigned_stores: assignedStores,
        };
      }),
    );

    res.json({
      configured,
      store_ownership_configured: configured,
      rbac_configured: true,
      items,
      total,
      limit,
      offset,
      metrics,
      message:
        'Seller accounts and store assignments will appear here after secure seller access is configured.',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/admin/sellers
 * Administrator endpoint to create a new verified seller account.
 */
router.post('/', async (req, res, next) => {
  try {
    const { email, full_name, password, is_active = true, store_id } = req.body;

    if (!email || !full_name || !password) {
      return res.status(400).json({ detail: 'Email, full name, and password are required.' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanName = String(full_name).trim();
    const cleanPassword = String(password);

    if (!EMAIL_REGEX.test(cleanEmail)) {
      return res.status(400).json({ detail: 'Invalid email address format.' });
    }

    if (cleanName.length < 2) {
      return res.status(400).json({ detail: 'Full name must be at least 2 characters.' });
    }

    if (cleanPassword.length < 8) {
      return res.status(400).json({ detail: 'Password must be at least 8 characters long.' });
    }

    // Check email uniqueness across all staff/seller accounts
    const existing = await dbQuery('SELECT id FROM staff_users WHERE LOWER(email) = LOWER($1)', [
      cleanEmail,
    ]);
    if (existing.rows && existing.rows.length > 0) {
      return res
        .status(409)
        .json({ detail: 'A staff or seller account with this email already exists.' });
    }

    let parsedStoreId = null;
    let storeName = null;
    if (store_id !== undefined && store_id !== null && store_id !== '') {
      parsedStoreId = parseInt(store_id, 10);
      if (!Number.isInteger(parsedStoreId) || parsedStoreId <= 0) {
        return res.status(400).json({ detail: 'Invalid store_id provided.' });
      }
      const storeRes = await dbQuery('SELECT id, name FROM stores WHERE id = $1', [parsedStoreId]);
      if (storeRes.rows.length === 0) {
        return res.status(404).json({ detail: 'Specified store not found.' });
      }
      storeName = storeRes.rows[0].name;
    }

    const passwordHash = bcrypt.hashSync(cleanPassword, 10);
    const activeBool = Boolean(is_active);

    const newSeller = await withTransaction(async query => {
      const insertRes = await query(
        `
        INSERT INTO staff_users (email, full_name, role, password_hash, is_active)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, email, full_name, role, is_active, created_at
      `,
        [cleanEmail, cleanName, 'seller', passwordHash, activeBool],
      );

      const created = insertRes.rows[0];

      if (parsedStoreId) {
        await query(
          `
          INSERT INTO seller_store_assignments (seller_id, store_id)
          VALUES ($1, $2)
          ON CONFLICT (seller_id, store_id) DO NOTHING
        `,
          [created.id, parsedStoreId],
        );
      }

      await logSecurityEvent({
        actor_id: req.staff.id,
        actor_role: req.staff.role,
        action: 'seller_created',
        target_type: 'seller',
        target_id: created.id,
        details: {
          email: created.email,
          full_name: created.full_name,
          is_active: created.is_active,
          store_id: parsedStoreId,
        },
        ip_address: req.ip,
        queryClient: query,
      });

      return created;
    });

    res.status(201).json({
      id: newSeller.id,
      email: newSeller.email,
      full_name: newSeller.full_name,
      role: newSeller.role,
      is_active: Boolean(newSeller.is_active),
      created_at: newSeller.created_at,
      last_login_at: null,
      store_name: storeName,
      store_id: parsedStoreId,
      message: 'Seller account created successfully.',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/sellers/:id
 * Administrator endpoint for seller profile details.
 */
router.get('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ detail: 'Invalid seller ID.' });
    }

    const result = await dbQuery(
      `
      SELECT id, email, full_name, role, is_active, created_at, last_login_at
      FROM staff_users
      WHERE id = $1 AND role = 'seller'
    `,
      [id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ detail: 'Seller not found.' });
    }

    const seller = result.rows[0];

    const assignments = await dbQuery(
      `
      SELECT s.id, s.name, s.code, s.is_active
      FROM seller_store_assignments sa
      JOIN stores s ON sa.store_id = s.id
      WHERE sa.seller_id = $1
    `,
      [id],
    );
    const assignedStores = (assignments.rows || []).map(s => ({
      id: s.id,
      name: s.name,
      code: s.code,
      is_active: Boolean(s.is_active),
    }));

    res.json({
      id: seller.id,
      email: seller.email,
      full_name: seller.full_name,
      role: seller.role,
      is_active: Boolean(seller.is_active),
      created_at: seller.created_at,
      last_login_at: seller.last_login_at || null,
      store_name: assignedStores[0]?.name || null,
      store_id: assignedStores[0]?.id || null,
      assigned_stores: assignedStores,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/admin/sellers/:id/status
 * Administrator endpoint to activate or deactivate a seller account.
 */
router.patch('/:id/status', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ detail: 'Invalid seller ID.' });
    }

    const { is_active } = req.body;
    if (typeof is_active !== 'boolean') {
      return res.status(400).json({ detail: 'is_active must be a boolean value.' });
    }

    const checkRes = await dbQuery(
      `
      SELECT id, email, full_name, role, is_active
      FROM staff_users
      WHERE id = $1 AND role = 'seller'
    `,
      [id],
    );

    if (checkRes.rows.length === 0) {
      return res.status(404).json({ detail: 'Seller not found.' });
    }

    const seller = checkRes.rows[0];

    await withTransaction(async query => {
      await query(
        `
        UPDATE staff_users
        SET is_active = $1
        WHERE id = $2 AND role = 'seller'
      `,
        [is_active, id],
      );

      await logSecurityEvent({
        actor_id: req.staff.id,
        actor_role: req.staff.role,
        action: is_active ? 'seller_activated' : 'seller_deactivated',
        target_type: 'seller',
        target_id: id,
        details: { previous_state: seller.is_active, new_state: is_active },
        ip_address: req.ip,
        queryClient: query,
      });
    });

    res.json({
      id: seller.id,
      email: seller.email,
      full_name: seller.full_name,
      role: seller.role,
      is_active,
      message: is_active ? 'Seller activated successfully.' : 'Seller deactivated successfully.',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Handler for updating seller profile details or resetting password.
 * Supports both PATCH /api/admin/sellers/:id and PUT /api/admin/sellers/:id.
 */
async function handleUpdateSeller(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ detail: 'Invalid seller ID.' });
    }

    // Validate request body keys: reject any unsupported fields (e.g. role escalation, status tampering)
    const allowedKeys = ['full_name', 'password'];
    const unsupportedKeys = Object.keys(req.body).filter(k => !allowedKeys.includes(k));
    if (unsupportedKeys.length > 0) {
      return res
        .status(400)
        .json({ detail: `Unsupported field(s) in update: ${unsupportedKeys.join(', ')}` });
    }

    const checkRes = await dbQuery(
      `
      SELECT id, email, full_name, role, is_active
      FROM staff_users
      WHERE id = $1 AND role = 'seller'
    `,
      [id],
    );

    if (checkRes.rows.length === 0) {
      return res.status(404).json({ detail: 'Seller not found.' });
    }

    const { full_name, password } = req.body;
    if (full_name === undefined && password === undefined) {
      return res
        .status(400)
        .json({ detail: 'At least one field (full_name or password) must be provided.' });
    }

    const updateFields = [];
    const params = [];

    if (full_name !== undefined) {
      const cleanName = String(full_name).trim();
      if (cleanName.length < 2) {
        return res.status(400).json({ detail: 'Full name must be at least 2 characters.' });
      }
      params.push(cleanName);
      updateFields.push(`full_name = $${params.length}`);
    }

    if (password !== undefined) {
      const cleanPassword = String(password);
      if (cleanPassword.length < 8) {
        return res.status(400).json({ detail: 'Password must be at least 8 characters long.' });
      }
      const passwordHash = bcrypt.hashSync(cleanPassword, 10);
      params.push(passwordHash);
      updateFields.push(`password_hash = $${params.length}`);
    }

    params.push(id);
    const idIdx = params.length;

    const updated = await withTransaction(async query => {
      await query(
        `
        UPDATE staff_users
        SET ${updateFields.join(', ')}
        WHERE id = $${idIdx} AND role = 'seller'
      `,
        params,
      );

      const updatedRes = await query(
        `
        SELECT id, email, full_name, role, is_active, created_at, last_login_at
        FROM staff_users
        WHERE id = $1
      `,
        [id],
      );

      await logSecurityEvent({
        actor_id: req.staff.id,
        actor_role: req.staff.role,
        action: 'seller_updated',
        target_type: 'seller',
        target_id: id,
        details: {
          updated_full_name: full_name !== undefined,
          password_reset: password !== undefined,
        },
        ip_address: req.ip,
        queryClient: query,
      });

      return updatedRes.rows[0];
    });

    const assignments = await dbQuery(
      `
      SELECT s.id, s.name, s.code, s.is_active
      FROM seller_store_assignments sa
      JOIN stores s ON sa.store_id = s.id
      WHERE sa.seller_id = $1
    `,
      [id],
    );
    const assignedStores = (assignments.rows || []).map(s => ({
      id: s.id,
      name: s.name,
      code: s.code,
      is_active: Boolean(s.is_active),
    }));

    res.json({
      id: updated.id,
      email: updated.email,
      full_name: updated.full_name,
      role: updated.role,
      is_active: Boolean(updated.is_active),
      created_at: updated.created_at,
      last_login_at: updated.last_login_at || null,
      store_name: assignedStores[0]?.name || null,
      store_id: assignedStores[0]?.id || null,
      assigned_stores: assignedStores,
      message: 'Seller updated successfully.',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/admin/sellers/:id
 * Administrator endpoint to update seller profile (e.g. full_name, password reset).
 */
router.patch('/:id', handleUpdateSeller);

/**
 * PUT /api/admin/sellers/:id
 * Administrator endpoint to update seller details or reset password.
 */
router.put('/:id', handleUpdateSeller);

/**
 * GET /api/admin/sellers/:id/stores
 * Administrator-only endpoint to list stores assigned to a seller.
 */
router.get('/:id/stores', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ detail: 'Invalid seller ID.' });
    }

    const sellerCheck = await dbQuery(
      'SELECT id, email, full_name, role FROM staff_users WHERE id = $1 AND role = $2',
      [id, 'seller'],
    );
    if (sellerCheck.rows.length === 0) {
      return res.status(404).json({ detail: 'Seller not found.' });
    }

    const assignments = await dbQuery(
      `
      SELECT s.id, s.name, s.code, s.address, s.is_active, s.created_at, sa.created_at AS assigned_at
      FROM seller_store_assignments sa
      JOIN stores s ON sa.store_id = s.id
      WHERE sa.seller_id = $1
      ORDER BY s.id ASC
    `,
      [id],
    );

    res.json({
      seller_id: id,
      stores: assignments.rows.map(s => ({
        id: s.id,
        name: s.name,
        code: s.code,
        address: s.address || null,
        is_active: Boolean(s.is_active),
        created_at: s.created_at,
        assigned_at: s.assigned_at,
      })),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/admin/sellers/:id/stores
 * Administrator-only endpoint to assign a store to a seller.
 */
router.post('/:id/stores', async (req, res, next) => {
  try {
    const sellerId = parseInt(req.params.id, 10);
    if (!Number.isInteger(sellerId) || sellerId <= 0) {
      return res.status(400).json({ detail: 'Invalid seller ID.' });
    }

    const { store_id } = req.body;
    const storeId = parseInt(store_id, 10);
    if (!Number.isInteger(storeId) || storeId <= 0) {
      return res.status(400).json({ detail: 'Valid store_id is required.' });
    }

    // Verify seller exists
    const sellerRes = await dbQuery(
      'SELECT id, full_name, email, role FROM staff_users WHERE id = $1 AND role = $2',
      [sellerId, 'seller'],
    );
    if (sellerRes.rows.length === 0) {
      return res.status(404).json({ detail: 'Seller not found.' });
    }

    // Verify store exists
    const storeRes = await dbQuery('SELECT id, name, code, is_active FROM stores WHERE id = $1', [
      storeId,
    ]);
    if (storeRes.rows.length === 0) {
      return res.status(404).json({ detail: 'Store not found.' });
    }

    await withTransaction(async query => {
      // Insert assignment
      await query(
        `
        INSERT INTO seller_store_assignments (seller_id, store_id)
        VALUES ($1, $2)
        ON CONFLICT (seller_id, store_id) DO NOTHING
      `,
        [sellerId, storeId],
      );

      await logSecurityEvent({
        actor_id: req.staff.id,
        actor_role: req.staff.role,
        action: 'seller_store_assigned',
        target_type: 'seller_store_assignment',
        target_id: sellerId,
        details: { seller_id: sellerId, store_id: storeId, store_name: storeRes.rows[0].name },
        ip_address: req.ip,
        queryClient: query,
      });
    });

    res.status(201).json({
      seller_id: sellerId,
      store_id: storeId,
      store: storeRes.rows[0],
      assigned: true,
      message: `Store ${storeRes.rows[0].name} successfully assigned to seller.`,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/admin/sellers/:id/stores/:storeId
 * Administrator-only endpoint to unassign a store from a seller.
 */
router.delete('/:id/stores/:storeId', async (req, res, next) => {
  try {
    const sellerId = parseInt(req.params.id, 10);
    const storeId = parseInt(req.params.storeId, 10);

    if (
      !Number.isInteger(sellerId) ||
      sellerId <= 0 ||
      !Number.isInteger(storeId) ||
      storeId <= 0
    ) {
      return res.status(400).json({ detail: 'Invalid seller ID or store ID.' });
    }

    const sellerRes = await dbQuery('SELECT id FROM staff_users WHERE id = $1 AND role = $2', [
      sellerId,
      'seller',
    ]);
    if (sellerRes.rows.length === 0) {
      return res.status(404).json({ detail: 'Seller not found.' });
    }

    await withTransaction(async query => {
      await query('DELETE FROM seller_store_assignments WHERE seller_id = $1 AND store_id = $2', [
        sellerId,
        storeId,
      ]);

      await logSecurityEvent({
        actor_id: req.staff.id,
        actor_role: req.staff.role,
        action: 'seller_store_unassigned',
        target_type: 'seller_store_assignment',
        target_id: sellerId,
        details: { seller_id: sellerId, store_id: storeId },
        ip_address: req.ip,
        queryClient: query,
      });
    });

    res.json({
      seller_id: sellerId,
      store_id: storeId,
      unassigned: true,
      message: 'Store unassigned from seller successfully.',
    });
  } catch (err) {
    next(err);
  }
});

export default router;
