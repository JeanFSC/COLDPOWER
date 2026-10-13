import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { createNotifications } from "../src/lib/notifications-service";

test("reportes: entrega transaccional conserva preferencias y normalización", async () => {
  for (const enabled of [false, true]) {
    let inserted: unknown[] = [];
    const transaction = {
      select: () => ({ from: () => ({ where: async () => [{ userId: "qa-owner", preferences: { SCHEDULED_REPORT: enabled } }] }) }),
      insert: () => ({ values: (values: unknown[]) => {
        inserted = values;
        return { onConflictDoNothing: () => ({ returning: async () => values }) };
      } }),
    } as unknown as NonNullable<Parameters<typeof createNotifications>[1]>;
    const result = await createNotifications([{ recipientId: "qa-owner", type: "SCHEDULED_REPORT", title: " Reporte QA ", body: " QA ", link: "/admin/reportes", dedupeKey: "qa-report" }], transaction);
    assert.equal(result.length, enabled ? 1 : 0);
    assert.equal(inserted.length, enabled ? 1 : 0);
    if (enabled) assert.equal((inserted[0] as { title: string }).title, "Reporte QA");
  }
});
import { REPORT_RUN_LEASE_MS, reportRunLeaseExpired } from "../src/lib/report-run-lease";

test("reportes: lease distingue ejecución vigente, expirada y sin fecha de inicio", () => {
  const now = new Date("2026-10-08T12:00:00Z");
  const createdAt = new Date(now.getTime() - REPORT_RUN_LEASE_MS);
  assert.equal(reportRunLeaseExpired({ startedAt: new Date(now.getTime() - REPORT_RUN_LEASE_MS + 1), createdAt }, now), false);
  assert.equal(reportRunLeaseExpired({ startedAt: createdAt, createdAt }, now), true);
  assert.equal(reportRunLeaseExpired({ startedAt: null, createdAt }, now), true);
  assert.equal(reportRunLeaseExpired({ startedAt: new Date(now.getTime() + 1), createdAt }, now), false);
  assert.equal(reportRunLeaseExpired({ startedAt: createdAt, createdAt }, new Date(NaN)), false);
});
import { reportExecutionPresentation } from "../src/lib/report-schedule-presentation";
import {
  getNextReportOccurrence,
  normalizeReportScheduleInput,
  reportScheduleFrequencies,
} from "../src/lib/reporting-service";

const root = process.cwd();
const read = (file: string) => readFileSync(`${root}/${file}`, "utf8");

test("reportes: frecuencias y siguiente ocurrencia son determinísticas", () => {
  assert.deepEqual(reportScheduleFrequencies, ["DAILY", "WEEKLY", "MONTHLY"]);
  const current = new Date("2026-01-31T14:00:00.000Z");
  assert.equal(getNextReportOccurrence(current, "DAILY").toISOString(), "2026-02-01T14:00:00.000Z");
  assert.equal(getNextReportOccurrence(current, "WEEKLY").toISOString(), "2026-02-07T14:00:00.000Z");
  assert.equal(getNextReportOccurrence(current, "MONTHLY").toISOString(), "2026-02-28T14:00:00.000Z");
});

test("reportes: el contrato valida filtros, fecha futura y destinatarios", () => {
  const next = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const result = normalizeReportScheduleInput({
    name: "Ventas semanales",
    frequency: "WEEKLY",
    firstRunAt: next,
    filters: { range: "current_month", currency: "PEN", unknown: "discarded" },
    recipientRoles: ["REPORTES", "NO_EXISTE"],
    recipientUserIds: ["user-1", "user-1"],
    idempotencyKey: "cp044-contract-test",
  });
  assert.equal(result.frequency, "WEEKLY");
  assert.equal(result.filters.range, "current_month");
  assert.equal(result.filters.currency, "PEN");
  assert.equal(result.filters.customerId, undefined);
  assert.deepEqual(result.recipientRoles, ["REPORTES"]);
  assert.deepEqual(result.recipientUserIds, ["user-1"]);
  assert.throws(() => normalizeReportScheduleInput({ ...result, firstRunAt: new Date(0).toISOString() }));
});

test("reportes: el flujo expone dominio, migración, API y UI persistentes", () => {
  for (const file of [
    "src/db/reporting-schema.ts",
    "src/lib/reporting-service.ts",
    "src/app/api/admin/reportes/programados/route.ts",
    "src/app/api/admin/reportes/programados/[id]/route.ts",
    "src/app/api/cron/gestion/route.ts",
    "src/components/admin/ReportScheduleControls.tsx",
    "drizzle/0042_cp044_report_schedules.sql",
  ]) assert.equal(existsSync(`${root}/${file}`), true, file);
  assert.match(read("src/app/admin/reportes/page.tsx"), /getReportSnapshot/);
  assert.doesNotMatch(read("src/app/admin/reportes/page.tsx"), /getOperationsDashboard/);
  assert.match(read("src/app/api/admin/reportes/programados/route.ts"), /reports\.export/);
  assert.match(read("src/lib/reporting-service.ts"), /reportScheduleRuns/);
  assert.match(read("src/lib/reporting-service.ts"), /processDueReportSchedules/);
  assert.match(read("src/lib/reporting-service.ts"), /for\("update"\)/);
  assert.match(read("src/app/api/cron/gestion/route.ts"), /CRON_SECRET/);
  assert.match(read("src/components/admin/ReportScheduleControls.tsx"), /INTERNAL|inbox interno/i);
  assert.match(read("src/components/admin/ReportScheduleControls.tsx"), /reportExecutionPresentation\(executionConfigured\)/);
  assert.match(read("src/app/admin/reportes/page.tsx"), /executionConfigured=\{Boolean\(process.env.CRON_SECRET\?\.trim\(\)\)\}/);
  assert.doesNotMatch(read("src/components/admin/ReportScheduleControls.tsx"), /Ejecución automática activa/);
});

test("reportes: an unavailable executor cannot be presented as active", () => {
  const unavailable = reportExecutionPresentation(false);
  assert.equal(unavailable.label, "Ejecución no habilitada");
  assert.match(unavailable.warning!, /aún no se entregará/);
  const configured = reportExecutionPresentation(true);
  assert.equal(configured.label, "Programaciones guardadas");
  assert.equal(configured.warning, null);
  assert.doesNotMatch(configured.label, /activa/i);
});
