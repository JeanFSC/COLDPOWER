import { and, count, desc, eq, gte, isNull, lt, notInArray, inArray, or, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { inventoryBalances, locations, priceHistory, productPrices, products, quoteItems, quotes } from "@/db/schema";
import { opportunityItems, opportunities } from "@/db/crm-schema";
import { saleItems, sales } from "@/db/sales-schema";

export type ProductAnalyticsFilters = { from?: Date; to?: Date };

function windowFor(filters: ProductAnalyticsFilters) {
  const to = filters.to ?? new Date();
  const from = filters.from ?? new Date(to.getTime() - 30 * 86400000);
  return { from, to };
}

function rangeCondition(column: typeof sales.createdAt, from: Date, to: Date) {
  return and(gte(column, from), lt(column, to));
}

export async function getProductAnalytics(productId: string, filters: ProductAnalyticsFilters = {}) {
  const db = getDb();
  const { from, to } = windowFor(filters);
  const [product] = await db.select({ id: products.id, sku: products.sku, name: products.commercialName, normalizedName: products.normalizedName }).from(products).where(eq(products.id, productId)).limit(1);
  if (!product) return undefined;

  const [inventory, todaySales, sevenDaySales, thirtyDaySales, rangeSales, openQuotes, convertedQuotes, openOpportunities, prices, latestSold, currentCost, history] = await Promise.all([
    db.select({ locationId: inventoryBalances.locationId, location: locations.name, onHand: inventoryBalances.onHand, reserved: inventoryBalances.reserved, minimumStock: inventoryBalances.minimumStock, available: sql<number>`${inventoryBalances.onHand} - ${inventoryBalances.reserved}` }).from(inventoryBalances).innerJoin(locations, eq(inventoryBalances.locationId, locations.id)).where(eq(inventoryBalances.productId, productId)).orderBy(locations.name),
    aggregateSales(productId, new Date(new Date().setHours(0, 0, 0, 0)), new Date()),
    aggregateSales(productId, new Date(Date.now() - 7 * 86400000), new Date()),
    aggregateSales(productId, new Date(Date.now() - 30 * 86400000), new Date()),
    aggregateSales(productId, from, to),
    db.select({ count: count(), units: sql<string>`coalesce(sum(${quoteItems.quantity}), 0)` }).from(quoteItems).innerJoin(quotes, eq(quoteItems.quoteId, quotes.id)).where(and(eq(quoteItems.productId, productId), notInArray(quotes.status, ["cerrada", "cerrado", "convertida"]))),
    db.select({ count: count(), units: sql<string>`coalesce(sum(${quoteItems.quantity}), 0)` }).from(quoteItems).innerJoin(quotes, eq(quoteItems.quoteId, quotes.id)).where(and(eq(quoteItems.productId, productId), inArray(quotes.status, ["convertida"]))),
    db.select({ count: count() }).from(opportunityItems).innerJoin(opportunities, eq(opportunityItems.opportunityId, opportunities.id)).where(and(eq(opportunityItems.productId, productId), notInArray(opportunities.stage, ["CLOSED", "LOST", "CANCELLED"]))),
    db.select({ priceType: productPrices.priceType, amount: productPrices.amount, currency: productPrices.currency, validFrom: productPrices.validFrom, validUntil: productPrices.validUntil }).from(productPrices).where(and(eq(productPrices.productId, productId), eq(productPrices.active, true), sql`${productPrices.validFrom} <= now()`, or(isNull(productPrices.validUntil), sql`${productPrices.validUntil} > now()`))).orderBy(desc(productPrices.validFrom)),
    db.select({ amount: saleItems.unitPrice, currency: saleItems.currency }).from(saleItems).innerJoin(sales, eq(saleItems.saleId, sales.id)).where(and(eq(saleItems.productId, productId), notInArray(sales.status, ["CANCELLED"]))).orderBy(desc(sales.createdAt)).limit(1),
    db.select({ amount: productPrices.amount, currency: productPrices.currency }).from(productPrices).where(and(eq(productPrices.productId, productId), eq(productPrices.priceType, "COST"), eq(productPrices.active, true), sql`${productPrices.validFrom} <= now()`, or(isNull(productPrices.validUntil), sql`${productPrices.validUntil} > now()`))).orderBy(desc(productPrices.validFrom)).limit(1),
    db.select({ priceType: priceHistory.priceType, previousAmount: priceHistory.previousAmount, newAmount: priceHistory.newAmount, currency: priceHistory.currency, reason: priceHistory.reason, createdAt: priceHistory.createdAt }).from(priceHistory).where(eq(priceHistory.productId, productId)).orderBy(desc(priceHistory.createdAt)).limit(20),
  ]);

  const retail = prices.find((price) => price.priceType === "RETAIL");
  const retailHistory = history.filter((entry) => entry.priceType === "RETAIL");
  const historicalAveragePrice = retailHistory.length ? retailHistory.reduce((sum, entry) => sum + Number(entry.newAmount), 0) / retailHistory.length : null;
  const wholesale = prices.find((price) => price.priceType === "WHOLESALE");
  const cost = currentCost[0] ? Number(currentCost[0].amount) : null;
  const soldPrice = latestSold[0] ? Number(latestSold[0].amount) : null;
  const margin = cost !== null && soldPrice !== null ? soldPrice - cost : null;
  const units30 = thirtyDaySales.units;
  const rotation = units30 === 0 ? "SIN_MOVIMIENTO" : units30 >= 30 ? "ALTA" : units30 >= 10 ? "MEDIA" : "BAJA";

  return {
    product: { ...product, name: product.name || product.normalizedName },
    inventory: inventory.map((row) => ({ ...row, available: Number(row.available) })),
    salesToday: todaySales,
    sales7Days: sevenDaySales,
    sales30Days: thirtyDaySales,
    salesRange: { ...rangeSales, from, to },
    quotes: Number(openQuotes[0]?.count ?? 0),
    convertedQuotes: Number(convertedQuotes[0]?.count ?? 0),
    quotedUnits: Number(openQuotes[0]?.units ?? 0) + Number(convertedQuotes[0]?.units ?? 0),
    convertedQuotedUnits: Number(convertedQuotes[0]?.units ?? 0),
    quoteConversionTotal: Number(openQuotes[0]?.count ?? 0) + Number(convertedQuotes[0]?.count ?? 0),
    opportunities: Number(openOpportunities[0]?.count ?? 0),
    conversion: Number(openQuotes[0]?.count ?? 0) + Number(convertedQuotes[0]?.count ?? 0) > 0 ? Number(convertedQuotes[0]?.count ?? 0) / (Number(openQuotes[0]?.count ?? 0) + Number(convertedQuotes[0]?.count ?? 0)) : null,
    currentPrice: retail ? { amount: Number(retail.amount), currency: retail.currency } : null,
    historicalAveragePrice: retailHistory.length ? { amount: historicalAveragePrice, currency: retailHistory[0].currency } : null,
    wholesalePrice: wholesale ? { amount: Number(wholesale.amount), currency: wholesale.currency } : null,
    lastSoldPrice: latestSold[0] ? { amount: soldPrice, currency: latestSold[0].currency } : null,
    cost: currentCost[0] ? { amount: cost, currency: currentCost[0].currency } : null,
    margin,
    rotation,
    priceHistory: history,
  };

  async function aggregateSales(id: string, start: Date, end: Date) {
    const [row] = await db.select({ revenue: sql<string>`coalesce(sum(${saleItems.lineTotal}), 0)`, units: sql<string>`coalesce(sum(${saleItems.quantity}), 0)`, orders: count() }).from(saleItems).innerJoin(sales, eq(saleItems.saleId, sales.id)).where(and(eq(saleItems.productId, id), notInArray(sales.status, ["CANCELLED"]), rangeCondition(sales.createdAt, start, end)));
    return { revenue: Number(row?.revenue ?? 0), units: Number(row?.units ?? 0), orders: Number(row?.orders ?? 0) };
  }
}




