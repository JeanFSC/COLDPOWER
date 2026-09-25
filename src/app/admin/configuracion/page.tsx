import type { Metadata } from "next";
import { count, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { companySettings, locations } from "@/db/schema";
import { AdminConfigurationWorkspace } from "@/components/admin/AdminConfigurationWorkspace";
import { requirePermission } from "@/lib/auth";
import { can } from "@/lib/roles";
import { listActivePriceTypes } from "@/lib/price-lists";
import { listDocumentSeries } from "@/lib/document-series";
import { listIntegrations } from "@/lib/integrations";

export const metadata: Metadata = { title: "Configuración empresarial | Panel admin ColdPower", description: "Gestiona datos empresariales confirmados y publicados." };

export default async function AdminConfiguracionPage() {
  const actor = await requirePermission("settings.business.edit");
  const db = getDb();

  let summary: { legalName?: string | null; tradeName?: string | null; ruc?: string | null; locations: number | null; paymentMethods: number | null; version: number | null; updatedAt?: Date | null; logoMediaId?: string | null; contactMethods: number } | undefined;
  let locationRows: Array<{ id: string; code: string; name: string; type: string; address: string | null; city: string | null; active: boolean }> = [];
  let locationsTotal = 0;
  let priceLists: Awaited<ReturnType<typeof listActivePriceTypes>> = [];
  let documentSeries: Awaited<ReturnType<typeof listDocumentSeries>> = [];
  let integrations: Awaited<ReturnType<typeof listIntegrations>> = [];

  try {
    const [[settings], [locationCount], [locationTotalRow], rows, priceListRows, seriesRows, integrationRows] = await Promise.all([
      db.select({ legalName: companySettings.legalName, tradeName: companySettings.tradeName, ruc: companySettings.ruc, paymentMethods: companySettings.paymentMethods, version: companySettings.version, updatedAt: companySettings.updatedAt, logoMediaId: companySettings.logoMediaId, phone: companySettings.phone, whatsapp: companySettings.whatsapp, email: companySettings.email, salesEmail: companySettings.salesEmail }).from(companySettings).where(eq(companySettings.id, "default")).limit(1),
      db.select({ count: count() }).from(locations).where(eq(locations.active, true)),
      db.select({ count: count() }).from(locations),
      db.select({ id: locations.id, code: locations.code, name: locations.name, type: locations.type, address: locations.address, city: locations.city, active: locations.active }).from(locations).orderBy(desc(locations.createdAt)).limit(5),
      listActivePriceTypes(),
      listDocumentSeries(),
      listIntegrations(),
    ]);
    const contactMethods = [settings?.phone, settings?.whatsapp, settings?.email, settings?.salesEmail].filter((value) => Boolean(value?.trim())).length;
    summary = { legalName: settings?.legalName, tradeName: settings?.tradeName, ruc: settings?.ruc, locations: Number(locationCount?.count ?? 0), paymentMethods: settings?.paymentMethods?.length ?? null, version: settings?.version ?? null, updatedAt: settings?.updatedAt ?? null, logoMediaId: settings?.logoMediaId, contactMethods };
    locationRows = rows;
    locationsTotal = Number(locationTotalRow?.count ?? 0);
    priceLists = priceListRows;
    documentSeries = seriesRows;
    integrations = integrationRows;
  } catch (error) {
    console.error("ColdPower: no se pudo cargar el resumen de configuración", error);
  }

  return (
    <AdminConfigurationWorkspace
      summary={summary}
      locationRows={locationRows}
      locationsTotal={locationsTotal}
      priceLists={priceLists}
      documentSeries={documentSeries}
      integrations={integrations}
      canManageIntegrations={can(actor.role, "integrations.manage")}
      canManageTax={actor.role === "SUPERADMIN"}
      canPublishLegalPages={can(actor.role, "settings.legal.publish")}
    />
  );
}
