import pg from 'pg';
import { config, isProductionOrStaging } from '../config.js';
import { verifyMigrations } from './verifyMigrations.js';

const { Pool } = pg;

let pool = null;
let isConnectedToPostgres = false;
let isTestMemoryDatabase = false;

// In-memory SQL store used only by explicitly isolated tests.
class MemoryPgDb {
  constructor() {
    this.sequences = {
      categories: 1,
      products: 1,
      customer_users: 1,
      staff_users: 1,
      orders: 1,
      order_items: 1,
      security_audit_logs: 1,
      stores: 1,
      seller_store_assignments: 1,
    };
    this.tables = {
      categories: [],
      products: [],
      customer_users: [],
      staff_users: [],
      orders: [],
      order_items: [],
      order_idempotency: [],
      security_audit_logs: [],
      stores: [],
      seller_store_assignments: [],
    };
    this.transactionQueue = Promise.resolve();
  }

  async transaction(work) {
    let release;
    const previous = this.transactionQueue;
    this.transactionQueue = new Promise(resolve => {
      release = resolve;
    });
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
    if (
      /^CREATE TABLE/i.test(cleanSql) ||
      /^CREATE INDEX/i.test(cleanSql) ||
      /^PRAGMA/i.test(cleanSql)
    ) {
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
      const recognized = orders.filter(
        o => o.payment_status === 'paid' && o.order_status === 'completed',
      );
      const total_sales_usd = recognized.reduce((sum, o) => sum + (o.total_usd || 0), 0);
      const total_sales_khr = recognized.reduce((sum, o) => sum + (o.total_khr || 0), 0);
      const pending_orders = orders.filter(o => o.order_status === 'pending').length;
      const completed_orders = orders.filter(o => o.order_status === 'completed').length;
      return Promise.resolve({
        rows: [
          { total_orders, total_sales_usd, total_sales_khr, pending_orders, completed_orders },
        ],
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
      const match = cleanSql.match(
        /SELECT\s+COUNT\(\*\)\s+as\s+count\s+FROM\s+(\w+)(?:\s+WHERE\s+(.+))?/i,
      );
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
        const existing = table.find(
          row => row.customer_id === Number(params[0]) && row.idempotency_key === params[1],
        );
        if (existing) return Promise.resolve({ rows: [], rowCount: 0 });
        const row = {
          customer_id: Number(params[0]),
          idempotency_key: params[1],
          request_hash: params[2],
          order_id: null,
        };
        table.push(row);
        return Promise.resolve({ rows: [row], rowCount: 1 });
      }
      const id = this.sequences[tableName]++;

      let row = { id, created_at: new Date().toISOString() };

      if (tableName === 'categories') {
        row = {
          ...row,
          name: params[0],
          description: params[1],
          image: params[2],
          is_active: Boolean(params[3]),
        };
      } else if (tableName === 'products') {
        row = {
          ...row,
          category_id: Number(params[0]),
          name: params[1],
          description: params[2],
          image: params[3],
          base_price_usd: Number(params[4]),
          is_available: Boolean(params[5]),
        };
      } else if (tableName === 'staff_users') {
        row = {
          ...row,
          email: params[0],
          full_name: params[1],
          role: params[2],
          password_hash: params[3],
          is_active: params[4] !== undefined ? Boolean(params[4]) : true,
        };
      } else if (tableName === 'customer_users') {
        row = {
          ...row,
          full_name: params[0],
          phone: params[1],
          email: params[2] || null,
          password_hash: params[3],
          loyalty_stamps: 0,
          is_active: true,
          last_login_at: new Date().toISOString(),
        };
      } else if (tableName === 'orders') {
        const colMatch = cleanSql.match(/^INSERT INTO orders\s*\(([^)]+)\)/i);
        const valMatch = cleanSql.match(/VALUES\s*\(([^)]+)\)/i);
        row = {
          ...row,
          subtotal_usd: 0,
          total_usd: 0,
          total_khr: 0,
          payment_method: 'cash',
          payment_status: 'unpaid',
          order_status: 'pending',
          customer_id: null,
          store_id: null,
        };
        if (colMatch) {
          const cols = colMatch[1].split(',').map(c => c.trim().toLowerCase());
          if (valMatch) {
            const valExprs = valMatch[1].split(',').map(v => v.trim());
            cols.forEach((col, idx) => {
              const expr = valExprs[idx];
              if (!expr) return;
              if (expr.startsWith('$')) {
                const pIdx = parseInt(expr.slice(1), 10) - 1;
                const pVal = params[pIdx];
                if (
                  ['subtotal_usd', 'total_usd', 'total_khr', 'customer_id', 'store_id'].includes(
                    col,
                  )
                ) {
                  row[col] = pVal == null ? null : Number(pVal);
                } else {
                  row[col] = pVal;
                }
              } else if (expr.toUpperCase() === 'NULL') {
                row[col] = null;
              } else if (expr.toUpperCase() === 'TRUE') {
                row[col] = true;
              } else if (expr.toUpperCase() === 'FALSE') {
                row[col] = false;
              } else if (
                (expr.startsWith("'") && expr.endsWith("'")) ||
                (expr.startsWith('"') && expr.endsWith('"'))
              ) {
                row[col] = expr.slice(1, -1);
              } else if (!isNaN(Number(expr))) {
                row[col] = Number(expr);
              } else {
                row[col] = expr;
              }
            });
          } else {
            cols.forEach((col, idx) => {
              if (params[idx] !== undefined) {
                if (
                  ['subtotal_usd', 'total_usd', 'total_khr', 'customer_id', 'store_id'].includes(
                    col,
                  )
                ) {
                  row[col] = params[idx] == null ? null : Number(params[idx]);
                } else {
                  row[col] = params[idx];
                }
              }
            });
          }
        }
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
      } else if (tableName === 'security_audit_logs') {
        row = {
          ...row,
          actor_id: Number(params[0]),
          actor_role: params[1],
          action: params[2],
          target_type: params[3],
          target_id: params[4] == null ? null : Number(params[4]),
          details: params[5],
          ip_address: params[6] || null,
        };
      } else if (tableName === 'stores') {
        row = {
          ...row,
          name: String(params[0]).trim(),
          code: String(params[1]).trim().toUpperCase(),
          address: params[2] || null,
          is_active: params[3] !== undefined ? Boolean(params[3]) : true,
        };
      } else if (tableName === 'seller_store_assignments') {
        const sellerId = Number(params[0]);
        const storeId = Number(params[1]);
        const existing = table.find(a => a.seller_id === sellerId && a.store_id === storeId);
        if (existing) {
          return Promise.resolve({ rows: [existing], rowCount: 1 });
        }
        row = {
          ...row,
          seller_id: sellerId,
          store_id: storeId,
        };
      }

      table.push(row);
      return Promise.resolve({ rows: [row], rowCount: 1 });
    }

