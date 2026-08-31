import { and, asc, count, countDistinct, desc, eq, exists, gte, ilike, inArray, lt, max, not, notInArray, or, type SQL } from "drizzle-orm";
import { getDb } from "@/db";
import { auditLogs, quotes, users } from "@/db/schema";
import { crmActivities, crmTasks, customerAddresses, customerContacts, customerNotes, customerQuoteLinks, customers, opportunities } from "@/db/crm-schema";
import { orders, payments, sales } from "@/db/sales-schema";
import type { CustomerFilters, CustomerListItem, CustomerListResponse, CustomerRelationFilters } from "@/lib/customer-contract";

const defaultPageSize = 25;
const maxPageSize = 100;
const closedOpportunityStages = ["CLOSED", "LOST", "CANCELLED"] as const;

function pageValues(page?: number, pageSize?: number) {
  return { page: Math.max(1, Math.floor(page ?? 1)), pageSize: Math.min(maxPageSize, Math.max(1, Math.floor(pageSize ?? defaultPageSize))) };
}

function dayStart(value: string) { return new Date(`${value}T00:00:00-05:00`); }
function dayAfter(value: string) { return new Date(dayStart(value).getTime() + 86_400_000); }

function customerConditions(filters: CustomerFilters) {
  const conditions: SQL[] = [];
  if (filters.query) {
    const pattern = `%${filters.query.trim()}%`;
    conditions.push(or(ilike(customers.name, pattern), ilike(customers.legalName, pattern), ilike(customers.email, pattern), ilike(customers.phone, pattern), ilike(customers.whatsapp, pattern), ilike(customers.documentNumber, pattern), ilike(customers.ruc, pattern), ilike(customers.location, pattern))!);
  }
  if (filters.customerType) conditions.push(eq(customers.customerType, filters.customerType));
  if (filters.status) conditions.push(eq(customers.status, filters.status));
  if (filters.assignedSellerId) conditions.push(eq(customers.assignedSellerId, filters.assignedSellerId));
  if (filters.location) conditions.push(ilike(customers.location, `%${filters.location}%`));
  if (filters.createdFrom) conditions.push(gte(customers.createdAt, dayStart(filters.createdFrom)));
  if (filters.createdTo) conditions.push(lt(customers.createdAt, dayAfter(filters.createdTo)));
  return conditions;
}

function whereFor(filters: CustomerFilters) {
  const conditions = customerConditions(filters);
  return conditions.length ? and(...conditions) : undefined;
}

function numberValue(value: unknown) { return Number(value ?? 0); }

