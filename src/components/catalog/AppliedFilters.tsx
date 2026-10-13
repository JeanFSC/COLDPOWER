import Link from "next/link";
import type { CatalogFilters } from "@/lib/catalog";

type FacetOption = { slug: string; name: string };
type AppliedFiltersProps = { filters: CatalogFilters; action?: string; categories?: FacetOption[]; families?: FacetOption[]; brands?: FacetOption[] };
function values(value: string | string[] | undefined) { if (!value) return []; return (Array.isArray(value) ? value : value.split(",")).filter((item) => item && item !== "all"); }

export function AppliedFilters({ filters, action = "/catalogo", categories = [], families = [], brands = [] }: AppliedFiltersProps) {
  const label = (value: string, options: FacetOption[]) => options.find((option) => option.slug === value)?.name ?? value;
  const chips = [...(filters.query ? [{ label: `Búsqueda: ${filters.query}`, key: "q", value: filters.query }] : []), ...values(filters.category).map((value) => ({ label: `Categoría: ${label(value, categories)}`, key: "categoria", value })), ...values(filters.family).map((value) => ({ label: `Familia: ${label(value, families)}`, key: "familia", value })), ...(filters.productType ? [{ label: `Tipo: ${filters.productType}`, key: "tipo", value: filters.productType }] : []), ...values(filters.brand).map((value) => ({ label: `Marca: ${label(value, brands)}`, key: "marca", value })), ...values(filters.status).map((value) => ({ label: `Estado: ${value}`, key: "disponibilidad", value }))];
  const removeHref = (key: string, value: string) => {
    const params = new URLSearchParams();
    const fields: Array<[string, string[]]> = [["q", filters.query ? [filters.query] : []], ["categoria", values(filters.category)], ["familia", values(filters.family)], ["tipo", filters.productType ? [filters.productType] : []], ["marca", values(filters.brand)], ["disponibilidad", values(filters.status)], ["orden", filters.sort ? [filters.sort] : []]];
    for (const [field, items] of fields) for (const item of items) if (field !== key || item !== value) params.append(field, item);
    const query = params.toString();
    return `${action}${query ? `?${query}` : ""}`;
  };
  if (chips.length === 0) return null;
  return <div className="mb-5 flex flex-wrap items-center gap-2" data-testid="applied-filters"><span className="text-xs font-semibold uppercase tracking-[0.12em] text-text-secondary">Filtros activos</span>{chips.map((chip, index) => <Link key={`${chip.key}-${chip.label}-${index}`} href={removeHref(chip.key, chip.value)} className="rounded-pill border border-brand-secondary-600/30 bg-brand-secondary-600/8 px-3 py-1.5 text-xs font-semibold text-brand-secondary-600 hover:bg-brand-secondary-600/15">{chip.label} ×</Link>)}<Link href={action} className="ml-auto text-xs font-semibold text-text-secondary underline hover:text-brand-primary-900">Limpiar todos</Link></div>;
}
