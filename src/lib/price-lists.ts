import { and, eq, lt, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { productPrices } from "@/db/schema";

const PRICE_TYPE_LABELS: Record<string, string> = {
  COST: "Costo",
  RETAIL: "Minorista",
  WHOLESALE: "Mayorista",
  MINIMUM: "Mínimo autorizado",
  SPECIAL: "Especial",
};

export type PriceListSummary = { priceType: string; label: string; activePrices: number };

// A "lista de precio" here is a real price_type in active use across product_prices — not a
// separate concept, since the catalog doesn't model price lists as their own entity. Counting
// distinct active types in use is the honest equivalent of "how many pricing lists exist."
export async function listActivePriceTypes(): Promise<PriceListSummary[]> {
  const rows = await getDb()
    .select({ priceType: productPrices.priceType, count: sql<string>`count(*)` })
    .from(productPrices)
    .where(and(eq(productPrices.active, true), eq(productPrices.status, "ACTIVE")))
    .groupBy(productPrices.priceType)
    .orderBy(productPrices.priceType);
  return rows.map((row) => ({ priceType: row.priceType, label: PRICE_TYPE_LABELS[row.priceType] ?? row.priceType, activePrices: Number(row.count ?? 0) }));
}

export async function countActivePriceLists(): Promise<number> {
  const rows = await listActivePriceTypes();
  return rows.length;
}

// Proxy for "how many price-type lists existed 30 days ago" — same approximation already used
// for Stock crítico and the dashboard's snapshot KPIs: count distinct active price types whose
// record already existed before the cutoff, using the real createdAt column (no history table
// tracks point-in-time price-list counts, so this is the honest available signal).
export async function countActivePriceTypesBefore(cutoff: Date): Promise<number> {
  const rows = await getDb()
    .select({ priceType: productPrices.priceType })
    .from(productPrices)
    .where(and(eq(productPrices.active, true), eq(productPrices.status, "ACTIVE"), lt(productPrices.createdAt, cutoff)))
    .groupBy(productPrices.priceType);
  return rows.length;
}
