import assert from "node:assert/strict";
import test from "node:test";
import { eq } from "drizzle-orm";
import { closeDb, getDb } from "../src/db";
import { customers } from "../src/db/crm-schema";
import { users } from "../src/db/schema";
import { reportSchedules } from "../src/db/reporting-schema";
import { createTask, updateTaskStatus } from "../src/lib/crm-service";
import { canActOnOperationsWorkItem, getOperationsWorkItem, reassignOperationsWorkItem, upsertOperationsWorkItem } from "../src/lib/operations-work-items-service";

test("QA: responsable incompatible no recibe tareas ni genera historia de reasignación", { skip: process.env.QA_OPERATIONS_ASSIGNEE !== "1", timeout: 45_000 }, async () => {
  assert.notEqual(process.env.NODE_ENV, "production");
  const db = getDb();
  let taskId: string | undefined, workItemId: string | undefined;
  let actor: { userId: string; role: string } | undefined;
  try {
    const [reference] = await db.select().from(reportSchedules).where(eq(reportSchedules.id, "report-schedule-e0115752-abcf-47af-a8e9-81716c52ce49"));
    assert.match(reference?.name ?? "", /^QA AUDITORÍA/);
    const [owner] = await db.select().from(users).where(eq(users.id, reference.createdBy));
    assert.equal(owner.status, "ACTIVE");
    actor = { userId: owner.id, role: owner.roleCode ?? owner.role };
    const [customer] = await db.select().from(customers).where(eq(customers.id, "customer-fa428e1e-cb3a-40ac-86ea-ac3fceb38acd"));
    assert.match(customer?.name ?? "", /^QA AUDITORÍA/);
    const candidates = await db.select({ id: users.id, roleCode: users.roleCode, role: users.role }).from(users).where(eq(users.status, "ACTIVE")).limit(100);
    const incompatible = candidates.find(row => !canActOnOperationsWorkItem("VENTAS", "FOLLOW_UP", row.roleCode ?? row.role));
    assert.ok(incompatible, "se necesita un usuario existente sin permisos comerciales; no crear ni cambiar roles");
    const tag = crypto.randomUUID();
    const task = await createTask({ customerId: customer.id, title: "QA AUDITORÍA — responsable compatible", dueAt: new Date(Date.now() + 7 * 86400_000), idempotencyKey: `qa-assignee-${tag}` }, actor);
    taskId = task.task.id;
    const item = await upsertOperationsWorkItem({ sourceType: "FOLLOW_UP", sourceId: taskId, workType: "QA_AUDIT", title: "QA AUDITORÍA — responsable compatible", reference: tag, team: "VENTAS" });
    workItemId = item.id;
    const before = await getOperationsWorkItem(workItemId);
    let rejected = false;
    try { await reassignOperationsWorkItem(workItemId, incompatible.id, "QA AUDITORÍA — debe rechazar responsable incompatible", actor); }
    catch (error) { rejected = error instanceof Error && /permiso|compatible/.test(error.message); }
    const after = await getOperationsWorkItem(workItemId);
    const unchanged = after?.item.assigneeId === before?.item.assigneeId && after?.item.status === before?.item.status;
    const historyUnchanged = after?.history.length === before?.history.length;
    console.log(JSON.stringify({ taskId, workItemId, incompatibleRejected: rejected, assignmentUnchanged: unchanged, historyUnchanged }));
    assert.equal(rejected, true);
    assert.equal(unchanged, true);
    assert.equal(historyUnchanged, true);
    const assigned = await reassignOperationsWorkItem(workItemId, owner.id, "QA AUDITORÍA — responsable autorizado", actor);
    assert.equal(assigned.assigneeId, owner.id);
  } finally {
    try {
      if (actor && workItemId) await reassignOperationsWorkItem(workItemId, null, "QA AUDITORÍA — retirar asignación de prueba", actor);
      if (actor && taskId) await updateTaskStatus(taskId, "COMPLETED", actor);
    } finally { await closeDb(); }
  }
});
