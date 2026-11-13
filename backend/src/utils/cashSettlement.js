export class SettlementError extends Error {
  constructor(message, status = 409) {
    super(message);
    this.status = status;
  }
}

export async function recordCashSettlement(query, orderId, staffId, body) {
  if (
    !body ||
    body.confirm_cash_received !== true ||
    typeof body.reference !== 'string' ||
    !/^[A-Za-z0-9 ._:/-]{3,160}$/.test(body.reference.trim()) ||
    Object.keys(body).some(key => !['confirm_cash_received', 'reference'].includes(key))
  ) {
    throw new SettlementError(
      'Confirm cash received and provide a receipt reference without banking details.',
      422,
    );
  }
  const result = await query('SELECT * FROM orders WHERE id = $1 FOR UPDATE', [orderId]);
  const order = result.rows[0];
  if (!order) throw new SettlementError('Order not found.', 404);
  if (
    order.payment_method !== 'cash' ||
    order.payment_status !== 'unpaid' ||
    !['ready', 'completed'].includes(order.order_status)
  ) {
    throw new SettlementError(
      'Only an unpaid cash order ready for handoff or completed can be settled.',
    );
  }
  const audit = await query(
    `INSERT INTO payment_settlements
    (order_id, staff_id, method, reference, amount_usd) VALUES ($1, $2, 'cash', $3, $4)
    RETURNING id, order_id, staff_id, method, reference, amount_usd, recorded_at`,
    [orderId, staffId, body.reference.trim(), order.total_usd],
  );
  await query("UPDATE orders SET payment_status = 'paid' WHERE id = $1", [orderId]);
  return audit.rows[0];
}
