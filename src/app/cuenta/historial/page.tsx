import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { listPurchasedProductsForUser } from "@/lib/customer-history";
import { Button } from "@/components/shared/Button";

export const metadata: Metadata = { title: "Historial de compras | ColdPower", description: "Historial de pedidos y productos comprados en ColdPower." };

export default async function CuentaHistorialPage() {
  const { userId } = await requireUser();
  let products: Awaited<ReturnType<typeof listPurchasedProductsForUser>> = [];
  try { products = await listPurchasedProductsForUser(userId); } catch (error) { console.error("ColdPower: no se pudo cargar el historial", error); }
  return <section className="bg-background py-14 sm:py-18"><div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8"><p className="text-xs font-extrabold uppercase tracking-[0.16em] text-primary">Mi cuenta</p><h1 className="mt-3 font-display text-3xl font-black text-dark">Historial de compras</h1><p className="mt-3 text-sm leading-6 text-gray-text">Productos comprados, �ltimo pedido y acceso r�pido para repetir una solicitud.</p>{products.length ? <div className="mt-8 grid gap-4 md:grid-cols-2">{products.map((product) => <article key={product.productId} className="rounded-md border border-border bg-white p-5"><p className="font-mono text-xs font-black text-gray-text">{product.sku}</p><h2 className="mt-2 font-display text-xl font-black text-dark">{product.name}</h2><p className="mt-2 text-sm text-gray-text">Unidades acumuladas: {product.totalQuantity}. �ltimo pedido: {product.lastOrderCode}</p><div className="mt-4 flex flex-wrap gap-2"><Button href={"/cotizacion?producto=" + product.slug} variant="outline" size="sm">Solicitar otra cotizaci�n</Button><Button href={"/cuenta/pedidos"} variant="ghost" size="sm">Ver pedidos</Button></div></article>)}</div> : <div className="mt-8 rounded-md border border-border bg-white p-6"><p className="font-bold text-dark">Todav�a no tienes productos comprados.</p><p className="mt-2 text-sm leading-6 text-gray-text">Cuando un pedido alcance un estado confirmado, aparecer� aqu� con su historial.</p></div>}</div></section>;
}
