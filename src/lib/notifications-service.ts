import { and, count, desc, eq, gte, ilike, inArray, isNotNull, lt, or, type SQL } from "drizzle-orm";
import { getDb } from "@/db";
import { notifications, notificationPreferences } from "@/db/operations-schema";
import { users } from "@/db/schema";
import { notificationStates, type NotificationState } from "@/lib/operations-validation";
import { sanitizeAuditValue } from "@/lib/operational-semantics";
import { dispatchNotificationEvent } from "@/lib/notification-rules-service";
import { deltaPct, type PeriodKpi } from "@/lib/period-metrics";

export type NotificationFilters = { state?: NotificationState; type?: string; query?: string; dateFrom?: string; dateTo?: string; page?: number; pageSize?: number };
export class NotificationInvalidFilterError extends Error { constructor() { super("NOTIFICATION_INVALID_FILTER"); this.name = "NotificationInvalidFilterError"; } }
type Actor = { userId: string | null; role?: string | null };
export type NotificationInput = { type: string; title: string; body: string; link?: string | null; metadata?: Record<string, unknown> | null; recipientIds?: string[] };

const typeAliases: Record<string, string> = { PRODUCT_OUT_OF_STOCK: "INVENTORY_CRITICAL", STOCK_MINIMUM: "INVENTORY_LOW", TRANSFER_APPROVAL_PENDING: "TRANSFER_UPDATED" };
const targetRoles: Record<string, string[]> = { QUOTE_CREATED: ["GERENCIA", "OPERACIONES_VENTAS", "VENTAS", "SUPERADMIN"], LEAD_CREATED: ["GERENCIA", "OPERACIONES_VENTAS", "VENTAS", "SUPERADMIN"], PAYMENT_APPROVED: ["GERENCIA", "OPERACIONES_VENTAS", "SUPERADMIN"], PAYMENT_FAILED: ["GERENCIA", "OPERACIONES_VENTAS", "SUPERADMIN"], ORDER_CREATED: ["GERENCIA", "OPERACIONES_VENTAS", "VENTAS", "SUPERADMIN"], ORDER_READY: ["OPERACIONES_VENTAS", "ALMACEN", "SUPERADMIN"], SALE_CREATED: ["GERENCIA", "OPERACIONES_VENTAS", "VENTAS", "SUPERADMIN"], INVENTORY_LOW: ["ALMACEN", "COMPRAS", "GERENCIA", "SUPERADMIN"], INVENTORY_CRITICAL: ["ALMACEN", "GERENCIA", "SUPERADMIN"], FOLLOW_UP_OVERDUE: ["GERENCIA", "OPERACIONES_VENTAS", "VENTAS", "SUPERADMIN"], TRANSFER_UPDATED: ["ALMACEN", "GERENCIA", "SUPERADMIN"] };

