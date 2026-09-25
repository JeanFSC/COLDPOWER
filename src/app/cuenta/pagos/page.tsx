import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CreditCard } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { listOrdersForUser } from "@/lib/sales-service";
import { orders, payments } from "@/db/sales-schema";
import { Badge } from "@/components/shared/Badge";
import { formatDateTime, formatMoney, paymentStatusLabels } from "@/lib/order-display";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Mis pagos | ColdPower", description: "Consulta los pagos asociados a tus pedidos." };

function badgeVariant(status: string | undefined) {
  if (status === "APPROVED" || status === "CONFIRMED") return "stock" as const;
  if (status === "REJECTED" || status === "ERROR") return "danger" as const;
  return "warning" as const;
}

export default async function CuentaPagosPage() {
  const { userId } = await requireUser();
  let rows: Array<{ order: typeof orders.$inferSelect; payment: typeof payments.$inferSelect | null }> = [];
  let failed = false;
  try {
    rows = await listOrdersForUser(userId);
  } catch (error) {
    failed = true;
    console.error("ColdPower: no se pudieron cargar los pagos del cliente", error);
  }

  return (
    <div className="account-subpage">
      <header className="account-subpage-header">
        <div>
          <p className="account-eyebrow">Control de pagos</p>
          <h1 className="account-h1">Mis pagos</h1>
          <p className="account-subtitle">Consulta el estado de cada pago asociado a tus pedidos. Las confirmaciones manuales las realiza el equipo autorizado de ColdPower.</p>
        </div>
        <span className="account-status-pill"><CreditCard aria-hidden="true" /> {rows.length} registros</span>
      </header>

      {failed ? (
        <div className="account-subpage-card mt-3 p-4 text-sm font-semibold text-danger" role="alert">No pudimos cargar tus pagos. Inténtalo nuevamente en unos minutos.</div>
      ) : rows.length === 0 ? (
        <div className="account-empty-panel mt-3">
          <p className="font-bold text-dark">Todavía no tienes pagos registrados.</p>
          <p className="mt-2 text-sm leading-6 text-gray-text">Cuando exista un pedido, su pago aparecerá aquí.</p>
        </div>
      ) : (
        <div className="account-subpage-card mt-3">
          {rows.map(({ order, payment }) => {
            const status = payment?.status ?? "PENDING";
            return (
              <Link href={`/cuenta/pedidos/${encodeURIComponent(order.code)}`} className="account-subpage-row" key={`${order.id}-${payment?.id ?? "pending"}`}>
                <div className="min-w-0 flex-1">
                  <p className="account-mono">{order.code} · {formatDateTime(payment?.updatedAt ?? order.updatedAt)}</p>
                  <h2 className="mt-1">Pago del pedido</h2>
                  <dl className="account-subpage-dl">
                    <div><dt>Monto</dt><dd>{formatMoney(payment?.amount ?? order.total, payment?.currency ?? order.currency)}</dd></div>
                    <div><dt>Método</dt><dd>{payment?.method || "Pendiente"}</dd></div>
                    <div><dt>Referencia</dt><dd className="break-all">{payment?.providerReference || "—"}</dd></div>
                  </dl>
                </div>
                <div className="flex shrink-0 items-center gap-2"><Badge variant={badgeVariant(payment?.status)}>{paymentStatusLabels[status] ?? status}</Badge><ArrowRight className="h-4 w-4 text-gray-text" aria-hidden="true" /></div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
