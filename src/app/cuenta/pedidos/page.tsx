import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq, or } from "drizzle-orm";
import { after } from "next/server";
import { ChevronRight } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/db";
import { customers } from "@/db/crm-schema";
import { orders, payments } from "@/db/sales-schema";
import { Badge } from "@/components/shared/Badge";
import { Button } from "@/components/shared/Button";
import { cancelExpiredUnpaidOrders } from "@/lib/sales-service";
import { deliveryMethodLabels, formatDateTime, formatMoney, orderStatusLabels, paymentStatusLabels } from "@/lib/order-display";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Mis pedidos | ColdPower", description: "Estado, pago y seguimiento de tus compras en ColdPower." };

function badgeVariant(status: string) {
  if (status === "CANCELLED") return "danger" as const;
  if (status === "PAYMENT_PENDING") return "warning" as const;
  return "stock" as const;
}

export default async function CuentaPedidosPage() {
  const { userId } = await requireUser();
  after(async () => { try { await cancelExpiredUnpaidOrders(); } catch (error) { console.error("ColdPower: barrido de pedidos vencidos falló", error); } });
  let rows: Array<{ order: typeof orders.$inferSelect; payment: typeof payments.$inferSelect | null }> = [];
  let failed = false;
  try {
    rows = await getDb().select({ order: orders, payment: payments }).from(orders).innerJoin(customers, eq(orders.customerId, customers.id)).leftJoin(payments, eq(payments.orderId, orders.id)).where(or(eq(orders.userId, userId), eq(customers.userId, userId))).orderBy(desc(orders.createdAt)).limit(100);
  } catch (error) {
    failed = true;
    console.error("ColdPower: no se pudieron cargar los pedidos del cliente", error);
  }

  return (
    <section className="bg-background py-14 sm:py-18">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-primary">Mi cuenta</p>
        <h1 className="mt-3 font-display text-3xl font-black text-dark">Mis pedidos</h1>
        <p className="mt-3 text-sm leading-6 text-gray-text">Estado, pago y seguimiento de tus compras. <Link href="/cuenta/historial" className="font-extrabold text-primary hover:underline">Repetir pedido desde historial</Link>.</p>
        {failed ? (
          <div className="mt-8 rounded-md border border-danger/25 bg-danger/5 p-6 text-sm font-semibold text-danger" role="alert">No pudimos cargar tus pedidos. Inténtalo nuevamente en unos minutos.</div>
        ) : rows.length === 0 ? (
          <div className="mt-8 rounded-md border border-border bg-white p-6">
            <p className="font-bold text-dark">Todavía no tienes pedidos.</p>
            <p className="mt-2 text-sm leading-6 text-gray-text">Los productos con precio publicado se compran desde el carrito; los demás, por cotización.</p>
            <Button href="/catalogo" variant="primary" size="sm" className="mt-4">Ver catálogo</Button>
          </div>
        ) : (
          <ul className="mt-8 grid gap-4">
            {rows.map(({ order, payment }) => (
              <li key={order.id}>
                <Link href={`/cuenta/pedidos/${encodeURIComponent(order.code)}`} className="block rounded-md border border-border bg-white p-5 transition hover:border-primary">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-xs font-black text-gray-text">{formatDateTime(order.createdAt)}</p>
                      <h2 className="mt-1 font-display text-xl font-black text-dark">Pedido {order.code}</h2>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={badgeVariant(order.status)}>{orderStatusLabels[order.status] ?? order.status}</Badge>
                      <ChevronRight className="h-5 w-5 text-gray-text" aria-hidden="true" />
                    </div>
                  </div>
                  <dl className="mt-4 grid gap-3 border-t border-border pt-4 text-sm sm:grid-cols-3">
                    <div><dt className="text-xs font-extrabold uppercase tracking-[0.08em] text-gray-text">Total</dt><dd className="mt-1 font-bold text-dark">{formatMoney(order.total, order.currency)}</dd></div>
                    <div><dt className="text-xs font-extrabold uppercase tracking-[0.08em] text-gray-text">Entrega</dt><dd className="mt-1 font-bold text-dark">{deliveryMethodLabels[order.deliveryMethod] ?? order.deliveryMethod}</dd></div>
                    <div><dt className="text-xs font-extrabold uppercase tracking-[0.08em] text-gray-text">Pago</dt><dd className="mt-1 font-bold text-dark">{payment ? paymentStatusLabels[payment.status] ?? payment.status : "Pendiente"}</dd></div>
                  </dl>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
