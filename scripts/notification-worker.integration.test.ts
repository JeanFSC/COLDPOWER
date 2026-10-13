import assert from "node:assert/strict";
import test from "node:test";
import { and, eq, lte } from "drizzle-orm";
import { closeDb, getDb } from "../src/db";
import { auditLogs, users } from "../src/db/schema";
import { notificationSchedules, notificationPreferences, notifications } from "../src/db/operations-schema";
import { reportSchedules } from "../src/db/reporting-schema";
import { isNotificationTypeEnabled } from "../src/lib/notification-preferences";
import { cancelNotificationSchedule, createNotificationSchedule, processDueNotificationSchedules } from "../src/lib/notification-rules-service";

test("QA: programación interna admite replay concurrente, entrega única y cancelación", { skip: process.env.QA_NOTIFICATION_WORKER !== "1", timeout: 60_000 }, async () => {
  assert.notEqual(process.env.NODE_ENV, "production");
  const db = getDb();
  const tag = `qa-notification-worker-${crypto.randomUUID()}`;
  const fixtureIds: string[] = [];
  try {
    const [reference] = await db.select().from(reportSchedules).where(eq(reportSchedules.id, "report-schedule-e0115752-abcf-47af-a8e9-81716c52ce49"));
    assert.match(reference?.name ?? "", /^QA AUDITORÍA/);
    const [owner] = await db.select().from(users).where(eq(users.id, reference.createdBy));
    assert.equal(owner.status, "ACTIVE");
    const [preference] = await db.select().from(notificationPreferences).where(eq(notificationPreferences.userId, owner.id));
    assert.ok(isNotificationTypeEnabled(preference?.preferences, "SCHEDULED"), "La prueba no altera preferencias personales desactivadas.");
    const actor = { userId: owner.id, role: owner.roleCode ?? owner.role };
    const input = { title: "QA AUDITORÍA — aviso interno de prueba", body: "QA AUDITORÍA — solo inbox propio, sin correo ni WhatsApp", link: "/admin/notificaciones", ruleId: null, templateId: null, recipientRoles: [], recipientUserIds: [owner.id], scheduledAt: new Date(Date.now() + 60 * 60_000), idempotencyKey: tag };
    const creations = await Promise.allSettled([1, 2].map(() => createNotificationSchedule(input, actor)));
    const persisted = await db.select().from(notificationSchedules).where(eq(notificationSchedules.idempotencyKey, tag));
    fixtureIds.push(...persisted.map(row => row.id));
    console.log(JSON.stringify({ tag, concurrentCreates: creations.map(result => result.status), persistedSchedules: persisted.length }));
    assert.equal(creations.filter(result => result.status === "fulfilled").length, 2);
    assert.equal(persisted.length, 1);
    const schedule = persisted[0];
    assert.equal(creations.filter(result => result.status === "fulfilled" && result.value.idempotent).length, 1);
    const creationAudit = await db.select().from(auditLogs).where(and(eq(auditLogs.entityId, schedule.id), eq(auditLogs.action, "notifications.schedule_created")));
    assert.equal(creationAudit.length, 1);
    const replay = await createNotificationSchedule(input, actor);
    assert.equal(replay.schedule.id, schedule.id);
    assert.equal(replay.idempotent, true);
    const clock = new Date();
    await db.update(notificationSchedules).set({ scheduledAt: new Date(clock.getTime() - 60_000) }).where(eq(notificationSchedules.id, schedule.id));
    const due = await db.select({ id: notificationSchedules.id }).from(notificationSchedules).where(and(eq(notificationSchedules.status, "SCHEDULED"), lte(notificationSchedules.scheduledAt, clock)));
    assert.deepEqual(due.map(row => row.id), [schedule.id], "No procesar programaciones ajenas a esta fixture.");
    const workers = await Promise.all([processDueNotificationSchedules(clock), processDueNotificationSchedules(clock)]);
    assert.equal(workers.reduce((total, result) => total + result.delivered, 0), 1);
    const delivered = await db.select().from(notifications).where(eq(notifications.dedupeKey, `schedule:${schedule.id}`));
    assert.equal(delivered.length, 1);
    assert.equal(delivered[0].recipientId, owner.id);
    assert.equal((await db.select().from(notificationSchedules).where(eq(notificationSchedules.id, schedule.id)))[0].status, "SENT");
    const sentAudit = await db.select().from(auditLogs).where(and(eq(auditLogs.entityId, schedule.id), eq(auditLogs.action, "notifications.schedule_sent")));
    assert.equal(sentAudit.length, 1);
    assert.equal((await processDueNotificationSchedules(clock)).delivered, 0);
    const cancelled = await createNotificationSchedule({ ...input, idempotencyKey: `${tag}-cancel` }, actor);
    fixtureIds.push(cancelled.schedule.id);
    await cancelNotificationSchedule(cancelled.schedule.id, actor);
    await db.update(notificationSchedules).set({ scheduledAt: new Date(clock.getTime() - 60_000) }).where(eq(notificationSchedules.id, cancelled.schedule.id));
    assert.equal((await processDueNotificationSchedules(clock)).delivered, 0);
    assert.equal((await db.select().from(notifications).where(eq(notifications.dedupeKey, `schedule:${cancelled.schedule.id}`))).length, 0);
    console.log(JSON.stringify({ tag, scheduleId: schedule.id, notificationId: delivered[0].id, cancelledId: cancelled.schedule.id, duplicateDeliveries: 0 }));
  } finally {
    for (const fixtureId of fixtureIds) {
      await db.update(notificationSchedules).set({ status: "CANCELLED", cancelledAt: new Date(), updatedAt: new Date() }).where(and(eq(notificationSchedules.id, fixtureId), eq(notificationSchedules.status, "SCHEDULED")));
    }
    // Keep inbox QA, completed/cancelled schedules and append-only audit evidence.
    await closeDb();
  }
});
