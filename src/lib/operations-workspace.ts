import { alias } from "drizzle-orm/pg-core";
import { after } from "next/server";
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  lte,
  notInArray,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { getDb } from "@/db";
import {
  inventoryBalances,
  inventoryReservations,
  locations,
  products,
  quotes,
  transfers,
  users,
} from "@/db/schema";
import { crmTasks, customers, opportunities, opportunityFollowups } from "@/db/crm-schema";
import { orderIncidents, orders } from "@/db/sales-schema";
import { operationsWorkItems } from "@/db/operations-schema";
import {
  getLimaTodayBounds,
  operationsQueues,
  type OperationsFilters,
  type OperationsQueue,
} from "@/lib/operations-contract";
import { getOperationsPaymentReviewCount } from "@/lib/operations-payment-signals";
import { getOperationsWorkItemRefs, syncOperationsWorkItemsAfterResponse } from "@/lib/operations-work-items-service";
import { getPublishedMediaForEntities } from "@/lib/media-repository";

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
  queueTotals: Record<OperationsQueue, number>;
  teamLoad: Array<{
    team: string;
    assigneeId: string | null;
    assigneeName: string;
    active: number;
    overdue: number;
    blockers: number;
  }>;
  operationalSignals: {
    blockedOrders: number;
    pendingTransfers: number;
    paymentReview: number;
  };
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

const OPEN_QUOTE_WORKFLOW_STATUSES = ["DRAFT", "SENT", "FOLLOW_UP", "ACCEPTED"] as const;
const opportunitySeller = alias(users, "operations_opportunity_seller");
const orderSeller = alias(users, "operations_order_seller");
const taskSeller = alias(users, "operations_task_seller");
const quoteSeller = alias(users, "operations_quote_seller");

const quotePriority = sql<string>`case when ${quotes.createdAt} <= now() - interval '2 days' then 'HIGH' when ${quotes.createdAt} <= now() - interval '1 day' then 'MEDIUM' else 'NORMAL' end`;
const opportunityPriority = sql<string>`case when ${opportunities.followUpAt} is not null and ${opportunities.followUpAt} < now() then 'HIGH' when ${opportunities.followUpAt} is not null and ${opportunities.followUpAt} <= now() + interval '2 days' then 'MEDIUM' else 'NORMAL' end`;
const followUpPriority = sql<string>`case when ${crmTasks.dueAt} is not null and ${crmTasks.dueAt} < now() then 'HIGH' else 'NORMAL' end`;
const legacyFollowUpPriority = sql<string>`case when ${opportunityFollowups.dueAt} < now() then 'HIGH' else 'NORMAL' end`;
const orderPriority = sql<string>`case when exists (select 1 from order_incidents oi where oi.order_id = ${orders.id} and oi.status = 'OPEN' and oi.blocker = true) then 'CRITICAL' when ${orders.createdAt} <= now() - interval '2 days' then 'HIGH' when ${orders.createdAt} <= now() - interval '1 day' then 'MEDIUM' else 'NORMAL' end`;

function applyWorkItemFilters(
  conditions: SQL[],
  filters: OperationsFilters,
  team: "VENTAS" | "OPERACIONES" | "ALMACEN",
  priority: SQL,
  sla: SQL,
) {
  if (filters.team && filters.team !== team) conditions.push(sql`false`);
  if (filters.urgency) conditions.push(sql`${priority} = ${filters.urgency}`);
  if (filters.sla) conditions.push(sql`${sla} = ${filters.sla}`);
}

function applyAssigneeFilter(
  conditions: SQL[],
  filters: OperationsFilters,
  sourceType: string,
  sourceId: SQL,
) {
  if (filters.assigneeId)
    conditions.push(
      sql`exists (select 1 from ${operationsWorkItems} where ${operationsWorkItems.sourceType} = ${sourceType} and ${operationsWorkItems.sourceId} = ${sourceId} and ${operationsWorkItems.assigneeId} = ${filters.assigneeId})`,
    );
}

function conditionsForDate<T>(conditions: SQL[], column: T, filters: OperationsFilters) {
  if (filters.fromAt) conditions.push(gte(column as never, filters.fromAt));
  if (filters.toAt)
    conditions.push(
      lte(column as never, new Date(filters.toAt.getTime() + 24 * 60 * 60 * 1000 - 1)),
    );
}

function falseWhenUnsupported(conditions: SQL[], value: string | undefined, supported: boolean) {
  if (value && !supported) conditions.push(sql`false`);
}

function pagination(totalItems: number, filters: OperationsFilters) {
  return {
    page: filters.page,
    pageSize: filters.pageSize,
    totalItems,
    totalPages: Math.max(1, Math.ceil(totalItems / filters.pageSize)),
  };
}

function quoteActions(id: string): OperationalAction[] {
  return [
    { label: "Abrir", href: `/admin/cotizaciones?quoteId=${encodeURIComponent(id)}` },
    {
      label: "Cambiar estado",
      href: `/admin/cotizaciones?quoteId=${encodeURIComponent(id)}&action=status`,
      permission: "quotes.edit",
    },
    {
      label: "Asignar",
      href: `/admin/cotizaciones?quoteId=${encodeURIComponent(id)}&action=assign`,
      permission: "quotes.edit",
    },
    {
      label: "Registrar actividad",
      href: `/admin/crm?quoteId=${encodeURIComponent(id)}&action=activity`,
      permission: "crm.create",
    },
  ];
}

