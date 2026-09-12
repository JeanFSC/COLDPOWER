import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
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
    "src/components/admin/ReportScheduleControls.tsx",
    "drizzle/0042_cp044_report_schedules.sql",
  ]) assert.equal(existsSync(`${root}/${file}`), true, file);
  assert.match(read("src/app/admin/reportes/page.tsx"), /getReportSnapshot/);
  assert.doesNotMatch(read("src/app/admin/reportes/page.tsx"), /getOperationsDashboard/);
  assert.match(read("src/app/api/admin/reportes/programados/route.ts"), /reports\.export/);
  assert.match(read("src/lib/reporting-service.ts"), /reportScheduleRuns/);
  assert.match(read("src/components/admin/ReportScheduleControls.tsx"), /INTERNAL|inbox interno/i);
});
