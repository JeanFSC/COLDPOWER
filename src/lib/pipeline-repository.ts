import {
  and,
  asc,
  count,
  desc,
  eq,
  exists,
  gte,
  ilike,
  inArray,
  isNotNull,
  isNull,
  lt,
  or,
  sql,
  sum,
  type SQL,
} from "drizzle-orm";
import { getDb } from "@/db";
import { categories, families, products, users } from "@/db/schema";
import {
  crmActivities,
  crmTasks,
  customers,
  opportunities,
  opportunityActivities,
  opportunityFollowups,
  opportunityItems,
  opportunityStageHistory,
} from "@/db/crm-schema";
import {
  activeCommercialStages,
  closedOpportunityStages,
  opportunityStageProbability,
  pipelineAgingThresholds,
  postSaleOpportunityStages,
  sellerRoleCodes,
} from "@/lib/opportunity-stage-config";
import {
  opportunityLaneDefinitions,
  pipelineOriginLabels,
  pipelineStageLabels,
  type CurrencyAmount,
  type PipelineCard,
  type PipelineFilters,
  type PipelineFollowUpItem,
  type PipelinePageResponse,
  type PipelineBoardResponse,
  type PipelineStageMetric,
} from "@/lib/pipeline-contract";
import { opportunityStages, type OpportunityStage } from "@/lib/crm-validation";

const defaultPageSize = 10;
const maxPageSize = 25;
const dayMs = 86_400_000;
type Db = ReturnType<typeof getDb>;

function pageValues(page?: number, pageSize?: number) {
  return {
    page: Math.max(1, Math.floor(page ?? 1)),
    pageSize: Math.min(maxPageSize, Math.max(1, Math.floor(pageSize ?? defaultPageSize))),
  };
}

function numberValue(value: unknown) {
  return Number(value ?? 0);
}

function dayStart(value: string) {
  return new Date(`${value}T00:00:00-05:00`);
}

function dayAfter(value: string) {
  return new Date(dayStart(value).getTime() + dayMs);
}

function ageInDays(lastContactAt: Date | null, now: Date) {
  if (!lastContactAt) return null;
  return Math.max(0, Math.floor((now.getTime() - lastContactAt.getTime()) / dayMs));
}

function groupCurrencyAmounts(
  rows: Array<{ currency: string | null; amount: unknown }>,
): CurrencyAmount[] {
  const amounts = new Map<string, number>();
  for (const row of rows) {
    if (!row.currency || row.amount == null) continue;
    amounts.set(row.currency, (amounts.get(row.currency) ?? 0) + numberValue(row.amount));
  }
  return [...amounts.entries()]
    .map(([currency, amount]) => ({ currency, amount: Number(amount.toFixed(2)) }))
    .sort((a, b) => a.currency.localeCompare(b.currency));
}

function stageFilter(filters: PipelineFilters, stages?: readonly OpportunityStage[]) {
  if (!stages?.length) return filters.stages;
  if (!filters.stages?.length) return [...stages];
  return filters.stages.filter((stage) => stages.includes(stage));
}

