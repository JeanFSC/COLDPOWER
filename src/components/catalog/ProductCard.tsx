import Link from "next/link";
import type { Product } from "@/types/product";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { AddToQuoteButton } from "@/components/cart/AddToQuoteButton";
import { CompareToggle } from "@/components/catalog/CompareToggle";
import { ProductMedia } from "@/components/catalog/ProductMedia";
import { Badge } from "@/components/shared/Badge";
import { formatProductPrice } from "@/lib/formatters";

type ProductCardProps = { product: Product };

const statusLabel: Record<Product["status"], string> = {
  "in-stock": "Disponible",
  "low-stock": "Stock limitado",
  "on-request": "Bajo consulta",
  "out-of-stock": "No disponible",
};

const statusVariant: Record<Product["status"], "stock" | "warning" | "neutral" | "danger"> = {
  "in-stock": "stock",
  "low-stock": "warning",
  "on-request": "neutral",
  "out-of-stock": "danger",
};

export function ProductCard({ product }: ProductCardProps) {
  const productHref = "/producto/" + product.slug;
  const criticalSpec = product.specs.find((spec) => spec.label && spec.value);
  const isPurchasable = product.price !== null && product.status !== "out-of-stock";

  return (
    <article className="group flex h-full min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-white transition hover:-translate-y-0.5 hover:border-brand-secondary-600 hover:shadow-card">
      <div className="relative">
        <Link href={productHref} prefetch={false} className="block" aria-label="Abrir ficha del producto">
          <ProductMedia product={product} />
          <div className="absolute left-3 top-3 z-10"><Badge variant={statusVariant[product.status]}>{statusLabel[product.status]}</Badge></div>
        </Link>
        <div className="absolute bottom-3 right-3 z-10"><CompareToggle productId={product.id} /></div>
      </div>
      <div className="flex flex-1 flex-col p-3.5">
        <Link href={productHref} prefetch={false} className="flex flex-1 flex-col" aria-label="Abrir ficha del producto">
          {product.brand ? <p className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-brand-secondary-600">{product.brand}</p> : null}
          <h3 className="mt-2 line-clamp-3 text-sm font-extrabold leading-5 text-dark group-hover:text-brand-secondary-600">{product.name}</h3>
          <p className="mt-2 font-mono text-[10px] font-semibold text-text-secondary">SKU: {product.sku}</p>
          {criticalSpec ? <span className="mt-3 inline-flex w-fit max-w-full truncate rounded-pill border border-brand-secondary-600/20 bg-brand-secondary-600/5 px-2.5 py-1 text-[11px] font-bold text-brand-primary-900">{criticalSpec.label}: {criticalSpec.value}</span> : null}
          <div className="mt-auto pt-4">
            <p className={product.price === null ? "text-sm font-bold text-text-secondary" : "font-display text-lg font-black text-dark"}>{product.price === null ? "Precio bajo cotización" : formatProductPrice(product.price, product.priceCurrency ?? "PEN")}</p>
          </div>
        </Link>
        <div className="mt-3">
          {isPurchasable ? <AddToCartButton productId={product.id} purchasable label="Agregar al carrito" className="w-full" /> : <AddToQuoteButton productId={product.id} label="Cotizar" variant="primary" className="w-full" />}
        </div>
      </div>
    </article>
  );
}