export async function getCustomersPage(filters: CustomerFilters = {}): Promise<CustomerListResponse> {
  const { page, pageSize } = pageValues(filters.page, filters.pageSize);
  const where = whereFor(filters);
  const db = getDb();
  const [rows, totalRows, activeRows, inactiveRows, openRows, noActivityRows, typeRows, statusRows, sellerRows, locationRows] = await Promise.all([
    db.select({ customer: customers, sellerId: users.id, sellerName: users.name, sellerEmail: users.email }).from(customers).leftJoin(users, eq(customers.assignedSellerId, users.id)).where(where).orderBy(desc(customers.updatedAt), asc(customers.name)).limit(pageSize).offset((page - 1) * pageSize),
    db.select({ total: count(customers.id) }).from(customers).where(where),
    db.select({ total: count(customers.id) }).from(customers).where(and(where, eq(customers.status, "ACTIVE"))),
    db.select({ total: count(customers.id) }).from(customers).where(and(where, eq(customers.status, "INACTIVE"))),
    db.select({ total: countDistinct(customers.id) }).from(customers).innerJoin(opportunities, eq(opportunities.customerId, customers.id)).where(and(where, notInArray(opportunities.stage, [...closedOpportunityStages]))),
    db.select({ total: count(customers.id) }).from(customers).where(and(where, not(exists(db.select({ id: crmActivities.id }).from(crmActivities).where(eq(crmActivities.customerId, customers.id)))))),
    db.selectDistinct({ value: customers.customerType }).from(customers).where(where).orderBy(customers.customerType),
    db.selectDistinct({ value: customers.status }).from(customers).where(where).orderBy(customers.status),
    db.selectDistinct({ id: users.id, name: users.name, email: users.email }).from(customers).innerJoin(users, eq(customers.assignedSellerId, users.id)).where(where).orderBy(asc(users.name), asc(users.email)),
    db.selectDistinct({ value: customers.location }).from(customers).where(where).orderBy(asc(customers.location)),
  ]);
  const ids = rows.map((row) => row.customer.id);
  const [quoteCounts, opportunityCounts, orderCounts, activityRows] = await Promise.all([
    ids.length ? db.select({ customerId: customerQuoteLinks.customerId, total: countDistinct(customerQuoteLinks.quoteId) }).from(customerQuoteLinks).where(inArray(customerQuoteLinks.customerId, ids)).groupBy(customerQuoteLinks.customerId).then((items) => new Map(items.map((item) => [item.customerId, numberValue(item.total)]))) : new Map<string, number>(),
    ids.length ? getDb().select({ customerId: opportunities.customerId, total: countDistinct(opportunities.id) }).from(opportunities).where(and(inArray(opportunities.customerId, ids), notInArray(opportunities.stage, [...closedOpportunityStages]))).groupBy(opportunities.customerId).then((items) => new Map(items.map((item) => [item.customerId, numberValue(item.total)]))) : new Map<string, number>(),
    ids.length ? db.select({ customerId: orders.customerId, total: countDistinct(orders.id) }).from(orders).where(inArray(orders.customerId, ids)).groupBy(orders.customerId).then((items) => new Map(items.map((item) => [item.customerId, numberValue(item.total)]))) : new Map<string, number>(),
    ids.length ? getDb().select({ customerId: crmActivities.customerId, lastActivityAt: max(crmActivities.createdAt) }).from(crmActivities).where(inArray(crmActivities.customerId, ids)).groupBy(crmActivities.customerId) : [],
  ]);
  const activityMap = new Map(activityRows.map((row) => [row.customerId, row.lastActivityAt]));
  const items: CustomerListItem[] = rows.map((row) => ({
    ...row.customer,
    assignedSeller: row.sellerId ? { id: row.sellerId, name: row.sellerName, email: row.sellerEmail } : null,
    quoteCount: quoteCounts.get(row.customer.id) ?? 0,
    openOpportunityCount: opportunityCounts.get(row.customer.id) ?? 0,
    orderCount: orderCounts.get(row.customer.id) ?? 0,
    lastActivityAt: activityMap.get(row.customer.id) ?? row.customer.lastActivityAt,
  }));
  const totalItems = numberValue(totalRows[0]?.total);
  return {
    items,
    page: Math.min(page, Math.max(1, Math.ceil(totalItems / pageSize))),
    pageSize,
    totalItems,
    totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
    metrics: { total: totalItems, active: numberValue(activeRows[0]?.total), inactive: numberValue(inactiveRows[0]?.total), withOpenOpportunity: numberValue(openRows[0]?.total), withoutActivity: numberValue(noActivityRows[0]?.total) },
    facets: {
      customerTypes: typeRows.map((row) => row.value).filter((value) => Boolean(value)),
      statuses: statusRows.map((row) => row.value).filter((value) => Boolean(value)),
      sellers: sellerRows,
      locations: locationRows.map((row) => row.value).filter((value): value is string => typeof value === "string"),
    },
  };
}

function relationPage(page: number | undefined, pageSize: number | undefined) { return pageValues(page, pageSize); }

function relationResult<T>(items: T[], page: number, pageSize: number, totalItems: number) { return { items, page, pageSize, totalItems, totalPages: Math.max(1, Math.ceil(totalItems / pageSize)) }; }

