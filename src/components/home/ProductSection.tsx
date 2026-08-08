import Link from "next/link";
import { products } from "@/data/products";
import { OfferCard } from "@/components/catalog/OfferCard";
import { ProductCard } from "@/components/catalog/ProductCard";
import { SectionTitle } from "@/components/shared/SectionTitle";

export function ProductSection() {
  const featuredProducts = products.filter((product) => product.featured).slice(0, 4);
  const saleProducts = products.filter((product) => product.onSale).slice(0, 4);

  return (
    <section className="bg-background py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionTitle
          eyebrow="Productos"
          title="Equipos y repuestos listos para cotizar"
          description="Una selección inicial con información comercial, SKU y compatibilidad para acelerar la atención por WhatsApp."
        />

        <div className="mt-10">
          <div className="mb-5 flex items-end justify-between gap-4">
            <h3 className="font-display text-2xl font-black text-dark">Destacados</h3>
            <Link
              href="/catalogo"
              className="text-sm font-extrabold text-primary hover:text-primary-hover"
            >
              Ver catálogo
            </Link>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>

        {saleProducts.length > 0 ? (
          <div className="mt-14">
            <div className="mb-5 flex items-end justify-between gap-4">
              <h3 className="font-display text-2xl font-black text-dark">En oferta</h3>
              <Link
                href="/catalogo?oferta=true"
                className="text-sm font-extrabold text-primary hover:text-primary-hover"
              >
                Ver ofertas
              </Link>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {saleProducts.map((product) => (
                <OfferCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