function pipelineWhere(filters: PipelineFilters, db: Db, stages?: readonly OpportunityStage[]) {
  const conditions: SQL[] = [];
  const selectedStages = stageFilter(filters, stages);
  if (filters.query) {
    const pattern = `%${filters.query.trim()}%`;
    conditions.push(
      or(
        ilike(opportunities.code, pattern),
        ilike(opportunities.title, pattern),
        ilike(customers.name, pattern),
        ilike(customers.email, pattern),
        ilike(customers.phone, pattern),
        exists(
          db
            .select({ id: opportunityItems.id })
            .from(opportunityItems)
            .innerJoin(products, eq(opportunityItems.productId, products.id))
            .where(
              and(
                eq(opportunityItems.opportunityId, opportunities.id),
                or(
                  ilike(opportunityItems.skuSnapshot, pattern),
                  ilike(opportunityItems.productNameSnapshot, pattern),
                  ilike(products.sku, pattern),
                  ilike(products.normalizedName, pattern),
                  ilike(products.commercialName, pattern),
                  exists(
                    db
                      .select({ id: categories.id })
                      .from(categories)
                      .where(
                        and(
                          or(
                            eq(products.categoryId, categories.id),
                            eq(products.editorialCategoryId, categories.id),
                          ),
                          ilike(categories.name, pattern),
                        ),
                      ),
                  ),
                  exists(
                    db
                      .select({ id: families.id })
                      .from(families)
                      .where(
                        and(
                          or(
                            eq(products.familyId, families.id),
                            eq(products.editorialFamilyId, families.id),
                          ),
                          ilike(families.name, pattern),
                        ),
                      ),
                  ),
                ),
              ),
            ),
        ),
      )!,
    );
  }
  if (selectedStages) {
    conditions.push(
      selectedStages.length ? inArray(opportunities.stage, selectedStages) : sql`false`,
    );
  }
  if (filters.assignedSellerId)
    conditions.push(eq(opportunities.assignedSellerId, filters.assignedSellerId));
  if (filters.unassigned !== undefined)
    conditions.push(filters.unassigned ? isNull(opportunities.assignedSellerId) : isNotNull(opportunities.assignedSellerId));
  if (filters.customerId) conditions.push(eq(opportunities.customerId, filters.customerId));
  if (filters.productId) {
    conditions.push(
      exists(
        db
          .select({ id: opportunityItems.id })
          .from(opportunityItems)
          .where(
            and(
              eq(opportunityItems.opportunityId, opportunities.id),
              eq(opportunityItems.productId, filters.productId),
            ),
          ),
      ),
    );
  }
  if (filters.origin) conditions.push(eq(opportunities.origin, filters.origin));
  if (filters.currency) conditions.push(eq(opportunities.currency, filters.currency));
  if (filters.createdFrom)
    conditions.push(gte(opportunities.createdAt, dayStart(filters.createdFrom)));
  if (filters.createdTo) conditions.push(lt(opportunities.createdAt, dayAfter(filters.createdTo)));
  if (filters.followUpFrom || filters.followUpTo) {
    const followupDueConditions: SQL[] = [
      eq(opportunityFollowups.opportunityId, opportunities.id),
      eq(opportunityFollowups.status, "PENDING"),
    ];
    if (filters.followUpFrom)
      followupDueConditions.push(gte(opportunityFollowups.dueAt, dayStart(filters.followUpFrom)));
    if (filters.followUpTo)
      followupDueConditions.push(lt(opportunityFollowups.dueAt, dayAfter(filters.followUpTo)));
    const taskDueConditions: SQL[] = [
      eq(crmTasks.opportunityId, opportunities.id),
      inArray(crmTasks.status, ["PENDING", "OVERDUE"]),
      isNotNull(crmTasks.dueAt),
    ];
    if (filters.followUpFrom)
      taskDueConditions.push(gte(crmTasks.dueAt, dayStart(filters.followUpFrom)));
    if (filters.followUpTo)
      taskDueConditions.push(lt(crmTasks.dueAt, dayAfter(filters.followUpTo)));
    conditions.push(
      or(
        exists(
          db
            .select({ id: opportunityFollowups.id })
            .from(opportunityFollowups)
            .where(and(...followupDueConditions)),
        ),
        exists(
          db
            .select({ id: crmTasks.id })
            .from(crmTasks)
            .where(and(...taskDueConditions)),
        ),
      )!,
    );
  }
  if (filters.overdue === true) {
    conditions.push(
      or(
        exists(
          db
            .select({ id: opportunityFollowups.id })
            .from(opportunityFollowups)
            .where(
              and(
                eq(opportunityFollowups.opportunityId, opportunities.id),
                eq(opportunityFollowups.status, "PENDING"),
                lt(opportunityFollowups.dueAt, new Date()),
              ),
            ),
        ),
        exists(
          db
            .select({ id: crmTasks.id })
            .from(crmTasks)
            .where(
              and(
                eq(crmTasks.opportunityId, opportunities.id),
                inArray(crmTasks.status, ["PENDING", "OVERDUE"]),
                isNotNull(crmTasks.dueAt),
                lt(crmTasks.dueAt, new Date()),
              ),
            ),
        ),
      )!,
    );
  }
  if (filters.withoutNextAction !== undefined) {
    conditions.push(
      filters.withoutNextAction
        ? isNull(opportunities.nextAction)
        : isNotNull(opportunities.nextAction),
    );
  }
  if (filters.withQuote !== undefined) {
    conditions.push(
      filters.withQuote ? isNotNull(opportunities.quoteId) : isNull(opportunities.quoteId),
    );
  }
  if (filters.withAmount !== undefined) {
    conditions.push(
      filters.withAmount ? isNotNull(opportunities.totalAmount) : isNull(opportunities.totalAmount),
    );
  }
  return conditions.length ? and(...conditions) : undefined;
}