function normalizeType(value: string) { const candidate = typeAliases[value.trim().toUpperCase()] ?? value.trim().toUpperCase(); return candidate.slice(0, 80); }
function safeLink(value?: string | null) { const link = value?.trim(); if (!link) return null; if (link.startsWith("/") && !link.startsWith("//")) return link.slice(0, 500); try { const url = new URL(link); return ["http:", "https:"].includes(url.protocol) ? url.toString().slice(0, 500) : null; } catch { return null; } }
function safeMetadata(value?: Record<string, unknown> | null) { const sanitized = sanitizeAuditValue(value ?? null); return sanitized && typeof sanitized === "object" && !Array.isArray(sanitized) ? sanitized as Record<string, unknown> : null; }
function normalizeInput(input: NotificationInput & { dedupeKey?: string | null }) { const type = normalizeType(input.type); const metadata = { ...(safeMetadata(input.metadata) ?? {}), ...(input.dedupeKey ? { dedupeKey: input.dedupeKey.slice(0, 240) } : {}) }; return { type, title: input.title.trim().slice(0, 180), body: input.body.trim().slice(0, 1000), link: safeLink(input.link), metadata: Object.keys(metadata).length ? metadata : null, dedupeKey: input.dedupeKey?.trim().slice(0, 240) || null }; }
function dayStart(value: string) { return new Date(`${value}T00:00:00-05:00`); }
function dayAfter(value: string) { return new Date(dayStart(value).getTime() + 86_400_000); }
export function parseNotificationFilters(params: URLSearchParams): NotificationFilters { const state = params.get("state")?.trim() || undefined; if (state && !(notificationStates as readonly string[]).includes(state)) throw new NotificationInvalidFilterError(); const page = params.get("page") ? Number(params.get("page")) : undefined; const pageSize = params.get("pageSize") ? Number(params.get("pageSize")) : undefined; if ((page !== undefined && (!Number.isInteger(page) || page < 1)) || (pageSize !== undefined && (!Number.isInteger(pageSize) || pageSize < 1))) throw new NotificationInvalidFilterError(); const dateFrom = params.get("dateFrom")?.trim() || undefined; const dateTo = params.get("dateTo")?.trim() || undefined; if ((dateFrom && !/^\d{4}-\d{2}-\d{2}$/.test(dateFrom)) || (dateTo && !/^\d{4}-\d{2}-\d{2}$/.test(dateTo)) || (dateFrom && dateTo && dateFrom > dateTo)) throw new NotificationInvalidFilterError(); return { state: state as NotificationState | undefined, type: params.get("type")?.trim() || undefined, query: params.get("query")?.trim() || undefined, dateFrom, dateTo, page, pageSize }; }
function filterWhere(recipientId: string, filters: NotificationFilters) { const conditions: SQL[] = [eq(notifications.recipientId, recipientId)]; if (filters.state) conditions.push(eq(notifications.state, filters.state)); if (filters.type) conditions.push(eq(notifications.type, normalizeType(filters.type))); if (filters.query) { const pattern = `%${filters.query}%`; conditions.push(or(ilike(notifications.title, pattern), ilike(notifications.body, pattern), ilike(notifications.type, pattern))!); } if (filters.dateFrom) conditions.push(gte(notifications.createdAt, dayStart(filters.dateFrom))); if (filters.dateTo) conditions.push(lt(notifications.createdAt, dayAfter(filters.dateTo))); return and(...conditions); }
export type NotificationPriority = "Alta" | "Media" | "Baja";
// Rule-triggered notifications already carry a real severity (metadata.severity, set by
// dispatchNotificationEvent) — map that straight across. Everything else (targetRoles
// fan-out, manual sends, schedules) never gets a severity, so fall back to a heuristic on
// the type string itself, same spirit as isFailedAction in the audit module: computed
// display classification, not a fabricated stored value.
const highPriorityType = /CRITICAL|FAILED|OVERDUE|URGENT|BLOCKED/i;
const mediumPriorityType = /PENDING|REVIEW|WARNING|LOW$/i;
export function priorityOf(notification: { type: string; metadata: Record<string, unknown> | null }): NotificationPriority {
  const severity = typeof notification.metadata?.severity === "string" ? notification.metadata.severity : null;
  if (severity === "CRITICAL") return "Alta";
  if (severity === "WARNING") return "Media";
  if (severity === "INFO") return "Baja";
  if (highPriorityType.test(notification.type)) return "Alta";
  if (mediumPriorityType.test(notification.type)) return "Media";
  return "Baja";
}

function mapNotification(row: typeof notifications.$inferSelect) { const metadata = safeMetadata(row.metadata); return { id: row.id, type: row.type, title: row.title, body: row.body, link: row.link, state: row.state, createdAt: row.createdAt, readAt: row.readAt, dismissedAt: row.dismissedAt, metadata, dedupeKey: row.dedupeKey, priority: priorityOf({ type: row.type, metadata }) }; }

// Real distinct types this recipient has actually received — backs the inbox's "Tipo"
// filter (replacing the mock's fake channel filter, which has no backing data at all).
export async function listNotificationTypes(recipientId: string) {
  const rows = await getDb().selectDistinct({ value: notifications.type }).from(notifications).where(eq(notifications.recipientId, recipientId)).orderBy(notifications.type);
  return rows.map((row) => row.value);
}

