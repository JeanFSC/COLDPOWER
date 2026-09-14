import { and, asc, count, desc, eq, gte, ilike, inArray, lt, or, sql, sum, type SQL } from "drizzle-orm";
import { getDb } from "@/db";
import { auditLogs } from "@/db/schema";
import { customers } from "@/db/crm-schema";
import { orderStatusHistory, orders, paymentAttempts, paymentEvents, paymentRefunds, payments, paymentStatusHistory, sales } from "@/db/sales-schema";
import type { PaymentListItem, PaymentsFilters, PaymentsPageResponse } from "@/lib/payments-contract";
import { reconciliationState, summarizePaymentLedger } from "@/lib/payments-contract";

const defaultPageSize = 25;
const maxPageSize = 100;
const confirmedStatuses = ["CONFIRMED", "APPROVED", "REFUNDED"] as const;
function pageValues(page?: number, pageSize?: number) { return { page: Math.max(1, Math.floor(page ?? 1)), pageSize: Math.min(maxPageSize, Math.max(1, Math.floor(pageSize ?? defaultPageSize))) }; }
function dayStart(value: string) { return new Date(`${value}T00:00:00-05:00`); }
function dayAfter(value: string) { return new Date(dayStart(value).getTime() + 86_400_000); }
function numberValue(value: unknown) { return Number(value ?? 0); }

const orderIdReference = sql.raw('"orders"."id"');
const orderCurrencyReference = sql.raw('"orders"."currency"');
const grossForOrder = sql<number>`coalesce((select sum(p2.amount) from payments p2 where p2.order_id = ${orderIdReference} and p2.currency = ${orderCurrencyReference} and p2.status in ('CONFIRMED','APPROVED','REFUNDED')), 0)`;
const refundsForOrder = sql<number>`coalesce((select sum(r.amount) from payment_refunds r join payments p3 on p3.id = r.payment_id where p3.order_id = ${orderIdReference} and p3.currency = ${orderCurrencyReference} and r.currency = p3.currency and r.status = 'SUCCEEDED'), 0)`;
const netForOrder = sql<number>`(${grossForOrder} - ${refundsForOrder})`;

function paymentWhere(filters: PaymentsFilters) {
  const conditions: SQL[] = [];
  if (filters.query) { const pattern = `%${filters.query.trim()}%`; conditions.push(or(ilike(payments.id, pattern), ilike(orders.code, pattern), ilike(sales.code, pattern), ilike(customers.name, pattern), ilike(payments.providerReference, pattern))!); }
  if (filters.status) conditions.push(eq(payments.status, filters.status));
  if (filters.provider) conditions.push(eq(payments.provider, filters.provider));
  if (filters.method) conditions.push(eq(payments.method, filters.method));
  if (filters.methodType) conditions.push(eq(payments.methodType, filters.methodType));
  if (filters.orderId) conditions.push(eq(payments.orderId, filters.orderId));
  if (filters.orderQuery) {
    const pattern = `%${filters.orderQuery.trim()}%`;
    conditions.push(or(ilike(orders.code, pattern), ilike(payments.orderId, pattern))!);
  }
  if (filters.saleId) conditions.push(eq(orders.saleId, filters.saleId));
  if (filters.customerId) conditions.push(eq(orders.customerId, filters.customerId));
  if (filters.customerQuery) conditions.push(ilike(customers.name, `%${filters.customerQuery.trim()}%`));
  if (filters.currency) conditions.push(eq(payments.currency, filters.currency));
  if (filters.dateFrom) conditions.push(gte(payments.createdAt, dayStart(filters.dateFrom)));
  if (filters.dateTo) conditions.push(lt(payments.createdAt, dayAfter(filters.dateTo)));
  if (filters.reconciliation === "MATCH") conditions.push(sql`${netForOrder} > 0 and abs(${netForOrder} - ${orders.total}) < 0.005`);
  if (filters.reconciliation === "UNDERPAID") conditions.push(sql`${netForOrder} > 0 and ${netForOrder} < ${orders.total} - 0.005`);
  if (filters.reconciliation === "OVERPAID") conditions.push(sql`${netForOrder} > ${orders.total} + 0.005`);
  if (filters.reconciliation === "PENDING") conditions.push(sql`${netForOrder} <= 0`);
  if (filters.queue === "pending") conditions.push(inArray(payments.status, ["PENDING", "UNDER_REVIEW"]));
  if (filters.queue === "difference") conditions.push(or(sql`${netForOrder} > 0 and ${netForOrder} < ${orders.total} - 0.005`, sql`${netForOrder} > ${orders.total} + 0.005`)!);
  if (filters.queue === "providerErrors") conditions.push(inArray(payments.status, ["REJECTED", "ERROR"]));
  if (filters.queue === "refunds") conditions.push(eq(payments.status, "REFUNDED"));
  return conditions.length ? and(...conditions) : undefined;
}

