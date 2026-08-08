import type { Metadata } from "next";
import { CatalogFilters } from "@/components/catalog/CatalogFilters";
import { ProductGrid } from "@/components/catalog/ProductGrid";
import { SectionTitle } from "@/components/shared/SectionTitle";
import type { CatalogFilters as CatalogFiltersType, ProductSort } from "@/lib/catalog";
import { filterProducts } from "@/lib/catalog";
import type { ProductStatus } from "@/types/product";

export const metadata: Metadata = {
  title: "Catálogo",
  description:
    "Explora equipos y repuestos de refrigeración, aire acondicionado y línea blanca ColdPower con filtros por categoría, marca y disponibilidad.",
};

type CatalogPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  const params = await searchParams;
  const filters = readCatalogFilters(params);
  const filteredProducts = filterProducts(filters);

  return (
    <section className="bg-background py-10 sm:py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-lg bg-dark px-6 py-9 text-white shadow-float sm:px-8">
          <SectionTitle
            eyebrow="Catálogo"
            title="Equipos y repuestos para cotización asistida"
            description="Filtra por categoría, marca y disponibilidad para encontrar una opción referencial antes de hablar con un especialista."
            dark
          />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[300px_1fr]">
          <CatalogFilters filters={filters} />
          <div>
            <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-extrabold uppercase tracking-[0.16em] text-primary">
                  {filteredProducts.length} resultados
                </p>
                <h1 className="font-display text-2xl font-black text-dark">Listado de productos</h1>
              </div>
              <p className="text-sm font-semibold text-gray-text">
                Precios y stock son referenciales para esta versión frontend.
              </p>
            </div>
            <ProductGrid products={filteredProducts} />
          </div>
        </div>
      </div>
    </section>
  );
}

function readCatalogFilters(
  params: Record<string, string | string[] | undefined>,
): CatalogFiltersType {
  return {
    query: getParam(params.q),
    category: getParam(params.categoria),
    brand: getParam(params.marca),
    status: getParam(params.disponibilidad) as ProductStatus | "all" | undefined,
    sort: getParam(params.orden) as ProductSort | undefined,
  };
}

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
