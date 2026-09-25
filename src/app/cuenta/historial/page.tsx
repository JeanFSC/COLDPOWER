import type { Metadata } from "next";
import { ArrowLeft, History, Package } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { listPurchasedProductsForUser } from "@/lib/customer-history";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { AddToQuoteButton } from "@/components/cart/AddToQuoteButton";
import { Button } from "@/components/shared/Button";
import { formatMoney } from "@/lib/order-display";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Volver a comprar | ColdPower", description: "Historial de productos comprados en ColdPower." };

export default async function CuentaHistorialPage() {
  const { userId } = await requireUser();
  let products: Awaited<ReturnType<typeof listPurchasedProductsForUser>> = [];
  let failed = false;
  try { products = await listPurchasedProductsForUser(userId); }
  catch (error) { failed = true; console.error("ColdPower: no se pudo cargar el historial", error); }

  return (
    <div className="account-subpage">
      <header className="account-subpage-header">
        <div>
          <p className="account-eyebrow">Historial de compras</p>
          <h1 className="account-h1">Volver a comprar</h1>
          <p className="account-subtitle">Productos comprados, último pedido y una acción clara según el precio publicado vigente.</p>
        </div>
        <span className="account-status-pill"><History aria-hidden="true" /> {products.length} productos</span>
      </header>

      {failed ? <div className="account-subpage-card mt-3 p-4 text-sm font-semibold text-danger" role="alert">No pudimos cargar tu historial. Inténtalo nuevamente en unos minutos.</div> : null}
      {!failed && products.length ? (
        <div className="account-subpage-card mt-3">
          {products.map((product) => (
            <article className="account-subpage-row" key={product.productId}>
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <span className="account-repeat-card-icon"><Package aria-hidden="true" /></span>
                <div className="min-w-0">
                  <p className="account-mono">{product.sku}</p>
                  <h2 className="mt-1 truncate">{product.name}</h2>
                  <p>Unidades acumuladas: {product.totalQuantity}. Último pedido: {product.lastOrderCode}</p>
                  {product.price ? <p className="mt-2 font-extrabold text-primary">Precio vigente · {formatMoney(product.price.amount, product.price.currency)}</p> : <p className="mt-2 text-xs font-bold text-gray-text">Sin precio publicado: solicita una cotización.</p>}
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                {product.price ? <AddToCartButton productId={product.productId} purchasable label="Agregar al carrito" size="sm" /> : <AddToQuoteButton productId={product.productId} label="Cotizar" size="sm" />}
                <Button href={`/cotizacion?producto=${encodeURIComponent(product.slug)}`} variant="ghost" size="sm">Ver producto</Button>
              </div>
            </article>
          ))}
        </div>
      ) : !failed ? (
        <div className="account-empty-panel mt-3">
          <p className="font-bold text-dark">Todavía no tienes productos comprados.</p>
          <p className="mt-2 text-sm leading-6 text-gray-text">Cuando un pedido alcance un estado confirmado, aparecerá aquí con su historial.</p>
          <Button href="/catalogo" variant="primary" size="sm" className="mt-4">Explorar catálogo</Button>
        </div>
      ) : null}
      <a href="/cuenta" className="account-section-link mt-3"><ArrowLeft aria-hidden="true" /> Volver al resumen</a>
    </div>
  );
}