function opportunityActions(id: string): OperationalAction[] {
  return [
    {
      label: "Mover etapa",
      href: `/admin/crm?view=pipeline&opportunityId=${encodeURIComponent(id)}`,
      permission: "crm.edit",
    },
    {
      label: "Registrar actividad",
      href: `/admin/crm?opportunityId=${encodeURIComponent(id)}&action=activity`,
      permission: "crm.create",
    },
    {
      label: "Crear tarea",
      href: `/admin/crm?view=pipeline&opportunityId=${encodeURIComponent(id)}&action=create`,
      permission: "crm.create",
    },
    {
      label: "Asignar",
      href: `/admin/crm?view=pipeline&opportunityId=${encodeURIComponent(id)}&action=assign`,
      permission: "crm.assign",
    },
  ];
}

function orderActions(id: string, status: string): OperationalAction[] {
  const actions: OperationalAction[] = [
    { label: "Abrir", href: `/admin/pedidos?orderId=${encodeURIComponent(id)}` },
  ];
  if (["NEW", "RECEIVED", "PAID"].includes(status))
    actions.push({
      label: "Preparar",
      href: `/admin/pedidos?orderId=${encodeURIComponent(id)}&action=prepare`,
      permission: "orders.edit",
    });
  if (status === "PREPARING")
    actions.push({
      label: "Marcar listo",
      href: `/admin/pedidos?orderId=${encodeURIComponent(id)}&action=ready`,
      permission: "orders.edit",
    });
  if (["READY", "READY_FOR_PICKUP"].includes(status))
    actions.push({
      label: "Enviar",
      href: `/admin/pedidos?orderId=${encodeURIComponent(id)}&action=ship`,
      permission: "orders.edit",
    });
  if (["IN_TRANSIT", "SHIPPED"].includes(status))
    actions.push({
      label: "Entregar",
      href: `/admin/pedidos?orderId=${encodeURIComponent(id)}&action=deliver`,
      permission: "orders.edit",
    });
  if (status !== "CANCELLED" && status !== "DELIVERED")
    actions.push({
      label: "Cancelar",
      href: `/admin/pedidos?orderId=${encodeURIComponent(id)}&action=cancel`,
      permission: "orders.edit",
    });
  return actions;
}

function taskActions(id: string): OperationalAction[] {
  return [
    {
      label: "Abrir tarea",
      href: `/admin/crm?view=pipeline&taskId=${encodeURIComponent(id)}`,
      permission: "crm.edit",
    },
    {
      label: "Resolver tarea",
      href: `/admin/crm?view=pipeline&taskId=${encodeURIComponent(id)}&action=resolve`,
      permission: "crm.edit",
    },
  ];
}

function inventoryActions(id: string): OperationalAction[] {
  return [
    { label: "Ver inventario", href: `/admin/inventario?productId=${encodeURIComponent(id)}` },
  ];
}

function filterActions(items: Array<Record<string, unknown>>, allowedPermissions?: Set<string>) {
  if (!allowedPermissions) return items;
  return items.map((item) => ({
    ...item,
    actions: Array.isArray(item.actions)
      ? item.actions.filter((action) => {
          if (!action || typeof action !== "object") return false;
          const permission = (action as { permission?: unknown }).permission;
          return typeof permission !== "string" || allowedPermissions.has(permission);
        })
      : [],
  }));
}

async function loadQuotes(filters: OperationsFilters) {
  const conditions: SQL[] = [
    inArray(quotes.workflowStatus, [...OPEN_QUOTE_WORKFLOW_STATUSES]),
    sql`${quotes.status} not in ('convertida', 'cerrada', 'cerrado')`,
  ];
  conditionsForDate(conditions, quotes.createdAt, filters);
  falseWhenUnsupported(conditions, filters.locationId, false);
  if (filters.sellerId) conditions.push(eq(quotes.assignedSellerId, filters.sellerId));
  applyAssigneeFilter(conditions, filters, "QUOTE", sql`${quotes.id}`);
  if (filters.status) conditions.push(sql`${quotes.workflowStatus} = ${filters.status}`);
  applyWorkItemFilters(conditions, filters, "VENTAS", quotePriority, sql`'NO_POLICY'`);
  const db = getDb();
  const [rows, total] = await Promise.all([
    db
      .select({
        id: quotes.id,
        code: quotes.trackingCode,
        customer: quotes.name,
        customerType: quotes.customerType,
        documentNumber: quotes.documentNumber,
        phone: quotes.phone,
        email: quotes.email,
        preferredContact: quotes.preferredContact,
        product: quotes.productName,
        productId: products.id,
        sku: quotes.sku,
        message: quotes.message,
        origin: quotes.origin,
        status: quotes.workflowStatus,
        date: quotes.createdAt,
        validUntil: quotes.validUntil,
        sentAt: quotes.sentAt,
        nextAction: sql<string | null>`null`,
        seller: sql<
          string | null
        >`coalesce(${quoteSeller.name}, ${quoteSeller.email}, ${quotes.assignedSellerId})`,
        priority: quotePriority,
        ageDays: sql<number>`floor(extract(epoch from (now() - ${quotes.createdAt})) / 86400)`,
      })
      .from(quotes)
      .leftJoin(quoteSeller, eq(quoteSeller.id, quotes.assignedSellerId))
      .leftJoin(products, or(eq(products.sku, quotes.sku), eq(products.slug, quotes.productSlug)))
      .where(and(...conditions))
      .orderBy(desc(quotes.createdAt))
      .limit(filters.pageSize)
      .offset((filters.page - 1) * filters.pageSize),
    db
      .select({ count: count() })
      .from(quotes)
      .where(and(...conditions)),
  ]);
  const media = await getPublishedMediaForEntities(
    "product",
    rows.flatMap((row) => (row.productId ? [row.productId] : [])),
  );
  return {
    items: rows.map((row) => ({
      ...row,
      mediaUrl: row.productId ? (media.get(row.productId)?.[0] ?? null) : null,
      actions: quoteActions(row.id),
    })),
    total: Number(total[0]?.count ?? 0),
  };
}

