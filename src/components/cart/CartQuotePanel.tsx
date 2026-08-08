"use client";

import Image from "next/image";
import Link from "next/link";
import { CreditCard, Minus, Plus, Trash2, MessageCircle } from "lucide-react";
import { products } from "@/data/products";
import { company } from "@/data/company";
import { buildCartQuoteMessage } from "@/lib/cart";
import { formatCurrencyPEN } from "@/lib/formatters";
import { createWhatsAppLink } from "@/lib/whatsapp";
import { Button } from "@/components/shared/Button";
import { useCart } from "@/components/cart/CartProvider";

export function CartQuotePanel() {
  const { items, totalQuantity, updateQuantity, removeItem, clearCart } = useCart();
  const resolvedItems = items.flatMap((item) => {
    const product = products.find((candidate) => candidate.id === item.productId);
    return product ? [{ ...item, product }] : [];
  });
  const subtotal = resolvedItems.reduce(
    (total, item) => total + (item.product.price ?? 0) * item.quantity,
    0,
  );
  const hasUnpricedItems = resolvedItems.some((item) => item.product.price === null);
  const whatsappHref = createWhatsAppLink({
    phone: company.whatsapp,
    message: buildCartQuoteMessage(
      resolvedItems.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        name: item.product.name,
        sku: item.product.sku,
        price: item.product.price ?? undefined,
      })),
    ),
  });

  return (
    <aside className="w-full min-w-0 max-w-full overflow-hidden rounded-lg border border-border bg-white p-5 shadow-card sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-primary">
            Carrito
          </p>
          <h2 className="mt-2 font-display text-2xl font-black tracking-normal text-dark">
            Productos para cotizar
          </h2>
        </div>
        <span className="shrink-0 rounded-pill bg-background px-3 py-1 text-xs font-black text-dark">
          {totalQuantity}
        </span>
      </div>

      {resolvedItems.length === 0 ? (
        <div className="mt-5 rounded-md border border-dashed border-border bg-background p-4 text-sm leading-6 text-gray-text">
          <p className="font-extrabold text-dark">Tu carrito está vacío.</p>
          <p className="mt-1">Agrega productos desde el catálogo para cotizarlos juntos.</p>
          <Button href="/catalogo" variant="outline" size="sm" className="mt-4">
            Ver catálogo
          </Button>
        </div>
      ) : (
        <>
          <div className="mt-5 grid gap-4">
            {resolvedItems.map((item) => (
              <article
                key={item.productId}
                className="grid grid-cols-[64px_minmax(0,1fr)] gap-3 rounded-md border border-border bg-background p-3 sm:grid-cols-[72px_minmax(0,1fr)]"
              >
                <Link
                  href={`/producto/${item.product.slug}`}
                  className="relative aspect-square overflow-hidden rounded-md bg-white"
                >
                  <Image
                    src={item.product.images[0] ?? "/images/product-placeholder-repuesto.svg"}
                    alt={item.product.name}
                    fill
                    sizes="72px"
                    className="object-cover"
                  />
                </Link>

                <div className="min-w-0">
                  <Link
                    href={`/producto/${item.product.slug}`}
                    className="line-clamp-2 break-words text-sm font-extrabold leading-5 text-dark hover:text-primary"
                  >
                    {item.product.name}
                  </Link>
                  <p className="mt-1 font-mono text-[11px] font-bold text-gray-text">
                    SKU: {item.product.sku}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center justify-start gap-3">
                    <div className="inline-flex h-9 items-center rounded-pill border border-border bg-white">
                      <button
                        type="button"
                        className="inline-flex h-9 w-9 items-center justify-center text-dark hover:text-primary"
                        aria-label={`Reducir ${item.product.name}`}
                        onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                      >
                        <Minus className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <span className="min-w-8 text-center text-sm font-black text-dark">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        className="inline-flex h-9 w-9 items-center justify-center text-dark hover:text-primary"
                        aria-label={`Aumentar ${item.product.name}`}
                        onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                      >
                        <Plus className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                    <button
                      type="button"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-white text-gray-text transition hover:border-danger hover:text-danger"
                      aria-label={`Eliminar ${item.product.name}`}
                      onClick={() => removeItem(item.productId)}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-5 rounded-md border border-primary/20 bg-primary/10 p-4">
            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-primary">
              Total referencial
            </p>
            <p className="mt-1 font-display text-3xl font-black text-dark">
              {hasUnpricedItems && subtotal === 0 ? "Cotizar" : formatCurrencyPEN(subtotal)}
            </p>
            <p className="mt-1 text-xs font-semibold leading-5 text-gray-text">
              {hasUnpricedItems
                ? "Incluye productos sin precio cargado aún. El asesor confirma compatibilidad, stock y precio final."
                : "El asesor confirma compatibilidad, stock y precio final antes de pago."}
            </p>
          </div>

          <div className="mt-5 grid gap-3">
            <Button
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              variant="whatsapp"
              className="w-full whitespace-normal px-4 text-center leading-5"
            >
              <MessageCircle className="h-5 w-5" aria-hidden="true" />
              <span className="hidden sm:inline">Cotizar carrito por WhatsApp</span>
              <span className="sm:hidden">Cotizar por WhatsApp</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled
              className="w-full whitespace-normal px-4 text-center leading-5"
            >
              <CreditCard className="h-5 w-5" aria-hidden="true" />
              Pago online próximamente
            </Button>
            <button
              type="button"
              className="text-sm font-extrabold text-gray-text transition hover:text-danger"
              onClick={clearCart}
            >
              Vaciar carrito
            </button>
          </div>
        </>
      )}
    </aside>
  );
}