function activeWhere(filters: PipelineFilters, db: Db) {
  return pipelineWhere(filters, db, activeCommercialStages);
}

function sellerScope() {
  return and(eq(users.status, "ACTIVE"), inArray(users.roleCode, sellerRoleCodes));
}

async function loadCards(db: Db, where: SQL | undefined, now: Date, limit: number, offset: number) {
  const rows = await db
    .select({
      opportunity: opportunities,
      customerName: customers.name,
      customerEmail: customers.email,
      customerPhone: customers.phone,
      sellerName: users.name,
    })
    .from(opportunities)
    .innerJoin(customers, eq(opportunities.customerId, customers.id))
    .leftJoin(users, eq(opportunities.assignedSellerId, users.id))
    .where(where)
    .orderBy(desc(opportunities.updatedAt), asc(opportunities.code))
    .limit(limit)
    .offset(offset);

  const ids = rows.map((row) => row.opportunity.id);
  if (!ids.length) return [] as PipelineCard[];
  const [itemRows, followupRows] = await Promise.all([
    db
      .select()
      .from(opportunityItems)
      .where(inArray(opportunityItems.opportunityId, ids))
      .orderBy(asc(opportunityItems.createdAt)),
    db
      .select()
      .from(opportunityFollowups)
      .where(
        and(
          inArray(opportunityFollowups.opportunityId, ids),
          eq(opportunityFollowups.status, "PENDING"),
        ),
      )
      .orderBy(asc(opportunityFollowups.dueAt)),
  ]);
  const itemMap = new Map<string, typeof itemRows>();
  for (const item of itemRows)
    itemMap.set(item.opportunityId, [...(itemMap.get(item.opportunityId) ?? []), item]);
  const followupMap = new Map<string, (typeof followupRows)[number]>();
  for (const followup of followupRows)
    if (!followupMap.has(followup.opportunityId)) followupMap.set(followup.opportunityId, followup);

  return rows.map((row) => {
    const followup = followupMap.get(row.opportunity.id);
    const followUpAt = followup?.dueAt ?? null;
    return {
      ...row.opportunity,
      customerName: row.customerName,
      customerEmail: row.customerEmail,
      customerPhone: row.customerPhone,
      assignedSellerName: row.sellerName,
      followUpAt,
      agingDays: ageInDays(row.opportunity.lastContactAt, now),
      overdue: Boolean(followup && followup.dueAt < now),
      items: (itemMap.get(row.opportunity.id) ?? []).map((item) => ({
        id: item.id,
        productNameSnapshot: item.productNameSnapshot,
        skuSnapshot: item.skuSnapshot,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal,
      })),
    } satisfies PipelineCard;
  });
}

async function stageMetricRows(db: Db, where: SQL | undefined) {
  return db
    .select({
      stage: opportunities.stage,
      currency: opportunities.currency,
      total: count(opportunities.id),
      amount: sum(opportunities.totalAmount),
    })
    .from(opportunities)
    .innerJoin(customers, eq(opportunities.customerId, customers.id))
    .where(where)
    .groupBy(opportunities.stage, opportunities.currency);
}