    // 3. SELECT FROM categories
    if (/^SELECT/i.test(cleanSql) && /FROM categories/i.test(cleanSql)) {
      let rows = [...this.tables.categories];
      if (
        /WHERE name = \$1/i.test(cleanSql) ||
        /WHERE LOWER\(name\) = LOWER\(\$1\)/i.test(cleanSql)
      ) {
        rows = rows.filter(
          r =>
            r.name.toLowerCase() === String(params[0]).toLowerCase() &&
            (!/id != \$2/i.test(cleanSql) || r.id !== Number(params[1])),
        );
      } else if (/WHERE c\.id = \$1/i.test(cleanSql) || /WHERE id = \$1/i.test(cleanSql)) {
        rows = rows.filter(r => r.id === Number(params[0]));
      } else if (
        /active_only/i.test(cleanSql) ||
        /is_active = TRUE/i.test(cleanSql) ||
        /is_active = 1/i.test(cleanSql)
      ) {
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
        const term = String(params.find(p => p.startsWith('%')))
          .replace(/%/g, '')
          .toLowerCase();
        rows = rows.filter(
          r =>
            r.name.toLowerCase().includes(term) ||
            (r.description && r.description.toLowerCase().includes(term)),
        );
      }
      if (params.length > 0 && /LOWER\(c\.name\) = LOWER\(\$/i.test(cleanSql)) {
        const catName = String(params[0]).toLowerCase();
        rows = rows.filter(r => r.category_name && r.category_name.toLowerCase() === catName);
      }

      return Promise.resolve({ rows, rowCount: rows.length });
    }

    // Customer metrics for admin
    if (/SELECT\s+COUNT\(\*\)\s+as\s+total_customers/i.test(cleanSql)) {
      const customers = this.tables.customer_users || [];
      const total_customers = customers.length;
      const active_customers = customers.filter(c => c.is_active).length;
      const inactive_customers = customers.filter(c => !c.is_active).length;
      return Promise.resolve({
        rows: [{ total_customers, active_customers, inactive_customers }],
        rowCount: 1,
      });
    }

    if (/SELECT\s+COUNT\(\*\)\s+as\s+count\s+FROM\s+customer_users/i.test(cleanSql)) {
      let rows = [...(this.tables.customer_users || [])];
      if (/is_active = TRUE/i.test(cleanSql)) {
        rows = rows.filter(r => r.is_active);
      } else if (/is_active = FALSE/i.test(cleanSql)) {
        rows = rows.filter(r => !r.is_active);
      }
      if (/ILIKE/i.test(cleanSql)) {
        const searchParam = params.find(
          p => typeof p === 'string' && p.startsWith('%') && p.endsWith('%'),
        );
        if (searchParam) {
          const term = searchParam.replace(/%/g, '').toLowerCase();
          rows = rows.filter(
            r =>
              (r.full_name && r.full_name.toLowerCase().includes(term)) ||
              (r.email && r.email.toLowerCase().includes(term)) ||
              (r.phone && r.phone.includes(term)),
          );
        }
      }
      return Promise.resolve({ rows: [{ count: rows.length }], rowCount: 1 });
    }

    // 5. SELECT FROM customer_users
    if (/^SELECT/i.test(cleanSql) && /FROM customer_users/i.test(cleanSql)) {
      let rows = [...this.tables.customer_users];
      if (/WHERE phone = \$1 OR LOWER\(email\) = LOWER\(\$2\)/i.test(cleanSql)) {
        const iden = String(params[0]).toLowerCase();
        rows = rows.filter(
          r => r.phone === params[0] || (r.email && r.email.toLowerCase() === iden),
        );
      } else if (/WHERE (?:c\.)?id = \$1/i.test(cleanSql)) {
        rows = rows.filter(r => r.id === Number(params[0]));
      } else if (/WHERE phone = \$1/i.test(cleanSql)) {
        rows = rows.filter(r => r.phone === String(params[0]));
      } else if (/WHERE email = \$1/i.test(cleanSql)) {
        rows = rows.filter(
          r => r.email && r.email.toLowerCase() === String(params[0]).toLowerCase(),
        );
      } else {
        if (/is_active = TRUE/i.test(cleanSql)) {
          rows = rows.filter(r => r.is_active);
        } else if (/is_active = FALSE/i.test(cleanSql)) {
          rows = rows.filter(r => !r.is_active);
        }
        if (/ILIKE/i.test(cleanSql)) {
          const searchParam = params.find(
            p => typeof p === 'string' && p.startsWith('%') && p.endsWith('%'),
          );
          if (searchParam) {
            const term = searchParam.replace(/%/g, '').toLowerCase();
            rows = rows.filter(
              r =>
                (r.full_name && r.full_name.toLowerCase().includes(term)) ||
                (r.email && r.email.toLowerCase().includes(term)) ||
                (r.phone && r.phone.includes(term)),
            );
          }
        }
      }

      if (/LEFT JOIN orders/i.test(cleanSql)) {
        const orders = this.tables.orders || [];
        rows = rows.map(c => {
          const custOrders = orders.filter(o => o.customer_id === c.id);
          const total_orders = custOrders.length;
          const total_spent_usd = custOrders
            .filter(o => o.payment_status === 'paid' && o.order_status === 'completed')
            .reduce((sum, o) => sum + (o.total_usd || 0), 0);
          return {
            ...c,
            total_orders,
            total_spent_usd,
          };
        });
      }

      if (/ORDER BY/i.test(cleanSql)) {
        if (/c\.full_name ASC/i.test(cleanSql)) {
          rows.sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
        } else if (/c\.full_name DESC/i.test(cleanSql)) {
          rows.sort((a, b) => (b.full_name || '').localeCompare(a.full_name || ''));
        } else if (/c\.loyalty_stamps DESC/i.test(cleanSql)) {
          rows.sort((a, b) => (b.loyalty_stamps || 0) - (a.loyalty_stamps || 0));
        } else if (/c\.created_at ASC/i.test(cleanSql)) {
          rows.sort((a, b) => a.id - b.id);
        } else {
          rows.sort((a, b) => b.id - a.id);
        }
      }

      if (/LIMIT \$\d+/i.test(cleanSql)) {
        const limitIndex = Number(cleanSql.match(/LIMIT \$(\d+)/i)[1]) - 1;
        const offsetMatch = cleanSql.match(/OFFSET \$(\d+)/i);
        const offset = offsetMatch ? Number(params[Number(offsetMatch[1]) - 1]) : 0;
        rows = rows.slice(offset, offset + Number(params[limitIndex]));
      }

      return Promise.resolve({ rows, rowCount: rows.length });
    }

    // 6. SELECT FROM staff_users
    if (/^SELECT/i.test(cleanSql) && /FROM staff_users/i.test(cleanSql)) {
      let rows = [...this.tables.staff_users];

      if (/COUNT\(CASE WHEN is_active = TRUE/i.test(cleanSql)) {
        const sellers = rows.filter(r => r.role === 'seller');
        const active = sellers.filter(s => s.is_active).length;
        const inactive = sellers.filter(s => !s.is_active).length;
        return Promise.resolve({
          rows: [
            { total_sellers: sellers.length, active_sellers: active, inactive_sellers: inactive },
          ],
          rowCount: 1,
        });
      }

      if (/COUNT\(\*\)/i.test(cleanSql)) {
        if (/role = 'seller'/i.test(cleanSql) || /role = \$1/i.test(cleanSql)) {
          let filtered = rows.filter(r => r.role === 'seller');
          if (/is_active = TRUE/i.test(cleanSql)) filtered = filtered.filter(r => r.is_active);
          if (/is_active = FALSE/i.test(cleanSql)) filtered = filtered.filter(r => !r.is_active);
          if (/LIKE/i.test(cleanSql) && params.length > 0) {
            const term = String(params[0]).replace(/%/g, '').toLowerCase();
            filtered = filtered.filter(
              r =>
                (r.full_name && r.full_name.toLowerCase().includes(term)) ||
                (r.email && r.email.toLowerCase().includes(term)),
            );
          }
          return Promise.resolve({ rows: [{ count: filtered.length }], rowCount: 1 });
        }
        if (/role = 'admin'/i.test(cleanSql)) {
          let filtered = rows.filter(r => r.role === 'admin' && r.is_active);
          if (/id != \$1/i.test(cleanSql) || /id <> \$1/i.test(cleanSql)) {
            filtered = filtered.filter(r => r.id !== Number(params[0]));
          }
          return Promise.resolve({ rows: [{ count: filtered.length }], rowCount: 1 });
        }
        return Promise.resolve({ rows: [{ count: rows.length }], rowCount: 1 });
      }

      if (
        /WHERE email = \$1/i.test(cleanSql) ||
        /WHERE LOWER\(email\) = \$1/i.test(cleanSql) ||
        /WHERE LOWER\(email\) = LOWER\(\$1\)/i.test(cleanSql)
      ) {
        if (/AND role = 'seller'/i.test(cleanSql)) {
          rows = rows.filter(
            r => r.email.toLowerCase() === String(params[0]).toLowerCase() && r.role === 'seller',
          );
        } else {
          rows = rows.filter(r => r.email.toLowerCase() === String(params[0]).toLowerCase());
        }
      } else if (/WHERE id = \$1/i.test(cleanSql)) {
        if (/AND role = 'seller'/i.test(cleanSql)) {
          rows = rows.filter(r => r.id === Number(params[0]) && r.role === 'seller');
        } else {
          rows = rows.filter(r => r.id === Number(params[0]));
        }
      } else if (/WHERE role = 'seller'/i.test(cleanSql)) {
        rows = rows.filter(r => r.role === 'seller');
        if (/is_active = TRUE/i.test(cleanSql)) rows = rows.filter(r => r.is_active);
        if (/is_active = FALSE/i.test(cleanSql)) rows = rows.filter(r => !r.is_active);
        if (/LIKE/i.test(cleanSql) && params.length > 0) {
          const term = String(params[0]).replace(/%/g, '').toLowerCase();
          rows = rows.filter(
            r =>
              (r.full_name && r.full_name.toLowerCase().includes(term)) ||
              (r.email && r.email.toLowerCase().includes(term)),
          );
        }
      }

      if (/LIMIT \$\d+/i.test(cleanSql)) {
        const limitIndex = Number(cleanSql.match(/LIMIT \$(\d+)/i)[1]) - 1;
        const offsetMatch = cleanSql.match(/OFFSET \$(\d+)/i);
        const offset = offsetMatch ? Number(params[Number(offsetMatch[1]) - 1]) : 0;
        rows = rows.slice(offset, offset + Number(params[limitIndex]));
      }

      return Promise.resolve({ rows, rowCount: rows.length });
    }

    if (/^SELECT/i.test(cleanSql) && /FROM security_audit_logs/i.test(cleanSql)) {
      return Promise.resolve({
        rows: [...this.tables.security_audit_logs],
        rowCount: this.tables.security_audit_logs.length,
      });
    }

    // 7. SELECT FROM orders
    if (/^SELECT/i.test(cleanSql) && /FROM order_idempotency/i.test(cleanSql)) {
      const rows = this.tables.order_idempotency.filter(
        row => row.customer_id === Number(params[0]) && row.idempotency_key === params[1],
      );
      return Promise.resolve({ rows, rowCount: rows.length });
    }

    // Store metrics for admin
    if (/SELECT\s+COUNT\(\*\)(?:::int)?\s+AS\s+total_stores/i.test(cleanSql)) {
      const stores = this.tables.stores || [];
      const total_stores = stores.length;
      const active_stores = stores.filter(s => s.is_active).length;
      const inactive_stores = stores.filter(s => !s.is_active).length;
      return Promise.resolve({
        rows: [{ total_stores, active_stores, inactive_stores }],
        rowCount: 1,
      });
    }

    if (/SELECT\s+COUNT\(\*\)(?:::int)?\s+AS\s+count\s+FROM\s+stores/i.test(cleanSql)) {
      let rows = [...(this.tables.stores || [])];
      if (/is_active = TRUE/i.test(cleanSql)) {
        rows = rows.filter(r => r.is_active);
      } else if (/is_active = FALSE/i.test(cleanSql)) {
        rows = rows.filter(r => !r.is_active);
      }
      if (/ILIKE|LIKE/i.test(cleanSql)) {
        const searchParam = params.find(
          p => typeof p === 'string' && p.startsWith('%') && p.endsWith('%'),
        );
        if (searchParam) {
          const term = searchParam.replace(/%/g, '').toLowerCase();
          rows = rows.filter(
            r =>
              (r.name && r.name.toLowerCase().includes(term)) ||
              (r.code && r.code.toLowerCase().includes(term)) ||
              (r.address && r.address.toLowerCase().includes(term)),
          );
        }
      }
      return Promise.resolve({ rows: [{ count: rows.length }], rowCount: 1 });
    }

    // SELECT FROM stores
    if (/^SELECT/i.test(cleanSql) && /FROM stores/i.test(cleanSql)) {
      // Handle store listing with LEFT JOIN on assignments and orders
      if (/LEFT JOIN|JOIN/i.test(cleanSql) && /GROUP BY/i.test(cleanSql)) {
        let rows = [...(this.tables.stores || [])];
        if (/s\.is_active = TRUE|is_active = TRUE/i.test(cleanSql)) {
          rows = rows.filter(s => s.is_active);
        } else if (/s\.is_active = FALSE|is_active = FALSE/i.test(cleanSql)) {
          rows = rows.filter(s => !s.is_active);
        }
        if (/ILIKE|LIKE/i.test(cleanSql)) {
          const searchParam = params.find(
            p => typeof p === 'string' && p.startsWith('%') && p.endsWith('%'),
          );
          if (searchParam) {
            const term = searchParam.replace(/%/g, '').toLowerCase();
            rows = rows.filter(
              r =>
                (r.name && r.name.toLowerCase().includes(term)) ||
                (r.code && r.code.toLowerCase().includes(term)) ||
                (r.address && r.address.toLowerCase().includes(term)),
            );
          }
        }
        const assignments = this.tables.seller_store_assignments || [];
        const orders = this.tables.orders || [];

        const enriched = rows.map(s => {
          const storeAssignments = assignments.filter(sa => sa.store_id === s.id);
          const assigned_sellers_count = new Set(storeAssignments.map(sa => sa.seller_id)).size;
          const storeOrders = orders.filter(o => o.store_id === s.id);
          const total_orders_count = new Set(storeOrders.map(o => o.id)).size;
          return {
            id: s.id,
            name: s.name,
            code: s.code,
            address: s.address || null,
            is_active: Boolean(s.is_active),
            created_at: s.created_at,
            assigned_sellers_count,
            total_orders_count,
          };
        });

        enriched.sort((a, b) => a.id - b.id);
        if (/LIMIT \$\d+/i.test(cleanSql)) {
          const limitIndex = Number(cleanSql.match(/LIMIT \$(\d+)/i)[1]) - 1;
          const offsetMatch = cleanSql.match(/OFFSET \$(\d+)/i);
          const offset = offsetMatch ? Number(params[Number(offsetMatch[1]) - 1]) : 0;
          return Promise.resolve({
            rows: enriched.slice(offset, offset + Number(params[limitIndex])),
            rowCount: enriched.length,
          });
        }
        return Promise.resolve({ rows: enriched, rowCount: enriched.length });
      }
      let rows = [...(this.tables.stores || [])];
      if (/WHERE id = \$1/i.test(cleanSql)) {
        rows = rows.filter(s => s.id === Number(params[0]));
      } else if (
        /WHERE code = \$1/i.test(cleanSql) ||
        /WHERE LOWER\(code\) = LOWER\(\$1\)/i.test(cleanSql)
      ) {
        rows = rows.filter(s => s.code.toLowerCase() === String(params[0]).toLowerCase());
        if (/AND id != \$2/i.test(cleanSql) || /AND id <> \$2/i.test(cleanSql)) {
          rows = rows.filter(s => s.id !== Number(params[1]));
        }
      } else {
        if (/is_active = TRUE/i.test(cleanSql)) rows = rows.filter(s => s.is_active);
        if (/is_active = FALSE/i.test(cleanSql)) rows = rows.filter(s => !s.is_active);
        if (/ILIKE|LIKE/i.test(cleanSql)) {
          const searchParam = params.find(
            p => typeof p === 'string' && p.startsWith('%') && p.endsWith('%'),
          );
          if (searchParam) {
            const term = searchParam.replace(/%/g, '').toLowerCase();
            rows = rows.filter(
              s =>
                (s.name && s.name.toLowerCase().includes(term)) ||
                (s.code && s.code.toLowerCase().includes(term)) ||
                (s.address && s.address.toLowerCase().includes(term)),
            );
          }
        }
      }

      rows.sort((a, b) => a.id - b.id);
      if (/LIMIT \$\d+/i.test(cleanSql)) {
        const limitIndex = Number(cleanSql.match(/LIMIT \$(\d+)/i)[1]) - 1;
        const offsetMatch = cleanSql.match(/OFFSET \$(\d+)/i);
        const offset = offsetMatch ? Number(params[Number(offsetMatch[1]) - 1]) : 0;
        rows = rows.slice(offset, offset + Number(params[limitIndex]));
      }

      return Promise.resolve({ rows, rowCount: rows.length });
    }

    // SELECT FROM seller_store_assignments
    if (/^SELECT/i.test(cleanSql) && /FROM seller_store_assignments/i.test(cleanSql)) {
      const assignments = [...(this.tables.seller_store_assignments || [])];
      const stores = this.tables.stores || [];

      if (/JOIN staff_users/i.test(cleanSql)) {
        const storeId = Number(params[0]);
        const storeAssignments = assignments.filter(a => a.store_id === storeId);
        const staffList = this.tables.staff_users || [];
        const joinedStaff = storeAssignments
          .map(a => {
            const u = staffList.find(su => su.id === a.seller_id);
            if (!u) return null;
            return {
              id: u.id,
              full_name: u.full_name,
              email: u.email,
              is_active: Boolean(u.is_active),
              assigned_at: a.created_at,
            };
          })
          .filter(Boolean);
        joinedStaff.sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
        return Promise.resolve({ rows: joinedStaff, rowCount: joinedStaff.length });
      }

      if (/JOIN stores/i.test(cleanSql)) {
        const sellerId = Number(params[0]);
        const sellerAssignments = assignments.filter(a => a.seller_id === sellerId);
        let joinedStores = sellerAssignments
          .map(a => {
            const s = stores.find(st => st.id === a.store_id);
            if (!s) return null;
            return { ...s, store_id: s.id, assigned_at: a.created_at };
          })
          .filter(Boolean);
        if (/s\.is_active = TRUE/i.test(cleanSql) || /is_active = TRUE/i.test(cleanSql)) {
          joinedStores = joinedStores.filter(s => s.is_active);
        }
        return Promise.resolve({ rows: joinedStores, rowCount: joinedStores.length });
      }

      let rows = assignments;
      if (/WHERE seller_id = \$1 AND store_id = \$2/i.test(cleanSql)) {
        rows = rows.filter(
          a => a.seller_id === Number(params[0]) && a.store_id === Number(params[1]),
        );
      } else if (/WHERE seller_id = \$1/i.test(cleanSql)) {
        rows = rows.filter(a => a.seller_id === Number(params[0]));
      } else if (/WHERE store_id = \$1/i.test(cleanSql)) {
        rows = rows.filter(a => a.store_id === Number(params[0]));
      }
      return Promise.resolve({ rows, rowCount: rows.length });
    }

    // Store revenue and order metrics query
    if (/SELECT\s+COUNT\(\*\)(?:::int)?\s+AS\s+total_orders,\s*COALESCE\(SUM/i.test(cleanSql)) {
      const storeId = Number(params[0]);
      const storeOrders = (this.tables.orders || []).filter(o => o.store_id === storeId);
      const recognized = storeOrders.filter(
        o => o.payment_status === 'paid' && o.order_status === 'completed',
      );
      const revenue = recognized.reduce((sum, o) => sum + (o.total_usd || 0), 0);
      return Promise.resolve({
        rows: [{ total_orders: storeOrders.length, revenue_usd: revenue }],
        rowCount: 1,
      });
    }

    // Orders count for seller store scoping
    if (/SELECT\s+COUNT\(\*\)(?:::int)?\s+AS\s+count\s+FROM\s+orders/i.test(cleanSql)) {
      let rows = [...(this.tables.orders || [])];
      if (/store_id = ANY\(\$1\)/i.test(cleanSql)) {
        const storeIds = Array.isArray(params[0]) ? params[0].map(Number) : [Number(params[0])];
        rows = rows.filter(r => r.store_id != null && storeIds.includes(r.store_id));
      } else if (/order_status = \$1/i.test(cleanSql)) {
        rows = rows.filter(r => r.order_status === String(params[0]));
      }
      return Promise.resolve({ rows: [{ count: rows.length }], rowCount: 1 });
    }

    if (/^SELECT/i.test(cleanSql) && /FROM orders/i.test(cleanSql)) {
      let rows = [...this.tables.orders];
      if (
        /WHERE id = \$1 AND (?:o\.)?store_id = ANY\(\$2\)/i.test(cleanSql) ||
        /WHERE id = \$1 AND (?:o\.)?store_id IN/i.test(cleanSql)
      ) {
        const orderId = Number(params[0]);
        const storeIds = Array.isArray(params[1]) ? params[1].map(Number) : [Number(params[1])];
        rows = rows.filter(
          r => r.id === orderId && r.store_id != null && storeIds.includes(r.store_id),
        );
      } else if (/store_id = ANY\(\$1\)/i.test(cleanSql) || /store_id IN \(/i.test(cleanSql)) {
        const storeIds = Array.isArray(params[0]) ? params[0].map(Number) : [Number(params[0])];
        rows = rows.filter(r => r.store_id != null && storeIds.includes(r.store_id));
      } else if (/WHERE store_id = \$1/i.test(cleanSql)) {
        rows = rows.filter(r => r.store_id === Number(params[0]));
      } else if (/WHERE customer_id = \$1/i.test(cleanSql)) {
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
      const row = this.tables.order_idempotency.find(
        entry => entry.customer_id === Number(params[0]) && entry.idempotency_key === params[1],
      );
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
        if (/is_active\s*=\s*FALSE/i.test(cleanSql)) staff.is_active = false;
        if (/is_active\s*=\s*TRUE/i.test(cleanSql)) staff.is_active = true;
        for (const [, field, position] of cleanSql.matchAll(
          /(full_name|email|password_hash|is_active|role) = \$(\d+)/gi,
        )) {
          const val = params[Number(position) - 1];
          staff[field] = field === 'is_active' ? Boolean(val) : val;
        }
      }
      return Promise.resolve({ rows: staff ? [staff] : [], rowCount: staff ? 1 : 0 });
    }
    if (/^UPDATE categories SET/i.test(cleanSql)) {
      const id = Number(params[params.length - 1]);
      const cat = this.tables.categories.find(c => c.id === id);
      if (cat) {
        for (const [, field, position] of cleanSql.matchAll(
          /(name|description|image|is_active) = \$(\d+)/gi,
        )) {
          cat[field] =
            field === 'is_active'
              ? Boolean(params[Number(position) - 1])
              : params[Number(position) - 1];
        }
      }
      return Promise.resolve({ rows: cat ? [cat] : [], rowCount: cat ? 1 : 0 });
    }
    if (/^UPDATE products SET/i.test(cleanSql)) {
      const id = Number(params[params.length - 1]);
      const prod = this.tables.products.find(p => p.id === id);
      if (prod) {
        for (const [, field, position] of cleanSql.matchAll(
          /(category_id|name|description|image|base_price_usd|is_available) = \$(\d+)/gi,
        )) {
          const value = params[Number(position) - 1];
          prod[field] =
            field === 'category_id' || field === 'base_price_usd'
              ? Number(value)
              : field === 'is_available'
                ? Boolean(value)
                : value;
        }
      }
      return Promise.resolve({ rows: prod ? [prod] : [], rowCount: prod ? 1 : 0 });
    }
    if (/^UPDATE stores SET/i.test(cleanSql)) {
      const id = Number(params[params.length - 1]);
      const store = this.tables.stores.find(s => s.id === id);
      if (store) {
        for (const [, field, position] of cleanSql.matchAll(
          /(name|code|address|is_active) = \$(\d+)/gi,
        )) {
          const val = params[Number(position) - 1];
          store[field] = field === 'is_active' ? Boolean(val) : val;
        }
      }
      return Promise.resolve({ rows: store ? [store] : [], rowCount: store ? 1 : 0 });
    }
    if (/^UPDATE orders SET/i.test(cleanSql)) {
      const orderId = Number(params[params.length - 1]);
      const order = this.tables.orders.find(o => o.id === orderId);
      if (order) {
        if (/order_status = \$1/i.test(cleanSql)) order.order_status = params[0];
        if (/payment_status = \$1/i.test(cleanSql) || /payment_status = \$2/i.test(cleanSql)) {
          order.payment_status = params[params.length - 2];
        }
        if (/store_id = \$/i.test(cleanSql)) {
          order.store_id = params[0] == null ? null : Number(params[0]);
        }
      }
      return Promise.resolve({ rows: order ? [order] : [], rowCount: order ? 1 : 0 });
    }

    // 10. DELETE
    if (/^DELETE FROM seller_store_assignments/i.test(cleanSql)) {
      const before = this.tables.seller_store_assignments.length;
      if (/WHERE seller_id = \$1 AND store_id = \$2/i.test(cleanSql)) {
        this.tables.seller_store_assignments = this.tables.seller_store_assignments.filter(
          a => !(a.seller_id === Number(params[0]) && a.store_id === Number(params[1])),
        );
      } else if (/WHERE seller_id = \$1/i.test(cleanSql)) {
        this.tables.seller_store_assignments = this.tables.seller_store_assignments.filter(
          a => a.seller_id !== Number(params[0]),
        );
      } else if (/WHERE store_id = \$1/i.test(cleanSql)) {
        this.tables.seller_store_assignments = this.tables.seller_store_assignments.filter(
          a => a.store_id !== Number(params[0]),
        );
      }
      return Promise.resolve({
        rowCount: before - this.tables.seller_store_assignments.length,
        rows: [],
      });
    }
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

export function buildPoolConfig(databaseUrl = config.databaseUrl) {
  const poolConfig = {
    connectionString: databaseUrl,
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT_MS || '10000', 10),
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT_MS || '30000', 10),
    max: parseInt(process.env.DB_POOL_MAX || '10', 10),
  };

  try {
    const parsed = new URL(databaseUrl);
    const isLoopback = ['127.0.0.1', 'localhost', '::1'].includes(parsed.hostname);
    const sslMode = parsed.searchParams.get('sslmode');

    // For non-loopback hosts without explicit sslmode parameter in staging/production,
    // enforce secure TLS with certificate validation.
    if (!isLoopback && !sslMode && isProductionOrStaging()) {
      poolConfig.ssl = { rejectUnauthorized: true };
    }
  } catch {
    // If URL parsing fails, pg will handle validation
  }

  // Security rule: Never disable certificate verification
  if (
    poolConfig.ssl &&
    typeof poolConfig.ssl === 'object' &&
    poolConfig.ssl.rejectUnauthorized === false
  ) {
    poolConfig.ssl.rejectUnauthorized = true;
  }

  return poolConfig;
}

export async function closeDatabase() {
  if (pool) {
    const currentPool = pool;
    pool = null;
    isConnectedToPostgres = false;
    await currentPool.end();
  }
}

export async function getDatabase() {
  if (pool) return pool;
  if (isTestMemoryDatabase) return memoryDb;

  const poolConfig = buildPoolConfig(config.databaseUrl);
  const nextPool = new Pool(poolConfig);

  nextPool.on('error', err => {
    console.error(
      'Unexpected idle PostgreSQL client error:',
      err.code || err.name || 'UnknownError',
    );
  });

  try {
    const client = await nextPool.connect();
    client.release();
    isConnectedToPostgres = true;
    console.log('🐘 Connected to PostgreSQL.');
    if (isProductionOrStaging()) {
      await verifyMigrations(nextPool);
    } else {
      await initSchema(nextPool);
    }
    pool = nextPool;
    return pool;
  } catch (err) {
    isConnectedToPostgres = false;
    await nextPool.end().catch(() => {});
    if (process.env.NODE_ENV === 'test' && process.env.ALLOW_IN_MEMORY_DB === 'true') {
      isTestMemoryDatabase = true;
      console.warn('PostgreSQL unavailable; using isolated in-memory database for tests only.');
      return memoryDb;
    }
    const reason = err.code || err.name || 'UnknownError';
    console.error(`PostgreSQL connection failed [${reason}].`);
    throw new Error(
      'PostgreSQL initialization failed; server was not started. Check database configuration and availability.',
    );
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
  if (isProductionOrStaging()) {
    throw new Error(
      'Automatic schema modification is prohibited in staging and production environments.',
    );
  }
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

    CREATE TABLE IF NOT EXISTS security_audit_logs (
      id SERIAL PRIMARY KEY,
      actor_id INTEGER,
      actor_role VARCHAR(50),
      action VARCHAR(100) NOT NULL,
      target_type VARCHAR(50),
      target_id INTEGER,
      details JSONB,
      ip_address VARCHAR(100),
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS stores (
      id SERIAL PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      code VARCHAR(64) NOT NULL UNIQUE,
      address TEXT,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS seller_store_assignments (
      id SERIAL PRIMARY KEY,
      seller_id INTEGER NOT NULL REFERENCES staff_users(id) ON DELETE CASCADE,
      store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT uq_seller_store UNIQUE (seller_id, store_id)
    );

    ALTER TABLE orders ADD COLUMN IF NOT EXISTS store_id INTEGER REFERENCES stores(id) ON DELETE RESTRICT;

    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
    CREATE INDEX IF NOT EXISTS idx_orders_phone ON orders(customer_phone);
    CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
    CREATE INDEX IF NOT EXISTS idx_orders_ref ON orders(order_number);
    CREATE INDEX IF NOT EXISTS idx_orders_store ON orders(store_id);
    CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
    CREATE INDEX IF NOT EXISTS idx_stores_code ON stores(code);
    CREATE INDEX IF NOT EXISTS idx_seller_assignments_seller ON seller_store_assignments(seller_id);
    CREATE INDEX IF NOT EXISTS idx_seller_assignments_store ON seller_store_assignments(store_id);
    CREATE INDEX IF NOT EXISTS idx_audit_actor ON security_audit_logs(actor_id);
    CREATE INDEX IF NOT EXISTS idx_audit_action ON security_audit_logs(action);
  `;

  if (isConnectedToPostgres && db) {
    await db.query(schemaSql);
  }
}
