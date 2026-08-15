import { and, asc, count, desc, eq, gte, ilike, inArray, lt, or, sum, type SQL } from "drizzle-orm";
import { getDb } from "@/db";
import { auditLogs } from "@/db/schema";
import { customers } from "@/db/crm-schema";
import { orderStatusHistory, orders, paymentAttempts, paymentEvents, paymentRefunds, payments, paymentStatusHistory, sales } from "@/db/sales-schema";
import type { PaymentListItem, PaymentsFilters, PaymentsPageResponse } from "@/lib/payments-contract";
import { reconciliationState } from "@/lib/payments-contract";

const defaultPageSize = 25;
const maxPageSize = 100;
function pageValues(page?: number, pageSize?: number) { return { page: Math.max(1, Math.floor(page ?? 1)), pageSize: Math.min(maxPageSize, Math.max(1, Math.floor(pageSize ?? defaultPageSize))) }; }
function dayStart(value: string) { return new Date(`${value}T00:00:00-05:00`); }
function dayAfter(value: string) { return new Date(dayStart(value).getTime() + 86_400_000); }
function numberValue(value: unknown) { return Number(value ?? 0); }
function orSafe(...values: SQL[]) { return or(...values)!; }

function paymentWhere(filters: PaymentsFilters) {
  const conditions: SQL[] = [];
  if (filters.query) { const pattern = `%${filters.query.trim()}%`; conditions.push(orSafe(ilike(payments.id, pattern), ilike(orders.code, pattern), ilike(customers.name, pattern), ilike(payments.providerReference, pattern))); }
  if (filters.status) conditions.push(eq(payments.status, filters.status));
  if (filters.provider) conditions.push(eq(payments.provider, filters.provider));
  if (filters.method) conditions.push(eq(payments.method, filters.method));
  if (filters.methodType) conditions.push(eq(payments.methodType, filters.methodType));
  if (filters.orderId) conditions.push(eq(payments.orderId, filters.orderId));
  if (filters.customerId) conditions.push(eq(orders.customerId, filters.customerId));
  if (filters.dateFrom) conditions.push(gte(payments.createdAt, dayStart(filters.dateFrom)));
  if (filters.dateTo) conditions.push(lt(payments.createdAt, dayAfter(filters.dateTo)));
  return conditions.length ? and(...conditions) : undefined;
}

