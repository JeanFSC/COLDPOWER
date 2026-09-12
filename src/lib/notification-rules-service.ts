import { and, count, desc, eq, gte, inArray, lt, lte, or, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { auditLogs, users } from "@/db/schema";
import {
  notificationRules,
  notificationSchedules,
  notificationTemplates,
  notifications,
} from "@/db/operations-schema";
import { sanitizeAuditValue } from "@/lib/operational-semantics";

export const notificationSeverities = ["INFO", "WARNING", "CRITICAL"] as const;
export type NotificationSeverity = (typeof notificationSeverities)[number];
export const notificationTemplateVariables = [
  "entity.id",
  "entity.code",
  "entity.title",
  "entity.status",
  "customer.name",
  "product.sku",
  "order.code",
  "quote.code",
  "actor.name",
] as const;
export type NotificationTemplateVariable = (typeof notificationTemplateVariables)[number];
export type NotificationCondition =
  | {
      field: string;
      operator: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "in";
      value: string | number | boolean | string[];
    }
  | { all: NotificationCondition[] }
  | { any: NotificationCondition[] };
export type NotificationTemplateInput = {
  name: string;
  titleTemplate: string;
  bodyTemplate: string;
  linkTemplate: string | null;
  variables?: string[];
  enabled?: boolean;
};
export type NotificationRuleInput = {
  name: string;
  eventType: string;
  status: "ACTIVE" | "INACTIVE";
  severity: NotificationSeverity;
  audienceRoles: string[];
  audienceUserIds: string[];
  assigneeAudience: boolean;
  condition: NotificationCondition;
  templateId: string | null;
  cooldownSeconds: number;
};
export type NotificationScheduleInput = {
  ruleId: string | null;
  templateId: string | null;
  title: string;
  body: string;
  link: string | null;
  recipientRoles: string[];
  recipientUserIds: string[];
  scheduledAt: Date;
  idempotencyKey: string | null;
};
type Actor = { userId: string | null; role?: string | null };

function id(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}
function clean(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}
function safeLink(value: string | null | undefined) {
  const link = value?.trim();
  if (!link) return null;
  if (link.startsWith("/") && !link.startsWith("//")) return link.slice(0, 500);
  try {
    const url = new URL(link);
    return ["http:", "https:"].includes(url.protocol) ? url.toString().slice(0, 500) : null;
  } catch {
    return null;
  }
}
function audit(
  actor: Actor,
  action: string,
  entityType: string,
  entityId: string,
  before: unknown,
  after: unknown,
) {
  return {
    id: id("audit"),
    actorId: actor.userId,
    actorRole: actor.role ?? null,
    action,
    entityType,
    entityId,
    before: sanitizeAuditValue(before) as Record<string, unknown> | null,
    after: sanitizeAuditValue(after) as Record<string, unknown> | null,
    metadata: null,
  };
}

function validateVariables(value: string) {
  const variables = [...value.matchAll(/\{\{\s*([A-Za-z0-9_.]+)\s*\}\}/g)].map((match) => match[1]);
  const allowed = new Set(notificationTemplateVariables);
  if (variables.some((variable) => !allowed.has(variable as NotificationTemplateVariable)))
    throw new Error("La plantilla contiene una variable no permitida.");
  return [...new Set(variables)];
}

function validateCondition(condition: unknown, depth = 0): NotificationCondition {
  if (!condition || typeof condition !== "object" || depth > 3)
    throw new Error("La condición declarativa no es válida.");
  const value = condition as Record<string, unknown>;
  if (Array.isArray(value.all) || Array.isArray(value.any)) {
    const key = Array.isArray(value.all) ? "all" : "any";
    const children = value[key] as unknown[];
    if (!children.length || children.length > 10)
      throw new Error("La condición necesita entre 1 y 10 reglas.");
    return {
      [key]: children.map((child) => validateCondition(child, depth + 1)),
    } as NotificationCondition;
  }
  const field = clean(value.field, 80);
  const operator = clean(value.operator, 10);
  const allowedFields = new Set([
    "entity.status",
    "entity.type",
    "entity.amount",
    "entity.ageDays",
    "inventory.available",
    "payment.difference",
    "order.status",
  ]);
  if (
    !allowedFields.has(field) ||
    !["eq", "neq", "gt", "gte", "lt", "lte", "in"].includes(String(value.operator))
  )
    throw new Error("Campo u operador de condición no permitido.");
  const conditionValue = value.value;
  if (
    !["string", "number", "boolean"].includes(typeof conditionValue) &&
    !(Array.isArray(conditionValue) && conditionValue.every((item) => typeof item === "string"))
  )
    throw new Error("Valor de condición no válido.");
  return {
    field,
    operator: String(operator) as "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "in",
    value: conditionValue as string | number | boolean | string[],
  };
}

export function validateNotificationTemplateInput(input: unknown): NotificationTemplateInput {
  const value = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const name = clean(value.name, 160);
  const titleTemplate = clean(value.titleTemplate, 180);
  const bodyTemplate = clean(value.bodyTemplate, 1000);
  const rawLinkTemplate = clean(value.linkTemplate, 500) || null;
  const linkTemplate =
    rawLinkTemplate?.startsWith("/") && !rawLinkTemplate.startsWith("//")
      ? rawLinkTemplate
      : safeLink(rawLinkTemplate);
  if (!name || !titleTemplate || !bodyTemplate)
    throw new Error("Nombre, título y cuerpo son obligatorios.");
  const variables = [
    ...new Set([
      ...validateVariables(titleTemplate),
      ...validateVariables(bodyTemplate),
      ...validateVariables(clean(value.linkTemplate, 500)),
    ]),
  ];
  return {
    name,
    titleTemplate,
    bodyTemplate,
    linkTemplate,
    variables,
    enabled: value.enabled !== false,
  };
}

export function validateNotificationRuleInput(input: unknown): NotificationRuleInput {
  const value = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const name = clean(value.name, 160);
  const eventType = clean(value.eventType, 80).toUpperCase();
  const status = clean(value.status, 20) || "ACTIVE";
  const severity = clean(value.severity, 20) || "INFO";
  const audienceRoles = Array.isArray(value.audienceRoles)
    ? value.audienceRoles
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim().slice(0, 60))
        .filter(Boolean)
        .slice(0, 20)
    : [];
  const audienceUserIds = Array.isArray(value.audienceUserIds)
    ? value.audienceUserIds
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim().slice(0, 160))
        .filter(Boolean)
        .slice(0, 200)
    : [];
  const cooldownSeconds = Number(value.cooldownSeconds ?? 0);
  if (
    !name ||
    !eventType ||
    !["ACTIVE", "INACTIVE"].includes(status) ||
    !(notificationSeverities as readonly string[]).includes(severity) ||
    !Number.isInteger(cooldownSeconds) ||
    cooldownSeconds < 0 ||
    cooldownSeconds > 2_592_000
  )
    throw new Error("La regla de notificación no es válida.");
  return {
    name,
    eventType,
    status: status as "ACTIVE" | "INACTIVE",
    severity: severity as NotificationSeverity,
    audienceRoles,
    audienceUserIds,
    assigneeAudience: value.assigneeAudience === true,
    condition: validateCondition(
      value.condition ?? { field: "entity.status", operator: "eq", value: "ACTIVE" },
    ),
    templateId:
      typeof value.templateId === "string" && value.templateId.trim()
        ? value.templateId.trim()
        : null,
    cooldownSeconds,
  };
}

