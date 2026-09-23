"use client";

import Image from "next/image";
import Link from "next/link";
import { AlertTriangle, ArrowRight, LoaderCircle, Lock, Minus, Plus, ShoppingCart, Trash2, Truck } from "lucide-react";
import { Button } from "@/components/shared/Button";
import { useCart as useQuoteList } from "@/components/cart/CartProvider";
import { useShoppingCart } from "@/components/shopping-cart/ShoppingCartProvider";
import { formatProductPrice } from "@/lib/formatters";

const issueMessages = {
  UNAVAILABLE_ITEMS: "Hay productos que ya no están disponibles en el catálogo. Quítalos para continuar.",
  QUOTE_ONLY_ITEMS: "Hay productos que perdieron su precio publicado. Pásalos a cotización para continuar.",
  MIXED_CURRENCY: "El carrito tiene productos en monedas distintas. Deja una sola moneda para pagar.",
} as const;

export function CartPageView() {
  const { cart, status, pendingProductId, error, setQuantity, removeItem, clear, refresh, dismissError } = useShoppingCart();
  const { addItem: addToQuote } = useQuoteList();

  if (status === "loading") {
    return <div className="flex items-center gap-2 rounded-lg border border-border bg-white p-6 text-sm text-gray-text shadow-card" role="status"><LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />Cargando tu carrito…</div>;
  }
  if (status === "error" && cart.items.length === 0) {
    return (
      <div className="rounded-lg border border-danger/25 bg-danger/5 p-6 text-sm text-danger" role="alert">
        No pudimos cargar tu carrito.
        <button type="button" className="ml-2 font-extrabold underline" onClick={() => void refresh()}>Reintentar</button>
      </div>
    );
  }
  if (cart.items.length === 0) {
    return (
      <section className="rounded-lg border border-border bg-white p-6 shadow-card sm:p-8">
        <ShoppingCart className="h-9 w-9 text-primary" aria-hidden="true" />
        <h2 className="mt-4 font-display text-2xl font-black text-dark">Tu carrito está vacío</h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-gray-text">Agrega productos con precio publicado para comprarlos en línea. Si un producto no tiene precio, puedes pedirlo por cotización.</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button href="/catalogo" variant="primary">Ver catálogo</Button>
          <Button href="/cotizacion" variant="outline">Ir a cotización</Button>
        </div>
      </section>
    );
  }

  const currency = cart.currency ?? "PEN";
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
      <section className="min-w-0" aria-label="Productos en el carrito">
        {error ? (
          <div className="mb-4 flex items-start justify-between gap-3 rounded-md border border-danger/25 bg-danger/5 px-4 py-3 text-sm font-semibold text-danger" role="alert">
            <span>{error}</span>
            <button type="button" className="shrink-0 font-extrabold underline" onClick={dismissError}>Cerrar</button>
          </div>
        ) : null}
        {cart.issues.map((issue) => (
          <div key={issue} className="mb-4 flex items-start gap-3 rounded-md border border-warning/30 bg-warning/10 px-4 py-3 text-sm font-semibold text-dark" role="status">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
            {issueMessages[issue]}
          </div>
        ))}
        <ul className="grid gap-4">
          {cart.items.map((item) => {
            const busy = pendingProductId === item.productId;
            return (
              <li key={item.productId} className="grid grid-cols-[80px_minmax(0,1fr)] gap-4 rounded-lg border border-border bg-white p-4 shadow-card sm:grid-cols-[96px_minmax(0,1fr)_auto]">
                <div className="relative aspect-square overflow-hidden rounded-md bg-background">
                  <Image src={item.image ?? "/images/product-placeholder-repuesto.svg"} alt={item.name} fill sizes="96px" className="object-cover" />
                </div>
                <div className="min-w-0">
                  {item.slug ? <Link href={`/producto/${item.slug}`} className="font-extrabold text-dark hover:text-primary">{item.name}</Link> : <p className="font-extrabold text-dark">{item.name}</p>}
                  <p className="mt-1 font-mono text-[11px] font-bold text-gray-text">{item.sku ? `SKU: ${item.sku}` : "Referencia retirada"}{item.brand ? ` · ${item.brand}` : ""}</p>
                  <p className="mt-2 text-sm font-bold text-dark">{item.unitPrice ? `${formatProductPrice(Number(item.unitPrice), item.currency ?? currency)} c/u` : <span className="text-warning">Sin precio publicado</span>}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <div className="inline-flex h-10 items-center rounded-pill border border-border bg-white">
                      <button type="button" className="h-10 w-10 disabled:opacity-40" disabled={busy || item.quantity <= 1 || !item.purchasable} aria-label={`Reducir ${item.name}`} onClick={() => void setQuantity(item.productId, item.quantity - 1)}><Minus className="mx-auto h-4 w-4" /></button>
                      <span className="min-w-9 text-center text-sm font-black text-dark" aria-live="polite">{busy ? <LoaderCircle className="mx-auto h-4 w-4 animate-spin" aria-label="Actualizando" /> : item.quantity}</span>
                      <button type="button" className="h-10 w-10 disabled:opacity-40" disabled={busy || item.quantity >= 999 || !item.purchasable} aria-label={`Aumentar ${item.name}`} onClick={() => void setQuantity(item.productId, item.quantity + 1)}><Plus className="mx-auto h-4 w-4" /></button>
                    </div>
                    {item.available && !item.purchasable ? (
                      <button type="button" className="text-sm font-extrabold text-primary hover:underline" onClick={async () => { addToQuote(item.productId, item.quantity); await removeItem(item.productId); }}>Pasar a cotización</button>
                    ) : null}
                    <button type="button" className="inline-flex h-10 items-center gap-1.5 rounded-pill px-3 text-sm font-bold text-gray-text hover:text-danger disabled:opacity-40" disabled={busy} onClick={() => void removeItem(item.productId)}><Trash2 className="h-4 w-4" aria-hidden="true" />Quitar</button>
                  </div>
                </div>
                <p className="col-span-2 text-right font-display text-lg font-black text-dark sm:col-span-1">{item.lineTotal ? formatProductPrice(Number(item.lineTotal), item.currency ?? currency) : "—"}</p>
              </li>
            );
          })}
        </ul>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <Link href="/catalogo" className="text-sm font-extrabold text-primary hover:underline">Seguir comprando</Link>
          <button type="button" className="text-sm font-bold text-gray-text hover:text-danger" onClick={() => void clear()}>Vaciar carrito</button>
        </div>
      </section>

      <aside className="h-fit rounded-lg border border-border bg-dark p-5 text-white shadow-float sm:p-6 lg:sticky lg:top-28" aria-label="Resumen de compra">
        <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-primary">Resumen</p>
        <dl className="mt-5 grid gap-3 text-sm">
          <div className="flex justify-between gap-4"><dt className="text-gray-light">Productos ({cart.totalQuantity} u.)</dt><dd className="font-bold">{cart.subtotal ? formatProductPrice(Number(cart.subtotal), currency) : "—"}</dd></div>
          <div className="flex justify-between gap-4"><dt className="flex items-center gap-1.5 text-gray-light"><Truck className="h-4 w-4" aria-hidden="true" />Envío</dt><dd className="font-bold">Por coordinar</dd></div>
        </dl>
        <div className="mt-5 flex items-end justify-between border-t border-white/10 pt-4">
          <span className="text-sm text-gray-light">Total a pagar</span>
          <strong className="font-display text-3xl">{cart.subtotal ? formatProductPrice(Number(cart.subtotal), currency) : "—"}</strong>
        </div>
        <p className="mt-2 text-xs leading-5 text-gray-light">El costo de envío se coordina después del pago; no se incluye en este total.</p>
        <Button href="/checkout" variant="primary" size="lg" className="mt-6 w-full" disabled={!cart.canCheckout}>Ir a pagar<ArrowRight className="h-5 w-5" aria-hidden="true" /></Button>
        <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-gray-light"><Lock className="h-3.5 w-3.5" aria-hidden="true" />Para pagar te pediremos iniciar sesión.</p>
      </aside>
    </div>
  );
}
