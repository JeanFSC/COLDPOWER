import { alias } from "drizzle-orm/pg-core";
import { and, asc, count, desc, eq, exists, gte, ilike, inArray, lt, or, sum, type SQL } from "drizzle-orm";
import { getDb } from "@/db";
import { auditLogs, inventoryReservations, locations, quotes, users } from "@/db/schema";
import { customers } from "@/db/crm-schema";
import { orderItems, orderStatusHistory, orders, payments, sales } from "@/db/sales-schema";
import type { OrderListItem, OrdersFilters, OrdersPageResponse } from "@/lib/orders-contract";

const defaultPageSize = 25;
const maxPageSize = 100;
const seller = alias(users, "orders_seller");
const paymentPriority: Record<string, number> = { CONFIRMED: 5, APPROVED: 5, UNDER_REVIEW: 4, PENDING: 3, REFUNDED: 2, REJECTED: 1, CANCELLED: 0, ERROR: 0 };

function pageValues(page?: number, pageSize?: number) { return { page: Math.max(1, Math.floor(page ?? 1)), pageSize: Math.min(maxPageSize, Math.max(1, Math.floor(pageSize ?? defaultPageSize))) }; }
function dayStart(value: string) { return new Date(`${value}T00:00:00-05:00`); }
function dayAfter(value: string) { return new Date(dayStart(value).getTime() + 86_400_000); }
function numberValue(value: unknown) { return Number(value ?? 0); }
function paymentState(rows: Array<{ status: string }>) { return rows.reduce<string | null>((current, row) => !current || (paymentPriority[row.status] ?? -1) > (paymentPriority[current] ?? -1) ? row.status : current, null); }

function whereOrders(db: ReturnType<typeof getDb>, filters: OrdersFilters) {
  const conditions: SQL[] = [];
  if (filters.query) { const pattern = `%${filters.query.trim()}%`; conditions.push(or(ilike(orders.code, pattern), ilike(orders.customerNameSnapshot, pattern), ilike(customers.name, pattern), exists(db.select({ id: orderItems.id }).from(orderItems).where(and(eq(orderItems.orderId, orders.id), or(ilike(orderItems.skuSnapshot, pattern), ilike(orderItems.productNameSnapshot, pattern))!))))!); }
  if (filters.status) conditions.push(eq(orders.status, filters.status));
  if (filters.customerId) conditions.push(eq(orders.customerId, filters.customerId));
  if (filters.sellerId) conditions.push(eq(orders.sellerId, filters.sellerId));
  if (filters.deliveryMethod) conditions.push(eq(orders.deliveryMethod, filters.deliveryMethod));
  if (filters.locationId) conditions.push(eq(orders.locationId, filters.locationId));
  if (filters.currency) conditions.push(eq(orders.currency, filters.currency));
  if (filters.paymentStatus) conditions.push(exists(db.select({ id: payments.id }).from(payments).where(and(eq(payments.orderId, orders.id), eq(payments.status, filters.paymentStatus as (typeof payments.status.enumValues)[number])))));
  if (filters.createdFrom) conditions.push(gte(orders.createdAt, dayStart(filters.createdFrom)));
  if (filters.createdTo) conditions.push(lt(orders.createdAt, dayAfter(filters.createdTo)));
  return conditions.length ? and(...conditions) : undefined;
}