function buildStageMetrics(
  rows: Array<{
    stage: OpportunityStage;
    currency: string | null;
    total: unknown;
    amount: unknown;
  }>,
): PipelineStageMetric[] {
  return opportunityStages.map((stage) => {
    const stageRows = rows.filter((row) => row.stage === stage);
    const amountByCurrency = groupCurrencyAmounts(stageRows);
    const totalAmount = amountByCurrency.reduce((total, row) => total + row.amount, 0);
    return {
      stage,
      count: stageRows.reduce((total, row) => total + numberValue(row.total), 0),
      amountByCurrency,
      totalAmount: Number(totalAmount.toFixed(2)),
      weightedAmount: opportunityStageProbability.configured
        ? totalAmount * opportunityStageProbability.values[stage]
        : 0,
    };
  });
}

function closeRate(metrics: PipelineStageMetric[]) {
  const won = metrics.find((row) => row.stage === "CLOSED")?.count ?? 0;
  const lost = metrics
    .filter((row) => row.stage === "LOST" || row.stage === "CANCELLED")
    .reduce((total, row) => total + row.count, 0);
  const denominator = won + lost;
  return denominator ? Number(((won / denominator) * 100).toFixed(2)) : null;
}

async function countAlerts(db: Db, filters: PipelineFilters) {
  const where = activeWhere(filters, db);
  const now = new Date();
  const staleAt = new Date(now.getTime() - pipelineAgingThresholds.staleAfterDays * dayMs);
  const [overdue, taskOverdue, withoutNextAction, unassigned, stale] = await Promise.all([
    db
      .select({ total: count(opportunityFollowups.id) })
      .from(opportunityFollowups)
      .innerJoin(opportunities, eq(opportunityFollowups.opportunityId, opportunities.id))
      .innerJoin(customers, eq(opportunities.customerId, customers.id))
      .where(
        and(where, eq(opportunityFollowups.status, "PENDING"), lt(opportunityFollowups.dueAt, now)),
      ),
    db
      .select({ total: count(crmTasks.id) })
      .from(crmTasks)
      .innerJoin(opportunities, eq(crmTasks.opportunityId, opportunities.id))
      .innerJoin(customers, eq(opportunities.customerId, customers.id))
      .where(and(where, inArray(crmTasks.status, ["PENDING", "OVERDUE"]), isNotNull(crmTasks.dueAt), lt(crmTasks.dueAt, now))),
    db
      .select({ total: count(opportunities.id) })
      .from(opportunities)
      .innerJoin(customers, eq(opportunities.customerId, customers.id))
      .where(and(where, isNull(opportunities.nextAction))),
    db
      .select({ total: count(opportunities.id) })
      .from(opportunities)
      .innerJoin(customers, eq(opportunities.customerId, customers.id))
      .where(and(where, isNull(opportunities.assignedSellerId))),
    db
      .select({ total: count(opportunities.id) })
      .from(opportunities)
      .innerJoin(customers, eq(opportunities.customerId, customers.id))
      .where(
        and(
          where,
          or(
            lt(opportunities.lastContactAt, staleAt),
            and(isNull(opportunities.lastContactAt), lt(opportunities.createdAt, staleAt)),
          ),
        ),
      ),
  ]);
  return {
    overdue: numberValue(overdue[0]?.total) + numberValue(taskOverdue[0]?.total),
    withoutNextAction: numberValue(withoutNextAction[0]?.total),
    unassigned: numberValue(unassigned[0]?.total),
    stale: numberValue(stale[0]?.total),
  };
}

