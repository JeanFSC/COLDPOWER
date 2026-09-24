import type { Metadata } from "next";
import { and, asc, eq, isNull, or } from "drizzle-orm";
import { CustomersControlCenter } from "@/components/admin/CustomersControlCenter";
import { getDb } from "@/db";
import { customers } from "@/db/crm-schema";
import { requirePermission } from "@/lib/auth";
import { getCustomersPage } from "@/lib/customer-repository";
import { parseCustomerFilters } from "@/lib/customer-contract";
import { can } from "@/lib/roles";

export const metadata: Metadata = {
  title: "Clientes | Panel admin ColdPower",
  description: "Gestión comercial y Customer 360 de ColdPower.",
};

export default async function AdminClientesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const actor = await requirePermission("customers.view");
  const raw = (await searchParams) ?? {};
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === "string") query.set(key, value);
    else if (Array.isArray(value) && value[0]) query.set(key, value[0]);
  }
  const db = getDb();
  const [page, mergeCandidates] = await Promise.all([
    getCustomersPage(parseCustomerFilters(query)),
    db
      .select({ id: customers.id, name: customers.name })
      .from(customers)
      .where(
        and(
          or(eq(customers.status, "ACTIVE"), eq(customers.status, "PROSPECT")),
          isNull(customers.canonicalCustomerId),
        ),
      )
      .orderBy(asc(customers.name))
      .limit(500),
  ]);
  return (
    <CustomersControlCenter
      page={page}
      queryString={query.toString()}
      canManage={can(actor.role, "customers.manage")}
      canExport={can(actor.role, "customers.export")}
      canCrmManage={can(actor.role, "crm.manage")}
      canQuotesCreate={can(actor.role, "quotes.create")}
      canSalesView={can(actor.role, "sales.view")}
      canOrdersView={can(actor.role, "orders.view")}
      canPaymentsView={can(actor.role, "payments.view")}
      customerId={query.get("customerId")}
      mergeCandidates={mergeCandidates}
    />
  );
}
