// Recorded revenue requires both payment recorded as paid and fulfillment complete.
// This is a reporting rule, not proof that a historical payment was reconciled.
export function countsAsRevenue(order) {
  return order.payment_status === 'paid' && order.order_status === 'completed';
}

export function sumRevenue(orders) {
  let usdCents = 0;
  let khr = 0;
  for (const order of orders) {
    if (!countsAsRevenue(order)) continue;
    usdCents += Math.round(Number(order.total_usd) * 100);
    khr += Number(order.total_khr);
  }
  return { usd: usdCents / 100, khr };
}
