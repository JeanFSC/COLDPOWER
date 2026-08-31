function readString(name: string, fallback: string) { const value = process.env[name]?.trim(); return value || fallback; }
function readNumber(name: string, fallback: number) { const value = Number(process.env[name]); return Number.isFinite(value) && value > 0 ? value : fallback; }
function readOptionalUrl(name: string): string | null { const value = process.env[name]?.trim(); return value ? value : null; }
export function parseBoolean(value: string | undefined, fallback = false) { if (!value) return fallback; return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase()); }
export const siteConfig = { siteUrl: readString("NEXT_PUBLIC_SITE_URL", "https://coldpower.pe").replace(/\/$/, "") };
function readOptionalString(name: string): string | null { const value = process.env[name]?.trim(); return value || null; }
export const companyConfig = { name: readString("NEXT_PUBLIC_COMPANY_NAME", "ColdPower"), legalName: readOptionalString("NEXT_PUBLIC_LEGAL_NAME"), tradeName: readOptionalString("NEXT_PUBLIC_TRADE_NAME"), whatsapp: readString("NEXT_PUBLIC_WHATSAPP_NUMBER", ""), contactEmail: readString("NEXT_PUBLIC_CONTACT_EMAIL", ""), contactPhone: readString("NEXT_PUBLIC_CONTACT_PHONE", ""), ruc: readString("NEXT_PUBLIC_RUC", "") };
export const socialConfig = { facebook: readOptionalUrl("NEXT_PUBLIC_SOCIAL_FACEBOOK"), instagram: readOptionalUrl("NEXT_PUBLIC_SOCIAL_INSTAGRAM"), tiktok: readOptionalUrl("NEXT_PUBLIC_SOCIAL_TIKTOK") };
export const quoteConfig = { quoteRateLimit: { max: readNumber("QUOTE_RATE_LIMIT_MAX", 5), windowMs: readNumber("QUOTE_RATE_LIMIT_WINDOW_MS", 600000) }, enableApiLog: parseBoolean(process.env.QUOTE_ENABLE_API_LOG, true) };
export const whatsappRateLimitConfig = { max: readNumber("WHATSAPP_RATE_LIMIT_MAX", 5), windowMs: readNumber("WHATSAPP_RATE_LIMIT_WINDOW_MS", 600000) };
export const authConfig = { clerkPublishableKey: readOptionalUrl("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"), clerkSecretKey: readOptionalUrl("CLERK_SECRET_KEY"), signInUrl: readString("NEXT_PUBLIC_CLERK_SIGN_IN_URL", "/sign-in"), signUpUrl: readString("NEXT_PUBLIC_CLERK_SIGN_UP_URL", "/sign-up"), webhookSecret: readOptionalUrl("CLERK_WEBHOOK_SECRET") };
export const isAuthConfigured = Boolean(authConfig.clerkPublishableKey && authConfig.clerkSecretKey);
export const databaseConfig = { url: readOptionalUrl("DATABASE_URL"), poolMax: readNumber("DATABASE_POOL_MAX", 20) };
const PLACEHOLDER_COMPANY_VALUES = { NEXT_PUBLIC_WHATSAPP_NUMBER: "51999999999", NEXT_PUBLIC_CONTACT_EMAIL: "ventas@coldpower.pe", NEXT_PUBLIC_CONTACT_PHONE: "+51 999 999 999", NEXT_PUBLIC_RUC: "00000000000" } as const;
export const isProduction = process.env.NODE_ENV === "production";
export const allowPlaceholderCompanyData = parseBoolean(process.env.NEXT_PUBLIC_ALLOW_PLACEHOLDER_COMPANY_DATA, false);
export const isPreview = parseBoolean(process.env.NEXT_PUBLIC_IS_PREVIEW, false);
export function getPlaceholderCompanyFields(): string[] { const resolved = { NEXT_PUBLIC_WHATSAPP_NUMBER: companyConfig.whatsapp, NEXT_PUBLIC_CONTACT_EMAIL: companyConfig.contactEmail, NEXT_PUBLIC_CONTACT_PHONE: companyConfig.contactPhone, NEXT_PUBLIC_RUC: companyConfig.ruc }; return (Object.keys(PLACEHOLDER_COMPANY_VALUES) as Array<keyof typeof PLACEHOLDER_COMPANY_VALUES>).filter((key) => resolved[key] === PLACEHOLDER_COMPANY_VALUES[key]); }
export function isPlaceholderCompanyData() { return getPlaceholderCompanyFields().length > 0; }
let placeholderWarningEmitted = false;
export function assertCompanyDataReady() { const placeholders = getPlaceholderCompanyFields(); if (!placeholders.length) return; if (isProduction && !allowPlaceholderCompanyData) throw new Error(`ColdPower: datos comerciales placeholder detectados en producción (${placeholders.join(", ")}).`); if (!placeholderWarningEmitted && typeof console !== "undefined") { placeholderWarningEmitted = true; console.warn(`[ColdPower] Aviso interno: datos comerciales placeholder en uso (${placeholders.join(", ")}).`); } }
assertCompanyDataReady();
