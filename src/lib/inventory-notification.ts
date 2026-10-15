export function inventoryNotification(input: { productId: string; productName: string; locationId: string; locationName: string | null; available: number; minimumStock: number | null }) {
  const { productId, productName, locationId, available, minimumStock } = input;
  const local = input.locationName || locationId;
  const link = `/admin/inventario?${new URLSearchParams({ productId, locationId })}`;
  if (available <= 0) return {
    type: "PRODUCT_OUT_OF_STOCK", title: "Producto agotado en un local",
    body: `${productName} quedó sin stock disponible en ${local}.`, link,
    metadata: { productId, locationId, available }, dedupeKey: `stock:${productId}:${locationId}:out`,
  };
  if (minimumStock !== null && available <= minimumStock) return {
    type: "STOCK_MINIMUM", title: "Stock mínimo alcanzado",
    body: `${productName} está en o por debajo del stock mínimo en ${local}.`, link,
    metadata: { productId, locationId, available, minimumStock }, dedupeKey: `stock:${productId}:${locationId}:minimum:${available}`,
  };
  return null;
}
