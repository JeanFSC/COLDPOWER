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
  isNotNull,
  isNull,
  lt,
  max,
  not,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { getDb } from "@/db";
import { quotes, users } from "@/db/schema";
import {
  crmActivities,
  crmTasks,
  customerAddresses,
  customerContacts,
  customerNotes,
  customerQuoteLinks,
  customers,
  opportunities,
} from "@/db/crm-schema";
import { orders, payments, sales } from "@/db/sales-schema";
import type {
  CustomerFilters,
  CustomerListItem,
  CustomerListResponse,
  CustomerRelationFilters,
} from "@/lib/customer-contract";
import { activeCommercialStages, pipelineAgingThresholds } from "@/lib/opportunity-stage-config";
import type { CustomerAttentionKey } from "@/lib/customer-contract";

const defaultPageSize = 25;
const maxPageSize = 100;

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

function overdueFollowUpCondition() {
  const now = new Date();
  return or(
    exists(
      getDb()
        .select({ id: crmActivities.id })
        .from(crmActivities)
        .where(
          and(
            eq(crmActivities.customerId, customers.id),
            isNull(crmActivities.completedAt),
            isNotNull(crmActivities.dueAt),
            lt(crmActivities.dueAt, now),
          ),
        ),
    ),
    exists(
      getDb()
        .select({ id: opportunities.id })
        .from(opportunities)
        .where(
          and(
            eq(opportunities.customerId, customers.id),
            inArray(opportunities.stage, [...activeCommercialStages]),
            isNotNull(opportunities.followUpAt),
            lt(opportunities.followUpAt, now),
          ),
        ),
    ),
  )!;
}

function overdueTaskCondition() {
  return exists(
    getDb()
      .select({ id: crmTasks.id })
      .from(crmTasks)
      .where(
        and(
          eq(crmTasks.customerId, customers.id),
          eq(crmTasks.status, "PENDING"),
          isNotNull(crmTasks.dueAt),
          lt(crmTasks.dueAt, new Date()),
        ),
      ),
  );
}

function activeOpportunityWithoutNextActionCondition() {
  return exists(
    getDb()
      .select({ id: opportunities.id })
      .from(opportunities)
      .where(
        and(
          eq(opportunities.customerId, customers.id),
          inArray(opportunities.stage, [...activeCommercialStages]),
          or(isNull(opportunities.nextAction), sql`btrim(${opportunities.nextAction}) = ''`),
        ),
      ),
  );
}

function unassignedCustomerCondition() {
  return or(
    isNull(customers.assignedSellerId),
    sql`btrim(${customers.assignedSellerId}) = ''`,
  )!;
}

function stalledOpportunityCondition() {
  const staleAt = new Date(
    Date.now() - pipelineAgingThresholds.staleAfterDays * 86_400_000,
  );
  return exists(
    getDb()
      .select({ id: opportunities.id })
      .from(opportunities)
      .where(
        and(
          eq(opportunities.customerId, customers.id),
          inArray(opportunities.stage, [...activeCommercialStages]),
          or(
            lt(opportunities.lastContactAt, staleAt),
            and(isNull(opportunities.lastContactAt), lt(opportunities.createdAt, staleAt)),
          ),
        ),
      ),
  );
}

function quoteResponseCondition() {
  const now = new Date();
  return exists(
    getDb()
      .select({ id: customerQuoteLinks.id })
      .from(customerQuoteLinks)
      .innerJoin(quotes, eq(customerQuoteLinks.quoteId, quotes.id))
      .where(
        and(
          eq(customerQuoteLinks.customerId, customers.id),
          isNull(quotes.respondedAt),
          or(
            inArray(quotes.workflowStatus, ["SENT", "FOLLOW_UP"]),
            inArray(quotes.status, [
              "enviada",
              "nuevo",
              "contactado",
              "evaluacion",
              "requiere_info",
              "cotizada",
            ]),
          ),
          or(isNull(quotes.validUntil), gte(quotes.validUntil, now)),
        ),
      ),
  );
}

