import type { Metadata } from "next";
import { CompanySettingsWorkspace } from "@/components/admin/AdminCategoryViews";
import { CompanySettingsForm } from "@/components/admin/CompanySettingsForm";
import { requirePermission } from "@/lib/auth";

export const metadata: Metadata = { title: "Configuracion empresarial | Panel admin ColdPower", description: "Gestiona datos empresariales confirmados y publicados." };

export default async function AdminConfiguracionPage() {
  await requirePermission("company.settings.manage");
  return <CompanySettingsWorkspace controls={<CompanySettingsForm />} />;
}