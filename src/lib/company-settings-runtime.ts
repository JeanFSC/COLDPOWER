import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { companySettings } from "@/db/schema";
import { company } from "@/data/company";
import { publicCompanySettings, type CompanySettings } from "@/lib/company-settings";
import { withRuntimeCache } from "@/lib/runtime-cache";

const SETTINGS_ID = "default";

function fallbackSettings(): CompanySettings {
  const socials = Object.fromEntries(
    Object.entries(company.socialLinks).filter(([, value]) => Boolean(value)),
  ) as Record<string, string>;
  return publicCompanySettings({
    legalName: company.legalName,
    tradeName: company.tradeName,
    commercialName: company.commercialName,
    ruc: company.ruc,
    phone: company.primaryPhone,
    whatsapp: company.whatsapp,
    email: company.commercialEmail,
    salesEmail: company.commercialEmail,
    address: company.address,
    hours: company.schedule,
    businessHours: company.schedule,
    website: company.domain,
    socials,
    legalPagesPublished: false,
  });
}

export async function getPublicCompanySettings(): Promise<CompanySettings> {
  // Public, non-sensitive data (company contact/schedule) requested on every
  // page including admin routes via the root layout; short process-local
  // cache avoids a Neon round trip per navigation.
  return withRuntimeCache("company-settings:public", async () => {
    try {
      const [settings] = await getDb().select().from(companySettings).where(eq(companySettings.id, SETTINGS_ID)).limit(1);
      if (settings && settings.validationStatus !== "VALID") return fallbackSettings();
      return settings ? publicCompanySettings(settings) : fallbackSettings();
    } catch (error) {
      console.warn("[ColdPower] Configuración empresarial persistente no disponible.", error instanceof Error ? error.message : error);
      return fallbackSettings();
    }
  });
}
