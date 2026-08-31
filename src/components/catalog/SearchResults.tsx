import type { Product } from "@/types/product";
import { ProductGrid } from "@/components/catalog/ProductGrid";
import { SearchAnalytics } from "@/components/analytics/SearchAnalytics";
import { SectionTitle } from "@/components/shared/SectionTitle";
import { FinalCTA } from "@/components/shared/FinalCTA";

type SearchResultsProps = { query: string; products: Product[] };

export function SearchResults({ query, products }: SearchResultsProps) {
  return (
    <section className="bg-background py-12 sm:py-16">
      <SearchAnalytics query={query} resultCount={products.length} />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionTitle eyebrow="Búsqueda técnica" title={query ? `Resultados para “${query}”` : "Busca equipos y repuestos"} description="El buscador revisa nombre, marca, categoría, SKU, tipo, descripción y compatibilidad para conectar tu consulta con referencias verificadas o en descubrimiento asistido." />
        <div className="mt-8"><ProductGrid products={products} emptyTitle="Sin resultados para tu búsqueda" emptyDescription="No encontramos ese producto. Solicita asesoría o intenta con otra marca, SKU o modelo." /></div>
        {query && products.length === 0 ? <FinalCTA className="mt-10 rounded-lg" title="No encontramos ese producto, solicita asesoría" description="Un asesor puede ayudarte a validar compatibilidad y encontrar una alternativa aunque la referencia todavía no esté publicada." secondaryLabel="Ir a cotización" secondaryHref="/cotizacion" /> : null}
      </div>
    </section>
  );
}
