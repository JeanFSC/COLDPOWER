import { alias } from "drizzle-orm/pg-core";
import { and, count, desc, eq, exists, gte, inArray, isNull, lt, notInArray, or, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/db";
import { auditLogs, brands, categories, families, inventoryBalances, inventoryReservations, locations, products, quotes, transfers, users } from "@/db/schema";
import { crmTasks, customers, opportunityItems, opportunities } from "@/db/crm-schema";
import { orderItems, orders, paymentRefunds, payments, saleItems, sales } from "@/db/sales-schema";
import type { DashboardFilters, DashboardGranularity } from "@/lib/dashboard-contract";
export type { DashboardFilters, DashboardRange } from "@/lib/dashboard-contract";
import type { AppRole } from "@/lib/roles";
import { can } from "@/lib/roles";
import { getPublishedMediaForEntities } from "@/lib/media-repository";
import { withRuntimeCache } from "@/lib/runtime-cache";
import { opportunityStageProbability } from "@/lib/opportunity-stage-config";
import { deltaPct, formatPeriodDelta } from "@/lib/period-metrics";
import { isActiveOrderStatus, getPipelineMacroStage, PIPELINE_MACRO_STAGE_ORDER, PIPELINE_MACRO_STAGE_LABELS, buildKpiView, resolveGranularity } from "@/lib/dashboard-definitions";
import { actionLabel as auditActionLabel, entityLabel as auditEntityLabel } from "@/lib/audit-contract";
import { getOpenQuoteCount } from "@/lib/quote-repository";

type Window = { from: Date; to: Date };
export type DashboardActor = { userId?: string; role: AppRole };
const LIMA_TIMEZONE = "America/Lima";
const DAY_MS = 86400000;
const dashboardOrderIdReference = sql.raw('\"orders\".\"id\"');
const dashboardOrderCurrencyReference = sql.raw('\"orders\".\"currency\"');
const dashboardGrossForOrder = sql<number>`coalesce((select sum(p2.amount) from payments p2 where p2.order_id = ${dashboardOrderIdReference} and p2.currency = ${dashboardOrderCurrencyReference} and p2.status in ('CONFIRMED','APPROVED','REFUNDED')), 0)`;
const dashboardRefundsForOrder = sql<number>`coalesce((select sum(r.amount) from payment_refunds r join payments p3 on p3.id = r.payment_id where p3.order_id = ${dashboardOrderIdReference} and p3.currency = ${dashboardOrderCurrencyReference} and r.currency = p3.currency and r.status = 'SUCCEEDED'), 0)`;
const dashboardNetForOrder = sql<number>`(${dashboardGrossForOrder} - ${dashboardRefundsForOrder})`;

export function financialMetrics(input: { revenue: number | null; costOfSales: number | null; operatingExpenses: number | null }) {
  const grossProfit = input.revenue !== null && input.costOfSales !== null ? input.revenue - input.costOfSales : null;
  const grossMargin = grossProfit !== null && input.revenue !== null && input.revenue !== 0 ? grossProfit / input.revenue : null;
  const operatingProfit = grossProfit !== null && input.operatingExpenses !== null ? grossProfit - input.operatingExpenses : null;
  return {
    ...input,
    grossProfit,
    grossMargin,
    operatingProfit,
    profitability: operatingProfit !== null && input.revenue !== null && input.revenue !== 0 ? operatingProfit / input.revenue : null,
  };
}
function limaParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: LIMA_TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hour12: false }).formatToParts(date);
  return { year: Number(parts.find((part) => part.type === "year")?.value), month: Number(parts.find((part) => part.type === "month")?.value), day: Number(parts.find((part) => part.type === "day")?.value), hour: Number(parts.find((part) => part.type === "hour")?.value) % 24 };
}
function limaDayKey(date: Date) {
  const parts = limaParts(date);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}
export type SalesSeriesPoint = { date: string; total: number; count: number; orders?: number; units?: number; margin?: number | null };
export type DashboardCurrencyBreakdown = { currency: string; sales: number; salesCount: number };
type ProductTrendRow = { productId: string; date: string; revenue: string | number | null };
type ProductRevenueRow = { productId: string; revenue: string | number | null };

export type DashboardComparisonInput = {
  sales: { current: number; previous: number };
  quotes: { current: number; previous: number };
  orders: { current: number; previous: number };
  criticalStock: { current: number; previous: number };
};

export function dashboardComparisons(input: DashboardComparisonInput) {
  const compare = (metric: { current: number; previous: number }) => ({
    ...metric,
    percentage: deltaPct(metric.current, metric.previous),
  });
  return {
    sales: compare(input.sales),
    quotes: compare(input.quotes),
    orders: compare(input.orders),
    criticalStock: compare(input.criticalStock),
  };
}

