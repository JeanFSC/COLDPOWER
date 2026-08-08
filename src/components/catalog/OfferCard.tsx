import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/types/product";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { Button } from "@/components/shared/Button";
import { formatCurrencyPEN } from "@/lib/formatters";

type OfferCardProps = {
  product: Product;
  badgeLabel?: string;
  priceLabel?: string;
  disclaimer?: string;
};

export function OfferCard({
  product,
  badgeLabel = "Oferta exclusiva",
  priceLabel = "Precio oferta",
  disclaimer = "Precio promocional sujeto a confirmacion por un asesor.",
}: OfferCardProps) {
  const productHref = `/producto/${product.slug}`;

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-md border border-border bg-white shadow-card transition hover:-translate-y-1 hover:shadow-hover">
      <span className="absolute left-3 top-3 z-10 inline-flex items-center rounded-pill bg-warning px-3 py-1 text-[11px] font-extrabold uppercase tracking-wide text-dark shadow-card">
        {badgeLabel}
      </span>
      {product.discount ? (
        <span className="absolute right-3 top-3 z-10 inline-flex items-center rounded-pill bg-primary px-2.5 py-1 text-xs font-black text-white shadow-card">
          -{product.discount}%
        </span>
      ) : null}

      <Link href={productHref} className="relative block aspect-square overflow-hidden bg-background">
        <Image
          src={product.images[0] ?? "/images/product-repuesto.jpg"}
          alt={product.name}
          fill
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover transition duration-300 group-hover:scale-105"
        />
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-primary">
          {product.brand}
        </p>
        <h3 className="mt-2 min-h-12 text-base font-extrabold leading-6 text-dark">
          <Link href={productHref} className="hover:text-primary">
            {product.name}
          </Link>
        </h3>

        <div className="mt-3 rounded-md border border-primary/20 bg-primary/10 px-3 py-2.5">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-primary">
            {priceLabel}
          </p>
          <div className="flex items-end gap-2">
            <p className="font-display text-2xl font-black leading-none text-dark">
              {formatCurrencyPEN(product.price)}
            </p>
            {product.oldPrice ? (
              <p className="pb-0.5 text-sm font-semibold text-gray-text line-through">
                {formatCurrencyPEN(product.oldPrice)}
              </p>
            ) : null}
          </div>
        </div>

        <p className="mt-3 font-mono text-xs font-bold text-gray-text">SKU: {product.sku}</p>
        <p className="mt-1 text-[11px] leading-5 text-gray-text">{disclaimer}</p>

        <div className="mt-auto grid gap-2 pt-4 sm:grid-cols-2">
          <Button href={productHref} variant="outline" size="sm" className="w-full">
            Ver detalle
          </Button>
          <AddToCartButton productId={product.id} className="w-full" />
        </div>
      </div>
    </article>
  );
}
