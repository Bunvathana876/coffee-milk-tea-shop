import { Router } from 'express';
import { dbQuery } from '../../db/database.js';
import { authenticateSeller } from '../../middleware/auth.js';

const router = Router();
router.use(authenticateSeller);

/**
 * GET /api/seller/stores
 * Returns the list of active stores assigned to the authenticated seller.
 */
router.get('/', async (req, res, next) => {
  try {
    const result = await dbQuery(
      `
      SELECT s.id, s.name, s.code, s.address, s.is_active, s.created_at, sa.created_at AS assigned_at
      FROM seller_store_assignments sa
      JOIN stores s ON sa.store_id = s.id
      WHERE sa.seller_id = $1 AND s.is_active = TRUE
      ORDER BY s.id ASC
    `,
      [req.seller.id],
    );

    const items = result.rows.map(s => ({
      id: s.id,
      name: s.name,
      code: s.code,
      address: s.address || null,
      is_active: Boolean(s.is_active),
      created_at: s.created_at,
      assigned_at: s.assigned_at,
    }));

    res.json({
      items,
      total: items.length,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
