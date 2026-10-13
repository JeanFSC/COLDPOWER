import { parsePricingFilters, PricingInvalidFilterError, type PricingFilters } from "@/lib/pricing-contract";

export function resolvePricingPageFilters(params: Record<string, string | string[] | undefined>): { filters: PricingFilters; filterNotice?: string; exportHref: string } {
  const incoming = new URLSearchParams();
  for (const [key, raw] of Object.entries(params)) {
    const value = Array.isArray(raw) ? raw[0] : raw;
    if (value !== undefined) incoming.set(key, value);
  }
  let filters: PricingFilters;
  let filterNotice: string | undefined;
  try { filters = parsePricingFilters(incoming); }
  catch (error) {
    if (!(error instanceof PricingInvalidFilterError)) throw error;
    filters = {};
    filterNotice = "Los filtros no eran válidos y se restablecieron. La lista y la exportación usan el alcance sin filtros.";
  }
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) if (value !== undefined) query.set(key, String(value));
  return { filters, filterNotice, exportHref: `/api/admin/precios/export${query.size ? `?${query.toString()}` : ""}` };
}
