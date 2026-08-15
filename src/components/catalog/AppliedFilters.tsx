import Link from "next/link";
import type { CatalogFilters } from "@/lib/catalog";

type AppliedFiltersProps = { filters: CatalogFilters; action?: string };
function values(value: string | string[] | undefined) { if (!value) return []; return (Array.isArray(value) ? value : value.split(",")).filter((item) => item && item !== "all"); }

export function AppliedFilters({ filters, action = "/catalogo" }: AppliedFiltersProps) {
  const chips = [...values(filters.query).map((value) => ({ label: `Búsqueda: ${value}`, key: "q" })), ...values(filters.category).map((value) => ({ label: `Categoría: ${value}`, key: "categoria" })), ...values(filters.family).map((value) => ({ label: `Familia: ${value}`, key: "familia" })), ...values(filters.brand).map((value) => ({ label: `Marca: ${value}`, key: "marca" })), ...values(filters.status).map((value) => ({ label: `Estado: ${value}`, key: "disponibilidad" }))];
  if (chips.length === 0) return null;
  return <div className="mb-5 flex flex-wrap items-center gap-2" data-testid="applied-filters"><span className="text-xs font-semibold uppercase tracking-[0.12em] text-text-secondary">Filtros activos</span>{chips.map((chip, index) => <Link key={`${chip.key}-${chip.label}-${index}`} href={action} className="rounded-pill border border-brand-secondary-600/30 bg-brand-secondary-600/8 px-3 py-1.5 text-xs font-semibold text-brand-secondary-600 hover:bg-brand-secondary-600/15">{chip.label} ×</Link>)}<Link href={action} className="ml-auto text-xs font-semibold text-text-secondary underline hover:text-brand-primary-900">Limpiar todos</Link></div>;
}
