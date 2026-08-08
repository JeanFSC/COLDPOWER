import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/types/product";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { Badge } from "@/components/shared/Badge";
import { Button } from "@/components/shared/Button";
import { formatProductPrice } from "@/lib/formatters";

type ProductCardProps = {
  product: Product;
};

const statusLabel: Record<Product["status"], string> = {
  "in-stock": "En stock",
  "low-stock": "Stock bajo",
  "on-request": "Bajo pedido",
  "out-of-stock": "Sin stock",
};

const statusVariant: Record<Product["status"], "stock" | "warning" | "neutral" | "danger"> = {
  "in-stock": "stock",
  "low-stock": "warning",
  "on-request": "neutral",
  "out-of-stock": "danger",
};

export function ProductCard({ product }: ProductCardProps) {
  const productHref = `/producto/${product.slug}`;

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-md border border-border bg-white shadow-card transition hover:-translate-y-1 hover:shadow-hover">
      <Link
        href={productHref}
        className="relative block aspect-square overflow-hidden bg-background"
      >
        <Image
          src={product.images[0] ?? "/images/product-placeholder-repuesto.svg"}
          alt={product.name}
          fill
          sizes="(min-width: 1024px) 25vw, (min-width: 768px) 50vw, 100vw"
          className="object-cover transition duration-300 group-hover:scale-105"
        />
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          {product.onSale ? <Badge variant="offer">Oferta</Badge> : null}
          <Badge variant={statusVariant[product.status]}>{statusLabel[product.status]}</Badge>
        </div>
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
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-gray-text">
          Compatible con {product.compatibility.slice(0, 2).join(", ")}
        </p>
        <p className="mt-3 font-mono text-xs font-bold text-gray-text">SKU: {product.sku}</p>

        <div className="mt-4 flex items-end gap-2">
          <p
            className={
              product.price === null
                ? "font-display text-lg font-black text-gray-text"
                : "font-display text-2xl font-black text-dark"
            }
          >
            {formatProductPrice(product.price)}
          </p>
          {product.oldPrice ? (
            <p className="pb-1 text-sm font-semibold text-gray-text line-through">
              {formatProductPrice(product.oldPrice)}
            </p>
          ) : null}
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <Button href={productHref} variant="outline" size="sm" className="w-full">
            Ver detalle
          </Button>
          <AddToCartButton productId={product.id} className="w-full" />
        </div>
      </div>
    </article>
  );
}
