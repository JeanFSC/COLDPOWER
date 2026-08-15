import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Product } from "@/types/product";
import { ProductCard } from "@/components/catalog/ProductCard";
import { EmptyState } from "@/components/catalog/EmptyState";
import { SectionTitle } from "@/components/shared/SectionTitle";

export function ProductSection({ products }: { products: Product[] }) {
  return (
    <section className="bg-white py-10 sm:py-14" data-home-block="priority-products">
      <div className="cp-container">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <SectionTitle eyebrow="Productos destacados" title="Repuestos para empezar" description="Revisa rápidamente imagen, SKU, disponibilidad y ficha técnica." />
          <Link href="/catalogo" className="inline-flex shrink-0 items-center gap-2 text-sm font-bold text-brand-secondary-600 hover:text-dark">
            Ver catalogo <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
        <div className="mt-6">
          {products.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {products.slice(0, 10).map((product) => <ProductCard key={product.id} product={product} />)}
            </div>
          ) : (
            <EmptyState title="No hay productos publicados todavia" description="Las referencias aparecen cuando completan la revision editorial." />
          )}
        </div>
      </div>
    </section>
  );
}
