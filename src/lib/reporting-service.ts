import { and, count, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { auditLogs } from "@/db/schema";
import { reportScheduleRuns, reportSchedules } from "@/db/reporting-schema";
import {
  getOperationsDashboard,
  listReportOptions,
  type DashboardActor,
} from "@/lib/operations-dashboard";
import {
  dashboardFiltersToQuery,
  parseDashboardFilters,
  type DashboardFilters,
} from "@/lib/dashboard-contract";
import { allOperationalRoles, type AppRole } from "@/lib/roles";

export const reportScheduleFrequencies = ["DAILY", "WEEKLY", "MONTHLY"] as const;
export type ReportScheduleFrequency = (typeof reportScheduleFrequencies)[number];
export type ReportScheduleFilters = DashboardFilters;
export type ReportScheduleInput = {
  name: string;
  frequency: ReportScheduleFrequency;
  firstRunAt: Date;
  filters: ReportScheduleFilters;
  recipientRoles: string[];
  recipientUserIds: string[];
  idempotencyKey: string;
};
type ReportScheduleActor = { userId: string; role: AppRole };

function id(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function clean(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function uniqueStrings(value: unknown, max: number) {
  return Array.isArray(value)
    ? [
        ...new Set(
          value
            .filter((item): item is string => typeof item === "string")
            .map((item) => item.trim())
            .filter(Boolean),
        ),
      ].slice(0, max)
    : [];
}

function validateFilters(value: unknown): DashboardFilters {
  const input = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const query = new URLSearchParams();
  for (const key of [
    "range",
    "from",
    "to",
    "locationId",
    "sellerId",
    "customerId",
    "productId",
    "categoryId",
    "familyId",
    "brandId",
    "channel",
    "orderStatus",
    "currency",
    "granularity",
  ]) {
    if (typeof input[key] === "string" && input[key].trim()) query.set(key, input[key].trim());
  }
  return parseDashboardFilters(query);
}

function nextOccurrence(current: Date, frequency: ReportScheduleFrequency) {
  const next = new Date(current);
  if (frequency === "DAILY") next.setUTCDate(next.getUTCDate() + 1);
  else if (frequency === "WEEKLY") next.setUTCDate(next.getUTCDate() + 7);
  else {
    const day = next.getUTCDate();
    next.setUTCDate(1);
    next.setUTCMonth(next.getUTCMonth() + 1);
    const lastDay = new Date(
      Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0),
    ).getUTCDate();
    next.setUTCDate(Math.min(day, lastDay));
  }
  return next;
}

export function normalizeReportScheduleInput(
  value: unknown,
): Omit<ReportScheduleInput, "idempotencyKey"> & { idempotencyKey: string } {
  const input = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const name = clean(input.name, 160);
  const frequency = clean(input.frequency, 20);
  const firstRunAt =
    typeof input.firstRunAt === "string" ? new Date(input.firstRunAt) : new Date(NaN);
  if (!name) throw new Error("El nombre del reporte programado es obligatorio.");
  if (!reportScheduleFrequencies.includes(frequency as ReportScheduleFrequency))
    throw new Error("La frecuencia del reporte no es válida.");
  if (Number.isNaN(firstRunAt.getTime()) || firstRunAt.getTime() <= Date.now())
    throw new Error("La primera ejecución debe ser una fecha futura válida.");
  const recipientRoles = uniqueStrings(input.recipientRoles, 8).filter((role) =>
    allOperationalRoles.includes(role),
  );
  const recipientUserIds = uniqueStrings(input.recipientUserIds, 20);
  const idempotencyKey = clean(input.idempotencyKey, 180) || id("report-schedule-key");
  return {
    name,
    frequency: frequency as ReportScheduleFrequency,
    firstRunAt,
    filters: validateFilters(input.filters),
    recipientRoles,
    recipientUserIds,
    idempotencyKey,
  };
}

/**
 * Reporting owns this contract so pages and exports do not couple to the
 * operations route. The current source adapter reuses the validated sales
 * read model while the reporting projections are still being consolidated.
 */
export async function getReportSnapshot(filters: DashboardFilters = {}, actor?: DashboardActor) {
  return getOperationsDashboard(filters, actor);
}

export { listReportOptions };

export async function createReportSchedule(inputValue: unknown, actor: ReportScheduleActor) {
  const input = normalizeReportScheduleInput(inputValue);
  const db = getDb();
  const existing = await db
    .select()
    .from(reportSchedules)
    .where(eq(reportSchedules.idempotencyKey, input.idempotencyKey))
    .limit(1);
  if (existing[0]) return { schedule: existing[0], idempotent: true };

  const [schedule] = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(reportSchedules)
      .values({
        id: id("report-schedule"),
        name: input.name,
        reportKey: "operations-summary",
        frequency: input.frequency,
        filters: input.filters,
        recipientRoles: input.recipientRoles,
        recipientUserIds: [...new Set([...input.recipientUserIds, actor.userId])],
        nextRunAt: input.firstRunAt,
        status: "ACTIVE",
        idempotencyKey: input.idempotencyKey,
        createdBy: actor.userId,
        updatedBy: actor.userId,
      })
      .returning();
    if (!created) throw new Error("No se pudo persistir el reporte programado.");
    await tx.insert(auditLogs).values({
      id: id("audit"),
      actorId: actor.userId,
      actorRole: actor.role,
      action: "reports.schedule_created",
      entityType: "report_schedule",
      entityId: created.id,
      before: null,
      after: { ...created, filters: dashboardFiltersToQuery(input.filters).toString() },
      metadata: { frequency: input.frequency, delivery: "INTERNAL_INBOX" },
    });
    return [created];
  });
  return { schedule, idempotent: false };
}