export async function getNotificationsPage(recipientId: string, filters: NotificationFilters = {}) { const pageSize = Math.min(100, Math.max(1, Math.floor(filters.pageSize ?? 25))); const page = Math.max(1, Math.floor(filters.page ?? 1)); const where = filterWhere(recipientId, filters); const db = getDb(); const globalUnread = db.select({ value: count() }).from(notifications).where(and(eq(notifications.recipientId, recipientId), eq(notifications.state, "UNREAD"))); const [rows, total, unreadCount, unread, read, dismissed] = await Promise.all([db.select().from(notifications).where(where).orderBy(desc(notifications.createdAt)).limit(pageSize).offset((page - 1) * pageSize), db.select({ value: count() }).from(notifications).where(where), globalUnread, db.select({ value: count() }).from(notifications).where(and(where, eq(notifications.state, "UNREAD"))), db.select({ value: count() }).from(notifications).where(and(where, eq(notifications.state, "READ"))), db.select({ value: count() }).from(notifications).where(and(where, eq(notifications.state, "DISMISSED")))]); const totalItems = Number(total[0]?.value ?? 0); return { items: rows.map(mapNotification), page: Math.min(page, Math.max(1, Math.ceil(totalItems / pageSize))), pageSize, totalItems, totalPages: Math.max(1, Math.ceil(totalItems / pageSize)), unreadCount: Number(unreadCount[0]?.value ?? 0), metrics: { unread: Number(unread[0]?.value ?? 0), read: Number(read[0]?.value ?? 0), dismissed: Number(dismissed[0]?.value ?? 0) } }; }
// "No leídas" KPI as a flow, not a raw gauge: notifications created for this recipient in
// the last 24h that are still unread right now, vs. the same for the previous 24h — so it
// pairs sensibly with a "vs. período anterior" delta (a bare unread-total snapshot has no
// real prior-period value to diff against without tracking history we don't have).
export async function getPersonalUnreadKpi(recipientId: string): Promise<PeriodKpi> {
  const db = getDb();
  const now = new Date();
  const windowStart = new Date(now.getTime() - 86_400_000);
  const windowPrevStart = new Date(windowStart.getTime() - 86_400_000);
  const [current, previous] = await Promise.all([
    db.select({ value: count() }).from(notifications).where(and(eq(notifications.recipientId, recipientId), eq(notifications.state, "UNREAD"), gte(notifications.createdAt, windowStart))),
    db.select({ value: count() }).from(notifications).where(and(eq(notifications.recipientId, recipientId), eq(notifications.state, "UNREAD"), gte(notifications.createdAt, windowPrevStart), lt(notifications.createdAt, windowStart))),
  ]);
  const currentValue = Number(current[0]?.value ?? 0);
  const previousValue = Number(previous[0]?.value ?? 0);
  return { current: currentValue, previous: previousValue, deltaPct: deltaPct(currentValue, previousValue) };
}

export async function getUnreadNotificationCount(recipientId: string) {
  const [row] = await getDb()
    .select({ value: count() })
    .from(notifications)
    .where(and(eq(notifications.recipientId, recipientId), eq(notifications.state, "UNREAD")));
  return Number(row?.value ?? 0);
}
export async function listNotifications(recipientId: string) { return (await getNotificationsPage(recipientId, { page: 1, pageSize: 100 })).items; }

export async function updateNotificationState(id: string, state: NotificationState, actor: Actor) { if (!actor.userId || !(notificationStates as readonly string[]).includes(state)) throw new Error("Notificación o estado no válido."); const patch = state === "READ" ? { state, readAt: new Date(), dismissedAt: null } : state === "DISMISSED" ? { state, dismissedAt: new Date(), readAt: null } : { state, readAt: null, dismissedAt: null }; const [updated] = await getDb().update(notifications).set(patch).where(and(eq(notifications.id, id), eq(notifications.recipientId, actor.userId))).returning(); if (!updated) throw new Error("Notificación no encontrada."); return mapNotification(updated); }
export async function bulkUpdateNotificationState(ids: string[], state: NotificationState, actor: Actor) { if (!actor.userId || !ids.length || ids.length > 200 || !(notificationStates as readonly string[]).includes(state)) throw new Error("Notificaciones o estado no válidos."); const patch = state === "READ" ? { state, readAt: new Date(), dismissedAt: null } : state === "DISMISSED" ? { state, dismissedAt: new Date(), readAt: null } : { state, readAt: null, dismissedAt: null }; const updated = await getDb().update(notifications).set(patch).where(and(eq(notifications.recipientId, actor.userId), inArray(notifications.id, ids))).returning(); return updated.map(mapNotification); }

