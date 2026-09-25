import type { Metadata } from "next";
import { count, desc, eq, lt } from "drizzle-orm";
import { getDb } from "@/db";
import { companySettings, companySettingsHistory, locations } from "@/db/schema";
import { Tanda2Settings } from "@/components/admin/AdminTanda2Workspaces";
import { CompanySettingsForm } from "@/components/admin/CompanySettingsForm";
import { CompanySettingsHistoryPanel } from "@/components/admin/CompanySettingsHistoryPanel";
import { requirePermission } from "@/lib/auth";
import { can } from "@/lib/roles";
import { listActivePriceTypes, countActivePriceTypesBefore } from "@/lib/price-lists";
import { listDocumentSeries, countActiveDocumentSeriesBefore } from "@/lib/document-series";
import { listIntegrations } from "@/lib/integrations";

export const metadata: Metadata = { title: "Configuración empresarial | Panel admin ColdPower", description: "Gestiona datos empresariales confirmados y publicados." };

const DAY_MS = 86400000;

function thirtyDaysAgo() {
  return new Date(Date.now() - 30 * DAY_MS);
}

function contactMethodsFromSnapshot(value: Record<string, unknown> | null | undefined) {
  if (!value) return 0;
  return [value.phone, value.whatsapp, value.email, value.salesEmail].filter((item) => typeof item === "string" && item.trim()).length;
}

export default async function AdminConfiguracionPage() {
  const actor = await requirePermission("settings.business.edit");
  const db = getDb();
  const cutoff = thirtyDaysAgo();

  let summary: { legalName?: string | null; tradeName?: string | null; ruc?: string | null; locations: number | null; paymentMethods: number | null; version: number | null; updatedAt?: Date | null; logoMediaId?: string | null; contactMethods: number } | undefined;
  let locationRows: Array<{ id: string; code: string; name: string; type: string; address: string | null; city: string | null; active: boolean }> = [];
  let locationsTotal = 0;
  let previousLocationsCount = 0;
  let priceLists: Awaited<ReturnType<typeof listActivePriceTypes>> = [];
  let previousPriceTypesCount = 0;
  let previousContactMethods: number | null = null;
  let documentSeries: Awaited<ReturnType<typeof listDocumentSeries>> = [];
  let integrations: Awaited<ReturnType<typeof listIntegrations>> = [];
  let previousActiveSeriesCount = 0;
  let loadError: string | null = null;

  try {
    const [[settings], [locationCount], [locationTotalRow], rows, [previousLocations], priceListRows, previousPriceTypes, seriesRows, integrationRows, [previousSettingsHistory], previousActiveSeries] = await Promise.all([
      db.select({ legalName: companySettings.legalName, tradeName: companySettings.tradeName, ruc: companySettings.ruc, paymentMethods: companySettings.paymentMethods, version: companySettings.version, updatedAt: companySettings.updatedAt, logoMediaId: companySettings.logoMediaId, phone: companySettings.phone, whatsapp: companySettings.whatsapp, email: companySettings.email, salesEmail: companySettings.salesEmail }).from(companySettings).where(eq(companySettings.id, "default")).limit(1),
      db.select({ count: count() }).from(locations).where(eq(locations.active, true)),
      db.select({ count: count() }).from(locations),
      db.select({ id: locations.id, code: locations.code, name: locations.name, type: locations.type, address: locations.address, city: locations.city, active: locations.active }).from(locations).orderBy(desc(locations.createdAt)).limit(5),
      db.select({ count: count() }).from(locations).where(lt(locations.createdAt, cutoff)),
      listActivePriceTypes(),
      countActivePriceTypesBefore(cutoff),
      listDocumentSeries(),
      listIntegrations(),
      db.select({ after: companySettingsHistory.after }).from(companySettingsHistory).where(lt(companySettingsHistory.createdAt, cutoff)).orderBy(desc(companySettingsHistory.createdAt)).limit(1),
      countActiveDocumentSeriesBefore(cutoff),
    ]);
    const contactMethods = [settings?.phone, settings?.whatsapp, settings?.email, settings?.salesEmail].filter((value) => Boolean(value?.trim())).length;
    summary = { legalName: settings?.legalName, tradeName: settings?.tradeName, ruc: settings?.ruc, locations: Number(locationCount?.count ?? 0), paymentMethods: settings?.paymentMethods?.length ?? null, version: settings?.version ?? null, updatedAt: settings?.updatedAt ?? null, logoMediaId: settings?.logoMediaId, contactMethods };
    locationRows = rows;
    locationsTotal = Number(locationTotalRow?.count ?? 0);
    previousLocationsCount = Number(previousLocations?.count ?? 0);
    priceLists = priceListRows;
    previousPriceTypesCount = previousPriceTypes;
    documentSeries = seriesRows;
    integrations = integrationRows;
    previousContactMethods = previousSettingsHistory ? contactMethodsFromSnapshot(previousSettingsHistory.after) : null;
    previousActiveSeriesCount = previousActiveSeries;
  } catch (error) {
    loadError = "No se pudo cargar la configuración empresarial. Revisa la conexión e inténtalo de nuevo.";
    console.error("ColdPower: no se pudo cargar el resumen de configuración", error);
  }

  return (
    <Tanda2Settings
      summary={summary}
      locations={locationRows}
      locationsTotal={locationsTotal}
      previousLocationsCount={previousLocationsCount}
      priceLists={priceLists}
      previousPriceTypesCount={previousPriceTypesCount}
      previousContactMethods={previousContactMethods}
      documentSeries={documentSeries}
      previousActiveSeriesCount={previousActiveSeriesCount}
      integrations={integrations}
      controls={<CompanySettingsForm canPublishLegalPages={can(actor.role, "settings.legal.publish")} canManageTax={actor.role === "SUPERADMIN"} />}
      canManageIntegrations={can(actor.role, "integrations.manage")}
      loadError={loadError}
      afterControls={<CompanySettingsHistoryPanel currentVersion={summary?.version ?? 0} />}
    />
  );
}
