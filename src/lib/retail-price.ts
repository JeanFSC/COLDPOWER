import { and, desc, eq, gt, inArray, isNull, lte, or } from "drizzle-orm";
import type { getDb } from "@/db";
import { productPrices } from "@/db/schema";

type Database = ReturnType<typeof getDb>;
type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
export type PriceExecutor = Database | Transaction;
export type RetailPrice = { amount: string; currency: string };

// Single source for the price a customer is actually charged. The purchase cart shows the
// same value checkout will charge, so the two can never drift apart.
export async function loadRetailPrices(executor: PriceExecutor, productIds: string[], now = new Date()) {
  const result = new Map<string, RetailPrice>();
  if (!productIds.length) return result;
  const rows = await executor
    .select({ productId: productPrices.productId, amount: productPrices.amount, currency: productPrices.currency })
    .from(productPrices)
    .where(
      and(
        inArray(productPrices.productId, productIds),
        eq(productPrices.priceType, "RETAIL"),
        eq(productPrices.active, true),
        lte(productPrices.validFrom, now),
        or(isNull(productPrices.validUntil), gt(productPrices.validUntil, now)),
      ),
    )
    .orderBy(desc(productPrices.validFrom));
  for (const row of rows) {
    if (!result.has(row.productId)) result.set(row.productId, { amount: Number(row.amount).toFixed(2), currency: row.currency });
  }
  return result;
}
