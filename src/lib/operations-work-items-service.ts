import { and, asc, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { auditLogs, users } from "@/db/schema";
import { crmTasks } from "@/db/crm-schema";
import { operationsWorkItemHistory, operationsWorkItems } from "@/db/operations-schema";

export const workItemSourceTypes = [
  "QUOTE",
  "OPPORTUNITY",
  "ORDER",
  "FOLLOW_UP",
  "INVENTORY",
  "TRANSFER",
  "PAYMENT",
  "PURCHASE",
] as const;
export const workItemStatuses = ["PENDING", "IN_PROGRESS", "RESOLVED", "STALE"] as const;
export type WorkItemSourceType = (typeof workItemSourceTypes)[number];
export type WorkItemStatus = (typeof workItemStatuses)[number];
export type WorkItemProjection = {
  workType: string;
  sourceType: WorkItemSourceType;
  sourceId: string;
  reference: string;
  title: string;
  customer?: string | null;
  location?: string | null;
  urgency?: "LOW" | "NORMAL" | "MEDIUM" | "HIGH" | "CRITICAL";
  dueAt?: Date | null;
  blocker?: boolean;
  nextAction?: string | null;
  sourceOwnerId?: string | null;
  team?: string | null;
  allowedActions?: string[];
  sourceUpdatedAt?: Date | null;
};
type Actor = { userId: string | null; role?: string | null };
function id(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}
function audit(
  actor: Actor,
  action: string,
  workItemId: string,
  before: unknown,
  after: unknown,
  metadata?: Record<string, unknown>,
) {
  return {
    id: id("audit"),
    actorId: actor.userId,
    actorRole: actor.role ?? null,
    action,
    entityType: "operations_work_item",
    entityId: workItemId,
    before: before as Record<string, unknown> | null,
    after: after as Record<string, unknown> | null,
    metadata: metadata ?? null,
  };
}

function itemValues(input: WorkItemProjection) {
  const now = new Date();
  return {
    workType: input.workType.slice(0, 80),
    sourceType: input.sourceType,
    sourceId: input.sourceId.slice(0, 180),
    reference: input.reference.slice(0, 180),
    title: input.title.slice(0, 240),
    customer: input.customer?.slice(0, 180) ?? null,
    location: input.location?.slice(0, 180) ?? null,
    urgency: input.urgency ?? "NORMAL",
    dueAt: input.dueAt ?? null,
    blocker: input.blocker ?? false,
    nextAction: input.nextAction?.slice(0, 500) ?? null,
    sourceOwnerId: input.sourceOwnerId ?? null,
    team: input.team?.slice(0, 120) ?? null,
    allowedActions: input.allowedActions ?? [],
    sourceUpdatedAt: input.sourceUpdatedAt ?? now,
    updatedAt: now,
  };
}

export async function upsertOperationsWorkItem(input: WorkItemProjection) {
  const db = getDb();
  const values = itemValues(input);
  const [row] = await db
    .insert(operationsWorkItems)
    .values({ id: `work-item-${input.sourceType.toLowerCase()}-${input.sourceId}`, ...values })
    .onConflictDoUpdate({
      target: [operationsWorkItems.sourceType, operationsWorkItems.sourceId],
      set: values,
    })
    .returning();
  return row;
}

export async function listOperationsWorkItems(
  options: {
    status?: WorkItemStatus;
    assigneeId?: string;
    sourceType?: WorkItemSourceType;
    limit?: number;
  } = {},
) {
  const conditions = [];
  if (options.status) conditions.push(eq(operationsWorkItems.status, options.status));
  if (options.assigneeId) conditions.push(eq(operationsWorkItems.assigneeId, options.assigneeId));
  if (options.sourceType) conditions.push(eq(operationsWorkItems.sourceType, options.sourceType));
  return getDb()
    .select({ item: operationsWorkItems, assignee: users.name })
    .from(operationsWorkItems)
    .leftJoin(users, eq(users.id, operationsWorkItems.assigneeId))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(asc(operationsWorkItems.dueAt), desc(operationsWorkItems.updatedAt))
    .limit(Math.min(500, Math.max(1, options.limit ?? 100)));
}
export async function getOperationsWorkItem(workItemId: string) {
  const [row] = await getDb()
    .select({ item: operationsWorkItems, assignee: users.name })
    .from(operationsWorkItems)
    .leftJoin(users, eq(users.id, operationsWorkItems.assigneeId))
    .where(eq(operationsWorkItems.id, workItemId))
    .limit(1);
  if (!row) return null;
  const history = await getDb().select({ id: operationsWorkItemHistory.id, action: operationsWorkItemHistory.action, note: operationsWorkItemHistory.note, createdAt: operationsWorkItemHistory.createdAt }).from(operationsWorkItemHistory).where(eq(operationsWorkItemHistory.workItemId, workItemId)).orderBy(desc(operationsWorkItemHistory.createdAt)).limit(50);
  return { ...row, history };
}

export async function takeOperationsWorkItem(workItemId: string, actor: Actor) {
  if (!actor.userId) throw new Error("El usuario operativo no está disponible.");
  return getDb().transaction(async (tx) => {
    const [before] = await tx
      .select()
      .from(operationsWorkItems)
      .where(eq(operationsWorkItems.id, workItemId))
      .for("update")
      .limit(1);
    if (!before) throw new Error("Tarea operativa no encontrada.");
    if (before.status === "RESOLVED" || before.status === "STALE")
      throw new Error("Esta tarea cambió de estado y ya no requiere esta acción.");
    if (before.assigneeId && before.assigneeId !== actor.userId)
      throw new Error("Esta tarea ya fue tomada por otro responsable.");
    const [after] = await tx
      .update(operationsWorkItems)
      .set({ assigneeId: actor.userId, status: "IN_PROGRESS", updatedAt: new Date() })
      .where(
        and(
          eq(operationsWorkItems.id, workItemId),
          sql`${operationsWorkItems.assigneeId} is null or ${operationsWorkItems.assigneeId} = ${actor.userId}`,
        ),
      )
      .returning();
    if (!after) throw new Error("Esta tarea ya fue tomada por otro responsable.");
    await tx
      .insert(operationsWorkItemHistory)
      .values({
        id: id("work-item-history"),
        workItemId,
        actorId: actor.userId,
        action: "TAKE",
        fromAssigneeId: before.assigneeId,
        toAssigneeId: after.assigneeId,
        fromStatus: before.status,
        note: null,
      });
    await tx
      .insert(auditLogs)
      .values(
        audit(
          actor,
          "operations.work_item_taken",
          workItemId,
          { assigneeId: before.assigneeId, status: before.status },
          { assigneeId: after.assigneeId, status: after.status },
        ),
      );
    return after;
  });
}

export async function reassignOperationsWorkItem(
  workItemId: string,
  assigneeId: string | null,
  reason: string,
  actor: Actor,
) {
  const cleanReason = reason.trim().slice(0, 500);
  if (!cleanReason) throw new Error("La reasignación requiere un motivo.");
  return getDb().transaction(async (tx) => {
    const [before] = await tx
      .select()
      .from(operationsWorkItems)
      .where(eq(operationsWorkItems.id, workItemId))
      .for("update")
      .limit(1);
    if (!before) throw new Error("Tarea operativa no encontrada.");
    if (before.status === "RESOLVED" || before.status === "STALE")
      throw new Error("Esta tarea cambió de estado y ya no requiere esta acción.");
    if (assigneeId) {
      const [user] = await tx
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.id, assigneeId), eq(users.status, "ACTIVE")))
        .limit(1);
      if (!user) throw new Error("El responsable no existe o está inactivo.");
    }
    const [after] = await tx
      .update(operationsWorkItems)
      .set({ assigneeId, status: assigneeId ? "IN_PROGRESS" : "PENDING", updatedAt: new Date() })
      .where(eq(operationsWorkItems.id, workItemId))
      .returning();
    await tx
      .insert(operationsWorkItemHistory)
      .values({
        id: id("work-item-history"),
        workItemId,
        actorId: actor.userId,
        action: "REASSIGN",
        fromAssigneeId: before.assigneeId,
        toAssigneeId: assigneeId,
        fromStatus: before.status,
        note: cleanReason,
      });
    await tx
      .insert(auditLogs)
      .values(
        audit(
          actor,
          "operations.work_item_reassigned",
          workItemId,
          { assigneeId: before.assigneeId },
          { assigneeId, reason: cleanReason },
        ),
      );
    return after;
  });
}

