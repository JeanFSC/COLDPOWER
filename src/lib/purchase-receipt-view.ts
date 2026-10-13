type Receipt = { id: string; code: string; purchaseId: string; receivedAt: Date | string; status: string };
type ReceiptLine = { id: string; purchaseItemId: string; quantity: number };
type OrderLine = { id: string; skuSnapshot: string; productNameSnapshot: string };

export function purchaseReceiptViews(rows: Array<{ receipt: Receipt; item: ReceiptLine | null }>, orderLines: OrderLine[]) {
  const snapshots = new Map(orderLines.map(line => [line.id, line]));
  const grouped = new Map<string, Receipt & { items: Array<{ id: string; sku: string | null; name: string | null; quantity: number }> }>();
  for (const { receipt, item } of rows) {
    let view = grouped.get(receipt.id);
    if (!view) { view = { ...receipt, items: [] }; grouped.set(receipt.id, view); }
    if (item && !view.items.some(line => line.id === item.id)) {
      const snapshot = snapshots.get(item.purchaseItemId);
      view.items.push({ id: item.id, sku: snapshot?.skuSnapshot ?? null, name: snapshot?.productNameSnapshot ?? null, quantity: item.quantity });
    }
  }
  return [...grouped.values()];
}
