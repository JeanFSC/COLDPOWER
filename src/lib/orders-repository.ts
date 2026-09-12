import { alias } from "drizzle-orm/pg-core";
import { and, asc, count, desc, eq, exists, gte, ilike, inArray, lt, or, sql, sum, type SQL } from "drizzle-orm";
import { getDb } from "@/db";
import { auditLogs, inventoryReservations, locations, quotes, users } from "@/db/schema";
import { customers } from "@/db/crm-schema";
import { orderIncidents, orderItems, orderStatusHistory, orders, paymentRefunds, payments, sales } from "@/db/sales-schema";
import type { OrderAttention, OrderListItem, OrdersFilters, OrdersPageResponse } from "@/lib/orders-contract";
import { summarizePaymentLedger } from "@/lib/payments-contract";
import { ACTIVE_ORDER_STATUSES } from "@/lib/dashboard-definitions";

const defaultPageSize = 25;
const maxPageSize = 100;
const seller = alias(users, "orders_seller");
const paymentPriority: Record<string, number> = { CONFIRMED: 5, APPROVED: 5, UNDER_REVIEW: 4, PENDING: 3, REFUNDED: 2, REJECTED: 1, CANCELLED: 0, ERROR: 0 };
function pageValues(page?: number, pageSize?: number) { return { page: Math.max(1, Math.floor(page ?? 1)), pageSize: Math.min(maxPageSize, Math.max(1, Math.floor(pageSize ?? defaultPageSize))) }; }
function dayStart(value: string) { return new Date(`${value}T00:00:00-05:00`); }
function dayAfter(value: string) { return new Date(dayStart(value).getTime() + 86_400_000); }
function numberValue(value: unknown) { return Number(value ?? 0); }
function paymentState(rows: Array<{ status: string }>) { return rows.reduce<string | null>((current, row) => !current || (paymentPriority[row.status] ?? -1) > (paymentPriority[current] ?? -1) ? row.status : current, null); }

function orderListRows(db: ReturnType<typeof getDb>, where: SQL | undefined, pageSize: number, page = 1) {
  return db.select({ order: orders, customerName: customers.name, customerEmail: customers.email, sellerName: seller.name, sellerEmail: seller.email, locationName: locations.name, quoteId: quotes.id, quoteTrackingCode: quotes.trackingCode }).from(orders).innerJoin(customers, eq(orders.customerId, customers.id)).leftJoin(seller, eq(orders.sellerId, seller.id)).leftJoin(locations, eq(orders.locationId, locations.id)).leftJoin(sales, eq(orders.saleId, sales.id)).leftJoin(quotes, eq(sales.quoteId, quotes.id)).where(where).orderBy(desc(orders.updatedAt), asc(orders.code)).limit(pageSize).offset((page - 1) * pageSize);
}

const orderIdReference = sql.raw('"orders"."id"');
const orderCurrencyReference = sql.raw('"orders"."currency"');
const grossForOrder = sql<number>`coalesce((select sum(p2.amount) from payments p2 where p2.order_id = ${orderIdReference} and p2.currency = ${orderCurrencyReference} and p2.status in ('CONFIRMED','APPROVED','REFUNDED')), 0)`;
const refundsForOrder = sql<number>`coalesce((select sum(r.amount) from payment_refunds r join payments p3 on p3.id = r.payment_id where p3.order_id = ${orderIdReference} and p3.currency = ${orderCurrencyReference} and r.currency = p3.currency and r.status = 'SUCCEEDED'), 0)`;
const netForOrder = sql<number>`(${grossForOrder} - ${refundsForOrder})`;