function listBase(db: ReturnType<typeof getDb>, where: SQL | undefined) {
  return db.select({ payment: payments, orderCode: orders.code, orderTotal: orders.total, customerId: orders.customerId, customerName: customers.name, saleId: sales.id, saleCode: sales.code }).from(payments).innerJoin(orders, eq(payments.orderId, orders.id)).innerJoin(customers, eq(orders.customerId, customers.id)).leftJoin(sales, eq(orders.saleId, sales.id)).where(where);
}

export async function getPaymentsPage(filters: PaymentsFilters = {}): Promise<PaymentsPageResponse> {
  const { page, pageSize } = pageValues(filters.page, filters.pageSize);
  const where = paymentWhere(filters);
  const db = getDb();
  const queueWhere = {
    pending: and(where, inArray(payments.status, ["PENDING", "UNDER_REVIEW"])),
    difference: and(where, or(sql`${netForOrder} > 0 and ${netForOrder} < ${orders.total} - 0.005`, sql`${netForOrder} > ${orders.total} + 0.005`)),
    providerErrors: and(where, inArray(payments.status, ["REJECTED", "ERROR"])),
    refunds: and(where, eq(payments.status, "REFUNDED")),
  };
  const [rows, totalRows, statusRows, confirmedAmountRows, refundAmountRows, statusFacets, providerFacets, methodFacets, currencyFacets, methodRows, methodConfirmedAmountRows, methodRefundAmountRows, metricOrderRows, pendingQueueRows, differenceQueueRows, providerErrorQueueRows, refundQueueRows] = await Promise.all([
    listBase(db, where).orderBy(desc(payments.updatedAt), asc(payments.id)).limit(pageSize).offset((page - 1) * pageSize),
    db.select({ total: count(payments.id) }).from(payments).innerJoin(orders, eq(payments.orderId, orders.id)).innerJoin(customers, eq(orders.customerId, customers.id)).leftJoin(sales, eq(orders.saleId, sales.id)).where(where),
    db.select({ status: payments.status, total: count(payments.id) }).from(payments).innerJoin(orders, eq(payments.orderId, orders.id)).innerJoin(customers, eq(orders.customerId, customers.id)).leftJoin(sales, eq(orders.saleId, sales.id)).where(where).groupBy(payments.status),
    db.select({ currency: payments.currency, total: sum(payments.amount) }).from(payments).innerJoin(orders, eq(payments.orderId, orders.id)).innerJoin(customers, eq(orders.customerId, customers.id)).leftJoin(sales, eq(orders.saleId, sales.id)).where(and(where, inArray(payments.status, [...confirmedStatuses]))).groupBy(payments.currency),
    db.select({ currency: paymentRefunds.currency, total: sum(paymentRefunds.amount) }).from(paymentRefunds).innerJoin(payments, eq(paymentRefunds.paymentId, payments.id)).innerJoin(orders, eq(payments.orderId, orders.id)).innerJoin(customers, eq(orders.customerId, customers.id)).leftJoin(sales, eq(orders.saleId, sales.id)).where(and(where, eq(paymentRefunds.status, "SUCCEEDED"))).groupBy(paymentRefunds.currency),
    db.selectDistinct({ value: payments.status }).from(payments).innerJoin(orders, eq(payments.orderId, orders.id)).innerJoin(customers, eq(orders.customerId, customers.id)).leftJoin(sales, eq(orders.saleId, sales.id)).where(where).orderBy(payments.status),
    db.selectDistinct({ value: payments.provider }).from(payments).innerJoin(orders, eq(payments.orderId, orders.id)).innerJoin(customers, eq(orders.customerId, customers.id)).leftJoin(sales, eq(orders.saleId, sales.id)).where(where).orderBy(payments.provider),
    db.selectDistinct({ value: payments.method }).from(payments).innerJoin(orders, eq(payments.orderId, orders.id)).innerJoin(customers, eq(orders.customerId, customers.id)).leftJoin(sales, eq(orders.saleId, sales.id)).where(where).orderBy(payments.method),
    db.selectDistinct({ value: payments.currency }).from(payments).innerJoin(orders, eq(payments.orderId, orders.id)).innerJoin(customers, eq(orders.customerId, customers.id)).leftJoin(sales, eq(orders.saleId, sales.id)).where(where).orderBy(payments.currency),
    db.select({ method: payments.method, total: count(payments.id) }).from(payments).innerJoin(orders, eq(payments.orderId, orders.id)).innerJoin(customers, eq(orders.customerId, customers.id)).leftJoin(sales, eq(orders.saleId, sales.id)).where(where).groupBy(payments.method).orderBy(desc(count(payments.id))).limit(8),
    db.select({ method: payments.method, currency: payments.currency, total: sum(payments.amount) }).from(payments).innerJoin(orders, eq(payments.orderId, orders.id)).innerJoin(customers, eq(orders.customerId, customers.id)).leftJoin(sales, eq(orders.saleId, sales.id)).where(and(where, inArray(payments.status, [...confirmedStatuses]))).groupBy(payments.method, payments.currency),
    db.select({ method: payments.method, currency: paymentRefunds.currency, total: sum(paymentRefunds.amount) }).from(paymentRefunds).innerJoin(payments, eq(paymentRefunds.paymentId, payments.id)).innerJoin(orders, eq(payments.orderId, orders.id)).innerJoin(customers, eq(orders.customerId, customers.id)).leftJoin(sales, eq(orders.saleId, sales.id)).where(and(where, eq(paymentRefunds.status, "SUCCEEDED"))).groupBy(payments.method, paymentRefunds.currency),
    db.selectDistinct({ orderId: payments.orderId }).from(payments).innerJoin(orders, eq(payments.orderId, orders.id)).innerJoin(customers, eq(orders.customerId, customers.id)).leftJoin(sales, eq(orders.saleId, sales.id)).where(and(where, inArray(payments.status, [...confirmedStatuses]))),
    listBase(db, queueWhere.pending).orderBy(desc(payments.updatedAt), asc(payments.id)).limit(5),
    listBase(db, queueWhere.difference).orderBy(desc(payments.updatedAt), asc(payments.id)).limit(5),
    listBase(db, queueWhere.providerErrors).orderBy(desc(payments.updatedAt), asc(payments.id)).limit(5),
    listBase(db, queueWhere.refunds).orderBy(desc(payments.updatedAt), asc(payments.id)).limit(5),
  ]);
  const totalItems = numberValue(totalRows[0]?.total);
  const allRows = [...rows, ...pendingQueueRows, ...differenceQueueRows, ...providerErrorQueueRows, ...refundQueueRows];
  const paymentIds = [...new Set(allRows.map((row) => row.payment.id))];
  const orderIds = [...new Set(allRows.map((row) => row.payment.orderId))];
  const metricOrderIds = metricOrderRows.map((row) => row.orderId);
  const [attemptRows, confirmedRows, refundRows, allFinancialRows] = await Promise.all([
    paymentIds.length ? db.select({ paymentId: paymentAttempts.paymentId, total: count(paymentAttempts.id) }).from(paymentAttempts).where(inArray(paymentAttempts.paymentId, paymentIds)).groupBy(paymentAttempts.paymentId) : [],
    orderIds.length ? db.select({ orderId: payments.orderId, total: sum(payments.amount) }).from(payments).innerJoin(orders, eq(payments.orderId, orders.id)).where(and(inArray(payments.orderId, orderIds), eq(payments.currency, orders.currency), inArray(payments.status, [...confirmedStatuses]))).groupBy(payments.orderId) : [],
    orderIds.length ? db.select({ orderId: payments.orderId, total: sum(paymentRefunds.amount) }).from(paymentRefunds).innerJoin(payments, eq(paymentRefunds.paymentId, payments.id)).innerJoin(orders, eq(payments.orderId, orders.id)).where(and(inArray(payments.orderId, orderIds), eq(payments.currency, orders.currency), eq(paymentRefunds.currency, orders.currency), eq(paymentRefunds.status, "SUCCEEDED"))).groupBy(payments.orderId) : [],
    metricOrderIds.length ? db.select({ orderId: orders.id, expected: orders.total, gross: grossForOrder, refunded: refundsForOrder }).from(orders).where(inArray(orders.id, metricOrderIds)) : [],
  ]);
  const attemptsByPayment = new Map(attemptRows.map((row) => [row.paymentId, numberValue(row.total)]));
  const grossByOrder = new Map(confirmedRows.map((row) => [row.orderId, numberValue(row.total)]));
  const refundsByOrder = new Map(refundRows.map((row) => [row.orderId, numberValue(row.total)]));
  const toItem = (row: (typeof rows)[number]): PaymentListItem => {
    const expected = numberValue(row.orderTotal); const ledger = summarizePaymentLedger(expected, [{ amount: grossByOrder.get(row.payment.orderId) ?? 0, status: "CONFIRMED" }], [{ amount: refundsByOrder.get(row.payment.orderId) ?? 0, status: "SUCCEEDED" }]);
    return { ...row.payment, orderCode: row.orderCode, saleId: row.saleId, saleCode: row.saleCode, customerId: row.customerId, customerName: row.customerName, attempts: attemptsByPayment.get(row.payment.id) ?? 0, expectedAmount: ledger.expected.toFixed(2), grossReceivedAmount: ledger.gross.toFixed(2), refundedAmount: ledger.refunded.toFixed(2), netReceivedAmount: ledger.net.toFixed(2), receivedAmount: ledger.net.toFixed(2), difference: ledger.difference.toFixed(2), reconciliation: ledger.reconciliation };
  };
  const items = rows.map(toItem);
  const statusMap = new Map(statusRows.map((row) => [row.status, numberValue(row.total)]));
  const refundByCurrency = new Map(refundAmountRows.map((row) => [row.currency, numberValue(row.total)]));
  const amountsByCurrency = confirmedAmountRows.map((row) => { const gross = numberValue(row.total); const refunded = refundByCurrency.get(row.currency) ?? 0; return { currency: row.currency, gross, refunded, net: gross - refunded }; });
  const financialStates = allFinancialRows.flatMap((row) => {
    const net = numberValue(row.gross) - numberValue(row.refunded);
    return net > 0 ? [reconciliationState(numberValue(row.expected), net, true)] : [];
  });
  const reconciledOrders = financialStates.filter((state) => state === "MATCH").length;
  const underpaidOrders = financialStates.filter((state) => state === "UNDERPAID").length;
  const overpaidOrders = financialStates.filter((state) => state === "OVERPAID").length;
  const observed = underpaidOrders + overpaidOrders + (statusMap.get("REJECTED") ?? 0) + (statusMap.get("ERROR") ?? 0);
  const methodRefundMap = new Map(methodRefundAmountRows.map((row) => [`${row.method}:${row.currency}`, numberValue(row.total)]));
  const methodBreakdown = methodRows.map((row) => {
    const amountsByCurrency = methodConfirmedAmountRows
      .filter((amountRow) => amountRow.method === row.method)
      .map((amountRow) => {
        const gross = numberValue(amountRow.total);
        const refunded = methodRefundMap.get(`${row.method}:${amountRow.currency}`) ?? 0;
        return { currency: amountRow.currency, gross, refunded, net: gross - refunded };
      });
    return { method: row.method, count: numberValue(row.total), confirmedAmountsByCurrency: amountsByCurrency };
  });
  return { items, queues: { pending: pendingQueueRows.map(toItem), difference: differenceQueueRows.map(toItem), providerErrors: providerErrorQueueRows.map(toItem), refunds: refundQueueRows.map(toItem) }, page: Math.min(page, Math.max(1, Math.ceil(totalItems / pageSize))), pageSize, totalItems, totalPages: Math.max(1, Math.ceil(totalItems / pageSize)), metrics: { total: totalItems, pending: (statusMap.get("PENDING") ?? 0) + (statusMap.get("UNDER_REVIEW") ?? 0), approved: (statusMap.get("CONFIRMED") ?? 0) + (statusMap.get("APPROVED") ?? 0), rejected: (statusMap.get("REJECTED") ?? 0) + (statusMap.get("ERROR") ?? 0), refunded: statusMap.get("REFUNDED") ?? 0, observed, reconciledOrders, ordersWithConfirmedPayments: financialStates.length, underpaidOrders, overpaidOrders, reconciliationRate: financialStates.length ? Number(((reconciledOrders / financialStates.length) * 100).toFixed(2)) : null, totalAmount: amountsByCurrency.length === 1 ? amountsByCurrency[0].net : 0, amountsByCurrency, statusBreakdown: statusRows.map((row) => ({ status: row.status, count: numberValue(row.total) })), methodBreakdown }, facets: { statuses: statusFacets.map((row) => row.value), providers: providerFacets.flatMap((row) => row.value ? [row.value] : []), methods: methodFacets.map((row) => row.value), currencies: currencyFacets.map((row) => row.value) } };
}

