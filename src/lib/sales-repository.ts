import { alias } from "drizzle-orm/pg-core";
import { and, asc, count, desc, eq, exists, gte, ilike, inArray, lt, or, sum, type SQL } from "drizzle-orm";
import { getDb } from "@/db";
import { auditLogs, quotes, users } from "@/db/schema";
import { customers, opportunities } from "@/db/crm-schema";
import { orderItems, orders, payments, saleItems, sales } from "@/db/sales-schema";
import type { SalesFilters, SalesListItem, SalesPageResponse } from "@/lib/sales-contract";

const defaultPageSize = 25;
const maxPageSize = 100;
const seller = alias(users, "sales_seller");
const paymentPriority: Record<string, number> = { CONFIRMED: 5, APPROVED: 5, UNDER_REVIEW: 4, PENDING: 3, REFUNDED: 2, REJECTED: 1, CANCELLED: 0, ERROR: 0 };

function pageValues(page?: number, pageSize?: number) { return { page: Math.max(1, Math.floor(page ?? 1)), pageSize: Math.min(maxPageSize, Math.max(1, Math.floor(pageSize ?? defaultPageSize))) }; }
function dayStart(value: string) { return new Date(`${value}T00:00:00-05:00`); }
function dayAfter(value: string) { return new Date(dayStart(value).getTime() + 86_400_000); }
function numberValue(value: unknown) { return Number(value ?? 0); }

function salesWhere(db: ReturnType<typeof getDb>, filters: SalesFilters) {
  const conditions: SQL[] = [];
  if (filters.query) { const pattern = `%${filters.query.trim()}%`; conditions.push(or(ilike(sales.code, pattern), ilike(customers.name, pattern), ilike(customers.email, pattern))!); }
  if (filters.status) conditions.push(eq(sales.status, filters.status));
  if (filters.sellerId) conditions.push(eq(sales.sellerId, filters.sellerId));
  if (filters.customerId) conditions.push(eq(sales.customerId, filters.customerId));
  if (filters.quoteId) conditions.push(eq(sales.quoteId, filters.quoteId));
  if (filters.orderId) conditions.push(exists(db.select({ id: orders.id }).from(orders).where(and(eq(orders.saleId, sales.id), eq(orders.id, filters.orderId)))));
  if (filters.paymentStatus) conditions.push(exists(db.select({ id: payments.id }).from(payments).innerJoin(orders, eq(payments.orderId, orders.id)).where(and(eq(orders.saleId, sales.id), eq(payments.status, filters.paymentStatus as (typeof payments.status.enumValues)[number])))));
  if (filters.invoiceStatus) conditions.push(eq(sales.invoiceStatus, filters.invoiceStatus));
  if (filters.createdFrom) conditions.push(gte(sales.createdAt, dayStart(filters.createdFrom)));
  if (filters.createdTo) conditions.push(lt(sales.createdAt, dayAfter(filters.createdTo)));
  return conditions.length ? and(...conditions) : undefined;
}

function paymentState(rows: Array<{ status: string }>) { return rows.reduce<string | null>((current, row) => !current || (paymentPriority[row.status] ?? -1) > (paymentPriority[current] ?? -1) ? row.status : current, null); }