export type NotificationEventContext = {
  eventType: string;
  entity?: Record<string, unknown> | null;
  customer?: Record<string, unknown> | null;
  product?: Record<string, unknown> | null;
  order?: Record<string, unknown> | null;
  quote?: Record<string, unknown> | null;
  actor?: Record<string, unknown> | null;
  inventory?: Record<string, unknown> | null;
  payment?: Record<string, unknown> | null;
  assigneeId?: string | null;
  link?: string | null;
  fallbackTitle?: string;
  fallbackBody?: string;
};

function contextValue(context: NotificationEventContext, field: string) {
  const [scope, key] = field.split(".");
  const source =
    scope === "entity"
      ? context.entity
      : scope === "customer"
        ? context.customer
        : scope === "product"
          ? context.product
          : scope === "order"
            ? context.order
            : scope === "quote"
              ? context.quote
              : scope === "actor"
                ? context.actor
                : scope === "inventory"
                  ? context.inventory
                  : scope === "payment"
                    ? context.payment
                    : null;
  return source && key ? source[key] : undefined;
}

function conditionMatches(
  condition: NotificationCondition,
  context: NotificationEventContext,
): boolean {
  if ("all" in condition) return condition.all.every((child) => conditionMatches(child, context));
  if ("any" in condition) return condition.any.some((child) => conditionMatches(child, context));
  const actual = contextValue(context, condition.field);
  const expected = condition.value;
  if (condition.operator === "in")
    return Array.isArray(expected) && expected.some((value) => String(value) === String(actual));
  if (condition.operator === "eq")
    return actual === expected || String(actual) === String(expected);
  if (condition.operator === "neq")
    return !(actual === expected || String(actual) === String(expected));
  if (typeof actual !== "number" || typeof expected === "boolean" || Array.isArray(expected))
    return false;
  const numericExpected = Number(expected);
  if (!Number.isFinite(numericExpected)) return false;
  if (condition.operator === "gt") return actual > numericExpected;
  if (condition.operator === "gte") return actual >= numericExpected;
  if (condition.operator === "lt") return actual < numericExpected;
  return actual <= numericExpected;
}

