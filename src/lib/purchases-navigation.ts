export function purchaseOrderHref(queryString: string, purchaseId: string) {
  const query = new URLSearchParams(queryString);
  query.delete("receiptId");
  query.set("purchaseId", purchaseId);
  return `/admin/compras?${query.toString()}`;
}
export function purchaseRequestPageHref(queryString: string, page: number) {
  const query = new URLSearchParams(queryString);
  query.set("requestPage", String(page));
  return `/admin/compras?${query.toString()}`;
}

export function purchaseReceiptHref(queryString: string, purchaseId: string, receiptId: string) {
  const query = new URLSearchParams(queryString);
  query.set("purchaseId", purchaseId);
  query.set("receiptId", receiptId);
  return `/admin/compras?${query.toString()}`;
}
