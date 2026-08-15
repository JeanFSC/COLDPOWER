import { and, asc, count, desc, eq, gte, ilike, inArray, lt, max, notInArray, or, sum, type SQL } from "drizzle-orm";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { crmActivities, crmTasks, customers, opportunities, opportunityActivities, opportunityFollowups, opportunityItems, opportunityStageHistory } from "@/db/crm-schema";
import { opportunityStages, type OpportunityStage } from "@/lib/crm-validation";
import type { PipelineFilters, PipelineListItem, PipelinePageResponse, PipelineStageMetric } from "@/lib/pipeline-contract";

const defaultPageSize = 25;
const maxPageSize = 100;
const closedStages = ["CLOSED", "LOST", "CANCELLED"] as const;
const winStages = ["CLOSED"] as const;
const lossStages = ["LOST", "CANCELLED"] as const;
const stageProbability: Record<OpportunityStage, number> = { NEW: 0.05, CONTACTED: 0.1, QUOTING: 0.25, QUOTE_SENT: 0.35, FOLLOW_UP: 0.4, NEGOTIATION: 0.55, ACCEPTED: 0.7, SALE: 0.85, PAYMENT_PENDING: 0.9, PAID: 0.95, PREPARING: 0.98, DELIVERED: 1, CLOSED: 1, LOST: 0, CANCELLED: 0, NO_RESPONSE: 0 };

function pageValues(page?: number, pageSize?: number) { return { page: Math.max(1, Math.floor(page ?? 1)), pageSize: Math.min(maxPageSize, Math.max(1, Math.floor(pageSize ?? defaultPageSize))) }; }
function numberValue(value: unknown) { return Number(value ?? 0); }
function dayStart(value: string) { return new Date(`${value}T00:00:00-05:00`); }
function dayAfter(value: string) { return new Date(dayStart(value).getTime() + 86_400_000); }

function pipelineWhere(filters: PipelineFilters) {
  const conditions: SQL[] = [];
  if (filters.query) {
    const pattern = `%${filters.query.trim()}%`;
    conditions.push(or(ilike(opportunities.code, pattern), ilike(opportunities.title, pattern), ilike(customers.name, pattern), ilike(customers.email, pattern), ilike(customers.phone, pattern))!);
  }
  if (filters.stages?.length) conditions.push(inArray(opportunities.stage, filters.stages));
  if (filters.assignedSellerId) conditions.push(eq(opportunities.assignedSellerId, filters.assignedSellerId));
  if (filters.origin) conditions.push(eq(opportunities.origin, filters.origin));
  if (filters.createdFrom) conditions.push(gte(opportunities.createdAt, dayStart(filters.createdFrom)));
  if (filters.createdTo) conditions.push(lt(opportunities.createdAt, dayAfter(filters.createdTo)));
  if (filters.followUpFrom) conditions.push(gte(opportunities.followUpAt, dayStart(filters.followUpFrom)));
  if (filters.followUpTo) conditions.push(lt(opportunities.followUpAt, dayAfter(filters.followUpTo)));
  return conditions.length ? and(...conditions) : undefined;
}

function metricRowsToStages(rows: Array<{ stage: OpportunityStage; total: unknown; amount: unknown }>): PipelineStageMetric[] {
  const byStage = new Map(rows.map((row) => [row.stage, { count: numberValue(row.total), totalAmount: numberValue(row.amount) }]));
  return opportunityStages.map((stage) => { const value = byStage.get(stage) ?? { count: 0, totalAmount: 0 }; return { stage, count: value.count, totalAmount: value.totalAmount, weightedAmount: value.totalAmount * stageProbability[stage] }; });
}

