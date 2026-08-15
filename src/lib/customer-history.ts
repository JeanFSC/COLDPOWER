import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { products } from "@/db/schema";
import { customers } from "@/db/crm-schema";
import { orderItems, orders } from "@/db/sales-schema";

export async function listPurchasedProductsForUser(userId: string) {
  const rows = await getDb().select({
    productId: orderItems.productId,
    slug: products.slug,
    sku: orderItems.skuSnapshot,
    name: orderItems.productNameSnapshot,
    lastOrderId: orders.id,
    lastOrderCode: orders.code,
    lastPurchasedAt: orders.createdAt,
    totalQuantity: orderItems.quantity,
  }).from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .innerJoin(customers, eq(orders.customerId, customers.id))
    .innerJoin(products, eq(orderItems.productId, products.id))
    .where(and(eq(customers.userId, userId), inArray(orders.status, ["PAID", "PREPARING", "READY_FOR_PICKUP", "SHIPPED", "DELIVERED"])))
    .orderBy(desc(orders.createdAt))
    .limit(1000);
  const unique = new Map<string, typeof rows[number]>();
  for (const row of rows) {
    const previous = unique.get(row.productId);
    unique.set(row.productId, previous ? { ...previous, totalQuantity: previous.totalQuantity + row.totalQuantity } : row);
  }
  return [...unique.values()];
}

export async function listOrderItemsForUser(userId: string, orderId: string) {
  return getDb().select({ item: orderItems, product: products })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .innerJoin(customers, eq(orders.customerId, customers.id))
    .innerJoin(products, eq(orderItems.productId, products.id))
    .where(and(eq(customers.userId, userId), eq(orders.id, orderId)));
}