const trendDays = 14;
function limaDayKey(date: Date) {
  return new Date(date.getTime() - 5 * 3_600_000).toISOString().slice(0, 10);
}
function fillTrend(rows: Array<{ date: string; total: string | number }>, keys: string[]) {
  const map = new Map(rows.map((row) => [row.date, numberValue(row.total)]));
  return keys.map((key) => map.get(key) ?? 0);
}

// Day-bucketed real series (Lima calendar days) for the payments KPI sparklines — mirrors
// operations-dashboard.ts's salesSeries/collectedSeries pattern so these cards show a real
// trend instead of a fabricated one. Uses the same entity filters as getPaymentsPage but a
// fixed 14-day window, independent of any dateFrom/dateTo table filter.
export async function getPaymentsKpiSeries(filters: PaymentsFilters = {}) {
  const db = getDb();
  const to = new Date();
  // +1 day of headroom on the SQL lower bound so "today" (partial day at query time) is never
  // excluded; the display keys below independently cover the last `trendDays` calendar days
  // ending today, so any row older than that simply won't match a key and is dropped as before.
  const from = new Date(to.getTime() - (trendDays + 1) * 86_400_000);
  const keys = Array.from({ length: trendDays }, (_, index) => limaDayKey(new Date(to.getTime() - (trendDays - 1 - index) * 86_400_000)));
  const trendWhere = paymentWhere({ ...filters, dateFrom: undefined, dateTo: undefined, queue: undefined });
  const where = and(trendWhere, gte(payments.createdAt, from), lt(payments.createdAt, to));
  const bucket = sql<string>`to_char((${payments.createdAt} - interval '5 hours'), 'YYYY-MM-DD')`;
  const base = () => db.select({ date: bucket, total: count(payments.id) }).from(payments).innerJoin(orders, eq(payments.orderId, orders.id)).innerJoin(customers, eq(orders.customerId, customers.id)).leftJoin(sales, eq(orders.saleId, sales.id));
  const [confirmedRows, confirmedCurrencyRows, pendingRows, observedRows] = await Promise.all([
    base().where(and(where, inArray(payments.status, [...confirmedStatuses]))).groupBy(sql`1`).orderBy(sql`1`),
    db.selectDistinct({ currency: payments.currency }).from(payments).innerJoin(orders, eq(payments.orderId, orders.id)).innerJoin(customers, eq(orders.customerId, customers.id)).leftJoin(sales, eq(orders.saleId, sales.id)).where(and(where, inArray(payments.status, [...confirmedStatuses]))),
    base().where(and(where, inArray(payments.status, ["PENDING", "UNDER_REVIEW"]))).groupBy(sql`1`).orderBy(sql`1`),
    base().where(and(where, inArray(payments.status, ["REJECTED", "ERROR"]))).groupBy(sql`1`).orderBy(sql`1`),
  ]);
  const amountRows = confirmedCurrencyRows.length === 1
    ? await db.select({ date: bucket, total: sql<string>`coalesce(sum(${payments.amount}), 0)` }).from(payments).innerJoin(orders, eq(payments.orderId, orders.id)).innerJoin(customers, eq(orders.customerId, customers.id)).leftJoin(sales, eq(orders.saleId, sales.id)).where(and(where, inArray(payments.status, [...confirmedStatuses]), eq(payments.currency, confirmedCurrencyRows[0].currency))).groupBy(sql`1`).orderBy(sql`1`)
    : [];
  return {
    confirmedAmount: amountRows.length ? fillTrend(amountRows, keys) : [],
    confirmedCount: fillTrend(confirmedRows, keys),
    pending: fillTrend(pendingRows, keys),
    observed: fillTrend(observedRows, keys),
  };
}

