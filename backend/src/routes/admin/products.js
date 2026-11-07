import { Router } from 'express';
import { dbQuery } from '../../db/database.js';
import { authenticateStaff, requireAdmin } from '../../middleware/auth.js';
import { validBoolean, validId, validName, validOptionalText, validPrice } from '../../utils/adminCatalogValidation.js';

const router = Router();
router.use(authenticateStaff);

// GET /api/admin/products
router.get('/', requireAdmin, async (req, res, next) => {
  try {
    const result = await dbQuery(`
      SELECT
        p.id, p.category_id, p.name, p.description, p.image,
        p.base_price_usd, p.is_available, p.created_at,
        c.name as category_name
      FROM products p
      JOIN categories c ON p.category_id = c.id
      ORDER BY p.id ASC
    `);

    const products = result.rows.map(p => ({
      ...p,
      is_available: Boolean(p.is_available),
      base_price_usd: Number(p.base_price_usd),
      category: {
        id: p.category_id,
        name: p.category_name,
      },
    }));

    res.json(products);
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/products
router.post('/', requireAdmin, async (req, res, next) => {
  try {
    const { category_id, name, description, image, base_price_usd, is_available = true } = req.body;

    if (category_id === undefined || name === undefined || base_price_usd === undefined) {
      return res.status(422).json({ detail: 'category_id, name, and base_price_usd are required.' });
    }

    if (!validId(category_id) || !validName(name) || !validPrice(base_price_usd) ||
        !validOptionalText(description) || !validOptionalText(image, 2048) || !validBoolean(is_available)) {
      return res.status(422).json({ detail: 'Invalid product details.' });
    }
    const catRes = await dbQuery('SELECT id, name FROM categories WHERE id = $1', [category_id]);
    if (catRes.rows.length === 0) {
      return res.status(404).json({ detail: 'Category not found.' });
    }
    const category = catRes.rows[0];

    const price = base_price_usd;

    const result = await dbQuery(`
      INSERT INTO products (category_id, name, description, image, base_price_usd, is_available)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [category_id, String(name).trim(), description || null, image || null, price, Boolean(is_available)]);

    const created = result.rows[0];
    res.status(201).json({
      ...created,
      is_available: Boolean(created.is_available),
      base_price_usd: Number(created.base_price_usd),
      category_name: category.name,
      category,
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/products/:id
router.patch('/:id', requireAdmin, async (req, res, next) => {
  try {
    if (!validId(req.params.id)) return res.status(400).json({ detail: 'Invalid product ID.' });
    const productId = Number(req.params.id);
    const prodRes = await dbQuery('SELECT * FROM products WHERE id = $1', [productId]);
    if (prodRes.rows.length === 0) {
      return res.status(404).json({ detail: 'Product not found.' });
    }

    const { category_id, name, description, image, base_price_usd, is_available } = req.body;
    const updates = [];
    const params = [];

    if (category_id !== undefined) {
      if (!validId(category_id)) return res.status(422).json({ detail: 'Invalid category ID.' });
      const catRes = await dbQuery('SELECT id FROM categories WHERE id = $1', [category_id]);
      if (catRes.rows.length === 0) return res.status(404).json({ detail: 'Category not found.' });
      params.push(category_id);
      updates.push(`category_id = $${params.length}`);
    }
    if (name !== undefined) {
      const cleanName = String(name).trim();
      if (!validName(name)) return res.status(422).json({ detail: 'Invalid product name.' });
      params.push(cleanName);
      updates.push(`name = $${params.length}`);
    }
    if (description !== undefined) {
      if (!validOptionalText(description)) return res.status(422).json({ detail: 'Invalid product description.' });
      params.push(description);
      updates.push(`description = $${params.length}`);
    }
    if (image !== undefined) {
      if (!validOptionalText(image, 2048)) return res.status(422).json({ detail: 'Invalid product image.' });
      params.push(image);
      updates.push(`image = $${params.length}`);
    }
    if (base_price_usd !== undefined) {
      if (!validPrice(base_price_usd)) return res.status(422).json({ detail: 'Invalid base price.' });
      const price = base_price_usd;
      params.push(price);
      updates.push(`base_price_usd = $${params.length}`);
    }
    if (is_available !== undefined) {
      if (!validBoolean(is_available)) return res.status(422).json({ detail: 'Invalid availability setting.' });
      params.push(is_available);
      updates.push(`is_available = $${params.length}`);
    }

    if (updates.length > 0) {
      params.push(productId);
      await dbQuery(`UPDATE products SET ${updates.join(', ')} WHERE id = $${params.length}`, params);
    }

    const updatedRes = await dbQuery(`
      SELECT
        p.*, c.name as category_name, c.description as category_description
      FROM products p
      JOIN categories c ON p.category_id = c.id
      WHERE p.id = $1
    `, [productId]);

    const updated = updatedRes.rows[0];

    res.json({
      ...updated,
      is_available: Boolean(updated.is_available),
      base_price_usd: Number(updated.base_price_usd),
      category: {
        id: updated.category_id,
        name: updated.category_name,
        description: updated.category_description,
      },
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/admin/products/:id
router.delete('/:id', requireAdmin, async (req, res, next) => {
  try {
    if (!validId(req.params.id)) return res.status(400).json({ detail: 'Invalid product ID.' });
    const productId = Number(req.params.id);
    const result = await dbQuery('DELETE FROM products WHERE id = $1', [productId]);
    if (result.rowCount === 0) {
      return res.status(404).json({ detail: 'Product not found.' });
    }
    res.json({ message: 'Product deleted successfully.' });
  } catch (err) {
    next(err);
  }
});

export default router;
