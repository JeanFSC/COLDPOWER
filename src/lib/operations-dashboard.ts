import { alias } from "drizzle-orm/pg-core";
import { and, count, desc, eq, exists, gte, inArray, isNull, lt, notInArray, or, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/db";
import { auditLogs, brands, categories, families, inventoryBalances, inventoryReservations, locations, productPrices, products, quotes, transfers, users } from "@/db/schema";
import { crmTasks, customers, opportunityItems, opportunities } from "@/db/crm-schema";
import { orderItems, orders, payments, saleItems, sales } from "@/db/sales-schema";
import type { DashboardFilters } from "@/lib/dashboard-contract";
export type { DashboardFilters, DashboardRange } from "@/lib/dashboard-contract";
import type { AppRole } from "@/lib/roles";
import { can } from "@/lib/roles";
import { getPublishedMediaForEntities } from "@/lib/media-repository";
import { withRuntimeCache } from "@/lib/runtime-cache";
import { isActiveOrderStatus, getPipelineMacroStage, PIPELINE_MACRO_STAGE_ORDER, PIPELINE_MACRO_STAGE_LABELS } from "@/lib/dashboard-definitions";

type Window = { from: Date; to: Date };
export type DashboardActor = { userId?: string; role: AppRole };
const LIMA_TIMEZONE = "America/Lima";
const DAY_MS = 86400000;

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
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: LIMA_TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  return { year: Number(parts.find((part) => part.type === "year")?.value), month: Number(parts.find((part) => part.type === "month")?.value), day: Number(parts.find((part) => part.type === "day")?.value) };
}
function limaDayKey(date: Date) {
  const parts = limaParts(date);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}
export type SalesSeriesPoint = { date: string; total: number; count: number; orders?: number; units?: number };

export type DashboardComparisonInput = {
  sales: { current: number; previous: number };
  quotes: { current: number; previous: number };
  orders: { current: number; previous: number };
  criticalStock: { current: number; previous: number };
};

export function dashboardComparisons(input: DashboardComparisonInput) {
  const compare = (metric: { current: number; previous: number }) => ({
    ...metric,
    percentage: metric.previous === 0 ? null : ((metric.current - metric.previous) / metric.previous) * 100,
  });
  return {
    sales: compare(input.sales),
    quotes: compare(input.quotes),
    orders: compare(input.orders),
    criticalStock: compare(input.criticalStock),
  };
}

