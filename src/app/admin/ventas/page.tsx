import type { Metadata } from "next";
import { SalesWorkspace } from "@/components/admin/AdminCategoryViews";
import { SalesActions } from "@/components/admin/SalesActions";
import { requirePermission } from "@/lib/auth";
import { getSalesPage } from "@/lib/sales-repository";
import { parseSalesFilters } from "@/lib/sales-contract";

export const metadata: Metadata = { title: "Ventas | Panel admin ColdPower", description: "Ventas confirmadas y su trazabilidad operativa." };

export default async function AdminVentasPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  await requirePermission("sales.manage");
  const params = (await searchParams) ?? {};
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) { if (typeof value === "string") query.set(key, value); else if (Array.isArray(value) && value[0]) query.set(key, value[0]); }
  const page = await getSalesPage(parseSalesFilters(query));
  return <SalesWorkspace rows={page.items.map((sale) => ({ id: sale.code, customer: sale.customerName, total: `${sale.currency} ${sale.total}`, status: sale.status, payment: sale.paymentStatus ?? "No disponible", delivery: sale.invoiceStatus ?? "No disponible", date: sale.createdAt.toLocaleDateString("es-PE") }))} metrics={page.metrics} pagination={{ page: page.page, totalPages: page.totalPages, totalItems: page.totalItems }} facets={page.facets} query={query.get("query") ?? undefined} queryString={query.toString()} exportHref={`/api/admin/ventas/export?${query.toString()}`} controls={<div className="grid gap-3">{page.items.map((sale) => <SalesActions key={sale.id} saleId={sale.id} status={sale.status} invoiceStatus={sale.invoiceStatus} />)}</div>} />;
}