async function loadOpportunities(filters: OperationsFilters) {
  const conditions: SQL[] = [sql`${opportunities.stage} not in ('CLOSED', 'LOST', 'CANCELLED')`];
  conditionsForDate(conditions, opportunities.createdAt, filters);
  falseWhenUnsupported(conditions, filters.locationId, false);
  if (filters.sellerId) conditions.push(eq(opportunities.assignedSellerId, filters.sellerId));
  applyAssigneeFilter(conditions, filters, "OPPORTUNITY", sql`${opportunities.id}`);
  if (filters.status) conditions.push(sql`${opportunities.stage}::text = ${filters.status}`);
  applyWorkItemFilters(
    conditions,
    filters,
    "VENTAS",
    opportunityPriority,
    sql`case when ${opportunities.followUpAt} is null then 'ON_TRACK' when ${opportunities.followUpAt} < now() then 'OVERDUE' when ${opportunities.followUpAt} <= now() + interval '2 days' then 'DUE_SOON' else 'ON_TRACK' end`,
  );
  const db = getDb();
  const [rows, total] = await Promise.all([
    db
      .select({
        id: opportunities.id,
        code: opportunities.code,
        title: opportunities.title,
        customer: customers.name,
        stage: opportunities.stage,
        origin: opportunities.origin,
        notes: opportunities.notes,
        lastContactAt: opportunities.lastContactAt,
        date: opportunities.createdAt,
        seller: sql<
          string | null
        >`coalesce(${opportunitySeller.name}, ${opportunitySeller.email}, ${opportunities.assignedSellerId})`,
        priority: opportunityPriority,
        followUp: opportunities.followUpAt,
        due: opportunities.followUpAt,
        nextAction: opportunities.nextAction,
        ownerId: opportunities.assignedSellerId,
      })
      .from(opportunities)
      .innerJoin(customers, eq(customers.id, opportunities.customerId))
      .leftJoin(opportunitySeller, eq(opportunitySeller.id, opportunities.assignedSellerId))
      .where(and(...conditions))
      .orderBy(asc(opportunities.followUpAt), desc(opportunities.createdAt))
      .limit(filters.pageSize)
      .offset((filters.page - 1) * filters.pageSize),
    db
      .select({ count: count() })
      .from(opportunities)
      .where(and(...conditions)),
  ]);
  return {
    items: rows.map((row) => ({ ...row, actions: opportunityActions(row.id) })),
    total: Number(total[0]?.count ?? 0),
  };
}

async function loadOrders(filters: OperationsFilters) {
  const conditions: SQL[] = [sql`${orders.status} <> 'CANCELLED'`];
  conditionsForDate(conditions, orders.createdAt, filters);
  if (filters.locationId) conditions.push(eq(orders.locationId, filters.locationId));
  if (filters.sellerId) conditions.push(eq(orders.sellerId, filters.sellerId));
  applyAssigneeFilter(conditions, filters, "ORDER", sql`${orders.id}`);
  if (filters.status) conditions.push(sql`${orders.status}::text = ${filters.status}`);
  applyWorkItemFilters(conditions, filters, "OPERACIONES", orderPriority, sql`'NO_POLICY'`);
  const db = getDb();
  const [rows, total] = await Promise.all([
    db
      .select({
        id: orders.id,
        code: orders.code,
        customer: orders.customerNameSnapshot,
        phone: orders.customerPhoneSnapshot,
        email: orders.customerEmailSnapshot,
        status: orders.status,
        location: locations.name,
        deliveryMethod: orders.deliveryMethod,
        deliveryAddress: orders.deliveryAddress,
        seller: sql<
          string | null
        >`coalesce(${orderSeller.name}, ${orderSeller.email}, ${orders.sellerId})`,
        date: orders.createdAt,
        ageDays: sql<number>`floor(extract(epoch from (now() - ${orders.createdAt})) / 86400)`,
        priority: orderPriority,
        ownerId: orders.sellerId,
      })
      .from(orders)
      .innerJoin(locations, eq(locations.id, orders.locationId))
      .leftJoin(orderSeller, eq(orderSeller.id, orders.sellerId))
      .where(and(...conditions))
      .orderBy(desc(orders.createdAt))
      .limit(filters.pageSize)
      .offset((filters.page - 1) * filters.pageSize),
    db
      .select({ count: count() })
      .from(orders)
      .where(and(...conditions)),
  ]);
  return {
    items: rows.map((row) => ({ ...row, actions: orderActions(row.id, row.status) })),
    total: Number(total[0]?.count ?? 0),
  };
}

