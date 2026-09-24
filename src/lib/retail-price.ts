import { and, asc, desc, eq, gt, inArray, isNull, lte, or } from "drizzle-orm";
import type { getDb } from "@/db";
import { productPrices, products } from "@/db/schema";
import { promotionCategories, promotionProducts, promotions } from "@/db/operations-schema";
import { calculatePromotionalUnitPrice } from "@/lib/promotion-pricing";

type Database = ReturnType<typeof getDb>;
type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
export type PriceExecutor = Database | Transaction;
export type RetailPrice = { amount: string; currency: string };
export type PromotionPriceStep = { promotionId: string; baseUnitPrice: string; discountAmount: string; finalUnitPrice: string };
export type RetailPriceWithPromotion = RetailPrice & { baseAmount: string; discountAmount: string; promotionIds: string[]; promotionSteps: PromotionPriceStep[] };

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
        eq(productPrices.status, "ACTIVE"),
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

export async function loadRetailPricesWithPromotions(executor: PriceExecutor, productIds: string[], now = new Date()) {
  const basePrices = await loadRetailPrices(executor, productIds, now);
  const result = new Map<string, RetailPriceWithPromotion>();
  if (!productIds.length || !basePrices.size) return result;
  const [productRows, candidateRows] = await Promise.all([
    executor.select({ id: products.id, categoryId: products.categoryId }).from(products).where(inArray(products.id, productIds)),
    executor.select().from(promotions).where(and(eq(promotions.status, "ACTIVE"), inArray(promotions.approvalStatus, ["APPROVED", "NOT_REQUIRED"]), lte(promotions.startsAt, now), or(isNull(promotions.endsAt), gt(promotions.endsAt, now)))).orderBy(desc(promotions.priority), asc(promotions.startsAt)),
  ]);
  if (!candidateRows.length) {
    for (const [productId, price] of basePrices) result.set(productId, { ...price, baseAmount: price.amount, discountAmount: "0.00", promotionIds: [], promotionSteps: [] });
    return result;
  }
  const promotionIds = candidateRows.map((promotion) => promotion.id);
  const [directRows, categoryRows, scopedProductRows, scopedCategoryRows] = await Promise.all([
    executor.select({ promotionId: promotionProducts.promotionId, productId: promotionProducts.productId }).from(promotionProducts).where(and(inArray(promotionProducts.promotionId, promotionIds), inArray(promotionProducts.productId, productIds))),
    executor.select({ promotionId: promotionCategories.promotionId, categoryId: promotionCategories.categoryId }).from(promotionCategories).where(inArray(promotionCategories.promotionId, promotionIds)),
    executor.select({ promotionId: promotionProducts.promotionId }).from(promotionProducts).where(inArray(promotionProducts.promotionId, promotionIds)),
    executor.select({ promotionId: promotionCategories.promotionId }).from(promotionCategories).where(inArray(promotionCategories.promotionId, promotionIds)),
  ]);
  const scopedIds = new Set([...scopedProductRows, ...scopedCategoryRows].map((row) => row.promotionId));
  for (const [productId, base] of basePrices) {
    const product = productRows.find((row) => row.id === productId);
    const direct = new Set(directRows.filter((row) => row.productId === productId).map((row) => row.promotionId));
    const category = new Set(categoryRows.filter((row) => row.categoryId === product?.categoryId).map((row) => row.promotionId));
    const eligible = candidateRows.filter((promotion) => !scopedIds.has(promotion.id) || direct.has(promotion.id) || category.has(promotion.id));
    const exclusive = eligible.filter((promotion) => promotion.policy === "EXCLUSIVE");
    const stackable = eligible.filter((promotion) => promotion.policy === "STACKABLE");
    const bestValue = eligible.filter((promotion) => promotion.policy === "BEST_VALUE");
    const selected = [...stackable];
    if (exclusive.length) selected.push(exclusive[0]);
    else if (bestValue.length) selected.push(bestValue.map((promotion) => ({ promotion, price: calculatePromotionalUnitPrice(promotion, base.amount) })).sort((a, b) => Number(a.price.finalUnitPrice) - Number(b.price.finalUnitPrice))[0].promotion);
    let current = base.amount;
    const promotionSteps: PromotionPriceStep[] = [];
    for (const promotion of selected) {
      const step = calculatePromotionalUnitPrice(promotion, current);
      promotionSteps.push({ promotionId: promotion.id, baseUnitPrice: step.baseUnitPrice, discountAmount: step.discountAmount, finalUnitPrice: step.finalUnitPrice });
      current = step.finalUnitPrice;
    }
    const final = calculatePromotionalUnitPrice({ id: "combined", type: "SPECIAL_PRICE", discountValue: current }, base.amount);
    result.set(productId, { ...base, amount: current, baseAmount: base.amount, discountAmount: final.discountAmount, promotionIds: selected.map((promotion) => promotion.id), promotionSteps });
  }
  return result;
}
