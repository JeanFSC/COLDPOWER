"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Product } from "@/types/product";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { AddToQuoteButton } from "@/components/cart/AddToQuoteButton";
import { CompareToggle } from "@/components/catalog/CompareToggle";
import { ProductMedia } from "@/components/catalog/ProductMedia";
import { Button } from "@/components/shared/Button";
import { formatProductPrice } from "@/lib/formatters";

type HomeProductCardProps = { product: Product; priority?: boolean };

function availabilityLabel(product: Product) {
  switch (product.availabilityStatus) {
    case "in_stock":
      return "Disponible";
    case "low_stock":
      return "Disponibilidad limitada";
    case "out_of_stock":
      return "No disponible";
    case "on_request":
      return "Bajo consulta";
    default:
      return product.status === "in-stock"
        ? "Disponible"
        : product.status === "low-stock"
          ? "Disponibilidad limitada"
          : "Consultar disponibilidad";
  }
}

export function HomeProductCard({ product, priority = false }: HomeProductCardProps) {
  const productHref = "/producto/" + product.slug;
  const criticalSpec = product.specs.find((spec) => spec.label && spec.value);
  const availability = availabilityLabel(product);
  const isUnavailable =
    product.availabilityStatus === "out_of_stock" || product.status === "out-of-stock";

  return (
    <article className="group flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-white transition hover:-translate-y-0.5 hover:border-brand-secondary-600 hover:shadow-card">
      <div className="relative">
        <Link
          href={productHref}
          prefetch={false}
          className="block"
          aria-label={"Ver " + product.name}
        >
          <ProductMedia
            product={product}
            priority={priority}
            sizes="(min-width: 1280px) 16vw, (min-width: 640px) 45vw, 90vw"
            className="rounded-t-xl"
          />
        </Link>
        <div className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-extrabold text-brand-primary-900 shadow-card">
          {availability}
        </div>
        <div className="absolute right-3 top-3">
          <CompareToggle productId={product.id} />
        </div>
      </div>
      <div className="flex flex-1 flex-col p-3.5">
        {product.brand ? (
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-brand-secondary-600">
            {product.brand}
          </p>
        ) : null}
        <h3 className="mt-2 line-clamp-2 min-h-10 text-sm font-extrabold leading-5 text-dark">
          <Link href={productHref} prefetch={false} className="hover:text-brand-secondary-600">
            {product.name}
          </Link>
        </h3>
        <p className="mt-2 truncate font-mono text-[10px] font-semibold text-text-secondary">
          SKU: {product.sku}
        </p>
        {criticalSpec ? (
          <p className="mt-3 truncate border-t border-border pt-3 text-xs text-text-secondary">
            <span className="font-bold text-dark">{criticalSpec.label}:</span> {criticalSpec.value}
          </p>
        ) : (
          <div className="mt-3 h-[29px] border-t border-border" />
        )}
        <div className="mt-auto pt-4">
          <p
            className={
              product.price === null
                ? "text-sm font-bold text-text-secondary"
                : "font-display text-lg font-black text-dark"
            }
          >
            {product.price === null
              ? "Consultar precio"
              : formatProductPrice(product.price, product.priceCurrency ?? "PEN")}
          </p>
          <div className="mt-3 grid gap-2">
            <Button href={productHref} variant="outline" size="sm" className="w-full">
              <span>Ver ficha</span>
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
            {!isUnavailable && product.price !== null ? (
              <AddToCartButton
                productId={product.id}
                purchasable
                label="Agregar"
                className="w-full"
              />
            ) : null}
            <AddToQuoteButton
              productId={product.id}
              label="Solicitar cotización"
              variant={product.price === null ? "primary" : "outline"}
              className="w-full"
            />
          </div>
        </div>
      </div>
    </article>
  );
}
