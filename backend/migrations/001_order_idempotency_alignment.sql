-- Phase 5 preparation: additive alignment for legacy café schemas.
-- Apply only after schema preflight and backup; this file does not rewrite orders.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_id INTEGER REFERENCES customer_users(id) ON DELETE SET NULL;
ALTER TABLE orders ALTER COLUMN payment_status SET DEFAULT 'unpaid';

CREATE TABLE IF NOT EXISTS order_idempotency (
  customer_id INTEGER NOT NULL REFERENCES customer_users(id) ON DELETE CASCADE,
  idempotency_key VARCHAR(128) NOT NULL,
  request_hash CHAR(64) NOT NULL,
  order_id INTEGER UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (customer_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_ref ON orders(order_number);
