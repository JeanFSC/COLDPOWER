import { alias } from "drizzle-orm/pg-core";
import {
  and,
  asc,
  count,
  countDistinct,
  desc,
  eq,
  exists,
  gte,
  ilike,
  inArray,
  isNull,
  lt,
  not,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { getDb } from "@/db";
import { auditLogs, quotes, users } from "@/db/schema";
import { customers, opportunities } from "@/db/crm-schema";
import { orderItems, orders, paymentRefunds, payments, saleItems, sales } from "@/db/sales-schema";
import type {
  SalesFilters,
  SalesFinancialState,
  SalesListItem,
  SalesPageResponse,
} from "@/lib/sales-contract";
import { summarizePaymentLedger } from "@/lib/payments-contract";

const defaultPageSize = 25;
const maxPageSize = 100;
const seller = alias(users, "sales_seller");

function pageValues(page?: number, pageSize?: number) {
  return {
    page: Math.max(1, Math.floor(page ?? 1)),
    pageSize: Math.min(maxPageSize, Math.max(1, Math.floor(pageSize ?? defaultPageSize))),
  };
}
function dayStart(value: string) {
  return new Date(`${value}T00:00:00-05:00`);
}
function dayAfter(value: string) {
  return new Date(dayStart(value).getTime() + 86_400_000);
}
function numberValue(value: unknown) {
  return Number(value ?? 0);
}

const receivedForSale = sql<number>`coalesce((select sum(p.amount - coalesce((select sum(r.amount) from payment_refunds r where r.payment_id = p.id and r.currency = p.currency and r.status = 'SUCCEEDED'), 0)) from payments p inner join orders o on o.id = p.order_id where o.sale_id = ${sales.id} and p.currency = ${sales.currency} and p.status in ('CONFIRMED', 'APPROVED', 'REFUNDED')), 0)`;

function salesListRows(db: ReturnType<typeof getDb>, where: SQL | undefined, pageSize: number, page = 1) {
  return db
    .select({
      sale: sales,
      customerName: customers.name,
      customerEmail: customers.email,
      sellerName: seller.name,
      sellerEmail: seller.email,
      quoteTrackingCode: quotes.trackingCode,
      opportunityCode: opportunities.code,
      opportunityTitle: opportunities.title,
      orderId: orders.id,
      orderCode: orders.code,
      orderStatus: orders.status,
    })
    .from(sales)
    .innerJoin(customers, eq(sales.customerId, customers.id))
    .leftJoin(seller, eq(sales.sellerId, seller.id))
    .leftJoin(quotes, eq(sales.quoteId, quotes.id))
    .leftJoin(opportunities, eq(sales.opportunityId, opportunities.id))
    .leftJoin(orders, eq(orders.saleId, sales.id))
    .where(where)
    .orderBy(desc(sales.updatedAt), asc(sales.code))
    .limit(pageSize)
    .offset((page - 1) * pageSize);
}

function salesWhere(db: ReturnType<typeof getDb>, filters: SalesFilters) {
  const conditions: SQL[] = [];
  if (filters.query) {
    const pattern = `%${filters.query.trim()}%`;
    conditions.push(
      or(
        ilike(sales.code, pattern),
        ilike(customers.name, pattern),
        ilike(customers.email, pattern),
        ilike(sales.externalInvoiceReference, pattern),
        exists(
          db
            .select({ id: quotes.id })
            .from(quotes)
            .where(and(eq(quotes.id, sales.quoteId), ilike(quotes.trackingCode, pattern))),
        ),
        exists(
          db
            .select({ id: orders.id })
            .from(orders)
            .where(and(eq(orders.saleId, sales.id), ilike(orders.code, pattern))),
        ),
      )!,
    );
  }
  if (filters.status) conditions.push(eq(sales.status, filters.status));
  if (filters.sellerId) conditions.push(eq(sales.sellerId, filters.sellerId));
  if (filters.sellerQuery) {
    const pattern = `%${filters.sellerQuery.trim()}%`;
    conditions.push(
      exists(
        db
          .select({ id: users.id })
          .from(users)
          .where(and(eq(users.id, sales.sellerId), ilike(users.name, pattern))),
      ),
    );
  }
  if (filters.customerId) conditions.push(eq(sales.customerId, filters.customerId));
  if (filters.customerQuery) conditions.push(ilike(customers.name, `%${filters.customerQuery.trim()}%`));
  if (filters.quoteId) conditions.push(eq(sales.quoteId, filters.quoteId));
  if (filters.orderId)
    conditions.push(
      exists(
        db
          .select({ id: orders.id })
          .from(orders)
          .where(and(eq(orders.saleId, sales.id), eq(orders.id, filters.orderId))),
      ),
    );
  if (filters.paymentStatus)
    conditions.push(
      exists(
        db
          .select({ id: payments.id })
          .from(payments)
          .innerJoin(orders, eq(payments.orderId, orders.id))
          .where(
            and(
              eq(orders.saleId, sales.id),
              eq(
                payments.status,
                filters.paymentStatus as (typeof payments.status.enumValues)[number],
              ),
            ),
          ),
      ),
    );
  const hasOrder = exists(
    db.select({ id: orders.id }).from(orders).where(eq(orders.saleId, sales.id)),
  );
  if (filters.paymentReconciliation === "NO_ORDER") conditions.push(not(hasOrder));
  if (filters.paymentReconciliation === "PENDING")
    conditions.push(and(hasOrder, sql`${receivedForSale} <= 0.005`)!);
  if (filters.paymentReconciliation === "PARTIAL")
    conditions.push(
      and(
        hasOrder,
        sql`${receivedForSale} > 0.005 and ${receivedForSale} < ${sales.total} - 0.005`,
      )!,
    );
  if (filters.paymentReconciliation === "PAID")
    conditions.push(
      and(
        hasOrder,
        sql`${receivedForSale} >= ${sales.total} - 0.005 and ${receivedForSale} <= ${sales.total} + 0.005`,
      )!,
    );
  if (filters.paymentReconciliation === "OVERPAID")
    conditions.push(and(hasOrder, sql`${receivedForSale} > ${sales.total} + 0.005`)!);
  if (filters.paymentReconciliation === "OBSERVED")
    conditions.push(
      and(
        hasOrder,
        sql`${receivedForSale} <= 0.005`,
        exists(
          db
            .select({ id: payments.id })
            .from(payments)
            .innerJoin(orders, eq(payments.orderId, orders.id))
            .where(
              and(
                eq(orders.saleId, sales.id),
                inArray(payments.status, ["UNDER_REVIEW", "REJECTED", "ERROR"]),
              ),
            ),
        ),
      )!,
    );
  if (filters.invoiceStatus) conditions.push(eq(sales.invoiceStatus, filters.invoiceStatus));
  if (filters.currency) conditions.push(eq(sales.currency, filters.currency));
  if (filters.channel) conditions.push(eq(sales.channel, filters.channel));
  if (filters.createdFrom) conditions.push(gte(sales.createdAt, dayStart(filters.createdFrom)));
  if (filters.createdTo) conditions.push(lt(sales.createdAt, dayAfter(filters.createdTo)));
  return conditions.length ? and(...conditions) : undefined;
}

function financialState(
  expected: number,
  received: number,
  hasOrder: boolean,
  observed: boolean,
): SalesFinancialState {
  if (!hasOrder) return "NO_ORDER";
  if (observed && received <= 0.005) return "OBSERVED";
  if (received <= 0.005) return "PENDING";
  if (received + 0.005 < expected) return "PARTIAL";
  if (received > expected + 0.005) return "OVERPAID";
  return "PAID";
}

export async function getSalesPage(filters: SalesFilters = {}): Promise<SalesPageResponse> {
  const { page, pageSize } = pageValues(filters.page, filters.pageSize);
  const db = getDb();
  const where = salesWhere(db, filters);
  const pendingQueueWhere = and(
    where,
    or(
      isNull(orders.id),
      sql`${receivedForSale} < ${sales.total} - 0.005`,
      exists(
        db
          .select({ id: payments.id })
          .from(payments)
          .where(
            and(
              eq(payments.orderId, orders.id),
              inArray(payments.status, ["UNDER_REVIEW", "REJECTED", "ERROR"]),
            ),
          ),
      ),
    ),
  );
  const invoiceQueueWhere = and(where, or(isNull(sales.invoiceStatus), sql`${sales.invoiceStatus} <> 'ISSUED'`));
  const alertQueueWhere = and(
    where,
    or(
      isNull(orders.id),
      eq(sales.invoiceStatus, "ERROR"),
      exists(
        db
          .select({ id: payments.id })
          .from(payments)
          .where(
            and(
              eq(payments.orderId, orders.id),
              inArray(payments.status, ["UNDER_REVIEW", "REJECTED", "ERROR"]),
            ),
          ),
      ),
      and(eq(sales.status, "CONFIRMED"), eq(orders.status, "CANCELLED")),
    ),
  );
  const [
    rows,
    totalRows,
    statusRows,
    currencyRows,
    channelRows,
    moneyRows,
    receivedRows,
    paymentMethodRows,
    channelBreakdownRows,
    alertRows,
    pendingQueueRows,
    invoiceQueueRows,
    alertQueueRows,
  ] = await Promise.all([
    salesListRows(db, where, pageSize, page),
    db
      .select({ total: count(sales.id) })
      .from(sales)
      .innerJoin(customers, eq(sales.customerId, customers.id))
      .where(where),
    db
      .select({ status: sales.status, total: count(sales.id) })
      .from(sales)
      .innerJoin(customers, eq(sales.customerId, customers.id))
      .where(where)
      .groupBy(sales.status),
    db
      .selectDistinct({ value: sales.currency })
      .from(sales)
      .innerJoin(customers, eq(sales.customerId, customers.id))
      .where(where)
      .orderBy(sales.currency),
    db
      .selectDistinct({ value: sales.channel })
      .from(sales)
      .innerJoin(customers, eq(sales.customerId, customers.id))
      .where(where)
      .orderBy(sales.channel),
    db
      .select({
        currency: sales.currency,
        saleCount: count(sales.id),
        expectedAmount: sql<string>`coalesce(sum(${sales.total}), 0)`,
      })
      .from(sales)
      .innerJoin(customers, eq(sales.customerId, customers.id))
      .where(and(where, eq(sales.status, "CONFIRMED")))
      .groupBy(sales.currency),
    db
      .select({
        currency: sales.currency,
        receivedAmount: sql<string>`coalesce(sum(case when ${payments.status} in ('CONFIRMED', 'APPROVED', 'REFUNDED') then ${payments.amount} - coalesce((select sum(${paymentRefunds.amount}) from ${paymentRefunds} where ${paymentRefunds.paymentId} = ${payments.id} and ${paymentRefunds.currency} = ${payments.currency} and ${paymentRefunds.status} = 'SUCCEEDED'), 0) else 0 end), 0)`,
      })
      .from(sales)
      .innerJoin(customers, eq(sales.customerId, customers.id))
      .leftJoin(orders, eq(orders.saleId, sales.id))
      .leftJoin(payments, and(eq(payments.orderId, orders.id), eq(payments.currency, sales.currency)))
      .where(and(where, eq(sales.status, "CONFIRMED")))
      .groupBy(sales.currency),
    db
      .select({ method: payments.method, total: count(payments.id) })
      .from(payments)
      .innerJoin(orders, eq(payments.orderId, orders.id))
      .innerJoin(sales, eq(orders.saleId, sales.id))
      .innerJoin(customers, eq(sales.customerId, customers.id))
      .where(
        and(
          where,
          eq(sales.status, "CONFIRMED"),
          eq(payments.currency, sales.currency),
          inArray(payments.status, ["CONFIRMED", "APPROVED", "REFUNDED"]),
        ),
      )
      .groupBy(payments.method)
      .orderBy(desc(count(payments.id)))
      .limit(8),
    db
      .select({ channel: sales.channel, total: count(sales.id) })
      .from(sales)
      .innerJoin(customers, eq(sales.customerId, customers.id))
      .where(and(where, eq(sales.status, "CONFIRMED")))
      .groupBy(sales.channel)
      .orderBy(desc(count(sales.id)))
      .limit(8),
    db
      .select({ total: countDistinct(sales.id) })
      .from(sales)
      .innerJoin(customers, eq(sales.customerId, customers.id))
      .leftJoin(orders, eq(orders.saleId, sales.id))
      .where(
        and(
          where,
          or(
            isNull(orders.id),
            eq(sales.invoiceStatus, "ERROR"),
            exists(
            db
                .select({ id: payments.id })
                .from(payments)
                .where(
                  and(
                    eq(payments.orderId, orders.id),
                    inArray(payments.status, ["UNDER_REVIEW", "REJECTED", "ERROR"]),
                  ),
                ),
            ),
            and(eq(sales.status, "CONFIRMED"), eq(orders.status, "CANCELLED")),
          ),
        ),
      ),
    salesListRows(db, pendingQueueWhere, 5),
    salesListRows(db, invoiceQueueWhere, 5),
    salesListRows(db, alertQueueWhere, 5),
  ]);
  const allRows = [...rows, ...pendingQueueRows, ...invoiceQueueRows, ...alertQueueRows];
  const saleIds = [...new Set(allRows.map((row) => row.sale.id))];
  const [itemRows, paymentRows] = await Promise.all([
    saleIds.length
      ? db
          .select({ saleId: saleItems.saleId, total: count(saleItems.id) })
          .from(saleItems)
          .where(inArray(saleItems.saleId, saleIds))
          .groupBy(saleItems.saleId)
      : Promise.resolve([]),
    saleIds.length
      ? db
          .select({
            saleId: orders.saleId,
            orderId: orders.id,
            paymentId: payments.id,
            status: payments.status,
            amount: payments.amount,
            refundedAmount: sql<string>`coalesce((select sum(${paymentRefunds.amount}) from ${paymentRefunds} where ${paymentRefunds.paymentId} = ${payments.id} and ${paymentRefunds.currency} = ${payments.currency} and ${paymentRefunds.status} = 'SUCCEEDED'), 0)`,
          })
          .from(payments)
          .innerJoin(orders, eq(payments.orderId, orders.id))
          .innerJoin(sales, eq(orders.saleId, sales.id))
          .where(and(inArray(orders.saleId, saleIds), eq(payments.currency, sales.currency)))
      : Promise.resolve([]),
  ]);
  const lineCounts = new Map(itemRows.map((row) => [row.saleId, numberValue(row.total)]));
  const paymentsBySale = new Map<
    string,
    {
      payments: Array<{ amount: string; status: string }>;
      refunds: Array<{ amount: string; status: string }>;
      observed: boolean;
      hasOrder: boolean;
      rawStatus: string | null;
    }
  >();
  for (const row of paymentRows) {
    const current = paymentsBySale.get(row.saleId) ?? {
      payments: [],
      refunds: [],
      observed: false,
      hasOrder: Boolean(row.orderId),
      rawStatus: null,
    };
    const refunded = numberValue(row.refundedAmount);
    current.payments.push({ amount: row.amount, status: row.status });
    if (refunded > 0) current.refunds.push({ amount: row.refundedAmount, status: "SUCCEEDED" });
    if (["UNDER_REVIEW", "REJECTED", "ERROR"].includes(row.status)) current.observed = true;
    current.rawStatus = row.status;
    current.hasOrder = current.hasOrder || Boolean(row.orderId);
    paymentsBySale.set(row.saleId, current);
  }
  const toItem = (row: (typeof rows)[number]): SalesListItem => {
    const financial = paymentsBySale.get(row.sale.id) ?? {
      payments: [],
      refunds: [],
      observed: false,
      hasOrder: Boolean(row.orderId),
      rawStatus: null,
    };
    const expected = numberValue(row.sale.total);
    const ledger = summarizePaymentLedger(expected, financial.payments, financial.refunds);
    const state = financialState(
      expected,
      ledger.net,
      financial.hasOrder,
      financial.observed,
    );
    return {
      ...row.sale,
      customerName: row.customerName,
      customerEmail: row.customerEmail,
      sellerName: row.sellerName,
      sellerEmail: row.sellerEmail,
      quoteTrackingCode: row.quoteTrackingCode,
      opportunityCode: row.opportunityCode,
      opportunityTitle: row.opportunityTitle,
      lineCount: lineCounts.get(row.sale.id) ?? 0,
      paymentStatus: financial.rawStatus,
      payment: {
        expectedAmount: expected.toFixed(2),
        receivedAmount: ledger.net.toFixed(2),
        refundedAmount: ledger.refunded.toFixed(2),
        difference: ledger.difference.toFixed(2),
        state,
      },
      orderId: row.orderId,
      orderCode: row.orderCode,
      orderStatus: row.orderStatus,
    };
  };
  const items = rows.map(toItem);
  const totalItems = numberValue(totalRows[0]?.total);
  const confirmed = numberValue(statusRows.find((row) => row.status === "CONFIRMED")?.total);
  const cancelled = numberValue(statusRows.find((row) => row.status === "CANCELLED")?.total);
  const receivedByCurrency = new Map(
    receivedRows.map((row) => [row.currency, numberValue(row.receivedAmount)]),
  );
  const moneyByCurrency = moneyRows.map((row) => {
    const expected = numberValue(row.expectedAmount);
    const received = receivedByCurrency.get(row.currency) ?? 0;
    const count = numberValue(row.saleCount);
    return {
      currency: row.currency,
      saleCount: count,
      expectedAmount: expected.toFixed(2),
      receivedAmount: received.toFixed(2),
      pendingAmount: Math.max(0, expected - received).toFixed(2),
      averageTicket: count ? (expected / count).toFixed(2) : null,
    };
  });
  const singleCurrency = moneyByCurrency.length === 1 ? moneyByCurrency[0] : null;
  return {
    items,
    queues: {
      pending: pendingQueueRows.map(toItem),
      invoices: invoiceQueueRows.map(toItem),
      alerts: alertQueueRows.map(toItem),
    },
    page: Math.min(page, Math.max(1, Math.ceil(totalItems / pageSize))),
    pageSize,
    totalItems,
    totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
    metrics: {
      total: totalItems,
      confirmed,
      cancelled,
      pending: numberValue(statusRows.find((row) => row.status === "DRAFT")?.total),
      alertCount: numberValue(alertRows[0]?.total),
      moneyByCurrency,
      totalAmount: singleCurrency ? numberValue(singleCurrency.expectedAmount) : null,
      averageTicket: singleCurrency?.averageTicket
        ? numberValue(singleCurrency.averageTicket)
        : null,
      conversionRate: null,
      paymentBreakdown: paymentMethodRows.map((row) => ({
        method: row.method,
        count: numberValue(row.total),
      })),
      channelBreakdown: channelBreakdownRows.flatMap((row) =>
        row.channel ? [{ channel: row.channel, count: numberValue(row.total) }] : [],
      ),
    },
    facets: {
      statuses: statusRows.map((row) => row.status),
      currencies: currencyRows.map((row) => row.value),
      channels: channelRows.flatMap((row) => (row.value ? [row.value] : [])),
    },
  };
}

export async function getSaleDetail(
  saleId: string,
  options: { includeFinancial?: boolean } = {},
) {
  const db = getDb();
  const includeFinancial = options.includeFinancial ?? true;
  const [row] = await db
    .select({
      sale: sales,
      customer: customers,
      quote: quotes,
      opportunity: opportunities,
      sellerName: seller.name,
      sellerEmail: seller.email,
    })
    .from(sales)
    .innerJoin(customers, eq(sales.customerId, customers.id))
    .leftJoin(quotes, eq(sales.quoteId, quotes.id))
    .leftJoin(opportunities, eq(sales.opportunityId, opportunities.id))
    .leftJoin(seller, eq(sales.sellerId, seller.id))
    .where(eq(sales.id, saleId))
    .limit(1);
  if (!row) return null;
  const [items, orderRows] = await Promise.all([
    db
      .select()
      .from(saleItems)
      .where(eq(saleItems.saleId, saleId))
      .orderBy(asc(saleItems.createdAt)),
    db
      .select({
        order: orders,
        payment: payments,
        refundedAmount: sql<string>`coalesce((select sum(r.amount) from payment_refunds r where r.payment_id = ${payments.id} and r.status = 'SUCCEEDED'), 0)`,
      })
      .from(orders)
      .leftJoin(payments, and(eq(payments.orderId, orders.id), eq(payments.currency, row.sale.currency)))
      .where(eq(orders.saleId, saleId))
      .orderBy(desc(orders.createdAt)),
  ]);
  const orderIds = orderRows.map((entry) => entry.order.id);
  const auditScope = [
    and(eq(auditLogs.entityType, "sale"), eq(auditLogs.entityId, saleId)),
    ...(orderIds.length
      ? [and(eq(auditLogs.entityType, "order"), inArray(auditLogs.entityId, orderIds))]
      : []),
    ...(row.quote
      ? [and(eq(auditLogs.entityType, "quote"), eq(auditLogs.entityId, row.quote.id))]
      : []),
  ];
  const [orderLineRows, audit] = await Promise.all([
    orderIds.length
      ? db.select().from(orderItems).where(inArray(orderItems.orderId, orderIds))
      : Promise.resolve([]),
    db.select().from(auditLogs).where(or(...auditScope)).orderBy(desc(auditLogs.createdAt)).limit(100),
  ]);
  return {
    sale: row.sale,
    customer: row.customer,
    sellerName: row.sellerName,
    sellerEmail: row.sellerEmail,
    quote: row.quote,
    opportunity: row.opportunity,
    items,
    orders: orderRows.map((entry) => ({
      ...entry.order,
      ...(includeFinancial
        ? {
            payments: entry.payment
              ? [{ ...entry.payment, refundedAmount: entry.refundedAmount }]
              : [],
          }
        : {}),
      items: orderLineRows.filter((item) => item.orderId === entry.order.id),
    })),
    invoice: {
      status: row.sale.invoiceStatus,
      externalReference: row.sale.externalInvoiceReference,
    },
    audit,
  };
}
