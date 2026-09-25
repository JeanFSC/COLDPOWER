import { DatabaseZap, SearchX } from "lucide-react";
import type { Product } from "@/types/product";
import { HomeProductTabs } from "@/components/home/HomeProductTabs";

export function ProductSection({
  products,
  bestSellerProductId = null,
  catalogUnavailable = false,
}: {
  products: Product[];
  bestSellerProductId?: string | null;
  catalogUnavailable?: boolean;
}) {
  return (
    <section className="home-section home-section-soft" data-home-block="priority-products">
      <div className="home-container">
        {catalogUnavailable ? (
          <>
            <ProductSectionHeading />
            <div className="mt-5 flex items-start gap-3 rounded-xl border border-danger/25 bg-white px-5 py-4 text-sm text-text-secondary" role="alert">
              <DatabaseZap className="mt-0.5 h-5 w-5 shrink-0 text-danger" aria-hidden="true" />
              <div>
                <h3 className="font-extrabold text-dark">No pudimos consultar las referencias</h3>
                <p className="mt-1 leading-6">El catálogo persistente no respondió. Reintenta en unos momentos.</p>
              </div>
            </div>
          </>
        ) : products.length > 0 ? (
          <HomeProductTabs products={products} bestSellerProductId={bestSellerProductId} />
        ) : (
          <>
            <ProductSectionHeading />
            <div className="mt-5 flex items-start gap-3 rounded-xl border border-dashed border-border bg-white px-5 py-4 text-sm text-text-secondary">
              <SearchX className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
              <div>
                <h3 className="font-extrabold text-dark">Aún no hay referencias publicadas</h3>
                <p className="mt-1 leading-6">Las referencias aparecerán aquí cuando completen la revisión editorial.</p>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

export function ProductSectionHeading() {
  return (
    <div className="home-section-heading home-product-section-heading">
      <div>
        <h2 className="home-section-title">Referencias para empezar</h2>
        <p className="home-section-subtitle">Productos más buscados para tus proyectos</p>
      </div>
    </div>
  );
}
