import assert from "node:assert/strict";
import test from "node:test";
import { eq } from "drizzle-orm";
import { closeDb, getDb } from "../src/db";
import { crmTasks, opportunities, opportunityFollowups } from "../src/db/crm-schema";
import { users } from "../src/db/schema";
import { reportSchedules } from "../src/db/reporting-schema";
import { changeOpportunityStage, createCustomer, createOpportunity, createOpportunityFollowup, createTask, updateCustomer, updateOpportunityFollowup, updateTaskStatus } from "../src/lib/crm-service";
import { getOperationsWorkItem, reassignOperationsWorkItem, resolveOperationsWorkItem, takeOperationsWorkItem, upsertOperationsWorkItem } from "../src/lib/operations-work-items-service";
import { validateOpportunityInput } from "../src/lib/crm-validation";

test("QA: asignación, resolución y reapertura de tareas operativas", { skip: process.env.QA_OPERATIONS_WORKFLOW !== "1", timeout: 60_000 }, async () => {
  assert.notEqual(process.env.NODE_ENV, "production");
  const db = getDb();
  let customerId: string | undefined, opportunityId: string | undefined, taskId: string | undefined, followUpId: string | undefined;
  let actor: { userId: string; role: string } | undefined;
  try {
    const [reference] = await db.select().from(reportSchedules).where(eq(reportSchedules.id, "report-schedule-e0115752-abcf-47af-a8e9-81716c52ce49"));
    assert.match(reference?.name ?? "", /^QA AUDITORÍA/);
    const [owner] = await db.select().from(users).where(eq(users.id, reference.createdBy));
    assert.equal(owner.status, "ACTIVE");
    actor = { userId: owner.id, role: owner.roleCode ?? owner.role };
    const tag = crypto.randomUUID();
    const customer = await createCustomer({ name: `QA AUDITORÍA — operaciones ${tag}`, email: `qa-ops-${tag}@example.test` }, actor);
    customerId = customer.id;
    const task = await createTask({ customerId, title: "QA AUDITORÍA — tarea operativa", assignedTo: owner.id, dueAt: new Date(Date.now() + 7 * 86400_000), idempotencyKey: `qa-ops-${tag}` }, actor);
    taskId = task.task.id;
    const item = await upsertOperationsWorkItem({ sourceType: "FOLLOW_UP", sourceId: taskId, workType: "QA_AUDIT", reference: tag, title: "QA AUDITORÍA — tarea operativa", team: "VENTAS", sourceOwnerId: owner.id });
    await assert.rejects(takeOperationsWorkItem(item.id, { userId: owner.id, role: "customer" }), /permiso/);
    await assert.rejects(reassignOperationsWorkItem(item.id, owner.id, " ", actor), /motivo/);
    await assert.rejects(reassignOperationsWorkItem(item.id, `qa-missing-${tag}`, "QA AUDITORÍA", actor), /inactivo/);
    assert.equal((await takeOperationsWorkItem(item.id, actor)).status, "IN_PROGRESS");
    assert.equal((await reassignOperationsWorkItem(item.id, null, "QA AUDITORÍA — liberar", actor)).status, "PENDING");
    assert.equal((await reassignOperationsWorkItem(item.id, owner.id, "QA AUDITORÍA — reasignar", actor)).assigneeId, owner.id);
    const resolved = await resolveOperationsWorkItem(item.id, actor);
    assert.equal(resolved.status, "RESOLVED");
    assert.ok(resolved.resolvedAt);
    const [completedTask] = await db.select().from(crmTasks).where(eq(crmTasks.id, taskId));
    assert.equal(completedTask.status, "COMPLETED");
    assert.ok(completedTask.completedAt);
    await assert.rejects(resolveOperationsWorkItem(item.id, actor), /estado/);
    await assert.rejects(takeOperationsWorkItem(item.id, actor), /estado/);
    await updateTaskStatus(taskId, "PENDING", actor);
    const reopened = await getOperationsWorkItem(item.id);
    const opportunity = await createOpportunity(validateOpportunityInput({ customerId, title: "QA AUDITORÍA — seguimiento operativo", origin: "LOCAL" }), actor);
    opportunityId = opportunity.id;
    const followUp = await createOpportunityFollowup({ opportunityId, title: "QA AUDITORÍA — seguimiento", dueAt: new Date(Date.now() + 7 * 86400_000) }, actor);
    followUpId = followUp.id;
    const followUpItem = await upsertOperationsWorkItem({ sourceType: "FOLLOW_UP", sourceId: followUpId, workType: "QA_AUDIT", reference: tag, title: "QA AUDITORÍA — seguimiento", team: "VENTAS" });
    await resolveOperationsWorkItem(followUpItem.id, actor);
    const [completedFollowUp] = await db.select().from(opportunityFollowups).where(eq(opportunityFollowups.id, followUpId));
    const [snapshot] = await db.select().from(opportunities).where(eq(opportunities.id, opportunityId));
    const checks = { reopenedTaskActionable: reopened?.item.status === "IN_PROGRESS" || reopened?.item.status === "PENDING", reopenedResolvedAtCleared: reopened?.item.resolvedAt === null, followUpCompletedAt: Boolean(completedFollowUp.completedAt), snapshotCleared: snapshot.followUpAt === null && snapshot.nextAction === null };
    console.log(JSON.stringify({ customerId, taskId, opportunityId, followUpId, workItemIds: [item.id, followUpItem.id], checks }));
    for (const [name, passed] of Object.entries(checks)) assert.equal(passed, true, name);
    assert.ok(reopened?.history.some(row => row.action === "REOPEN"));
    await updateTaskStatus(taskId, "CANCELLED", actor);
    assert.equal((await getOperationsWorkItem(item.id))?.item.status, "STALE");
    await assert.rejects(takeOperationsWorkItem(item.id, actor), /estado/);
    await updateTaskStatus(taskId, "PENDING", actor);
    assert.equal((await getOperationsWorkItem(item.id))?.item.status, "IN_PROGRESS");
    const completions = await Promise.allSettled([updateTaskStatus(taskId, "COMPLETED", actor), resolveOperationsWorkItem(item.id, actor)]);
    assert.equal(completions[0].status, "fulfilled");
    const finalTask = await getOperationsWorkItem(item.id);
    assert.equal(finalTask?.item.status, "RESOLVED");
    assert.ok(finalTask?.item.resolvedAt);
    await updateOpportunityFollowup(followUpId, { status: "PENDING" }, actor);
    const reopenedFollowUp = await getOperationsWorkItem(followUpItem.id);
    assert.equal(reopenedFollowUp?.item.status, "PENDING");
    assert.equal(reopenedFollowUp?.item.resolvedAt, null);
    assert.ok(reopenedFollowUp?.history.some(row => row.action === "REOPEN"));
    await updateOpportunityFollowup(followUpId, { status: "CANCELLED" }, actor);
    assert.equal((await getOperationsWorkItem(followUpItem.id))?.item.status, "STALE");
    await updateOpportunityFollowup(followUpId, { status: "PENDING" }, actor);
    await resolveOperationsWorkItem(followUpItem.id, actor);
    console.log(JSON.stringify({ taskCancellationAndReopening: true, crmAndOperationsConcurrentCompletion: completions.map(result => result.status), followUpCancellationAndReopening: true }));
  } finally {
    try {
      if (actor) {
        if (taskId) await updateTaskStatus(taskId, "COMPLETED", actor);
        if (followUpId) await updateOpportunityFollowup(followUpId, { status: "COMPLETED" }, actor);
        if (opportunityId) await changeOpportunityStage(opportunityId, "CANCELLED", actor, "QA AUDITORÍA — cierre fixture", undefined, undefined, { cancellationReason: "QA AUDITORÍA — prueba finalizada" });
        if (customerId) await updateCustomer(customerId, { status: "INACTIVE" }, actor, "QA AUDITORÍA — cierre fixture operativa");
      }
    } finally { await closeDb(); }
  }
});
