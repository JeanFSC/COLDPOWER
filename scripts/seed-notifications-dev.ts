import { asc, eq } from "drizzle-orm";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { getDb } from "../src/db";
import { users } from "../src/db/schema";
import { notifications, notificationRules, notificationSchedules, notificationTemplates } from "../src/db/operations-schema";
import { assertDevDatabaseTarget, assertDevMockSeedAllowed, mockFixtureId } from "../src/lib/dev-mock-fixtures";

// Dev-only fixture for the Notificaciones module — same protection/idempotency pattern as
// seed-visual-year.ts (production blocked, --confirm-dev-mock required, deterministic
// mockFixtureId + onConflictDoNothing so reruns never duplicate rows). Populates enough real
// rows (across states, priorities and 30 real days) for the KPIs/donut/inbox to render
// meaningfully instead of an all-zero empty state, without inventing anything the app itself
// doesn't already model: rule eventTypes below are the exact canonical types real business
// code (sales-service, crm-service, inventory.ts, transferencias route) already dispatches
// via notifyStaffOnce, so these rules will keep matching real future events too.
const fixture = "cp-notifications-dev";
const day = 24 * 60 * 60 * 1000;
const id = (entity: string, key: string) => mockFixtureId(entity, key);
const hoursAgo = (hours: number) => new Date(Date.now() - hours * 60 * 60 * 1000);
const daysAgo = (days: number) => new Date(Date.now() - days * day);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function insertRows(tx: any, table: any, rows: any[]) {
  if (!rows.length) return 0;
  const inserted = await tx.insert(table).values(rows).onConflictDoNothing().returning({ id: table.id });
  return inserted.length;
}