export async function getSalesPage(filters: SalesFilters = {}): Promise<SalesPageResponse> {
  const { page, pageSize } = pageValues(filters.page, filters.pageSize);
  const db = getDb();
  const where = salesWhere(db, filters);
  const [rows, totalRows, statusRows, amountRow, confirmedAmountRow, currencyRows] = await Promise.all([
    db.select({ sale: sales, customerName: customers.name, customerEmail: customers.email, sellerName: seller.name, sellerEmail: seller.email, quoteTrackingCode: quotes.trackingCode, opportunityCode: opportunities.code, opportunityTitle: opportunities.title, orderId: orders.id, orderCode: orders.code, orderStatus: orders.status }).from(sales).innerJoin(customers, eq(sales.customerId, customers.id)).leftJoin(seller, eq(sales.sellerId, seller.id)).leftJoin(quotes, eq(sales.quoteId, quotes.id)).leftJoin(opportunities, eq(sales.opportunityId, opportunities.id)).leftJoin(orders, eq(orders.saleId, sales.id)).where(where).orderBy(desc(sales.updatedAt), asc(sales.code)).limit(pageSize).offset((page - 1) * pageSize),
    db.select({ total: count(sales.id) }).from(sales).innerJoin(customers, eq(sales.customerId, customers.id)).where(where),
    db.select({ status: sales.status, total: count(sales.id) }).from(sales).innerJoin(customers, eq(sales.customerId, customers.id)).where(where).groupBy(sales.status),
    db.select({ total: sum(sales.total) }).from(sales).innerJoin(customers, eq(sales.customerId, customers.id)).where(where),
    db.select({ total: sum(sales.total) }).from(sales).innerJoin(customers, eq(sales.customerId, customers.id)).where(and(where, eq(sales.status, "CONFIRMED"))),
    db.selectDistinct({ value: sales.currency }).from(sales).innerJoin(customers, eq(sales.customerId, customers.id)).where(where).orderBy(sales.currency),
  ]);
  const saleIds = rows.map((row) => row.sale.id);
  const [itemRows, paymentRows] = await Promise.all([
    saleIds.length ? db.select({ saleId: saleItems.saleId, total: count(saleItems.id) }).from(saleItems).where(inArray(saleItems.saleId, saleIds)).groupBy(saleItems.saleId) : Promise.resolve([]),
    saleIds.length ? db.select({ saleId: orders.saleId, status: payments.status }).from(payments).innerJoin(orders, eq(payments.orderId, orders.id)).where(inArray(orders.saleId, saleIds)) : Promise.resolve([]),
  ]);
  const lineCounts = new Map(itemRows.map((row) => [row.saleId, numberValue(row.total)]));
  const paymentsBySale = new Map<string, Array<{ status: string }>>();
  for (const row of paymentRows) paymentsBySale.set(row.saleId, [...(paymentsBySale.get(row.saleId) ?? []), { status: row.status }]);
  const items: SalesListItem[] = rows.map((row) => ({ ...row.sale, customerName: row.customerName, customerEmail: row.customerEmail, sellerName: row.sellerName, sellerEmail: row.sellerEmail, quoteTrackingCode: row.quoteTrackingCode, opportunityCode: row.opportunityCode, opportunityTitle: row.opportunityTitle, lineCount: lineCounts.get(row.sale.id) ?? 0, paymentStatus: paymentState(paymentsBySale.get(row.sale.id) ?? []), orderId: row.orderId, orderCode: row.orderCode, orderStatus: row.orderStatus }));
  const totalItems = numberValue(totalRows[0]?.total);
  const totalAmount = numberValue(amountRow[0]?.total);
  const confirmed = numberValue(statusRows.find((row) => row.status === "CONFIRMED")?.total);
  const cancelled = numberValue(statusRows.find((row) => row.status === "CANCELLED")?.total);
  const denominator = confirmed + cancelled;
  return { items, page: Math.min(page, Math.max(1, Math.ceil(totalItems / pageSize))), pageSize, totalItems, totalPages: Math.max(1, Math.ceil(totalItems / pageSize)), metrics: { total: totalItems, confirmed, cancelled, pending: numberValue(statusRows.find((row) => row.status === "DRAFT")?.total), totalAmount, averageTicket: confirmed ? Number((numberValue(confirmedAmountRow[0]?.total) / confirmed).toFixed(2)) : null, conversionRate: denominator ? Number(((confirmed / denominator) * 100).toFixed(2)) : null }, facets: { statuses: statusRows.map((row) => row.status), currencies: currencyRows.map((row) => row.value) } };
}

export async function getSaleDetail(saleId: string) {
  const db = getDb();
  const [row] = await db.select({ sale: sales, customer: customers, quote: quotes, opportunity: opportunities }).from(sales).innerJoin(customers, eq(sales.customerId, customers.id)).leftJoin(quotes, eq(sales.quoteId, quotes.id)).leftJoin(opportunities, eq(sales.opportunityId, opportunities.id)).where(eq(sales.id, saleId)).limit(1);
  if (!row) return null;
  const [items, orderRows, audit] = await Promise.all([
    db.select().from(saleItems).where(eq(saleItems.saleId, saleId)).orderBy(asc(saleItems.createdAt)),
    db.select({ order: orders, payment: payments }).from(orders).leftJoin(payments, eq(payments.orderId, orders.id)).where(eq(orders.saleId, saleId)).orderBy(desc(orders.createdAt)),
    db.select().from(auditLogs).where(and(eq(auditLogs.entityType, "sale"), eq(auditLogs.entityId, saleId))).orderBy(desc(auditLogs.createdAt)).limit(100),
  ]);
  const orderIds = orderRows.map((entry) => entry.order.id);
  const orderLineRows = orderIds.length ? await db.select().from(orderItems).where(inArray(orderItems.orderId, orderIds)) : [];
  return { sale: row.sale, customer: row.customer, quote: row.quote, opportunity: row.opportunity, items, orders: orderRows.map((entry) => ({ ...entry.order, payments: entry.payment ? [entry.payment] : [], items: orderLineRows.filter((item) => item.orderId === entry.order.id) })), invoice: { status: row.sale.invoiceStatus, externalReference: row.sale.externalInvoiceReference }, audit };
}
