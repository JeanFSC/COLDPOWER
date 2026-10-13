import { and, eq } from "drizzle-orm";
import type { getDb } from "@/db";
import { auditLogs } from "@/db/schema";
import { operationsWorkItemHistory, operationsWorkItems } from "@/db/operations-schema";
import type { TaskStatus } from "@/lib/crm-validation";

type Transaction = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];

export async function syncCrmWorkItemStatus(tx: Transaction, sourceId: string, status: TaskStatus, actor: { userId: string; role: string }) {
  const [before] = await tx.select().from(operationsWorkItems).where(and(eq(operationsWorkItems.sourceType, "FOLLOW_UP"), eq(operationsWorkItems.sourceId, sourceId))).for("update").limit(1);
  if (!before) return null;
  const nextStatus = status === "COMPLETED" ? "RESOLVED" : status === "CANCELLED" ? "STALE" : before.assigneeId ? "IN_PROGRESS" : "PENDING";
  if (before.status === nextStatus && (nextStatus !== "RESOLVED" || before.resolvedAt)) return before;
  const action = status === "COMPLETED" ? "RESOLVE" : status === "CANCELLED" ? "CANCEL" : "REOPEN";
  const auditAction = status === "COMPLETED" ? "operations.work_item_resolved" : status === "CANCELLED" ? "operations.work_item_cancelled" : "operations.work_item_reopened";
  const [after] = await tx.update(operationsWorkItems).set({ status: nextStatus, resolvedAt: status === "COMPLETED" ? new Date() : null, updatedAt: new Date() }).where(eq(operationsWorkItems.id, before.id)).returning();
  await tx.insert(operationsWorkItemHistory).values({ id: `work-item-history-${crypto.randomUUID()}`, workItemId: before.id, actorId: actor.userId, action, fromAssigneeId: before.assigneeId, toAssigneeId: after.assigneeId, fromStatus: before.status, note: `Estado CRM: ${status}.` });
  await tx.insert(auditLogs).values({ id: `audit-${crypto.randomUUID()}`, actorId: actor.userId, actorRole: actor.role, action: auditAction, entityType: "operations_work_item", entityId: before.id, before, after, metadata: { sourceId, sourceStatus: status } });
  return after;
}
