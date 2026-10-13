import assert from "node:assert/strict";
import test from "node:test";
import { eq } from "drizzle-orm";
import { closeDb, getDb } from "../src/db";
import { auditLogs } from "../src/db/schema";
import { notifications } from "../src/db/operations-schema";
import { reportSchedules, reportScheduleRuns } from "../src/db/reporting-schema";
import { getNotificationDetail } from "../src/lib/notification-rules-service";

test("QA: cada aviso de reporte conserva la auditoría de su ejecución", { skip: process.env.QA_REPORT_ORIGIN !== "1", timeout: 60000 }, async () => {
  assert.notEqual(process.env.NODE_ENV, "production");
  const db = getDb();
  const tag = `qa-report-origin-${crypto.randomUUID()}`;
  try {
    const [reference] = await db.select().from(reportSchedules).where(eq(reportSchedules.id, "report-schedule-e0115752-abcf-47af-a8e9-81716c52ce49"));
    assert.match(reference?.name ?? "", /^QA AUDITORÍA/);
    const ownerId = reference.createdBy;
    await db.transaction(async (tx) => {
      await tx.insert(reportSchedules).values({ id: tag, name: `QA AUDITORÍA — Origen ${tag}`, frequency: "DAILY", nextRunAt: new Date(), status: "CANCELLED", idempotencyKey: tag, createdBy: ownerId, updatedBy: ownerId });
      for (let index = 0; index < 2; index++) {
        const scheduledFor = new Date(`2026-10-0${index + 1}T12:00:00.000Z`);
        const finishedAt = new Date(scheduledFor.getTime() + 60000);
        const runId = `${tag}-run-${index}`;
        await tx.insert(reportScheduleRuns).values({ id: runId, scheduleId: tag, scheduledFor, status: "SUCCEEDED", finishedAt, notificationCount: 1 });
        await tx.insert(auditLogs).values({ id: `${tag}-audit-${index}`, actorId: ownerId, actorRole: "SYSTEM", action: "reports.schedule_run_succeeded", entityType: "report_schedule", entityId: tag, metadata: { runId, qa: true }, createdAt: finishedAt });
        await tx.insert(notifications).values({ id: `${tag}-notification-${index}`, recipientId: ownerId, type: "SCHEDULED_REPORT", title: "QA AUDITORÍA — Origen de reporte", body: "Fixture para verificar asociación de auditoría; no ejecuta reportes.", state: "READ", readAt: finishedAt, createdAt: finishedAt, dedupeKey: `${tag}-${index}`, metadata: { scheduleId: tag, scheduledFor: scheduledFor.toISOString(), qa: true } });
      }
    });
    for (let index = 0; index < 2; index++) {
      const detail = await getNotificationDetail(`${tag}-notification-${index}`, ownerId);
      assert.equal(detail?.originKind, "report");
      assert.equal(detail?.origin?.action, "reports.schedule_run_succeeded");
      assert.equal(detail?.origin?.createdAt.toISOString(), `2026-10-0${index + 1}T12:01:00.000Z`);
      assert.equal(detail?.notification.state, "READ");
    }
    assert.equal(await getNotificationDetail(`${tag}-notification-0`, `${tag}-not-recipient`), null);
    // Keep the cancelled QA schedule and read fixtures as reproducible evidence.
  } finally {
    await closeDb();
  }
});