function whereOrders(db: ReturnType<typeof getDb>, filters: OrdersFilters) {
  const conditions: SQL[] = [];
  if (filters.query) { const pattern = `%${filters.query.trim()}%`; conditions.push(or(ilike(orders.code, pattern), ilike(orders.customerNameSnapshot, pattern), ilike(customers.name, pattern), exists(db.select({ id: orderItems.id }).from(orderItems).where(and(eq(orderItems.orderId, orders.id), or(ilike(orderItems.skuSnapshot, pattern), ilike(orderItems.productNameSnapshot, pattern))!))))!); }
  if (filters.status) conditions.push(eq(orders.status, filters.status));
  if (filters.active) conditions.push(inArray(orders.status, ACTIVE_ORDER_STATUSES));
  if (filters.customerId) conditions.push(eq(orders.customerId, filters.customerId));
  if (filters.customerQuery) conditions.push(ilike(customers.name, `%${filters.customerQuery.trim()}%`));
  if (filters.sellerId) conditions.push(eq(orders.sellerId, filters.sellerId));
  if (filters.sellerQuery) {
    const pattern = `%${filters.sellerQuery.trim()}%`;
    conditions.push(
      exists(
        db
          .select({ id: users.id })
          .from(users)
          .where(and(eq(users.id, orders.sellerId), ilike(users.name, pattern))),
      ),
    );
  }
  if (filters.deliveryMethod) conditions.push(eq(orders.deliveryMethod, filters.deliveryMethod));
  if (filters.locationId) conditions.push(eq(orders.locationId, filters.locationId));
  if (filters.currency) conditions.push(eq(orders.currency, filters.currency));
  if (filters.paymentStatus) conditions.push(exists(db.select({ id: payments.id }).from(payments).where(and(eq(payments.orderId, orders.id), eq(payments.status, filters.paymentStatus))!)));
  if (filters.withIncident) conditions.push(exists(db.select({ id: orderIncidents.id }).from(orderIncidents).where(and(eq(orderIncidents.orderId, orders.id), eq(orderIncidents.status, "OPEN")))));
  if (filters.reconciliation === "MATCH") conditions.push(sql`${netForOrder} > 0 and abs(${netForOrder} - ${orders.total}) < 0.005`);
  if (filters.reconciliation === "UNDERPAID") conditions.push(sql`${netForOrder} > 0 and ${netForOrder} < ${orders.total} - 0.005`);
  if (filters.reconciliation === "OVERPAID") conditions.push(sql`${netForOrder} > ${orders.total} + 0.005`);
  if (filters.reconciliation === "PENDING") conditions.push(sql`${netForOrder} <= 0`);
  if (filters.createdFrom) conditions.push(gte(orders.createdAt, dayStart(filters.createdFrom)));
  if (filters.createdTo) conditions.push(lt(orders.createdAt, dayAfter(filters.createdTo)));
  return conditions.length ? and(...conditions) : undefined;
}

