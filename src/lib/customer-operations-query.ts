import { and, asc, desc, eq, isNotNull, notInArray, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { auditLogs, users } from "@/db/schema";
import { crmActivities, crmTasks, customers, opportunities } from "@/db/crm-schema";

export const customerOperationTabs = ["agenda", "activity", "opportunities", "history"] as const;
export type CustomerOperationTab = (typeof customerOperationTabs)[number];

const closedOpportunityStages = ["CLOSED", "LOST", "CANCELLED"] as const;

export async function getCustomerOperations(tab: CustomerOperationTab) {
  const db = getDb();
  if (tab === "agenda") {
    const items = await db
      .select({
        id: crmTasks.id,
        title: crmTasks.title,
        status: crmTasks.status,
        dueAt: crmTasks.dueAt,
        customer: customers.name,
        assignee: sql<string | null>`coalesce(${users.name}, ${users.email}, ${crmTasks.assignedTo})`,
      })
      .from(crmTasks)
      .leftJoin(customers, eq(customers.id, crmTasks.customerId))
      .leftJoin(users, eq(users.id, crmTasks.assignedTo))
      .where(and(notInArray(crmTasks.status, ["COMPLETED", "CANCELLED"]), isNotNull(crmTasks.dueAt)))
      .orderBy(asc(crmTasks.dueAt))
      .limit(10);
    return { tab, items };
  }

  if (tab === "activity") {
    const items = await db
      .select({
        id: crmActivities.id,
        type: crmActivities.type,
        subject: crmActivities.subject,
        body: crmActivities.body,
        occurredAt: crmActivities.occurredAt,
        createdAt: crmActivities.createdAt,
        customer: customers.name,
        actor: sql<string | null>`coalesce(${users.name}, ${users.email}, ${crmActivities.performedBy})`,
      })
      .from(crmActivities)
      .leftJoin(customers, eq(customers.id, crmActivities.customerId))
      .leftJoin(users, eq(users.id, crmActivities.performedBy))
      .orderBy(desc(sql`coalesce(${crmActivities.occurredAt}, ${crmActivities.createdAt})`))
      .limit(10);
    return { tab, items };
  }

  if (tab === "opportunities") {
    const items = await db
      .select({
        id: opportunities.id,
        code: opportunities.code,
        title: opportunities.title,
        stage: opportunities.stage,
        totalAmount: opportunities.totalAmount,
        currency: opportunities.currency,
        nextAction: opportunities.nextAction,
        followUpAt: opportunities.followUpAt,
        customer: customers.name,
        seller: sql<string | null>`coalesce(${users.name}, ${users.email}, ${opportunities.assignedSellerId})`,
      })
      .from(opportunities)
      .innerJoin(customers, eq(customers.id, opportunities.customerId))
      .leftJoin(users, eq(users.id, opportunities.assignedSellerId))
      .where(notInArray(opportunities.stage, [...closedOpportunityStages]))
      .orderBy(asc(opportunities.followUpAt), desc(opportunities.updatedAt))
      .limit(10);
    return { tab, items };
  }

  const items = await db
    .select({
      id: auditLogs.id,
      action: auditLogs.action,
      entityId: auditLogs.entityId,
      actor: sql<string | null>`coalesce(${users.name}, ${users.email}, ${auditLogs.actorId})`,
      createdAt: auditLogs.createdAt,
    })
    .from(auditLogs)
    .leftJoin(users, eq(users.id, auditLogs.actorId))
    .where(and(eq(auditLogs.entityType, "customer"), sql`${auditLogs.action} like 'customer.%'`))
    .orderBy(desc(auditLogs.createdAt))
    .limit(10);
  return { tab, items };
}
