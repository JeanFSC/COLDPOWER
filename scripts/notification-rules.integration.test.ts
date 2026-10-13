import assert from "node:assert/strict";
import test from "node:test";
import { and, eq } from "drizzle-orm";
import { closeDb, getDb } from "../src/db";
import { auditLogs, users } from "../src/db/schema";
import { notificationPreferences, notificationRules, notifications } from "../src/db/operations-schema";
import { reportSchedules } from "../src/db/reporting-schema";
import { can, type AppRole } from "../src/lib/roles";
import { isNotificationTypeEnabled } from "../src/lib/notification-preferences";
import { createManualNotification, dispatchNotificationEvent, saveNotificationRule, saveNotificationTemplate, validateNotificationRuleInput, validateNotificationTemplateInput, type NotificationRuleInput, type NotificationTemplateInput } from "../src/lib/notification-rules-service";

test("QA: avisos manuales y reglas entregan solo al inbox propio y respetan condición/replay", { skip: process.env.QA_NOTIFICATION_RULES !== "1", timeout: 60_000 }, async () => {
  assert.notEqual(process.env.NODE_ENV, "production");
  const db = getDb();
  const tag = `qa-notification-rules-${crypto.randomUUID()}`;
  const eventType = `QA_AUDITORIA_${crypto.randomUUID()}`.toUpperCase();
  let ruleId: string | undefined, templateId: string | undefined;
  let ruleInput: NotificationRuleInput | undefined, templateInput: NotificationTemplateInput | undefined;
  let actor: { userId: string; role: string } | undefined;
  try {
    const [reference] = await db.select().from(reportSchedules).where(eq(reportSchedules.id, "report-schedule-e0115752-abcf-47af-a8e9-81716c52ce49"));
    assert.match(reference?.name ?? "", /^QA AUDITORÍA/);
    const [owner] = await db.select().from(users).where(eq(users.id, reference.createdBy));
    assert.equal(owner.status, "ACTIVE");
    actor = { userId: owner.id, role: owner.roleCode ?? owner.role };
    assert.ok(can(actor.role as AppRole, "operations.view"));
    const [preference] = await db.select().from(notificationPreferences).where(eq(notificationPreferences.userId, owner.id));
    for (const type of ["MANUAL", eventType]) assert.ok(isNotificationTypeEnabled(preference?.preferences, type), "No alterar preferencias personales para la prueba.");
    assert.equal((await db.select().from(notificationRules).where(eq(notificationRules.eventType, eventType))).length, 0);

    const manualInput = { title: " QA AUDITORÍA — aviso manual ", body: " Aviso interno QA, sin correo ni WhatsApp ", link: "https://example.test/qa", recipientRoles: [], recipientUserIds: [owner.id], dedupeKey: `${tag}-manual` };
    const manuals = await Promise.all([createManualNotification(manualInput, actor), createManualNotification(manualInput, actor)]);
    assert.equal(manuals.reduce((total, result) => total + result.deliveredCount, 0), 1);
    const manualRows = await db.select().from(notifications).where(eq(notifications.dedupeKey, `${tag}-manual`));
    assert.equal(manualRows.length, 1);
    assert.equal(manualRows[0].recipientId, owner.id);
    assert.equal(manualRows[0].link, null);
    assert.equal(manualRows[0].title, manualInput.title.trim());
    assert.equal((await db.select().from(auditLogs).where(and(eq(auditLogs.entityId, manualRows[0].id), eq(auditLogs.action, "notifications.manual_sent")))).length, 1);

    templateInput = validateNotificationTemplateInput({ name: `QA AUDITORÍA — ${tag}`, titleTemplate: "QA AUDITORÍA — {{entity.code}}", bodyTemplate: "Cliente {{customer.name}}: estado {{entity.status}}", linkTemplate: "/admin/notificaciones?qa={{entity.id}}", enabled: true });
    const template = await saveNotificationTemplate(templateInput, actor);
    templateId = template.id;
    ruleInput = validateNotificationRuleInput({ name: `QA AUDITORÍA — ${tag}`, eventType, status: "ACTIVE", severity: "INFO", audienceRoles: [], audienceUserIds: [owner.id], assigneeAudience: false, condition: { all: [{ field: "entity.status", operator: "eq", value: "QA_READY" }, { field: "entity.amount", operator: "gte", value: 2 }] }, templateId, cooldownSeconds: 0 });
    const rule = await saveNotificationRule(ruleInput, actor);
    ruleId = rule.id;
    const context = { eventType, entity: { id: `${tag}-entity`, code: "QA-REGLA", status: "QA_READY", amount: 2 }, customer: { name: "QA AUDITORÍA" } };
    assert.deepEqual(await dispatchNotificationEvent({ ...context, entity: { ...context.entity, amount: 1 } }), []);
    assert.deepEqual(await dispatchNotificationEvent({ ...context, entity: { ...context.entity, status: "QA_WAIT" } }), []);
    const triggered = await Promise.all([dispatchNotificationEvent(context), dispatchNotificationEvent(context)]);
    const ids = triggered.flat().flatMap(result => result.notificationIds);
    assert.equal(ids.length, 1);
    const [notification] = await db.select().from(notifications).where(eq(notifications.id, ids[0]));
    assert.equal(notification.recipientId, owner.id);
    assert.equal(notification.title, "QA AUDITORÍA — QA-REGLA");
    assert.equal(notification.body, "Cliente QA AUDITORÍA: estado QA_READY");
    assert.equal(notification.link, `/admin/notificaciones?qa=${tag}-entity`);
    assert.equal(notification.metadata?.ruleId, ruleId);
    assert.deepEqual(await dispatchNotificationEvent(context), []);
    assert.equal((await db.select().from(auditLogs).where(and(eq(auditLogs.entityId, ruleId), eq(auditLogs.action, "notifications.rule_triggered")))).length, 1);
    await saveNotificationRule({ ...ruleInput, status: "INACTIVE" }, actor, ruleId);
    assert.deepEqual(await dispatchNotificationEvent({ ...context, entity: { ...context.entity, id: `${tag}-inactive` } }), []);
    console.log(JSON.stringify({ tag, manualNotificationId: manualRows[0].id, ruleId, templateId, ruleNotificationId: notification.id, duplicateDeliveries: 0, negativeConditions: 2, inactiveRuleDelivered: 0 }));
  } finally {
    // Leave only these QA automations disabled; retain internal inbox and audit evidence.
    try {
      if (actor && ruleId && ruleInput) assert.equal((await saveNotificationRule({ ...ruleInput, status: "INACTIVE" }, actor, ruleId)).status, "INACTIVE");
      if (actor && templateId && templateInput) assert.equal((await saveNotificationTemplate({ ...templateInput, enabled: false }, actor, templateId)).enabled, false);
    } finally { await closeDb(); }
  }
});
