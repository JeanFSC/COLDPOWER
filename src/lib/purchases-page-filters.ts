import { parsePurchasesFilters, PurchasesInvalidFilterError, type PurchasesFilters } from "@/lib/purchases-contract";

export function resolvePurchasesPageFilters(incoming: URLSearchParams) {
  let filters: PurchasesFilters;
  let filterNotice: string | undefined;
  try { filters = parsePurchasesFilters(incoming); }
  catch (error) {
    if (!(error instanceof PurchasesInvalidFilterError)) throw error;
    filters = {};
    filterNotice = "Los filtros de compras no eran válidos y se restablecieron. La lista y la exportación usan el alcance sin filtros.";
  }
  const navigation = new URLSearchParams(incoming);
  for (const key of ["query", "q", "status", "supplierId", "locationId", "currency", "createdFrom", "createdTo", "expectedFrom", "expectedTo", "attention", "page", "pageSize"]) navigation.delete(key);
  const exportQuery = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) if (value !== undefined) {
    navigation.set(key, String(value));
    exportQuery.set(key, String(value));
  }
  return { filters, filterNotice, queryString: navigation.toString(), exportHref: `/api/admin/compras/export${exportQuery.size ? `?${exportQuery}` : ""}` };
}
