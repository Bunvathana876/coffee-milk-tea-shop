import pg from 'pg';
import { config } from '../config.js';
import { verifyMigrations } from './verifyMigrations.js';

const { Pool } = pg;

let pool = null;
let isConnectedToPostgres = false;
let isTestMemoryDatabase = false;

// In-memory SQL store used only by explicitly isolated tests.
class MemoryPgDb {
  constructor() {
    this.sequences = { categories: 1, products: 1, customer_users: 1, staff_users: 1, orders: 1, order_items: 1 };
    this.tables = {
      categories: [],
      products: [],
      customer_users: [],
      staff_users: [],
      orders: [],
      order_items: [],
      order_idempotency: [],
    };
    this.transactionQueue = Promise.resolve();
  }

  async transaction(work) {
    let release;
    const previous = this.transactionQueue;
    this.transactionQueue = new Promise(resolve => { release = resolve; });
    await previous;

    const savedTables = structuredClone(this.tables);
    const savedSequences = { ...this.sequences };
    try {
      return await work((sql, params = []) => this.query(sql, params));
    } catch (err) {
      this.tables = savedTables;
      this.sequences = savedSequences;
      throw err;
    } finally {
      release();
    }
  }

  query(sql, params = []) {
    const cleanSql = sql.trim();

    // DDL Statements
    if (/^CREATE TABLE/i.test(cleanSql) || /^CREATE INDEX/i.test(cleanSql) || /^PRAGMA/i.test(cleanSql)) {
      return Promise.resolve({ rows: [], rowCount: 0 });
    }

    // Transactions
    if (/^(BEGIN|COMMIT|ROLLBACK)/i.test(cleanSql)) {
      return Promise.resolve({ rows: [], rowCount: 0 });
    }

    // 0. Dashboard stats / counts
    if (/SELECT\s+COUNT\(\*\)\s+as\s+total_orders/i.test(cleanSql)) {
      const orders = this.tables.orders;
      const total_orders = orders.length;
      const recognized = orders.filter(o => o.payment_status === 'paid' && o.order_status === 'completed');
      const total_sales_usd = recognized.reduce((sum, o) => sum + (o.total_usd || 0), 0);
      const total_sales_khr = recognized.reduce((sum, o) => sum + (o.total_khr || 0), 0);
      const pending_orders = orders.filter(o => o.order_status === 'pending').length;
      const completed_orders = orders.filter(o => o.order_status === 'completed').length;
      return Promise.resolve({
        rows: [{ total_orders, total_sales_usd, total_sales_khr, pending_orders, completed_orders }],
        rowCount: 1,
      });
    }

    if (/SELECT\s+order_status,\s+COUNT\(\*\)/i.test(cleanSql)) {
      const counts = {};
      for (const o of this.tables.orders) {
        counts[o.order_status] = (counts[o.order_status] || 0) + 1;
      }
      const rows = Object.entries(counts).map(([order_status, count]) => ({ order_status, count }));
      return Promise.resolve({ rows, rowCount: rows.length });
    }

    // 1. SELECT COUNT
    if (/SELECT\s+COUNT\(\*\)\s+as\s+count\s+FROM\s+(\w+)/i.test(cleanSql)) {
      const match = cleanSql.match(/SELECT\s+COUNT\(\*\)\s+as\s+count\s+FROM\s+(\w+)(?:\s+WHERE\s+(.+))?/i);
      const tableName = match[1];
      let rows = this.tables[tableName] || [];
      if (match[2]) {
        if (match[2].includes('category_id = $1')) {
          rows = rows.filter(r => r.category_id === Number(params[0]));
        } else if (match[2].includes('order_status = $1')) {
          rows = rows.filter(r => r.order_status === String(params[0]));
        }
      }
      return Promise.resolve({ rows: [{ count: rows.length }], rowCount: 1 });
    }

    // 2. INSERT INTO
    if (/^INSERT INTO (\w+)/i.test(cleanSql)) {
      const tableName = cleanSql.match(/^INSERT INTO (\w+)/i)[1];
      const table = this.tables[tableName];
      if (tableName === 'order_idempotency') {
        const existing = table.find(row => row.customer_id === Number(params[0]) && row.idempotency_key === params[1]);
        if (existing) return Promise.resolve({ rows: [], rowCount: 0 });
        const row = { customer_id: Number(params[0]), idempotency_key: params[1], request_hash: params[2], order_id: null };
        table.push(row);
        return Promise.resolve({ rows: [row], rowCount: 1 });
      }
      const id = this.sequences[tableName]++;

      let row = { id, created_at: new Date().toISOString() };

      if (tableName === 'categories') {
        row = { ...row, name: params[0], description: params[1], image: params[2], is_active: Boolean(params[3]) };
      } else if (tableName === 'products') {
        row = { ...row, category_id: Number(params[0]), name: params[1], description: params[2], image: params[3], base_price_usd: Number(params[4]), is_available: Boolean(params[5]) };
      } else if (tableName === 'staff_users') {
        row = { ...row, email: params[0], full_name: params[1], role: params[2], password_hash: params[3], is_active: true };
      } else if (tableName === 'customer_users') {
        row = { ...row, full_name: params[0], phone: params[1], email: params[2] || null, password_hash: params[3], loyalty_stamps: 0, is_active: true, last_login_at: new Date().toISOString() };
      } else if (tableName === 'orders') {
        row = {
          ...row,
          order_number: params[0],
          customer_name: params[1],
          customer_phone: params[2],
          customer_email: params[3] || null,
          notes: params[4] || null,
          subtotal_usd: Number(params[5]),
          total_usd: Number(params[6]),
          total_khr: Number(params[7]),
          payment_method: params[8] || 'cash',
          customer_id: params[9] == null ? null : Number(params[9]),
          payment_status: 'unpaid',
          order_status: 'pending',
        };
      } else if (tableName === 'order_items') {
        row = {
          ...row,
          order_id: Number(params[0]),
          product_id: params[1] ? Number(params[1]) : null,
          product_name: params[2],
          quantity: Number(params[3]),
          unit_price_usd: Number(params[4]),
          subtotal_usd: Number(params[5]),
          size: params[6],
          sugar_level: params[7],
          ice_level: params[8],
          toppings: params[9] || '',
        };
      }

      table.push(row);
      return Promise.resolve({ rows: [row], rowCount: 1 });
    }

    // 3. SELECT FROM categories
    if (/^SELECT/i.test(cleanSql) && /FROM categories/i.test(cleanSql)) {
      let rows = [...this.tables.categories];
      if (/WHERE name = \$1/i.test(cleanSql) || /WHERE LOWER\(name\) = LOWER\(\$1\)/i.test(cleanSql)) {
        rows = rows.filter(r => r.name.toLowerCase() === String(params[0]).toLowerCase() &&
          (!/id != \$2/i.test(cleanSql) || r.id !== Number(params[1])));
      } else if (/WHERE c\.id = \$1/i.test(cleanSql) || /WHERE id = \$1/i.test(cleanSql)) {
        rows = rows.filter(r => r.id === Number(params[0]));
      } else if (/active_only/i.test(cleanSql) || /is_active = TRUE/i.test(cleanSql) || /is_active = 1/i.test(cleanSql)) {
        rows = rows.filter(r => r.is_active);
      }

      // Add product counts
      rows = rows.map(c => {
        const prods = this.tables.products.filter(p => p.category_id === c.id);
        const availProds = prods.filter(p => p.is_available);
        return { ...c, product_count: prods.length, available_product_count: availProds.length };
      });

      return Promise.resolve({ rows, rowCount: rows.length });
    }

    // 4. SELECT FROM products
    if (/^SELECT/i.test(cleanSql) && /FROM products/i.test(cleanSql)) {
      let rows = [...this.tables.products];

      if (/WHERE id = \$1/i.test(cleanSql) || /WHERE p\.id = \$1/i.test(cleanSql)) {
        rows = rows.filter(r => r.id === Number(params[0]));
      } else if (/WHERE name = \$1/i.test(cleanSql)) {
        rows = rows.filter(r => r.name.toLowerCase() === String(params[0]).toLowerCase());
      } else if (/WHERE category_id = \$1/i.test(cleanSql)) {
        rows = rows.filter(r => r.category_id === Number(params[0]));
      }

      // Join category name
      rows = rows.map(p => {
        const cat = this.tables.categories.find(c => c.id === p.category_id);
        return {
          ...p,
          category_name: cat ? cat.name : null,
          category_description: cat ? cat.description : null,
          ...(/c\.is_active/i.test(cleanSql) ? { is_active: cat ? cat.is_active : false } : {}),
        };
      });

      // Filter by category_id or search if dynamic
      if (params.length > 0 && /p\.category_id = \$/i.test(cleanSql)) {
        rows = rows.filter(r => r.category_id === Number(params[0]));
      }
      if (params.some(p => typeof p === 'string' && p.startsWith('%'))) {
        const term = String(params.find(p => p.startsWith('%'))).replace(/%/g, '').toLowerCase();
        rows = rows.filter(r => r.name.toLowerCase().includes(term) || (r.description && r.description.toLowerCase().includes(term)));
      }
      if (params.length > 0 && /LOWER\(c\.name\) = LOWER\(\$/i.test(cleanSql)) {
        const catName = String(params[0]).toLowerCase();
        rows = rows.filter(r => r.category_name && r.category_name.toLowerCase() === catName);
      }

      return Promise.resolve({ rows, rowCount: rows.length });
    }

    // 5. SELECT FROM customer_users
    if (/^SELECT/i.test(cleanSql) && /FROM customer_users/i.test(cleanSql)) {
      let rows = [...this.tables.customer_users];
      if (/WHERE phone = \$1 OR LOWER\(email\) = LOWER\(\$2\)/i.test(cleanSql)) {
        const iden = String(params[0]).toLowerCase();
        rows = rows.filter(r => r.phone === params[0] || (r.email && r.email.toLowerCase() === iden));
      } else if (/WHERE id = \$1/i.test(cleanSql)) {
        rows = rows.filter(r => r.id === Number(params[0]));
      } else if (/WHERE phone = \$1/i.test(cleanSql)) {
        rows = rows.filter(r => r.phone === String(params[0]));
      } else if (/WHERE email = \$1/i.test(cleanSql)) {
        rows = rows.filter(r => r.email && r.email.toLowerCase() === String(params[0]).toLowerCase());
      }
      return Promise.resolve({ rows, rowCount: rows.length });
    }

    // 6. SELECT FROM staff_users
    if (/^SELECT/i.test(cleanSql) && /FROM staff_users/i.test(cleanSql)) {
      let rows = [...this.tables.staff_users];
      if (/WHERE email = \$1/i.test(cleanSql) || /WHERE LOWER\(email\) = \$1/i.test(cleanSql) || /WHERE LOWER\(email\) = LOWER\(\$1\)/i.test(cleanSql)) {
        rows = rows.filter(r => r.email.toLowerCase() === String(params[0]).toLowerCase());
      } else if (/WHERE id = \$1/i.test(cleanSql)) {
        rows = rows.filter(r => r.id === Number(params[0]));
      }
      return Promise.resolve({ rows, rowCount: rows.length });
    }

    // 7. SELECT FROM orders
    if (/^SELECT/i.test(cleanSql) && /FROM order_idempotency/i.test(cleanSql)) {
      const rows = this.tables.order_idempotency.filter(row => row.customer_id === Number(params[0]) && row.idempotency_key === params[1]);
      return Promise.resolve({ rows, rowCount: rows.length });
    }

    if (/^SELECT/i.test(cleanSql) && /FROM orders/i.test(cleanSql)) {
      let rows = [...this.tables.orders];
      if (/WHERE customer_id = \$1/i.test(cleanSql)) {
        rows = rows.filter(r => r.customer_id === Number(params[0]));
        if (/customer_phone = \$2/i.test(cleanSql)) {
          rows = rows.filter(r => r.customer_phone === String(params[1]));
        }
      } else if (/WHERE id = \$1/i.test(cleanSql)) {
        rows = rows.filter(r => r.id === Number(params[0]));
      } else if (/WHERE order_number = \$1/i.test(cleanSql)) {
        rows = rows.filter(r => r.order_number === String(params[0]));
      } else if (/WHERE customer_phone = \$1/i.test(cleanSql)) {
        rows = rows.filter(r => r.customer_phone === String(params[0]));
      } else if (/order_status = \$1/i.test(cleanSql)) {
        rows = rows.filter(r => r.order_status === String(params[0]));
      }
      // Sort DESC
      rows.sort((a, b) => b.id - a.id);
      if (/LIMIT \$\d+/i.test(cleanSql)) {
        const limitIndex = Number(cleanSql.match(/LIMIT \$(\d+)/i)[1]) - 1;
        const offsetMatch = cleanSql.match(/OFFSET \$(\d+)/i);
        const offset = offsetMatch ? Number(params[Number(offsetMatch[1]) - 1]) : 0;
        rows = rows.slice(offset, offset + Number(params[limitIndex]));
      }
      return Promise.resolve({ rows, rowCount: rows.length });
    }

    // 8. SELECT FROM order_items
    if (/^SELECT/i.test(cleanSql) && /FROM order_items/i.test(cleanSql)) {
      let rows = [...this.tables.order_items];
      if (/WHERE order_id = \$1/i.test(cleanSql)) {
        rows = rows.filter(r => r.order_id === Number(params[0]));
      }
      return Promise.resolve({ rows, rowCount: rows.length });
    }

    // 9. UPDATE
    if (/^UPDATE order_idempotency/i.test(cleanSql)) {
      const row = this.tables.order_idempotency.find(entry => entry.customer_id === Number(params[0]) && entry.idempotency_key === params[1]);
      if (row) row.order_id = Number(params[2]);
      return Promise.resolve({ rows: row ? [row] : [], rowCount: row ? 1 : 0 });
    }
    if (/^UPDATE customer_users/i.test(cleanSql)) {
      const id = Number(params[params.length - 1]);
      const user = this.tables.customer_users.find(u => u.id === id);
      if (user) {
        if (/loyalty_stamps = loyalty_stamps \+ 1/i.test(cleanSql)) user.loyalty_stamps += 1;
        if (/last_login_at/i.test(cleanSql)) user.last_login_at = new Date().toISOString();
        if (/full_name = \$/i.test(cleanSql)) user.full_name = params[0];
        if (/email = \$/i.test(cleanSql)) {
          const idx = /full_name/.test(cleanSql) ? 1 : 0;
          user.email = params[idx];
        }
      }
      return Promise.resolve({ rows: user ? [user] : [], rowCount: user ? 1 : 0 });
    }
    if (/^UPDATE staff_users/i.test(cleanSql)) {
      const id = Number(params[params.length - 1]);
      const staff = this.tables.staff_users.find(s => s.id === id);
      if (staff) {
        if (/last_login_at/i.test(cleanSql)) staff.last_login_at = new Date().toISOString();
        if (/full_name = \$/i.test(cleanSql)) staff.full_name = params[0];
        if (/role = \$/i.test(cleanSql)) staff.role = params[params.length - 2];
      }
      return Promise.resolve({ rows: staff ? [staff] : [], rowCount: staff ? 1 : 0 });
    }
    if (/^UPDATE categories SET/i.test(cleanSql)) {
      const id = Number(params[params.length - 1]);
      const cat = this.tables.categories.find(c => c.id === id);
      if (cat) {
        for (const [, field, position] of cleanSql.matchAll(/(name|description|image|is_active) = \$(\d+)/gi)) {
          cat[field] = field === 'is_active' ? Boolean(params[Number(position) - 1]) : params[Number(position) - 1];
        }
      }
      return Promise.resolve({ rows: cat ? [cat] : [], rowCount: cat ? 1 : 0 });
    }
    if (/^UPDATE products SET/i.test(cleanSql)) {
      const id = Number(params[params.length - 1]);
      const prod = this.tables.products.find(p => p.id === id);
      if (prod) {
        for (const [, field, position] of cleanSql.matchAll(/(category_id|name|description|image|base_price_usd|is_available) = \$(\d+)/gi)) {
          const value = params[Number(position) - 1];
          prod[field] = field === 'category_id' || field === 'base_price_usd' ? Number(value)
            : field === 'is_available' ? Boolean(value) : value;
        }
      }
      return Promise.resolve({ rows: prod ? [prod] : [], rowCount: prod ? 1 : 0 });
    }
    if (/^UPDATE orders SET/i.test(cleanSql)) {
      const orderId = Number(params[params.length - 1]);
      const order = this.tables.orders.find(o => o.id === orderId);
      if (order) {
        if (/order_status = \$1/i.test(cleanSql)) order.order_status = params[0];
        if (/payment_status = \$1/i.test(cleanSql) || /payment_status = \$2/i.test(cleanSql)) {
          order.payment_status = params[params.length - 2];
        }
      }
      return Promise.resolve({ rows: order ? [order] : [], rowCount: order ? 1 : 0 });
    }

    // 10. DELETE
    if (/^DELETE FROM categories WHERE id = \$1/i.test(cleanSql)) {
      const before = this.tables.categories.length;
      this.tables.categories = this.tables.categories.filter(c => c.id !== Number(params[0]));
      return Promise.resolve({ rowCount: before - this.tables.categories.length, rows: [] });
    }
    if (/^DELETE FROM products WHERE id = \$1/i.test(cleanSql)) {
      const before = this.tables.products.length;
      this.tables.products = this.tables.products.filter(p => p.id !== Number(params[0]));
      return Promise.resolve({ rowCount: before - this.tables.products.length, rows: [] });
    }

    return Promise.resolve({ rows: [], rowCount: 0 });
  }
}

const memoryDb = new MemoryPgDb();

export async function getDatabase() {
  if (pool) return pool;
  if (isTestMemoryDatabase) return memoryDb;

  const nextPool = new Pool({
    connectionString: config.databaseUrl,
    connectionTimeoutMillis: 2500,
  });

  try {
    const client = await nextPool.connect();
    client.release();
    isConnectedToPostgres = true;
    console.log('🐘 Connected to PostgreSQL.');
    if (process.env.NODE_ENV === 'production' || process.env.ENVIRONMENT === 'production') {
      await verifyMigrations(nextPool);
    } else {
      await initSchema(nextPool);
    }
    pool = nextPool;
    return pool;
  } catch (err) {
    isConnectedToPostgres = false;
    await nextPool.end();
    if (process.env.NODE_ENV === 'test' && process.env.ALLOW_IN_MEMORY_DB === 'true') {
      isTestMemoryDatabase = true;
      console.warn('PostgreSQL unavailable; using isolated in-memory database for tests only.');
      return memoryDb;
    }
    throw new Error('PostgreSQL initialization failed; server was not started. Check database configuration and availability.');
  }
}

export async function dbQuery(sql, params = []) {
  if (isConnectedToPostgres && pool) {
    try {
      return await pool.query(sql, params);
    } catch (err) {
      console.error('PostgreSQL query error:', err.code || err.name || 'UnknownError');
      throw err;
    }
  }
  if (isTestMemoryDatabase) return await memoryDb.query(sql, params);
  throw new Error('PostgreSQL is not initialized.');
}

export async function runClientTransaction(client, work) {
  let began = false;
  try {
    await client.query('BEGIN');
    began = true;
    const result = await work((sql, params = []) => client.query(sql, params));
    await client.query('COMMIT');
    return result;
  } catch (err) {
    if (began) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        throw new AggregateError([err, rollbackError], 'Transaction rollback failed.');
      }
    }
    throw err;
  }
}

