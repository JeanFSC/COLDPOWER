"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCart } from "@/components/cart/CartProvider";
import { Button } from "@/components/shared/Button";

type CartProduct = { id: string; name: string; sku: string };

export default function CuentaCarritoPage() {
  const { items, totalQuantity, updateQuantity, removeItem, clearCart } = useCart();
  const [products, setProducts] = useState<CartProduct[]>([]);
  const [loadedIdsKey, setLoadedIdsKey] = useState("");
  const idsKey = [...new Set(items.map((item) => item.productId))].sort().join(",");

  useEffect(() => {
    if (!idsKey) return;

    let cancelled = false;
    fetch(`/api/catalog/products?ids=${encodeURIComponent(idsKey)}`, { cache: "no-store" })
      .then((response) =>
        response.ok ? response.json() : Promise.reject(new Error("catalog unavailable")),
      )
      .then((result: { products?: CartProduct[] }) => {
        if (!cancelled) {
          setProducts(result.products ?? []);
          setLoadedIdsKey(idsKey);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setProducts([]);
          setLoadedIdsKey(idsKey);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [idsKey]);

  const loading = Boolean(idsKey) && loadedIdsKey !== idsKey;
  const resolvedItems = items.flatMap((item) => {
    const product = products.find((candidate) => candidate.id === item.productId);
    return product ? [{ ...item, product }] : [];
  });

  return (
    <section className="bg-background py-14 sm:py-18">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-primary">Mi cuenta</p>
        <h1 className="mt-3 font-display text-3xl font-black text-dark">Carrito de cotización</h1>
        <p className="mt-3 text-sm leading-6 text-gray-text">
          {totalQuantity} referencia{totalQuantity === 1 ? "" : "s"} guardada
          {totalQuantity === 1 ? "" : "s"}. La disponibilidad y el precio final se confirman con un asesor.
        </p>

        {items.length === 0 ? (
          <div className="mt-8 rounded-md border border-border bg-white p-6">
            <p className="font-bold text-dark">Tu carrito está vacío.</p>
            <p className="mt-2 text-sm text-gray-text">
              Agrega productos desde el catálogo para solicitar una cotización conjunta.
            </p>
            <Button href="/catalogo" variant="primary" className="mt-5">
              Explorar catálogo
            </Button>
          </div>
        ) : loading ? (
          <div className="mt-8 rounded-md border border-dashed border-border bg-background p-6 text-sm text-gray-text">
            Cargando productos…
          </div>
        ) : resolvedItems.length === 0 ? (
          <div className="mt-8 rounded-md border border-dashed border-danger/30 bg-danger/5 p-6 text-sm text-gray-text">
            No pudimos cargar los productos del carrito.
          </div>
        ) : (
          <div className="mt-8 grid gap-4">
            {resolvedItems.map((item) => (
              <article
                key={item.productId}
                className="flex flex-col gap-4 rounded-md border border-border bg-white p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-mono text-xs font-black text-gray-text">{item.product.sku}</p>
                  <h2 className="mt-1 font-display text-lg font-black text-dark">{item.product.name}</h2>
                  <p className="mt-1 text-sm text-gray-text">Cantidad: {item.quantity}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="h-9 w-9 rounded-md border border-border font-black text-dark"
                    onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                    aria-label="Reducir cantidad"
                  >
                    −
                  </button>
                  <span className="min-w-8 text-center font-bold text-dark">{item.quantity}</span>
                  <button
                    type="button"
                    className="h-9 w-9 rounded-md border border-border font-black text-dark"
                    onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                    aria-label="Aumentar cantidad"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    className="ml-2 text-xs font-extrabold text-danger hover:underline"
                    onClick={() => removeItem(item.productId)}
                  >
                    Quitar
                  </button>
                </div>
              </article>
            ))}
            <div className="flex flex-wrap gap-3">
              <Button href="/cotizacion" variant="primary">
                Solicitar cotización
              </Button>
              <Link
                href="/catalogo"
                className="inline-flex items-center rounded-pill border border-border bg-white px-5 py-3 text-sm font-bold text-dark"
              >
                Seguir explorando
              </Link>
              <button
                type="button"
                className="text-sm font-bold text-danger hover:underline"
                onClick={clearCart}
              >
                Vaciar carrito
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