async function loadFollowUps(db: Db, filters: PipelineFilters, now: Date) {
  const where = activeWhere(filters, db);
  const [followUpRows, taskRows] = await Promise.all([
    db
      .select({ followup: opportunityFollowups, opportunityCode: opportunities.code, customerName: customers.name, assignedToName: users.name })
      .from(opportunityFollowups)
      .innerJoin(opportunities, eq(opportunityFollowups.opportunityId, opportunities.id))
      .innerJoin(customers, eq(opportunities.customerId, customers.id))
      .leftJoin(users, eq(opportunityFollowups.assignedTo, users.id))
      .where(and(where, eq(opportunityFollowups.status, "PENDING")))
      .orderBy(asc(opportunityFollowups.dueAt), asc(opportunities.code))
      .limit(80),
    db
      .select({ task: crmTasks, opportunityCode: opportunities.code, customerName: customers.name, assignedToName: users.name })
      .from(crmTasks)
      .innerJoin(opportunities, eq(crmTasks.opportunityId, opportunities.id))
      .innerJoin(customers, eq(opportunities.customerId, customers.id))
      .leftJoin(users, eq(crmTasks.assignedTo, users.id))
      .where(and(where, inArray(crmTasks.status, ["PENDING", "OVERDUE"]), isNotNull(crmTasks.dueAt)))
      .orderBy(asc(crmTasks.dueAt), asc(opportunities.code))
      .limit(80),
  ]);
  return [
    ...followUpRows.map((row) => ({ id: row.followup.id, opportunityId: row.followup.opportunityId, opportunityCode: row.opportunityCode, customerName: row.customerName, title: row.followup.title, dueAt: row.followup.dueAt, status: row.followup.status, assignedTo: row.followup.assignedTo, assignedToName: row.assignedToName, overdue: row.followup.dueAt < now } satisfies PipelineFollowUpItem)),
    ...taskRows.map((row) => ({ id: row.task.id, opportunityId: row.task.opportunityId!, opportunityCode: row.opportunityCode, customerName: row.customerName, title: row.task.title, dueAt: row.task.dueAt!, status: row.task.status, assignedTo: row.task.assignedTo, assignedToName: row.assignedToName, overdue: row.task.dueAt! < now } satisfies PipelineFollowUpItem)),
  ].sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime()).slice(0, 80);
}