async function loadFollowUps(filters: OperationsFilters) {
  const today = getLimaTodayBounds();
  const requestedEnd = filters.toAt
    ? new Date(filters.toAt.getTime() + 24 * 60 * 60 * 1000 - 1)
    : today.to;
  const followUpEnd = requestedEnd < today.to ? requestedEnd : today.to;
  const conditions: SQL[] = [
    notInArray(crmTasks.status, ["COMPLETED", "CANCELLED"]),
    lte(crmTasks.dueAt, followUpEnd),
  ];
  if (filters.fromAt) conditions.push(gte(crmTasks.dueAt, filters.fromAt));
  if (filters.sellerId) conditions.push(eq(crmTasks.assignedTo, filters.sellerId));
  applyAssigneeFilter(conditions, filters, "FOLLOW_UP", sql`${crmTasks.id}`);
  falseWhenUnsupported(conditions, filters.locationId, false);
  if (filters.status) conditions.push(sql`${crmTasks.status}::text = ${filters.status}`);
  applyWorkItemFilters(
    conditions,
    filters,
    "VENTAS",
    followUpPriority,
    sql`case when ${crmTasks.dueAt} is null then 'NO_POLICY' when ${crmTasks.dueAt} < now() then 'OVERDUE' when ${crmTasks.dueAt} <= now() + interval '2 days' then 'DUE_SOON' else 'ON_TRACK' end`,
  );
  const db = getDb();
  const legacyConditions: SQL[] = [eq(opportunityFollowups.status, "PENDING"), lte(opportunityFollowups.dueAt, followUpEnd)];
  if (filters.fromAt) legacyConditions.push(gte(opportunityFollowups.dueAt, filters.fromAt));
  if (filters.sellerId) legacyConditions.push(eq(opportunityFollowups.assignedTo, filters.sellerId));
  applyAssigneeFilter(legacyConditions, filters, "FOLLOW_UP", sql`${opportunityFollowups.id}`);
  falseWhenUnsupported(legacyConditions, filters.locationId, false);
  if (filters.status) legacyConditions.push(sql`${opportunityFollowups.status}::text = ${filters.status}`);
  applyWorkItemFilters(legacyConditions, filters, "VENTAS", legacyFollowUpPriority, sql`case when ${opportunityFollowups.dueAt} < now() then 'OVERDUE' when ${opportunityFollowups.dueAt} <= now() + interval '2 days' then 'DUE_SOON' else 'ON_TRACK' end`);
  const [rows, total, legacyRows, legacyTotal] = await Promise.all([
    db
      .select({
        id: crmTasks.id,
        status: crmTasks.status,
        title: crmTasks.title,
        description: crmTasks.description,
        seller: sql<
          string | null
        >`coalesce(${taskSeller.name}, ${taskSeller.email}, ${crmTasks.assignedTo})`,
        customer: customers.name,
        opportunity: opportunities.code,
        due: crmTasks.dueAt,
        date: crmTasks.createdAt,
        priority: followUpPriority,
        ownerId: crmTasks.assignedTo,
      })
      .from(crmTasks)
      .leftJoin(customers, eq(customers.id, crmTasks.customerId))
      .leftJoin(opportunities, eq(opportunities.id, crmTasks.opportunityId))
      .leftJoin(taskSeller, eq(taskSeller.id, crmTasks.assignedTo))
      .where(and(...conditions))
      .orderBy(asc(crmTasks.dueAt))
      .limit(filters.pageSize)
      .offset((filters.page - 1) * filters.pageSize),
    db
      .select({ count: count() })
      .from(crmTasks)
      .where(and(...conditions)),
    db.select({ id: opportunityFollowups.id, status: opportunityFollowups.status, title: opportunityFollowups.title, description: sql<string | null>`null`, seller: sql<string | null>`coalesce(${users.name}, ${users.email}, ${opportunityFollowups.assignedTo})`, customer: customers.name, opportunity: opportunities.code, due: opportunityFollowups.dueAt, date: opportunityFollowups.createdAt, priority: legacyFollowUpPriority, ownerId: opportunityFollowups.assignedTo }).from(opportunityFollowups).innerJoin(opportunities, eq(opportunities.id, opportunityFollowups.opportunityId)).innerJoin(customers, eq(customers.id, opportunities.customerId)).leftJoin(users, eq(users.id, opportunityFollowups.assignedTo)).where(and(...legacyConditions)).orderBy(asc(opportunityFollowups.dueAt)).limit(filters.pageSize).offset((filters.page - 1) * filters.pageSize),
    db.select({ count: count() }).from(opportunityFollowups).innerJoin(opportunities, eq(opportunities.id, opportunityFollowups.opportunityId)).innerJoin(customers, eq(customers.id, opportunities.customerId)).where(and(...legacyConditions)),
  ]);
  const mergedRows = [...rows, ...legacyRows].sort((a, b) => (a.due?.getTime() ?? 0) - (b.due?.getTime() ?? 0)).slice(0, filters.pageSize);
  return {
    items: mergedRows.map((row) => ({
      ...row,
      overdue: row.due ? row.due < new Date() : false,
      actions: taskActions(row.id),
    })),
    total: Number(total[0]?.count ?? 0) + Number(legacyTotal[0]?.count ?? 0),
  };
}