function templateValue(context: NotificationEventContext, variable: string) {
  const [scope, key] = variable.split(".");
  return contextValue(context, `${scope}.${key}`) ?? "";
}

function renderTemplate(value: string, context: NotificationEventContext) {
  return value.replace(/\{\{\s*([A-Za-z0-9_.]+)\s*\}\}/g, (_match, variable: string) =>
    String(templateValue(context, variable)),
  );
}

export async function dispatchNotificationEvent(context: NotificationEventContext) {
  const eventType = context.eventType.trim().toUpperCase();
  if (!eventType) return [];
  const db = getDb();
  const rules = await db
    .select()
    .from(notificationRules)
    .where(and(eq(notificationRules.eventType, eventType), eq(notificationRules.status, "ACTIVE")))
    .limit(100);
  const delivered: Array<{ ruleId: string; notificationIds: string[] }> = [];
  for (const rule of rules) {
    const condition = rule.condition as unknown as NotificationCondition;
    if (!conditionMatches(condition, context)) continue;
    const template = rule.templateId
      ? (
          await db
            .select()
            .from(notificationTemplates)
            .where(
              and(
                eq(notificationTemplates.id, rule.templateId),
                eq(notificationTemplates.enabled, true),
              ),
            )
            .limit(1)
        )[0]
      : null;
    const entityId = String(context.entity?.id ?? context.entity?.code ?? eventType);
    const bucket =
      rule.cooldownSeconds > 0 ? Math.floor(Date.now() / (rule.cooldownSeconds * 1000)) : 0;
    const dedupeKey = `rule:${rule.id}:${entityId}:${bucket}`;
    const result = await db.transaction(async (tx) => {
      const recipients = await recipientIds(
        rule.audienceRoles,
        [
          ...rule.audienceUserIds,
          ...(rule.assigneeAudience && context.assigneeId ? [context.assigneeId] : []),
        ],
        tx,
      );
      if (!recipients.length) return [];
      const rows = await tx
        .insert(notifications)
        .values(
          recipients.map((recipientId) => ({
            id: id("notification"),
            recipientId,
            type: eventType,
            title: renderTemplate(
              template?.titleTemplate ?? context.fallbackTitle ?? rule.name,
              context,
            ).slice(0, 180),
            body: renderTemplate(
              template?.bodyTemplate ?? context.fallbackBody ?? `Evento ${eventType}`,
              context,
            ).slice(0, 1000),
            link: safeLink(renderTemplate(template?.linkTemplate ?? context.link ?? "", context)),
            metadata: { ruleId: rule.id, eventType, entityId, severity: rule.severity },
            dedupeKey,
          })),
        )
        .onConflictDoNothing({ target: [notifications.recipientId, notifications.dedupeKey] })
        .returning({ id: notifications.id });
      if (rows.length)
        await tx
          .insert(auditLogs)
          .values(
            audit(
              { userId: rule.updatedBy, role: "SYSTEM" },
              "notifications.rule_triggered",
              "notification_rule",
              rule.id,
              null,
              { eventType, entityId, deliveredCount: rows.length },
            ),
          );
      return rows.map((row) => row.id);
    });
    if (result.length) delivered.push({ ruleId: rule.id, notificationIds: result });
  }
  return delivered;
}

