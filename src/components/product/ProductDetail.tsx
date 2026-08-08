import Image from "next/image";
import Link from "next/link";
import { MessageCircle, PackageCheck, ShieldCheck } from "lucide-react";
import type { Product } from "@/types/product";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { Badge } from "@/components/shared/Badge";
import { Button } from "@/components/shared/Button";
import { ProductGrid } from "@/components/catalog/ProductGrid";
import { company } from "@/data/company";
import { formatProductPrice } from "@/lib/formatters";
import { createWhatsAppLink } from "@/lib/whatsapp";
import { getRelatedProducts } from "@/lib/catalog";

type ProductDetailProps = {
  product: Product;
};

const statusLabel: Record<Product["status"], string> = {
  "in-stock": "Disponible",
  "low-stock": "Stock bajo",
  "on-request": "Bajo pedido",
  "out-of-stock": "Agotado",
};

export function ProductDetail({ product }: ProductDetailProps) {
  const productHref = `/producto/${product.slug}`;
  const quoteHref = `/cotizacion?producto=${encodeURIComponent(product.slug)}&sku=${encodeURIComponent(product.sku)}`;
  const whatsappHref = createWhatsAppLink({
    phone: company.whatsapp,
    productName: product.name,
    sku: product.sku,
    url: `${company.domain}${productHref}`,
  });
  const relatedProducts = getRelatedProducts(product);

  return (
    <>
      <section className="bg-dark text-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <nav className="text-sm font-semibold text-gray-light" aria-label="Breadcrumb">
            <Link href="/catalogo" className="hover:text-white">
              Catálogo
            </Link>
            <span className="mx-2">/</span>
            <span>{product.name}</span>
          </nav>

          <div className="mt-8 grid gap-10 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="overflow-hidden rounded-lg border border-white/10 bg-white/8 p-4 shadow-float">
              <div className="relative aspect-square overflow-hidden rounded-md bg-dark-secondary">
                <Image
                  src={product.images[0] ?? "/images/product-placeholder-repuesto.svg"}
                  alt={product.name}
                  fill
                  sizes="(min-width: 1024px) 45vw, 100vw"
                  priority
                  className="object-cover"
                />
              </div>
            </div>

            <div>
              <div className="flex flex-wrap gap-2">
                <Badge variant={product.onSale ? "offer" : "tech"}>
                  {product.onSale ? "Oferta" : product.type}
                </Badge>
                <Badge variant="stock">{statusLabel[product.status]}</Badge>
              </div>

              <h1 className="mt-5 font-display text-4xl font-black leading-tight tracking-normal sm:text-5xl">
                {product.name}
              </h1>
              <p className="mt-4 text-lg leading-8 text-gray-light">{product.shortDescription}</p>

              <div className="mt-6 grid gap-3 rounded-md border border-white/10 bg-white/8 p-4 sm:grid-cols-2">
                <p className="text-sm text-gray-light">
                  Marca
                  <span className="block text-base font-extrabold text-white">{product.brand}</span>
                </p>
                <p className="text-sm text-gray-light">
                  SKU
                  <span className="block font-mono text-base font-extrabold text-white">
                    {product.sku}
                  </span>
                </p>
                <p className="text-sm text-gray-light">
                  Stock referencial
                  <span className="block text-base font-extrabold text-white">
                    {product.stock > 0 ? `${product.stock} unidades` : "Consultar"}
                  </span>
                </p>
                <p className="text-sm text-gray-light">
                  Precio referencial
                  <span className="block font-display text-2xl font-black text-primary">
                    {formatProductPrice(product.price)}
                  </span>
                </p>
              </div>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <AddToCartButton
                  productId={product.id}
                  label="Agregar al carrito"
                  size="lg"
                  className="w-full sm:w-auto"
                />
                <Button href={quoteHref} size="lg" className="w-full sm:w-auto">
                  <PackageCheck className="h-5 w-5" aria-hidden="true" />
                  Solicitar cotización
                </Button>
                <Button
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="whatsapp"
                  size="lg"
                  className="w-full sm:w-auto"
                >
                  <MessageCircle className="h-5 w-5" aria-hidden="true" />
                  WhatsApp
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-12 sm:py-16">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_0.85fr] lg:px-8">
          <div>
            <h2 className="font-display text-3xl font-black text-dark">Descripción técnica</h2>
            <p className="mt-4 leading-8 text-gray-text">{product.longDescription}</p>
            <div className="mt-6 rounded-md border border-border bg-background p-5">
              <h3 className="flex items-center gap-2 font-extrabold text-dark">
                <ShieldCheck className="h-5 w-5 text-primary" aria-hidden="true" />
                Compatibilidad
              </h3>
              <ul className="mt-3 grid gap-2 text-sm font-semibold text-gray-text">
                {product.compatibility.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="rounded-md border border-border bg-background p-5">
            <h2 className="font-display text-2xl font-black text-dark">Especificaciones</h2>
            <dl className="mt-5 grid gap-3">
              {product.specs.map((spec) => (
                <div
                  key={`${spec.label}-${spec.value}`}
                  className="flex items-center justify-between gap-4 border-b border-border pb-3 last:border-b-0"
                >
                  <dt className="text-sm font-bold text-gray-text">{spec.label}</dt>
                  <dd className="text-right text-sm font-extrabold text-dark">{spec.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <section className="bg-background py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-black text-dark">Productos relacionados</h2>
          <div className="mt-8">
            <ProductGrid products={relatedProducts} />
          </div>
        </div>
      </section>
    </>
  );
}
