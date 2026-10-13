import assert from "node:assert/strict";
import test from "node:test";
import { and, eq, lte } from "drizzle-orm";
import { closeDb, getDb } from "../src/db";
import { users } from "../src/db/schema";
import { notifications } from "../src/db/operations-schema";
import { reportSchedules, reportScheduleRuns } from "../src/db/reporting-schema";
import { can, type AppRole } from "../src/lib/roles";
import { cancelReportSchedule, createReportSchedule, getReportSnapshot, processDueReportSchedules } from "../src/lib/reporting-service";

test("QA: ejecutor antiguo y cancelación no producen entregas posteriores", {
  skip: process.env.QA_REPORT_WORKER !== "1",
  timeout: 60_000,
}, async () => {
  assert.notEqual(process.env.NODE_ENV, "production");
  const db = getDb();
  try {
    const [reference] = await db.select().from(reportSchedules).where(eq(reportSchedules.id, "report-schedule-e0115752-abcf-47af-a8e9-81716c52ce49"));
    assert.match(reference?.name ?? "", /^QA AUDITORÍA/);
    const [owner] = await db.select().from(users).where(eq(users.id, reference.createdBy));
    assert.equal(owner.status, "ACTIVE");
    const actor = { userId: owner.id, role: (owner.roleCode ?? owner.role) as AppRole };
    assert.ok(can(actor.role, "reports.view"));
    for (const mode of ["late_success", "late_failure", "cancelled"] as const) {
      let fixtureId: string | undefined;
      let release = () => {};
      let oldProcess: ReturnType<typeof processDueReportSchedules> | undefined;
      try {
        const scheduledFor = new Date(Date.now() + 15_000);
        const firstClock = new Date(scheduledFor.getTime() + 1);
        const nextClock = new Date(firstClock.getTime() + 16 * 60_000);
        const tag = `qa-report-fence-${mode}-${crypto.randomUUID()}`;
        const created = await createReportSchedule({ name: `QA AUDITORÍA — ${mode}`, frequency: "DAILY", firstRunAt: scheduledFor.toISOString(), filters: { customerId: "customer-fa428e1e-cb3a-40ac-86ea-ac3fceb38acd", currency: "PEN" }, recipientRoles: [], recipientUserIds: [], idempotencyKey: tag }, actor);
        fixtureId = created.schedule.id;
        const candidates = await db.select({ id: reportSchedules.id }).from(reportSchedules).where(and(eq(reportSchedules.status, "ACTIVE"), lte(reportSchedules.nextRunAt, nextClock)));
        assert.deepEqual(candidates.map(schedule => schedule.id), [fixtureId]);
        let signalEntered!: () => void;
        const entered = new Promise<void>(resolve => { signalEntered = resolve; });
        const gate = new Promise<void>(resolve => { release = resolve; });
        oldProcess = processDueReportSchedules(firstClock, async (...args) => {
          signalEntered();
          await gate;
          if (mode === "late_failure") throw new Error("QA AUDITORÍA — Fallo tardío simulado");
          return getReportSnapshot(...args);
        });
        await Promise.race([entered, oldProcess.then(() => { throw new Error("El procesador no llegó a cargar el snapshot QA."); })]);
        if (mode === "cancelled") await cancelReportSchedule(fixtureId, actor);
        else assert.equal((await processDueReportSchedules(nextClock)).succeeded, 1);
        release();
        const obsolete = await oldProcess;
        assert.equal(obsolete.succeeded, 0);
        assert.equal(obsolete.failed, 0);
        const runs = await db.select().from(reportScheduleRuns).where(eq(reportScheduleRuns.scheduleId, fixtureId));
        assert.equal(runs.length, 1);
        assert.equal(runs[0].status, mode === "cancelled" ? "SKIPPED" : "SUCCEEDED");
        assert.equal(runs[0].notificationCount, mode === "cancelled" ? 0 : 1);
        const delivered = await db.select().from(notifications).where(eq(notifications.dedupeKey, `report-schedule:${fixtureId}:${scheduledFor.toISOString()}`));
        assert.equal(delivered.length, mode === "cancelled" ? 0 : 1);
        console.log(JSON.stringify({ mode, qaScheduleId: fixtureId, finalStatus: runs[0].status, notifications: delivered.length }));
      } finally {
        release();
        await oldProcess?.catch(() => undefined);
        if (fixtureId) await cancelReportSchedule(fixtureId, actor);
      }
    }
  } finally { await closeDb(); }
});

