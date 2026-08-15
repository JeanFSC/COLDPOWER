import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth";
import { getPaymentsPage } from "@/lib/payments-repository";
import { parsePaymentsFilters } from "@/lib/payments-contract";
import { PaymentsWorkspace } from "@/components/admin/AdminCategoryViews";
import { PaymentActions } from "@/components/admin/PaymentActions";

export const metadata: Metadata = { title: "Pagos | Panel admin ColdPower", description: "Seguimiento y conciliación de pagos asociados a pedidos ColdPower." };

export default async function AdminPagosPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  await requirePermission("payments.view");
  const params = (await searchParams) ?? {};
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) { if (typeof value === "string") query.set(key, value); else if (Array.isArray(value) && value[0]) query.set(key, value[0]); }
  const page = await getPaymentsPage(parsePaymentsFilters(query));
  return <PaymentsWorkspace rows={page.items.map((payment) => ({ id: payment.id, customer: payment.customerName, products: payment.orderCode, total: `${payment.currency} ${payment.amount}`, status: payment.status, method: payment.method, payment: payment.reconciliation, date: payment.createdAt.toLocaleDateString("es-PE") }))} metrics={page.metrics} pagination={{ page: page.page, totalPages: page.totalPages, totalItems: page.totalItems }} facets={page.facets} query={query.get("query") ?? undefined} queryString={query.toString()} exportHref={`/api/admin/pagos/export?${query.toString()}`} controls={<div className="grid gap-3">{page.items.map((payment) => <PaymentActions key={payment.id} paymentId={payment.id} status={payment.status} amount={payment.amount} currency={payment.currency} provider={payment.provider} providerReference={payment.providerReference} />)}</div>} />;
}
