import type { Metadata } from "next";

import { requireUser } from "@/lib/auth";
import { listOrdersForUser } from "@/lib/sales-service";

import { orders, payments } from "@/db/sales-schema";
import { Badge } from "@/components/shared/Badge";

export const metadata: Metadata = { title: "Mis pagos | ColdPower", description: "Consulta los pagos asociados a tus pedidos." };
const labels: Record<string, string> = { PENDING: "Pendiente", APPROVED: "Aprobado", REJECTED: "Rechazado", CANCELLED: "Cancelado", REFUNDED: "Reembolsado", ERROR: "Error" };

export default async function CuentaPagosPage() {
  const { userId } = await requireUser();
  let rows: Array<{ order: typeof orders.$inferSelect; payment: typeof payments.$inferSelect | null }> = [];
  try {
    rows = await listOrdersForUser(userId);
  } catch (error) {
    console.error("ColdPower: no se pudieron cargar los pagos del cliente", error);
  }
  return <section className="bg-background py-14 sm:py-18"><div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8"><p className="text-xs font-extrabold uppercase tracking-[0.16em] text-primary">Mi cuenta</p><h1 className="mt-3 font-display text-3xl font-black text-dark">Mis pagos</h1><p className="mt-3 text-sm leading-6 text-gray-text">Consulta el estado de cada pago asociado a tus pedidos. Las confirmaciones manuales las realiza el equipo autorizado de ColdPower.</p>{rows.length === 0 ? <div className="mt-8 rounded-md border border-border bg-white p-6"><p className="font-bold text-dark">Todavía no tienes pagos registrados.</p><p className="mt-2 text-sm leading-6 text-gray-text">Cuando exista un pedido, su pago aparecerá aquí.</p></div> : <div className="mt-8 grid gap-4">{rows.map(({ order, payment }) => <article key={order.id} className="rounded-md border border-border bg-white p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-mono text-xs font-black text-gray-text">{order.code}</p><h2 className="mt-1 font-display text-xl font-black text-dark">Pago del pedido</h2></div><Badge variant={payment?.status === "APPROVED" ? "stock" : payment?.status === "REJECTED" ? "danger" : "warning"}>{labels[payment?.status ?? "PENDING"]}</Badge></div><dl className="mt-4 grid gap-3 border-t border-border pt-4 text-sm sm:grid-cols-4"><div><dt className="text-xs font-extrabold uppercase tracking-[0.08em] text-gray-text">Monto</dt><dd className="mt-1 font-bold text-dark">{payment?.currency ?? order.currency} {payment?.amount ?? order.total}</dd></div><div><dt className="text-xs font-extrabold uppercase tracking-[0.08em] text-gray-text">Método</dt><dd className="mt-1 font-bold text-dark">{payment?.method ?? "Pendiente"}</dd></div><div><dt className="text-xs font-extrabold uppercase tracking-[0.08em] text-gray-text">Referencia</dt><dd className="mt-1 break-all font-bold text-dark">{payment?.providerReference ?? "—"}</dd></div><div><dt className="text-xs font-extrabold uppercase tracking-[0.08em] text-gray-text">Actualizado</dt><dd className="mt-1 font-bold text-dark">{payment?.updatedAt?.toLocaleString("es-PE") ?? "—"}</dd></div></dl></article>)}</div>}</div></section>;
}