export async function getCustomer360(customerId: string, filters: CustomerRelationFilters = {}, options: { includeFinancial?: boolean } = {}) {
  const db = getDb();
  const [customerRow] = await db.select({ customer: customers, sellerId: users.id, sellerName: users.name, sellerEmail: users.email }).from(customers).leftJoin(users, eq(customers.assignedSellerId, users.id)).where(eq(customers.id, customerId)).limit(1);
  if (!customerRow) return null;
  const size = Math.min(maxPageSize, Math.max(1, Math.floor(filters.pageSize ?? 20)));
  const pages = { quotes: relationPage(filters.quotesPage, size), opportunities: relationPage(filters.opportunitiesPage, size), sales: relationPage(filters.salesPage, size), orders: relationPage(filters.ordersPage, size), payments: relationPage(filters.paymentsPage, size), activities: relationPage(filters.activitiesPage, size), tasks: relationPage(filters.tasksPage, size) };
  const [quoteRows, quoteTotal, opportunityRows, opportunityTotal, salesRows, salesTotal, orderRows, orderTotal, paymentRows, paymentTotal, activityRows, activityTotal, taskRows, taskTotal] = await Promise.all([
    db.select({ quote: quotes, linkId: customerQuoteLinks.id }).from(customerQuoteLinks).innerJoin(quotes, eq(customerQuoteLinks.quoteId, quotes.id)).where(eq(customerQuoteLinks.customerId, customerId)).orderBy(desc(quotes.createdAt)).limit(pages.quotes.pageSize).offset((pages.quotes.page - 1) * pages.quotes.pageSize),
    db.select({ total: count(customerQuoteLinks.id) }).from(customerQuoteLinks).where(eq(customerQuoteLinks.customerId, customerId)),
    db.select().from(opportunities).where(eq(opportunities.customerId, customerId)).orderBy(desc(opportunities.updatedAt)).limit(pages.opportunities.pageSize).offset((pages.opportunities.page - 1) * pages.opportunities.pageSize),
    db.select({ total: count(opportunities.id) }).from(opportunities).where(eq(opportunities.customerId, customerId)),
    options.includeFinancial ? db.select().from(sales).where(eq(sales.customerId, customerId)).orderBy(desc(sales.updatedAt)).limit(pages.sales.pageSize).offset((pages.sales.page - 1) * pages.sales.pageSize) : [],
    options.includeFinancial ? db.select({ total: count(sales.id) }).from(sales).where(eq(sales.customerId, customerId)) : [{ total: 0 }],
    db.select().from(orders).where(eq(orders.customerId, customerId)).orderBy(desc(orders.updatedAt)).limit(pages.orders.pageSize).offset((pages.orders.page - 1) * pages.orders.pageSize),
    db.select({ total: count(orders.id) }).from(orders).where(eq(orders.customerId, customerId)),
    options.includeFinancial ? db.select().from(payments).innerJoin(orders, eq(payments.orderId, orders.id)).where(eq(orders.customerId, customerId)).orderBy(desc(payments.updatedAt)).limit(pages.payments.pageSize).offset((pages.payments.page - 1) * pages.payments.pageSize) : [],
    options.includeFinancial ? db.select({ total: count(payments.id) }).from(payments).innerJoin(orders, eq(payments.orderId, orders.id)).where(eq(orders.customerId, customerId)) : [{ total: 0 }],
    db.select().from(crmActivities).where(eq(crmActivities.customerId, customerId)).orderBy(desc(crmActivities.createdAt)).limit(pages.activities.pageSize).offset((pages.activities.page - 1) * pages.activities.pageSize),
    db.select({ total: count(crmActivities.id) }).from(crmActivities).where(eq(crmActivities.customerId, customerId)),
    db.select().from(crmTasks).where(eq(crmTasks.customerId, customerId)).orderBy(desc(crmTasks.dueAt), desc(crmTasks.createdAt)).limit(pages.tasks.pageSize).offset((pages.tasks.page - 1) * pages.tasks.pageSize),
    db.select({ total: count(crmTasks.id) }).from(crmTasks).where(eq(crmTasks.customerId, customerId)),
  ]);
  const [contacts, addresses, notes] = await Promise.all([
    db.select().from(customerContacts).where(eq(customerContacts.customerId, customerId)).orderBy(desc(customerContacts.isPrimary), asc(customerContacts.name)).limit(100),
    db.select().from(customerAddresses).where(eq(customerAddresses.customerId, customerId)).orderBy(desc(customerAddresses.isPrimary), asc(customerAddresses.label)).limit(100),
    db.select().from(customerNotes).where(eq(customerNotes.customerId, customerId)).orderBy(desc(customerNotes.createdAt)).limit(100),
  ]);
  const openOpportunityCount = await db.select({ total: count(opportunities.id) }).from(opportunities).where(and(eq(opportunities.customerId, customerId), notInArray(opportunities.stage, [...closedOpportunityStages])));
  const lastActivity = await db.select({ lastActivityAt: max(crmActivities.createdAt) }).from(crmActivities).where(eq(crmActivities.customerId, customerId));
  return {
    customer: { ...customerRow.customer, assignedSeller: customerRow.sellerId ? { id: customerRow.sellerId, name: customerRow.sellerName, email: customerRow.sellerEmail } : null },
    contacts,
    addresses,
    notes,
    summary: { quoteCount: numberValue(quoteTotal[0]?.total), opportunityCount: numberValue(opportunityTotal[0]?.total), openOpportunityCount: numberValue(openOpportunityCount[0]?.total), saleCount: numberValue(salesTotal[0]?.total), orderCount: numberValue(orderTotal[0]?.total), paymentCount: options.includeFinancial ? numberValue(paymentTotal[0]?.total) : null, lastActivityAt: lastActivity[0]?.lastActivityAt ?? customerRow.customer.lastActivityAt },
    quotes: relationResult(quoteRows.map((row) => ({ ...row.quote, linkId: row.linkId })), pages.quotes.page, pages.quotes.pageSize, numberValue(quoteTotal[0]?.total)),
    opportunities: relationResult(opportunityRows, pages.opportunities.page, pages.opportunities.pageSize, numberValue(opportunityTotal[0]?.total)),
    sales: options.includeFinancial ? relationResult(salesRows, pages.sales.page, pages.sales.pageSize, numberValue(salesTotal[0]?.total)) : null,
    orders: relationResult(orderRows, pages.orders.page, pages.orders.pageSize, numberValue(orderTotal[0]?.total)),
    payments: options.includeFinancial ? relationResult(paymentRows, pages.payments.page, pages.payments.pageSize, numberValue(paymentTotal[0]?.total)) : null,
    activities: relationResult(activityRows, pages.activities.page, pages.activities.pageSize, numberValue(activityTotal[0]?.total)),
    tasks: relationResult(taskRows, pages.tasks.page, pages.tasks.pageSize, numberValue(taskTotal[0]?.total)),
  };
}
