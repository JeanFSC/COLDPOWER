import Link from "next/link";
import { ArrowRight, DatabaseZap, SearchX } from "lucide-react";
import type { Product } from "@/types/product";
import { HomeProductCard } from "@/components/home/HomeProductCard";
import { SectionTitle } from "@/components/shared/SectionTitle";

export function ProductSection({
  products,
  catalogUnavailable = false,
}: {
  products: Product[];
  catalogUnavailable?: boolean;
}) {
  const featuredProducts = products.filter((product) => product.featured);
  const visibleProducts = (featuredProducts.length > 0 ? featuredProducts : products).slice(0, 6);

  return (
    <section className="bg-white py-10 sm:py-14" data-home-block="priority-products">
      <div className="cp-container">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <SectionTitle
            eyebrow={featuredProducts.length > 0 ? "Productos destacados" : "Catálogo publicado"}
            title="Referencias para empezar"
            description="Revisa imagen, SKU, disponibilidad y ficha técnica antes de solicitar una cotización."
          />
          <Link
            href="/catalogo"
            prefetch={false}
            className="inline-flex shrink-0 items-center gap-2 text-sm font-bold text-brand-secondary-600 hover:text-dark"
          >
            Ver catálogo <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
        {featuredProducts.length > 0 ? (
          <div
            className="mt-6 flex items-center gap-2"
            role="tablist"
            aria-label="Vista de productos"
          >
            <span
              role="tab"
              aria-selected="true"
              className="rounded-full bg-brand-primary-900 px-4 py-2 text-xs font-extrabold text-white"
            >
              Recomendados
            </span>
          </div>
        ) : null}
        <div className="mt-6">
          {catalogUnavailable ? (
            <div
              className="flex items-start gap-3 rounded-xl border border-danger/25 bg-surface-page px-5 py-4 text-sm text-text-secondary"
              role="alert"
            >
              <DatabaseZap className="mt-0.5 h-5 w-5 shrink-0 text-danger" aria-hidden="true" />
              <div>
                <h3 className="font-extrabold text-dark">No pudimos consultar las referencias</h3>
                <p className="mt-1 leading-6">
                  El catálogo persistente no respondió. Reintenta en unos momentos para ver datos
                  actualizados.
                </p>
              </div>
            </div>
          ) : visibleProducts.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {visibleProducts.map((product, index) => (
                <HomeProductCard key={product.id} product={product} priority={index < 2} />
              ))}
            </div>
          ) : (
            <div className="flex items-start gap-3 rounded-xl border border-dashed border-border bg-surface-page px-5 py-4 text-sm text-text-secondary">
              <SearchX className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
              <div>
                <h3 className="font-extrabold text-dark">Aún no hay referencias publicadas</h3>
                <p className="mt-1 leading-6">
                  Las referencias aparecerán aquí cuando completen la revisión editorial.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
