import { Router } from 'express';
import { dbQuery } from '../db/database.js';
import { validId } from '../utils/adminCatalogValidation.js';

const router = Router();

// GET /api/products
router.get('/', async (req, res, next) => {
  try {
    const { category_id, category, search, is_available } = req.query;
    if (
      (category_id !== undefined && (typeof category_id !== 'string' || !validId(category_id))) ||
      (category !== undefined && (typeof category !== 'string' || category.length > 255)) ||
      (search !== undefined && (typeof search !== 'string' || search.length > 100)) ||
      (is_available !== undefined && !['', 'true', 'false', '1', '0'].includes(is_available))
    ) {
      return res.status(400).json({ detail: 'Invalid product filter.' });
    }

    let query = `
      SELECT
        p.id, p.category_id, p.name, p.description, p.image,
        p.base_price_usd, p.is_available, p.created_at,
        c.name as category_name
      FROM products p
      JOIN categories c ON p.category_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (category_id) {
      params.push(Number(category_id));
      query += ` AND p.category_id = $${params.length}`;
    }

    if (category) {
      params.push(String(category).trim());
      query += ` AND LOWER(c.name) = LOWER($${params.length})`;
    }

    if (search && String(search).trim()) {
      const term = `%${String(search).trim()}%`;
      params.push(term);
      const p1 = params.length;
      params.push(term);
      const p2 = params.length;
      query += ` AND (LOWER(p.name) LIKE LOWER($${p1}) OR LOWER(p.description) LIKE LOWER($${p2}))`;
    }

    if (is_available !== undefined && is_available !== '') {
      const isAvail = is_available === 'true' || is_available === '1';
      params.push(isAvail);
      query += ` AND p.is_available = $${params.length}`;
    }

    query += ' ORDER BY p.id ASC';

    const result = await dbQuery(query, params);
    const products = result.rows.map(p => ({
      ...p,
      is_available: Boolean(p.is_available),
      base_price_usd: Number(p.base_price_usd),
      category: {
        id: p.category_id,
        name: p.category_name,
      },
    }));

    res.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=300');
    res.json(products);
  } catch (err) {
    next(err);
  }
});

// GET /api/products/:id
router.get('/:id', async (req, res, next) => {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({ detail: 'Invalid product ID' });
    }
    const productId = Number(req.params.id);

    const result = await dbQuery(
      `
      SELECT
        p.id, p.category_id, p.name, p.description, p.image,
        p.base_price_usd, p.is_available, p.created_at,
        c.name as category_name, c.description as category_description
      FROM products p
      JOIN categories c ON p.category_id = c.id
      WHERE p.id = $1
    `,
      [productId],
    );

    const product = result.rows[0];
    if (!product) {
      return res.status(404).json({ detail: 'Product not found' });
    }

    res.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=300');
    res.json({
      id: product.id,
      category_id: product.category_id,
      name: product.name,
      description: product.description,
      image: product.image,
      base_price_usd: Number(product.base_price_usd),
      is_available: Boolean(product.is_available),
      created_at: product.created_at,
      category_name: product.category_name,
      category: {
        id: product.category_id,
        name: product.category_name,
        description: product.category_description,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