export async function getOrdersPage(filters: OrdersFilters = {}): Promise<OrdersPageResponse> {
  const { page, pageSize } = pageValues(filters.page, filters.pageSize);
  const db = getDb();
  const where = whereOrders(db, filters);
  const queueWhere = {
    prepare: and(where, or(eq(orders.status, "PAID"), eq(orders.status, "RECEIVED"))),
    dispatch: and(where, eq(orders.status, "READY")),
    pickup: and(where, eq(orders.status, "READY_FOR_PICKUP")),
    incidents: and(
      where,
      exists(
        db
          .select({ id: orderIncidents.id })
          .from(orderIncidents)
          .where(and(eq(orderIncidents.orderId, orders.id), eq(orderIncidents.status, "OPEN"))),
      ),
    ),
  };
  const [rows, totalRows, statusRows, amountRows, statusFacets, deliveryFacets, currencyFacets, locationFacets, incidentMetric, prepareQueueRows, dispatchQueueRows, pickupQueueRows, incidentQueueRows] = await Promise.all([
    orderListRows(db, where, pageSize, page),
    db.select({ total: count(orders.id) }).from(orders).innerJoin(customers, eq(orders.customerId, customers.id)).where(where),
    db.select({ status: orders.status, total: count(orders.id) }).from(orders).innerJoin(customers, eq(orders.customerId, customers.id)).where(where).groupBy(orders.status),
    db.select({ currency: orders.currency, total: sum(orders.total) }).from(orders).innerJoin(customers, eq(orders.customerId, customers.id)).where(where).groupBy(orders.currency),
    db.selectDistinct({ value: orders.status }).from(orders).innerJoin(customers, eq(orders.customerId, customers.id)).where(where).orderBy(orders.status),
    db.selectDistinct({ value: orders.deliveryMethod }).from(orders).innerJoin(customers, eq(orders.customerId, customers.id)).where(where).orderBy(orders.deliveryMethod),
    db.selectDistinct({ value: orders.currency }).from(orders).innerJoin(customers, eq(orders.customerId, customers.id)).where(where).orderBy(orders.currency),
    db.selectDistinct({ id: locations.id, name: locations.name }).from(orders).innerJoin(customers, eq(orders.customerId, customers.id)).innerJoin(locations, eq(orders.locationId, locations.id)).where(where).orderBy(locations.name),
    db.select({ total: count(orderIncidents.id) }).from(orderIncidents).innerJoin(orders, eq(orderIncidents.orderId, orders.id)).innerJoin(customers, eq(orders.customerId, customers.id)).where(and(where, eq(orderIncidents.status, "OPEN"))),
    orderListRows(db, queueWhere.prepare, 5),
    orderListRows(db, queueWhere.dispatch, 5),
    orderListRows(db, queueWhere.pickup, 5),
    orderListRows(db, queueWhere.incidents, 5),
  ]);
  const allRows = [...rows, ...prepareQueueRows, ...dispatchQueueRows, ...pickupQueueRows, ...incidentQueueRows];
  const orderIds = [...new Set(allRows.map((row) => row.order.id))];
  const [itemRows, paymentRows, confirmedRows, refundRows, incidentRows] = await Promise.all([
    orderIds.length ? db.select({ orderId: orderItems.orderId, reservationId: orderItems.reservationId, quantity: orderItems.quantity, pickedQuantity: orderItems.pickedQuantity }).from(orderItems).where(inArray(orderItems.orderId, orderIds)) : [],
    orderIds.length ? db.select({ orderId: payments.orderId, status: payments.status }).from(payments).where(inArray(payments.orderId, orderIds)) : [],
    orderIds.length ? db.select({ orderId: payments.orderId, total: sum(payments.amount) }).from(payments).innerJoin(orders, eq(payments.orderId, orders.id)).where(and(inArray(payments.orderId, orderIds), eq(payments.currency, orders.currency), inArray(payments.status, ["CONFIRMED", "APPROVED", "REFUNDED"]))).groupBy(payments.orderId) : [],
    orderIds.length ? db.select({ orderId: payments.orderId, total: sum(paymentRefunds.amount) }).from(paymentRefunds).innerJoin(payments, eq(paymentRefunds.paymentId, payments.id)).innerJoin(orders, eq(payments.orderId, orders.id)).where(and(inArray(payments.orderId, orderIds), eq(payments.currency, orders.currency), eq(paymentRefunds.currency, orders.currency), eq(paymentRefunds.status, "SUCCEEDED"))).groupBy(payments.orderId) : [],
    orderIds.length ? db.select({ orderId: orderIncidents.orderId, total: count(orderIncidents.id) }).from(orderIncidents).where(and(inArray(orderIncidents.orderId, orderIds), eq(orderIncidents.status, "OPEN"))).groupBy(orderIncidents.orderId) : [],
  ]);
  const itemMetrics = new Map<string, { lines: number; reservations: number; quantity: number; picked: number }>();
  for (const row of itemRows) { const value = itemMetrics.get(row.orderId) ?? { lines: 0, reservations: 0, quantity: 0, picked: 0 }; value.lines += 1; value.reservations += row.reservationId ? 1 : 0; value.quantity += row.quantity; value.picked += row.pickedQuantity; itemMetrics.set(row.orderId, value); }
  const paymentsByOrder = new Map<string, Array<{ status: string }>>();
  for (const row of paymentRows) paymentsByOrder.set(row.orderId, [...(paymentsByOrder.get(row.orderId) ?? []), { status: row.status }]);
  const grossByOrder = new Map(confirmedRows.map((row) => [row.orderId, numberValue(row.total)]));
  const refundsByOrder = new Map(refundRows.map((row) => [row.orderId, numberValue(row.total)]));
  const incidentsByOrder = new Map(incidentRows.map((row) => [row.orderId, numberValue(row.total)]));
  const now = Date.now();
  const toItem = (row: (typeof rows)[number]): OrderListItem => {
    const item = itemMetrics.get(row.order.id) ?? { lines: 0, reservations: 0, quantity: 0, picked: 0 };
    const ledger = summarizePaymentLedger(row.order.total, [{ amount: grossByOrder.get(row.order.id) ?? 0, status: "CONFIRMED" }], [{ amount: refundsByOrder.get(row.order.id) ?? 0, status: "SUCCEEDED" }]); const incidents = incidentsByOrder.get(row.order.id) ?? 0;
    const overdue = ACTIVE_ORDER_STATUSES.includes(row.order.status as typeof ACTIVE_ORDER_STATUSES[number]) && now - row.order.updatedAt.getTime() > 48 * 60 * 60 * 1000;
    const attention: OrderAttention = incidents ? "INCIDENT" : overdue ? "OVERDUE" : row.order.status === "PAYMENT_PENDING" ? "REQUIRES_ATTENTION" : "NORMAL";
    return { ...row.order, customerName: row.customerName, customerPhone: row.order.customerPhoneSnapshot, customerEmail: row.customerEmail ?? row.order.customerEmailSnapshot, sellerName: row.sellerName, sellerEmail: row.sellerEmail, locationName: row.locationName, saleId: row.order.saleId, quoteId: row.quoteId, quoteTrackingCode: row.quoteTrackingCode, lineCount: item.lines, reservationCount: item.reservations, totalQuantity: item.quantity, pickedQuantity: item.picked, openIncidentCount: incidents, paymentStatus: paymentState(paymentsByOrder.get(row.order.id) ?? []), expectedAmount: ledger.expected.toFixed(2), netReceivedAmount: ledger.net.toFixed(2), paymentReconciliation: ledger.reconciliation, attention };
  };
  const items = rows.map(toItem);
  const totalItems = numberValue(totalRows[0]?.total);
  const statusMap = new Map(statusRows.map((row) => [row.status, numberValue(row.total)]));
  const ready = (statusMap.get("READY") ?? 0) + (statusMap.get("READY_FOR_PICKUP") ?? 0);
  const active = [...ACTIVE_ORDER_STATUSES].reduce((total, status) => total + (statusMap.get(status) ?? 0), 0);
  const amountsByCurrency = amountRows.map((row) => ({ currency: row.currency, amount: numberValue(row.total) }));
  const paid = items.filter((row) => row.paymentReconciliation === "MATCH" || row.paymentReconciliation === "OVERPAID").length;
  return { items, queues: { prepare: prepareQueueRows.map(toItem), dispatch: dispatchQueueRows.map(toItem), pickup: pickupQueueRows.map(toItem), incidents: incidentQueueRows.map(toItem) }, page: Math.min(page, Math.max(1, Math.ceil(totalItems / pageSize))), pageSize, totalItems, totalPages: Math.max(1, Math.ceil(totalItems / pageSize)), metrics: { total: totalItems, active, new: (statusMap.get("NEW") ?? 0) + (statusMap.get("RECEIVED") ?? 0), preparing: statusMap.get("PREPARING") ?? 0, ready, inTransit: (statusMap.get("IN_TRANSIT") ?? 0) + (statusMap.get("SHIPPED") ?? 0), delivered: statusMap.get("DELIVERED") ?? 0, pendingPayment: statusMap.get("PAYMENT_PENDING") ?? 0, pending: (statusMap.get("PAYMENT_PENDING") ?? 0) + (statusMap.get("RECEIVED") ?? 0) + (statusMap.get("NEW") ?? 0), cancelled: statusMap.get("CANCELLED") ?? 0, paid, incidents: numberValue(incidentMetric[0]?.total), totalAmount: amountsByCurrency.length === 1 ? amountsByCurrency[0].amount : 0, averageTicket: null, amountsByCurrency }, facets: { statuses: statusFacets.map((row) => row.value), deliveryMethods: deliveryFacets.map((row) => row.value), currencies: currencyFacets.map((row) => row.value), locations: locationFacets } };
}