test("QA: recupera reporte interrumpido sin duplicar una entrega previa", {
  skip: process.env.QA_REPORT_WORKER !== "1",
  timeout: 60_000,
}, async () => {
  assert.notEqual(process.env.NODE_ENV, "production");
  const db = getDb();
  let fixtureId: string | undefined;
  let actor: { userId: string; role: AppRole } | undefined;
  try {
    const [reference] = await db.select().from(reportSchedules).where(eq(reportSchedules.id, "report-schedule-e0115752-abcf-47af-a8e9-81716c52ce49"));
    assert.match(reference?.name ?? "", /^QA AUDITORÍA/);
    const [owner] = await db.select().from(users).where(eq(users.id, reference.createdBy));
    assert.equal(owner.status, "ACTIVE");
    actor = { userId: owner.id, role: (owner.roleCode ?? owner.role) as AppRole };
    assert.ok(can(actor.role, "reports.view"));
    const now = new Date();
    const scheduledFor = new Date(now.getTime() - 30 * 60_000);
    const tag = `qa-report-recovery-${crypto.randomUUID()}`;
    const created = await createReportSchedule({ name: "QA AUDITORÍA — Recuperación tras interrupción", frequency: "DAILY", firstRunAt: new Date(now.getTime() + 15_000).toISOString(), filters: { customerId: "customer-fa428e1e-cb3a-40ac-86ea-ac3fceb38acd", currency: "PEN" }, recipientRoles: [], recipientUserIds: [], idempotencyKey: tag }, actor);
    fixtureId = created.schedule.id;
    await db.update(reportSchedules).set({ nextRunAt: scheduledFor }).where(eq(reportSchedules.id, fixtureId));
    const candidates = await db.select({ id: reportSchedules.id }).from(reportSchedules).where(and(eq(reportSchedules.status, "ACTIVE"), lte(reportSchedules.nextRunAt, now)));
    assert.deepEqual(candidates.map(schedule => schedule.id), [fixtureId]);
    const runId = `${tag}-run`;
    await db.insert(reportScheduleRuns).values({ id: runId, scheduleId: fixtureId, scheduledFor, status: "RUNNING", filterSnapshot: created.schedule.filters, startedAt: new Date(now.getTime() - 60_000), createdAt: scheduledFor });
    assert.deepEqual(await processDueReportSchedules(now), { processed: 0, succeeded: 0, failed: 0 }, "No tomar una ejecución reciente que sigue trabajando.");
    await db.update(reportScheduleRuns).set({ startedAt: scheduledFor }).where(eq(reportScheduleRuns.id, runId));
    const dedupeKey = `report-schedule:${fixtureId}:${scheduledFor.toISOString()}`;
    const notificationId = `${tag}-notification`;
    await db.insert(notifications).values({ id: notificationId, recipientId: owner.id, type: "SCHEDULED_REPORT", title: "QA AUDITORÍA — Entrega previa a interrupción", body: "Fixture QA de entrega interna previa al cierre de una ejecución.", dedupeKey, link: "/admin/reportes", metadata: { scheduleId: fixtureId, qa: true } });
    const results = await Promise.all([processDueReportSchedules(now), processDueReportSchedules(now)]);
    assert.equal(results.reduce((total, result) => total + result.succeeded, 0), 1);
    const runs = await db.select().from(reportScheduleRuns).where(eq(reportScheduleRuns.scheduleId, fixtureId));
    assert.equal(runs.length, 1);
    assert.equal(runs[0].status, "SUCCEEDED");
    assert.equal(runs[0].notificationCount, 1);
    const delivered = await db.select().from(notifications).where(eq(notifications.dedupeKey, dedupeKey));
    assert.equal(delivered.length, 1);
    assert.equal(delivered[0].id, notificationId);
    console.log(JSON.stringify({ recoveredScheduleId: fixtureId, recoveredRunId: runId, preservedNotificationId: notificationId }));
  } finally {
    try { if (fixtureId && actor) await cancelReportSchedule(fixtureId, actor); }
    finally { await closeDb(); }
  }
});

