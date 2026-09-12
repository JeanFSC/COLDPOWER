import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth";
import { getCustomersPage } from "@/lib/customer-repository";
import { parseCustomerFilters } from "@/lib/customer-contract";
import { getPipelineBoard } from "@/lib/pipeline-repository";
import { parsePipelineFilters } from "@/lib/pipeline-contract";
import { can } from "@/lib/roles";
import { CrmOperations } from "@/components/admin/CrmOperations";
import { CrmCreateForms } from "@/components/admin/CrmCreateForms";
import { CustomersWorkspace } from "@/components/admin/AdminCategoryViews";
import { PipelineWorkspace } from "@/components/admin/PipelineWorkspace";

export const metadata: Metadata = { title: "CRM y pipeline | Panel admin ColdPower", description: "Clientes, oportunidades, seguimientos y tareas comerciales persistentes." };

export default async function AdminCrmPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const params = (await searchParams) ?? {};
  const selectedView = Array.isArray(params.view) ? params.view[0] : params.view;
  const actor = await requirePermission(selectedView === "clientes" ? "customers.view" : "crm.view");
  if (selectedView === "clientes") {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (typeof value === "string") query.set(key, value);
      else if (Array.isArray(value) && value[0]) query.set(key, value[0]);
    }
    const rawType = query.get("type");
    if (rawType && !query.has("customerType")) query.set("customerType", rawType);
    query.delete("type");
    const customerPage = await getCustomersPage(parseCustomerFilters(query));
    const customerId = query.get("customerId");
    const closeQuery = new URLSearchParams(query);
    closeQuery.delete("customerId");
    closeQuery.delete("page");
    const customers = customerPage.items.map((customer) => ({ id: customer.id, name: customer.name, email: customer.email, phone: customer.phone, customerType: customer.customerType, status: customer.status, location: customer.location }));
    const controls = <div className="space-y-4"><CrmCreateForms customers={customers} opportunities={[]} /><CrmOperations customers={customers} tasks={[]} /></div>;
    return <CustomersWorkspace rows={customerPage.items.map((customer) => ({ id: customer.id, name: customer.name, type: customer.customerType, contact: customer.legalName ?? customer.name, phone: customer.phone ?? undefined, email: customer.email ?? undefined, city: customer.location ?? undefined, quotes: customer.quoteCount, lastActivityAt: customer.lastActivityAt, status: customer.status === "ACTIVE" ? "Activo" : customer.status === "PROSPECT" ? "Prospecto" : "Inactivo" }))} metrics={customerPage.metrics} pagination={{ page: customerPage.page, totalPages: customerPage.totalPages, totalItems: customerPage.totalItems }} facets={customerPage.facets} query={query.get("query") ?? undefined} queryString={query.toString()} exportHref={`/api/admin/clientes/export?${query.toString()}`} controls={controls} customerId={customerId} closeHref={`/admin/crm?${closeQuery.toString()}`} />;
  }
  const pipelineParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") pipelineParams.set(key, value);
    else if (Array.isArray(value) && value[0]) pipelineParams.set(key, value[0]);
  }
  const board = await getPipelineBoard(parsePipelineFilters(pipelineParams), { canManage: can(actor.role, "crm.manage"), canExport: can(actor.role, "crm.export") });
  return <PipelineWorkspace board={board} queryString={pipelineParams.toString()} />;
}
