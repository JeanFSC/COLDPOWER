import { branches } from "@/data/branches";
import { companyConfig, siteConfig, socialConfig } from "@/lib/env";

const primaryBranch = branches[0];

export const company = {
  commercialName: companyConfig.name,
  legalName: companyConfig.name,
  domain: siteConfig.siteUrl,
  primaryPhone: companyConfig.contactPhone || primaryBranch.phone,
  whatsapp: companyConfig.whatsapp || primaryBranch.whatsapp,
  commercialEmail: companyConfig.contactEmail,
  address: primaryBranch.address,
  schedule: primaryBranch.schedule,
  ruc: companyConfig.ruc,
  // Solo se exponen redes con URL real configurada por entorno. Por defecto: null (no se renderiza).
  socialLinks: {
    facebook: socialConfig.facebook,
    instagram: socialConfig.instagram,
    tiktok: socialConfig.tiktok,
  },
  quoteNotice: "La cotización final será confirmada por un asesor",
} as const;

export type SocialPlatform = keyof typeof company.socialLinks;

/**
 * Lista de redes sociales con URL real configurada.
 * Si está vacía, los componentes NO deben renderizar bloque de redes (evita links mock).
 */
export const activeSocialLinks: Array<{ platform: SocialPlatform; url: string }> = (
  Object.entries(company.socialLinks) as Array<[SocialPlatform, string | null]>
)
  .filter((entry): entry is [SocialPlatform, string] => Boolean(entry[1]))
  .map(([platform, url]) => ({ platform, url }));
