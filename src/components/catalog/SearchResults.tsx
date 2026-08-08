import type { Product } from "@/types/product";
import { ProductGrid } from "@/components/catalog/ProductGrid";
import { SectionTitle } from "@/components/shared/SectionTitle";
import { FinalCTA } from "@/components/shared/FinalCTA";

type SearchResultsProps = {
  query: string;
  products: Product[];
};

export function SearchResults({ query, products }: SearchResultsProps) {
  return (
    <section className="bg-background py-12 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionTitle
          eyebrow="Búsqueda"
          title={query ? `Resultados para “${query}”` : "Busca equipos y repuestos"}
          description="El buscador revisa nombre, marca, categoría, SKU, tipo, descripción y compatibilidad en la data mock del frontend."
        />

        <div className="mt-8">
          <ProductGrid
            products={products}
            emptyTitle="Sin resultados para tu búsqueda"
            emptyDescription="No encontramos ese producto, solicita asesoría o intenta con otra marca, SKU o modelo."
          />
        </div>

        {query && products.length === 0 ? (
          <FinalCTA
            className="mt-10 rounded-lg"
            title="No encontramos ese producto, solicita asesoría"
            description="Un asesor puede ayudarte a validar compatibilidad aunque el producto todavía no figure en el catálogo mock."
            secondaryLabel="Ir a cotización"
            secondaryHref="/cotizacion"
          />
        ) : null}
      </div>
    </section>
  );
}