export async function withTransaction(work) {
  if (isConnectedToPostgres && pool) {
    const client = await pool.connect();
    try {
      return await runClientTransaction(client, work);
    } finally {
      client.release();
    }
  }
  if (isTestMemoryDatabase) return memoryDb.transaction(work);
  throw new Error('PostgreSQL is not initialized.');
}

export async function initSchema(db) {
  const schemaSql = `
    CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL,
      description TEXT,
      image TEXT,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      image TEXT,
      base_price_usd NUMERIC(10, 2) NOT NULL,
      is_available BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS customer_users (
      id SERIAL PRIMARY KEY,
      full_name VARCHAR(255) NOT NULL,
      phone VARCHAR(50) UNIQUE NOT NULL,
      email VARCHAR(255) UNIQUE,
      password_hash TEXT NOT NULL,
      loyalty_stamps INTEGER NOT NULL DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      last_login_at TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS staff_users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      full_name VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL DEFAULT 'staff',
      password_hash TEXT NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      last_login_at TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      order_number VARCHAR(100) UNIQUE NOT NULL,
      customer_id INTEGER REFERENCES customer_users(id) ON DELETE SET NULL,
      customer_name VARCHAR(255) NOT NULL,
      customer_phone VARCHAR(50) NOT NULL,
      customer_email VARCHAR(255),
      notes TEXT,
      subtotal_usd NUMERIC(10, 2) NOT NULL,
      total_usd NUMERIC(10, 2) NOT NULL,
      total_khr NUMERIC(12, 0) NOT NULL,
      payment_method VARCHAR(50) NOT NULL DEFAULT 'cash',
      payment_status VARCHAR(50) NOT NULL DEFAULT 'unpaid',
      order_status VARCHAR(50) NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_id INTEGER REFERENCES customer_users(id) ON DELETE SET NULL;

    CREATE TABLE IF NOT EXISTS order_items (
      id SERIAL PRIMARY KEY,
      order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
      product_name VARCHAR(255) NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      unit_price_usd NUMERIC(10, 2) NOT NULL,
      subtotal_usd NUMERIC(10, 2) NOT NULL,
      size VARCHAR(50) NOT NULL DEFAULT 'Medium',
      sugar_level VARCHAR(50) NOT NULL DEFAULT '50%',
      ice_level VARCHAR(50) NOT NULL DEFAULT 'Normal Ice',
      toppings TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS order_idempotency (
      customer_id INTEGER NOT NULL REFERENCES customer_users(id) ON DELETE CASCADE,
      idempotency_key VARCHAR(128) NOT NULL,
      request_hash CHAR(64) NOT NULL,
      order_id INTEGER UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (customer_id, idempotency_key)
    );

    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
    CREATE INDEX IF NOT EXISTS idx_orders_phone ON orders(customer_phone);
    CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
    CREATE INDEX IF NOT EXISTS idx_orders_ref ON orders(order_number);
    CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
  `;

  if (isConnectedToPostgres && db) {
    await db.query(schemaSql);
  }
}
