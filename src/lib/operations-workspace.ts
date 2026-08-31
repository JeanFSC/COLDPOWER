import { alias } from "drizzle-orm/pg-core";
import { and, asc, count, desc, eq, gte, inArray, lte, notInArray, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/db";
import { inventoryBalances, inventoryReservations, locations, products, quotes, users } from "@/db/schema";
import { crmTasks, customers, opportunities } from "@/db/crm-schema";
import { orders, payments } from "@/db/sales-schema";
import { getLimaTodayBounds, operationsQueues, type OperationsFilters, type OperationsQueue } from "@/lib/operations-contract";

type OperationalAction = { label: string; href: string; permission?: string };

export type OperationsWorkspace = {
  metrics: {
    openQuotes: number;
    openOpportunities: number;
    activeOrders: number;
    preparingOrders: number;
    pendingPayments: number;
    criticalStock: number;
    noStockProducts: number;
    reservedUnits: number;
    overdueTasks: number;
    activeLocations: number;
  };
  queues: {
    quotes: Array<Record<string, unknown>>;
    opportunities: Array<Record<string, unknown>>;
    orders: Array<Record<string, unknown>>;
    followUps: Array<Record<string, unknown>>;
    inventoryAlerts: Array<Record<string, unknown>>;
  };
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

const OPEN_QUOTE_STATUSES = ["cerrada", "cerrado", "convertida"];
const opportunitySeller = alias(users, "operations_opportunity_seller");
const orderSeller = alias(users, "operations_order_seller");
const taskSeller = alias(users, "operations_task_seller");

function conditionsForDate<T>(conditions: SQL[], column: T, filters: OperationsFilters) {
  if (filters.fromAt) conditions.push(gte(column as never, filters.fromAt));
  if (filters.toAt) conditions.push(lte(column as never, new Date(filters.toAt.getTime() + 24 * 60 * 60 * 1000 - 1)));
}

function falseWhenUnsupported(conditions: SQL[], value: string | undefined, supported: boolean) {
  if (value && !supported) conditions.push(sql`false`);
}

function pagination(totalItems: number, filters: OperationsFilters) {
  return { page: filters.page, pageSize: filters.pageSize, totalItems, totalPages: Math.max(1, Math.ceil(totalItems / filters.pageSize)) };
}

function quoteActions(id: string): OperationalAction[] {
  return [
    { label: "Abrir", href: `/admin/cotizaciones?quoteId=${encodeURIComponent(id)}` },
    { label: "Cambiar estado", href: `/admin/cotizaciones?quoteId=${encodeURIComponent(id)}&action=status`, permission: "quotes.edit" },
    { label: "Asignar", href: `/admin/cotizaciones?quoteId=${encodeURIComponent(id)}&action=assign`, permission: "quotes.edit" },
    { label: "Registrar actividad", href: `/admin/crm?quoteId=${encodeURIComponent(id)}&action=activity`, permission: "crm.create" },
  ];
}

function opportunityActions(id: string): OperationalAction[] {
  return [
    { label: "Mover etapa", href: `/admin/crm?view=pipeline&opportunityId=${encodeURIComponent(id)}`, permission: "crm.edit" },
    { label: "Registrar actividad", href: `/admin/crm?opportunityId=${encodeURIComponent(id)}&action=activity`, permission: "crm.create" },
    { label: "Crear tarea", href: `/admin/crm?view=pipeline&opportunityId=${encodeURIComponent(id)}&action=create`, permission: "crm.create" },
    { label: "Asignar", href: `/admin/crm?view=pipeline&opportunityId=${encodeURIComponent(id)}&action=assign`, permission: "crm.assign" },
  ];
}

function orderActions(id: string, status: string): OperationalAction[] {
  const actions: OperationalAction[] = [{ label: "Abrir", href: `/admin/pedidos?orderId=${encodeURIComponent(id)}` }];
  if (["NEW", "RECEIVED", "PAYMENT_PENDING", "PAID"].includes(status)) actions.push({ label: "Preparar", href: `/admin/pedidos?orderId=${encodeURIComponent(id)}&action=prepare`, permission: "orders.edit" });
  if (status === "PREPARING") actions.push({ label: "Marcar listo", href: `/admin/pedidos?orderId=${encodeURIComponent(id)}&action=ready`, permission: "orders.edit" });
  if (["READY", "READY_FOR_PICKUP"].includes(status)) actions.push({ label: "Enviar", href: `/admin/pedidos?orderId=${encodeURIComponent(id)}&action=ship`, permission: "orders.edit" });
  if (["IN_TRANSIT", "SHIPPED"].includes(status)) actions.push({ label: "Entregar", href: `/admin/pedidos?orderId=${encodeURIComponent(id)}&action=deliver`, permission: "orders.edit" });
  if (status !== "CANCELLED" && status !== "DELIVERED") actions.push({ label: "Cancelar", href: `/admin/pedidos?orderId=${encodeURIComponent(id)}&action=cancel`, permission: "orders.edit" });
  return actions;
}

function taskActions(id: string): OperationalAction[] {
  return [{ label: "Abrir tarea", href: `/admin/crm?view=pipeline&taskId=${encodeURIComponent(id)}`, permission: "crm.edit" }];
}

function inventoryActions(id: string): OperationalAction[] {
  return [{ label: "Ver inventario", href: `/admin/inventario?productId=${encodeURIComponent(id)}` }];
}

function filterActions(items: Array<Record<string, unknown>>, allowedPermissions?: Set<string>) {
  if (!allowedPermissions) return items;
  return items.map((item) => ({
    ...item,
    actions: Array.isArray(item.actions) ? item.actions.filter((action) => {
      if (!action || typeof action !== "object") return false;
      const permission = (action as { permission?: unknown }).permission;
      return typeof permission !== "string" || allowedPermissions.has(permission);
    }) : [],
  }));
}

async function loadQuotes(filters: OperationsFilters) {
  const conditions: SQL[] = [sql`${quotes.status} not in (${sql.join(OPEN_QUOTE_STATUSES.map((value) => sql`${value}`), sql`, `)})`, sql`${quotes.workflowStatus} not in ('CLOSED', 'LOST', 'CANCELLED')`];
  conditionsForDate(conditions, quotes.createdAt, filters);
  falseWhenUnsupported(conditions, filters.locationId, false);
  falseWhenUnsupported(conditions, filters.sellerId, false);
  if (filters.status) conditions.push(sql`${quotes.workflowStatus} = ${filters.status}`);
  const db = getDb();
  const [rows, total] = await Promise.all([
    db.select({ id: quotes.id, code: quotes.trackingCode, customer: quotes.name, product: quotes.productName, status: quotes.workflowStatus, date: quotes.createdAt, nextAction: sql<string | null>`null`, seller: sql<string | null>`null`, ageDays: sql<number>`floor(extract(epoch from (now() - ${quotes.createdAt})) / 86400)` }).from(quotes).where(and(...conditions)).orderBy(desc(quotes.createdAt)).limit(filters.pageSize).offset((filters.page - 1) * filters.pageSize),
    db.select({ count: count() }).from(quotes).where(and(...conditions)),
  ]);
  return { items: rows.map((row) => ({ ...row, actions: quoteActions(row.id) })), total: Number(total[0]?.count ?? 0) };
}

async function loadOpportunities(filters: OperationsFilters) {
  const conditions: SQL[] = [sql`${opportunities.stage} not in ('CLOSED', 'LOST', 'CANCELLED')`];
  conditionsForDate(conditions, opportunities.createdAt, filters);
  falseWhenUnsupported(conditions, filters.locationId, false);
  if (filters.sellerId) conditions.push(eq(opportunities.assignedSellerId, filters.sellerId));
  if (filters.status) conditions.push(sql`${opportunities.stage}::text = ${filters.status}`);
  const db = getDb();
  const [rows, total] = await Promise.all([
    db.select({ id: opportunities.id, code: opportunities.code, customer: customers.name, stage: opportunities.stage, seller: sql<string | null>`coalesce(${opportunitySeller.name}, ${opportunitySeller.email}, ${opportunities.assignedSellerId})`, followUp: opportunities.followUpAt, due: opportunities.followUpAt, nextAction: opportunities.nextAction }).from(opportunities).innerJoin(customers, eq(customers.id, opportunities.customerId)).leftJoin(opportunitySeller, eq(opportunitySeller.id, opportunities.assignedSellerId)).where(and(...conditions)).orderBy(asc(opportunities.followUpAt), desc(opportunities.createdAt)).limit(filters.pageSize).offset((filters.page - 1) * filters.pageSize),
    db.select({ count: count() }).from(opportunities).where(and(...conditions)),
  ]);
  return { items: rows.map((row) => ({ ...row, actions: opportunityActions(row.id) })), total: Number(total[0]?.count ?? 0) };
}

async function loadOrders(filters: OperationsFilters) {
  const conditions: SQL[] = [sql`${orders.status} <> 'CANCELLED'`];
  conditionsForDate(conditions, orders.createdAt, filters);
  if (filters.locationId) conditions.push(eq(orders.locationId, filters.locationId));
  if (filters.sellerId) conditions.push(eq(orders.sellerId, filters.sellerId));
  if (filters.status) conditions.push(sql`${orders.status}::text = ${filters.status}`);
  const db = getDb();
  const [rows, total] = await Promise.all([
    db.select({ id: orders.id, code: orders.code, customer: orders.customerNameSnapshot, status: orders.status, location: locations.name, deliveryMethod: orders.deliveryMethod, seller: sql<string | null>`coalesce(${orderSeller.name}, ${orderSeller.email}, ${orders.sellerId})`, date: orders.createdAt, priority: sql<string>`case when ${orders.status} = 'PREPARING' then 'ALTA' when ${orders.status} in ('NEW', 'RECEIVED', 'PAYMENT_PENDING') then 'MEDIA' else 'NORMAL' end` }).from(orders).innerJoin(locations, eq(locations.id, orders.locationId)).leftJoin(orderSeller, eq(orderSeller.id, orders.sellerId)).where(and(...conditions)).orderBy(desc(orders.createdAt)).limit(filters.pageSize).offset((filters.page - 1) * filters.pageSize),
    db.select({ count: count() }).from(orders).where(and(...conditions)),
  ]);
  return { items: rows.map((row) => ({ ...row, actions: orderActions(row.id, row.status) })), total: Number(total[0]?.count ?? 0) };
}

async function loadFollowUps(filters: OperationsFilters) {
  const today = getLimaTodayBounds();
  const requestedEnd = filters.toAt ? new Date(filters.toAt.getTime() + 24 * 60 * 60 * 1000 - 1) : today.to;
  const followUpEnd = requestedEnd < today.to ? requestedEnd : today.to;
  const conditions: SQL[] = [notInArray(crmTasks.status, ["COMPLETED", "CANCELLED"]), lte(crmTasks.dueAt, followUpEnd)];
  if (filters.fromAt) conditions.push(gte(crmTasks.dueAt, filters.fromAt));
  if (filters.sellerId) conditions.push(eq(crmTasks.assignedTo, filters.sellerId));
  falseWhenUnsupported(conditions, filters.locationId, false);
  if (filters.status) conditions.push(sql`${crmTasks.status}::text = ${filters.status}`);
  const db = getDb();
  const [rows, total] = await Promise.all([
    db.select({ id: crmTasks.id, status: crmTasks.status, title: crmTasks.title, seller: sql<string | null>`coalesce(${taskSeller.name}, ${taskSeller.email}, ${crmTasks.assignedTo})`, customer: customers.name, opportunity: opportunities.code, due: crmTasks.dueAt }).from(crmTasks).leftJoin(customers, eq(customers.id, crmTasks.customerId)).leftJoin(opportunities, eq(opportunities.id, crmTasks.opportunityId)).leftJoin(taskSeller, eq(taskSeller.id, crmTasks.assignedTo)).where(and(...conditions)).orderBy(asc(crmTasks.dueAt)).limit(filters.pageSize).offset((filters.page - 1) * filters.pageSize),
    db.select({ count: count() }).from(crmTasks).where(and(...conditions)),
  ]);
  return { items: rows.map((row) => ({ ...row, overdue: row.due ? row.due < new Date() : false, actions: taskActions(row.id) })), total: Number(total[0]?.count ?? 0) };
}

async function loadInventoryAlerts(filters: OperationsFilters) {
  const available = sql<number>`${inventoryBalances.onHand} - ${inventoryBalances.reserved}`;
  const conditions: SQL[] = [sql`(${inventoryBalances.minimumStock} is not null and ${available} <= ${inventoryBalances.minimumStock}) or ${available} <= 0`];
  if (filters.locationId) conditions.push(eq(inventoryBalances.locationId, filters.locationId));
  falseWhenUnsupported(conditions, filters.sellerId, false);
  if (filters.status === "NO_STOCK") conditions.push(sql`${available} <= 0`);
  if (filters.status === "CRITICAL") conditions.push(sql`${inventoryBalances.minimumStock} is not null and ${available} > 0`);
  const db = getDb();
  const [rows, total] = await Promise.all([
    db.select({ id: inventoryBalances.productId, locationId: inventoryBalances.locationId, location: locations.name, sku: products.sku, product: sql<string>`coalesce(${products.commercialName}, ${products.originalName})`, onHand: inventoryBalances.onHand, reserved: inventoryBalances.reserved, available, minimumStock: inventoryBalances.minimumStock, severity: sql<string>`case when ${available} <= 0 then 'NO_STOCK' else 'CRITICAL' end` }).from(inventoryBalances).innerJoin(products, eq(products.id, inventoryBalances.productId)).innerJoin(locations, eq(locations.id, inventoryBalances.locationId)).where(and(...conditions)).orderBy(asc(available), asc(products.sku)).limit(filters.pageSize).offset((filters.page - 1) * filters.pageSize),
    db.select({ count: count() }).from(inventoryBalances).where(and(...conditions)),
  ]);
  return { items: rows.map((row) => ({ ...row, actions: inventoryActions(row.id) })), total: Number(total[0]?.count ?? 0) };
}

async function loadMetrics(filters: OperationsFilters) {
  const quoteConditions: SQL[] = [sql`${quotes.status} not in ('cerrada', 'cerrado', 'convertida')`, sql`${quotes.workflowStatus} not in ('CLOSED', 'LOST', 'CANCELLED')`];
  conditionsForDate(quoteConditions, quotes.createdAt, filters);
  falseWhenUnsupported(quoteConditions, filters.locationId, false);
  falseWhenUnsupported(quoteConditions, filters.sellerId, false);
  if (filters.status) quoteConditions.push(sql`${quotes.workflowStatus} = ${filters.status}`);
  const opportunityConditions: SQL[] = [sql`${opportunities.stage} not in ('CLOSED', 'LOST', 'CANCELLED')`];
  conditionsForDate(opportunityConditions, opportunities.createdAt, filters);
  falseWhenUnsupported(opportunityConditions, filters.locationId, false);
  if (filters.sellerId) opportunityConditions.push(eq(opportunities.assignedSellerId, filters.sellerId));
  if (filters.status) opportunityConditions.push(sql`${opportunities.stage}::text = ${filters.status}`);
  const orderConditions: SQL[] = [sql`${orders.status} <> 'CANCELLED'`];
  conditionsForDate(orderConditions, orders.createdAt, filters);
  if (filters.locationId) orderConditions.push(eq(orders.locationId, filters.locationId));
  if (filters.sellerId) orderConditions.push(eq(orders.sellerId, filters.sellerId));
  if (filters.status) orderConditions.push(sql`${orders.status}::text = ${filters.status}`);
  const paymentConditions: SQL[] = [eq(payments.status, "PENDING")];
  conditionsForDate(paymentConditions, payments.createdAt, filters);
  if (filters.locationId || filters.sellerId) {
    const selectedOrders = await getDb().select({ id: orders.id }).from(orders).where(and(...orderConditions));
    paymentConditions.push(selectedOrders.length ? inArray(payments.orderId, selectedOrders.map((row) => row.id)) : sql`false`);
  }
  const stockConditions: SQL[] = [sql`${inventoryBalances.minimumStock} is not null and (${inventoryBalances.onHand} - ${inventoryBalances.reserved}) <= ${inventoryBalances.minimumStock}`];
  const noStockConditions: SQL[] = [sql`(${inventoryBalances.onHand} - ${inventoryBalances.reserved}) <= 0`];
  if (filters.locationId) { stockConditions.push(eq(inventoryBalances.locationId, filters.locationId)); noStockConditions.push(eq(inventoryBalances.locationId, filters.locationId)); }
  const taskConditions: SQL[] = [notInArray(crmTasks.status, ["COMPLETED", "CANCELLED"]), sql`${crmTasks.dueAt} < now()`];
  if (filters.sellerId) taskConditions.push(eq(crmTasks.assignedTo, filters.sellerId));
  falseWhenUnsupported(taskConditions, filters.locationId, false);
  if (filters.fromAt) taskConditions.push(gte(crmTasks.dueAt, filters.fromAt));
  if (filters.toAt) taskConditions.push(lte(crmTasks.dueAt, new Date(filters.toAt.getTime() + 24 * 60 * 60 * 1000 - 1)));
  const db = getDb();
  const [quoteRow, opportunityRow, orderRow, preparingRow, paymentRow, criticalRow, noStockRow, reservationRow, taskRow, locationRow] = await Promise.all([
    db.select({ count: count() }).from(quotes).where(and(...quoteConditions)),
    db.select({ count: count() }).from(opportunities).where(and(...opportunityConditions)),
    db.select({ count: count() }).from(orders).where(and(...orderConditions)),
    db.select({ count: count() }).from(orders).where(and(...orderConditions, eq(orders.status, "PREPARING"))),
    db.select({ count: count() }).from(payments).where(and(...paymentConditions)),
    db.select({ count: count() }).from(inventoryBalances).where(and(...stockConditions)),
    db.select({ count: sql<number>`count(distinct ${inventoryBalances.productId})` }).from(inventoryBalances).where(and(...noStockConditions)),
    db.select({ units: sql<number>`coalesce(sum(${inventoryReservations.quantity}), 0)` }).from(inventoryReservations).where(and(eq(inventoryReservations.status, "ACTIVE"), filters.locationId ? eq(inventoryReservations.locationId, filters.locationId) : sql`true`, filters.sellerId ? sql`false` : sql`true`)),
    db.select({ count: count() }).from(crmTasks).where(and(...taskConditions)),
    db.select({ count: count() }).from(locations).where(and(eq(locations.active, true), filters.locationId ? eq(locations.id, filters.locationId) : sql`true`)),
  ]);
  return { openQuotes: Number(quoteRow[0]?.count ?? 0), openOpportunities: Number(opportunityRow[0]?.count ?? 0), activeOrders: Number(orderRow[0]?.count ?? 0), preparingOrders: Number(preparingRow[0]?.count ?? 0), pendingPayments: Number(paymentRow[0]?.count ?? 0), criticalStock: Number(criticalRow[0]?.count ?? 0), noStockProducts: Number(noStockRow[0]?.count ?? 0), reservedUnits: Number(reservationRow[0]?.units ?? 0), overdueTasks: Number(taskRow[0]?.count ?? 0), activeLocations: Number(locationRow[0]?.count ?? 0) };
}

export async function getOperationsWorkspace(filters: OperationsFilters = { range: "all", page: 1, pageSize: 25 }, options: { allowedPermissions?: Iterable<string> } = {}): Promise<OperationsWorkspace> {
  const selectedQueue = filters.queue;
  const [metrics, quoteResult, opportunityResult, orderResult, followUpResult, inventoryResult] = await Promise.all([
    loadMetrics(filters),
    selectedQueue && selectedQueue !== "quotes" ? Promise.resolve({ items: [], total: 0 }) : loadQuotes(filters),
    selectedQueue && selectedQueue !== "opportunities" ? Promise.resolve({ items: [], total: 0 }) : loadOpportunities(filters),
    selectedQueue && selectedQueue !== "orders" ? Promise.resolve({ items: [], total: 0 }) : loadOrders(filters),
    selectedQueue && selectedQueue !== "followUps" ? Promise.resolve({ items: [], total: 0 }) : loadFollowUps(filters),
    selectedQueue && selectedQueue !== "inventoryAlerts" ? Promise.resolve({ items: [], total: 0 }) : loadInventoryAlerts(filters),
  ]);
  const totals: Record<OperationsQueue, number> = { quotes: quoteResult.total, opportunities: opportunityResult.total, orders: orderResult.total, followUps: followUpResult.total, inventoryAlerts: inventoryResult.total };
  const totalItems = selectedQueue ? totals[selectedQueue] : Object.values(totals).reduce((sum, value) => sum + value, 0);
  const allowedPermissions = options.allowedPermissions ? new Set(options.allowedPermissions) : undefined;
  return { metrics, queues: { quotes: filterActions(quoteResult.items, allowedPermissions), opportunities: filterActions(opportunityResult.items, allowedPermissions), orders: filterActions(orderResult.items, allowedPermissions), followUps: filterActions(followUpResult.items, allowedPermissions), inventoryAlerts: filterActions(inventoryResult.items, allowedPermissions) }, ...pagination(totalItems, filters) };
}

export async function getOperationsExport(filters: OperationsFilters) {
  const queues: OperationsQueue[] = filters.queue ? [filters.queue] : [...operationsQueues];
  const pages = await Promise.all(queues.map(async (queue) => {
    const first = await getOperationsWorkspace({ ...filters, queue, page: 1, pageSize: 1000 });
    const results = [first];
    for (let page = 2; page <= first.totalPages; page += 1) results.push(await getOperationsWorkspace({ ...filters, queue, page, pageSize: 1000 }));
    return results.flatMap((result) => result.queues[queue].map((row) => ({ queue, ...row })));
  }));
  return pages.flat();
}
