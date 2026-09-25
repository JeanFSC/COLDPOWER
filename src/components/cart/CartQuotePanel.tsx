"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { MessageCircle, Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/shared/Button";
import { WhatsAppLeadButton } from "@/components/shared/WhatsAppLeadButton";
import { cartSyncErrorMessage, useCart } from "@/components/cart/CartProvider";
import { resolveProductImage } from "@/lib/product-image";

type CartProduct = {
  id: string;
  slug: string;
  name: string;
  sku: string;
  price: number | null;
  priceCurrency?: string | null;
  images: string[];
  category: string;
  family?: string;
};

export function CartQuotePanel() {
  const { items, totalQuantity, syncStatus, retrySync, updateQuantity, removeItem, clearCart } = useCart();
  const [catalogProducts, setCatalogProducts] = useState<CartProduct[]>([]);
  const [catalogError, setCatalogError] = useState("");
  const [catalogRetry, setCatalogRetry] = useState(0);
  const [isCatalogLoading, setIsCatalogLoading] = useState(false);
  const idsKey = [...new Set(items.map((item) => item.productId))].sort().join(",");

  useEffect(() => {
    if (!idsKey) return;

    let cancelled = false;
    window.queueMicrotask(() => {
      if (cancelled) return;
      setIsCatalogLoading(true);
      setCatalogError("");
      void fetch(`/api/catalog/products?ids=${encodeURIComponent(idsKey)}`, { cache: "no-store" })
        .then((response) => {
          if (!response.ok) throw new Error("catalog unavailable");
          return response.json() as Promise<{ products?: CartProduct[] }>;
        })
        .then((result) => {
          if (!cancelled) setCatalogProducts(result.products ?? []);
        })
        .catch(() => {
          if (!cancelled) {
            setCatalogProducts([]);
            setCatalogError("No pudimos cargar las referencias de la lista. Reintenta para continuar.");
          }
        })
        .finally(() => {
          if (!cancelled) setIsCatalogLoading(false);
        });
    });

    return () => {
      cancelled = true;
    };
  }, [catalogRetry, idsKey]);

  const loading = Boolean(idsKey) && isCatalogLoading;
  const resolvedItems = items.flatMap((item) => {
    const product = catalogProducts.find((candidate) => candidate.id === item.productId);
    return product ? [{ ...item, product }] : [];
  });
  const leadItems = resolvedItems.map((item) => ({ name: item.product.name, sku: item.product.sku, quantity: item.quantity, url: `/producto/${item.product.slug}` }));

  return (
    <aside className="w-full min-w-0 max-w-full overflow-hidden rounded-lg border border-border bg-white p-5 shadow-card sm:p-6" aria-label="Lista de cotización">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-primary">Lista de cotización</p>
          <h2 className="mt-2 font-display text-2xl font-black tracking-normal text-dark">Referencias a cotizar</h2>
        </div>
        <span className="shrink-0 rounded-pill bg-background px-3 py-1 text-xs font-black text-dark">{totalQuantity}</span>
      </div>

      {syncStatus === "error" ? (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-md border border-danger/25 bg-danger/5 px-4 py-3 text-sm font-semibold text-danger" role="alert" aria-live="assertive">
          <span>{cartSyncErrorMessage}</span>
          <button type="button" className="font-extrabold underline underline-offset-2" onClick={retrySync}>Reintentar</button>
        </div>
      ) : null}

      {catalogError ? (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-md border border-danger/25 bg-danger/5 px-4 py-3 text-sm font-semibold text-danger" role="alert" aria-live="assertive">
          <span>{catalogError}</span>
          <button type="button" className="font-extrabold underline underline-offset-2" onClick={() => setCatalogRetry((current) => current + 1)}>Reintentar</button>
        </div>
      ) : null}

      {items.length === 0 ? (
        <div className="mt-5 rounded-md border border-dashed border-border bg-background p-4 text-sm leading-6 text-gray-text">
          <p className="font-extrabold text-dark">Aún no agregaste referencias.</p>
          <p className="mt-1">Usa &quot;Cotizar&quot; en el catálogo o describe lo que necesitas en el formulario.</p>
          <Button href="/catalogo" variant="outline" size="sm" className="mt-4">Ver catálogo</Button>
        </div>
      ) : loading ? (
        <div className="mt-5 rounded-md border border-dashed border-border bg-background p-4 text-sm text-gray-text" role="status" aria-live="polite">Cargando productos…</div>
      ) : resolvedItems.length === 0 ? (
        <div className="mt-5 rounded-md border border-dashed border-danger/30 bg-danger/5 p-4 text-sm leading-6 text-danger" role="alert">No se pudieron resolver las referencias guardadas.</div>
      ) : (
        <>
          <div className="mt-5 grid gap-4">
            {resolvedItems.map((item) => {
              const media = resolveProductImage(item.product);
              return (
              <article key={item.productId} className="grid grid-cols-[64px_minmax(0,1fr)] gap-3 rounded-md border border-border bg-background p-3">
                <Link href={`/producto/${item.product.slug}`} className="relative aspect-square overflow-hidden rounded-md bg-white">
                  <Image src={media.src} alt={item.product.name} fill sizes="72px" className="object-contain p-1" />
                  {media.isReference ? <span className="absolute inset-x-1 bottom-1 truncate rounded bg-brand-primary-900/85 px-1 py-0.5 text-center text-[8px] font-bold text-white">Imagen referencial</span> : null}
                </Link>
                <div>
                  <Link href={`/producto/${item.product.slug}`} className="text-sm font-extrabold text-dark hover:text-primary">{item.product.name}</Link>
                  <p className="mt-1 font-mono text-[11px] font-bold text-gray-text">SKU: {item.product.sku}</p>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="inline-flex h-9 items-center rounded-pill border border-border bg-white">
                      <button type="button" className="h-9 w-9" aria-label={`Reducir ${item.product.name}`} onClick={() => updateQuantity(item.productId, item.quantity - 1)}><Minus className="mx-auto h-4 w-4" /></button>
                      <span className="min-w-8 text-center text-sm font-black text-dark">{item.quantity}</span>
                      <button type="button" className="h-9 w-9" aria-label={`Aumentar ${item.product.name}`} onClick={() => updateQuantity(item.productId, item.quantity + 1)}><Plus className="mx-auto h-4 w-4" /></button>
                    </div>
                    <button type="button" className="h-9 w-9 rounded-full border border-border text-gray-text hover:text-danger" aria-label={`Eliminar ${item.product.name}`} onClick={() => removeItem(item.productId)}><Trash2 className="mx-auto h-4 w-4" /></button>
                  </div>
                </div>
              </article>
              );
            })}
          </div>

          <p className="mt-5 rounded-md border border-primary/20 bg-primary/10 p-4 text-xs font-semibold leading-5 text-gray-text">
            Estas referencias se envían con tu solicitud. Un asesor confirma precio, stock y compatibilidad; no es una compra.
          </p>

          <div className="mt-5 grid gap-3">
            <WhatsAppLeadButton title="Consulta de cotización" productIds={resolvedItems.map((item) => item.productId)} items={leadItems} className="w-full"><MessageCircle className="h-5 w-5" />Cotizar por WhatsApp</WhatsAppLeadButton>
            <button type="button" className="text-sm font-extrabold text-gray-text hover:text-danger" onClick={clearCart}>Vaciar lista</button>
          </div>
        </>
      )}
    </aside>
  );
}