function attentionCondition(key: CustomerAttentionKey) {
  if (key === "overdueFollowUp") return overdueFollowUpCondition();
  if (key === "unassigned") return unassignedCustomerCondition();
  if (key === "stalledOpportunity") return stalledOpportunityCondition();
  return quoteResponseCondition();
}

function customerConditions(filters: CustomerFilters) {
  const conditions: SQL[] = [];
  if (filters.query) {
    const pattern = `%${filters.query.trim()}%`;
    conditions.push(
      or(
        ilike(customers.name, pattern),
        ilike(customers.legalName, pattern),
        ilike(customers.email, pattern),
        ilike(customers.phone, pattern),
        ilike(customers.whatsapp, pattern),
        ilike(customers.documentNumber, pattern),
        ilike(customers.ruc, pattern),
        ilike(customers.location, pattern),
        exists(
          getDb()
            .select({ id: customerContacts.id })
            .from(customerContacts)
            .where(
              and(
                eq(customerContacts.customerId, customers.id),
                or(
                  ilike(customerContacts.name, pattern),
                  ilike(customerContacts.email, pattern),
                  ilike(customerContacts.phone, pattern),
                  ilike(customerContacts.whatsapp, pattern),
                )!,
              ),
            ),
        ),
      )!,
    );
  }
  if (filters.customerType) conditions.push(eq(customers.customerType, filters.customerType));
  if (filters.status) conditions.push(eq(customers.status, filters.status));
  if (filters.assignedSellerId)
    conditions.push(eq(customers.assignedSellerId, filters.assignedSellerId));
  if (filters.location) conditions.push(ilike(customers.location, `%${filters.location}%`));
  if (filters.department) {
    conditions.push(
      exists(
        getDb()
          .select({ id: customerAddresses.id })
          .from(customerAddresses)
          .where(
            and(
              eq(customerAddresses.customerId, customers.id),
              ilike(customerAddresses.department, `%${filters.department}%`),
            ),
          ),
      ),
    );
  }
  const openOpportunity = exists(
    getDb()
      .select({ id: opportunities.id })
      .from(opportunities)
      .where(
        and(
          eq(opportunities.customerId, customers.id),
          inArray(opportunities.stage, [...activeCommercialStages]),
        ),
      ),
  );
  if (filters.opportunity === "OPEN") conditions.push(openOpportunity);
  if (filters.opportunity === "NONE") conditions.push(not(openOpportunity));
  const overdueFollowUp = overdueFollowUpCondition();
  if (filters.overdueFollowUp) conditions.push(overdueFollowUp);
  if (filters.attention) conditions.push(attentionCondition(filters.attention));
  if (filters.noActivity !== undefined) {
    const hasActivity = exists(
      getDb()
        .select({ id: crmActivities.id })
        .from(crmActivities)
        .where(eq(crmActivities.customerId, customers.id)),
    );
    conditions.push(filters.noActivity ? not(hasActivity) : hasActivity);
  }
  if (filters.hasQuotes !== undefined) {
    const hasQuotes = exists(
      getDb()
        .select({ id: customerQuoteLinks.id })
        .from(customerQuoteLinks)
        .where(eq(customerQuoteLinks.customerId, customers.id)),
    );
    conditions.push(filters.hasQuotes ? hasQuotes : not(hasQuotes));
  }
  if (filters.hasSales !== undefined) {
    const hasSales = exists(
      getDb().select({ id: sales.id }).from(sales).where(eq(sales.customerId, customers.id)),
    );
    conditions.push(filters.hasSales ? hasSales : not(hasSales));
  }
  if (filters.needsAttention) {
    conditions.push(
      or(
        overdueFollowUp,
        unassignedCustomerCondition(),
        stalledOpportunityCondition(),
        quoteResponseCondition(),
        activeOpportunityWithoutNextActionCondition(),
        overdueTaskCondition(),
      )!,
    );
  }
  if (filters.createdFrom) conditions.push(gte(customers.createdAt, dayStart(filters.createdFrom)));
  if (filters.createdTo) conditions.push(lt(customers.createdAt, dayAfter(filters.createdTo)));
  if (filters.lastActivityFrom)
    conditions.push(gte(customers.lastActivityAt, dayStart(filters.lastActivityFrom)));
  if (filters.lastActivityTo)
    conditions.push(lt(customers.lastActivityAt, dayAfter(filters.lastActivityTo)));
  return conditions;
}