export async function getPaymentsPage(filters: PaymentsFilters = {}): Promise<PaymentsPageResponse> {
  const { page, pageSize } = pageValues(filters.page, filters.pageSize);
  const where = paymentWhere(filters);
  const db = getDb();
  const [rows, totalRows, statusRows, amountRow, statusFacets, providerFacets, methodFacets] = await Promise.all([
    db.select({ payment: payments, orderCode: orders.code, orderTotal: orders.total, customerId: orders.customerId, customerName: customers.name, saleId: sales.id, saleCode: sales.code }).from(payments).innerJoin(orders, eq(payments.orderId, orders.id)).innerJoin(customers, eq(orders.customerId, customers.id)).leftJoin(sales, eq(orders.saleId, sales.id)).where(where).orderBy(desc(payments.updatedAt), asc(payments.id)).limit(pageSize).offset((page - 1) * pageSize),
    db.select({ total: count(payments.id) }).from(payments).innerJoin(orders, eq(payments.orderId, orders.id)).innerJoin(customers, eq(orders.customerId, customers.id)).where(where),
    db.select({ status: payments.status, total: count(payments.id) }).from(payments).innerJoin(orders, eq(payments.orderId, orders.id)).innerJoin(customers, eq(orders.customerId, customers.id)).where(where).groupBy(payments.status),
    db.select({ total: sum(payments.amount) }).from(payments).innerJoin(orders, eq(payments.orderId, orders.id)).innerJoin(customers, eq(orders.customerId, customers.id)).where(where),
    db.selectDistinct({ value: payments.status }).from(payments).innerJoin(orders, eq(payments.orderId, orders.id)).innerJoin(customers, eq(orders.customerId, customers.id)).where(where).orderBy(payments.status),
    db.selectDistinct({ value: payments.provider }).from(payments).innerJoin(orders, eq(payments.orderId, orders.id)).innerJoin(customers, eq(orders.customerId, customers.id)).where(where).orderBy(payments.provider),
    db.selectDistinct({ value: payments.method }).from(payments).innerJoin(orders, eq(payments.orderId, orders.id)).innerJoin(customers, eq(orders.customerId, customers.id)).where(where).orderBy(payments.method),
  ]);
  const totalItems = numberValue(totalRows[0]?.total);
  const paymentIds = rows.map((row) => row.payment.id);
  const orderIds = rows.map((row) => row.payment.orderId);
  const [attemptRows, confirmedRows] = await Promise.all([
    paymentIds.length ? db.select({ paymentId: paymentAttempts.paymentId, total: count(paymentAttempts.id) }).from(paymentAttempts).where(inArray(paymentAttempts.paymentId, paymentIds)).groupBy(paymentAttempts.paymentId) : [],
    orderIds.length ? db.select({ orderId: payments.orderId, total: sum(payments.amount) }).from(payments).where(and(inArray(payments.orderId, orderIds), or(eq(payments.status, "CONFIRMED"), eq(payments.status, "APPROVED")))).groupBy(payments.orderId) : [],
  ]);
  const attemptsByPayment = new Map(attemptRows.map((row) => [row.paymentId, numberValue(row.total)]));
  const receivedByOrder = new Map(confirmedRows.map((row) => [row.orderId, numberValue(row.total)]));
  const items: PaymentListItem[] = rows.map((row) => {
    const expected = numberValue(row.orderTotal);
    const received = receivedByOrder.get(row.payment.orderId) ?? 0;
    return { ...row.payment, orderCode: row.orderCode, saleId: row.saleId, saleCode: row.saleCode, customerId: row.customerId, customerName: row.customerName, attempts: attemptsByPayment.get(row.payment.id) ?? 0, expectedAmount: expected.toFixed(2), receivedAmount: received.toFixed(2), reconciliation: reconciliationState(row.payment.status, expected, received) };
  });
  const statusMap = new Map(statusRows.map((row) => [row.status, numberValue(row.total)]));
  return { items, page: Math.min(page, Math.max(1, Math.ceil(totalItems / pageSize))), pageSize, totalItems, totalPages: Math.max(1, Math.ceil(totalItems / pageSize)), metrics: { total: totalItems, pending: (statusMap.get("PENDING") ?? 0) + (statusMap.get("UNDER_REVIEW") ?? 0), approved: (statusMap.get("CONFIRMED") ?? 0) + (statusMap.get("APPROVED") ?? 0), rejected: (statusMap.get("REJECTED") ?? 0) + (statusMap.get("ERROR") ?? 0), refunded: statusMap.get("REFUNDED") ?? 0, totalAmount: numberValue(amountRow[0]?.total) }, facets: { statuses: statusFacets.map((row) => row.value), providers: providerFacets.flatMap((row) => row.value ? [row.value] : []), methods: methodFacets.map((row) => row.value) } };
}

export async function getPaymentDetail(paymentId: string) {
  const db = getDb();
  const [row] = await db.select({ payment: payments, order: orders, customer: customers, sale: sales }).from(payments).innerJoin(orders, eq(payments.orderId, orders.id)).innerJoin(customers, eq(orders.customerId, customers.id)).leftJoin(sales, eq(orders.saleId, sales.id)).where(eq(payments.id, paymentId)).limit(1);
  if (!row) return null;
  const [attempts, events, states, refunds, audit, orderHistory] = await Promise.all([
    db.select().from(paymentAttempts).where(eq(paymentAttempts.paymentId, paymentId)).orderBy(desc(paymentAttempts.createdAt)),
    db.select().from(paymentEvents).where(eq(paymentEvents.paymentId, paymentId)).orderBy(desc(paymentEvents.createdAt)),
    db.select().from(paymentStatusHistory).where(eq(paymentStatusHistory.paymentId, paymentId)).orderBy(desc(paymentStatusHistory.createdAt)),
    db.select().from(paymentRefunds).where(eq(paymentRefunds.paymentId, paymentId)).orderBy(desc(paymentRefunds.createdAt)),
    db.select().from(auditLogs).where(and(eq(auditLogs.entityType, "payment"), eq(auditLogs.entityId, paymentId))).orderBy(desc(auditLogs.createdAt)),
    db.select().from(orderStatusHistory).where(eq(orderStatusHistory.orderId, row.order.id)).orderBy(desc(orderStatusHistory.createdAt)),
  ]);
  const expected = numberValue(row.order.total);
  const confirmed = await db.select({ total: sum(payments.amount) }).from(payments).where(and(eq(payments.orderId, row.order.id), or(eq(payments.status, "CONFIRMED"), eq(payments.status, "APPROVED"))));
  const received = numberValue(confirmed[0]?.total);
  return { payment: row.payment, order: row.order, sale: row.sale, customer: row.customer, attempts, events, statusHistory: states, refunds, audit, orderHistory, reconciliation: { expectedAmount: expected.toFixed(2), receivedAmount: received.toFixed(2), difference: Number((received - expected).toFixed(2)), status: reconciliationState(row.payment.status, expected, received) } };
}