export function fillSalesSeries(window: Window, rows: SalesSeriesPoint[]): SalesSeriesPoint[] {
  const byDate = new Map(rows.map((row) => [row.date, row]));
  const series: SalesSeriesPoint[] = [];
  for (let cursor = window.from; cursor < window.to; cursor = new Date(cursor.getTime() + DAY_MS)) {
    const date = limaDayKey(cursor);
    series.push(byDate.get(date) ?? { date, total: 0, count: 0 });
  }
  return series;
}
function startOfDay(date: Date) { const parts = limaParts(date); return new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 5)); }
function parseDate(value?: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 5));
}
function resolveWindow(filters: DashboardFilters, now = new Date()): Window {
  const today = startOfDay(now);
  if (filters.range === "today") return { from: today, to: new Date(today.getTime() + DAY_MS) };
  if (filters.range === "yesterday") return { from: new Date(today.getTime() - DAY_MS), to: today };
  if (filters.range === "week") {
    const monday = (today.getUTCDay() + 6) % 7;
    return { from: new Date(today.getTime() - monday * DAY_MS), to: new Date(today.getTime() + DAY_MS) };
  }
  if (filters.range === "custom") {
    const current = limaParts(now);
    const monthStart = new Date(Date.UTC(current.year, current.month - 1, 1, 5));
    const from = parseDate(filters.from) ?? monthStart;
    const end = parseDate(filters.to) ?? today;
    return { from, to: new Date(end.getTime() + DAY_MS) };
  }
  return { from: startOfDay(new Date(Date.UTC(limaParts(now).year, limaParts(now).month - 1, 1, 5))), to: new Date(today.getTime() + DAY_MS) };
}
function conditionList(...conditions: Array<SQL | undefined>) { return conditions.filter(Boolean) as SQL[]; }
const pipelineLabels: Record<string, string> = { NEW: "Nueva", CONTACTED: "Contactada", QUOTING: "Cotizando", QUOTE_SENT: "Cotización enviada", FOLLOW_UP: "Seguimiento", NEGOTIATION: "Negociación", ACCEPTED: "Aceptada", SALE: "Venta", PAYMENT_PENDING: "Pago pendiente", PAID: "Pagada", PREPARING: "Preparando", DELIVERED: "Entregada", CLOSED: "Cerrada", LOST: "Perdida", CANCELLED: "Cancelada", NO_RESPONSE: "Sin respuesta" };
const statusLabels: Record<string, string> = { ACTIVE: "Activo", INACTIVE: "Inactivo", SUSPENDED: "Suspendido" };
const developmentFixtureAuditExclusions = ["cp-mock-v1", "cp-dashboard-v2", "cp-dashboard-v3", "cp-dashboard-v4"];
const entityLabels: Record<string, string> = { product: "Producto", products: "Productos", sale: "Venta", order: "Pedido", quote: "Cotización", opportunity: "Oportunidad", user: "Usuario", payment: "Pago", inventory: "Inventario", company_settings: "Configuración empresarial" };
const actionLabels: Record<string, string> = { "catalog.publication_status_changed": "Cambió el estado de publicación", "catalog.duplicate_decision_changed": "Revisó un posible duplicado", "catalog.product_editorial_updated": "Actualizó datos editoriales", "catalog.product_created": "Creó un producto", "catalog.media_associated": "Asoció una imagen", "catalog.media_removed": "Quitó una imagen", "user.role_changed": "Cambió el rol de un usuario", "inventory.adjustment": "Ajustó inventario", PRODUCT_CREATED: "Creó un producto", PRODUCT_PUBLICATION_CHANGED: "Cambió el estado de publicación", PRODUCT_DUPLICATE_REVIEWED: "Revisó un posible duplicado", PRODUCT_MEDIA_ASSOCIATED: "Asoció una imagen", PRODUCT_MEDIA_REMOVED: "Quitó una imagen" };
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
function orderConditions(db: ReturnType<typeof getDb>, filters: DashboardFilters, window: Window, currency?: string) {
  const conditions = conditionList(gte(orders.createdAt, window.from), lt(orders.createdAt, window.to));
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

async function salesSeries(db: ReturnType<typeof getDb>, filters: DashboardFilters, window: Window, currency?: string) {
  // Group/order by the selected day expression. Using the positional alias also
  // avoids PostgreSQL treating each parametrized timezone fragment as distinct.
  const rows = await db.select({ date: sql<string>`to_char(date_trunc('day', ${sales.createdAt} at time zone ${LIMA_TIMEZONE}), 'YYYY-MM-DD')`, total: sql<string>`coalesce(sum(${sales.total}), 0)`, count: count(), orders: sql<string>`coalesce(sum((select count(*) from orders order_row where order_row.sale_id = ${sales.id})), 0)`, units: sql<string>`coalesce(sum((select coalesce(sum(sale_item_row.quantity), 0) from sale_items sale_item_row where sale_item_row.sale_id = ${sales.id})), 0)` }).from(sales).where(and(...salesConditions(db, filters, window, currency))).groupBy(sql`1`).orderBy(sql`1`);
  return fillSalesSeries(window, rows.map((row) => ({ date: String(row.date), total: Number(row.total ?? 0), count: Number(row.count ?? 0), orders: Number(row.orders ?? 0), units: Number(row.units ?? 0) })));
}

const pipelineProbabilities: Record<string, number> = { NEW: 0.1, CONTACTED: 0.2, QUOTING: 0.35, QUOTE_SENT: 0.45, FOLLOW_UP: 0.5, NEGOTIATION: 0.65, ACCEPTED: 0.8, SALE: 1, PAYMENT_PENDING: 0.9, PAID: 1, PREPARING: 1, DELIVERED: 1, CLOSED: 1, LOST: 0, CANCELLED: 0, NO_RESPONSE: 0.05 };
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
  // All 35 queries below (24 + 7 + 4 in the old code) are independent of each
  // other (none reads another's result), so they are launched in a single
  // Promise.all instead of three sequential waves. Each wave used to cost a
  // full Neon (sa-east-1) round trip on top of the last; that, combined with
  // the default 10-connection pool queueing most of them anyway, was the
  // dominant cost behind the ~2.1s dashboard load. See src/db/index.ts for
  // the pool-size half of this fix.
  const [salesToday, salesMonth, salesRange, ordersByStatus, quoteTotals, openQuotes, openOpportunities, pipeline, pendingPayments, criticalStock, noStock, noMovement, reservedUnits, locationsCount, overdueFollowUps, transferCounts, newCustomers, returningCustomers, commercialSummary, commercialMargin, topProducts, topCustomers, topSellers, channels, currentSalesSeries, previousSalesSeries, pipelineStages, unknownStock, userSummaryRows, recentActivity, pendingApprovalsRows, previousSalesRange, previousQuoteTotals, previousOrderTotals, previousCriticalStock] = await Promise.all([
    salesMetric(db, filters, today, resolvedCurrency),
    salesMetric(db, filters, month, resolvedCurrency),
    salesMetric(db, filters, range, resolvedCurrency),
    db.select({ status: orders.status, count: count() }).from(orders).where(and(...orderConditions(db, filters, range, resolvedCurrency))).groupBy(orders.status),
    db.select({ total: count(), converted: sql.raw("count(*) filter (where quotes.workflow_status = 'CONVERTED' or quotes.status = 'convertida')") }).from(quotes).where(and(gte(quotes.createdAt, range.from), lt(quotes.createdAt, range.to))),
    db.select({ count: count() }).from(quotes).where(and(gte(quotes.createdAt, range.from), lt(quotes.createdAt, range.to), notInArray(quotes.workflowStatus, ["REJECTED", "EXPIRED", "CONVERTED", "CANCELLED"]))),
    db.select({ count: count() }).from(opportunities).where(and(...opportunityConditions(db, filters, range, resolvedCurrency), notInArray(opportunities.stage, ["CLOSED", "LOST", "CANCELLED"]))),
    db.select({ total: sql.raw("coalesce(sum(opportunities.total_amount), 0)") }).from(opportunities).where(and(...opportunityConditions(db, filters, range, resolvedCurrency), notInArray(opportunities.stage, ["CLOSED", "LOST", "CANCELLED"]))),
    db.select({ count: count() }).from(payments).innerJoin(orders, eq(payments.orderId, orders.id)).where(and(or(eq(payments.status, "PENDING"), eq(payments.status, "UNDER_REVIEW")), ...orderConditions(db, filters, range, resolvedCurrency))),
    db.select({ count: count() }).from(inventoryBalances).where(and(...stockScope, sql.raw("inventory_balances.minimum_stock is not null and (inventory_balances.on_hand - inventory_balances.reserved) <= inventory_balances.minimum_stock"))),
    db.select({ count: sql.raw("count(distinct inventory_balances.product_id)") }).from(inventoryBalances).where(and(...stockScope, sql.raw("(inventory_balances.on_hand - inventory_balances.reserved) <= 0"))),
    db.select({ count: count() }).from(products).where(and(...productScope, sql.raw("not exists (select 1 from inventory_movements im where im.product_id = products.id and im.created_at >= '" + movementCutoff.toISOString() + "'::timestamptz)"))),
    db.select({ units: sql.raw("coalesce(sum(inventory_reservations.quantity), 0)") }).from(inventoryReservations).where(and(eq(inventoryReservations.status, "ACTIVE"), reservationProductScope, filters.locationId ? eq(inventoryReservations.locationId, filters.locationId) : undefined, filters.productId ? eq(inventoryReservations.productId, filters.productId) : undefined)),
    db.select({ count: count() }).from(locations).where(eq(locations.active, true)),
    db.select({ count: count() }).from(crmTasks).where(and(eq(crmTasks.status, "PENDING"), lt(crmTasks.dueAt, now), gte(crmTasks.createdAt, range.from), lt(crmTasks.createdAt, range.to), filters.sellerId ? eq(crmTasks.assignedTo, filters.sellerId) : undefined)),
    db.select({ status: transfers.status, count: count() }).from(transfers).where(and(gte(transfers.createdAt, range.from), lt(transfers.createdAt, range.to))).groupBy(transfers.status),
    db.select({ id: customers.id }).from(sales).innerJoin(customers, eq(sales.customerId, customers.id)).where(and(...salesConditions(db, filters, range, resolvedCurrency), gte(customers.createdAt, range.from), lt(customers.createdAt, range.to))).groupBy(customers.id),
    db.select({ id: sales.customerId }).from(sales).where(and(...salesConditions(db, filters, range, resolvedCurrency), exists(db.select({ id: historicalSales.id }).from(historicalSales).where(and(eq(historicalSales.customerId, sales.customerId), lt(historicalSales.createdAt, range.from)))))).groupBy(sales.customerId),
    db.select({ productsSold: sql<string>`count(distinct ${saleItems.productId})`, unitsSold: sql<string>`coalesce(sum(${saleItems.quantity}), 0)` }).from(saleItems).innerJoin(sales, eq(saleItems.saleId, sales.id)).innerJoin(products, eq(saleItems.productId, products.id)).where(and(...salesConditions(db, filters, range, resolvedCurrency), selectedProduct)),
    db.select({ lineCount: count(saleItems.id), costedLineCount: count(productPrices.id), revenue: sql<string>`coalesce(sum(${saleItems.lineTotal}), 0)`, cost: sql<string>`coalesce(sum(${saleItems.quantity} * ${productPrices.amount}), 0)` }).from(saleItems).innerJoin(sales, eq(saleItems.saleId, sales.id)).innerJoin(products, eq(saleItems.productId, products.id)).leftJoin(productPrices, and(eq(productPrices.productId, saleItems.productId), eq(productPrices.priceType, "COST"), eq(productPrices.active, true))).where(and(...salesConditions(db, filters, range, resolvedCurrency), selectedProduct)),
    db.select({ id: products.id, name: sql<string>`coalesce(${products.commercialName}, ${products.originalName})`, sku: products.sku, units: sql.raw("coalesce(sum(sale_items.quantity), 0)"), revenue: sql.raw("coalesce(sum(sale_items.line_total), 0)") }).from(saleItems).innerJoin(sales, eq(saleItems.saleId, sales.id)).innerJoin(products, eq(saleItems.productId, products.id)).where(and(...salesConditions(db, filters, range, resolvedCurrency))).groupBy(products.id, products.commercialName, products.originalName, products.sku).orderBy(desc(sql.raw("sum(sale_items.line_total)"))).limit(5),
    db.select({ id: customers.id, name: customers.name, orders: count(sales.id), revenue: sql.raw("coalesce(sum(sales.total), 0)") }).from(sales).innerJoin(customers, eq(sales.customerId, customers.id)).where(and(...salesConditions(db, filters, range, resolvedCurrency))).groupBy(customers.id, customers.name).orderBy(desc(sql.raw("sum(sales.total)"))).limit(5),
    db.select({ id: users.id, name: sql<string>`coalesce(${users.name}, ${users.email})`, orders: count(sales.id), revenue: sql.raw("coalesce(sum(sales.total), 0)") }).from(sales).leftJoin(users, eq(sales.sellerId, users.id)).where(and(...salesConditions(db, filters, range, resolvedCurrency))).groupBy(users.id, users.name, users.email).orderBy(desc(sql.raw("sum(sales.total)"))).limit(5),
    db.select({ channel: opportunities.origin, count: count() }).from(opportunities).where(and(...opportunityConditions(db, filters, range, resolvedCurrency))).groupBy(opportunities.origin).orderBy(desc(count())).limit(8),
    salesSeries(db, filters, range, resolvedCurrency),
    salesSeries(db, filters, previous, resolvedCurrency),
    db.select({ stage: opportunities.stage, count: count(), amount: sql<string>`coalesce(sum(${opportunities.totalAmount}), 0)` }).from(opportunities).where(and(...opportunityConditions(db, filters, range, resolvedCurrency))).groupBy(opportunities.stage).orderBy(opportunities.stage),
    db.select({ count: sql<string>`count(*)` }).from(products).where(and(...productScope, unknownBalanceCondition)),
    db.select({ role: users.roleCode, status: users.status, count: count() }).from(users).groupBy(users.roleCode, users.status),
    db.select({ id: auditLogs.id, action: auditLogs.action, entityType: auditLogs.entityType, entityId: auditLogs.entityId, actorId: auditLogs.actorId, actorName: sql<string>`coalesce(${users.name}, 'Sistema')`, createdAt: auditLogs.createdAt }).from(auditLogs).leftJoin(users, eq(auditLogs.actorId, users.id)).where(and(gte(auditLogs.createdAt, range.from), lt(auditLogs.createdAt, range.to), or(isNull(auditLogs.correlationId), notInArray(auditLogs.correlationId, developmentFixtureAuditExclusions)))).orderBy(desc(auditLogs.createdAt)).limit(8),
    db.select({ count: count() }).from(products).where(and(...productScope, eq(products.requiresReview, true))),
    salesMetric(db, filters, previous, resolvedCurrency),
    db.select({ total: count() }).from(quotes).where(and(gte(quotes.createdAt, previous.from), lt(quotes.createdAt, previous.to))),
    db.select({ status: orders.status, count: count() }).from(orders).where(and(...orderConditions(db, filters, previous, resolvedCurrency))).groupBy(orders.status),
    db.select({ count: count() }).from(inventoryBalances).where(and(...stockScope, gte(inventoryBalances.updatedAt, previous.from), lt(inventoryBalances.updatedAt, previous.to), sql.raw("inventory_balances.minimum_stock is not null and (inventory_balances.on_hand - inventory_balances.reserved) <= inventory_balances.minimum_stock"))),
  ]);
  const categorySummaryRows = await categorySummaryPromise;
  const orderCounts = new Map(ordersByStatus.map((row) => [row.status, Number(row.count)]));
  const transferMap = new Map(transferCounts.map((row) => [row.status, Number(row.count)]));
  const totalQuotes = Number(quoteTotals[0]?.total ?? 0);
  const convertedQuotes = Number(quoteTotals[0]?.converted ?? 0);
  const commercial = commercialSummary[0];
  const marginRow = commercialMargin[0];
  const lineCount = Number(marginRow?.lineCount ?? 0);
  const costedLineCount = Number(marginRow?.costedLineCount ?? 0);
  const canViewFinancials = Boolean(actor && can(actor.role, "pricing.cost.view") && can(actor.role, "pricing.margin.view"));
  const costOfSales = lineCount === 0 ? 0 : lineCount === costedLineCount ? Number(marginRow?.cost ?? 0) : null;
  const financial = financialMetrics({ revenue: Number(salesRange.total), costOfSales, operatingExpenses: null });
  const visibleFinancial = canViewFinancials ? financial : financialMetrics({ revenue: null, costOfSales: null, operatingExpenses: null });
  const pipelineSummary = pipelineStages.map((row) => ({ stage: row.stage, stageCode: row.stage, stageLabel: pipelineLabels[row.stage] ?? "Etapa comercial", count: Number(row.count), amount: Number(row.amount ?? 0), weightedValue: Number(row.amount ?? 0) * (pipelineProbabilities[row.stage] ?? 0) }));
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
  const activityProductIds = recentActivity.filter((row) => row.entityType === "product").map((row) => row.entityId);
  const activityProducts = activityProductIds.length ? await db.select({ id: products.id, name: sql<string>`coalesce(${products.commercialName}, ${products.normalizedName}, ${products.originalName})` }).from(products).where(inArray(products.id, activityProductIds)) : [];
  const activityProductLabels = new Map(activityProducts.map((row) => [row.id, row.name]));
  const recentActivityView = recentActivity.map((row) => ({ ...row, actionLabel: actionLabels[row.action] ?? "Actualización registrada", entityLabel: row.entityType === "product" ? (activityProductLabels.get(row.entityId) ?? "Producto") : (entityLabels[row.entityType] ?? "Registro"), actorName: row.actorName || "Sistema" }));
  const activeOrderCount = [...orderCounts.entries()].filter(([status]) => isActiveOrderStatus(status)).reduce((sum, [, value]) => sum + value, 0);
  const previousOrderMap = new Map(previousOrderTotals.map((row) => [row.status, Number(row.count)]));
  const previousActiveOrderCount = [...previousOrderMap.entries()].filter(([status]) => isActiveOrderStatus(status)).reduce((sum, [, value]) => sum + value, 0);
  const comparisons = dashboardComparisons({
    sales: { current: Number(salesRange.total), previous: previousSalesRange.total },
    quotes: { current: totalQuotes, previous: Number(previousQuoteTotals[0]?.total ?? 0) },
    orders: { current: activeOrderCount, previous: previousActiveOrderCount },
    criticalStock: { current: Number(criticalStock[0]?.count ?? 0), previous: Number(previousCriticalStock[0]?.count ?? 0) },
  });
  return {
    range, filters, salesToday, salesMonth, salesRange,
    currency: resolvedCurrency ?? null,
    availableCurrencies,
    currencyAmbiguous,
    orders: { total: activeOrderCount, pendingPayment: orderCounts.get("PAYMENT_PENDING") ?? 0, preparing: orderCounts.get("PREPARING") ?? 0 },
    quotes: Number(openQuotes[0]?.count ?? 0), opportunities: Number(openOpportunities[0]?.count ?? 0), pipelineValue: Number(pipeline[0]?.total ?? 0), pendingPayments: Number(pendingPayments[0]?.count ?? 0),
    criticalStock: Number(criticalStock[0]?.count ?? 0), noStock: Number(noStock[0]?.count ?? 0), unknownStock: Number(unknownStock[0]?.count ?? 0), noMovement: Number(noMovement[0]?.count ?? 0), reservedUnits: Number(reservedUnits[0]?.units ?? 0), activeLocations: Number(locationsCount[0]?.count ?? 0),
    pendingPaymentsCount: Number(pendingPayments[0]?.count ?? 0), criticalStockCount: Number(criticalStock[0]?.count ?? 0), overdueFollowUpsCount: Number(overdueFollowUps[0]?.count ?? 0), pendingQuotesCount: Number(openQuotes[0]?.count ?? 0), pendingApprovalsCount: Number(pendingApprovalsRows[0]?.count ?? 0),
    conversion: { totalQuotes, convertedQuotes, percentage: totalQuotes ? (convertedQuotes / totalQuotes) * 100 : null },
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
    overdueFollowUps: Number(overdueFollowUps[0]?.count ?? 0),
    transfers: { total: [...transferMap.values()].reduce((sum, value) => sum + value, 0), draft: transferMap.get("DRAFT") ?? 0, requested: transferMap.get("REQUESTED") ?? 0, approved: transferMap.get("APPROVED") ?? 0, prepared: transferMap.get("PREPARED") ?? 0, inTransit: transferMap.get("IN_TRANSIT") ?? 0, received: transferMap.get("RECEIVED") ?? 0 },
    topProducts: topProducts.map((row) => ({ ...row, units: Number(row.units), revenue: Number(row.revenue), primaryImageUrl: productMedia.get(row.id)?.[0] ?? null })),
    topCustomers: topCustomers.map((row) => ({ ...row, orders: Number(row.orders), revenue: Number(row.revenue) })),
    topSellers: topSellers.map((row) => ({ ...row, orders: Number(row.orders), revenue: Number(row.revenue) })),
    channels: channels.map((row) => ({ channel: row.channel, count: Number(row.count) })),
    salesSeries: currentSalesSeries,
    previousSalesSeries,
    pipelineSummary,
    pipelineMacroSummary,
    pipelineActiveTotal,
    pipelineLostTotal,
    comparisons,
    categorySummary,
    userSummary: userSummaryRows.map((row) => ({ role: row.role, roleCode: row.role, roleLabel: dashboardRoleLabel(row.role as AppRole | null), status: row.status, statusCode: row.status, statusLabel: statusLabels[row.status] ?? "Estado", count: Number(row.count) })),
    recentActivity: recentActivityView,
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
      db.select({ id: families.id, name: families.name }).from(families).where(eq(families.active, true)).orderBy(families.name).limit(500),
    ),
    withRuntimeCache("report-options:brands", () =>
      db.select({ id: brands.id, name: brands.name }).from(brands).where(eq(brands.active, true)).orderBy(brands.name).limit(500),
    ),
  ]);
  return { locations: locationRows, sellers: sellerRows, customers: customerRows, products: productRows.map((row) => ({ id: row.id, name: row.name || row.normalizedName, sku: row.sku })), categories: categoryRows, families: familyRows, brands: brandRows };
}
