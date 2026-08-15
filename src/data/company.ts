import { companyConfig, siteConfig, socialConfig } from "@/lib/env";

export const company = {
  commercialName: companyConfig.name,
  legalName: companyConfig.legalName,
  tradeName: companyConfig.tradeName,
  domain: siteConfig.siteUrl,
  primaryPhone: companyConfig.contactPhone,
  whatsapp: companyConfig.whatsapp,
  commercialEmail: companyConfig.contactEmail,
  address: "",
  schedule: "",
  ruc: companyConfig.ruc,
  socialLinks: { facebook: socialConfig.facebook, instagram: socialConfig.instagram, tiktok: socialConfig.tiktok },
  quoteNotice: "La cotización final será confirmada por un asesor",
} as const;
export type SocialPlatform = keyof typeof company.socialLinks;
export const activeSocialLinks: Array<{ platform: SocialPlatform; url: string }> = (Object.entries(company.socialLinks) as Array<[SocialPlatform, string | null]>).filter((entry): entry is [SocialPlatform, string] => Boolean(entry[1])).map(([platform, url]) => ({ platform, url }));
