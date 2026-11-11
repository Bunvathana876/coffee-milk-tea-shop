import { Router } from 'express';
import { dbQuery } from '../../db/database.js';
import { authenticateStaff, requireAdmin } from '../../middleware/auth.js';
import { validId } from '../../utils/adminCatalogValidation.js';

const router = Router();
router.use(authenticateStaff);

// Safe mapping of permitted sort columns to database columns
const SORT_COLUMNS = Object.freeze({
  created_at: 'c.created_at',
  full_name: 'c.full_name',
  loyalty_stamps: 'c.loyalty_stamps',
  id: 'c.id',
  email: 'c.email',
  phone: 'c.phone',
});

// GET /api/admin/customers - List customers with search, status filter, sorting, and pagination
router.get('/', requireAdmin, async (req, res, next) => {
  try {
    const {
      search,
      status,
      sort_by = 'created_at',
      sort_order = 'desc',
      limit = '20',
      offset = '0',
    } = req.query;

    const parsedLimit = Math.min(Math.max(parseInt(String(limit), 10) || 20, 1), 100);
    const parsedOffset = Math.max(parseInt(String(offset), 10) || 0, 0);

    const sortColumn = SORT_COLUMNS[String(sort_by).toLowerCase()] || 'c.created_at';
    const sortDirection = String(sort_order).toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const conditions = [];
    const params = [];

    // Filter by active/inactive status
    if (status === 'active') {
      conditions.push('c.is_active = TRUE');
    } else if (status === 'inactive') {
      conditions.push('c.is_active = FALSE');
    }

    // Search by name, phone, or email
    if (search && String(search).trim()) {
      params.push(`%${String(search).trim()}%`);
      const pIdx = params.length;
      conditions.push(`(c.full_name ILIKE $${pIdx} OR c.email ILIKE $${pIdx} OR c.phone ILIKE $${pIdx})`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Query customer list with aggregations
    const listParams = [...params];
    listParams.push(parsedLimit);
    const limitIdx = listParams.length;
    listParams.push(parsedOffset);
    const offsetIdx = listParams.length;

    const listQuery = `
      SELECT
        c.id,
        c.full_name,
        c.phone,
        c.email,
        c.loyalty_stamps,
        c.is_active,
        c.created_at,
        c.last_login_at,
        COUNT(o.id) as total_orders,
        COALESCE(SUM(CASE WHEN o.payment_status = 'paid' AND o.order_status = 'completed' THEN o.total_usd ELSE 0 END), 0) as total_spent_usd
      FROM customer_users c
      LEFT JOIN orders o ON o.customer_id = c.id
      ${whereClause}
      GROUP BY c.id
      ORDER BY ${sortColumn} ${sortDirection}, c.id DESC
      LIMIT $${limitIdx} OFFSET $${offsetIdx}
    `;

    const customersRes = await dbQuery(listQuery, listParams);

    // Total count for current filter
    const countQuery = `
      SELECT COUNT(*) as count
      FROM customer_users c
      ${whereClause}
    `;
    const countRes = await dbQuery(countQuery, params);
    const total = Number(countRes.rows[0]?.count || 0);

    // Global summary metrics
    const metricsRes = await dbQuery(`
      SELECT
        COUNT(*) as total_customers,
        COALESCE(SUM(CASE WHEN is_active = TRUE THEN 1 ELSE 0 END), 0) as active_customers,
        COALESCE(SUM(CASE WHEN is_active = FALSE THEN 1 ELSE 0 END), 0) as inactive_customers
      FROM customer_users
    `);
    const metrics = metricsRes.rows[0] || {};

    const items = customersRes.rows.map(row => ({
      id: Number(row.id),
      full_name: row.full_name,
      phone: row.phone,
      email: row.email || null,
      loyalty_stamps: Number(row.loyalty_stamps || 0),
      is_active: Boolean(row.is_active),
      created_at: row.created_at,
      last_login_at: row.last_login_at || null,
      total_orders: Number(row.total_orders || 0),
      total_spent_usd: Number(row.total_spent_usd || 0),
    }));

    res.json({
      items,
      total,
      limit: parsedLimit,
      offset: parsedOffset,
      metrics: {
        total_customers: Number(metrics.total_customers || 0),
        active_customers: Number(metrics.active_customers || 0),
        inactive_customers: Number(metrics.inactive_customers || 0),
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/customers/:id - Retrieve authorized details for a single customer
router.get('/:id', requireAdmin, async (req, res, next) => {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({ detail: 'Invalid customer ID.' });
    }

    const customerId = Number(req.params.id);
    const result = await dbQuery(`
      SELECT
        c.id,
        c.full_name,
        c.phone,
        c.email,
        c.loyalty_stamps,
        c.is_active,
        c.created_at,
        c.last_login_at,
        COUNT(o.id) as total_orders,
        COALESCE(SUM(CASE WHEN o.payment_status = 'paid' AND o.order_status = 'completed' THEN o.total_usd ELSE 0 END), 0) as total_spent_usd
      FROM customer_users c
      LEFT JOIN orders o ON o.customer_id = c.id
      WHERE c.id = $1
      GROUP BY c.id
    `, [customerId]);

    const customer = result.rows[0];
    if (!customer) {
      return res.status(404).json({ detail: 'Customer account not found.' });
    }

    res.json({
      id: Number(customer.id),
      full_name: customer.full_name,
      phone: customer.phone,
      email: customer.email || null,
      loyalty_stamps: Number(customer.loyalty_stamps || 0),
      is_active: Boolean(customer.is_active),
      created_at: customer.created_at,
      last_login_at: customer.last_login_at || null,
      total_orders: Number(customer.total_orders || 0),
      total_spent_usd: Number(customer.total_spent_usd || 0),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