async function loadInventoryAlerts(filters: OperationsFilters) {
  const available = sql<number>`${inventoryBalances.onHand} - ${inventoryBalances.reserved}`;
  const inventoryPriority = sql<string>`case when ${available} <= 0 then 'CRITICAL' else 'HIGH' end`;
  const conditions: SQL[] = [
    sql`(${inventoryBalances.minimumStock} is not null and ${available} <= ${inventoryBalances.minimumStock}) or ${available} <= 0`,
  ];
  if (filters.locationId) conditions.push(eq(inventoryBalances.locationId, filters.locationId));
  if (filters.sellerId) conditions.push(sql`false`);
  applyAssigneeFilter(
    conditions,
    filters,
    "INVENTORY",
    sql`${inventoryBalances.productId} || ':' || ${inventoryBalances.locationId}`,
  );
  if (filters.status === "NO_STOCK") conditions.push(sql`${available} <= 0`);
  if (filters.status === "CRITICAL")
    conditions.push(sql`${inventoryBalances.minimumStock} is not null and ${available} > 0`);
  applyWorkItemFilters(conditions, filters, "ALMACEN", inventoryPriority, sql`'NO_POLICY'`);
  const db = getDb();
  const [rows, total] = await Promise.all([
    db
      .select({
        id: inventoryBalances.productId,
        locationId: inventoryBalances.locationId,
        location: locations.name,
        sku: products.sku,
        product: sql<string>`coalesce(${products.commercialName}, ${products.originalName})`,
        onHand: inventoryBalances.onHand,
        reserved: inventoryBalances.reserved,
        available,
        minimumStock: inventoryBalances.minimumStock,
        severity: sql<string>`case when ${available} <= 0 then 'NO_STOCK' else 'CRITICAL' end`,
        priority: inventoryPriority,
      })
      .from(inventoryBalances)
      .innerJoin(products, eq(products.id, inventoryBalances.productId))
      .innerJoin(locations, eq(locations.id, inventoryBalances.locationId))
      .where(and(...conditions))
      .orderBy(asc(available), asc(products.sku))
      .limit(filters.pageSize)
      .offset((filters.page - 1) * filters.pageSize),
    db
      .select({ count: count() })
      .from(inventoryBalances)
      .where(and(...conditions)),
  ]);
  const media = await getPublishedMediaForEntities(
    "product",
    rows.map((row) => row.id),
  );
  return {
    items: rows.map((row) => ({
      ...row,
      mediaUrl: media.get(row.id)?.[0] ?? null,
      actions: inventoryActions(row.id),
    })),
    total: Number(total[0]?.count ?? 0),
  };
}

