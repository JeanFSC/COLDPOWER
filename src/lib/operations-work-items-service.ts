import { and, asc, desc, eq, inArray, notInArray, or, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { auditLogs, inventoryBalances, quotes, users } from "@/db/schema";
import { crmTasks, opportunities, opportunityFollowups } from "@/db/crm-schema";
import { operationsWorkItemHistory, operationsWorkItems } from "@/db/operations-schema";
import { orders } from "@/db/sales-schema";
import { can, type AppRole } from "@/lib/roles";

export const workItemSourceTypes = [
  "QUOTE",
  "OPPORTUNITY",
  "ORDER",
  "FOLLOW_UP",
  "INVENTORY",
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

export function canActOnOperationsWorkItem(team: string | null | undefined, sourceType: string, role: string | null | undefined) {
  if (!role || role === "customer") return false;
  if (["SUPERADMIN", "GERENCIA", "JEFATURA", "ADMIN", "OPERACIONES_VENTAS"].includes(role)) return true;
  const appRole = role as AppRole;
  if (sourceType === "INVENTORY") return can(appRole, "inventory.adjust") || can(appRole, "inventory.view");
  if (team === "VENTAS" || ["QUOTE", "OPPORTUNITY", "FOLLOW_UP"].includes(sourceType)) return can(appRole, "crm.edit") || can(appRole, "quotes.edit") || can(appRole, "quotes.send");
  return can(appRole, "orders.edit") || can(appRole, "operations.assign");
}
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

// Batched equivalent of calling upsertOperationsWorkItem once per projected row.
// The read path (getOperationsWorkspace) used to `await` one upsert per source
// row inside a Promise.all — up to ~5,000 individual round trips per page load
// (5 queues x up to 1,000 rows), which saturated the Neon connection pool.
// A single multi-row INSERT ... ON CONFLICT DO UPDATE keeps identical semantics
// (same columns kept in sync, assigneeId/status never touched here) in one round trip.
export async function upsertOperationsWorkItemsBatch(inputs: WorkItemProjection[]) {
  if (!inputs.length) return [];
  const rows = inputs.map((input) => ({
    id: `work-item-${input.sourceType.toLowerCase()}-${input.sourceId}`,
    ...itemValues(input),
  }));
  const excluded = <T extends string>(column: T) => sql.raw(`excluded.${column}`);
  return getDb()
    .insert(operationsWorkItems)
    .values(rows)
    .onConflictDoUpdate({
      target: [operationsWorkItems.sourceType, operationsWorkItems.sourceId],
      set: {
        workType: excluded("work_type"),
        reference: excluded("reference"),
        title: excluded("title"),
        customer: excluded("customer"),
        location: excluded("location"),
        urgency: excluded("urgency"),
        dueAt: excluded("due_at"),
        blocker: excluded("blocker"),
        nextAction: excluded("next_action"),
        sourceOwnerId: excluded("source_owner_id"),
        team: excluded("team"),
        allowedActions: excluded("allowed_actions"),
        sourceUpdatedAt: excluded("source_updated_at"),
        updatedAt: excluded("updated_at"),
      },
    })
    .returning();
}

export async function getOperationsWorkItemRefs(inputs: WorkItemProjection[]) {
  const result = new Map<string, { id: string; assigneeId: string | null; team: string | null; status: WorkItemStatus }>();
  const grouped = new Map<WorkItemSourceType, string[]>();
  for (const input of inputs) grouped.set(input.sourceType, [...(grouped.get(input.sourceType) ?? []), input.sourceId]);
  await Promise.all([...grouped.entries()].map(async ([sourceType, sourceIds]) => {
    const rows = await getDb().select({ id: operationsWorkItems.id, sourceId: operationsWorkItems.sourceId, assigneeId: operationsWorkItems.assigneeId, team: operationsWorkItems.team, status: operationsWorkItems.status }).from(operationsWorkItems).where(and(eq(operationsWorkItems.sourceType, sourceType), inArray(operationsWorkItems.sourceId, sourceIds)));
    for (const row of rows) result.set(`${sourceType}:${row.sourceId}`, row);
  }));
  return result;
}

export async function syncOperationsWorkItemsAfterResponse(inputs: WorkItemProjection[]) {
  if (inputs.length) await upsertOperationsWorkItemsBatch(inputs);
  const db = getDb();
  const [activeQuotes, activeOpportunities, activeOrders, activeTasks, activeFollowups, activeInventory] = await Promise.all([
    db.select({ id: quotes.id }).from(quotes).where(notInArray(quotes.workflowStatus, ["ACCEPTED", "REJECTED", "CANCELLED", "CONVERTED", "EXPIRED"])),
    db.select({ id: opportunities.id }).from(opportunities).where(notInArray(opportunities.stage, ["LOST", "CANCELLED", "CLOSED", "NO_RESPONSE", "DELIVERED"])),
    db.select({ id: orders.id }).from(orders).where(notInArray(orders.status, ["CANCELLED", "DELIVERED"])),
    db.select({ id: crmTasks.id }).from(crmTasks).where(inArray(crmTasks.status, ["PENDING", "OVERDUE"])),
    db.select({ id: opportunityFollowups.id }).from(opportunityFollowups).where(eq(opportunityFollowups.status, "PENDING")),
    db.select({ productId: inventoryBalances.productId, locationId: inventoryBalances.locationId }).from(inventoryBalances).where(sql`${inventoryBalances.onHand} - ${inventoryBalances.reserved} <= coalesce(${inventoryBalances.minimumStock}, 0)`),
  ]);
  const active: Array<[WorkItemSourceType, string[]]> = [
    ["QUOTE", activeQuotes.map((row) => row.id)],
    ["OPPORTUNITY", activeOpportunities.map((row) => row.id)],
    ["ORDER", activeOrders.map((row) => row.id)],
    ["FOLLOW_UP", [...activeTasks.map((row) => row.id), ...activeFollowups.map((row) => row.id)]],
    ["INVENTORY", activeInventory.map((row) => `${row.productId}:${row.locationId}`)],
  ];
  await db.transaction(async (tx) => {
    for (const [sourceType, sourceIds] of active) {
      await tx.update(operationsWorkItems).set({ status: "STALE", updatedAt: new Date() }).where(and(eq(operationsWorkItems.sourceType, sourceType), or(eq(operationsWorkItems.status, "PENDING"), eq(operationsWorkItems.status, "IN_PROGRESS")), sourceIds.length ? notInArray(operationsWorkItems.sourceId, sourceIds) : undefined));
    }
  });
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
    if (!canActOnOperationsWorkItem(before.team, before.sourceType, actor.role)) throw new Error("No tienes permiso para tomar tareas de este equipo.");
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
    if (!canActOnOperationsWorkItem(before.team, before.sourceType, actor.role)) throw new Error("No tienes permiso para reasignar tareas de este equipo.");
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
    if (!canActOnOperationsWorkItem(before.team, before.sourceType, actor.role)) throw new Error("No tienes permiso para resolver tareas de este equipo.");
    if (before.status === "RESOLVED" || before.status === "STALE")
      throw new Error("Esta tarea cambió de estado y ya no requiere esta acción.");
    if (before.sourceType !== "FOLLOW_UP")
      throw new Error("Resuelve la tarea desde su dominio de origen.");

    const [task] = await tx
      .update(crmTasks)
      .set({ status: "COMPLETED", completedAt: new Date() })
      .where(eq(crmTasks.id, before.sourceId))
      .returning({ id: crmTasks.id });
    if (!task) {
      const [followup] = await tx.update(opportunityFollowups).set({ status: "COMPLETED" }).where(eq(opportunityFollowups.id, before.sourceId)).returning({ id: opportunityFollowups.id });
      if (!followup) throw new Error("La tarea CRM de origen no existe.");
    }

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
