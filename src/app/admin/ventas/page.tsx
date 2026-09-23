import type { Metadata } from "next";
import { and, asc, eq, isNull, or } from "drizzle-orm";
import { SalesControlCenter } from "@/components/admin/SalesControlCenter";
import { getDb } from "@/db";
import { customers } from "@/db/crm-schema";
import { locations } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { can } from "@/lib/roles";
import { getSalesPage } from "@/lib/sales-repository";
import { parseSalesFilters } from "@/lib/sales-contract";

export const metadata: Metadata = { title: "Ventas | Panel admin ColdPower", description: "Ventas confirmadas y su trazabilidad operativa." };

export default async function AdminVentasPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const actor = await requirePermission("sales.view");
  const params = (await searchParams) ?? {};
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) { if (typeof value === "string") query.set(key, value); else if (Array.isArray(value) && value[0]) query.set(key, value[0]); }
  const db = getDb();
  const [page, customerOptions, locationOptions] = await Promise.all([
    getSalesPage(parseSalesFilters(query)),
    db.select({ id: customers.id, name: customers.name, phone: customers.phone }).from(customers).where(and(or(eq(customers.status, "ACTIVE"), eq(customers.status, "PROSPECT")), isNull(customers.canonicalCustomerId))).orderBy(asc(customers.name)).limit(500),
    db.select({ id: locations.id, code: locations.code, name: locations.name }).from(locations).where(eq(locations.active, true)).orderBy(asc(locations.code)),
  ]);
  return <SalesControlCenter page={page} queryString={query.toString()} canManage={can(actor.role, "sales.manage")} canCancel={can(actor.role, "sales.cancel")} canPaymentsView={can(actor.role, "payments.view")} customers={customerOptions} locations={locationOptions} />;
}
