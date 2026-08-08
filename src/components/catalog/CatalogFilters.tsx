import { Search } from "lucide-react";
import { categories } from "@/data/categories";
import type { CatalogFilters as CatalogFiltersType } from "@/lib/catalog";
import { getBrands } from "@/lib/catalog";
import { Button } from "@/components/shared/Button";

type CatalogFiltersProps = {
  filters: CatalogFiltersType;
  action?: string;
  showCategory?: boolean;
};

const statusOptions = [
  { value: "all", label: "Toda disponibilidad" },
  { value: "in-stock", label: "Disponible" },
  { value: "low-stock", label: "Stock bajo" },
  { value: "on-request", label: "Bajo pedido" },
  { value: "out-of-stock", label: "Agotado" },
] as const;

const sortOptions = [
  { value: "name-asc", label: "Nombre A-Z" },
  { value: "price-asc", label: "Precio menor a mayor" },
  { value: "price-desc", label: "Precio mayor a menor" },
] as const;

export function CatalogFilters({
  filters,
  action = "/catalogo",
  showCategory = true,
}: CatalogFiltersProps) {
  const brands = getBrands();

  return (
    <form
      action={action}
      className="rounded-lg border border-border bg-white p-4 shadow-card lg:sticky lg:top-32"
    >
      <div>
        <label className="text-sm font-extrabold text-dark" htmlFor="catalog-query">
          Buscar
        </label>
        <div className="mt-2 flex h-11 items-center gap-2 rounded-pill border border-border bg-background px-4 text-gray-text focus-within:border-primary">
          <Search className="h-4 w-4" aria-hidden="true" />
          <input
            id="catalog-query"
            name="q"
            type="search"
            defaultValue={filters.query ?? ""}
            placeholder="Equipo, SKU, marca o modelo"
            className="w-full bg-transparent text-sm font-medium text-dark outline-none placeholder:text-gray-text"
          />
        </div>
      </div>

      {showCategory ? (
        <div className="mt-4">
          <label className="text-sm font-extrabold text-dark" htmlFor="catalog-category">
            Categoría
          </label>
          <select
            id="catalog-category"
            name="categoria"
            defaultValue={filters.category ?? "all"}
            className="mt-2 h-11 w-full rounded-md border border-border bg-background px-3 text-sm font-semibold text-dark outline-primary"
          >
            <option value="all">Todas las categorías</option>
            {categories.map((category) => (
              <option key={category.id} value={category.slug}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="mt-4">
        <label className="text-sm font-extrabold text-dark" htmlFor="catalog-brand">
          Marca
        </label>
        <select
          id="catalog-brand"
          name="marca"
          defaultValue={filters.brand ?? "all"}
          className="mt-2 h-11 w-full rounded-md border border-border bg-background px-3 text-sm font-semibold text-dark outline-primary"
        >
          <option value="all">Todas las marcas</option>
          {brands.map((brand) => (
            <option key={brand} value={brand}>
              {brand}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4">
        <label className="text-sm font-extrabold text-dark" htmlFor="catalog-status">
          Disponibilidad
        </label>
        <select
          id="catalog-status"
          name="disponibilidad"
          defaultValue={filters.status ?? "all"}
          className="mt-2 h-11 w-full rounded-md border border-border bg-background px-3 text-sm font-semibold text-dark outline-primary"
        >
          {statusOptions.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4">
        <label className="text-sm font-extrabold text-dark" htmlFor="catalog-sort">
          Ordenar por
        </label>
        <select
          id="catalog-sort"
          name="orden"
          defaultValue={filters.sort ?? "name-asc"}
          className="mt-2 h-11 w-full rounded-md border border-border bg-background px-3 text-sm font-semibold text-dark outline-primary"
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-5 grid gap-3">
        <Button type="submit" className="w-full">
          Aplicar filtros
        </Button>
        <Button href={action} variant="ghost" className="w-full">
          Limpiar
        </Button>
      </div>
    </form>
  );
}