export async function getOrderDetail(
  orderId: string,
  options: { includeFinancial?: boolean } = {},
) {
  const db = getDb();
  const includeFinancial = options.includeFinancial ?? true;
  const [row] = await db
    .select({ order: orders, customer: customers, sale: sales, quote: quotes, location: locations })
    .from(orders)
    .innerJoin(customers, eq(orders.customerId, customers.id))
    .innerJoin(sales, eq(orders.saleId, sales.id))
    .leftJoin(quotes, eq(sales.quoteId, quotes.id))
    .leftJoin(locations, eq(orders.locationId, locations.id))
    .where(eq(orders.id, orderId))
    .limit(1);
  if (!row) return null;
  const [items, history, audit, incidents] = await Promise.all([
    db.select().from(orderItems).where(eq(orderItems.orderId, orderId)).orderBy(asc(orderItems.createdAt)),
    db.select().from(orderStatusHistory).where(eq(orderStatusHistory.orderId, orderId)).orderBy(desc(orderStatusHistory.createdAt)),
    db.select().from(auditLogs).where(and(eq(auditLogs.entityType, "order"), eq(auditLogs.entityId, orderId))).orderBy(desc(auditLogs.createdAt)).limit(100),
    db.select().from(orderIncidents).where(eq(orderIncidents.orderId, orderId)).orderBy(desc(orderIncidents.createdAt)),
  ]);
  const reservationIds = items.flatMap((item) => item.reservationId ? [item.reservationId] : []);
  const reservations = reservationIds.length
    ? await db.select().from(inventoryReservations).where(inArray(inventoryReservations.id, reservationIds))
    : [];
  const base = {
    order: row.order,
    customer: row.customer,
    sale: row.sale,
    quote: row.quote,
    location: row.location,
    items,
    reservations,
    incidents,
    history,
    audit,
  };
  if (!includeFinancial) return base;
  const [paymentRows, confirmed, successfulRefunds] = await Promise.all([
    db.select().from(payments).where(eq(payments.orderId, orderId)).orderBy(desc(payments.createdAt)),
    db.select({ total: sum(payments.amount) }).from(payments).where(and(eq(payments.orderId, orderId), eq(payments.currency, row.order.currency), inArray(payments.status, ["CONFIRMED", "APPROVED", "REFUNDED"]))),
    db.select({ total: sum(paymentRefunds.amount) }).from(paymentRefunds).innerJoin(payments, eq(paymentRefunds.paymentId, payments.id)).where(and(eq(payments.orderId, orderId), eq(payments.currency, row.order.currency), eq(paymentRefunds.currency, row.order.currency), eq(paymentRefunds.status, "SUCCEEDED"))),
  ]);
  const ledger = summarizePaymentLedger(
    row.order.total,
    [{ amount: confirmed[0]?.total ?? 0, status: "CONFIRMED" }],
    [{ amount: successfulRefunds[0]?.total ?? 0, status: "SUCCEEDED" }],
  );
  return {
    ...base,
    payments: paymentRows,
    reconciliation: {
      expectedAmount: ledger.expected.toFixed(2),
      grossReceivedAmount: ledger.gross.toFixed(2),
      refundedAmount: ledger.refunded.toFixed(2),
      netReceivedAmount: ledger.net.toFixed(2),
      difference: ledger.difference.toFixed(2),
      status: ledger.reconciliation,
    },
  };
}
