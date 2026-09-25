import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth";
import { can } from "@/lib/roles";
import { getOrdersPage } from "@/lib/orders-repository";
import { parseOrdersFilters } from "@/lib/orders-contract";
import { OrdersControlCenter } from "@/components/admin/OrdersControlCenter";

export const metadata: Metadata = {
  title: "Pedidos | Panel admin ColdPower",
  description: "Gestiona pedidos, reservas y estados de entrega de ColdPower.",
};
export default async function AdminPedidosPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const actor = await requirePermission("orders.view");
  const params = (await searchParams) ?? {};
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") query.set(key, value);
    else if (Array.isArray(value) && value[0]) query.set(key, value[0]);
  }
  const canViewAmounts = can(actor.role, "sales.view") || can(actor.role, "payments.view");
  const page = await getOrdersPage(parseOrdersFilters(query), { includeAmounts: canViewAmounts, includeFinancial: can(actor.role, "payments.view") });
  return (
    <OrdersControlCenter
      page={page}
      queryString={query.toString()}
      canManage={can(actor.role, "orders.manage")}
      canPaymentsView={can(actor.role, "payments.view")}
      canViewAmounts={canViewAmounts}
    />
  );
}
