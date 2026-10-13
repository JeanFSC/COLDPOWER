import assert from "node:assert/strict";
import test from "node:test";
import { and, eq } from "drizzle-orm";
import { closeDb, getDb } from "../src/db";
import { auditLogs, users } from "../src/db/schema";
import { reportSchedules } from "../src/db/reporting-schema";
import { createDiscountRule, setDiscountRuleStatus, updateDiscountRule } from "../src/lib/discount-service";
import type { PricingActor } from "../src/lib/pricing-service";

test("QA: pausa concurrente de descuento conserva resultado y una auditoría", { skip: process.env.QA_DISCOUNT_WORKFLOW !== "1", timeout: 60_000 }, async () => {
  assert.notEqual(process.env.NODE_ENV, "production");
  const db = getDb();
  let id: string | undefined;
  let actor: PricingActor | undefined;
  try {
    const [reference] = await db.select().from(reportSchedules).where(eq(reportSchedules.id, "report-schedule-e0115752-abcf-47af-a8e9-81716c52ce49"));
    assert.match(reference.name, /^QA AUDITORÍA/);
    const [owner] = await db.select().from(users).where(eq(users.id, reference.createdBy));
    assert.equal(owner.status, "ACTIVE");
    actor = { userId: owner.id, role: (owner.roleCode ?? owner.role) as PricingActor["role"] };
    const created = await createDiscountRule({ name: `QA AUDITORÍA — descuento ${crypto.randomUUID()}`, maxPercentage: "10", approvalAbovePercentage: "5", validFrom: "2035-01-01T00:00:00-05:00", validUntil: "2036-01-01T00:00:00-05:00", reason: "QA AUDITORÍA — probar concurrencia futura" }, actor);
    id = created.rule.id;
    await assert.rejects(async () => {
      const invalid = await createDiscountRule({ name: `QA AUDITORÍA — fecha inválida ${crypto.randomUUID()}`, maxPercentage: "10", approvalAbovePercentage: "5", validFrom: "2035-02-30T00:00:00-05:00", validUntil: "2036-01-01T00:00:00-05:00", reason: "QA AUDITORÍA — rechazar fecha inexistente" }, actor!);
      await setDiscountRuleStatus(invalid.rule.id, "INACTIVE", "QA AUDITORÍA — retirar regla inválida", actor!);
    }, /DISCOUNT_INVALID_WINDOW/);
    const results = await Promise.all([setDiscountRuleStatus(id, "INACTIVE", "QA AUDITORÍA — pausar", actor), setDiscountRuleStatus(id, "INACTIVE", "QA AUDITORÍA — pausar", actor)]);
    const events = await db.select().from(auditLogs).where(and(eq(auditLogs.entityId, id), eq(auditLogs.action, "pricing.discount_rule_status_changed")));
    console.log(JSON.stringify({ id, results: results.map(result => ({ hasRule: Boolean(result.rule), idempotent: result.idempotent })), statusEvents: events.length }));
    assert.ok(results.every(result => result.rule?.status === "INACTIVE"));
    assert.equal(results.filter(result => result.idempotent).length, 1);
    assert.equal(events.length, 1);
    const edit = { name: created.rule.name, maxPercentage: "12", approvalAbovePercentage: "6", reason: "QA AUDITORÍA — editar regla futura sin borrar vigencia" };
    const edits = await Promise.all([updateDiscountRule(id, edit, actor), updateDiscountRule(id, edit, actor)]);
    assert.equal(edits.filter(result => result.idempotent).length, 1);
    assert.ok(edits.every(result => result.rule.status === "INACTIVE" && Number(result.rule.maxPercentage) === 12));
    assert.ok(edits.every(result => result.rule.validFrom?.getTime() === created.rule.validFrom?.getTime()
      && result.rule.validUntil?.getTime() === created.rule.validUntil?.getTime()));
    const editEvents = await db.select().from(auditLogs).where(and(eq(auditLogs.entityId, id), eq(auditLogs.action, "pricing.discount_rule_updated")));
    assert.equal(editEvents.length, 1);
    await assert.rejects(updateDiscountRule(id, { ...edit, validUntil: "2035-02-29T00:00:00-05:00" }, actor), /DISCOUNT_INVALID_WINDOW/);
    assert.equal((await db.select().from(auditLogs).where(and(eq(auditLogs.entityId, id), eq(auditLogs.action, "pricing.discount_rule_updated")))).length, 1);
    await assert.rejects(setDiscountRuleStatus(id, "ACTIVE", "", actor), /DISCOUNT_REASON_REQUIRED/);
    await assert.rejects(setDiscountRuleStatus(id, "ACTIVE", "QA", { ...actor, role: "customer" }), /DISCOUNT_FORBIDDEN/);
    await assert.rejects(updateDiscountRule(id, { ...edit, validUntil: "2034-12-31T00:00:00-05:00" }, actor), /DISCOUNT_INVALID_WINDOW/);
    const cleared = await updateDiscountRule(id, { ...edit, validUntil: null }, actor);
    assert.equal(cleared.rule.validUntil, null);
    assert.equal(cleared.rule.validFrom?.getTime(), created.rule.validFrom?.getTime());
    assert.equal(cleared.rule.status, "INACTIVE");
  } finally {
    try { if (id && actor) await setDiscountRuleStatus(id, "INACTIVE", "QA AUDITORÍA — cierre de prueba", actor); }
    finally { await closeDb(); }
  }
});
