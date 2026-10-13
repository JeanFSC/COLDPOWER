import assert from "node:assert/strict";
import test from "node:test";
import { eq } from "drizzle-orm";
import { closeDb, getDb } from "../src/db";
import { opportunities, opportunityFollowups, opportunityStageHistory } from "../src/db/crm-schema";
import { users } from "../src/db/schema";
import { reportSchedules } from "../src/db/reporting-schema";
import { changeOpportunityStage, createCustomer, createOpportunity, createOpportunityFollowup, updateCustomer, updateOpportunityFollowup } from "../src/lib/crm-service";
import { validateOpportunityInput } from "../src/lib/crm-validation";

test("QA: flujo comercial, seguimientos y cierres concurrentes de Pipeline", { skip: process.env.QA_PIPELINE_WORKFLOW !== "1", timeout: 60_000 }, async () => {
  assert.notEqual(process.env.NODE_ENV, "production");
  const db = getDb();
  let customerId: string | undefined;
  let actor: { userId: string; role: string } | undefined;
  const opportunityIds: string[] = [];
  try {
    const [reference] = await db.select().from(reportSchedules).where(eq(reportSchedules.id, "report-schedule-e0115752-abcf-47af-a8e9-81716c52ce49"));
    assert.match(reference?.name ?? "", /^QA AUDITORÍA/);
    const [owner] = await db.select().from(users).where(eq(users.id, reference.createdBy));
    assert.equal(owner.status, "ACTIVE");
    actor = { userId: owner.id, role: owner.roleCode ?? owner.role };
    const tag = crypto.randomUUID();
    const customer = await createCustomer({ name: `QA AUDITORÍA — pipeline ${tag}`, email: `qa-pipeline-${tag}@example.test` }, actor);
    customerId = customer.id;
    const first = await createOpportunity(validateOpportunityInput({ customerId, title: "QA AUDITORÍA — flujo comercial", origin: "LOCAL" }), actor);
    opportunityIds.push(first.id);
    const rejectsCode = (code: string) => (error: unknown) => (error as { code?: string }).code === code;
    await assert.rejects(changeOpportunityStage(first.id, "PAID", actor), rejectsCode("OPPORTUNITY_TRANSITION_INVALID"));
    await changeOpportunityStage(first.id, "CONTACTED", actor, "QA AUDITORÍA — contacto simulado");
    await changeOpportunityStage(first.id, "QUOTING", actor, "QA AUDITORÍA — sin envío externo");
    await assert.rejects(changeOpportunityStage(first.id, "QUOTE_SENT", actor), rejectsCode("QUOTE_REQUIRED"));
    await assert.rejects(changeOpportunityStage(first.id, "FOLLOW_UP", actor), rejectsCode("FOLLOW_UP_DATA_REQUIRED"));
    const dueAt = new Date(Date.now() + 7 * 86400_000);
    await changeOpportunityStage(first.id, "FOLLOW_UP", actor, "QA AUDITORÍA — seguimiento", dueAt, "QA AUDITORÍA — revisar internamente");
    const added = await createOpportunityFollowup({ opportunityId: first.id, title: "QA AUDITORÍA — seguimiento posterior", dueAt: new Date(dueAt.getTime() + 86400_000) }, actor);
    await updateOpportunityFollowup(added.id, { status: "COMPLETED" }, actor);
    const [completed] = await db.select().from(opportunityFollowups).where(eq(opportunityFollowups.id, added.id));
    assert.equal(completed.status, "COMPLETED");
    assert.ok(completed.completedAt);
    await changeOpportunityStage(first.id, "NEGOTIATION", actor, "QA AUDITORÍA — negociación simulada");
    await assert.rejects(changeOpportunityStage(first.id, "ACCEPTED", actor), rejectsCode("ACCEPTED_DATA_REQUIRED"));
    await assert.rejects(changeOpportunityStage(first.id, "SALE", actor), rejectsCode("OPPORTUNITY_SALE_REQUIRES_CONVERSION"));
    await assert.rejects(changeOpportunityStage(first.id, "LOST", actor), rejectsCode("LOST_REASON_REQUIRED"));
    await changeOpportunityStage(first.id, "LOST", actor, "QA AUDITORÍA — cerrar", undefined, undefined, { lostReason: "QA AUDITORÍA — prueba sin venta" });
    await assert.rejects(changeOpportunityStage(first.id, "NEW", actor), rejectsCode("OPPORTUNITY_TRANSITION_INVALID"));
    const history = await db.select().from(opportunityStageHistory).where(eq(opportunityStageHistory.opportunityId, first.id));
    assert.equal(history.length, 6);
    const competing = await createOpportunity(validateOpportunityInput({ customerId, title: "QA AUDITORÍA — cierre concurrente", origin: "LOCAL" }), actor);
    opportunityIds.push(competing.id);
    const closures = await Promise.allSettled([
      changeOpportunityStage(competing.id, "LOST", actor, "QA AUDITORÍA — cierre A", undefined, undefined, { lostReason: "QA AUDITORÍA — A" }),
      changeOpportunityStage(competing.id, "CANCELLED", actor, "QA AUDITORÍA — cierre B", undefined, undefined, { cancellationReason: "QA AUDITORÍA — B" }),
    ]);
    const competingHistory = await db.select().from(opportunityStageHistory).where(eq(opportunityStageHistory.opportunityId, competing.id));
    console.log(JSON.stringify({ customerId, opportunityIds, workflowHistoryCount: history.length, closures: closures.map(result => result.status), concurrentHistoryCount: competingHistory.length }));
    assert.equal(closures.filter(result => result.status === "fulfilled").length, 1);
    assert.equal(closures.filter(result => result.status === "rejected").length, 1);
    assert.equal(competingHistory.length, 2);
  } finally {
    try {
      if (actor) {
        for (const opportunityId of opportunityIds) {
          const followups = await db.select().from(opportunityFollowups).where(eq(opportunityFollowups.opportunityId, opportunityId));
          for (const row of followups) if (row.status === "PENDING" || row.status === "OVERDUE") await updateOpportunityFollowup(row.id, { status: "CANCELLED" }, actor);
          const [row] = await db.select().from(opportunities).where(eq(opportunities.id, opportunityId));
          if (row && row.stage !== "LOST" && row.stage !== "CANCELLED") await changeOpportunityStage(row.id, "CANCELLED", actor, "QA AUDITORÍA — limpieza", undefined, undefined, { cancellationReason: "QA AUDITORÍA — cierre de fixture" });
        }
        if (customerId) await updateCustomer(customerId, { status: "INACTIVE" }, actor, "QA AUDITORÍA — cierre de fixture pipeline");
      }
    } finally { await closeDb(); }
  }
});
