"use client";
import Link from "next/link";
import type { Product } from "@/types/product";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { CompareToggle } from "@/components/catalog/CompareToggle";
import { ProductMedia } from "@/components/catalog/ProductMedia";
import { Badge } from "@/components/shared/Badge";
import { Button } from "@/components/shared/Button";
import { formatProductPrice } from "@/lib/formatters";
import { trackCatalogEvent } from "@/lib/analytics";

type ProductCardProps = { product: Product };

const statusLabel: Record<Product["status"], string> = {
  "in-stock": "Disponible",
  "low-stock": "Stock limitado",
  "on-request": "Consultar disponibilidad",
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
  const trackOpen = () => trackCatalogEvent("search_result_clicked", { productId: product.id, sku: product.sku });
  const criticalSpecs = product.specs.filter((spec) => spec.label && spec.value).slice(0, 2);

  return (
    <article className="group flex h-full min-w-0 flex-col overflow-hidden rounded-md border border-border bg-white transition hover:-translate-y-0.5 hover:border-brand-secondary-600 hover:shadow-card">
      <div className="relative">
        <Link href={productHref} prefetch={false} onClick={trackOpen} className="block">
          <ProductMedia product={product} />
          <div className="absolute left-3 top-3 flex max-w-[calc(100%-3.5rem)] flex-wrap gap-1.5">
            <Badge variant={statusVariant[product.status]}>{statusLabel[product.status]}</Badge>
          </div>
        </Link>
        <div className="absolute right-3 top-3">
          <CompareToggle productId={product.id} />
        </div>
      </div>
      <div className="flex flex-1 flex-col p-3.5">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-brand-secondary-600">{product.brand}</p>
        <h3 className="mt-2 min-h-12 text-sm font-extrabold leading-5 text-dark">
          <Link href={productHref} prefetch={false} onClick={trackOpen} className="hover:text-brand-secondary-600">{product.name}</Link>
        </h3>
        <p className="mt-2 font-mono text-[11px] font-semibold text-text-secondary">SKU: {product.sku}</p>
        {criticalSpecs.length > 0 ? (
          <dl className="mt-3 grid gap-1.5 border-y border-border py-3 text-[11px]">
            {criticalSpecs.map((spec) => <div key={spec.label + spec.value} className="flex items-start justify-between gap-2"><dt className="text-text-secondary">{spec.label}</dt><dd className="text-right font-bold text-dark">{spec.value}</dd></div>)}
          </dl>
        ) : null}
        <div className="mt-auto pt-4">
          <p className={product.price === null ? "text-sm font-bold text-text-secondary" : "font-display text-lg font-black text-dark"}>
            {formatProductPrice(product.price, product.priceCurrency ?? "PEN")}
          </p>
          <div className="mt-4 grid gap-2">
            <Button href={productHref} variant="outline" size="sm" className="w-full" onClick={trackOpen}>Ver ficha técnica</Button>
            <AddToCartButton productId={product.id} label="Cotizar" className="w-full" />
          </div>
        </div>
      </div>
    </article>
  );
}
