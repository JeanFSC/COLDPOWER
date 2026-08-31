import { asc, count, desc, eq, ilike, inArray, or } from "drizzle-orm";
import { getDb } from "@/db";
import { crmActivities, crmTasks, customers, opportunities, opportunityItems } from "@/db/crm-schema";

function pageOptions(page = 1, pageSize = 25) { return { page: Math.max(1, Math.floor(page)), pageSize: Math.min(100, Math.max(1, Math.floor(pageSize))) }; }

export async function listCustomers(query?: string) {
  const pattern = query?.trim() ? `%${query.trim()}%` : null;
  const where = pattern ? or(ilike(customers.name, pattern), ilike(customers.email, pattern), ilike(customers.phone, pattern), ilike(customers.ruc, pattern)) : undefined;
  return getDb().select().from(customers).where(where).orderBy(desc(customers.updatedAt)).limit(500);
}

export async function listCustomersPage(query: string | undefined, requestedPage = 1, requestedPageSize = 25) {
  const { page, pageSize } = pageOptions(requestedPage, requestedPageSize);
  const pattern = query?.trim() ? `%${query.trim()}%` : null;
  const where = pattern ? or(ilike(customers.name, pattern), ilike(customers.email, pattern), ilike(customers.phone, pattern), ilike(customers.ruc, pattern)) : undefined;
  const [rows, [{ total }]] = await Promise.all([
    getDb().select().from(customers).where(where).orderBy(desc(customers.updatedAt)).limit(pageSize).offset((page - 1) * pageSize),
    getDb().select({ total: count() }).from(customers).where(where),
  ]);
  const totalItems = Number(total ?? 0);
  return { rows, page: Math.min(page, Math.max(1, Math.ceil(totalItems / pageSize))), pageSize, totalItems, totalPages: Math.max(1, Math.ceil(totalItems / pageSize)) };
}

export async function listOpportunities() {
  const rows = await getDb().select({ opportunity: opportunities, customerName: customers.name, customerPhone: customers.phone }).from(opportunities).innerJoin(customers, eq(opportunities.customerId, customers.id)).orderBy(desc(opportunities.updatedAt)).limit(500);
  const items = await getDb().select().from(opportunityItems).orderBy(asc(opportunityItems.createdAt)).limit(5000);
  const byOpportunity = new Map<string, typeof items>();
  for (const item of items) byOpportunity.set(item.opportunityId, [...(byOpportunity.get(item.opportunityId) ?? []), item]);
  return rows.map((row) => ({ ...row.opportunity, customerName: row.customerName, customerPhone: row.customerPhone, items: byOpportunity.get(row.opportunity.id) ?? [] }));
}

export async function listOpportunitiesPage(requestedPage = 1, requestedPageSize = 25) {
  const { page, pageSize } = pageOptions(requestedPage, requestedPageSize);
  const base = getDb().select({ opportunity: opportunities, customerName: customers.name, customerPhone: customers.phone }).from(opportunities).innerJoin(customers, eq(opportunities.customerId, customers.id));
  const [rows, [{ total }]] = await Promise.all([
    base.orderBy(desc(opportunities.updatedAt)).limit(pageSize).offset((page - 1) * pageSize),
    getDb().select({ total: count() }).from(opportunities),
  ]);
  const ids = rows.map((row) => row.opportunity.id);
  const items = ids.length ? await getDb().select().from(opportunityItems).where(inArray(opportunityItems.opportunityId, ids)).orderBy(asc(opportunityItems.createdAt)) : [];
  const byOpportunity = new Map<string, typeof items>();
  for (const item of items) byOpportunity.set(item.opportunityId, [...(byOpportunity.get(item.opportunityId) ?? []), item]);
  const totalItems = Number(total ?? 0);
  return { rows: rows.map((row) => ({ ...row.opportunity, customerName: row.customerName, customerPhone: row.customerPhone, items: byOpportunity.get(row.opportunity.id) ?? [] })), page: Math.min(page, Math.max(1, Math.ceil(totalItems / pageSize))), pageSize, totalItems, totalPages: Math.max(1, Math.ceil(totalItems / pageSize)) };
}

export async function getCrmSnapshot() {
  const [customerRows, opportunityRows, taskRows, activityRows] = await Promise.all([
    listCustomers(),
    listOpportunities(),
    getDb().select().from(crmTasks).orderBy(desc(crmTasks.dueAt), desc(crmTasks.createdAt)).limit(500),
    getDb().select().from(crmActivities).orderBy(desc(crmActivities.createdAt)).limit(500),
  ]);
  const now = Date.now();
  return {
    customers: customerRows,
    opportunities: opportunityRows,
    tasks: taskRows.map((task) => ({ ...task, computedStatus: task.status === "PENDING" && task.dueAt && task.dueAt.getTime() < now ? "OVERDUE" : task.status })),
    activities: activityRows,
    metrics: {
      customers: customerRows.length,
      opportunities: opportunityRows.length,
      openOpportunities: opportunityRows.filter((opportunity) => !["CLOSED", "LOST", "CANCELLED"].includes(opportunity.stage)).length,
      overdueTasks: taskRows.filter((task) => task.status === "PENDING" && task.dueAt && task.dueAt.getTime() < now).length,
      pipelineValue: opportunityRows.reduce((sum, opportunity) => sum + Number(opportunity.totalAmount ?? 0), 0),
    },
  };
}

export async function findCustomerByContact(email?: string | null, phone?: string | null) {
  const conditions = [email?.trim() ? eq(customers.email, email.trim().toLowerCase()) : undefined, phone?.trim() ? eq(customers.phone, phone.trim()) : undefined].filter(Boolean);
  if (!conditions.length) return undefined;
  const [customer] = await getDb().select().from(customers).where(or(...(conditions as [typeof conditions[number], ...typeof conditions]))).limit(1);
  return customer;
}

export async function getOpportunityById(id: string) {
  const [row] = await getDb().select({ opportunity: opportunities, customerName: customers.name, customerPhone: customers.phone }).from(opportunities).innerJoin(customers, eq(opportunities.customerId, customers.id)).where(eq(opportunities.id, id)).limit(1);
  return row ? { ...row.opportunity, customerName: row.customerName, customerPhone: row.customerPhone } : undefined;
}