export async function listNotificationTemplates() {
  return getDb()
    .select()
    .from(notificationTemplates)
    .orderBy(desc(notificationTemplates.updatedAt))
    .limit(200);
}
export async function listNotificationRules() {
  return getDb()
    .select()
    .from(notificationRules)
    .orderBy(desc(notificationRules.updatedAt))
    .limit(200);
}
export async function listNotificationSchedules() {
  return getDb()
    .select()
    .from(notificationSchedules)
    .orderBy(desc(notificationSchedules.scheduledAt))
    .limit(200);
}

export async function saveNotificationTemplate(
  input: NotificationTemplateInput,
  actor: Actor,
  templateId?: string,
) {
  return getDb().transaction(async (tx) => {
    const now = new Date();
    const idValue = templateId ?? id("notification-template");
    const [existing] = templateId
      ? await tx
          .select()
          .from(notificationTemplates)
          .where(eq(notificationTemplates.id, templateId))
          .for("update")
          .limit(1)
      : [];
    const values = {
      name: input.name,
      titleTemplate: input.titleTemplate,
      bodyTemplate: input.bodyTemplate,
      linkTemplate: input.linkTemplate,
      variables: input.variables ?? [],
      enabled: input.enabled ?? true,
      updatedBy: actor.userId,
      updatedAt: now,
    };
    const [template] = existing
      ? await tx
          .update(notificationTemplates)
          .set(values)
          .where(eq(notificationTemplates.id, idValue))
          .returning()
      : await tx
          .insert(notificationTemplates)
          .values({ id: idValue, ...values, createdBy: actor.userId, createdAt: now })
          .returning();
    await tx
      .insert(auditLogs)
      .values(
        audit(
          actor,
          existing ? "notifications.template_updated" : "notifications.template_created",
          "notification_template",
          template.id,
          existing,
          template,
        ),
      );
    return template;
  });
}

export async function saveNotificationRule(
  input: NotificationRuleInput,
  actor: Actor,
  ruleId?: string,
) {
  return getDb().transaction(async (tx) => {
    if (input.templateId) {
      const [template] = await tx
        .select({ id: notificationTemplates.id })
        .from(notificationTemplates)
        .where(
          and(
            eq(notificationTemplates.id, input.templateId),
            eq(notificationTemplates.enabled, true),
          ),
        )
        .limit(1);
      if (!template) throw new Error("La plantilla no existe o está deshabilitada.");
    }
    const now = new Date();
    const idValue = ruleId ?? id("notification-rule");
    const [existing] = ruleId
      ? await tx
          .select()
          .from(notificationRules)
          .where(eq(notificationRules.id, ruleId))
          .for("update")
          .limit(1)
      : [];
    const values = {
      name: input.name,
      eventType: input.eventType,
      status: input.status,
      severity: input.severity,
      audienceRoles: input.audienceRoles,
      audienceUserIds: input.audienceUserIds,
      assigneeAudience: input.assigneeAudience,
      condition: input.condition,
      templateId: input.templateId,
      cooldownSeconds: input.cooldownSeconds,
      updatedBy: actor.userId,
      updatedAt: now,
    };
    const [rule] = existing
      ? await tx
          .update(notificationRules)
          .set(values)
          .where(eq(notificationRules.id, idValue))
          .returning()
      : await tx
          .insert(notificationRules)
          .values({ id: idValue, ...values, createdBy: actor.userId, createdAt: now })
          .returning();
    await tx
      .insert(auditLogs)
      .values(
        audit(
          actor,
          existing ? "notifications.rule_updated" : "notifications.rule_created",
          "notification_rule",
          rule.id,
          existing,
          rule,
        ),
      );
    return rule;
  });
}