export async function getPipelinePage(filters: PipelineFilters = {}): Promise<PipelinePageResponse> {
  const { page, pageSize } = pageValues(filters.page, filters.pageSize);
  const where = pipelineWhere(filters);
  const db = getDb();
  const [rows, totalRows, stageRows, overdueRows, stageFacets, originFacets, sellerFacets] = await Promise.all([
    db.select({ opportunity: opportunities, customerName: customers.name, customerPhone: customers.phone }).from(opportunities).innerJoin(customers, eq(opportunities.customerId, customers.id)).where(where).orderBy(desc(opportunities.updatedAt), asc(opportunities.code)).limit(pageSize).offset((page - 1) * pageSize),
    db.select({ total: count(opportunities.id) }).from(opportunities).innerJoin(customers, eq(opportunities.customerId, customers.id)).where(where),
    db.select({ stage: opportunities.stage, total: count(opportunities.id), amount: sum(opportunities.totalAmount) }).from(opportunities).innerJoin(customers, eq(opportunities.customerId, customers.id)).where(where).groupBy(opportunities.stage),
    db.select({ total: count(opportunities.id) }).from(opportunities).innerJoin(customers, eq(opportunities.customerId, customers.id)).where(and(where, lt(opportunities.followUpAt, new Date()), notInArray(opportunities.stage, [...closedStages]))),
    db.selectDistinct({ stage: opportunities.stage }).from(opportunities).innerJoin(customers, eq(opportunities.customerId, customers.id)).where(where).orderBy(opportunities.stage),
    db.selectDistinct({ origin: opportunities.origin }).from(opportunities).innerJoin(customers, eq(opportunities.customerId, customers.id)).where(where).orderBy(opportunities.origin),
    db.selectDistinct({ id: users.id, name: users.name, email: users.email }).from(opportunities).innerJoin(customers, eq(opportunities.customerId, customers.id)).innerJoin(users, eq(opportunities.assignedSellerId, users.id)).where(where).orderBy(asc(users.name), asc(users.email)),
  ]);
  const ids = rows.map((row) => row.opportunity.id);
  const itemRows = ids.length ? await db.select().from(opportunityItems).where(inArray(opportunityItems.opportunityId, ids)).orderBy(asc(opportunityItems.createdAt)) : [];
  const itemMap = new Map<string, typeof itemRows>();
  for (const item of itemRows) itemMap.set(item.opportunityId, [...(itemMap.get(item.opportunityId) ?? []), item]);
  const items: PipelineListItem[] = rows.map((row) => ({ ...row.opportunity, customerName: row.customerName, customerPhone: row.customerPhone, items: (itemMap.get(row.opportunity.id) ?? []).map((item) => ({ id: item.id, productNameSnapshot: item.productNameSnapshot, quantity: item.quantity, unitPrice: item.unitPrice, lineTotal: item.lineTotal })) }));
  const stageMetrics = metricRowsToStages(stageRows);
  const totalItems = numberValue(totalRows[0]?.total);
  const totalAmount = stageMetrics.reduce((sumValue, row) => sumValue + row.totalAmount, 0);
  const weightedAmount = stageMetrics.reduce((sumValue, row) => sumValue + row.weightedAmount, 0);
  const won = stageMetrics.filter((row) => winStages.includes(row.stage as (typeof winStages)[number])).reduce((sumValue, row) => sumValue + row.count, 0);
  const lost = stageMetrics.filter((row) => lossStages.includes(row.stage as (typeof lossStages)[number])).reduce((sumValue, row) => sumValue + row.count, 0);
  const denominator = won + lost;
  return { items, page: Math.min(page, Math.max(1, Math.ceil(totalItems / pageSize))), pageSize, totalItems, totalPages: Math.max(1, Math.ceil(totalItems / pageSize)), metrics: { total: totalItems, open: stageMetrics.filter((row) => !(closedStages as readonly string[]).includes(row.stage)).reduce((sumValue, row) => sumValue + row.count, 0), overdueFollowUps: numberValue(overdueRows[0]?.total), totalAmount, weightedAmount, conversionRate: denominator ? Number(((won / denominator) * 100).toFixed(2)) : null, byStage: stageMetrics }, facets: { stages: stageFacets.map((row) => row.stage), origins: originFacets.map((row) => row.origin), sellers: sellerFacets } };
}

export async function getPipelineDetail(opportunityId: string) {
  const db = getDb();
  const [row] = await db.select({ opportunity: opportunities, customerName: customers.name, customerPhone: customers.phone }).from(opportunities).innerJoin(customers, eq(opportunities.customerId, customers.id)).where(eq(opportunities.id, opportunityId)).limit(1);
  if (!row) return null;
  const [items, stageHistory, activities, legacyActivities, followUps, tasks] = await Promise.all([
    db.select().from(opportunityItems).where(eq(opportunityItems.opportunityId, opportunityId)).orderBy(asc(opportunityItems.createdAt)),
    db.select().from(opportunityStageHistory).where(eq(opportunityStageHistory.opportunityId, opportunityId)).orderBy(asc(opportunityStageHistory.createdAt)),
    db.select().from(crmActivities).where(eq(crmActivities.opportunityId, opportunityId)).orderBy(desc(crmActivities.createdAt)),
    db.select().from(opportunityActivities).where(eq(opportunityActivities.opportunityId, opportunityId)).orderBy(desc(opportunityActivities.createdAt)),
    db.select().from(opportunityFollowups).where(eq(opportunityFollowups.opportunityId, opportunityId)).orderBy(desc(opportunityFollowups.dueAt)),
    db.select().from(crmTasks).where(eq(crmTasks.opportunityId, opportunityId)).orderBy(desc(crmTasks.dueAt), desc(crmTasks.createdAt)),
  ]);
  return { opportunity: { ...row.opportunity, customerName: row.customerName, customerPhone: row.customerPhone }, items, stageHistory, activities, legacyActivities, followUps, tasks };
}
