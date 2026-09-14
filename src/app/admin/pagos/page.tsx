import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth";
import { can } from "@/lib/roles";
import { getPaymentsKpiSeries, getPaymentsPage } from "@/lib/payments-repository";
import { parsePaymentsFilters } from "@/lib/payments-contract";
import { PaymentsControlCenter } from "@/components/admin/PaymentsControlCenter";

export const metadata: Metadata = {
  title: "Pagos | Panel admin ColdPower",
  description: "Seguimiento y conciliación de pagos asociados a pedidos ColdPower.",
};

export default async function AdminPagosPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const actor = await requirePermission("payments.view");
  const params = (await searchParams) ?? {};
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") query.set(key, value);
    else if (Array.isArray(value) && value[0]) query.set(key, value[0]);
  }
  const filters = parsePaymentsFilters(query);
  const [page, series] = await Promise.all([getPaymentsPage(filters), getPaymentsKpiSeries(filters)]);
  return (
    <PaymentsControlCenter
      page={page}
      series={series}
      queryString={query.toString()}
      canManage={can(actor.role, "payments.review")}
      canRefund={can(actor.role, "payments.refund")}
      canManual={can(actor.role, "payments.manual.confirm")}
    />
  );
}