async function loadMetrics(filters: OperationsFilters) {
  const quoteConditions: SQL[] = [
    inArray(quotes.workflowStatus, [...OPEN_QUOTE_WORKFLOW_STATUSES]),
    sql`${quotes.status} not in ('convertida', 'cerrada', 'cerrado')`,
  ];
  conditionsForDate(quoteConditions, quotes.createdAt, filters);
  falseWhenUnsupported(quoteConditions, filters.locationId, false);
  if (filters.sellerId || filters.assigneeId)
    quoteConditions.push(eq(quotes.assignedSellerId, filters.sellerId ?? filters.assigneeId!));
  if (filters.status) quoteConditions.push(sql`${quotes.workflowStatus} = ${filters.status}`);
  applyWorkItemFilters(quoteConditions, filters, "VENTAS", quotePriority, sql`'NO_POLICY'`);
  const opportunityConditions: SQL[] = [
    sql`${opportunities.stage} not in ('CLOSED', 'LOST', 'CANCELLED')`,
  ];
  conditionsForDate(opportunityConditions, opportunities.createdAt, filters);
  falseWhenUnsupported(opportunityConditions, filters.locationId, false);
  if (filters.sellerId || filters.assigneeId)
    opportunityConditions.push(
      eq(opportunities.assignedSellerId, filters.sellerId ?? filters.assigneeId!),
    );
  if (filters.status)
    opportunityConditions.push(sql`${opportunities.stage}::text = ${filters.status}`);
  applyWorkItemFilters(
    opportunityConditions,
    filters,
    "VENTAS",
    opportunityPriority,
    sql`case when ${opportunities.followUpAt} is null then 'ON_TRACK' when ${opportunities.followUpAt} < now() then 'OVERDUE' when ${opportunities.followUpAt} <= now() + interval '2 days' then 'DUE_SOON' else 'ON_TRACK' end`,
  );
  const orderConditions: SQL[] = [sql`${orders.status} <> 'CANCELLED'`];
  conditionsForDate(orderConditions, orders.createdAt, filters);
  if (filters.locationId) orderConditions.push(eq(orders.locationId, filters.locationId));
  if (filters.sellerId || filters.assigneeId)
    orderConditions.push(eq(orders.sellerId, filters.sellerId ?? filters.assigneeId!));
  if (filters.status) orderConditions.push(sql`${orders.status}::text = ${filters.status}`);
  applyWorkItemFilters(orderConditions, filters, "OPERACIONES", orderPriority, sql`'NO_POLICY'`);
  const paymentReviewPromise = getOperationsPaymentReviewCount(filters);
  const stockConditions: SQL[] = [
    sql`${inventoryBalances.minimumStock} is not null and (${inventoryBalances.onHand} - ${inventoryBalances.reserved}) <= ${inventoryBalances.minimumStock}`,
  ];
  const noStockConditions: SQL[] = [
    sql`(${inventoryBalances.onHand} - ${inventoryBalances.reserved}) <= 0`,
  ];
  if (filters.team && filters.team !== "ALMACEN") {
    stockConditions.push(sql`false`);
    noStockConditions.push(sql`false`);
  }
  if (filters.urgency && filters.urgency !== "HIGH" && filters.urgency !== "CRITICAL") {
    stockConditions.push(sql`false`);
    noStockConditions.push(sql`false`);
  }
  if (filters.sla && filters.sla !== "NO_POLICY") {
    stockConditions.push(sql`false`);
    noStockConditions.push(sql`false`);
  }
  if (filters.urgency === "HIGH") noStockConditions.push(sql`false`);
  if (filters.urgency === "CRITICAL")
    stockConditions.push(sql`(${inventoryBalances.onHand} - ${inventoryBalances.reserved}) <= 0`);
  if (filters.locationId) {
    stockConditions.push(eq(inventoryBalances.locationId, filters.locationId));
    noStockConditions.push(eq(inventoryBalances.locationId, filters.locationId));
  }
  const taskConditions: SQL[] = [
    notInArray(crmTasks.status, ["COMPLETED", "CANCELLED"]),
    sql`${crmTasks.dueAt} < now()`,
  ];
  if (filters.sellerId || filters.assigneeId)
    taskConditions.push(eq(crmTasks.assignedTo, filters.sellerId ?? filters.assigneeId!));
  falseWhenUnsupported(taskConditions, filters.locationId, false);
  if (filters.fromAt) taskConditions.push(gte(crmTasks.dueAt, filters.fromAt));
  if (filters.toAt)
    taskConditions.push(
      lte(crmTasks.dueAt, new Date(filters.toAt.getTime() + 24 * 60 * 60 * 1000 - 1)),
    );
  applyWorkItemFilters(
    taskConditions,
    filters,
    "VENTAS",
    followUpPriority,
    sql`case when ${crmTasks.dueAt} is null then 'NO_POLICY' when ${crmTasks.dueAt} < now() then 'OVERDUE' when ${crmTasks.dueAt} <= now() + interval '2 days' then 'DUE_SOON' else 'ON_TRACK' end`,
  );
  const db = getDb();
  const [
    quoteRow,
    opportunityRow,
    orderRow,
    preparingRow,
    paymentReviewCount,
    criticalRow,
    noStockRow,
    reservationRow,
    taskRow,
    locationRow,
    blockedOrderRow,
    transferRow,
  ] = await Promise.all([
    db
      .select({ count: count() })
      .from(quotes)
      .where(and(...quoteConditions)),
    db
      .select({ count: count() })
      .from(opportunities)
      .where(and(...opportunityConditions)),
    db
      .select({ count: count() })
      .from(orders)
      .where(and(...orderConditions)),
    db
      .select({ count: count() })
      .from(orders)
      .where(and(...orderConditions, eq(orders.status, "PREPARING"))),
    paymentReviewPromise,
    db
      .select({ count: count() })
      .from(inventoryBalances)
      .where(and(...stockConditions)),
    db
      .select({ count: sql<number>`count(distinct ${inventoryBalances.productId})` })
      .from(inventoryBalances)
      .where(and(...noStockConditions)),
    db
      .select({ units: sql<number>`coalesce(sum(${inventoryReservations.quantity}), 0)` })
      .from(inventoryReservations)
      .where(
        and(
          eq(inventoryReservations.status, "ACTIVE"),
          filters.locationId ? eq(inventoryReservations.locationId, filters.locationId) : sql`true`,
          filters.sellerId || filters.assigneeId ? sql`false` : sql`true`,
        ),
      ),
    db
      .select({ count: count() })
      .from(crmTasks)
      .where(and(...taskConditions)),
    db
      .select({ count: count() })
      .from(locations)
      .where(
        and(
          eq(locations.active, true),
          filters.locationId ? eq(locations.id, filters.locationId) : sql`true`,
        ),
      ),
    db
      .select({ count: count() })
      .from(orderIncidents)
      .innerJoin(orders, eq(orders.id, orderIncidents.orderId))
      .where(
        and(
          ...orderConditions,
          eq(orderIncidents.status, "OPEN"),
          eq(orderIncidents.blocker, true),
        ),
      ),
    db
      .select({ count: count() })
      .from(transfers)
      .where(
        and(
          inArray(transfers.status, ["REQUESTED", "IN_TRANSIT"]),
          filters.locationId
            ? or(
                eq(transfers.sourceLocationId, filters.locationId),
                eq(transfers.destinationLocationId, filters.locationId),
              )
            : sql`true`,
        ),
      ),
  ]);
  return {
    metrics: {
      openQuotes: Number(quoteRow[0]?.count ?? 0),
      openOpportunities: Number(opportunityRow[0]?.count ?? 0),
      activeOrders: Number(orderRow[0]?.count ?? 0),
      preparingOrders: Number(preparingRow[0]?.count ?? 0),
      pendingPayments: paymentReviewCount,
      criticalStock: Number(criticalRow[0]?.count ?? 0),
      noStockProducts: Number(noStockRow[0]?.count ?? 0),
      reservedUnits: Number(reservationRow[0]?.units ?? 0),
      overdueTasks: Number(taskRow[0]?.count ?? 0),
      activeLocations: Number(locationRow[0]?.count ?? 0),
    },
    operationalSignals: {
      blockedOrders: Number(blockedOrderRow[0]?.count ?? 0),
      pendingTransfers: Number(transferRow[0]?.count ?? 0),
      paymentReview: paymentReviewCount,
    },
  };
}

async function loadTeamLoad(filters: OperationsFilters) {
  const db = getDb();
  const rows = await db
    .select({
      team: sql<string>`coalesce(${operationsWorkItems.team}, 'Sin equipo')`,
      assigneeId: operationsWorkItems.assigneeId,
      assigneeName: sql<string>`coalesce(${users.name}, ${users.email}, 'Sin asignar')`,
      active: count(),
      overdue: sql<number>`count(*) filter (where ${operationsWorkItems.dueAt} is not null and ${operationsWorkItems.dueAt} < now())`,
      blockers: sql<number>`count(*) filter (where ${operationsWorkItems.blocker} = true)`,
    })
    .from(operationsWorkItems)
    .leftJoin(users, eq(users.id, operationsWorkItems.assigneeId))
    .where(
      and(
        inArray(operationsWorkItems.status, ["PENDING", "IN_PROGRESS"]),
        filters.team ? eq(operationsWorkItems.team, filters.team) : sql`true`,
        filters.fromAt ? gte(operationsWorkItems.sourceUpdatedAt, filters.fromAt) : sql`true`,
        filters.toAt
          ? lte(
              operationsWorkItems.sourceUpdatedAt,
              new Date(filters.toAt.getTime() + 86400000 - 1),
            )
          : sql`true`,
      ),
    )
    .groupBy(operationsWorkItems.team, operationsWorkItems.assigneeId, users.name, users.email)
    .orderBy(desc(count()));
  return rows.map((row) => ({
    team: row.team,
    assigneeId: row.assigneeId,
    assigneeName: row.assigneeName,
    active: Number(row.active ?? 0),
    overdue: Number(row.overdue ?? 0),
    blockers: Number(row.blockers ?? 0),
  }));
}