async function staffIds(type: string) { const roles = targetRoles[type] ?? ["SUPERADMIN", "GERENCIA", "OPERACIONES_VENTAS"]; return getDb().select({ id: users.id }).from(users).where(and(eq(users.status, "ACTIVE"), isNotNull(users.roleCode), inArray(users.roleCode, roles as never[]))); }
async function dispatchConfiguredRule(input: NotificationInput, normalized: ReturnType<typeof normalizeInput>) {
  try {
    const metadata = safeMetadata(input.metadata);
    await dispatchNotificationEvent({
      eventType: normalized.type,
      entity: metadata,
      assigneeId: typeof metadata?.assigneeId === "string" ? metadata.assigneeId : null,
      link: normalized.link,
      fallbackTitle: normalized.title,
      fallbackBody: normalized.body,
    });
  } catch (error) {
    console.error("ColdPower: no se pudo evaluar una regla de notificación", error);
  }
}
export async function notifyStaff(input: NotificationInput) { const normalized = normalizeInput(input); const staff = await staffIds(normalized.type); const rows = await createNotifications(staff.map(({ id }) => ({ recipientId: id, ...normalized }))); await dispatchConfiguredRule(input, normalized); return rows; }
export async function notifyStaffOnce(input: NotificationInput & { dedupeKey: string }) {
  const normalized = normalizeInput(input);
  const staff = await staffIds(normalized.type);
  const explicitIds = [...new Set((input.recipientIds ?? []).filter((id) => /^[A-Za-z0-9_-]{1,160}$/.test(id)))];
  const explicit = explicitIds.length
    ? await getDb().select({ id: users.id }).from(users).where(and(eq(users.status, "ACTIVE"), inArray(users.id, explicitIds)))
    : [];
  const recipientIds = [...new Set([...staff.map(({ id }) => id), ...explicit.map(({ id }) => id)])];
  if (!recipientIds.length) { await dispatchConfiguredRule(input, normalized); return []; }
  const rows = await createNotifications(recipientIds.map((recipientId) => ({ recipientId, ...normalized })));
  await dispatchConfiguredRule(input, normalized);
  return rows;
}
export async function createNotifications(rows: Array<{ recipientId: string; type: string; title: string; body: string; link?: string | null; metadata?: Record<string, unknown> | null; dedupeKey?: string | null }>) { if (!rows.length) return []; const values = rows.map((row) => { const normalized = normalizeInput(row); return { id: `notification-${crypto.randomUUID()}`, recipientId: row.recipientId, type: normalized.type, title: normalized.title, body: normalized.body, link: normalized.link, metadata: normalized.metadata, dedupeKey: normalized.dedupeKey }; }); return getDb().insert(notifications).values(values).onConflictDoNothing({ target: [notifications.recipientId, notifications.dedupeKey] }).returning(); }
export async function getNotificationPreferences(userId: string) { const [row] = await getDb().select().from(notificationPreferences).where(eq(notificationPreferences.userId, userId)).limit(1); return row?.preferences ?? {}; }
export async function saveNotificationPreferences(userId: string, input: unknown) { const value = input && typeof input === "object" ? input as Record<string, unknown> : {}; const preferences = Object.fromEntries(Object.entries(value).filter(([key, setting]) => /^[A-Za-z0-9_.:-]{1,80}$/.test(key) && typeof setting === "boolean")) as Record<string, boolean>; const [existing] = await getDb().select({ userId: notificationPreferences.userId }).from(notificationPreferences).where(eq(notificationPreferences.userId, userId)).limit(1); const [row] = existing ? await getDb().update(notificationPreferences).set({ preferences, updatedAt: new Date() }).where(eq(notificationPreferences.userId, userId)).returning() : await getDb().insert(notificationPreferences).values({ userId, preferences }).returning(); return row.preferences; }
