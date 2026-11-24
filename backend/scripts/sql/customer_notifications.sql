-- Additive table for persistent customer drink-ready pickup notifications.
-- Safe to apply multiple times (idempotent).

CREATE TABLE IF NOT EXISTS customer_notifications (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customer_users(id) ON DELETE CASCADE,
  order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
  order_number VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'order_ready',
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_customer_notifications_customer
  ON customer_notifications(customer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_customer_notifications_unread
  ON customer_notifications(customer_id, is_read);