function bucketKey(date: Date, granularity: DashboardGranularity) {
  const parts = limaParts(date);
  if (granularity === "hour") return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}T${String(parts.hour).padStart(2, "0")}:00`;
  if (granularity === "month") return `${parts.year}-${String(parts.month).padStart(2, "0")}-01`;
  const local = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  if (granularity === "week") local.setUTCDate(local.getUTCDate() - ((local.getUTCDay() + 6) % 7));
  return `${local.getUTCFullYear()}-${String(local.getUTCMonth() + 1).padStart(2, "0")}-${String(local.getUTCDate()).padStart(2, "0")}`;
}

function bucketStart(date: Date, granularity: DashboardGranularity) {
  const parts = limaParts(date);
  if (granularity === "hour") return new Date(Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour + 5));
  const start = new Date(Date.UTC(parts.year, parts.month - 1, granularity === "month" ? 1 : parts.day, 5));
  if (granularity === "week") start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
  return start;
}

function nextBucket(date: Date, granularity: DashboardGranularity) {
  if (granularity === "hour") return new Date(date.getTime() + 3_600_000);
  if (granularity === "day") return new Date(date.getTime() + DAY_MS);
  if (granularity === "week") return new Date(date.getTime() + 7 * DAY_MS);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1, 5));
}

export function fillSalesSeries(window: Window, rows: SalesSeriesPoint[], granularity: DashboardGranularity = "day"): SalesSeriesPoint[] {
  const byBucket = new Map(rows.map((row) => [row.date, row]));
  const series: SalesSeriesPoint[] = [];
  for (let cursor = bucketStart(window.from, granularity); cursor < window.to; cursor = nextBucket(cursor, granularity)) {
    const date = bucketKey(cursor, granularity);
    series.push(byBucket.get(date) ?? { date, total: 0, count: 0 });
  }
  return series;
}
function fillProductRevenueTrend(window: Window, rows: ProductTrendRow[]) {
  const series = fillSalesSeries(window, rows.map((row) => ({ date: row.date, total: Number(row.revenue ?? 0), count: 0 })), "day").map((row) => row.total);
  return series.length > 1 && series.some((value) => value > 0) ? series : undefined;
}
function startOfDay(date: Date) { const parts = limaParts(date); return new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 5)); }
function parseDate(value?: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 5));
}
function resolveWindow(filters: DashboardFilters, now = new Date()): Window {
  const today = startOfDay(now);
  const current = limaParts(now);
  const currentMonthStart = new Date(Date.UTC(current.year, current.month - 1, 1, 5));
  const previousMonthStart = new Date(Date.UTC(current.year, current.month - 2, 1, 5));
  if (filters.range === "today") return { from: today, to: new Date(today.getTime() + DAY_MS) };
  if (filters.range === "yesterday") return { from: new Date(today.getTime() - DAY_MS), to: today };
  if (filters.range === "week") {
    const monday = (today.getUTCDay() + 6) % 7;
    return { from: new Date(today.getTime() - monday * DAY_MS), to: new Date(today.getTime() + DAY_MS) };
  }
  if (filters.range === "custom") {
    const from = parseDate(filters.from) ?? currentMonthStart;
    const end = parseDate(filters.to) ?? today;
    return { from, to: new Date(end.getTime() + DAY_MS) };
  }
  if (filters.range === "current_month") return { from: currentMonthStart, to: new Date(today.getTime() + DAY_MS) };
  if (filters.range === "previous_month") return { from: previousMonthStart, to: currentMonthStart };
  if (filters.range === "year") return { from: new Date(Date.UTC(current.year, 0, 1, 5)), to: new Date(today.getTime() + DAY_MS) };
  return { from: new Date(today.getTime() - 29 * DAY_MS), to: new Date(today.getTime() + DAY_MS) };
}
function conditionList(...conditions: Array<SQL | undefined>) { return conditions.filter(Boolean) as SQL[]; }
const pipelineLabels: Record<string, string> = { NEW: "Nueva", CONTACTED: "Contactada", QUOTING: "Cotizando", QUOTE_SENT: "Cotización enviada", FOLLOW_UP: "Seguimiento", NEGOTIATION: "Negociación", ACCEPTED: "Aceptada", SALE: "Venta", PAYMENT_PENDING: "Pago pendiente", PAID: "Pagada", PREPARING: "Preparando", DELIVERED: "Entregada", CLOSED: "Cerrada", LOST: "Perdida", CANCELLED: "Cancelada", NO_RESPONSE: "Sin respuesta" };
const statusLabels: Record<string, string> = { ACTIVE: "Activo", INACTIVE: "Inactivo", SUSPENDED: "Suspendido" };
const developmentFixtureAuditExclusions = ["cp-mock-v1", "cp-dashboard-v2", "cp-dashboard-v3", "cp-dashboard-v4"];
const entityLabels: Record<string, string> = { product: "Producto", products: "Productos", sale: "Venta", order: "Pedido", quote: "Cotización", opportunity: "Oportunidad", user: "Usuario", payment: "Pago", inventory: "Inventario", company_settings: "Configuración empresarial" };
const actionLabels: Record<string, string> = { "catalog.publication_status_changed": "Cambió el estado de publicación", "catalog.duplicate_decision_changed": "Revisó un posible duplicado", "catalog.product_editorial_updated": "Actualizó un producto", "catalog.product_created": "Creó un producto", "catalog.media_associated": "Asoció una imagen", "catalog.media_removed": "Quitó una imagen", "user.role_changed": "Cambió el rol de un usuario", "inventory.adjustment": "Ajustó inventario", "payments.created": "Registró un pago", "payments.status_changed": "Actualizó el estado de un pago", "payment.status_changed": "Actualizó el estado de un pago", "orders.status_changed": "Actualizó el estado de un pedido", "sales.status_changed": "Actualizó el estado de una venta", "quotes.status_changed": "Actualizó el estado de una cotización", "opportunities.created": "Creó una oportunidad", PRODUCT_CREATED: "Creó un producto", PRODUCT_PUBLICATION_CHANGED: "Cambió el estado de publicación", PRODUCT_DUPLICATE_REVIEWED: "Revisó un posible duplicado", PRODUCT_MEDIA_ASSOCIATED: "Asoció una imagen", PRODUCT_MEDIA_REMOVED: "Quitó una imagen" };
Object.assign(entityLabels, { customer: "Cliente" });
Object.assign(actionLabels, {
  "pricing.price_updated": "Actualizó un precio",
  "quotes.created": "Creó una cotización",
  "orders.created": "Creó un pedido",
  "customers.created": "Registró un cliente",
  "sales.created": "Registró una venta",
});
function dashboardRoleLabel(role: AppRole | null) {
  if (!role) return "Invitados";
  if (["SUPERADMIN", "GERENCIA", "JEFATURA", "ADMIN"].includes(role)) return "Administradores";
  if (["OPERACIONES_VENTAS", "VENTAS"].includes(role)) return "Vendedores";
  if (role === "ALMACEN") return "Almacén";
  if (role === "COMPRAS") return "Compras";
  if (role === "REPORTES") return "Soporte";
  return "Usuarios internos";
}
function productConditions(filters: DashboardFilters) {
  const conditions: SQL[] = [];
  if (filters.productId) conditions.push(eq(products.id, filters.productId));
  if (filters.categoryId) conditions.push(or(eq(products.categoryId, filters.categoryId), eq(products.editorialCategoryId, filters.categoryId))!);
  if (filters.familyId) conditions.push(or(eq(products.familyId, filters.familyId), eq(products.editorialFamilyId, filters.familyId))!);
  if (filters.brandId) conditions.push(or(eq(products.brandId, filters.brandId), eq(products.editorialBrandId, filters.brandId))!);
  return conditions.length ? and(...conditions) : undefined;
}
function salesConditions(db: ReturnType<typeof getDb>, filters: DashboardFilters, window: Window, currency?: string) {
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
function orderConditions(db: ReturnType<typeof getDb>, filters: DashboardFilters, window?: Window, currency?: string) {
  const conditions = conditionList(window ? gte(orders.createdAt, window.from) : undefined, window ? lt(orders.createdAt, window.to) : undefined);
  if (currency) conditions.push(eq(orders.currency, currency));
  if (filters.locationId) conditions.push(eq(orders.locationId, filters.locationId));
  if (filters.sellerId) conditions.push(eq(orders.sellerId, filters.sellerId));
  if (filters.customerId) conditions.push(eq(orders.customerId, filters.customerId));
  if (filters.orderStatus) conditions.push(eq(orders.status, filters.orderStatus as never));
  if (filters.channel) conditions.push(exists(db.select({ id: opportunities.id }).from(opportunities).where(and(eq(opportunities.id, orders.opportunityId), eq(opportunities.origin, filters.channel as never)))));
  const selected = productConditions(filters);
  if (selected) conditions.push(exists(db.select({ id: orderItems.id }).from(orderItems).innerJoin(products, eq(orderItems.productId, products.id)).where(and(eq(orderItems.orderId, orders.id), selected))));
  return conditions;
}
function opportunityConditions(db: ReturnType<typeof getDb>, filters: DashboardFilters, window: Window, currency?: string) {
  const conditions = conditionList(gte(opportunities.createdAt, window.from), lt(opportunities.createdAt, window.to));
  // opportunities.currency is nullable — only push the condition when a currency actually resolved,
  // never eq(opportunities.currency, undefined).
  if (currency) conditions.push(eq(opportunities.currency, currency));
  if (filters.sellerId) conditions.push(eq(opportunities.assignedSellerId, filters.sellerId));
  if (filters.customerId) conditions.push(eq(opportunities.customerId, filters.customerId));
  if (filters.channel) conditions.push(eq(opportunities.origin, filters.channel as never));
  const selected = productConditions(filters);
  if (selected) conditions.push(exists(db.select({ id: opportunityItems.id }).from(opportunityItems).innerJoin(products, eq(opportunityItems.productId, products.id)).where(and(eq(opportunityItems.opportunityId, opportunities.id), selected))));
  return conditions;
}
async function salesMetric(db: ReturnType<typeof getDb>, filters: DashboardFilters, window: Window, currency?: string) {
  const [row] = await db.select({ total: sql<string>`coalesce(sum(${sales.total}), 0)`, count: count() }).from(sales).where(and(...salesConditions(db, filters, window, currency)));
  return { total: Number(row?.total ?? 0), count: Number(row?.count ?? 0) };
}

function previousWindow(window: Window): Window {
  const duration = Math.max(DAY_MS, window.to.getTime() - window.from.getTime());
  return { from: new Date(window.from.getTime() - duration), to: window.from };
}

async function salesSeries(db: ReturnType<typeof getDb>, filters: DashboardFilters, window: Window, currency?: string, granularity: DashboardGranularity = "day") {
  // Group/order by the selected day expression. Using the positional alias also
  // avoids PostgreSQL treating each parametrized timezone fragment as distinct.
  const bucketExpression = granularity === "hour"
    ? sql<string>`to_char(date_trunc('hour', ${sales.createdAt} at time zone ${LIMA_TIMEZONE}), 'YYYY-MM-DD"T"HH24:00')`
    : granularity === "week"
      ? sql<string>`to_char(date_trunc('week', ${sales.createdAt} at time zone ${LIMA_TIMEZONE}), 'YYYY-MM-DD')`
      : granularity === "month"
        ? sql<string>`to_char(date_trunc('month', ${sales.createdAt} at time zone ${LIMA_TIMEZONE}), 'YYYY-MM-DD')`
        : sql<string>`to_char(date_trunc('day', ${sales.createdAt} at time zone ${LIMA_TIMEZONE}), 'YYYY-MM-DD')`;
  const rows = await db.select({
    date: bucketExpression,
    total: sql<string>`coalesce(sum(${sales.total}), 0)`,
    count: count(),
    // NOTE: correlate with the literal "sales.id" text, not the interpolated ${sales.id} column
    // reference. Drizzle renders single-table column interpolations unqualified (bare "id"), and
    // inside these correlated subqueries that bare "id" resolves to the subquery's own table
    // (sale_items.id / orders.id) instead of the outer sales row — silently zeroing every count.
    orders: sql<string>`coalesce(sum((select count(*) from orders order_row where order_row.sale_id = sales.id)), 0)`,
    units: sql<string>`coalesce(sum((select coalesce(sum(sale_item_row.quantity), 0) from sale_items sale_item_row where sale_item_row.sale_id = sales.id)), 0)`,
    lineCount: sql<string>`coalesce(sum((select count(*) from sale_items sale_item_row where sale_item_row.sale_id = sales.id)), 0)`,
    costedLineCount: sql<string>`coalesce(sum((select count(*) from sale_items sale_item_row where sale_item_row.sale_id = sales.id and sale_item_row.cost_snapshot is not null)), 0)`,
    cost: sql<string>`coalesce(sum((select coalesce(sum(sale_item_row.quantity * sale_item_row.cost_snapshot), 0) from sale_items sale_item_row where sale_item_row.sale_id = sales.id)), 0)`,
  }).from(sales).where(and(...salesConditions(db, filters, window, currency))).groupBy(sql`1`).orderBy(sql`1`);
  return fillSalesSeries(window, rows.map((row) => {
    const total = Number(row.total ?? 0);
    const lineCount = Number(row.lineCount ?? 0);
    const costedLineCount = Number(row.costedLineCount ?? 0);
    const point: SalesSeriesPoint = { date: String(row.date), total, count: Number(row.count ?? 0), orders: Number(row.orders ?? 0), units: Number(row.units ?? 0) };
    if (lineCount > 0 && lineCount === costedLineCount && total !== 0) point.margin = (total - Number(row.cost ?? 0)) / total;
    return point;
  }), granularity);
}

function dayBucketExpression(column: typeof payments.createdAt | typeof paymentRefunds.createdAt, granularity: DashboardGranularity) {
  return granularity === "hour"
    ? sql<string>`to_char(date_trunc('hour', ${column} at time zone ${LIMA_TIMEZONE}), 'YYYY-MM-DD"T"HH24:00')`
    : granularity === "week"
      ? sql<string>`to_char(date_trunc('week', ${column} at time zone ${LIMA_TIMEZONE}), 'YYYY-MM-DD')`
      : granularity === "month"
        ? sql<string>`to_char(date_trunc('month', ${column} at time zone ${LIMA_TIMEZONE}), 'YYYY-MM-DD')`
        : sql<string>`to_char(date_trunc('day', ${column} at time zone ${LIMA_TIMEZONE}), 'YYYY-MM-DD')`;
}

// Day-bucketed net collections (confirmed payments minus successful refunds), mirroring
// salesSeries's shape so the "Cobrado" KPI card can show a real trend sparkline instead
// of fabricating one. Only called when the actor can view financials and a currency has
// resolved — see canViewFinancials below.
async function collectedSeries(db: ReturnType<typeof getDb>, filters: DashboardFilters, window: Window, currency: string, granularity: DashboardGranularity = "day") {
  const [paymentRows, refundRows] = await Promise.all([
    db.select({ date: dayBucketExpression(payments.createdAt, granularity), amount: sql<string>`coalesce(sum(${payments.amount}), 0)` })
      .from(payments).innerJoin(orders, eq(payments.orderId, orders.id))
      .where(and(inArray(payments.status, ["CONFIRMED", "APPROVED"]), gte(payments.createdAt, window.from), lt(payments.createdAt, window.to), eq(payments.currency, currency), ...orderConditions(db, filters, undefined, currency)))
      .groupBy(sql`1`).orderBy(sql`1`),
    db.select({ date: dayBucketExpression(paymentRefunds.createdAt, granularity), amount: sql<string>`coalesce(sum(${paymentRefunds.amount}), 0)` })
      .from(paymentRefunds).innerJoin(payments, eq(paymentRefunds.paymentId, payments.id)).innerJoin(orders, eq(payments.orderId, orders.id))
      .where(and(inArray(paymentRefunds.status, ["SUCCESS", "SUCCEEDED", "CONFIRMED", "APPROVED", "COMPLETED"]), gte(paymentRefunds.createdAt, window.from), lt(paymentRefunds.createdAt, window.to), eq(paymentRefunds.currency, currency), ...orderConditions(db, filters, undefined, currency)))
      .groupBy(sql`1`).orderBy(sql`1`),
  ]);
  const refundByDate = new Map(refundRows.map((row) => [String(row.date), Number(row.amount ?? 0)]));
  const points: SalesSeriesPoint[] = paymentRows.map((row) => {
    const date = String(row.date);
    return { date, total: Number(row.amount ?? 0) - (refundByDate.get(date) ?? 0), count: 0 };
  });
  for (const [date, refundAmount] of refundByDate) {
    if (!points.some((point) => point.date === date)) points.push({ date, total: -refundAmount, count: 0 });
  }
  return fillSalesSeries(window, points, granularity);
}

export async function getOperationsDashboard(filters: DashboardFilters = {}, actor?: DashboardActor) {
  const db = getDb();
  const now = new Date();
  const range = resolveWindow(filters, now);
  const currencyRows = await db.selectDistinct({ currency: sales.currency }).from(sales).where(and(eq(sales.status, "CONFIRMED"), gte(sales.createdAt, range.from), lt(sales.createdAt, range.to)));
  const availableCurrencies = currencyRows.map((row) => row.currency).filter((value): value is string => Boolean(value)).sort();
  const currencyAmbiguous = !filters.currency && availableCurrencies.length > 1;
  const resolvedCurrency = filters.currency ?? (availableCurrencies.includes("PEN") ? "PEN" : availableCurrencies[0]) ?? undefined;
  const todayStart = startOfDay(now);
  const today = { from: todayStart, to: new Date(todayStart.getTime() + DAY_MS) };
  const todayParts = limaParts(now);
  const month = { from: new Date(Date.UTC(todayParts.year, todayParts.month - 1, 1, 5)), to: today.to };
  const movementCutoff = new Date(now.getTime() - 30 * DAY_MS);
  const selectedProduct = productConditions(filters);
  const stockProductScope = selectedProduct ? exists(db.select({ id: products.id }).from(products).where(and(eq(products.id, inventoryBalances.productId), selectedProduct))) : undefined;
  const reservationProductScope = selectedProduct ? exists(db.select({ id: products.id }).from(products).where(and(eq(products.id, inventoryReservations.productId), selectedProduct))) : undefined;
  const stockScope = conditionList(filters.locationId ? eq(inventoryBalances.locationId, filters.locationId) : undefined, filters.productId ? eq(inventoryBalances.productId, filters.productId) : undefined, stockProductScope);
  const productScope = conditionList(productConditions(filters), filters.productId ? eq(products.id, filters.productId) : undefined);
  const unknownBalanceCondition = filters.locationId
    ? sql`not exists (select 1 from inventory_balances ib where ib.product_id = products.id and ib.location_id = ${filters.locationId})`
    : sql`not exists (select 1 from inventory_balances ib where ib.product_id = products.id)`;
  const categoryScope = selectedProduct ? and(or(eq(products.editorialCategoryId, categories.id), and(isNull(products.editorialCategoryId), eq(products.categoryId, categories.id)))!, selectedProduct) : undefined;
  const categorySummaryPromise = db.select({ categoryId: categories.id, categoryName: categories.name, units: sql<string>`coalesce(sum(${saleItems.quantity}), 0)`, revenue: sql<string>`coalesce(sum(${saleItems.lineTotal}), 0)` }).from(saleItems).innerJoin(sales, eq(saleItems.saleId, sales.id)).innerJoin(products, eq(saleItems.productId, products.id)).innerJoin(categories, or(eq(products.editorialCategoryId, categories.id), and(isNull(products.editorialCategoryId), eq(products.categoryId, categories.id)))!).where(and(...salesConditions(db, filters, range, resolvedCurrency), categoryScope)).groupBy(categories.id, categories.name).orderBy(desc(sql`sum(${saleItems.lineTotal})`));
  const historicalSales = alias(sales, "historical_sales");
  const previous = previousWindow(range);
  const granularity = resolveGranularity(range, filters.granularity);
  // All 35 queries below (24 + 7 + 4 in the old code) are independent of each
  // other (none reads another's result), so they are launched in a single
  // Promise.all instead of three sequential waves. Each wave used to cost a
  // full Neon (sa-east-1) round trip on top of the last; that, combined with
  // the default 10-connection pool queueing most of them anyway, was the
  // dominant cost behind the ~2.1s dashboard load. See src/db/index.ts for
  // the pool-size half of this fix.
  const [salesToday, salesMonth, salesRange, ordersByStatus, ordersNeedingConfirmation, quoteTotals, openQuotes, openOpportunities, pipeline, pendingPayments, criticalStock, noStock, noMovement, reservedUnits, locationsCount, overdueFollowUpsSnapshot, transferCounts, newCustomers, returningCustomers, commercialSummary, commercialMargin, topProducts, topCustomers, topSellers, channels, currentSalesSeries, previousSalesSeries, pipelineStageCounts, pipelineStageAmounts, unknownStock, userSummaryRows, recentActivity, pendingApprovalsRows, previousSalesRange, previousQuoteTotals, previousOrderTotals, previousCriticalStock, activeCustomers, paymentMethodRows] = await Promise.all([
    salesMetric(db, filters, today, resolvedCurrency),
    salesMetric(db, filters, month, resolvedCurrency),
    salesMetric(db, filters, range, resolvedCurrency),
    db.select({ status: orders.status, count: count() }).from(orders).where(and(...orderConditions(db, filters, undefined, filters.currency))).groupBy(orders.status),
    db.select({ count: count() }).from(orders).where(and(...orderConditions(db, filters, undefined), inArray(orders.status, ["NEW", "RECEIVED"]))),
     db.select({ total: count(), converted: sql.raw("count(*) filter (where quotes.workflow_status = 'CONVERTED' or quotes.status = 'convertida')"), rejected: sql.raw("count(*) filter (where quotes.workflow_status = 'REJECTED')"), expired: sql.raw("count(*) filter (where quotes.workflow_status = 'EXPIRED')") }).from(quotes).where(and(gte(quotes.createdAt, range.from), lt(quotes.createdAt, range.to))),
    db.select({ count: count() }).from(quotes).where(and(notInArray(quotes.workflowStatus, ["REJECTED", "EXPIRED", "CONVERTED", "CANCELLED"]), notInArray(quotes.status, ["convertida", "cerrada", "cerrado"]))),
    db.select({ count: count() }).from(opportunities).where(and(...opportunityConditions(db, filters, range, filters.currency), notInArray(opportunities.stage, ["CLOSED", "LOST", "CANCELLED"]))),
    db.select({ total: sql.raw("coalesce(sum(opportunities.total_amount), 0)") }).from(opportunities).where(and(...opportunityConditions(db, filters, range, resolvedCurrency), notInArray(opportunities.stage, ["CLOSED", "LOST", "CANCELLED"]))),
    db.select({ count: count() }).from(payments).innerJoin(orders, eq(payments.orderId, orders.id)).where(and(or(inArray(payments.status, ["PENDING", "UNDER_REVIEW"]), sql`${dashboardNetForOrder} > 0 and (${dashboardNetForOrder} < ${orders.total} - 0.005 or ${dashboardNetForOrder} > ${orders.total} + 0.005)`), ...orderConditions(db, filters, undefined, filters.currency))),
    db.select({ count: count() }).from(inventoryBalances).where(and(...stockScope, sql.raw("inventory_balances.minimum_stock is not null and (inventory_balances.on_hand - inventory_balances.reserved) <= inventory_balances.minimum_stock"))),
    db.select({ count: sql.raw("count(distinct inventory_balances.product_id)") }).from(inventoryBalances).where(and(...stockScope, sql.raw("(inventory_balances.on_hand - inventory_balances.reserved) <= 0"))),
    db.select({ count: count() }).from(products).where(and(...productScope, sql.raw("not exists (select 1 from inventory_movements im where im.product_id = products.id and im.created_at >= '" + movementCutoff.toISOString() + "'::timestamptz)"))),
    db.select({ units: sql.raw("coalesce(sum(inventory_reservations.quantity), 0)") }).from(inventoryReservations).where(and(eq(inventoryReservations.status, "ACTIVE"), reservationProductScope, filters.locationId ? eq(inventoryReservations.locationId, filters.locationId) : undefined, filters.productId ? eq(inventoryReservations.productId, filters.productId) : undefined)),
    db.select({ count: count() }).from(locations).where(eq(locations.active, true)),
    db.select({ count: count() }).from(crmTasks).where(and(eq(crmTasks.status, "PENDING"), lt(crmTasks.dueAt, now), filters.sellerId ? eq(crmTasks.assignedTo, filters.sellerId) : undefined)),
    db.select({ status: transfers.status, count: count() }).from(transfers).where(and(gte(transfers.createdAt, range.from), lt(transfers.createdAt, range.to))).groupBy(transfers.status),
    db.select({ id: customers.id }).from(sales).innerJoin(customers, eq(sales.customerId, customers.id)).where(and(...salesConditions(db, filters, range, filters.currency), gte(customers.createdAt, range.from), lt(customers.createdAt, range.to))).groupBy(customers.id),
    db.select({ id: sales.customerId }).from(sales).where(and(...salesConditions(db, filters, range, filters.currency), exists(db.select({ id: historicalSales.id }).from(historicalSales).where(and(eq(historicalSales.customerId, sales.customerId), lt(historicalSales.createdAt, range.from)))))).groupBy(sales.customerId),
    db.select({ productsSold: sql<string>`count(distinct ${saleItems.productId})`, unitsSold: sql<string>`coalesce(sum(${saleItems.quantity}), 0)` }).from(saleItems).innerJoin(sales, eq(saleItems.saleId, sales.id)).innerJoin(products, eq(saleItems.productId, products.id)).where(and(...salesConditions(db, filters, range, filters.currency), selectedProduct)),
     db.select({ lineCount: count(saleItems.id), costedLineCount: sql<string>`count(*) filter (where ${saleItems.costSnapshot} is not null)`, revenue: sql<string>`coalesce(sum(${saleItems.lineTotal}), 0)`, cost: sql<string>`coalesce(sum(${saleItems.quantity} * ${saleItems.costSnapshot}), 0)` }).from(saleItems).innerJoin(sales, eq(saleItems.saleId, sales.id)).innerJoin(products, eq(saleItems.productId, products.id)).where(and(...salesConditions(db, filters, range, resolvedCurrency), selectedProduct)),
    db.select({ id: products.id, name: sql<string>`coalesce(${products.commercialName}, ${products.originalName})`, sku: products.sku, categoryName: categories.name, units: sql.raw("coalesce(sum(sale_items.quantity), 0)"), revenue: sql.raw("coalesce(sum(sale_items.line_total), 0)") }).from(saleItems).innerJoin(sales, eq(saleItems.saleId, sales.id)).innerJoin(products, eq(saleItems.productId, products.id)).leftJoin(categories, or(eq(products.editorialCategoryId, categories.id), and(isNull(products.editorialCategoryId), eq(products.categoryId, categories.id)))!).where(and(...salesConditions(db, filters, range, resolvedCurrency))).groupBy(products.id, products.commercialName, products.originalName, products.sku, categories.name).orderBy(desc(sql.raw("sum(sale_items.line_total)"))).limit(5),
    db.select({ id: customers.id, name: customers.name, orders: count(sales.id), revenue: sql.raw("coalesce(sum(sales.total), 0)") }).from(sales).innerJoin(customers, eq(sales.customerId, customers.id)).where(and(...salesConditions(db, filters, range, resolvedCurrency))).groupBy(customers.id, customers.name).orderBy(desc(sql.raw("sum(sales.total)"))).limit(5),
    db.select({ id: users.id, name: sql<string>`coalesce(${users.name}, ${users.email})`, orders: count(sales.id), revenue: sql.raw("coalesce(sum(sales.total), 0)") }).from(sales).leftJoin(users, eq(sales.sellerId, users.id)).where(and(...salesConditions(db, filters, range, resolvedCurrency))).groupBy(users.id, users.name, users.email).orderBy(desc(sql.raw("sum(sales.total)"))).limit(5),
    db.select({ channel: opportunities.origin, count: count() }).from(opportunities).where(and(...opportunityConditions(db, filters, range, filters.currency))).groupBy(opportunities.origin).orderBy(desc(count())).limit(8),
    salesSeries(db, filters, range, resolvedCurrency, granularity),
    salesSeries(db, filters, previous, resolvedCurrency, granularity),
    // Split into a count query (scoped only to the user's explicit currency filter, so it
    // reflects real opportunity counts across currencies) and an amount query (scoped to the
    // auto-resolved currency, since summing opportunities.total_amount across currencies would
    // silently mix them). See task-3-report.md for why these can't share one query.
    db.select({ stage: opportunities.stage, count: count() }).from(opportunities).where(and(...opportunityConditions(db, filters, range, filters.currency))).groupBy(opportunities.stage).orderBy(opportunities.stage),
    db.select({ stage: opportunities.stage, amount: sql<string>`coalesce(sum(${opportunities.totalAmount}), 0)` }).from(opportunities).where(and(...opportunityConditions(db, filters, range, resolvedCurrency))).groupBy(opportunities.stage).orderBy(opportunities.stage),
    db.select({ count: sql<string>`count(*)` }).from(products).where(and(...productScope, unknownBalanceCondition)),
    db.select({ role: users.roleCode, status: users.status, count: count() }).from(users).groupBy(users.roleCode, users.status),
    // Fetch a wider window before collapsing repeated user-facing events. Export
    // actions and other batch events can otherwise consume the whole limit and
    // leave the dashboard activity widget with fewer than eight useful rows.
    db.select({ id: auditLogs.id, action: auditLogs.action, entityType: auditLogs.entityType, entityId: auditLogs.entityId, actorId: auditLogs.actorId, actorName: sql<string>`coalesce(${users.name}, 'Sistema')`, createdAt: auditLogs.createdAt }).from(auditLogs).leftJoin(users, eq(auditLogs.actorId, users.id)).where(and(gte(auditLogs.createdAt, range.from), lt(auditLogs.createdAt, range.to), or(isNull(auditLogs.correlationId), notInArray(auditLogs.correlationId, developmentFixtureAuditExclusions)))).orderBy(desc(auditLogs.createdAt)).limit(512),
    db.select({ count: count() }).from(products).where(and(...productScope, eq(products.requiresReview, true))),
    salesMetric(db, filters, previous, resolvedCurrency),
    db.select({ total: count(), converted: sql.raw("count(*) filter (where quotes.workflow_status = 'CONVERTED' or quotes.status = 'convertida')"), rejected: sql.raw("count(*) filter (where quotes.workflow_status = 'REJECTED')"), expired: sql.raw("count(*) filter (where quotes.workflow_status = 'EXPIRED')") }).from(quotes).where(and(gte(quotes.createdAt, previous.from), lt(quotes.createdAt, previous.to))),
    db.select({ status: orders.status, count: count() }).from(orders).where(and(...orderConditions(db, filters, previous, filters.currency))).groupBy(orders.status),
    db.select({ count: count() }).from(inventoryBalances).where(and(...stockScope, gte(inventoryBalances.updatedAt, previous.from), lt(inventoryBalances.updatedAt, previous.to), sql.raw("inventory_balances.minimum_stock is not null and (inventory_balances.on_hand - inventory_balances.reserved) <= inventory_balances.minimum_stock"))),
    db.select({ count: count() }).from(customers).where(and(eq(customers.status, "ACTIVE"), filters.sellerId ? eq(customers.assignedSellerId, filters.sellerId) : undefined)),
    db.select({ method: payments.method, amount: sql<string>`coalesce(sum(${payments.amount}), 0)`, count: count() }).from(payments).innerJoin(orders, eq(payments.orderId, orders.id)).innerJoin(sales, eq(orders.saleId, sales.id)).where(and(inArray(payments.status, ["CONFIRMED", "APPROVED"]), gte(payments.createdAt, range.from), lt(payments.createdAt, range.to), resolvedCurrency ? eq(payments.currency, resolvedCurrency) : undefined, eq(sales.status, "CONFIRMED"), ...salesConditions(db, filters, range, resolvedCurrency), ...orderConditions(db, filters, undefined, resolvedCurrency))).groupBy(payments.method).orderBy(desc(sql`sum(${payments.amount})`)).limit(6),
  ]);
  const topProductTrendPromise: Promise<ProductTrendRow[]> = topProducts.length
    ? db.select({ productId: saleItems.productId, date: sql<string>`to_char(${sales.createdAt} at time zone 'America/Lima', 'YYYY-MM-DD')`, revenue: sql<string>`coalesce(sum(${saleItems.lineTotal}), 0)` })
      .from(saleItems)
      .innerJoin(sales, eq(saleItems.saleId, sales.id))
      .where(and(...salesConditions(db, filters, range, resolvedCurrency), inArray(saleItems.productId, topProducts.map((row) => row.id))))
      .groupBy(saleItems.productId, sql`to_char(${sales.createdAt} at time zone 'America/Lima', 'YYYY-MM-DD')`)
    : Promise.resolve([]);
  const topProductPreviousRevenuePromise: Promise<ProductRevenueRow[]> = topProducts.length
    ? db.select({ productId: saleItems.productId, revenue: sql<string>`coalesce(sum(${saleItems.lineTotal}), 0)` })
      .from(saleItems)
      .innerJoin(sales, eq(saleItems.saleId, sales.id))
      .where(and(...salesConditions(db, filters, previous, resolvedCurrency), inArray(saleItems.productId, topProducts.map((row) => row.id))))
      .groupBy(saleItems.productId)
    : Promise.resolve([]);
  const topCustomerIds = topCustomers.map((row) => row.id);
  const topSellerIds = topSellers.map((row) => row.id).filter((id): id is string => Boolean(id));
  const effectiveQuoteSellerId = sql<string>`coalesce(${opportunities.assignedSellerId}, ${quotes.assignedSellerId})`;
  const [categorySummaryRows, topProductTrendRows, topProductPreviousRevenueRows, topCustomerLatestRows, sellerConversionRows] = await Promise.all([
    categorySummaryPromise,
    topProductTrendPromise,
    topProductPreviousRevenuePromise,
    topCustomerIds.length
      ? db.select({ customerId: sales.customerId, lastPurchase: sql<Date>`max(${sales.createdAt})` }).from(sales).where(and(...salesConditions(db, filters, range, resolvedCurrency), inArray(sales.customerId, topCustomerIds))).groupBy(sales.customerId)
      : Promise.resolve([]),
    // Lifetime (not range-scoped): a seller's conversion track record is a rolling quality
    // signal, not a period total — most quotes in any given 30-day window are still pending
    // (SENT/FOLLOW_UP), so scoping this to `range` starved almost every seller down to a
    // single decided quote or none. All their decided quotes to date is still 100% real data,
    // just a wider, more meaningful window than the dashboard's period filter.
    topSellerIds.length
      ? db.select({ sellerId: effectiveQuoteSellerId, quoteCount: count(), converted: sql<number>`count(*) filter (where ${quotes.workflowStatus} = 'CONVERTED' or ${quotes.status} = 'convertida')`, rejected: sql<number>`count(*) filter (where ${quotes.workflowStatus} = 'REJECTED')`, expired: sql<number>`count(*) filter (where ${quotes.workflowStatus} = 'EXPIRED' or (${quotes.validUntil} is not null and ${quotes.validUntil} < ${now} and ${quotes.workflowStatus} in ('SENT', 'FOLLOW_UP')))`, }).from(quotes).leftJoin(opportunities, eq(opportunities.quoteId, quotes.id)).where(and(inArray(effectiveQuoteSellerId, topSellerIds), filters.currency ? eq(quotes.currency, filters.currency) : undefined)).groupBy(effectiveQuoteSellerId)
      : Promise.resolve([]),
  ]);
  const buildPaymentScope = (window: Window) => conditionList(
    inArray(payments.status, ["CONFIRMED", "APPROVED"]),
    gte(payments.createdAt, window.from),
    lt(payments.createdAt, window.to),
    ...orderConditions(db, filters, undefined, resolvedCurrency),
  );
  const buildRefundScope = (window: Window) => conditionList(
    inArray(paymentRefunds.status, ["SUCCESS", "SUCCEEDED", "CONFIRMED", "APPROVED", "COMPLETED"]),
    gte(paymentRefunds.createdAt, window.from),
    lt(paymentRefunds.createdAt, window.to),
    resolvedCurrency ? eq(paymentRefunds.currency, resolvedCurrency) : undefined,
    ...orderConditions(db, filters, undefined, resolvedCurrency),
  );
  const paymentScope = buildPaymentScope(range);
  const refundScope = buildRefundScope(range);
  const canViewFinancials = Boolean(actor && can(actor.role, "pricing.cost.view") && can(actor.role, "pricing.margin.view"));
  const SLA_TARGET_DAYS = 3;
  const [collectedRows, refundRows, collectedSeriesRows, previousCollectedRows, previousRefundRows, previousCommercialMargin, fulfillmentRows, slaRows, previousOpenQuotesRows, previousPendingPaymentsRows, previousOverdueFollowUpsRows, previousActiveCustomersRows] = await Promise.all([
    db.select({ total: sql<string>`coalesce(sum(${payments.amount}), 0)` }).from(payments).innerJoin(orders, eq(payments.orderId, orders.id)).where(and(...paymentScope)),
    db.select({ total: sql<string>`coalesce(sum(${paymentRefunds.amount}), 0)` }).from(paymentRefunds).innerJoin(payments, eq(paymentRefunds.paymentId, payments.id)).innerJoin(orders, eq(payments.orderId, orders.id)).where(and(...refundScope)),
    canViewFinancials && resolvedCurrency ? collectedSeries(db, filters, range, resolvedCurrency, granularity) : Promise.resolve([] as SalesSeriesPoint[]),
    // "vs. período anterior" comparisons for Cobrado and Margen bruto — same shape as the
    // current-period queries below/above, just scoped to `previous` instead of `range`.
    canViewFinancials && resolvedCurrency
      ? db.select({ total: sql<string>`coalesce(sum(${payments.amount}), 0)` }).from(payments).innerJoin(orders, eq(payments.orderId, orders.id)).where(and(...buildPaymentScope(previous)))
      : Promise.resolve([{ total: "0" }]),
    canViewFinancials && resolvedCurrency
      ? db.select({ total: sql<string>`coalesce(sum(${paymentRefunds.amount}), 0)` }).from(paymentRefunds).innerJoin(payments, eq(paymentRefunds.paymentId, payments.id)).innerJoin(orders, eq(payments.orderId, orders.id)).where(and(...buildRefundScope(previous)))
      : Promise.resolve([{ total: "0" }]),
    canViewFinancials
      ? db.select({ lineCount: count(saleItems.id), costedLineCount: sql<string>`count(*) filter (where ${saleItems.costSnapshot} is not null)`, revenue: sql<string>`coalesce(sum(${saleItems.lineTotal}), 0)`, cost: sql<string>`coalesce(sum(${saleItems.quantity} * ${saleItems.costSnapshot}), 0)` }).from(saleItems).innerJoin(sales, eq(saleItems.saleId, sales.id)).innerJoin(products, eq(saleItems.productId, products.id)).where(and(...salesConditions(db, filters, previous, resolvedCurrency), selectedProduct))
      : Promise.resolve([]),
    // Fill rate = share of ordered units actually picked from stock; prep time = average time
    // from order creation to each item being picked. Both come straight from order_items'
    // real quantity/picked_quantity/picked_at columns — no target/threshold to invent. Lifetime
    // (no window), same reasoning as seller conversion below: this is a rolling operational
    // quality signal, not a period total, and the dashboard's date filter starves it down to a
    // handful of rows most of the time.
    db.select({
      totalUnits: sql<string>`coalesce(sum(${orderItems.quantity}), 0)`,
      pickedUnits: sql<string>`coalesce(sum(${orderItems.pickedQuantity}), 0)`,
      avgPrepDays: sql<string | null>`avg(extract(epoch from (${orderItems.pickedAt} - ${orders.createdAt})) / 86400.0) filter (where ${orderItems.pickedAt} is not null)`,
    }).from(orderItems).innerJoin(orders, eq(orderItems.orderId, orders.id)).where(and(...orderConditions(db, filters, undefined, resolvedCurrency))),
    // SLA = share of delivered orders where delivered_at - created_at is within the configured
    // target (SLA_TARGET_DAYS). Real deliveredAt/createdAt timestamps, lifetime scope like the
    // fulfillment metrics above; the 3-day target is a user-confirmed policy, not invented.
    db.select({
      delivered: sql<string>`count(*)`,
      onTime: sql<string>`count(*) filter (where ${orders.deliveredAt} - ${orders.createdAt} <= ${sql.raw(`interval '${SLA_TARGET_DAYS} days'`)})`,
    }).from(orders).where(and(...orderConditions(db, filters, undefined, resolvedCurrency), sql`${orders.deliveredAt} is not null`)),
    // "vs. período anterior" proxies for the 4 point-in-time snapshot KPIs below (Cotizaciones
    // abiertas, Pagos por revisar, Seguimientos vencidos, Clientes activos): none of these has a
    // history table recording "how many were open on date X", so — same approximation already
    // used for Stock crítico above (previousCriticalStock) — each counts rows matching today's
    // open/pending/active criteria whose own updatedAt falls inside the previous window, as a
    // proxy for "last touched, and in this state, during the previous period."
    db.select({ count: count() }).from(quotes).where(and(notInArray(quotes.workflowStatus, ["REJECTED", "EXPIRED", "CONVERTED", "CANCELLED"]), notInArray(quotes.status, ["convertida", "cerrada", "cerrado"]), gte(quotes.updatedAt, previous.from), lt(quotes.updatedAt, previous.to))),
    db.select({ count: count() }).from(payments).innerJoin(orders, eq(payments.orderId, orders.id)).where(and(or(inArray(payments.status, ["PENDING", "UNDER_REVIEW"]), sql`${dashboardNetForOrder} > 0 and (${dashboardNetForOrder} < ${orders.total} - 0.005 or ${dashboardNetForOrder} > ${orders.total} + 0.005)`), gte(payments.updatedAt, previous.from), lt(payments.updatedAt, previous.to), ...orderConditions(db, filters, undefined, filters.currency))),
    db.select({ count: count() }).from(crmTasks).where(and(eq(crmTasks.status, "PENDING"), lt(crmTasks.dueAt, previous.to), gte(crmTasks.updatedAt, previous.from), lt(crmTasks.updatedAt, previous.to), filters.sellerId ? eq(crmTasks.assignedTo, filters.sellerId) : undefined)),
    db.select({ count: count() }).from(customers).where(and(eq(customers.status, "ACTIVE"), gte(customers.updatedAt, previous.from), lt(customers.updatedAt, previous.to), filters.sellerId ? eq(customers.assignedSellerId, filters.sellerId) : undefined)),
  ]);
  const fulfillmentRow = fulfillmentRows[0];
  const fulfillmentTotalUnits = Number(fulfillmentRow?.totalUnits ?? 0);
  const fillRate = fulfillmentTotalUnits > 0 ? Number(fulfillmentRow!.pickedUnits) / fulfillmentTotalUnits : null;
  const avgPrepDays = fulfillmentRow?.avgPrepDays !== null && fulfillmentRow?.avgPrepDays !== undefined ? Number(fulfillmentRow.avgPrepDays) : null;
  const slaRow = slaRows[0];
  const slaDeliveredCount = Number(slaRow?.delivered ?? 0);
  const slaRate = slaDeliveredCount > 0 ? Number(slaRow!.onTime) / slaDeliveredCount : null;
  const currencyBreakdownRows = await db.select({ currency: sales.currency, total: sql<string>`coalesce(sum(${sales.total}), 0)`, count: count() }).from(sales).where(and(...salesConditions(db, filters, range))).groupBy(sales.currency).orderBy(sales.currency);
  const orderCounts = new Map(ordersByStatus.map((row) => [row.status, Number(row.count)]));
  const transferMap = new Map(transferCounts.map((row) => [row.status, Number(row.count)]));
  const convertedQuotes = Number(quoteTotals[0]?.converted ?? 0);
  const rejectedQuotes = Number(quoteTotals[0]?.rejected ?? 0);
  const expiredQuotes = Number(quoteTotals[0]?.expired ?? 0);
  const totalQuotes = convertedQuotes + rejectedQuotes + expiredQuotes;
  const commercial = commercialSummary[0];
  const marginRow = commercialMargin[0];
  const lineCount = Number(marginRow?.lineCount ?? 0);
  const costedLineCount = Number(marginRow?.costedLineCount ?? 0);
  const costOfSales = Number(salesRange.count) === 0 ? 0 : lineCount > 0 && lineCount === costedLineCount ? Number(marginRow?.cost ?? 0) : null;
  const financial = financialMetrics({ revenue: Number(salesRange.total), costOfSales, operatingExpenses: null });
  const visibleFinancial = canViewFinancials ? financial : financialMetrics({ revenue: null, costOfSales: null, operatingExpenses: null });
  const collected = canViewFinancials && resolvedCurrency
    ? Number(collectedRows[0]?.total ?? 0) - Number(refundRows[0]?.total ?? 0)
    : null;
  const previousCollected = canViewFinancials && resolvedCurrency
    ? Number(previousCollectedRows[0]?.total ?? 0) - Number(previousRefundRows[0]?.total ?? 0)
    : null;
  const previousMarginRow = previousCommercialMargin[0];
  const previousLineCount = Number(previousMarginRow?.lineCount ?? 0);
  const previousCostedLineCount = Number(previousMarginRow?.costedLineCount ?? 0);
  const previousCostOfSales = Number(previousSalesRange.count) === 0
    ? 0
    : previousLineCount > 0 && previousLineCount === previousCostedLineCount ? Number(previousMarginRow?.cost ?? 0) : null;
  const previousFinancial = financialMetrics({ revenue: Number(previousSalesRange.total), costOfSales: previousCostOfSales, operatingExpenses: null });
  const previousGrossProfit = canViewFinancials ? previousFinancial.grossProfit : null;
  const previousQuoteRow = previousQuoteTotals[0];
  const previousConvertedQuotes = Number(previousQuoteRow?.converted ?? 0);
  const previousRejectedQuotes = Number(previousQuoteRow?.rejected ?? 0);
  const previousExpiredQuotes = Number(previousQuoteRow?.expired ?? 0);
  const previousDecidedQuotes = previousConvertedQuotes + previousRejectedQuotes + previousExpiredQuotes;
  const previousConversion = previousDecidedQuotes ? (previousConvertedQuotes / previousDecidedQuotes) * 100 : null;
  const previousOpenQuotes = Number(previousOpenQuotesRows[0]?.count ?? 0);
  const previousPendingPayments = Number(previousPendingPaymentsRows[0]?.count ?? 0);
  const previousOverdueFollowUps = Number(previousOverdueFollowUpsRows[0]?.count ?? 0);
  const previousActiveCustomers = Number(previousActiveCustomersRows[0]?.count ?? 0);
  // Counts and amounts come from two separately-scoped queries (see the Promise.all comment
  // above): merge them by stage rather than assuming the row sets line up 1:1, since the count
  // query (filters.currency only) can include stages/rows the amount query (resolvedCurrency)
  // excludes when currencies are mixed.
  const pipelineCountByStage = new Map(pipelineStageCounts.map((row) => [row.stage, Number(row.count ?? 0)]));
  const pipelineAmountByStage = new Map(pipelineStageAmounts.map((row) => [row.stage, Number(row.amount ?? 0)]));
  const pipelineStageKeys = [...new Set([...pipelineCountByStage.keys(), ...pipelineAmountByStage.keys()])];
  const pipelineSummary = pipelineStageKeys.map((stage) => ({ stage, stageCode: stage, stageLabel: pipelineLabels[stage] ?? "Etapa comercial", count: pipelineCountByStage.get(stage) ?? 0, amount: pipelineAmountByStage.get(stage) ?? 0, weightedValue: opportunityStageProbability.configured ? (pipelineAmountByStage.get(stage) ?? 0) * (opportunityStageProbability.values[stage as keyof typeof opportunityStageProbability.values] ?? 0) : null }));
  const activePipelineRows = pipelineSummary.filter((row) => getPipelineMacroStage(row.stage) !== "PERDIDA");
  const lostPipelineRows = pipelineSummary.filter((row) => getPipelineMacroStage(row.stage) === "PERDIDA");
  const pipelineActiveTotal = {
    count: activePipelineRows.reduce((sum, row) => sum + row.count, 0),
    amount: activePipelineRows.reduce((sum, row) => sum + row.amount, 0),
  };
  const pipelineLostTotal = {
    count: lostPipelineRows.reduce((sum, row) => sum + row.count, 0),
    amount: lostPipelineRows.reduce((sum, row) => sum + row.amount, 0),
  };
  const pipelineMacroSummary = PIPELINE_MACRO_STAGE_ORDER.map((macroStage) => {
    const rows = activePipelineRows.filter((row) => getPipelineMacroStage(row.stage) === macroStage);
    const amount = rows.reduce((sum, row) => sum + row.amount, 0);
    const count = rows.reduce((sum, row) => sum + row.count, 0);
    return {
      macroStage,
      macroStageLabel: PIPELINE_MACRO_STAGE_LABELS[macroStage],
      count,
      amount,
      share: pipelineActiveTotal.amount ? amount / pipelineActiveTotal.amount : 0,
      stages: rows.map((row) => row.stageCode),
    };
  });
  const categoryRevenueTotal = categorySummaryRows.reduce((sum, row) => sum + Number(row.revenue ?? 0), 0);
  const categorySummary = categorySummaryRows.map((row) => ({ categoryId: row.categoryId, categoryName: row.categoryName, units: Number(row.units ?? 0), revenue: Number(row.revenue ?? 0), percentage: categoryRevenueTotal ? (Number(row.revenue ?? 0) / categoryRevenueTotal) * 100 : 0 }));
  const productMedia = await getPublishedMediaForEntities("product", topProducts.map((row) => row.id));
  const topProductTrendById = new Map<string, ProductTrendRow[]>();
  for (const row of topProductTrendRows) topProductTrendById.set(row.productId, [...(topProductTrendById.get(row.productId) ?? []), row]);
  const topProductPreviousRevenueById = new Map(topProductPreviousRevenueRows.map((row) => [row.productId, Number(row.revenue ?? 0)]));
  const activityProductIds = recentActivity.filter((row) => row.entityType === "product").map((row) => row.entityId);
  const activityProducts = activityProductIds.length ? await db.select({ id: products.id, name: sql<string>`coalesce(${products.commercialName}, ${products.normalizedName}, ${products.originalName})` }).from(products).where(inArray(products.id, activityProductIds)) : [];
  const activityProductLabels = new Map(activityProducts.map((row) => [row.id, row.name]));
  const topCustomerLatestById = new Map(topCustomerLatestRows.map((row) => [row.customerId, row.lastPurchase]));
  const sellerStatsById = new Map(sellerConversionRows.map((row) => {
    const converted = Number(row.converted ?? 0);
    const rejected = Number(row.rejected ?? 0);
    const expired = Number(row.expired ?? 0);
    const denominator = converted + rejected + expired;
    return [row.sellerId, { quotes: Number(row.quoteCount ?? 0), conversion: denominator ? (converted / denominator) * 100 : null }] as const;
  }));
  const recentActivityView = recentActivity
    .map((row) => ({ ...row, actionLabel: actionLabels[row.action] ?? auditActionLabel(row.action), entityLabel: row.entityType === "product" ? (activityProductLabels.get(row.entityId) ?? "Producto") : (entityLabels[row.entityType] ?? auditEntityLabel(row.entityType)), actorName: row.actorName || "Sistema" }))
    // Audit data can contain repeated fixture events with the same user-facing identity.
    // Keep the newest representative so the dashboard does not turn one event into
    // several indistinguishable cards; the audit module still exposes the full log.
    .filter((row, index, rows) => index === rows.findIndex((candidate) => candidate.actionLabel === row.actionLabel && candidate.entityType === row.entityType && candidate.entityLabel === row.entityLabel && candidate.actorName === row.actorName));
  const activeOrderCount = [...orderCounts.entries()].filter(([status]) => isActiveOrderStatus(status)).reduce((sum, [, value]) => sum + value, 0);
  const previousOrderMap = new Map(previousOrderTotals.map((row) => [row.status, Number(row.count)]));
  const previousActiveOrderCount = [...previousOrderMap.entries()].filter(([status]) => isActiveOrderStatus(status)).reduce((sum, [, value]) => sum + value, 0);
  const comparisons = dashboardComparisons({
    sales: { current: Number(salesRange.total), previous: previousSalesRange.total },
    quotes: { current: totalQuotes, previous: Number(previousQuoteTotals[0]?.total ?? 0) },
    orders: { current: activeOrderCount, previous: previousActiveOrderCount },
    criticalStock: { current: Number(criticalStock[0]?.count ?? 0), previous: Number(previousCriticalStock[0]?.count ?? 0) },
  });
  const kpiView = buildKpiView({
    sales: { current: Number(salesRange.total), previous: previousSalesRange.total },
    openQuotes: Number(openQuotes[0]?.count ?? 0),
    activeOrders: activeOrderCount,
    criticalStock: Number(criticalStock[0]?.count ?? 0),
  });
  const pendingActions = [
    { id: "orders-to-confirm", label: "Pedidos por confirmar", count: Number(ordersNeedingConfirmation[0]?.count ?? 0), href: "/admin/pedidos?status=active" },
    { id: "quotes-to-follow-up", label: "Cotizaciones por enviar/seguir", count: Number(openQuotes[0]?.count ?? 0), href: "/admin/cotizaciones?status=open" },
    { id: "payments-to-verify", label: "Pagos por verificar", count: Number(pendingPayments[0]?.count ?? 0), href: "/admin/pagos" },
    { id: "products-to-review", label: "Productos que requieren revisión", count: Number(pendingApprovalsRows[0]?.count ?? 0), href: "/admin/catalogo?requiresReview=true" },
    { id: "overdue-followups", label: "Seguimientos vencidos", count: Number(overdueFollowUpsSnapshot[0]?.count ?? 0), href: `/admin/crm?view=pipeline&followUpTo=${encodeURIComponent(limaDayKey(now))}` },
  ];
  return {
    range, filters, granularity, salesToday, salesMonth, salesRange,
    currency: resolvedCurrency ?? null,
    availableCurrencies,
    currencyAmbiguous,
    currencyBreakdown: currencyBreakdownRows.map((row) => ({ currency: row.currency, sales: Number(row.total ?? 0), salesCount: Number(row.count ?? 0) })),
    orders: { total: activeOrderCount, pendingPayment: orderCounts.get("PAYMENT_PENDING") ?? 0, preparing: orderCounts.get("PREPARING") ?? 0 },
    quotes: Number(openQuotes[0]?.count ?? 0), opportunities: Number(openOpportunities[0]?.count ?? 0), pipelineValue: Number(pipeline[0]?.total ?? 0), pendingPayments: Number(pendingPayments[0]?.count ?? 0),
    criticalStock: Number(criticalStock[0]?.count ?? 0), noStock: Number(noStock[0]?.count ?? 0), unknownStock: Number(unknownStock[0]?.count ?? 0), noMovement: Number(noMovement[0]?.count ?? 0), reservedUnits: Number(reservedUnits[0]?.units ?? 0), activeLocations: Number(locationsCount[0]?.count ?? 0),
    pendingPaymentsCount: Number(pendingPayments[0]?.count ?? 0), criticalStockCount: Number(criticalStock[0]?.count ?? 0), overdueFollowUpsCount: Number(overdueFollowUpsSnapshot[0]?.count ?? 0), pendingQuotesCount: Number(openQuotes[0]?.count ?? 0), pendingApprovalsCount: Number(pendingApprovalsRows[0]?.count ?? 0),
    activeCustomersCount: Number(activeCustomers[0]?.count ?? 0),
    paymentMethods: paymentMethodRows.map((row) => ({ method: row.method, amount: Number(row.amount ?? 0), count: Number(row.count ?? 0) })),
    conversion: { totalQuotes, convertedQuotes, percentage: totalQuotes ? (convertedQuotes / totalQuotes) * 100 : null },
    previousConversion,
    collected,
    previousCollected,
    previousGrossProfit,
    previousAverageTicket: previousSalesRange.count > 0 ? previousSalesRange.total / previousSalesRange.count : null,
    previousOpenQuotes,
    previousPendingPayments,
    previousOverdueFollowUps,
    previousActiveCustomers,
    newCustomers: newCustomers.length,
    returningCustomers: returningCustomers.length,
    productsSold: Number(commercial?.productsSold ?? 0),
    unitsSold: Number(commercial?.unitsSold ?? 0),
    margin: visibleFinancial.grossProfit,
    sales: Number(salesRange.total),
    revenue: Number(salesRange.total),
    costOfSales: visibleFinancial.costOfSales,
    grossProfit: visibleFinancial.grossProfit,
    grossMargin: visibleFinancial.grossMargin,
    operatingExpenses: visibleFinancial.operatingExpenses,
    operatingProfit: visibleFinancial.operatingProfit,
    profitability: visibleFinancial.profitability,
    overdueFollowUps: Number(overdueFollowUpsSnapshot[0]?.count ?? 0),
    transfers: { total: [...transferMap.values()].reduce((sum, value) => sum + value, 0), draft: transferMap.get("DRAFT") ?? 0, requested: transferMap.get("REQUESTED") ?? 0, inTransit: transferMap.get("IN_TRANSIT") ?? 0, received: transferMap.get("RECEIVED") ?? 0, cancelled: transferMap.get("CANCELLED") ?? 0 },
    topProducts: topProducts.map((row) => {
      const revenue = Number(row.revenue);
      const previousRevenue = topProductPreviousRevenueById.get(row.id) ?? 0;
       const trend = formatPeriodDelta(revenue, previousRevenue);
       return { ...row, units: Number(row.units), revenue, primaryImageUrl: productMedia.get(row.id)?.[0] ?? null, trend: fillProductRevenueTrend(range, topProductTrendById.get(row.id) ?? []), trendPercent: trend.value, trendLabel: trend.label, trendDirection: trend.direction };
    }),
    topCustomers: topCustomers.map((row) => ({ ...row, orders: Number(row.orders), revenue: Number(row.revenue), lastPurchase: topCustomerLatestById.get(row.id) ?? null })),
    topSellers: topSellers.map((row) => {
      const stats = row.id ? sellerStatsById.get(row.id) : undefined;
      return { ...row, orders: Number(row.orders), revenue: Number(row.revenue), quotes: stats?.quotes ?? 0, conversion: stats?.conversion ?? null };
    }),
    channels: channels.map((row) => ({ channel: row.channel, count: Number(row.count) })),
    salesSeries: currentSalesSeries,
    previousSalesSeries,
    collectedSeries: collectedSeriesRows,
    fillRate,
    avgPrepDays,
    slaRate,
    slaTargetDays: SLA_TARGET_DAYS,
    pipelineSummary,
    pipelineMacroSummary,
    pipelineActiveTotal,
    pipelineLostTotal,
    kpiView,
    pendingActions,
    comparisons,
    categorySummary,
    userSummary: userSummaryRows.map((row) => ({ role: row.role, roleCode: row.role, roleLabel: dashboardRoleLabel(row.role as AppRole | null), status: row.status, statusCode: row.status, statusLabel: statusLabels[row.status] ?? "Estado", count: Number(row.count) })),
    recentActivity: recentActivityView,
  };
}

// Inicio only ever reads orders.total, pendingPayments, pendingApprovalsCount and
// recentActivity from getOperationsDashboard's ~37-query result — running the full
// dashboard (sales series, pipeline, top products/customers, seller stats, category/user
// summary...) to read 4 fields was the single biggest cost on every module switch back to
// Inicio. This runs only the 3-4 queries those fields actually need.
export async function getHomeActivitySummary(filters: DashboardFilters = {}, actor?: DashboardActor) {
  void actor;
  const db = getDb();
  const now = new Date();
  const range = resolveWindow(filters, now);
  const productScope = conditionList(productConditions(filters), filters.productId ? eq(products.id, filters.productId) : undefined);
  const [ordersByStatus, pendingPaymentsRows, pendingApprovalsRows, recentActivityRows, openQuotes] = await Promise.all([
    db.select({ status: orders.status, count: count() }).from(orders).where(and(...orderConditions(db, filters, undefined, filters.currency))).groupBy(orders.status),
    db.select({ count: count() }).from(payments).innerJoin(orders, eq(payments.orderId, orders.id)).where(and(or(inArray(payments.status, ["PENDING", "UNDER_REVIEW"]), sql`${dashboardNetForOrder} > 0 and (${dashboardNetForOrder} < ${orders.total} - 0.005 or ${dashboardNetForOrder} > ${orders.total} + 0.005)`), ...orderConditions(db, filters, undefined, filters.currency))),
    db.select({ count: count() }).from(products).where(and(...productScope, eq(products.requiresReview, true))),
    db.select({ id: auditLogs.id, action: auditLogs.action, entityType: auditLogs.entityType, entityId: auditLogs.entityId, actorId: auditLogs.actorId, correlationId: auditLogs.correlationId, actorName: sql<string>`coalesce(${users.name}, 'Sistema')`, createdAt: auditLogs.createdAt }).from(auditLogs).leftJoin(users, eq(auditLogs.actorId, users.id)).where(and(gte(auditLogs.createdAt, range.from), lt(auditLogs.createdAt, range.to), or(isNull(auditLogs.correlationId), notInArray(auditLogs.correlationId, developmentFixtureAuditExclusions)))).orderBy(desc(auditLogs.createdAt)).limit(128),
    getOpenQuoteCount(),
  ]);
  const activeOrderCount = ordersByStatus.filter((row) => isActiveOrderStatus(row.status)).reduce((sum, row) => sum + Number(row.count), 0);
  const activityProductIds = recentActivityRows.filter((row) => row.entityType === "product").map((row) => row.entityId);
  const idsFor = (entityType: string) => recentActivityRows.filter((row) => row.entityType === entityType).map((row) => row.entityId);
  const activitySalesIds = idsFor("sale");
  const activityOrderIds = idsFor("order");
  const activityQuoteIds = idsFor("quote");
  const activityOpportunityIds = idsFor("opportunity");
  const activityPaymentIds = idsFor("payment");
  const activityCustomerIds = idsFor("customer");
  const [activityProducts, activitySales, activityOrders, activityQuotes, activityOpportunities, activityPayments, activityCustomers] = await Promise.all([
    activityProductIds.length ? db.select({ id: products.id, name: sql<string>`coalesce(${products.commercialName}, ${products.normalizedName}, ${products.originalName})` }).from(products).where(inArray(products.id, activityProductIds)) : Promise.resolve([]),
    activitySalesIds.length ? db.select({ id: sales.id, code: sales.code }).from(sales).where(inArray(sales.id, activitySalesIds)) : Promise.resolve([]),
    activityOrderIds.length ? db.select({ id: orders.id, code: orders.code }).from(orders).where(inArray(orders.id, activityOrderIds)) : Promise.resolve([]),
    activityQuoteIds.length ? db.select({ id: quotes.id, code: quotes.trackingCode }).from(quotes).where(inArray(quotes.id, activityQuoteIds)) : Promise.resolve([]),
    activityOpportunityIds.length ? db.select({ id: opportunities.id, code: opportunities.code }).from(opportunities).where(inArray(opportunities.id, activityOpportunityIds)) : Promise.resolve([]),
    activityPaymentIds.length ? db.select({ id: payments.id, reference: payments.providerReference }).from(payments).where(inArray(payments.id, activityPaymentIds)) : Promise.resolve([]),
    activityCustomerIds.length ? db.select({ id: customers.id, name: customers.name }).from(customers).where(inArray(customers.id, activityCustomerIds)) : Promise.resolve([]),
  ]);
  const activityEntityLabels = new Map<string, string>();
  for (const row of activityProducts) activityEntityLabels.set(`product:${row.id}`, row.name);
  for (const row of activitySales) activityEntityLabels.set(`sale:${row.id}`, `Venta ${row.code}`);
  for (const row of activityOrders) activityEntityLabels.set(`order:${row.id}`, `Pedido ${row.code}`);
  for (const row of activityQuotes) activityEntityLabels.set(`quote:${row.id}`, `Cotización ${row.code}`);
  for (const row of activityOpportunities) activityEntityLabels.set(`opportunity:${row.id}`, `Oportunidad ${row.code}`);
  for (const row of activityPayments) activityEntityLabels.set(`payment:${row.id}`, row.reference ? `Pago ${row.reference}` : "Pago registrado");
  for (const row of activityCustomers) activityEntityLabels.set(`customer:${row.id}`, row.name);
  const recentActivity = recentActivityRows
    .map((row) => ({ ...row, actionLabel: actionLabels[row.action] ?? auditActionLabel(row.action), entityLabel: activityEntityLabels.get(`${row.entityType}:${row.entityId}`) ?? entityLabels[row.entityType] ?? auditEntityLabel(row.entityType), actorName: row.actorName || "Sistema" }))
    .filter((row, index, rows) => index === rows.findIndex((candidate) => candidate.actionLabel === row.actionLabel && candidate.entityType === row.entityType && candidate.entityLabel === row.entityLabel && candidate.actorName === row.actorName));
  return {
    orders: { total: activeOrderCount },
    openQuotes,
    pendingPayments: Number(pendingPaymentsRows[0]?.count ?? 0),
    pendingApprovalsCount: Number(pendingApprovalsRows[0]?.count ?? 0),
    recentActivity,
  };
}

export async function listReportOptions() {
  const db = getDb();
  // Locations/categories/families/brands are non-sensitive reference lists
  // reloaded on every reportes filter change; short cache avoids re-hitting
  // Neon for data that rarely changes. Sellers/customers/products carry
  // names/emails and are left uncached.
  const [locationRows, sellerRows, customerRows, productRows, categoryRows, familyRows, brandRows] = await Promise.all([
    withRuntimeCache("report-options:locations", () =>
      db.select({ id: locations.id, name: locations.name }).from(locations).where(eq(locations.active, true)).orderBy(locations.name),
    ),
    db.select({ id: users.id, name: users.name, email: users.email }).from(users).orderBy(users.name).limit(500),
    db.select({ id: customers.id, name: customers.name, email: customers.email }).from(customers).orderBy(customers.name).limit(500),
    db.select({ id: products.id, name: products.commercialName, normalizedName: products.normalizedName, sku: products.sku }).from(products).orderBy(products.sku).limit(2000),
    withRuntimeCache("report-options:categories", () =>
      db.select({ id: categories.id, name: categories.name }).from(categories).where(eq(categories.active, true)).orderBy(categories.name).limit(500),
    ),
    withRuntimeCache("report-options:families", () =>
      db.select({ id: families.id, name: families.name, categoryId: families.categoryId }).from(families).where(eq(families.active, true)).orderBy(families.name).limit(500),
    ),
    withRuntimeCache("report-options:brands", () =>
      db.select({ id: brands.id, name: brands.name }).from(brands).where(eq(brands.active, true)).orderBy(brands.name).limit(500),
    ),
  ]);
  return { locations: locationRows, sellers: sellerRows, customers: customerRows, products: productRows.map((row) => ({ id: row.id, name: row.name || row.normalizedName, sku: row.sku })), categories: categoryRows, families: familyRows, brands: brandRows };
}
