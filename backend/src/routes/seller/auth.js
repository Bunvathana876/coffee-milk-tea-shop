import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { dbQuery } from '../../db/database.js';
import { createToken, authenticateSeller } from '../../middleware/auth.js';
import { logSecurityEvent } from '../../middleware/audit.js';

const router = Router();

/**
 * POST /api/seller/auth/login
 * Authenticates a registered seller using their email and password.
 * Deactivated sellers and non-seller accounts are denied.
 */
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ detail: 'Email and password are required.' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const result = await dbQuery(
      'SELECT id, email, full_name, role, password_hash, is_active FROM staff_users WHERE LOWER(email) = LOWER($1)',
      [cleanEmail],
    );

    const account = result.rows[0];

    // Must exist and be a seller
    if (!account || account.role !== 'seller') {
      return res.status(401).json({ detail: 'Invalid email or password.' });
    }

    // Must be active
    if (!account.is_active) {
      return res
        .status(401)
        .json({ detail: 'Seller account is inactive. Please contact an administrator.' });
    }

    const isMatch = bcrypt.compareSync(String(password), account.password_hash);
    if (!isMatch) {
      return res.status(401).json({ detail: 'Invalid email or password.' });
    }

    // Record last login timestamp
    await dbQuery('UPDATE staff_users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1', [
      account.id,
    ]);

    const token = createToken({
      sub: account.id,
      role: 'seller',
      email: account.email,
      full_name: account.full_name,
    });

    await logSecurityEvent({
      actor_id: account.id,
      actor_role: 'seller',
      action: 'seller_login',
      target_type: 'seller',
      target_id: account.id,
      details: { email: account.email },
      ip_address: req.ip,
    });

    const assignmentsRes = await dbQuery(
      `
      SELECT s.id, s.name, s.code, s.is_active
      FROM seller_store_assignments sa
      JOIN stores s ON sa.store_id = s.id
      WHERE sa.seller_id = $1 AND s.is_active = TRUE
      ORDER BY s.id ASC
    `,
      [account.id],
    );
    const assignedStores = (assignmentsRes.rows || []).map(s => ({
      id: s.id,
      name: s.name,
      code: s.code,
      is_active: Boolean(s.is_active),
    }));
    const primaryStore = assignedStores[0] || null;

    res.json({
      token,
      access_token: token,
      token_type: 'bearer',
      seller: {
        id: account.id,
        email: account.email,
        full_name: account.full_name,
        role: 'seller',
        is_active: true,
        store_id: primaryStore?.id || null,
        store_name: primaryStore?.name || null,
        assigned_stores: assignedStores,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/seller/auth/me
 * Returns profile details for the authenticated active seller.
 */
router.get('/me', authenticateSeller, async (req, res) => {
  const assignmentsRes = await dbQuery(
    `
    SELECT s.id, s.name, s.code, s.is_active
    FROM seller_store_assignments sa
    JOIN stores s ON sa.store_id = s.id
    WHERE sa.seller_id = $1 AND s.is_active = TRUE
    ORDER BY s.id ASC
  `,
    [req.seller.id],
  );
  const assignedStores = (assignmentsRes.rows || []).map(s => ({
    id: s.id,
    name: s.name,
    code: s.code,
    is_active: Boolean(s.is_active),
  }));
  const primaryStore = assignedStores[0] || null;

  res.json({
    id: req.seller.id,
    email: req.seller.email,
    full_name: req.seller.full_name,
    role: req.seller.role,
    is_active: Boolean(req.seller.is_active),
    store_id: primaryStore?.id || null,
    store_name: primaryStore?.name || null,
    assigned_stores: assignedStores,
  });
});

export default router;
