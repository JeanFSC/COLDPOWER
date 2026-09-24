export type CompanySettings = {
  legalName?: string | null;
  tradeName?: string | null;
  commercialName?: string | null;
  ruc?: string | null;
  country?: string | null;
  department?: string | null;
  province?: string | null;
  district?: string | null;
  address?: string | null;
  phone?: string | null;
  phones?: string[] | null;
  whatsapp?: string | null;
  email?: string | null;
  salesEmail?: string | null;
  hours?: string | null;
  businessHours?: string | null;
  facebook?: string | null;
  instagram?: string | null;
  tiktok?: string | null;
  website?: string | null;
  socials?: Record<string, string> | null;
  locations?: Array<{ name: string; address?: string }> | null;
  paymentMethods?: string[] | null;
  guaranteeTerms?: string | null;
  coverage?: string | null;
  legalLinks?: Record<string, string> | null;
  legalPagesPublished?: boolean | null;
  logoMediaId?: string | null;
  faviconMediaId?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
};

export const companySettingsFields = [
  "legalName", "tradeName", "commercialName", "ruc", "country", "department", "province", "district", "address", "phone", "phones", "whatsapp", "email", "salesEmail", "hours", "businessHours", "facebook", "instagram", "tiktok", "website", "socials", "locations", "paymentMethods", "guaranteeTerms", "coverage", "legalLinks", "legalPagesPublished", "logoMediaId", "faviconMediaId", "primaryColor", "secondaryColor",
] as const;
export type CompanySettingsField = (typeof companySettingsFields)[number];
export type CompanySettingsAdminResponse = { public: CompanySettings; administrative: Pick<CompanySettings, "legalName" | "ruc" | "country" | "department" | "province" | "district" | "address" | "salesEmail" | "paymentMethods" | "guaranteeTerms" | "coverage" | "legalLinks" | "legalPagesPublished">; version: number; updatedAt: Date | null; updatedBy: string | null; validationStatus: string };

export function emptyCompanySettings(): CompanySettings { return {}; }

export function administrativeCompanySettings(settings: CompanySettings): CompanySettingsAdminResponse["administrative"] {
  return { legalName: clean(settings.legalName), ruc: clean(settings.ruc), country: clean(settings.country), department: clean(settings.department), province: clean(settings.province), district: clean(settings.district), address: clean(settings.address), salesEmail: clean(settings.salesEmail), paymentMethods: settings.paymentMethods?.map((value) => value.trim()).filter(Boolean), guaranteeTerms: clean(settings.guaranteeTerms), coverage: clean(settings.coverage), legalLinks: settings.legalLinks, legalPagesPublished: settings.legalPagesPublished === true };
}

export function toCompanySettingsAdminResponse(settings: CompanySettings & { version?: number; updatedAt?: Date | null; updatedBy?: string | null; validationStatus?: string }): CompanySettingsAdminResponse {
  return { public: publicCompanySettings(settings), administrative: administrativeCompanySettings(settings), version: settings.version ?? 0, updatedAt: settings.updatedAt ?? null, updatedBy: settings.updatedBy ?? null, validationStatus: settings.validationStatus ?? "VALID" };
}

function clean(value: string | null | undefined) { const result = value?.trim(); return result ? result : undefined; }

export function publicCompanySettings(settings: CompanySettings): CompanySettings {
  const phone = clean(settings.phone);
  const phones = settings.phones?.map((item) => clean(item)).filter((item): item is string => Boolean(item));
  const normalizedPhones = phones?.length ? phones : phone ? [phone] : undefined;
  const explicitSocials = {
    facebook: clean(settings.facebook),
    instagram: clean(settings.instagram),
    tiktok: clean(settings.tiktok),
  };
  const legacySocials = settings.socials ? Object.fromEntries(Object.entries(settings.socials).filter(([, url]) => Boolean(clean(url))).map(([key, url]) => [key, clean(url)])) : {};
  const socials = Object.fromEntries(
    Object.entries({ ...legacySocials, ...explicitSocials }).filter(([, url]) => Boolean(url)),
  ) as Record<string, string>;
  const locations = settings.locations?.filter((location) => Boolean(clean(location.name))).map((location) => ({ name: location.name.trim(), address: clean(location.address) }));
  const paymentMethods = settings.paymentMethods?.map((method) => method.trim()).filter(Boolean);
  const legalLinks = settings.legalLinks ? Object.fromEntries(Object.entries(settings.legalLinks).filter(([, url]) => Boolean(clean(url)))) : undefined;
  return {
    legalName: clean(settings.legalName), tradeName: clean(settings.tradeName), commercialName: clean(settings.commercialName), ruc: clean(settings.ruc), country: clean(settings.country), department: clean(settings.department), province: clean(settings.province), district: clean(settings.district), address: clean(settings.address), phone, phones: normalizedPhones, whatsapp: clean(settings.whatsapp), email: clean(settings.email), salesEmail: clean(settings.salesEmail), hours: clean(settings.hours), businessHours: clean(settings.businessHours), facebook: explicitSocials.facebook, instagram: explicitSocials.instagram, tiktok: explicitSocials.tiktok, website: clean(settings.website), socials: Object.keys(socials).length ? socials : undefined, locations: locations?.length ? locations : undefined, paymentMethods: paymentMethods?.length ? paymentMethods : undefined, guaranteeTerms: clean(settings.guaranteeTerms), coverage: clean(settings.coverage), legalLinks: legalLinks && Object.keys(legalLinks).length ? legalLinks : undefined, legalPagesPublished: settings.legalPagesPublished === true,
    logoMediaId: clean(settings.logoMediaId), faviconMediaId: clean(settings.faviconMediaId), primaryColor: clean(settings.primaryColor), secondaryColor: clean(settings.secondaryColor),
  };
}
