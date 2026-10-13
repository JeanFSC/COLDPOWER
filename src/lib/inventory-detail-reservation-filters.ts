export function parseInventoryDetailReservationFilters(params: URLSearchParams) {
  const productId = params.get("productId")?.trim();
  const locationId = params.get("locationId")?.trim();
  const rawPage = params.get("page") ?? "1";
  const page = Number(rawPage);
  if (!productId || !locationId || !/^\d+$/.test(rawPage) || !Number.isSafeInteger(page) || page < 1) {
    return null;
  }
  return { productId, locationId, page };
}