export async function getOrdersPage(filters: OrdersFilters = {}): Promise<OrdersPageResponse> {
  const { page, pageSize } = pageValues(filters.page, filters.pageSize);
  const db = getDb();
  const where = whereOrders(db, filters);
  const [rows, totalRows, statusRows, amountRow, paidAmountRow, statusFacets, deliveryFacets, currencyFacets] = await Promise.all([
    db.select({ order: orders, customerName: customers.name, customerEmail: customers.email, sellerName: seller.name, sellerEmail: seller.email, locationName: locations.name, quoteId: quotes.id, quoteTrackingCode: quotes.trackingCode }).from(orders).innerJoin(customers, eq(orders.customerId, customers.id)).leftJoin(seller, eq(orders.sellerId, seller.id)).leftJoin(locations, eq(orders.locationId, locations.id)).leftJoin(sales, eq(orders.saleId, sales.id)).leftJoin(quotes, eq(sales.quoteId, quotes.id)).where(where).orderBy(desc(orders.updatedAt), asc(orders.code)).limit(pageSize).offset((page - 1) * pageSize),
    db.select({ total: count(orders.id) }).from(orders).innerJoin(customers, eq(orders.customerId, customers.id)).where(where),
    db.select({ status: orders.status, total: count(orders.id) }).from(orders).innerJoin(customers, eq(orders.customerId, customers.id)).where(where).groupBy(orders.status),
    db.select({ total: sum(orders.total) }).from(orders).innerJoin(customers, eq(orders.customerId, customers.id)).where(where),
    db.select({ total: sum(orders.total) }).from(orders).innerJoin(customers, eq(orders.customerId, customers.id)).where(and(where, eq(orders.status, "PAID"))),
    db.selectDistinct({ value: orders.status }).from(orders).innerJoin(customers, eq(orders.customerId, customers.id)).where(where).orderBy(orders.status),
    db.selectDistinct({ value: orders.deliveryMethod }).from(orders).innerJoin(customers, eq(orders.customerId, customers.id)).where(where).orderBy(orders.deliveryMethod),
    db.selectDistinct({ value: orders.currency }).from(orders).innerJoin(customers, eq(orders.customerId, customers.id)).where(where).orderBy(orders.currency),
  ]);
  const orderIds = rows.map((row) => row.order.id);
  const [itemRows, paymentRows] = await Promise.all([
    orderIds.length ? db.select({ orderId: orderItems.orderId, reservationId: orderItems.reservationId }).from(orderItems).where(inArray(orderItems.orderId, orderIds)) : Promise.resolve([]),
    orderIds.length ? db.select({ orderId: payments.orderId, status: payments.status }).from(payments).where(inArray(payments.orderId, orderIds)) : Promise.resolve([]),
  ]);
  const lineCounts = new Map<string, number>();
  const reservationCounts = new Map<string, number>();
  for (const row of itemRows) { lineCounts.set(row.orderId, (lineCounts.get(row.orderId) ?? 0) + 1); if (row.reservationId) reservationCounts.set(row.orderId, (reservationCounts.get(row.orderId) ?? 0) + 1); }
  const paymentsByOrder = new Map<string, Array<{ status: string }>>();
  for (const row of paymentRows) paymentsByOrder.set(row.orderId, [...(paymentsByOrder.get(row.orderId) ?? []), { status: row.status }]);
  const items: OrderListItem[] = rows.map((row) => ({ ...row.order, customerName: row.customerName, customerPhone: row.order.customerPhoneSnapshot, customerEmail: row.customerEmail ?? row.order.customerEmailSnapshot, sellerName: row.sellerName, sellerEmail: row.sellerEmail, locationName: row.locationName, saleId: row.order.saleId, quoteId: row.quoteId, quoteTrackingCode: row.quoteTrackingCode, lineCount: lineCounts.get(row.order.id) ?? 0, reservationCount: reservationCounts.get(row.order.id) ?? 0, paymentStatus: paymentState(paymentsByOrder.get(row.order.id) ?? []) }));
  const totalItems = numberValue(totalRows[0]?.total);
  const totalAmount = numberValue(amountRow[0]?.total);
  const paid = numberValue(statusRows.find((row) => row.status === "PAID")?.total);
  const statusMap = new Map(statusRows.map((row) => [row.status, numberValue(row.total)]));
  const pendingPayment = statusMap.get("PAYMENT_PENDING") ?? 0;
  return { items, page: Math.min(page, Math.max(1, Math.ceil(totalItems / pageSize))), pageSize, totalItems, totalPages: Math.max(1, Math.ceil(totalItems / pageSize)), metrics: { total: totalItems, new: statusMap.get("NEW") ?? 0, preparing: statusMap.get("PREPARING") ?? 0, inTransit: (statusMap.get("IN_TRANSIT") ?? 0) + (statusMap.get("SHIPPED") ?? 0), delivered: statusMap.get("DELIVERED") ?? 0, pendingPayment, pending: pendingPayment + (statusMap.get("RECEIVED") ?? 0), cancelled: statusMap.get("CANCELLED") ?? 0, paid, totalAmount, averageTicket: paid ? Number((numberValue(paidAmountRow[0]?.total) / paid).toFixed(2)) : null }, facets: { statuses: statusFacets.map((row) => row.value), deliveryMethods: deliveryFacets.map((row) => row.value), currencies: currencyFacets.map((row) => row.value) } };
}

export async function getOrderDetail(orderId: string) {
  const db = getDb();
  const [row] = await db.select({ order: orders, customer: customers, sale: sales, quote: quotes }).from(orders).innerJoin(customers, eq(orders.customerId, customers.id)).innerJoin(sales, eq(orders.saleId, sales.id)).leftJoin(quotes, eq(sales.quoteId, quotes.id)).where(eq(orders.id, orderId)).limit(1);
  if (!row) return null;
  const [items, history, paymentRows, audit] = await Promise.all([
    db.select().from(orderItems).where(eq(orderItems.orderId, orderId)).orderBy(asc(orderItems.createdAt)),
    db.select().from(orderStatusHistory).where(eq(orderStatusHistory.orderId, orderId)).orderBy(desc(orderStatusHistory.createdAt)),
    db.select().from(payments).where(eq(payments.orderId, orderId)).orderBy(desc(payments.createdAt)),
    db.select().from(auditLogs).where(and(eq(auditLogs.entityType, "order"), eq(auditLogs.entityId, orderId))).orderBy(desc(auditLogs.createdAt)).limit(100),
  ]);
  const reservationIds = items.flatMap((item) => item.reservationId ? [item.reservationId] : []);
  const reservations = reservationIds.length ? await db.select().from(inventoryReservations).where(inArray(inventoryReservations.id, reservationIds)) : [];
  return { order: row.order, customer: row.customer, sale: row.sale, quote: row.quote, items, payments: paymentRows, reservations, history, audit };
}
