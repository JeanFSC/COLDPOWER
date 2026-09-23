import { and, asc, count, desc, eq, gte, ilike, inArray, lt, or, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/db";
import { auditLogs, auditSavedFilters, users } from "@/db/schema";
import {
  auditSeverity, isSensitiveModule, moduleLabel, AUDIT_LOGIN_ACTION, AUDIT_INTEGRATION_MODULE,
  SENSITIVE_MODULES, ALL_SEVERITIES, type AuditFilters, type AuditListItem, type AuditPageResponse, type AuditKpi,
  type AuditTrendPoint, type AuditAlert, type AuditSavedFilter,
} from "@/lib/audit-contract";
import { geoLabel, browserLabel } from "@/lib/geo";
import { deltaPct } from "@/lib/period-metrics";
import { sanitizeAuditValue } from "@/lib/operational-semantics";

const defaultPageSize = 25;
const maxPageSize = 100;
const trendDays = 30;

function dayStart(value: string) { return new Date(`${value}T00:00:00-05:00`); }
function dayAfter(value: string) { return new Date(dayStart(value).getTime() + 86_400_000); }
function n(value: unknown) { return Number(value ?? 0); }

function whereAudit(filters: AuditFilters) {
  const conditions: SQL[] = [];
  if (filters.query) {
    const pattern = `%${filters.query}%`;
    conditions.push(or(ilike(auditLogs.id, pattern), ilike(auditLogs.action, pattern), ilike(auditLogs.entityType, pattern), ilike(auditLogs.entityId, pattern), ilike(auditLogs.actorId, pattern), ilike(auditLogs.module, pattern), ilike(auditLogs.origin, pattern))!);
  }
  if (filters.module) conditions.push(eq(auditLogs.module, filters.module));
  if (filters.action) conditions.push(eq(auditLogs.action, filters.action));
  if (filters.entityType) conditions.push(eq(auditLogs.entityType, filters.entityType));
  if (filters.entityId) conditions.push(eq(auditLogs.entityId, filters.entityId));
  if (filters.actorId) conditions.push(eq(auditLogs.actorId, filters.actorId));
  if (filters.actorRole) conditions.push(eq(auditLogs.actorRole, filters.actorRole));
  if (filters.severity) conditions.push(eq(auditLogs.severity, filters.severity));
  if (filters.origin) conditions.push(eq(auditLogs.origin, filters.origin));
  if (filters.dateFrom) conditions.push(gte(auditLogs.createdAt, dayStart(filters.dateFrom)));
  if (filters.dateTo) conditions.push(lt(auditLogs.createdAt, dayAfter(filters.dateTo)));
  return conditions.length ? and(...conditions) : undefined;
}

const failedCondition = or(ilike(auditLogs.action, "%failed%"), ilike(auditLogs.action, "%denied%"), ilike(auditLogs.action, "%invalid%"))!;
const sensitiveCondition = inArray(auditLogs.module, [...SENSITIVE_MODULES]);
const loginCondition = eq(auditLogs.action, AUDIT_LOGIN_ACTION);
const integrationErrorCondition = and(eq(auditLogs.module, AUDIT_INTEGRATION_MODULE), eq(auditLogs.severity, "WARNING"))!;
const criticalCondition = eq(auditLogs.severity, "CRITICAL");

function map(row: typeof auditLogs.$inferSelect): AuditListItem {
  const rawModule = row.module || row.action.split(".")[0] || "system";
  const metadata = sanitizeAuditValue(row.metadata) as Record<string, unknown> | null;
  const ip = typeof metadata?.ip === "string" ? metadata.ip : null;
  const userAgent = typeof metadata?.userAgent === "string" ? metadata.userAgent : null;
  // Most rows carry a raw ip/userAgent captured from the request and parsed here; login
  // rows from the Clerk webhook instead carry Clerk's own already-resolved browser/city/
  // country (see handleSessionCreated) — prefer whichever the write actually provided.
  const reportedBrowser = typeof metadata?.browser === "string" ? metadata.browser : null;
  const reportedCity = typeof metadata?.city === "string" ? metadata.city : null;
  const reportedCountry = typeof metadata?.country === "string" ? metadata.country : null;
  const computedGeo = geoLabel(ip);
  return {
    id: row.id, createdAt: row.createdAt, actorId: row.actorId, actorRole: row.actorRole, action: row.action,
    module: rawModule, moduleLabel: moduleLabel(rawModule, row.action, row.entityType), entityType: row.entityType, entityId: row.entityId,
    before: sanitizeAuditValue(row.before) as Record<string, unknown> | null, after: sanitizeAuditValue(row.after) as Record<string, unknown> | null,
    origin: row.origin ?? (typeof metadata?.origin === "string" ? metadata.origin : ip),
    requestId: row.requestId ?? (typeof metadata?.requestId === "string" ? metadata.requestId : null),
    correlationId: row.correlationId ?? (typeof metadata?.correlationId === "string" ? metadata.correlationId : null),
    metadata, severity: auditSeverity(row.action, row.severity), sensitive: isSensitiveModule(rawModule),
    ip, browserLabel: reportedBrowser ?? browserLabel(userAgent),
    geo: { city: reportedCity ?? computedGeo.city, country: reportedCountry ?? computedGeo.country },
    actorName: null, actorEmail: null,
  };
}

// Audit rows only store the actor's opaque Clerk user id; batch-resolve display
// name/email from `users` in one query per page instead of joining per row.
async function hydrateActors(items: AuditListItem[]): Promise<AuditListItem[]> {
  const ids = [...new Set(items.map((item) => item.actorId).filter((id): id is string => Boolean(id)))];
  if (!ids.length) return items;
  const actors = await getDb().select({ id: users.id, name: users.name, email: users.email }).from(users).where(inArray(users.id, ids));
  const byId = new Map(actors.map((actor) => [actor.id, actor]));
  return items.map((item) => {
    const actor = item.actorId ? byId.get(item.actorId) : undefined;
    return actor ? { ...item, actorName: actor.name, actorEmail: actor.email } : item;
  });
}

// A KPI's "previous period" mirrors the current window's length immediately before it —
// last 24h vs the 24h before that by default, or the filtered date range vs the equal-length
// range right before it when the user picked explicit dates. That is what "vs. período
// anterior" means for a window the user controls, not a hardcoded calendar day.
function resolvePeriod(filters: AuditFilters): { currentStart: Date; currentEnd: Date; previousStart: Date; previousEnd: Date } {
  const currentEnd = filters.dateTo ? dayAfter(filters.dateTo) : new Date();
  const currentStart = filters.dateFrom ? dayStart(filters.dateFrom) : new Date(currentEnd.getTime() - 86_400_000);
  const spanMs = currentEnd.getTime() - currentStart.getTime();
  return { currentStart, currentEnd, previousStart: new Date(currentStart.getTime() - spanMs), previousEnd: currentStart };
}

async function countWhere(where: SQL | undefined, extra: SQL, start: Date, end: Date): Promise<number> {
  const rows = await getDb().select({ total: count(auditLogs.id) }).from(auditLogs).where(and(where, extra, gte(auditLogs.createdAt, start), lt(auditLogs.createdAt, end)));
  return n(rows[0]?.total);
}

async function kpi(where: SQL | undefined, extra: SQL, period: ReturnType<typeof resolvePeriod>): Promise<AuditKpi> {
  const [current, previous] = await Promise.all([
    countWhere(where, extra, period.currentStart, period.currentEnd),
    countWhere(where, extra, period.previousStart, period.previousEnd),
  ]);
  return { current, previous, deltaPct: deltaPct(current, previous) };
}

const alwaysTrue = sql`true`;
const dayFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit" });

// A GROUP BY only returns days that had at least one row — plotting those directly
// would space a day with no events the same distance apart as an 11-day gap with
// none, badly distorting the timeline. Every day in [start, end) gets an explicit
// zero so the x-axis stays evenly spaced regardless of how sparse the data is.
function enumerateDays(start: Date, end: Date): string[] {
  const days: string[] = [];
  for (let t = start.getTime(); t < end.getTime(); t += 86_400_000) days.push(dayFormatter.format(new Date(t)));
  return days;
}

async function getTrend(where: SQL | undefined, period: ReturnType<typeof resolvePeriod>): Promise<AuditTrendPoint[]> {
  const start = new Date(Math.min(period.currentStart.getTime(), period.currentEnd.getTime() - trendDays * 86_400_000));
  const dayExpr = sql<string>`to_char(${auditLogs.createdAt} at time zone 'America/Lima', 'YYYY-MM-DD')`;
  const rows = await getDb()
    .select({
      day: dayExpr,
      total: count(auditLogs.id),
      critical: sql<string>`count(*) filter (where ${criticalCondition})`,
      failed: sql<string>`count(*) filter (where ${failedCondition})`,
      sensitive: sql<string>`count(*) filter (where ${sensitiveCondition})`,
      logins: sql<string>`count(*) filter (where ${loginCondition})`,
      integrationErrors: sql<string>`count(*) filter (where ${integrationErrorCondition})`,
    })
    .from(auditLogs)
    .where(and(where, gte(auditLogs.createdAt, start), lt(auditLogs.createdAt, period.currentEnd)))
    .groupBy(dayExpr)
    .orderBy(dayExpr);
  const byDay = new Map(rows.map((row) => [row.day, row]));
  return enumerateDays(start, period.currentEnd).map((day) => {
    const row = byDay.get(day);
    return { date: day, total: n(row?.total), critical: n(row?.critical), failed: n(row?.failed), sensitive: n(row?.sensitive), logins: n(row?.logins), integrationErrors: n(row?.integrationErrors) };
  });
}

// Dashed comparison line behind the trend chart: daily totals for the 30-day window
// immediately before the one shown. Only the total is needed (AdminLineChart's
// `previous` prop is a single reference series), and it is not required to line up
// day-for-day with the current series — the chart aligns both by relative position.
async function getPreviousTrendTotals(where: SQL | undefined, period: ReturnType<typeof resolvePeriod>): Promise<number[]> {
  const currentSpanStart = new Date(Math.min(period.currentStart.getTime(), period.currentEnd.getTime() - trendDays * 86_400_000));
  const spanMs = period.currentEnd.getTime() - currentSpanStart.getTime();
  const previousStart = new Date(currentSpanStart.getTime() - spanMs);
  const dayExpr = sql<string>`to_char(${auditLogs.createdAt} at time zone 'America/Lima', 'YYYY-MM-DD')`;
  const rows = await getDb()
    .select({ day: dayExpr, total: count(auditLogs.id) })
    .from(auditLogs)
    .where(and(where, gte(auditLogs.createdAt, previousStart), lt(auditLogs.createdAt, currentSpanStart)))
    .groupBy(dayExpr)
    .orderBy(dayExpr);
  const byDay = new Map(rows.map((row) => [row.day, row.total]));
  return enumerateDays(previousStart, currentSpanStart).map((day) => n(byDay.get(day)));
}

function buildAlerts(metrics: AuditPageResponse["metrics"]): AuditAlert[] {
  const alerts: AuditAlert[] = [];
  if (metrics.critical.current > 0) alerts.push({ tone: "red", title: `${metrics.critical.current} eventos críticos en las últimas 24 horas`, description: "Requieren revisión inmediata." });
  if (metrics.sensitive.current > 0) alerts.push({ tone: "amber", title: `${metrics.sensitive.current} cambios sensibles detectados`, description: "Incluye modificaciones en precios, permisos y configuraciones." });
  alerts.push({ tone: "blue", title: "Cumplimiento", description: "Todos los eventos se registran y conservan de forma permanente (append-only)." });
  if (metrics.critical.current === 0 && metrics.failed.current === 0) alerts.push({ tone: "emerald", title: "Sin anomalías de seguridad", description: "No se detectaron eventos críticos ni fallidos en el período." });
  return alerts;
}

// A handful of raw module spellings map to the same Spanish label (e.g. a seed
// script's naive `${entityType}s` pluralization vs. the app's own "inventory") —
// collapse those in the dropdown so the same label doesn't appear twice.
function dedupeModuleFacets(facets: Array<{ value: string; label: string }>): Array<{ value: string; label: string }> {
  const seen = new Map<string, { value: string; label: string }>();
  for (const facet of facets) if (!seen.has(facet.label)) seen.set(facet.label, facet);
  return [...seen.values()].sort((a, b) => a.label.localeCompare(b.label, "es"));
}

export async function getAuditPage(filters: AuditFilters = {}): Promise<AuditPageResponse> {
  const page = Math.max(1, Math.floor(filters.page ?? 1));
  const pageSize = Math.min(maxPageSize, Math.max(1, Math.floor(filters.pageSize ?? defaultPageSize)));
  const db = getDb();
  const where = whereAudit(filters);
  const period = resolvePeriod(filters);

  // Module facet is intentionally NOT scoped to `where` — it lists every module that
  // ever appears in the table so the dropdown (and whatever the user just picked)
  // never disappears just because the current filter combination matches zero rows.
  const [rows, totalRows, moduleFacets, events, critical, sensitive, logins, integrationErrors, failed, trend, trendPrevious] = await Promise.all([
    db.select().from(auditLogs).where(where).orderBy(desc(auditLogs.createdAt), asc(auditLogs.id)).limit(pageSize).offset((page - 1) * pageSize),
    db.select({ total: count(auditLogs.id) }).from(auditLogs).where(where),
    db.selectDistinct({ value: auditLogs.module }).from(auditLogs).orderBy(auditLogs.module),
    kpi(where, alwaysTrue, period),
    kpi(where, criticalCondition, period),
    kpi(where, sensitiveCondition, period),
    kpi(where, loginCondition, period),
    kpi(where, integrationErrorCondition, period),
    kpi(where, failedCondition, period),
    getTrend(where, period),
    getPreviousTrendTotals(where, period),
  ]);

  const totalItems = n(totalRows[0]?.total);
  const items = await hydrateActors(rows.map(map));
  const metrics = { events, critical, sensitive, logins, integrationErrors, failed };
  return {
    items,
    page: Math.min(page, Math.max(1, Math.ceil(totalItems / pageSize))),
    pageSize,
    totalItems,
    totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
    metrics,
    facets: {
      modules: dedupeModuleFacets(moduleFacets.flatMap((row) => row.value ? [{ value: row.value, label: moduleLabel(row.value, row.value, "") }] : [])),
      severities: [...ALL_SEVERITIES],
    },
    trend,
    trendPrevious,
    alerts: buildAlerts(metrics),
  };
}

export async function getAuditDetail(id: string): Promise<AuditListItem | null> {
  const [row] = await getDb().select().from(auditLogs).where(eq(auditLogs.id, id)).limit(1);
  if (!row) return null;
  const [hydrated] = await hydrateActors([map(row)]);
  return hydrated;
}

// "Related events" = other rows sharing this event's correlation id (the same logical
// operation across services), falling back to other rows against the same entity when
// no correlation id was captured. Real join on existing columns, not a new relation.
export async function getRelatedAuditEvents(event: AuditListItem, limit = 5): Promise<AuditListItem[]> {
  const db = getDb();
  const condition = event.correlationId
    ? and(eq(auditLogs.correlationId, event.correlationId), sql`${auditLogs.id} <> ${event.id}`)
    : and(eq(auditLogs.entityType, event.entityType), eq(auditLogs.entityId, event.entityId), sql`${auditLogs.id} <> ${event.id}`);
  const rows = await db.select().from(auditLogs).where(condition).orderBy(desc(auditLogs.createdAt)).limit(limit);
  return hydrateActors(rows.map(map));
}

export async function listSavedAuditFilters(ownerId: string): Promise<AuditSavedFilter[]> {
  const rows = await getDb().select().from(auditSavedFilters).where(eq(auditSavedFilters.ownerId, ownerId)).orderBy(desc(auditSavedFilters.createdAt)).limit(20);
  return rows.map((row) => ({ id: row.id, name: row.name, filters: row.filters, createdAt: row.createdAt }));
}

export async function createSavedAuditFilter(ownerId: string, name: string, filters: Record<string, unknown>): Promise<AuditSavedFilter> {
  const [row] = await getDb().insert(auditSavedFilters).values({ id: `audit-filter-${crypto.randomUUID()}`, ownerId, name, filters }).returning();
  return { id: row.id, name: row.name, filters: row.filters, createdAt: row.createdAt };
}

export async function deleteSavedAuditFilter(ownerId: string, id: string) {
  const [row] = await getDb().delete(auditSavedFilters).where(and(eq(auditSavedFilters.ownerId, ownerId), eq(auditSavedFilters.id, id))).returning({ id: auditSavedFilters.id });
  return Boolean(row);
}
