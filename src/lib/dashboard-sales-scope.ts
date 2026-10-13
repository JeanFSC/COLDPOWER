import { and, eq, exists, gte, lt, or, type SQL } from "drizzle-orm";
import type { getDb } from "@/db";
import { products } from "@/db/schema";
import { opportunities } from "@/db/crm-schema";
import { orders, saleItems, sales } from "@/db/sales-schema";
import type { DashboardFilters } from "@/lib/dashboard-contract";
type Window = { from: Date; to: Date };
function conditionList(...conditions: Array<SQL | undefined>) { return conditions.filter(Boolean) as SQL[]; }
export function productConditions(filters: DashboardFilters) {
  const conditions: SQL[] = [];
  if (filters.productId) conditions.push(eq(products.id, filters.productId));
  if (filters.categoryId) conditions.push(or(eq(products.categoryId, filters.categoryId), eq(products.editorialCategoryId, filters.categoryId))!);
  if (filters.familyId) conditions.push(or(eq(products.familyId, filters.familyId), eq(products.editorialFamilyId, filters.familyId))!);
  if (filters.brandId) conditions.push(or(eq(products.brandId, filters.brandId), eq(products.editorialBrandId, filters.brandId))!);
  return conditions.length ? and(...conditions) : undefined;
}
export function salesConditions(db: ReturnType<typeof getDb>, filters: DashboardFilters, window: Window, currency?: string) {
  const conditions = conditionList(eq(sales.status, "CONFIRMED"), gte(sales.createdAt, window.from), lt(sales.createdAt, window.to));
  if (currency) conditions.push(eq(sales.currency, currency));
  if (filters.sellerId) conditions.push(eq(sales.sellerId, filters.sellerId));
  if (filters.customerId) conditions.push(eq(sales.customerId, filters.customerId));
  if (filters.channel) conditions.push(exists(db.select({ id: opportunities.id }).from(opportunities).where(and(eq(opportunities.id, sales.opportunityId), eq(opportunities.origin, filters.channel as never)))));
  const selected = productConditions(filters);
  if (selected) conditions.push(exists(db.select({ id: saleItems.id }).from(saleItems).innerJoin(products, eq(saleItems.productId, products.id)).where(and(eq(saleItems.saleId, sales.id), selected))));
  if (filters.locationId || filters.orderStatus) conditions.push(exists(db.select({ id: orders.id }).from(orders).where(and(eq(orders.saleId, sales.id), filters.locationId ? eq(orders.locationId, filters.locationId) : undefined, filters.orderStatus ? eq(orders.status, filters.orderStatus as never) : undefined))));
  return conditions;
}
