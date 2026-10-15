/** A payment join may return several rows for one order. Keep its full payment history. */
export function groupSaleOrderPayments<Order extends { id: string }, Payment extends object>(
  rows: Array<{ order: Order; payment: Payment | null; refundedAmount: string }>,
) {
  const grouped = new Map<string, { order: Order; payments: Array<Payment & { refundedAmount: string }> }>();
  for (const row of rows) {
    let entry = grouped.get(row.order.id);
    if (!entry) {
      entry = { order: row.order, payments: [] };
      grouped.set(row.order.id, entry);
    }
    if (row.payment) entry.payments.push({ ...row.payment, refundedAmount: row.refundedAmount });
  }
  return [...grouped.values()];
}