export async function getPaymentDetail(paymentId: string) {
  const db = getDb();
  const [row] = await db.select({ payment: payments, order: orders, customer: customers, sale: sales }).from(payments).innerJoin(orders, eq(payments.orderId, orders.id)).innerJoin(customers, eq(orders.customerId, customers.id)).leftJoin(sales, eq(orders.saleId, sales.id)).where(eq(payments.id, paymentId)).limit(1);
  if (!row) return null;
  const [attempts, events, states, refunds, audit, orderHistory, confirmed, successfulRefunds] = await Promise.all([
    db.select().from(paymentAttempts).where(eq(paymentAttempts.paymentId, paymentId)).orderBy(desc(paymentAttempts.createdAt)),
    db.select().from(paymentEvents).where(eq(paymentEvents.paymentId, paymentId)).orderBy(desc(paymentEvents.createdAt)),
    db.select().from(paymentStatusHistory).where(eq(paymentStatusHistory.paymentId, paymentId)).orderBy(desc(paymentStatusHistory.createdAt)),
    db.select().from(paymentRefunds).where(eq(paymentRefunds.paymentId, paymentId)).orderBy(desc(paymentRefunds.createdAt)),
    db.select().from(auditLogs).where(and(eq(auditLogs.entityType, "payment"), eq(auditLogs.entityId, paymentId))).orderBy(desc(auditLogs.createdAt)),
    db.select().from(orderStatusHistory).where(eq(orderStatusHistory.orderId, row.order.id)).orderBy(desc(orderStatusHistory.createdAt)),
    db.select({ total: sum(payments.amount) }).from(payments).where(and(eq(payments.orderId, row.order.id), eq(payments.currency, row.order.currency), inArray(payments.status, [...confirmedStatuses]))),
    db.select({ total: sum(paymentRefunds.amount) }).from(paymentRefunds).innerJoin(payments, eq(paymentRefunds.paymentId, payments.id)).where(and(eq(payments.orderId, row.order.id), eq(payments.currency, row.order.currency), eq(paymentRefunds.currency, row.order.currency), eq(paymentRefunds.status, "SUCCEEDED"))),
  ]);
  const ledger = summarizePaymentLedger(numberValue(row.order.total), [{ amount: confirmed[0]?.total ?? 0, status: "CONFIRMED" }], [{ amount: successfulRefunds[0]?.total ?? 0, status: "SUCCEEDED" }]);
  return { payment: row.payment, order: row.order, sale: row.sale, customer: row.customer, attempts, events, statusHistory: states, refunds, audit, orderHistory, reconciliation: { expectedAmount: ledger.expected.toFixed(2), grossReceivedAmount: ledger.gross.toFixed(2), refundedAmount: ledger.refunded.toFixed(2), netReceivedAmount: ledger.net.toFixed(2), receivedAmount: ledger.net.toFixed(2), difference: ledger.difference, status: ledger.reconciliation } };
}