export async function listReportSchedules(actor: ReportScheduleActor) {
  const db = getDb();
  const schedules = await db
    .select()
    .from(reportSchedules)
    .where(eq(reportSchedules.createdBy, actor.userId))
    .orderBy(desc(reportSchedules.updatedAt))
    .limit(50);
  if (!schedules.length) return [];
  const ids = schedules.map((schedule) => schedule.id);
  const runCounts = await db
    .select({ scheduleId: reportScheduleRuns.scheduleId, count: count() })
    .from(reportScheduleRuns)
    .where(inArray(reportScheduleRuns.scheduleId, ids))
    .groupBy(reportScheduleRuns.scheduleId);
  const lastRuns = await db
    .select()
    .from(reportScheduleRuns)
    .where(inArray(reportScheduleRuns.scheduleId, ids))
    .orderBy(desc(reportScheduleRuns.createdAt))
    .limit(100);
  const countById = new Map(runCounts.map((row) => [row.scheduleId, Number(row.count)]));
  const lastRunById = new Map<string, (typeof lastRuns)[number]>();
  for (const run of lastRuns)
    if (!lastRunById.has(run.scheduleId)) lastRunById.set(run.scheduleId, run);
  return schedules.map((schedule) => ({
    ...schedule,
    runCount: countById.get(schedule.id) ?? 0,
    lastRun: lastRunById.get(schedule.id) ?? null,
  }));
}

export async function cancelReportSchedule(scheduleId: string, actor: ReportScheduleActor) {
  const db = getDb();
  const [current] = await db
    .select()
    .from(reportSchedules)
    .where(and(eq(reportSchedules.id, scheduleId), eq(reportSchedules.createdBy, actor.userId)))
    .limit(1);
  if (!current) throw new Error("El reporte programado no existe o no te pertenece.");
  if (current.status === "CANCELLED") return current;
  const [updated] = await db.transaction(async (tx) => {
    const [row] = await tx
      .update(reportSchedules)
      .set({ status: "CANCELLED", updatedBy: actor.userId, updatedAt: new Date() })
      .where(and(eq(reportSchedules.id, scheduleId), eq(reportSchedules.createdBy, actor.userId)))
      .returning();
    if (!row) throw new Error("El reporte programado cambió antes de cancelarse.");
    await tx.insert(auditLogs).values({
      id: id("audit"),
      actorId: actor.userId,
      actorRole: actor.role,
      action: "reports.schedule_cancelled",
      entityType: "report_schedule",
      entityId: scheduleId,
      before: current,
      after: row,
      metadata: { delivery: "INTERNAL_INBOX" },
    });
    return [row];
  });
  return updated;
}

export function getNextReportOccurrence(current: Date, frequency: ReportScheduleFrequency) {
  return nextOccurrence(current, frequency);
}
