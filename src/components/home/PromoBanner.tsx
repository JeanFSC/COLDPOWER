import { ArrowRight } from "lucide-react";
import { OfferCard } from "@/components/catalog/OfferCard";
import { products } from "@/data/products";

const promoProductIds = new Set([
  "prod-ref-0001",
  "prod-lav-0001",
  "prod-lic-0001",
  "prod-bom-0001",
]);

const promoProducts = products.filter((product) => promoProductIds.has(product.id));

export function PromoBanner() {
  if (promoProducts.length === 0) {
    return null;
  }

  return (
    <section className="bg-white py-14 sm:py-16" aria-labelledby="promos-heading">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2
              id="promos-heading"
              className="font-display text-3xl font-black tracking-normal text-dark sm:text-4xl"
            >
              Promociones
            </h2>
          </div>

          <a
            href="/catalogo"
            className="inline-flex items-center gap-2 text-sm font-extrabold text-primary transition hover:text-primary-hover"
          >
            Ver catálogo
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </a>
        </div>

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {promoProducts.map((product) => (
            <OfferCard
              key={product.id}
              product={product}
              badgeLabel="Promoción especial"
              priceLabel="Precio promoción"
              disclaimer="Promoción referencial sujeta a stock y validación por un asesor."
            />
          ))}
        </div>

        <p className="mt-5 text-xs leading-5 text-gray-text">
          Precios promocionales referenciales. ColdPower confirma stock, compatibilidad y precio
          final por asesor.
        </p>
      </div>
    </section>
  );
}