async function recipientIds(roles: string[], userIds: string[], tx = getDb()) {
  const byRole = roles.length
    ? await tx
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.status, "ACTIVE"), inArray(users.roleCode, roles as never[])))
    : [];
  const ids = [...new Set([...byRole.map((row) => row.id), ...userIds])];
  if (!ids.length) return [];
  const active = await tx
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.status, "ACTIVE"), inArray(users.id, ids)));
  return active.map((row) => row.id);
}

export async function previewNotificationRecipients(roles: string[], userIds: string[]) {
  return { count: (await recipientIds(roles, userIds)).length };
}

export async function createNotificationSchedule(input: NotificationScheduleInput, actor: Actor) {
  if (!clean(input.title, 180) || !clean(input.body, 1000))
    throw new Error("Título y cuerpo son obligatorios para programar el aviso.");
  if (input.scheduledAt.getTime() <= Date.now())
    throw new Error("La fecha programada debe estar en el futuro.");
  return getDb().transaction(async (tx) => {
    if (input.idempotencyKey) {
      const [existing] = await tx
        .select()
        .from(notificationSchedules)
        .where(eq(notificationSchedules.idempotencyKey, input.idempotencyKey))
        .limit(1);
      if (existing)
        return {
          schedule: existing,
          recipientCount: existing.recipientUserIds.length,
          idempotent: true,
        };
    }
    const ids = await recipientIds(input.recipientRoles, input.recipientUserIds, tx);
    if (!ids.length) throw new Error("No hay destinatarios activos para programar el aviso.");
    const now = new Date();
    const [schedule] = await tx
      .insert(notificationSchedules)
      .values({
        id: id("notification-schedule"),
        ruleId: input.ruleId,
        templateId: input.templateId,
        title: input.title.trim().slice(0, 180),
        body: input.body.trim().slice(0, 1000),
        link: safeLink(input.link),
        recipientRoles: input.recipientRoles,
        recipientUserIds: ids,
        scheduledAt: input.scheduledAt,
        idempotencyKey: input.idempotencyKey,
        createdBy: actor.userId,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    await tx
      .insert(auditLogs)
      .values(
        audit(
          actor,
          "notifications.schedule_created",
          "notification_schedule",
          schedule.id,
          null,
          schedule,
        ),
      );
    return { schedule, recipientCount: ids.length, idempotent: false };
  });
}

export async function createManualNotification(
  input: {
    title: string;
    body: string;
    link?: string | null;
    recipientRoles: string[];
    recipientUserIds: string[];
    dedupeKey?: string | null;
  },
  actor: Actor,
) {
  if (!clean(input.title, 180) || !clean(input.body, 1000))
    throw new Error("Título y cuerpo son obligatorios.");
  return getDb().transaction(async (tx) => {
    const ids = await recipientIds(input.recipientRoles, input.recipientUserIds, tx);
    if (!ids.length) throw new Error("No hay destinatarios activos.");
    const rows = await tx
      .insert(notifications)
      .values(
        ids.map((recipientId) => ({
          id: id("notification"),
          recipientId,
          type: "MANUAL",
          title: input.title.trim().slice(0, 180),
          body: input.body.trim().slice(0, 1000),
          link: safeLink(input.link),
          metadata: { manual: true },
          dedupeKey: input.dedupeKey?.trim().slice(0, 240) || null,
        })),
      )
      .onConflictDoNothing({ target: [notifications.recipientId, notifications.dedupeKey] })
      .returning();
    if (rows.length)
      await tx.insert(auditLogs).values(
        audit(actor, "notifications.manual_sent", "notification", rows[0].id, null, {
          recipientCount: rows.length,
          title: input.title,
        }),
      );
    return { notifications: rows, recipientCount: ids.length, deliveredCount: rows.length };
  });
}

export async function processDueNotificationSchedules(now = new Date()) {
  const db = getDb();
  const due = await db
    .select()
    .from(notificationSchedules)
    .where(
      and(
        eq(notificationSchedules.status, "SCHEDULED"),
        lte(notificationSchedules.scheduledAt, now),
      ),
    )
    .orderBy(notificationSchedules.scheduledAt)
    .limit(100);
  let delivered = 0;
  for (const candidate of due) {
    await db.transaction(async (tx) => {
      const [schedule] = await tx
        .select()
        .from(notificationSchedules)
        .where(
          and(
            eq(notificationSchedules.id, candidate.id),
            eq(notificationSchedules.status, "SCHEDULED"),
          ),
        )
        .for("update")
        .limit(1);
      if (!schedule) return 0;
      const activeRows = schedule.recipientUserIds?.length
        ? await tx
            .select({ id: users.id })
            .from(users)
            .where(and(eq(users.status, "ACTIVE"), inArray(users.id, schedule.recipientUserIds)))
        : [];
      const ids = activeRows.map((row) => row.id);
      if (ids.length) {
        const rows = await tx
          .insert(notifications)
          .values(
            ids.map((recipientId) => ({
              id: id("notification"),
              recipientId,
              type: "SCHEDULED",
              title: schedule.title,
              body: schedule.body,
              link: safeLink(schedule.link),
              metadata: { scheduleId: schedule.id },
              dedupeKey: `schedule:${schedule.id}`,
            })),
          )
          .onConflictDoNothing({ target: [notifications.recipientId, notifications.dedupeKey] })
          .returning({ id: notifications.id });
        delivered += rows.length;
      }
      await tx
        .update(notificationSchedules)
        .set({ status: "SENT", sentAt: now, updatedAt: now })
        .where(eq(notificationSchedules.id, schedule.id));
      await tx
        .insert(auditLogs)
        .values(
          audit(
            { userId: schedule.createdBy, role: "SYSTEM" },
            "notifications.schedule_sent",
            "notification_schedule",
            schedule.id,
            { status: schedule.status },
            { status: "SENT", delivered: ids.length },
          ),
        );
      return 1;
    });
  }
  return { processed: due.length, delivered };
}

export async function getNotificationAutomationMetrics() {
  const db = getDb();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today.getTime() + 86_400_000);
  const [critical, activeRules, scheduled, todaySchedules] = await Promise.all([
    db
      .select({ value: count() })
      .from(notifications)
      .where(
        or(
          eq(notifications.type, "INVENTORY_CRITICAL"),
          sql`${notifications.metadata} ->> 'severity' = 'CRITICAL'`,
        ),
      ),
    db
      .select({ value: count() })
      .from(notificationRules)
      .where(eq(notificationRules.status, "ACTIVE")),
    db
      .select({ value: count() })
      .from(notificationSchedules)
      .where(eq(notificationSchedules.status, "SCHEDULED")),
    db
      .select({ value: count() })
      .from(notificationSchedules)
      .where(
        and(
          gte(notificationSchedules.scheduledAt, today),
          lt(notificationSchedules.scheduledAt, tomorrow),
          eq(notificationSchedules.status, "SCHEDULED"),
        ),
      ),
  ]);
  return {
    critical: Number(critical[0]?.value ?? 0),
    activeRules: Number(activeRules[0]?.value ?? 0),
    scheduled: Number(scheduled[0]?.value ?? 0),
    remindersToday: Number(todaySchedules[0]?.value ?? 0),
  };
}

export async function cancelNotificationSchedule(scheduleId: string, actor: Actor) {
  return getDb().transaction(async (tx) => {
    const [before] = await tx
      .select()
      .from(notificationSchedules)
      .where(eq(notificationSchedules.id, scheduleId))
      .for("update")
      .limit(1);
    if (!before || before.status !== "SCHEDULED")
      throw new Error("La programación ya no está disponible.");
    const [after] = await tx
      .update(notificationSchedules)
      .set({ status: "CANCELLED", cancelledAt: new Date(), updatedAt: new Date() })
      .where(eq(notificationSchedules.id, scheduleId))
      .returning();
    await tx
      .insert(auditLogs)
      .values(
        audit(
          actor,
          "notifications.schedule_cancelled",
          "notification_schedule",
          scheduleId,
          before,
          after,
        ),
      );
    return after;
  });
}