function whereFor(filters: CustomerFilters) {
  const conditions = customerConditions(filters);
  return conditions.length ? and(...conditions) : undefined;
}

function numberValue(value: unknown) {
  return Number(value ?? 0);
}

export async function getCustomersPage(
  filters: CustomerFilters = {},
): Promise<CustomerListResponse> {
  const { page, pageSize } = pageValues(filters.page, filters.pageSize);
  const where = whereFor(filters);
  const db = getDb();
  const sortColumn =
    filters.sort === "name"
      ? customers.name
      : filters.sort === "type"
        ? customers.customerType
        : filters.sort === "status"
          ? customers.status
          : filters.sort === "createdAt"
            ? customers.createdAt
            : customers.lastActivityAt;
  const sortDirection = filters.direction === "asc" ? asc : desc;
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const [
    rows,
    totalRows,
    activeRows,
    inactiveRows,
    newRows,
    openRows,
    noActivityRows,
    attentionRows,
    overdueAttentionRows,
    unassignedRows,
    stalledOpportunityRows,
    quoteResponseRows,
    typeRows,
    statusRows,
    sellerRows,
    locationRows,
    departmentRows,
    typeDistribution,
    locationDistribution,
  ] = await Promise.all([
    db
      .select({
        customer: customers,
        sellerId: users.id,
        sellerName: users.name,
        sellerEmail: users.email,
      })
      .from(customers)
      .leftJoin(users, eq(customers.assignedSellerId, users.id))
      .where(where)
      .orderBy(sortDirection(sortColumn), asc(customers.name))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db
      .select({ total: count(customers.id) })
      .from(customers)
      .where(where),
    db
      .select({ total: count(customers.id) })
      .from(customers)
      .where(and(where, eq(customers.status, "ACTIVE"))),
    db
      .select({ total: count(customers.id) })
      .from(customers)
      .where(and(where, eq(customers.status, "INACTIVE"))),
    db
      .select({ total: count(customers.id) })
      .from(customers)
      .where(and(where, gte(customers.createdAt, monthStart))),
    db
      .select({ total: countDistinct(opportunities.id) })
      .from(customers)
      .innerJoin(opportunities, eq(opportunities.customerId, customers.id))
      .where(and(where, inArray(opportunities.stage, [...activeCommercialStages]))),
    db
      .select({ total: count(customers.id) })
      .from(customers)
      .where(
        and(
          where,
          not(
            exists(
              db
                .select({ id: crmActivities.id })
                .from(crmActivities)
                .where(eq(crmActivities.customerId, customers.id)),
            ),
          ),
        ),
      ),
    db
      .select({ total: count(customers.id) })
      .from(customers)
      .where(whereFor({ ...filters, needsAttention: true })),
    db
      .select({ total: count(customers.id) })
      .from(customers)
      .where(and(where, attentionCondition("overdueFollowUp"))),
    db
      .select({ total: count(customers.id) })
      .from(customers)
      .where(and(where, attentionCondition("unassigned"))),
    db
      .select({ total: count(customers.id) })
      .from(customers)
      .where(and(where, attentionCondition("stalledOpportunity"))),
    db
      .select({ total: count(customers.id) })
      .from(customers)
      .where(and(where, attentionCondition("quoteResponse"))),
    db
      .selectDistinct({ value: customers.customerType })
      .from(customers)
      .where(where)
      .orderBy(customers.customerType),
    db
      .selectDistinct({ value: customers.status })
      .from(customers)
      .where(where)
      .orderBy(customers.status),
    db
      .selectDistinct({ id: users.id, name: users.name, email: users.email })
      .from(customers)
      .innerJoin(users, eq(customers.assignedSellerId, users.id))
      .where(where)
      .orderBy(asc(users.name), asc(users.email)),
    db
      .selectDistinct({ value: customers.location })
      .from(customers)
      .where(where)
      .orderBy(asc(customers.location)),
    db
      .selectDistinct({ value: customerAddresses.department })
      .from(customerAddresses)
      .innerJoin(customers, eq(customerAddresses.customerId, customers.id))
      .where(where)
      .orderBy(asc(customerAddresses.department)),
    db
      .select({ label: customers.customerType, count: count(customers.id) })
      .from(customers)
      .where(where)
      .groupBy(customers.customerType)
      .orderBy(desc(count(customers.id)))
      .limit(5),
    db
      .select({ label: customers.location, count: count(customers.id) })
      .from(customers)
      .where(where)
      .groupBy(customers.location)
      .orderBy(desc(count(customers.id)))
      .limit(5),
  ]);
  const ids = rows.map((row) => row.customer.id);
  const [quoteCounts, opportunityCounts, orderCounts, activityRows] = await Promise.all([
    ids.length
      ? db
          .select({
            customerId: customerQuoteLinks.customerId,
            total: countDistinct(customerQuoteLinks.quoteId),
          })
          .from(customerQuoteLinks)
          .where(inArray(customerQuoteLinks.customerId, ids))
          .groupBy(customerQuoteLinks.customerId)
          .then((items) => new Map(items.map((item) => [item.customerId, numberValue(item.total)])))
      : new Map<string, number>(),
    ids.length
      ? getDb()
          .select({ customerId: opportunities.customerId, total: countDistinct(opportunities.id) })
          .from(opportunities)
          .where(
            and(
              inArray(opportunities.customerId, ids),
              inArray(opportunities.stage, [...activeCommercialStages]),
            ),
          )
          .groupBy(opportunities.customerId)
          .then((items) => new Map(items.map((item) => [item.customerId, numberValue(item.total)])))
      : new Map<string, number>(),
    ids.length
      ? db
          .select({ customerId: orders.customerId, total: countDistinct(orders.id) })
          .from(orders)
          .where(inArray(orders.customerId, ids))
          .groupBy(orders.customerId)
          .then((items) => new Map(items.map((item) => [item.customerId, numberValue(item.total)])))
      : new Map<string, number>(),
    ids.length
      ? getDb()
          .select({
            customerId: crmActivities.customerId,
            type: crmActivities.type,
            subject: crmActivities.subject,
            createdAt: crmActivities.createdAt,
            occurredAt: crmActivities.occurredAt,
            performedBy: users.name,
          })
          .from(crmActivities)
          .leftJoin(users, eq(crmActivities.performedBy, users.id))
          .where(inArray(crmActivities.customerId, ids))
          .orderBy(desc(sql`coalesce(${crmActivities.occurredAt}, ${crmActivities.createdAt})`))
      : [],
  ]);
  const activityMap = new Map<string, (typeof activityRows)[number]>();
  for (const activity of activityRows)
    if (activity.customerId && !activityMap.has(activity.customerId))
      activityMap.set(activity.customerId, activity);
  const items: CustomerListItem[] = rows.map((row) => ({
    ...row.customer,
    assignedSeller: row.sellerId
      ? { id: row.sellerId, name: row.sellerName, email: row.sellerEmail }
      : null,
    quoteCount: quoteCounts.get(row.customer.id) ?? 0,
    openOpportunityCount: opportunityCounts.get(row.customer.id) ?? 0,
    orderCount: orderCounts.get(row.customer.id) ?? 0,
    lastActivity: activityMap.get(row.customer.id)
      ? {
          type: activityMap.get(row.customer.id)!.type,
          subject: activityMap.get(row.customer.id)!.subject,
          createdAt: activityMap.get(row.customer.id)!.createdAt,
          occurredAt: activityMap.get(row.customer.id)!.occurredAt,
          performedBy: activityMap.get(row.customer.id)!.performedBy,
        }
      : null,
    lastActivityAt: activityMap.get(row.customer.id)?.occurredAt ?? activityMap.get(row.customer.id)?.createdAt ?? row.customer.lastActivityAt,
  }));
  const totalItems = numberValue(totalRows[0]?.total);
  return {
    items,
    page: Math.min(page, Math.max(1, Math.ceil(totalItems / pageSize))),
    pageSize,
    totalItems,
    totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
    metrics: {
      total: totalItems,
      active: numberValue(activeRows[0]?.total),
      inactive: numberValue(inactiveRows[0]?.total),
      newThisMonth: numberValue(newRows[0]?.total),
      withOpenOpportunity: numberValue(openRows[0]?.total),
      withoutActivity: numberValue(noActivityRows[0]?.total),
      requiringAttention: numberValue(attentionRows[0]?.total),
      attentionCategories: [
        {
          key: "overdueFollowUp",
          label: "Seguimiento vencido",
          count: numberValue(overdueAttentionRows[0]?.total),
        },
        {
          key: "unassigned",
          label: "Sin responsable",
          count: numberValue(unassignedRows[0]?.total),
        },
        {
          key: "stalledOpportunity",
          label: "Oportunidad estancada",
          count: numberValue(stalledOpportunityRows[0]?.total),
        },
        {
          key: "quoteResponse",
          label: "Cotización por responder",
          count: numberValue(quoteResponseRows[0]?.total),
        },
      ],
      distributionByType: typeDistribution.map((row) => ({
        label: row.label,
        count: numberValue(row.count),
      })),
      distributionByLocation: locationDistribution.flatMap((row) =>
        row.label ? [{ label: row.label, count: numberValue(row.count) }] : [],
      ),
    },
    facets: {
      customerTypes: typeRows.map((row) => row.value).filter((value) => Boolean(value)),
      statuses: statusRows.map((row) => row.value).filter((value) => Boolean(value)),
      sellers: sellerRows,
      locations: locationRows
        .map((row) => row.value)
        .filter((value): value is string => typeof value === "string"),
      departments: departmentRows
        .map((row) => row.value)
        .filter((value): value is string => typeof value === "string"),
    },
  };
}

