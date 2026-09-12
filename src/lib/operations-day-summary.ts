import { and, eq, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/db";
import { operationsWorkItems as work } from "@/db/operations-schema";
import { getLimaTodayBounds, type OperationsFilters } from "@/lib/operations-contract";

/** Mutually exclusive states for the day's agenda, including overdue carry-over. */
export async function getOperationsDaySummary(filters: OperationsFilters, dayOffset = 0) {
  const today = getLimaTodayBounds();
  const from = new Date(today.from.getTime() + dayOffset * 24 * 60 * 60 * 1000);
  const to = new Date(today.to.getTime() + dayOffset * 24 * 60 * 60 * 1000);
  const conditions: SQL[] = [sql`${work.status} <> 'STALE'`];
  if (filters.team) conditions.push(eq(work.team, filters.team));
  if (filters.assigneeId) conditions.push(eq(work.assigneeId, filters.assigneeId));
  const [row] = await getDb()
    .select({
      resolved: sql<number>`count(*) filter (where ${work.status} = 'RESOLVED' and ${work.resolvedAt} >= ${from} and ${work.resolvedAt} < ${to})`,
      overdue: sql<number>`count(*) filter (where ${work.status} in ('PENDING','IN_PROGRESS') and ${work.dueAt} < ${from})`,
      inProgress: sql<number>`count(*) filter (where ${work.status} = 'IN_PROGRESS' and (${work.dueAt} is null or ${work.dueAt} >= ${from}) and (${work.dueAt} < ${to} or ${work.updatedAt} >= ${from}))`,
      pending: sql<number>`count(*) filter (where ${work.status} = 'PENDING' and (${work.dueAt} is null or ${work.dueAt} >= ${from}) and (${work.dueAt} < ${to} or ${work.createdAt} >= ${from}))`,
    })
    .from(work)
    .where(and(...conditions));
  return {
    resolved: Number(row.resolved),
    overdue: Number(row.overdue),
    inProgress: Number(row.inProgress),
    pending: Number(row.pending),
  };
}
