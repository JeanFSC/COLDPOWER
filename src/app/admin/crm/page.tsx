import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth";
import { getCustomersPage } from "@/lib/customer-repository";
import { parseCustomerFilters } from "@/lib/customer-contract";
import { getPipelinePage } from "@/lib/pipeline-repository";
import { parsePipelineFilters } from "@/lib/pipeline-contract";
import { opportunityStages } from "@/lib/crm-validation";
import { CrmOperations } from "@/components/admin/CrmOperations";
import { CrmCreateForms } from "@/components/admin/CrmCreateForms";
import { CrmPipeline } from "@/components/admin/CrmPipeline";
import { CustomersWorkspace, PipelineWorkspace } from "@/components/admin/AdminCategoryViews";

export const metadata: Metadata = { title: "CRM y pipeline | Panel admin ColdPower", description: "Clientes, oportunidades, seguimientos y tareas comerciales persistentes." };

export default async function AdminCrmPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const params = (await searchParams) ?? {};
  const selectedView = Array.isArray(params.view) ? params.view[0] : params.view;
  await requirePermission(selectedView === "clientes" ? "customers.view" : "crm.view");
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
  const pipelinePage = await getPipelinePage(parsePipelineFilters(pipelineParams));
  const customerPage = await getCustomersPage({ page: 1, pageSize: 100 });
  const customers = customerPage.items.map((customer) => ({ id: customer.id, name: customer.name, email: customer.email, phone: customer.phone, customerType: customer.customerType, status: customer.status, location: customer.location }));
  const pipelineOpportunities = pipelinePage.items.map((opportunity) => ({ id: opportunity.id, code: opportunity.code, customerName: opportunity.customerName, customerPhone: opportunity.customerPhone, title: opportunity.title, stage: opportunity.stage, totalAmount: opportunity.totalAmount, currency: opportunity.currency, nextAction: opportunity.nextAction, followUpAt: opportunity.followUpAt, items: opportunity.items }));
  const controls = <div className="space-y-4"><CrmCreateForms customers={customers} opportunities={pipelineOpportunities} /><CrmOperations customers={customers} tasks={[]} /></div>;
  const stageLabels: Record<string, string> = { NEW: "Nuevo", CONTACTED: "Contactado", QUOTING: "Cotizando", QUOTE_SENT: "Cotización enviada", FOLLOW_UP: "Seguimiento", NEGOTIATION: "Negociación", ACCEPTED: "Aceptado", SALE: "Venta", PAYMENT_PENDING: "Pago pendiente", PAID: "Pagado", PREPARING: "Preparando", DELIVERED: "Entregado", CLOSED: "Cerrado", LOST: "Perdido", CANCELLED: "Cancelado", NO_RESPONSE: "Sin respuesta" };
  const tones: Record<string, "blue" | "orange" | "green" | "red" | "purple"> = { NEW: "blue", CONTACTED: "blue", QUOTE_SENT: "purple", QUOTING: "purple", FOLLOW_UP: "orange", NEGOTIATION: "orange", ACCEPTED: "green", SALE: "green", PAYMENT_PENDING: "orange", PAID: "green", PREPARING: "purple", DELIVERED: "green", CLOSED: "green", LOST: "red", CANCELLED: "red", NO_RESPONSE: "red" };
  return <PipelineWorkspace metrics={pipelinePage.metrics} pagination={{ page: pipelinePage.page, totalPages: pipelinePage.totalPages, totalItems: pipelinePage.totalItems }} facets={pipelinePage.facets} query={pipelineParams.get("query") ?? undefined} queryString={pipelineParams.toString()} exportHref={`/api/admin/oportunidades/export?${pipelineParams.toString()}`} columns={opportunityStages.map((stage) => ({ stage, label: stageLabels[stage], count: pipelinePage.metrics.byStage.find((metric) => metric.stage === stage)?.count ?? 0, tone: tones[stage] ?? "blue", items: pipelinePage.items.filter((opportunity) => opportunity.stage === stage).map((opportunity) => ({ title: opportunity.customerName, detail: opportunity.title, amount: opportunity.totalAmount ? `${opportunity.currency ?? "S/"} ${opportunity.totalAmount}` : undefined })) }))} controls={<div className="space-y-4"><CrmPipeline opportunities={pipelineOpportunities} />{controls}</div>} />;
}
