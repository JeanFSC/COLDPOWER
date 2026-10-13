import { and, asc, eq } from "drizzle-orm";
import type { getDb } from "@/db";
import { opportunities, opportunityFollowups } from "@/db/crm-schema";

type Transaction = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];

export async function refreshOpportunityFollowUpSnapshot(tx: Transaction, opportunityId: string) {
  const [followup] = await tx.select({ title: opportunityFollowups.title, dueAt: opportunityFollowups.dueAt }).from(opportunityFollowups).where(and(eq(opportunityFollowups.opportunityId, opportunityId), eq(opportunityFollowups.status, "PENDING"))).orderBy(asc(opportunityFollowups.dueAt)).limit(1);
  await tx.update(opportunities).set({ followUpAt: followup?.dueAt ?? null, nextAction: followup?.title ?? null, updatedAt: new Date() }).where(eq(opportunities.id, opportunityId));
  return followup ?? null;
}
