export function inventoryReferenceHref(referenceType: string | null, referenceId: string | null) {
  if (!referenceId) return null;
  const id = encodeURIComponent(referenceId);
  if (referenceType === "order") return `/admin/pedidos?orderId=${id}`;
  if (referenceType === "sale") return `/admin/ventas?saleId=${id}`;
  if (referenceType === "transfer" || referenceType === "transfer_cancel") return `/admin/inventario?tab=transfers&transferId=${id}`;
  if (referenceType === "reservation" || referenceType === "reservation_expiry") return `/admin/inventario?tab=reservations&reservationId=${id}`;
  if (referenceType === "purchase") return `/admin/compras?purchaseId=${id}`;
  if (referenceType === "purchase_receipt") return `/admin/compras?receiptId=${id}`;
  if (referenceType === "stock_import") return `/admin/inventario?tab=imports&importBatchId=${id}`;
  return null;
}
