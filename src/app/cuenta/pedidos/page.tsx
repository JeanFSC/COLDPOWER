import type { Metadata } from "next";
import Link from "next/link";
import { after } from "next/server";
import { ArrowRight, ChevronRight, Package } from "lucide-react";
import { desc, eq, or } from "drizzle-orm";
import { getDb } from "@/db";
import { customers } from "@/db/crm-schema";
import { orders, payments } from "@/db/sales-schema";
import { Badge } from "@/components/shared/Badge";
import { Button } from "@/components/shared/Button";
import { requireUser } from "@/lib/auth";
import { logAccountLoadError } from "@/lib/account-errors";
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
  after(async () => {
    try { await cancelExpiredUnpaidOrders(); }
    catch (error) { logAccountLoadError("barrido de pedidos vencidos falló", error); }
  });

  const rows = await getDb()
    .select({ order: orders, payment: payments })
    .from(orders)
    .innerJoin(customers, eq(orders.customerId, customers.id))
    .leftJoin(payments, eq(payments.orderId, orders.id))
    .where(or(eq(orders.userId, userId), eq(customers.userId, userId)))
    .orderBy(desc(orders.createdAt))
    .limit(100);

  return (
    <div className="account-subpage">
      <header className="account-subpage-header">
        <div>
          <p className="account-eyebrow">Compras confirmadas</p>
          <h1 className="account-h1">Mis pedidos</h1>
          <p className="account-subtitle">Estado, pago y seguimiento de tus compras. <Link href="/cuenta/historial" className="font-extrabold text-primary hover:underline">Repetir pedido desde historial</Link>.</p>
        </div>
        <span className="account-status-pill"><Package aria-hidden="true" /> {rows.length} {rows.length === 1 ? "pedido" : "pedidos"}</span>
      </header>

      {rows.length === 0 ? (
        <div className="account-empty-panel mt-3">
          <p className="font-bold text-dark">Todavía no tienes pedidos.</p>
          <p className="mt-2 text-sm leading-6 text-gray-text">Los productos con precio publicado se compran desde el carrito; los demás, por cotización.</p>
          <Button href="/catalogo" variant="primary" size="sm" className="mt-4">Ver catálogo</Button>
        </div>
      ) : (
        <div className="account-subpage-card mt-3">
          {rows.map(({ order, payment }) => (
            <Link href={`/cuenta/pedidos/${encodeURIComponent(order.code)}`} className="account-subpage-row" key={order.id}>
              <div className="min-w-0 flex-1">
                <p className="account-mono">{order.code} · {formatDateTime(order.createdAt)}</p>
                <h2 className="mt-1">Pedido {order.code}</h2>
                <dl className="account-subpage-dl">
                  <div><dt>Total</dt><dd>{formatMoney(order.total, order.currency)}</dd></div>
                  <div><dt>Entrega</dt><dd>{deliveryMethodLabels[order.deliveryMethod] ?? order.deliveryMethod}</dd></div>
                  <div><dt>Pago</dt><dd>{payment ? paymentStatusLabels[payment.status] ?? payment.status : "Pendiente"}</dd></div>
                </dl>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge variant={badgeVariant(order.status)}>{orderStatusLabels[order.status] ?? order.status}</Badge>
                <ChevronRight className="h-5 w-5 text-gray-text" aria-hidden="true" />
              </div>
            </Link>
          ))}
        </div>
      )}

      <Link href="/cuenta/historial" className="account-section-link mt-3">Volver a comprar desde tu historial <ArrowRight aria-hidden="true" /></Link>
    </div>
  );
}
