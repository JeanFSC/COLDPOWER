"use client";

import { CalendarClock, PackageCheck, Truck } from "lucide-react";
import { useEffect } from "react";
import type { Product } from "@/types/product";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { AddToQuoteButton } from "@/components/cart/AddToQuoteButton";
import { formatProductPrice } from "@/lib/formatters";
import { trackCatalogEvent } from "@/lib/analytics";

type TransactionBoxProps = { product: Product };

const availabilityLabel: Record<Product["status"], string> = {
  "in-stock": "Disponible para compra",
  "low-stock": "Disponibilidad limitada",
  "on-request": "Disponible bajo consulta",
  "out-of-stock": "No disponible",
};

export function TransactionBox({ product }: TransactionBoxProps) {
  const hasPrice = product.price !== null;
  const purchasable = hasPrice && product.status !== "out-of-stock";

  useEffect(() => {
    trackCatalogEvent("product_viewed", { productId: product.id, sku: product.sku });
  }, [product.id, product.sku]);

  return (
    <aside className="rounded-lg border border-border bg-white p-5 shadow-card sm:p-6" aria-label={hasPrice ? "Comprar o cotizar" : "Producto solo cotizable"}>
      <p className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-brand-secondary-600">{hasPrice ? "Compra online o cotiza" : "Solo cotizable"}</p>
      {hasPrice ? <p className="mt-3 font-display text-3xl font-black text-dark">{formatProductPrice(product.price, product.priceCurrency ?? "PEN")}</p> : <p className="mt-3 text-xl font-black text-dark">Precio por cotización</p>}
      <p className="mt-2 text-sm leading-6 text-text-secondary">
        {hasPrice ? "Precio publicado en el catálogo. El envío se coordina aparte y la disponibilidad se valida al pagar." : "Un asesor confirma el precio, la disponibilidad y la compatibilidad en tu cotización."}
      </p>
      <div className="mt-5 space-y-3 border-y border-border py-4 text-sm font-semibold text-text-secondary">
        <p className="flex items-start gap-3"><PackageCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-secondary-600" aria-hidden="true" />{availabilityLabel[product.status]}</p>
        <p className="flex items-start gap-3"><Truck className="mt-0.5 h-4 w-4 shrink-0 text-brand-secondary-600" aria-hidden="true" />Envío: por coordinar</p>
        <p className="flex items-start gap-3"><CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-brand-secondary-600" aria-hidden="true" />Respuesta comercial en horario de atención.</p>
      </div>
      <div className="mt-5 grid gap-3">
        {hasPrice ? (
          <>
            <AddToCartButton productId={product.id} purchasable={purchasable} size="lg" label="Agregar al carrito" disabledLabel="No disponible" className="w-full" />
            <AddToQuoteButton productId={product.id} label="Cotizar" size="lg" variant="outline" className="w-full" />
          </>
        ) : (
          <>
            <AddToQuoteButton productId={product.id} label="Solicitar cotización" size="lg" variant="primary" className="w-full" />
            <AddToCartButton productId={product.id} purchasable={false} size="md" className="w-full" />
          </>
        )}
      </div>
      <p className="mt-4 text-center text-xs leading-5 text-text-secondary">{hasPrice ? "Para pagar necesitas iniciar sesión. Cotizar no requiere cuenta." : "No necesitas iniciar sesión para solicitar una cotización."}</p>
    </aside>
  );
}
