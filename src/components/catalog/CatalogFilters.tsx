"use client";

import { Search } from "lucide-react";
import { Button } from "@/components/shared/Button";
import { trackCatalogEvent } from "@/lib/analytics";
import type { CatalogFilters as CatalogFiltersType, ProductSort } from "@/lib/catalog";

type FacetOption = { slug: string; name: string };
type CatalogFiltersProps = {
  filters: CatalogFiltersType;
  action?: string;
  showCategory?: boolean;
  categories?: FacetOption[];
  families?: FacetOption[];
  brands?: FacetOption[];
};

const statusOptions = [
  { value: "all", label: "Toda disponibilidad" },
  { value: "on-request", label: "Consultar disponibilidad" },
  { value: "out-of-stock", label: "No disponible" },
] as const;
const sortOptions: Array<{ value: ProductSort; label: string }> = [
  { value: "relevance", label: "Relevancia técnica" },
  { value: "availability", label: "Disponibilidad" },
  { value: "consulted", label: "Más consultados" },
  { value: "price-asc", label: "Precio menor a mayor" },
  { value: "price-desc", label: "Precio mayor a menor" },
  { value: "updated", label: "Actualizados recientemente" },
];
const firstValue = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;

export function CatalogFilters({
  filters,
  action = "/catalogo",
  showCategory = true,
  categories = [],
  families = [],
  brands = [],
}: CatalogFiltersProps) {
  return (
    <form
      action={action}
      onSubmit={() => trackCatalogEvent("filter_applied", { category: firstValue(filters.category), sort: filters.sort })}
      className="rounded-md border border-border bg-white p-4 shadow-card lg:sticky lg:top-28"
    >
      {filters.productType ? <input type="hidden" name="tipo" value={filters.productType} /> : null}
      <div>
        <label className="text-sm font-semibold text-brand-primary-900" htmlFor="catalog-query">Buscar por código o especificación</label>
        <div className="mt-2 flex h-11 items-center gap-2 rounded-md border border-border bg-surface-page px-4 text-text-secondary focus-within:border-brand-secondary-600">
          <Search className="h-4 w-4" aria-hidden="true" />
          <input id="catalog-query" name="q" type="search" defaultValue={filters.query ?? ""} placeholder="SKU, MPN, modelo, R410A…" className="w-full bg-transparent text-sm font-medium text-brand-primary-900 outline-none placeholder:text-text-secondary" />
        </div>
      </div>
      {showCategory ? (
        <div className="mt-5">
          <label className="text-sm font-semibold text-brand-primary-900" htmlFor="catalog-category">Categoría</label>
          <select id="catalog-category" name="categoria" defaultValue={firstValue(filters.category) ?? "all"} className="mt-2 h-11 w-full rounded-md border border-border bg-surface-page px-3 text-sm font-semibold text-brand-primary-900 outline-brand-secondary-600">
            <option value="all">Todas las categorías</option>
            {categories.map((category) => <option key={category.slug} value={category.slug}>{category.name}</option>)}
          </select>
        </div>
      ) : null}
      <div className="mt-5">
        <label className="text-sm font-semibold text-brand-primary-900" htmlFor="catalog-family">Familia</label>
        <select id="catalog-family" name="familia" defaultValue={firstValue(filters.family) ?? "all"} className="mt-2 h-11 w-full rounded-md border border-border bg-surface-page px-3 text-sm font-semibold text-brand-primary-900 outline-brand-secondary-600">
          <option value="all">Todas las familias</option>
          {families.map((family) => <option key={family.slug} value={family.slug}>{family.name}</option>)}
        </select>
      </div>
      <div className="mt-5">
        <label className="text-sm font-semibold text-brand-primary-900" htmlFor="catalog-brand">Marca</label>
        <select id="catalog-brand" name="marca" defaultValue={firstValue(filters.brand) ?? "all"} className="mt-2 h-11 w-full rounded-md border border-border bg-surface-page px-3 text-sm font-semibold text-brand-primary-900 outline-brand-secondary-600">
          <option value="all">Todas las marcas</option>
          {brands.map((brand) => <option key={brand.slug} value={brand.slug}>{brand.name}</option>)}
        </select>
      </div>
      <div className="mt-5">
        <label className="text-sm font-semibold text-brand-primary-900" htmlFor="catalog-status">Disponibilidad</label>
        <select id="catalog-status" name="disponibilidad" defaultValue={firstValue(filters.status) ?? "all"} className="mt-2 h-11 w-full rounded-md border border-border bg-surface-page px-3 text-sm font-semibold text-brand-primary-900 outline-brand-secondary-600">
          {statusOptions.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
        </select>
      </div>
      <div className="mt-5">
        <label className="text-sm font-semibold text-brand-primary-900" htmlFor="catalog-sort">Ordenar por</label>
        <select id="catalog-sort" name="orden" defaultValue={filters.sort ?? "relevance"} className="mt-2 h-11 w-full rounded-md border border-border bg-surface-page px-3 text-sm font-semibold text-brand-primary-900 outline-brand-secondary-600">
          {sortOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </div>
      <div className="mt-6 grid gap-3">
        <Button type="submit" variant="secondary" className="w-full">Aplicar filtros</Button>
        <Button href={action} variant="ghost" className="w-full">Limpiar filtros</Button>
      </div>
    </form>
  );
}