export async function getPipelineBoard(
  filters: PipelineFilters = {},
  scope: { canManage?: boolean; canExport?: boolean } = {},
): Promise<PipelineBoardResponse> {
  const db = getDb();
  const now = new Date();
  const { pageSize } = pageValues(filters.page, filters.pageSize);
  const baseWhere = pipelineWhere(filters, db);
  const metricsWhere = activeWhere(filters, db);
  const stageRowsPromise = stageMetricRows(db, baseWhere);
  const currencyRowsPromise = db
    .select({ currency: opportunities.currency, amount: sum(opportunities.totalAmount) })
    .from(opportunities)
    .innerJoin(customers, eq(opportunities.customerId, customers.id))
    .where(metricsWhere)
    .groupBy(opportunities.currency);
  const recentActivityRowsPromise = db
    .select({
      id: crmActivities.id,
      type: crmActivities.type,
      subject: crmActivities.subject,
      createdAt: crmActivities.createdAt,
      performedBy: crmActivities.performedBy,
      actorName: users.name,
      opportunityId: opportunities.id,
      opportunityCode: opportunities.code,
      customerName: customers.name,
    })
    .from(crmActivities)
    .innerJoin(opportunities, eq(crmActivities.opportunityId, opportunities.id))
    .innerJoin(customers, eq(opportunities.customerId, customers.id))
    .leftJoin(users, eq(crmActivities.performedBy, users.id))
    .where(baseWhere)
    .orderBy(desc(crmActivities.createdAt))
    .limit(6);
  const [
    stageRows,
    currencyRows,
    alerts,
    followUps,
    recentActivityRows,
    sellerFacets,
    originFacets,
    currencyFacets,
  ] = await Promise.all([
      stageRowsPromise,
      currencyRowsPromise,
      countAlerts(db, filters),
      loadFollowUps(db, filters, now),
      recentActivityRowsPromise,
      db
        .selectDistinct({ id: users.id, name: users.name, email: users.email })
        .from(users)
        .where(sellerScope())
        .orderBy(asc(users.name), asc(users.email)),
      db
        .selectDistinct({ origin: opportunities.origin })
        .from(opportunities)
        .innerJoin(customers, eq(opportunities.customerId, customers.id))
        .where(baseWhere)
        .orderBy(asc(opportunities.origin)),
      db
        .selectDistinct({ currency: opportunities.currency })
        .from(opportunities)
        .innerJoin(customers, eq(opportunities.customerId, customers.id))
        .where(baseWhere)
        .orderBy(asc(opportunities.currency)),
    ]);
  const stageMetrics = buildStageMetrics(stageRows);
  const recentActivity = recentActivityRows.map((row) => ({
    id: row.id,
    type: row.type,
    subject: row.subject,
    createdAt: row.createdAt,
    actorName: row.performedBy ? (row.actorName ?? "Usuario del equipo") : "Sistema",
    opportunityId: row.opportunityId,
    opportunityCode: row.opportunityCode,
    customerName: row.customerName,
  }));
  const lanesPromise = Promise.all(
    opportunityLaneDefinitions.map(async (definition) => {
      const stages = [...definition.stages] as OpportunityStage[];
      const where = pipelineWhere(filters, db, stages);
      const lanePage = filters.lane === definition.key ? Math.max(1, filters.lanePage ?? 1) : 1;
      const [totalRows, amountRows, cards] = await Promise.all([
        db
          .select({ total: count(opportunities.id) })
          .from(opportunities)
          .innerJoin(customers, eq(opportunities.customerId, customers.id))
          .where(where),
        db
          .select({ currency: opportunities.currency, amount: sum(opportunities.totalAmount) })
          .from(opportunities)
          .innerJoin(customers, eq(opportunities.customerId, customers.id))
          .where(where)
          .groupBy(opportunities.currency),
        loadCards(db, where, now, pageSize, (lanePage - 1) * pageSize),
      ]);
      const total = numberValue(totalRows[0]?.total);
      return {
        key: definition.key,
        label: definition.label,
        stages,
        total,
        amountByCurrency: groupCurrencyAmounts(amountRows),
        cards,
        page: lanePage,
        pageSize,
        hasMore: lanePage * pageSize < total,
      };
    }),
  );
  const closedFilters = { ...filters, stages: undefined, lane: undefined, lanePage: undefined };
  const closedWhere = pipelineWhere(closedFilters, db, [...closedOpportunityStages, "NO_RESPONSE"]);
  const closedPromise = loadCards(db, closedWhere, now, 50, 0);
  const [lanes, closed] = await Promise.all([lanesPromise, closedPromise]);
  const activeMetrics = stageMetrics.filter((row) =>
    (activeCommercialStages as readonly string[]).includes(row.stage),
  );
  const weightedByCurrency = opportunityStageProbability.configured
    ? activeMetrics
        .flatMap((row) =>
          row.amountByCurrency.map((amount) => ({
            currency: amount.currency,
            amount: Number(
              (amount.amount * opportunityStageProbability.values[row.stage]).toFixed(2),
            ),
          })),
        )
        .reduce<CurrencyAmount[]>((result, row) => {
          const current = result.find((item) => item.currency === row.currency);
          if (current) current.amount = Number((current.amount + row.amount).toFixed(2));
          else result.push(row);
          return result;
        }, [])
    : [];
  return {
    scope: {
      timezone: "America/Lima",
      canManage: Boolean(scope.canManage),
      canExport: Boolean(scope.canExport),
    },
    metrics: {
      activeOpportunities: activeMetrics.reduce((total, row) => total + row.count, 0),
      amountByCurrency: groupCurrencyAmounts(currencyRows),
      weightedByCurrency,
      weightedConfigured: opportunityStageProbability.configured,
      closeRate: closeRate(stageMetrics),
      overdueFollowUps: alerts.overdue,
      withoutNextAction: alerts.withoutNextAction,
      unassigned: alerts.unassigned,
      stale: alerts.stale,
    },
    lanes,
    followUps,
    recentActivity,
    closed,
    facets: {
      stages: stageMetrics.filter((row) => row.count > 0).map((row) => row.stage),
      origins: originFacets.map((row) => row.origin),
      currencies: currencyFacets
        .map((row) => row.currency)
        .filter((value): value is "PEN" | "USD" => value === "PEN" || value === "USD"),
      sellers: sellerFacets,
    },
  };
}