function relationPage(page: number | undefined, pageSize: number | undefined) {
  return pageValues(page, pageSize);
}

function relationResult<T>(items: T[], page: number, pageSize: number, totalItems: number) {
  return {
    items,
    page,
    pageSize,
    totalItems,
    totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
  };
}

function paymentReference(id: string) {
  return `PAGO-${(id.split("-").at(-1) ?? id.slice(-8)).toUpperCase()}`;
}

export async function getCustomer360(
  customerId: string,
  filters: CustomerRelationFilters = {},
  options: { includeFinancial?: boolean; includeSales?: boolean; includePayments?: boolean; includeOrders?: boolean } = {},
) {
  const db = getDb();
  const includeSales = options.includeSales ?? options.includeFinancial ?? false;
  const includePayments = options.includePayments ?? options.includeFinancial ?? false;
  const includeOrders = options.includeOrders ?? true;
  const [customerRow] = await db
    .select({
      customer: customers,
      sellerId: users.id,
      sellerName: users.name,
      sellerEmail: users.email,
    })
    .from(customers)
    .leftJoin(users, eq(customers.assignedSellerId, users.id))
    .where(eq(customers.id, customerId))
    .limit(1);
  if (!customerRow) return null;
  const size = Math.min(maxPageSize, Math.max(1, Math.floor(filters.pageSize ?? 20)));
  const pages = {
    quotes: relationPage(filters.quotesPage, size),
    opportunities: relationPage(filters.opportunitiesPage, size),
    sales: relationPage(filters.salesPage, size),
    orders: relationPage(filters.ordersPage, size),
    payments: relationPage(filters.paymentsPage, size),
    activities: relationPage(filters.activitiesPage, size),
    tasks: relationPage(filters.tasksPage, size),
  };
  const [
    quoteRows,
    quoteTotal,
    opportunityRows,
    opportunityTotal,
    salesRows,
    salesTotal,
    orderRows,
    orderTotal,
    paymentRows,
    paymentTotal,
    activityRows,
    activityTotal,
    taskRows,
    taskTotal,
  ] = await Promise.all([
    db
      .select({ quote: quotes, linkId: customerQuoteLinks.id })
      .from(customerQuoteLinks)
      .innerJoin(quotes, eq(customerQuoteLinks.quoteId, quotes.id))
      .where(eq(customerQuoteLinks.customerId, customerId))
      .orderBy(desc(quotes.createdAt))
      .limit(pages.quotes.pageSize)
      .offset((pages.quotes.page - 1) * pages.quotes.pageSize),
    db
      .select({ total: count(customerQuoteLinks.id) })
      .from(customerQuoteLinks)
      .where(eq(customerQuoteLinks.customerId, customerId)),
    db
      .select()
      .from(opportunities)
      .where(eq(opportunities.customerId, customerId))
      .orderBy(desc(opportunities.updatedAt))
      .limit(pages.opportunities.pageSize)
      .offset((pages.opportunities.page - 1) * pages.opportunities.pageSize),
    db
      .select({ total: count(opportunities.id) })
      .from(opportunities)
      .where(eq(opportunities.customerId, customerId)),
    includeSales
      ? db
          .select()
          .from(sales)
          .where(eq(sales.customerId, customerId))
          .orderBy(desc(sales.updatedAt))
          .limit(pages.sales.pageSize)
          .offset((pages.sales.page - 1) * pages.sales.pageSize)
      : [],
    includeSales
      ? db
          .select({ total: count(sales.id) })
          .from(sales)
          .where(eq(sales.customerId, customerId))
      : [{ total: 0 }],
    includeOrders
      ? db
          .select()
          .from(orders)
          .where(eq(orders.customerId, customerId))
          .orderBy(desc(orders.updatedAt))
          .limit(pages.orders.pageSize)
          .offset((pages.orders.page - 1) * pages.orders.pageSize)
      : [],
    includeOrders
      ? db
          .select({ total: count(orders.id) })
          .from(orders)
          .where(eq(orders.customerId, customerId))
      : [{ total: 0 }],
    includePayments
      ? db
          .select()
          .from(payments)
          .innerJoin(orders, eq(payments.orderId, orders.id))
          .where(eq(orders.customerId, customerId))
          .orderBy(desc(payments.updatedAt))
          .limit(pages.payments.pageSize)
          .offset((pages.payments.page - 1) * pages.payments.pageSize)
      : [],
    includePayments
      ? db
          .select({ total: count(payments.id) })
          .from(payments)
          .innerJoin(orders, eq(payments.orderId, orders.id))
          .where(eq(orders.customerId, customerId))
      : [{ total: 0 }],
    db
      .select()
      .from(crmActivities)
      .where(eq(crmActivities.customerId, customerId))
      .orderBy(desc(sql`coalesce(${crmActivities.occurredAt}, ${crmActivities.createdAt})`))
      .limit(pages.activities.pageSize)
      .offset((pages.activities.page - 1) * pages.activities.pageSize),
    db
      .select({ total: count(crmActivities.id) })
      .from(crmActivities)
      .where(eq(crmActivities.customerId, customerId)),
    db
      .select()
      .from(crmTasks)
      .where(eq(crmTasks.customerId, customerId))
      .orderBy(desc(crmTasks.dueAt), desc(crmTasks.createdAt))
      .limit(pages.tasks.pageSize)
      .offset((pages.tasks.page - 1) * pages.tasks.pageSize),
    db
      .select({ total: count(crmTasks.id) })
      .from(crmTasks)
      .where(eq(crmTasks.customerId, customerId)),
  ]);
  const [contacts, addresses, notes] = await Promise.all([
    db
      .select()
      .from(customerContacts)
      .where(eq(customerContacts.customerId, customerId))
      .orderBy(desc(customerContacts.isPrimary), asc(customerContacts.name))
      .limit(100),
    db
      .select()
      .from(customerAddresses)
      .where(eq(customerAddresses.customerId, customerId))
      .orderBy(desc(customerAddresses.isPrimary), asc(customerAddresses.label))
      .limit(100),
    db
      .select()
      .from(customerNotes)
      .where(eq(customerNotes.customerId, customerId))
      .orderBy(desc(customerNotes.createdAt))
      .limit(100),
  ]);
  const [openOpportunityCount, lastActivity] = await Promise.all([
    db
      .select({ total: count(opportunities.id) })
      .from(opportunities)
      .where(
        and(
          eq(opportunities.customerId, customerId),
          inArray(opportunities.stage, [...activeCommercialStages]),
        ),
      ),
    db
      .select({ lastActivityAt: max(sql`coalesce(${crmActivities.occurredAt}, ${crmActivities.createdAt})`) })
      .from(crmActivities)
      .where(eq(crmActivities.customerId, customerId)),
  ]);
  return {
    customer: {
      ...customerRow.customer,
      assignedSeller: customerRow.sellerId
        ? { id: customerRow.sellerId, name: customerRow.sellerName, email: customerRow.sellerEmail }
        : null,
    },
    contacts,
    addresses,
    notes,
    summary: {
      quoteCount: numberValue(quoteTotal[0]?.total),
      opportunityCount: numberValue(opportunityTotal[0]?.total),
      openOpportunityCount: numberValue(openOpportunityCount[0]?.total),
      saleCount: numberValue(salesTotal[0]?.total),
       orderCount: includeOrders ? numberValue(orderTotal[0]?.total) : null,
      paymentCount: includePayments ? numberValue(paymentTotal[0]?.total) : null,
      lastActivityAt: lastActivity[0]?.lastActivityAt ?? customerRow.customer.lastActivityAt,
    },
    quotes: relationResult(
      quoteRows.map((row) => ({ ...row.quote, linkId: row.linkId })),
      pages.quotes.page,
      pages.quotes.pageSize,
      numberValue(quoteTotal[0]?.total),
    ),
    opportunities: relationResult(
      opportunityRows,
      pages.opportunities.page,
      pages.opportunities.pageSize,
      numberValue(opportunityTotal[0]?.total),
    ),
    sales: includeSales
      ? relationResult(
          salesRows,
          pages.sales.page,
          pages.sales.pageSize,
          numberValue(salesTotal[0]?.total),
        )
      : null,
    orders: includeOrders
      ? relationResult(
          orderRows,
          pages.orders.page,
          pages.orders.pageSize,
          numberValue(orderTotal[0]?.total),
        )
      : null,
    payments: includePayments
      ? relationResult(
          paymentRows.map((row) => ({
            ...row.payments,
            paymentCode: paymentReference(row.payments.id),
            orderCode: row.orders.code,
          })),
          pages.payments.page,
          pages.payments.pageSize,
          numberValue(paymentTotal[0]?.total),
        )
      : null,
    activities: relationResult(
      activityRows,
      pages.activities.page,
      pages.activities.pageSize,
      numberValue(activityTotal[0]?.total),
    ),
    tasks: relationResult(
      taskRows,
      pages.tasks.page,
      pages.tasks.pageSize,
      numberValue(taskTotal[0]?.total),
    ),
  };
}
