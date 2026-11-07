CREATE TABLE payment_settlements (
  id BIGSERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL UNIQUE REFERENCES orders(id) ON DELETE RESTRICT,
  staff_id INTEGER NOT NULL REFERENCES staff_users(id) ON DELETE RESTRICT,
  method TEXT NOT NULL CHECK (method = 'cash'),
  reference VARCHAR(160) NOT NULL CHECK (length(trim(reference)) >= 3),
  amount_usd NUMERIC(10,2) NOT NULL CHECK (amount_usd > 0),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE FUNCTION reject_payment_audit_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Payment audit records are immutable'; END
$$;
CREATE TRIGGER payment_audit_immutable BEFORE UPDATE OR DELETE ON payment_settlements
FOR EACH ROW EXECUTE FUNCTION reject_payment_audit_mutation();
CREATE TRIGGER payment_audit_no_truncate BEFORE TRUNCATE ON payment_settlements
FOR EACH STATEMENT EXECUTE FUNCTION reject_payment_audit_mutation();
