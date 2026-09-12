import type { PricingEffectiveStatus, PricingItem, PricingPriceRecord, PricingPriceType } from "@/lib/pricing-contract";

export const pricingTypeLabels: Record<PricingPriceType, string> = {
  COST: "Costo",
  RETAIL: "Minorista",
  WHOLESALE: "Mayorista",
  MINIMUM: "Mínimo autorizado",
  SPECIAL: "Precio especial",
};

export const pricingStatusLabels: Record<PricingEffectiveStatus, string> = {
  CURRENT: "Vigente",
  SCHEDULED: "Programado",
  EXPIRED: "Vencido",
  INACTIVE: "Inactivo",
  ARCHIVED: "Archivado",
  MISSING: "Sin precio",
};

export function isPriceEffectiveAt(price: Pick<PricingPriceRecord, "active" | "status" | "validFrom" | "validUntil">, at = new Date()) {
  return price.active && price.status === "ACTIVE" && price.validFrom <= at && (!price.validUntil || price.validUntil > at);
}

export function getPriceEffectiveStatus(price: Pick<PricingPriceRecord, "active" | "status" | "validFrom" | "validUntil"> | null | undefined, at = new Date()): PricingEffectiveStatus {
  if (!price) return "MISSING";
  if (price.status === "ARCHIVED" || !price.active) return price.status === "ARCHIVED" ? "ARCHIVED" : "INACTIVE";
  if (price.status !== "ACTIVE") return "INACTIVE";
  if (price.validFrom > at) return "SCHEDULED";
  if (price.validUntil && price.validUntil <= at) return "EXPIRED";
  return "CURRENT";
}

function currentFirst(prices: PricingPriceRecord[], type: PricingPriceType, at: Date) {
  return prices
    .filter((price) => price.priceType === type)
    .sort((a, b) => b.validFrom.getTime() - a.validFrom.getTime())
    .find((price) => isPriceEffectiveAt(price, at))
    ?? prices.filter((price) => price.priceType === type).sort((a, b) => b.validFrom.getTime() - a.validFrom.getTime())[0]
    ?? null;
}

export function resolvePricingStates(prices: PricingPriceRecord[], includeCost = false, at = new Date()) {
  const result = {
    retail: currentFirst(prices, "RETAIL", at),
    wholesale: currentFirst(prices, "WHOLESALE", at),
    minimum: currentFirst(prices, "MINIMUM", at),
    special: currentFirst(prices, "SPECIAL", at),
    ...(includeCost ? { cost: currentFirst(prices, "COST", at) } : {}),
  } as {
    retail: PricingPriceRecord | null;
    wholesale: PricingPriceRecord | null;
    minimum: PricingPriceRecord | null;
    special: PricingPriceRecord | null;
    cost?: PricingPriceRecord | null;
  };
  return result;
}

export function getProductPricingStatus(item: Pick<PricingItem, "pricing" | "prices">, at = new Date()): PricingEffectiveStatus {
  const retail = item.pricing?.retail ?? item.prices?.find((price) => price.priceType === "RETAIL") ?? null;
  return getPriceEffectiveStatus(retail, at);
}

export function formatPrice(amount: string | number | null | undefined, currency = "PEN") {
  if (amount === null || amount === undefined || amount === "") return "—";
  const numeric = Number(amount);
  if (!Number.isFinite(numeric)) return "—";
  return new Intl.NumberFormat("es-PE", { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(numeric);
}

export function formatValidity(validFrom: Date | string, validUntil?: Date | string | null) {
  const start = new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Lima" }).format(new Date(validFrom));
  if (!validUntil) return `Desde ${start}`;
  return `${start} — ${new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeZone: "America/Lima" }).format(new Date(validUntil))}`;
}

export function getPriceDelta(next: string | number, previous: string | number | null | undefined) {
  if (previous === null || previous === undefined || Number(previous) === 0) return null;
  return ((Number(next) - Number(previous)) / Number(previous)) * 100;
}
