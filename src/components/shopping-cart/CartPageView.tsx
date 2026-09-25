"use client";

import Image from "next/image";
import Link from "next/link";
import { AlertTriangle, ArrowRight, LoaderCircle, Lock, Minus, Plus, ShoppingCart, Trash2, Truck } from "lucide-react";
import { Button } from "@/components/shared/Button";
import { useCart as useQuoteList } from "@/components/cart/CartProvider";
import { useShoppingCart } from "@/components/shopping-cart/ShoppingCartProvider";
import { formatProductPrice } from "@/lib/formatters";
import { resolveProductImage } from "@/lib/product-image";

const issueMessages = {
  UNAVAILABLE_ITEMS: "Hay referencias que ya no están disponibles en el catálogo. Quítalas para continuar.",
  QUOTE_ONLY_ITEMS: "Hay referencias que requieren cotización. Muévelas para continuar con la compra.",
  MIXED_CURRENCY: "El carrito tiene productos en monedas distintas. Deja una sola moneda para pagar.",
} as const;

export function CartPageView() {
  const { cart, status, pendingProductId, error, setQuantity, removeItem, clear, refresh, dismissError } = useShoppingCart();
  const { addItem: addToQuote } = useQuoteList();

  if (status === "loading") return <div className="flex items-center gap-2 rounded-lg border border-border bg-white p-6 text-sm text-gray-text shadow-card" role="status"><LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />Cargando tu carrito…</div>;
  if (status === "error" && cart.items.length === 0) return <div className="rounded-lg border border-danger/25 bg-danger/5 p-6 text-sm text-danger" role="alert">No pudimos cargar tu carrito.<button type="button" className="ml-2 font-extrabold underline" onClick={() => void refresh()}>Reintentar</button></div>;
  if (cart.items.length === 0) {
    return (
      <section className="rounded-lg border border-border bg-white p-6 shadow-card sm:p-8">
        <ShoppingCart className="h-9 w-9 text-brand-secondary-600" aria-hidden="true" />
        <h2 className="mt-4 font-display text-2xl font-black text-dark">Tu carrito está vacío</h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-gray-text">Agrega productos con precio publicado para comprarlos en línea. Las referencias cotizables se guardan en la lista de cotización.</p>
        <div className="mt-5 flex flex-wrap gap-3"><Button href="/catalogo" variant="primary">Ver catálogo</Button><Button href="/cotizacion" variant="outline">Ir a cotización</Button></div>
      </section>
    );
  }

  const purchasableItems = cart.items.filter((item) => item.available && item.purchasable && item.unitPrice !== null && item.lineTotal !== null);
  const quoteOnlyItems = cart.items.filter((item) => !item.purchasable || !item.available);
  const currency = cart.currency ?? purchasableItems[0]?.currency ?? "PEN";
  const purchaseQuantity = purchasableItems.reduce((sum, item) => sum + item.quantity, 0);
  const purchaseSubtotal = purchasableItems.reduce((sum, item) => sum + Number(item.lineTotal ?? 0), 0);

  async function moveToQuote(productId: string, quantity: number) {
    await addToQuote(productId, quantity);
    await removeItem(productId);
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
      <section className="min-w-0" aria-label="Productos con precio en el carrito">
        {error ? <div className="mb-4 flex items-start justify-between gap-3 rounded-md border border-danger/25 bg-danger/5 px-4 py-3 text-sm font-semibold text-danger" role="alert"><span>{error}</span><button type="button" className="shrink-0 font-extrabold underline" onClick={dismissError}>Cerrar</button></div> : null}
        {cart.issues.map((issue) => <div key={issue} className="mb-4 flex items-start gap-3 rounded-md border border-warning/30 bg-warning/10 px-4 py-3 text-sm font-semibold text-warning-dark" role="status"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{issueMessages[issue]}</div>)}

        {purchasableItems.length > 0 ? (
          <ul className="grid gap-4">
            {purchasableItems.map((item) => {
              const busy = pendingProductId === item.productId;
              const media = resolveProductImage({ images: item.image ? [item.image] : [], family: item.family, category: item.category });
              return (
                <li key={item.productId} className="grid grid-cols-[80px_minmax(0,1fr)] gap-4 rounded-lg border border-border bg-white p-4 shadow-card sm:grid-cols-[96px_minmax(0,1fr)_auto]">
                  <div className="relative aspect-square overflow-hidden rounded-md bg-background"><Image src={media.src} alt={item.name} fill sizes="96px" className="object-contain p-2" />{media.isReference ? <span className="absolute inset-x-1 bottom-1 truncate rounded bg-brand-primary-900/85 px-1 py-0.5 text-center text-[8px] font-bold text-white">Imagen referencial</span> : null}</div>
                  <div className="min-w-0">
                    {item.slug ? <Link href={`/producto/${item.slug}`} className="font-extrabold text-dark hover:text-brand-secondary-600">{item.name}</Link> : <p className="font-extrabold text-dark">{item.name}</p>}
                    <p className="mt-1 font-mono text-[11px] font-bold text-gray-text">{item.sku ? `SKU: ${item.sku}` : "Referencia retirada"}{item.brand ? ` · ${item.brand}` : ""}</p>
                    <p className="mt-2 text-sm font-bold text-dark">{formatProductPrice(Number(item.unitPrice), item.currency ?? currency)} c/u</p>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <div className="inline-flex h-10 items-center rounded-pill border border-border bg-white">
                        <button type="button" className="h-10 w-10 disabled:opacity-40" disabled={busy || item.quantity <= 1} aria-label={`Reducir ${item.name}`} onClick={() => void setQuantity(item.productId, item.quantity - 1)}><Minus className="mx-auto h-4 w-4" /></button>
                        <span className="min-w-9 text-center text-sm font-black text-dark" aria-live="polite">{busy ? <LoaderCircle className="mx-auto h-4 w-4 animate-spin" aria-label="Actualizando" /> : item.quantity}</span>
                        <button type="button" className="h-10 w-10 disabled:opacity-40" disabled={busy || item.quantity >= 999} aria-label={`Aumentar ${item.name}`} onClick={() => void setQuantity(item.productId, item.quantity + 1)}><Plus className="mx-auto h-4 w-4" /></button>
                      </div>
                      <button type="button" className="inline-flex h-10 items-center gap-1.5 rounded-pill px-3 text-sm font-bold text-gray-text hover:text-danger disabled:opacity-40" disabled={busy} onClick={() => void removeItem(item.productId)}><Trash2 className="h-4 w-4" aria-hidden="true" />Quitar</button>
                    </div>
                  </div>
                  <p className="col-span-2 text-right font-display text-lg font-black text-dark sm:col-span-1">{formatProductPrice(Number(item.lineTotal), item.currency ?? currency)}</p>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="rounded-lg border border-dashed border-border bg-white p-6 text-sm text-gray-text"><ShoppingCart className="h-8 w-8 text-brand-secondary-600" aria-hidden="true" /><h2 className="mt-3 font-display text-xl font-black text-dark">No hay productos listos para compra</h2><p className="mt-2 leading-6">Mueve las referencias cotizables a la lista de cotización para continuar.</p></div>
        )}

        {quoteOnlyItems.length > 0 ? (
          <section className="mt-6 rounded-lg border border-warning/30 bg-warning/10 p-5" aria-labelledby="quote-only-title">
            <h2 id="quote-only-title" className="font-display text-xl font-black text-dark">Referencias para cotizar</h2>
            <ul className="mt-4 grid gap-3">
              {quoteOnlyItems.map((item) => <li key={item.productId} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-warning/20 bg-white/80 p-3"><div><p className="font-bold text-dark">{item.name}</p><p className="mt-1 font-mono text-[11px] font-semibold text-gray-text">{item.sku ? `SKU: ${item.sku}` : "Referencia retirada"}</p></div>{item.available ? <button type="button" className="text-sm font-extrabold text-brand-secondary-600 hover:underline" onClick={() => void moveToQuote(item.productId, item.quantity)}>Pasar a cotización</button> : <span className="text-xs font-bold text-gray-text">Referencia no disponible</span>}</li>)}
            </ul>
          </section>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <Link href="/catalogo" className="text-sm font-extrabold text-brand-secondary-600 hover:underline">Seguir comprando</Link>
          <button type="button" className="text-sm font-bold text-gray-text hover:text-danger" onClick={() => { if (window.confirm("¿Vaciar el carrito de compra?")) void clear(); }}>Vaciar carrito</button>
        </div>
      </section>

      <aside className="cp-texture-dark h-fit rounded-lg border border-brand-primary-900 p-5 text-white shadow-float lg:sticky lg:top-28 max-lg:sticky max-lg:bottom-0 max-lg:z-20 sm:p-6" aria-label="Resumen de compra">
        <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-action-accent-500">Resumen</p>
        <dl className="mt-5 grid gap-3 text-sm">
          <div className="flex justify-between gap-4"><dt className="text-white/70">Productos ({purchaseQuantity} u.)</dt><dd className="font-bold">{formatProductPrice(purchaseSubtotal, currency)}</dd></div>
          <div className="flex justify-between gap-4"><dt className="flex items-center gap-1.5 text-white/70"><Truck className="h-4 w-4" aria-hidden="true" />Envío: por coordinar</dt><dd className="font-bold">—</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-white/70">Op. gravada</dt><dd className="font-bold">{cart.tax.taxableOperation ? formatProductPrice(Number(cart.tax.taxableOperation), currency) : "Por configurar"}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-white/70">IGV 18%</dt><dd className="font-bold">{cart.tax.igv ? formatProductPrice(Number(cart.tax.igv), currency) : "Por configurar"}</dd></div>
        </dl>
        <div className="mt-5 flex items-end justify-between border-t border-white/15 pt-4"><span className="text-sm text-white/70">Subtotal</span><strong className="font-display text-3xl">{formatProductPrice(purchaseSubtotal, currency)}</strong></div>
        <p className="mt-2 text-xs leading-5 text-white/70">{cart.tax.status === "UNCONFIGURED" ? cart.tax.note : "El costo de envío se coordina después del pago; no se incluye en este subtotal."}</p>
        <Button href="/checkout" variant="primary" size="lg" className="mt-6 w-full" disabled={!cart.canCheckout || purchasableItems.length === 0}>Ir a pagar<ArrowRight className="h-5 w-5" aria-hidden="true" /></Button>
        <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-white/70"><Lock className="h-3.5 w-3.5" aria-hidden="true" />Para pagar te pediremos iniciar sesión.</p>
      </aside>
    </div>
  );
}