export async function getPipelinePage(
  filters: PipelineFilters = {},
): Promise<PipelinePageResponse> {
  const db = getDb();
  const now = new Date();
  const { page, pageSize } = pageValues(filters.page, filters.pageSize);
  const where = pipelineWhere(filters, db);
  const [totalRows, stageRows, rows, sellerFacets, originFacets, overdueRows, taskOverdueRows] = await Promise.all([
    db
      .select({ total: count(opportunities.id) })
      .from(opportunities)
      .innerJoin(customers, eq(opportunities.customerId, customers.id))
      .where(where),
    stageMetricRows(db, where),
    loadCards(db, where, now, pageSize, (page - 1) * pageSize),
    db
      .selectDistinct({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .where(sellerScope())
      .orderBy(asc(users.name), asc(users.email)),
    db
      .selectDistinct({ origin: opportunities.origin })
      .from(opportunities)
      .innerJoin(customers, eq(opportunities.customerId, customers.id))
      .where(where)
      .orderBy(asc(opportunities.origin)),
    db
      .select({ total: count(opportunityFollowups.id) })
      .from(opportunityFollowups)
      .innerJoin(opportunities, eq(opportunityFollowups.opportunityId, opportunities.id))
      .innerJoin(customers, eq(opportunities.customerId, customers.id))
      .where(and(activeWhere(filters, db), eq(opportunityFollowups.status, "PENDING"), lt(opportunityFollowups.dueAt, now))),
    db
      .select({ total: count(crmTasks.id) })
      .from(crmTasks)
      .innerJoin(opportunities, eq(crmTasks.opportunityId, opportunities.id))
      .innerJoin(customers, eq(opportunities.customerId, customers.id))
      .where(and(activeWhere(filters, db), inArray(crmTasks.status, ["PENDING", "OVERDUE"]), isNotNull(crmTasks.dueAt), lt(crmTasks.dueAt, now))),
  ]);
  const totalItems = numberValue(totalRows[0]?.total);
  const metrics = buildStageMetrics(stageRows);
  const open = metrics
    .filter((row) => (activeCommercialStages as readonly string[]).includes(row.stage))
    .reduce((total, row) => total + row.count, 0);
  const activeAmounts = metrics
    .filter((row) => (activeCommercialStages as readonly string[]).includes(row.stage))
    .flatMap((row) => row.amountByCurrency);
  const totalAmount = activeAmounts.reduce((total, row) => total + row.amount, 0);
  const weightedAmount = opportunityStageProbability.configured
    ? metrics.reduce((total, row) => total + row.weightedAmount, 0)
    : 0;
  return {
    items: rows,
    page: Math.min(page, Math.max(1, Math.ceil(totalItems / pageSize))),
    pageSize,
    totalItems,
    totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
    metrics: {
      total: totalItems,
      open,
      overdueFollowUps: numberValue(overdueRows[0]?.total) + numberValue(taskOverdueRows[0]?.total),
      totalAmount: Number(totalAmount.toFixed(2)),
      weightedAmount: Number(weightedAmount.toFixed(2)),
      conversionRate: closeRate(metrics),
      byStage: metrics,
    },
    facets: {
      stages: metrics.filter((row) => row.count > 0).map((row) => row.stage),
      origins: originFacets.map((row) => row.origin),
      sellers: sellerFacets,
    },
  };
}

export async function getPipelineDetail(opportunityId: string) {
  const db = getDb();
  const [row] = await db
    .select({
      opportunity: opportunities,
      customerName: customers.name,
      customerEmail: customers.email,
      customerPhone: customers.phone,
      sellerName: users.name,
    })
    .from(opportunities)
    .innerJoin(customers, eq(opportunities.customerId, customers.id))
    .leftJoin(users, eq(opportunities.assignedSellerId, users.id))
    .where(eq(opportunities.id, opportunityId))
    .limit(1);
  if (!row) return null;
  const [items, stageHistory, activities, legacyActivities, followUps, tasks] = await Promise.all([
    db
      .select()
      .from(opportunityItems)
      .where(eq(opportunityItems.opportunityId, opportunityId))
      .orderBy(asc(opportunityItems.createdAt)),
    db
      .select()
      .from(opportunityStageHistory)
      .where(eq(opportunityStageHistory.opportunityId, opportunityId))
      .orderBy(asc(opportunityStageHistory.createdAt)),
    db
      .select()
      .from(crmActivities)
      .where(eq(crmActivities.opportunityId, opportunityId))
      .orderBy(desc(crmActivities.createdAt)),
    db
      .select()
      .from(opportunityActivities)
      .where(eq(opportunityActivities.opportunityId, opportunityId))
      .orderBy(desc(opportunityActivities.createdAt)),
    db
      .select()
      .from(opportunityFollowups)
      .where(eq(opportunityFollowups.opportunityId, opportunityId))
      .orderBy(desc(opportunityFollowups.dueAt)),
    db
      .select()
      .from(crmTasks)
      .where(eq(crmTasks.opportunityId, opportunityId))
      .orderBy(desc(crmTasks.dueAt), desc(crmTasks.createdAt)),
  ]);
  const actorIds = [
    ...new Set(
      [
        ...stageHistory.map((item) => item.changedBy),
        ...activities.map((item) => item.performedBy),
        ...legacyActivities.map((item) => item.performedBy),
        ...followUps.map((item) => item.createdBy),
        ...tasks.map((item) => item.createdBy),
        ...tasks.map((item) => item.assignedTo),
        ...followUps.map((item) => item.assignedTo),
      ].filter((value): value is string => Boolean(value)),
    ),
  ];
  const actorRows = actorIds.length
    ? await db
        .select({ id: users.id, name: users.name, email: users.email })
        .from(users)
        .where(inArray(users.id, actorIds))
    : [];
  const actorNames = new Map(actorRows.map((actor) => [actor.id, actor.name ?? actor.email]));
  return {
    opportunity: {
      ...row.opportunity,
      customerName: row.customerName,
      customerEmail: row.customerEmail,
      customerPhone: row.customerPhone,
      assignedSellerName: row.sellerName,
      agingDays: ageInDays(row.opportunity.lastContactAt, new Date()),
    },
    items,
    stageHistory: stageHistory.map((item) => ({
      ...item,
      actorName: actorNames.get(item.changedBy) ?? "Usuario del equipo",
    })),
    activities: activities.map((item) => ({
      ...item,
      actorName: item.performedBy
        ? (actorNames.get(item.performedBy) ?? "Usuario del equipo")
        : "Sistema",
    })),
    legacyActivities: legacyActivities.map((item) => ({
      ...item,
      actorName: item.performedBy
        ? (actorNames.get(item.performedBy) ?? "Usuario del equipo")
        : "Sistema",
    })),
    followUps: followUps.map((item) => ({
      ...item,
      createdByName: item.createdBy
        ? (actorNames.get(item.createdBy) ?? "Usuario del equipo")
        : "Sistema",
      assignedToName: item.assignedTo
        ? (actorNames.get(item.assignedTo) ?? "Usuario del equipo")
        : null,
    })),
    tasks: tasks.map((item) => ({
      ...item,
      createdByName: item.createdBy
        ? (actorNames.get(item.createdBy) ?? "Usuario del equipo")
        : "Sistema",
      assignedToName: item.assignedTo
        ? (actorNames.get(item.assignedTo) ?? "Usuario del equipo")
        : null,
    })),
  };
}

export const pipelineLabels = {
  stages: pipelineStageLabels,
  origins: pipelineOriginLabels,
  postSaleStages: postSaleOpportunityStages,
};
