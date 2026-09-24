import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { getPipelineBoard } from "@/lib/pipeline-repository";
import { parsePipelineDeepLink, parsePipelineFilters } from "@/lib/pipeline-contract";
import { can } from "@/lib/roles";
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
    query.delete("view");
    redirect(`/admin/clientes${query.toString() ? `?${query.toString()}` : ""}`);
  }
  const pipelineParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") pipelineParams.set(key, value);
    else if (Array.isArray(value) && value[0]) pipelineParams.set(key, value[0]);
  }
  const deepLink = parsePipelineDeepLink(pipelineParams);
  const board = await getPipelineBoard(parsePipelineFilters(pipelineParams), { canManage: can(actor.role, "crm.manage"), canExport: can(actor.role, "crm.export") });
  return <PipelineWorkspace board={board} queryString={pipelineParams.toString()} deepLink={deepLink} />;
}