export async function getOperationsWorkspace(
  filters: OperationsFilters = { range: "all", page: 1, pageSize: 25 },
  options: { allowedPermissions?: Iterable<string>; summaryScope?: "header" | "home"; syncWorkItems?: boolean } = {},
): Promise<OperationsWorkspace> {
  const selectedQueue = filters.queue;
  // "home" (/admin/inicio) renders only each queue's first page + metrics.overdueTasks. It
  // never reads workItemId/teamLoad, so it skips the 1,000-row projection wave, the
  // operations_work_items upsert and loadTeamLoad. That sync still runs on every
  // /admin/operaciones load, the only module that consumes work items.
  if (options.summaryScope === "home") {
    const [metrics, quoteResult, opportunityResult, orderResult, followUpResult, inventoryResult] =
      await Promise.all([
        loadMetrics(filters),
        loadQuotes(filters),
        loadOpportunities(filters),
        loadOrders(filters),
        loadFollowUps(filters),
        loadInventoryAlerts(filters),
      ]);
    const totals: Record<OperationsQueue, number> = {
      quotes: quoteResult.total,
      opportunities: opportunityResult.total,
      orders: orderResult.total,
      followUps: followUpResult.total,
      inventoryAlerts: inventoryResult.total,
    };
    const allowedPermissions = options.allowedPermissions
      ? new Set(options.allowedPermissions)
      : undefined;
    return {
      metrics: metrics.metrics,
      operationalSignals: metrics.operationalSignals,
      teamLoad: [],
      queueTotals: totals,
      queues: {
        quotes: filterActions(quoteResult.items, allowedPermissions),
        opportunities: filterActions(opportunityResult.items, allowedPermissions),
        orders: filterActions(orderResult.items, allowedPermissions),
        followUps: filterActions(followUpResult.items, allowedPermissions),
        inventoryAlerts: filterActions(inventoryResult.items, allowedPermissions),
      },
      ...pagination(
        selectedQueue ? totals[selectedQueue] : Object.values(totals).reduce((sum, value) => sum + value, 0),
        filters,
      ),
    };
  }
  // "header" callers (KPI/comparison reads on /admin/operaciones) only ever consume
  // .metrics/.operationalSignals/.teamLoad — never .queues. The full path below still
  // loads and upserts every queue's items (up to 1,000 rows x 5 queues) just to compute
  // those three fields, which was the dominant latency when this ran 2-3x per page load.
  if (options.summaryScope === "header") {
    const [metrics, teamLoad] = await Promise.all([
      loadMetrics({
        range: filters.range,
        fromAt: filters.fromAt,
        toAt: filters.toAt,
        team: filters.team,
        page: 1,
        pageSize: 10,
      }),
      loadTeamLoad(filters),
    ]);
    const emptyTotals: Record<OperationsQueue, number> = {
      quotes: 0,
      opportunities: 0,
      orders: 0,
      followUps: 0,
      inventoryAlerts: 0,
    };
    return {
      metrics: metrics.metrics,
      operationalSignals: metrics.operationalSignals,
      teamLoad,
      queueTotals: emptyTotals,
      queues: { quotes: [], opportunities: [], orders: [], followUps: [], inventoryAlerts: [] },
      ...pagination(0, filters),
    };
  }
  const [metrics, quoteResult, opportunityResult, orderResult, followUpResult, inventoryResult] =
    await Promise.all([
      loadMetrics(
        options.summaryScope === "header"
          ? {
              range: filters.range,
              fromAt: filters.fromAt,
              toAt: filters.toAt,
              team: filters.team,
              page: 1,
              pageSize: 10,
            }
          : filters,
      ),
      loadQuotes(filters),
      loadOpportunities(filters),
      loadOrders(filters),
      loadFollowUps(filters),
      loadInventoryAlerts(filters),
    ]);
  const projectionFilters = { ...filters, page: 1, pageSize: 1000 };
  const [
    quoteProjection,
    opportunityProjection,
    orderProjection,
    followUpProjection,
    inventoryProjection,
  ] =
    filters.page === 1 && filters.pageSize >= 1000
      ? [quoteResult, opportunityResult, orderResult, followUpResult, inventoryResult]
      : await Promise.all([
          loadQuotes(projectionFilters),
          loadOpportunities(projectionFilters),
          loadOrders(projectionFilters),
          loadFollowUps(projectionFilters),
          loadInventoryAlerts(projectionFilters),
        ]);
  const totals: Record<OperationsQueue, number> = {
    quotes: quoteResult.total,
    opportunities: opportunityResult.total,
    orders: orderResult.total,
    followUps: followUpResult.total,
    inventoryAlerts: inventoryResult.total,
  };
  const projected = [
    ["QUOTE", quoteProjection.items],
    ["OPPORTUNITY", opportunityProjection.items],
    ["ORDER", orderProjection.items],
    ["FOLLOW_UP", followUpProjection.items],
    ["INVENTORY", inventoryProjection.items],
  ] as const;
  // The projection is read-only during render. Persistence/reconciliation is
  // scheduled after the response so an operations page cannot turn a GET into
  // hundreds of writes or leave stale items hidden behind a successful render.
  const projections = projected.flatMap(([sourceType, rows]) =>
    rows.map((row) => {
      const current = row as Record<string, unknown>;
      const sourceId =
        sourceType === "INVENTORY"
          ? `${String(current.id ?? "")}:${String(current.locationId ?? "")}`
          : String(current.id ?? "");
      const actions = Array.isArray(current.actions) ? current.actions : [];
      const dueAtValue = current.due ?? current.followUp ?? null;
      const dueAt = dueAtValue ? new Date(String(dueAtValue)) : null;
      const priority = String(current.priority ?? current.severity ?? "").toUpperCase();
      return {
        workType:
          sourceType === "FOLLOW_UP"
            ? "Seguimiento"
            : sourceType === "INVENTORY"
              ? "Alerta de inventario"
              : sourceType === "ORDER"
                ? "Pedido"
                : sourceType === "QUOTE"
                  ? "Cotización"
                  : "Oportunidad",
        sourceType,
        sourceId,
        reference: String(current.code ?? current.sku ?? current.id ?? ""),
        title: String(
          current.title ?? current.product ?? current.customer ?? "Trabajo operativo",
        ),
        customer: current.customer == null ? null : String(current.customer),
        location: current.location == null ? null : String(current.location),
        urgency:
          priority === "CRITICAL" || String(current.severity ?? "").toUpperCase() === "NO_STOCK"
            ? "CRITICAL"
            : priority === "HIGH" || current.overdue
              ? "HIGH"
              : priority === "MEDIUM"
                ? "MEDIUM"
                : "NORMAL",
        dueAt: dueAt && !Number.isNaN(dueAt.getTime()) ? dueAt : null,
        blocker:
          String(current.severity ?? "").toUpperCase() === "NO_STOCK" || priority === "CRITICAL",
        nextAction: current.nextAction == null ? null : String(current.nextAction),
        sourceOwnerId: current.ownerId == null ? null : String(current.ownerId),
        team:
          sourceType === "INVENTORY"
            ? "ALMACEN"
            : sourceType === "FOLLOW_UP" || sourceType === "QUOTE" || sourceType === "OPPORTUNITY"
              ? "VENTAS"
              : "OPERACIONES",
        allowedActions: actions.flatMap((action) =>
          action &&
          typeof action === "object" &&
          typeof (action as { label?: unknown }).label === "string"
            ? [(action as { label: string }).label]
            : [],
        ),
        sourceUpdatedAt: current.date ? new Date(String(current.date)) : new Date(),
      } as const;
    }),
  );
  const workItemRefs = await getOperationsWorkItemRefs(projections);
  try {
    if (options.syncWorkItems !== false) after(() => syncOperationsWorkItemsAfterResponse(projections).catch((error) => console.error("ColdPower: no se pudo sincronizar la cola operativa", error)));
  } catch {
    // Contract/unit callers do not have a Next request context. They still get
    // a read-only snapshot; production Route Handlers and Server Components
    // provide the after() context.
  }
  const projectionTeams = new Map(projections.map((projection) => [`${projection.sourceType}:${projection.sourceId}`, projection.team ?? null]));
  const attachWorkItems = (sourceType: string, rows: Array<Record<string, unknown>>) =>
    rows.map((row) => {
      const sourceId =
        sourceType === "INVENTORY"
          ? `${String(row.id ?? "")}:${String(row.locationId ?? "")}`
          : String(row.id ?? "");
      const ref = workItemRefs.get(`${sourceType}:${sourceId}`);
      const fallback = projectionTeams.get(`${sourceType}:${sourceId}`);
      return { ...row, workItemId: ref?.id ?? `work-item-${sourceType.toLowerCase()}-${sourceId}`, workItemAssigneeId: ref?.assigneeId ?? null, workItemTeam: ref?.team ?? fallback ?? null };
    });
  const totalItems = selectedQueue
    ? totals[selectedQueue]
    : Object.values(totals).reduce((sum, value) => sum + value, 0);
  const allowedPermissions = options.allowedPermissions
    ? new Set(options.allowedPermissions)
    : undefined;
  const teamLoad = await loadTeamLoad(filters);
  return {
    metrics: metrics.metrics,
    operationalSignals: metrics.operationalSignals,
    teamLoad,
    queueTotals: totals,
    queues: {
      quotes: filterActions(attachWorkItems("QUOTE", quoteResult.items), allowedPermissions),
      opportunities: filterActions(
        attachWorkItems("OPPORTUNITY", opportunityResult.items),
        allowedPermissions,
      ),
      orders: filterActions(attachWorkItems("ORDER", orderResult.items), allowedPermissions),
      followUps: filterActions(
        attachWorkItems("FOLLOW_UP", followUpResult.items),
        allowedPermissions,
      ),
      inventoryAlerts: filterActions(
        attachWorkItems("INVENTORY", inventoryResult.items),
        allowedPermissions,
      ),
    },
    ...pagination(totalItems, filters),
  };
}

export async function getOperationsExport(filters: OperationsFilters) {
  const queues: OperationsQueue[] = filters.queue ? [filters.queue] : [...operationsQueues];
  const pages = await Promise.all(
    queues.map(async (queue) => {
      const first = await getOperationsWorkspace({ ...filters, queue, page: 1, pageSize: 1000 }, { syncWorkItems: false });
      const results = [first];
      for (let page = 2; page <= first.totalPages; page += 1)
        results.push(await getOperationsWorkspace({ ...filters, queue, page, pageSize: 1000 }, { syncWorkItems: false }));
      return results.flatMap((result) => result.queues[queue].map((row) => ({ queue, ...row })));
    }),
  );
  return pages.flat();
}
