function readString(name: string, fallback: string) {
  const value = process.env[name]?.trim();
  return value || fallback;
}

function readNumber(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function readOptionalUrl(name: string): string | null {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

export function parseBoolean(value: string | undefined, fallback = false) {
  if (!value) {
    return fallback;
  }

  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

export const siteConfig = {
  siteUrl: readString("NEXT_PUBLIC_SITE_URL", "https://coldpower.pe").replace(/\/$/, ""),
};

export const companyConfig = {
  name: readString("NEXT_PUBLIC_COMPANY_NAME", "ColdPower"),
  whatsapp: readString("NEXT_PUBLIC_WHATSAPP_NUMBER", "51999999999"),
  contactEmail: readString("NEXT_PUBLIC_CONTACT_EMAIL", "ventas@coldpower.pe"),
  contactPhone: readString("NEXT_PUBLIC_CONTACT_PHONE", "+51 999 999 999"),
  ruc: readString("NEXT_PUBLIC_RUC", "00000000000"),
};

// Redes sociales: por defecto NO se exponen. Solo se muestran si existe una URL real
// configurada por variable de entorno. Así evitamos enlazar a perfiles mock inexistentes.
export const socialConfig = {
  facebook: readOptionalUrl("NEXT_PUBLIC_SOCIAL_FACEBOOK"),
  instagram: readOptionalUrl("NEXT_PUBLIC_SOCIAL_INSTAGRAM"),
  tiktok: readOptionalUrl("NEXT_PUBLIC_SOCIAL_TIKTOK"),
};

export const quoteConfig = {
  quoteRateLimit: {
    max: readNumber("QUOTE_RATE_LIMIT_MAX", 5),
    windowMs: readNumber("QUOTE_RATE_LIMIT_WINDOW_MS", 600000),
  },
  enableApiLog: parseBoolean(process.env.QUOTE_ENABLE_API_LOG, true),
};

/**
 * Protección de datos comerciales placeholder.
 *
 * En desarrollo y preview se permiten valores placeholder (default `allow = true`).
 * En producción real, el deploy debe establecer `NEXT_PUBLIC_ALLOW_PLACEHOLDER_COMPANY_DATA=false`;
 * si quedan placeholders críticos, el build/arranque falla de forma controlada.
 */
const PLACEHOLDER_COMPANY_VALUES = {
  NEXT_PUBLIC_WHATSAPP_NUMBER: "51999999999",
  NEXT_PUBLIC_CONTACT_EMAIL: "ventas@coldpower.pe",
  NEXT_PUBLIC_CONTACT_PHONE: "+51 999 999 999",
  NEXT_PUBLIC_RUC: "00000000000",
} as const;

export const isProduction = process.env.NODE_ENV === "production";

// Default `true`: dev, test y preview funcionan con placeholders. Producción debe ponerlo en `false`.
export const allowPlaceholderCompanyData = parseBoolean(
  process.env.NEXT_PUBLIC_ALLOW_PLACEHOLDER_COMPANY_DATA,
  true,
);

// Marca explícita de entorno preview (opcional). Útil para banners internos o flags.
export const isPreview = parseBoolean(process.env.NEXT_PUBLIC_IS_PREVIEW, false);

/** Devuelve las variables que siguen con valor placeholder crítico. */
export function getPlaceholderCompanyFields(): string[] {
  const resolved: Record<keyof typeof PLACEHOLDER_COMPANY_VALUES, string> = {
    NEXT_PUBLIC_WHATSAPP_NUMBER: companyConfig.whatsapp,
    NEXT_PUBLIC_CONTACT_EMAIL: companyConfig.contactEmail,
    NEXT_PUBLIC_CONTACT_PHONE: companyConfig.contactPhone,
    NEXT_PUBLIC_RUC: companyConfig.ruc,
  };

  return (Object.keys(PLACEHOLDER_COMPANY_VALUES) as Array<keyof typeof PLACEHOLDER_COMPANY_VALUES>)
    .filter((key) => resolved[key] === PLACEHOLDER_COMPANY_VALUES[key])
    .map((key) => key);
}

/** `true` si algún dato comercial crítico sigue siendo placeholder. */
export function isPlaceholderCompanyData(): boolean {
  return getPlaceholderCompanyFields().length > 0;
}

let placeholderWarningEmitted = false;

/**
 * Guard controlado:
 * - Producción + placeholders + NO permitido => lanza error (rompe build/deploy).
 * - Cualquier otro caso con placeholders => aviso interno (server console), sin afectar la UI pública.
 */
export function assertCompanyDataReady(): void {
  const placeholders = getPlaceholderCompanyFields();

  if (placeholders.length === 0) {
    return;
  }

  if (isProduction && !allowPlaceholderCompanyData) {
    throw new Error(
      `ColdPower: datos comerciales placeholder detectados en producción (${placeholders.join(", ")}). ` +
        "Configura los valores reales o establece NEXT_PUBLIC_ALLOW_PLACEHOLDER_COMPANY_DATA=true " +
        "solo para un preview privado intencional.",
    );
  }

  if (!placeholderWarningEmitted && typeof console !== "undefined") {
    placeholderWarningEmitted = true;
    console.warn(
      `[ColdPower] Aviso interno: datos comerciales placeholder en uso (${placeholders.join(", ")}). ` +
        "No publiques en producción real sin reemplazarlos por datos reales.",
    );
  }
}

// Verificación al cargar la configuración (corre en server/build-time).
assertCompanyDataReady();