export async function resolveOperationsWorkItem(workItemId: string, actor: Actor) {
  if (!actor.userId) throw new Error("El usuario operativo no está disponible.");
  return getDb().transaction(async (tx) => {
    const [before] = await tx
      .select()
      .from(operationsWorkItems)
      .where(eq(operationsWorkItems.id, workItemId))
      .for("update")
      .limit(1);
    if (!before) throw new Error("Tarea operativa no encontrada.");
    if (before.status === "RESOLVED" || before.status === "STALE")
      throw new Error("Esta tarea cambió de estado y ya no requiere esta acción.");
    if (before.sourceType !== "FOLLOW_UP")
      throw new Error("Resuelve la tarea desde su dominio de origen.");

    const [task] = await tx
      .update(crmTasks)
      .set({ status: "COMPLETED", completedAt: new Date(), updatedAt: new Date() })
      .where(eq(crmTasks.id, before.sourceId))
      .returning({ id: crmTasks.id });
    if (!task) throw new Error("La tarea CRM de origen no existe.");

    const [after] = await tx
      .update(operationsWorkItems)
      .set({ status: "RESOLVED", resolvedAt: new Date(), updatedAt: new Date() })
      .where(eq(operationsWorkItems.id, workItemId))
      .returning();
    await tx.insert(operationsWorkItemHistory).values({
      id: id("work-item-history"),
      workItemId,
      actorId: actor.userId,
      action: "RESOLVE",
      fromAssigneeId: before.assigneeId,
      toAssigneeId: after.assigneeId,
      fromStatus: before.status,
      note: "Resuelta en CRM.",
    });
    await tx.insert(auditLogs).values(
      audit(
        actor,
        "operations.work_item_resolved",
        workItemId,
        { status: before.status, sourceType: before.sourceType, sourceId: before.sourceId },
        { status: after.status, resolvedAt: after.resolvedAt },
      ),
    );
    return after;
  });
}