test("QA: ejecución concurrente de reporte entrega una sola notificación interna", {
  skip: process.env.QA_REPORT_WORKER !== "1",
  timeout: 60_000,
}, async () => {
  assert.notEqual(process.env.NODE_ENV, "production");
  const db = getDb();
  let fixtureId: string | undefined;
  let actor: { userId: string; role: AppRole } | undefined;
  try {
    // The previously created QA schedule identifies the requesting user's inbox.
    const [reference] = await db.select().from(reportSchedules).where(eq(reportSchedules.id, "report-schedule-e0115752-abcf-47af-a8e9-81716c52ce49"));
    assert.match(reference?.name ?? "", /^QA AUDITORÍA/);
    const [owner] = await db.select().from(users).where(eq(users.id, reference.createdBy));
    assert.equal(owner?.status, "ACTIVE");
    const role = (owner.roleCode ?? owner.role) as AppRole;
    assert.ok(can(role, "reports.view"));
    actor = { userId: owner.id, role };
    const scheduledFor = new Date(Date.now() + 15_000);
    const cutoff = new Date(scheduledFor.getTime() + 1);
    const tag = `qa-report-worker-${crypto.randomUUID()}`;
    const created = await createReportSchedule({ name: "QA AUDITORÍA — Ejecución y entrega interna", frequency: "DAILY", firstRunAt: scheduledFor.toISOString(), filters: { customerId: "customer-fa428e1e-cb3a-40ac-86ea-ac3fceb38acd", currency: "PEN" }, recipientRoles: [], recipientUserIds: [], idempotencyKey: tag }, actor);
    fixtureId = created.schedule.id;
    const candidates = await db.select({ id: reportSchedules.id }).from(reportSchedules).where(and(eq(reportSchedules.status, "ACTIVE"), lte(reportSchedules.nextRunAt, cutoff)));
    assert.deepEqual(candidates.map(schedule => schedule.id), [fixtureId], "No ejecutar un lote que incluya programaciones ajenas a esta fixture QA.");
    const results = await Promise.all([processDueReportSchedules(cutoff), processDueReportSchedules(cutoff)]);
    assert.equal(results.reduce((total, result) => total + result.succeeded, 0), 1);
    assert.equal(results.reduce((total, result) => total + result.failed, 0), 0);
    const runs = await db.select().from(reportScheduleRuns).where(eq(reportScheduleRuns.scheduleId, fixtureId));
    assert.equal(runs.length, 1);
    assert.equal(runs[0].status, "SUCCEEDED");
    assert.equal(runs[0].notificationCount, 1);
    const dedupeKey = `report-schedule:${fixtureId}:${scheduledFor.toISOString()}`;
    const delivered = await db.select().from(notifications).where(eq(notifications.dedupeKey, dedupeKey));
    assert.equal(delivered.length, 1);
    assert.equal(delivered[0].recipientId, owner.id);
    assert.equal(delivered[0].type, "SCHEDULED_REPORT");
    assert.match(delivered[0].title, /QA AUDITORÍA/);
    assert.match(delivered[0].link ?? "", /customerId=customer-fa428e1e-cb3a-40ac-86ea-ac3fceb38acd/);
    assert.deepEqual(await processDueReportSchedules(cutoff), { processed: 0, succeeded: 0, failed: 0 });
    const [schedule] = await db.select().from(reportSchedules).where(eq(reportSchedules.id, fixtureId));
    assert.ok(schedule.nextRunAt.getTime() > cutoff.getTime());
    console.log(JSON.stringify({ qaScheduleId: fixtureId, qaRunId: runs[0].id, internalNotificationId: delivered[0].id, concurrentExecutions: 2, successfulRuns: 1, duplicateNotifications: 0 }));
  } finally {
    // Keep the QA run, internal notification and append-only audit evidence.
    try { if (fixtureId && actor) await cancelReportSchedule(fixtureId, actor); }
    finally { await closeDb(); }
  }
});
