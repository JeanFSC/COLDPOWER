"use client";

import { CalendarClock, MessageCircle, PackageCheck, Truck } from "lucide-react";
import { useEffect, useState } from "react";
import type { Product } from "@/types/product";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { AddToQuoteButton } from "@/components/cart/AddToQuoteButton";
import { formatProductPrice } from "@/lib/formatters";
import { trackCatalogEvent } from "@/lib/analytics";
import { WhatsAppLeadButton } from "@/components/shared/WhatsAppLeadButton";
import type { RetailPriceWithPromotion } from "@/lib/retail-price";

type TransactionBoxProps = { product: Product; promotionalPrice?: RetailPriceWithPromotion | null };

const availabilityLabel: Record<Product["status"], string> = {
  "in-stock": "Disponible para compra",
  "low-stock": "Disponibilidad limitada",
  "on-request": "Disponible bajo consulta",
  "out-of-stock": "No disponible",
};

export function TransactionBox({ product, promotionalPrice }: TransactionBoxProps) {
  const hasPrice = product.price !== null;
  const quoteOnly = !hasPrice || product.status === "on-request";
  const hasPromotion = Boolean(!quoteOnly && promotionalPrice?.promotionIds.length && promotionalPrice.amount !== promotionalPrice.baseAmount);
  const purchasable = hasPrice && product.status !== "out-of-stock" && !quoteOnly;
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    trackCatalogEvent("product_viewed", { productId: product.id, sku: product.sku });
  }, [product.id, product.sku]);

  return (
    <aside className="rounded-lg border border-border bg-white p-5 shadow-card sm:p-6" aria-label={quoteOnly ? "Producto solo cotizable" : "Comprar o cotizar"}>
      <p className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-brand-secondary-600">{quoteOnly ? "Bajo consulta" : "Compra online o cotiza"}</p>
      {quoteOnly ? <p className="mt-3 text-xl font-black text-dark">Precio por cotización</p> : <div className="mt-3">{hasPromotion ? <p className="text-sm font-bold text-text-secondary line-through">{formatProductPrice(Number(promotionalPrice!.baseAmount), promotionalPrice!.currency)}</p> : null}<p className="font-display text-3xl font-black text-dark">{formatProductPrice(hasPromotion ? Number(promotionalPrice!.amount) : product.price, hasPromotion ? promotionalPrice!.currency : product.priceCurrency ?? "PEN")}</p>{hasPromotion ? <p className="mt-1 text-xs font-extrabold uppercase tracking-[0.08em] text-brand-secondary-600">Precio promocional vigente</p> : null}</div>}
      <p className="mt-2 text-sm leading-6 text-text-secondary">
        {quoteOnly ? "Precio y disponibilidad se confirman al cotizar." : "Precio publicado en el catálogo. El envío se coordina aparte y la disponibilidad se valida al pagar."}
      </p>
      <div className="mt-5 space-y-3 border-y border-border py-4 text-sm font-semibold text-text-secondary">
        {!quoteOnly ? <p className="flex items-start gap-3"><PackageCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-secondary-600" aria-hidden="true" />{availabilityLabel[product.status]}</p> : null}
        <p className="flex items-start gap-3"><Truck className="mt-0.5 h-4 w-4 shrink-0 text-brand-secondary-600" aria-hidden="true" />Envío: por coordinar</p>
        <p className="flex items-start gap-3"><CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-brand-secondary-600" aria-hidden="true" />Respuesta comercial en horario de atención.</p>
      </div>
      <div className="mt-5 flex items-center justify-between gap-4">
        <label htmlFor="product-quantity" className="text-sm font-extrabold text-dark">Cantidad</label>
        <input id="product-quantity" type="number" min={1} max={99} step={1} value={quantity} onChange={(event) => setQuantity(Math.min(99, Math.max(1, Number.parseInt(event.target.value, 10) || 1)))} className="h-11 w-24 rounded-md border border-border bg-background px-3 text-center text-sm font-bold text-dark outline-primary" inputMode="numeric" />
      </div>
      <div className="mt-5 grid gap-3">
        {!quoteOnly ? (
          <>
            <AddToCartButton productId={product.id} quantity={quantity} purchasable={purchasable} size="lg" label="Agregar al carrito" disabledLabel="No disponible" className="w-full" />
            <AddToQuoteButton productId={product.id} quantity={quantity} label="Cotizar" size="lg" variant="outline" className="w-full" />
          </>
        ) : (
          <>
            <AddToQuoteButton productId={product.id} quantity={quantity} label="Solicitar cotización" size="lg" variant="primary" className="w-full" />
            <AddToCartButton productId={product.id} purchasable={false} size="md" disabledLabel="Solo cotizable" className="w-full" />
          </>
        )}
        <WhatsAppLeadButton
          title={`Consulta por ${product.name}`}
          productIds={[product.id]}
          items={[{ name: product.name, sku: product.sku, quantity, url: `/producto/${product.slug}` }]}
          className="w-full"
        >
          <MessageCircle className="h-5 w-5" aria-hidden="true" />Consultar por WhatsApp
        </WhatsAppLeadButton>
      </div>
      <p className="mt-4 text-center text-xs leading-5 text-text-secondary">{!quoteOnly ? "Para pagar necesitas iniciar sesión. Cotizar no requiere cuenta." : "No necesitas iniciar sesión para solicitar una cotización."}</p>
    </aside>
  );
}