export async function seedNotificationsDevData() {
  const db = getDb();
  return db.transaction(async (tx) => {
    const [actor] = await tx.select({ id: users.id, name: users.name, email: users.email }).from(users).where(eq(users.roleCode, "SUPERADMIN")).orderBy(asc(users.createdAt)).limit(1);
    if (!actor) throw new Error("No existe un SUPERADMIN activo para atribuir el fixture de notificaciones.");
    const activeUsers = await tx.select({ id: users.id, name: users.name, roleCode: users.roleCode }).from(users).where(eq(users.status, "ACTIVE")).orderBy(asc(users.createdAt)).limit(6);
    const others = activeUsers.filter((user) => user.id !== actor.id);
    const teammate = others[0] ?? actor;
    const teammate2 = others[1] ?? teammate;

    const templates = [
      { id: id(fixture, "template-stock"), name: "Alerta de stock bajo", titleTemplate: "Stock bajo: {{product.sku}}", bodyTemplate: "El producto {{product.sku}} está por debajo del mínimo configurado.", linkTemplate: "/admin/inventario", variables: ["product.sku"], enabled: true, createdBy: actor.id, updatedBy: actor.id },
      { id: id(fixture, "template-followup"), name: "Seguimiento de cotización", titleTemplate: "Seguimiento pendiente: {{quote.code}}", bodyTemplate: "La cotización {{quote.code}} de {{customer.name}} sigue sin respuesta.", linkTemplate: "/admin/crm", variables: ["quote.code", "customer.name"], enabled: true, createdBy: actor.id, updatedBy: actor.id },
      { id: id(fixture, "template-payment"), name: "Pago confirmado", titleTemplate: "Pago aprobado: {{order.code}}", bodyTemplate: "Se confirmó el pago del pedido {{order.code}}.", linkTemplate: "/admin/pedidos", variables: ["order.code"], enabled: true, createdBy: actor.id, updatedBy: actor.id },
      { id: id(fixture, "template-transfer"), name: "Pedido en ruta", titleTemplate: "Transferencia lista: {{entity.code}}", bodyTemplate: "La transferencia {{entity.code}} está lista para despacho.", linkTemplate: "/admin/inventario", variables: ["entity.code"], enabled: true, createdBy: actor.id, updatedBy: actor.id },
    ];
    const templatesInserted = await insertRows(tx, notificationTemplates, templates);

    // eventType values match the real canonical types notifyStaffOnce already dispatches
    // (post-alias): INVENTORY_CRITICAL/INVENTORY_LOW from inventory.ts, FOLLOW_UP_OVERDUE
    // from crm-service.ts, ORDER_READY/PAYMENT_APPROVED from sales-service.ts,
    // TRANSFER_UPDATED from the transferencias route — these rules keep firing for real.
    const rules = [
      { id: id(fixture, "rule-stock-critical"), name: "Stock crítico", eventType: "INVENTORY_CRITICAL", status: "ACTIVE" as const, severity: "CRITICAL" as const, audienceRoles: ["ALMACEN", "GERENCIA", "SUPERADMIN"], audienceUserIds: [], assigneeAudience: false, condition: { field: "inventory.available", operator: "lte", value: 0 }, templateId: id(fixture, "template-stock"), cooldownSeconds: 3600, createdBy: actor.id, updatedBy: actor.id },
      { id: id(fixture, "rule-stock-low"), name: "Stock bajo mínimo", eventType: "INVENTORY_LOW", status: "ACTIVE" as const, severity: "WARNING" as const, audienceRoles: ["ALMACEN", "COMPRAS"], audienceUserIds: [], assigneeAudience: false, condition: { field: "inventory.available", operator: "gt", value: 0 }, templateId: id(fixture, "template-stock"), cooldownSeconds: 86_400, createdBy: actor.id, updatedBy: actor.id },
      { id: id(fixture, "rule-followup"), name: "Cotización sin respuesta", eventType: "FOLLOW_UP_OVERDUE", status: "ACTIVE" as const, severity: "WARNING" as const, audienceRoles: ["GERENCIA", "OPERACIONES_VENTAS", "VENTAS"], audienceUserIds: [], assigneeAudience: true, condition: { field: "entity.ageDays", operator: "gte", value: 2 }, templateId: id(fixture, "template-followup"), cooldownSeconds: 43_200, createdBy: actor.id, updatedBy: actor.id },
      { id: id(fixture, "rule-payment"), name: "Pago confirmado", eventType: "PAYMENT_APPROVED", status: "ACTIVE" as const, severity: "INFO" as const, audienceRoles: ["GERENCIA", "OPERACIONES_VENTAS"], audienceUserIds: [], assigneeAudience: false, condition: { field: "entity.status", operator: "eq", value: "ACTIVE" }, templateId: id(fixture, "template-payment"), cooldownSeconds: 0, createdBy: actor.id, updatedBy: actor.id },
      { id: id(fixture, "rule-transfer"), name: "Transferencia lista", eventType: "TRANSFER_UPDATED", status: "INACTIVE" as const, severity: "INFO" as const, audienceRoles: ["ALMACEN"], audienceUserIds: [], assigneeAudience: false, condition: { field: "entity.status", operator: "eq", value: "READY" }, templateId: id(fixture, "template-transfer"), cooldownSeconds: 0, createdBy: actor.id, updatedBy: actor.id },
    ];
    const rulesInserted = await insertRows(tx, notificationRules, rules);

    const schedules = [
      { id: id(fixture, "schedule-sent"), ruleId: null, templateId: null, title: "Corte de fin de mes", body: "Recuerda revisar el cierre de inventario antes de las 6pm.", link: "/admin/inventario", recipientRoles: ["ALMACEN", "GERENCIA"], recipientUserIds: [actor.id, teammate.id], scheduledAt: daysAgo(3), status: "SENT" as const, sentAt: daysAgo(3), createdBy: actor.id },
      { id: id(fixture, "schedule-failed"), ruleId: null, templateId: null, title: "Recordatorio de auditoría trimestral", body: "Programar la auditoría de inventario del trimestre.", link: "/admin/auditoria", recipientRoles: ["GERENCIA"], recipientUserIds: [actor.id], scheduledAt: daysAgo(1), status: "FAILED" as const, error: "No se encontraron destinatarios activos para el rol GERENCIA en el momento del envío.", createdBy: actor.id },
      { id: id(fixture, "schedule-queued"), ruleId: null, templateId: null, title: "Recordatorio de renovación de contratos", body: "Revisar contratos de proveedores próximos a vencer.", link: "/admin/compras", recipientRoles: ["COMPRAS", "GERENCIA"], recipientUserIds: [actor.id], scheduledAt: new Date(Date.now() + 2 * day), status: "SCHEDULED" as const, createdBy: actor.id },
    ];
    const schedulesInserted = await insertRows(tx, notificationSchedules, schedules);

    // Notification rows: a spread of real states/priorities/recipients across the last 30
    // days, plus one dedupeKey-grouped broadcast (3 recipients, mixed read state) so the
    // detail panel's "Destinatarios y estado" has something real to show.
    const groupDedupeKey = `fixture:${fixture}:stock-alert`;
    const rows = [
      { id: id(fixture, "notif-1"), recipientId: actor.id, type: "INVENTORY_CRITICAL", title: "Stock crítico: REF-FAN-16W", body: "El producto REF-FAN-16W llegó a 0 unidades disponibles en Almacén Lima.", link: "/admin/inventario", dedupeKey: groupDedupeKey, state: "UNREAD" as const, metadata: { severity: "CRITICAL" }, createdAt: hoursAgo(2) },
      { id: id(fixture, "notif-1b"), recipientId: teammate.id, type: "INVENTORY_CRITICAL", title: "Stock crítico: REF-FAN-16W", body: "El producto REF-FAN-16W llegó a 0 unidades disponibles en Almacén Lima.", link: "/admin/inventario", dedupeKey: groupDedupeKey, state: "READ" as const, metadata: { severity: "CRITICAL" }, createdAt: hoursAgo(2), readAt: hoursAgo(1) },
      { id: id(fixture, "notif-1c"), recipientId: teammate2.id, type: "INVENTORY_CRITICAL", title: "Stock crítico: REF-FAN-16W", body: "El producto REF-FAN-16W llegó a 0 unidades disponibles en Almacén Lima.", link: "/admin/inventario", dedupeKey: groupDedupeKey, state: "UNREAD" as const, metadata: { severity: "CRITICAL" }, createdAt: hoursAgo(2) },
      { id: id(fixture, "notif-2"), recipientId: actor.id, type: "FOLLOW_UP_OVERDUE", title: "Seguimiento vencido", body: "La cotización CP-2024-0231 lleva más de 48 horas sin respuesta del cliente.", link: "/admin/crm", dedupeKey: `${fixture}:followup:1`, state: "UNREAD" as const, metadata: { severity: "WARNING" }, createdAt: hoursAgo(6) },
      { id: id(fixture, "notif-3"), recipientId: actor.id, type: "PAYMENT_APPROVED", title: "Pago aprobado", body: "Se confirmó el pago del pedido PCN-0251 por transferencia.", link: "/admin/pedidos", dedupeKey: `${fixture}:payment:1`, state: "READ" as const, metadata: { severity: "INFO" }, createdAt: daysAgo(1), readAt: hoursAgo(20) },
      { id: id(fixture, "notif-4"), recipientId: actor.id, type: "ORDER_READY", title: "Pedido listo", body: "El pedido PCN-0248 está listo para recoger en Almacén Lima.", link: "/admin/pedidos", dedupeKey: `${fixture}:order:1`, state: "DISMISSED" as const, metadata: { severity: "INFO" }, createdAt: daysAgo(2), dismissedAt: daysAgo(1) },
      { id: id(fixture, "notif-5"), recipientId: actor.id, type: "INVENTORY_LOW", title: "Stock mínimo alcanzado", body: "El producto REF-CON-002 está en el umbral mínimo configurado.", link: "/admin/inventario", dedupeKey: `${fixture}:stock-low:1`, state: "UNREAD" as const, metadata: { severity: "WARNING" }, createdAt: daysAgo(4) },
      { id: id(fixture, "notif-6"), recipientId: actor.id, type: "MANUAL", title: "Corte de caja pendiente", body: "Falta registrar el corte de caja de la sucursal Lima Centro.", link: null, dedupeKey: `${fixture}:manual:1`, state: "READ" as const, metadata: { manual: true }, createdAt: daysAgo(6), readAt: daysAgo(5) },
      { id: id(fixture, "notif-7"), recipientId: actor.id, type: "SCHEDULED", title: "Corte de fin de mes", body: "Recuerda revisar el cierre de inventario antes de las 6pm.", link: "/admin/inventario", dedupeKey: `schedule:${id(fixture, "schedule-sent")}`, state: "READ" as const, metadata: { scheduleId: id(fixture, "schedule-sent") }, createdAt: daysAgo(3), readAt: daysAgo(2) },
      { id: id(fixture, "notif-8"), recipientId: teammate.id, type: "SCHEDULED", title: "Corte de fin de mes", body: "Recuerda revisar el cierre de inventario antes de las 6pm.", link: "/admin/inventario", dedupeKey: `schedule:${id(fixture, "schedule-sent")}`, state: "UNREAD" as const, metadata: { scheduleId: id(fixture, "schedule-sent") }, createdAt: daysAgo(3) },
      { id: id(fixture, "notif-9"), recipientId: actor.id, type: "PAYMENT_FAILED", title: "Pago rechazado", body: "El pago del pedido PCN-0239 fue rechazado por la pasarela.", link: "/admin/pagos", dedupeKey: `${fixture}:payment:failed:1`, state: "UNREAD" as const, metadata: { severity: "CRITICAL" }, createdAt: daysAgo(9) },
      { id: id(fixture, "notif-10"), recipientId: actor.id, type: "TRANSFER_UPDATED", title: "Transferencia recibida", body: "La transferencia TRF-0088 fue recibida en Almacén Lima.", link: "/admin/inventario", dedupeKey: `${fixture}:transfer:1`, state: "READ" as const, metadata: { severity: "INFO" }, createdAt: daysAgo(15), readAt: daysAgo(14) },
      { id: id(fixture, "notif-11"), recipientId: actor.id, type: "LEAD_CREATED", title: "Nuevo lead recibido", body: "Se registró un nuevo lead desde WhatsApp para Refrigeración Comercial SAC.", link: "/admin/crm", dedupeKey: `${fixture}:lead:1`, state: "DISMISSED" as const, metadata: { severity: "INFO" }, createdAt: daysAgo(22), dismissedAt: daysAgo(21) },
    ];
    const notificationsInserted = await insertRows(tx, notifications, rows);

    return { templatesInserted, rulesInserted, schedulesInserted, notificationsInserted, actor: actor.email };
  });
}

async function main() {
  assertDevMockSeedAllowed(process.env, process.argv);
  assertDevDatabaseTarget(process.env, process.argv);
  const result = await seedNotificationsDevData();
  console.log("Fixture de notificaciones aplicado:", result);
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(currentFile)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
