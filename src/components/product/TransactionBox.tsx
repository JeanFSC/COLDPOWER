"use client";

import { CalendarClock, MessageCircle, PackageCheck, Truck } from "lucide-react";
import { useEffect } from "react";
import type { Product } from "@/types/product";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { WhatsAppLeadButton } from "@/components/shared/WhatsAppLeadButton";
import { Button } from "@/components/shared/Button";
import { formatProductPrice } from "@/lib/formatters";
import { trackCatalogEvent } from "@/lib/analytics";

type TransactionBoxProps = { product: Product };
const availabilityLabel: Record<Product["status"], string> = {
  "in-stock": "Disponible, sujeto a confirmacion",
  "low-stock": "Disponibilidad limitada, confirmar antes de reservar",
  "on-request": "Consultar disponibilidad con un asesor",
  "out-of-stock": "Sin disponibilidad confirmada, solicitar alternativa",
};

export function TransactionBox({ product }: TransactionBoxProps) {
  const quoteHref = "/cotizacion?producto=" + encodeURIComponent(product.slug) + "&sku=" + encodeURIComponent(product.sku);
  useEffect(() => {
    trackCatalogEvent("product_viewed", { productId: product.id, sku: product.sku });
  }, [product.id, product.sku]);

  return (
    <aside className="rounded-lg border border-border bg-white p-5 shadow-card sm:p-6" aria-label="Acciones de cotizacion">
      <p className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-brand-secondary-600">Cotiza esta referencia</p>
      <p className={product.price === null ? "mt-3 text-xl font-black text-dark" : "mt-3 font-display text-3xl font-black text-dark"}>
        {formatProductPrice(product.price, product.priceCurrency ?? "PEN")}
      </p>
      <p className="mt-2 text-sm leading-6 text-text-secondary">Precio final, stock y compatibilidad se confirman antes de cerrar la solicitud.</p>
      <div className="mt-5 space-y-3 border-y border-border py-4 text-sm font-semibold text-text-secondary">
        <p className="flex items-start gap-3"><PackageCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-secondary-600" aria-hidden="true" />{availabilityLabel[product.status]}</p>
        <p className="flex items-start gap-3"><Truck className="mt-0.5 h-4 w-4 shrink-0 text-brand-secondary-600" aria-hidden="true" />Coordinamos entrega segun cobertura y disponibilidad real.</p>
        <p className="flex items-start gap-3"><CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-brand-secondary-600" aria-hidden="true" />Respuesta comercial en horario de atencion.</p>
      </div>
      <div className="mt-5 grid gap-3">
        <div onClick={() => trackCatalogEvent("quote_item_added", { productId: product.id, sku: product.sku })}>
          <AddToCartButton productId={product.id} label="Agregar a cotizacion" size="lg" className="w-full" />
        </div>
        <Button href={quoteHref} variant="outline" size="lg" className="w-full"><PackageCheck className="h-5 w-5" aria-hidden="true" />Solicitar cotizacion</Button>
        <WhatsAppLeadButton title={"Consulta: " + product.name} productIds={[product.id]} items={[{ name: product.name, sku: product.sku, quantity: 1 }]} size="lg" className="w-full">
          <MessageCircle className="h-5 w-5" aria-hidden="true" />Consultar por WhatsApp
        </WhatsAppLeadButton>
      </div>
      <p className="mt-4 text-center text-xs leading-5 text-text-secondary">No necesitas iniciar sesion para solicitar una cotizacion.</p>
    </aside>
  );
}
