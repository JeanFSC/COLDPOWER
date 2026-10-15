import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { parseNotificationFilters } from "../src/lib/notifications-service";
import { notificationEventContext, notificationEventEntityId, notificationRuleEventTypes } from "../src/lib/notification-event-context";
import { conditionMatches } from "../src/lib/notification-rules-service";

test("reglas: stock llega al ámbito inventory y evalúa umbrales reales", () => {
  const context = notificationEventContext("PRODUCT_OUT_OF_STOCK", { productId: "qa", locationId: "local", available: 0 });
  assert.equal(context.eventType, "INVENTORY_CRITICAL");
  assert.ok(conditionMatches({ field: "inventory.available", operator: "lte", value: 0 }, context));
  assert.equal(conditionMatches({ field: "inventory.available", operator: "gt", value: 0 }, context), false);
  assert.equal(context.entity?.productId, "qa");
  assert.notEqual(
    notificationEventEntityId(context),
    notificationEventEntityId(notificationEventContext("PRODUCT_OUT_OF_STOCK", { productId: "qa", locationId: "local-2", available: 0 })),
  );
});

test("reglas: pagos y pedidos exponen sus datos sin inventar campos ausentes", () => {
  const payment = notificationEventContext("PAYMENT_FAILED", { status: "FAILED", difference: 5 });
  assert.ok(conditionMatches({ field: "payment.difference", operator: "gt", value: "2" }, payment));
  assert.equal(notificationEventContext("PAYMENT_APPROVED", { paymentId: "qa" }).payment?.difference, undefined);
  assert.equal(conditionMatches({ field: "payment.difference", operator: "neq", value: 0 }, notificationEventContext("PAYMENT_APPROVED", { paymentId: "qa" })), false);
  assert.ok(conditionMatches({ field: "order.status", operator: "eq", value: "READY" }, notificationEventContext("ORDER_READY", { status: "READY" })));
  assert.equal(notificationEventContext("MANUAL", { available: 0 }).inventory, undefined);
});

test("reglas: eventos canónicos encuentran también las reglas con alias existentes", () => {
  assert.deepEqual(notificationRuleEventTypes("TRANSFER_APPROVAL_PENDING"), ["TRANSFER_UPDATED", "TRANSFER_APPROVAL_PENDING"]);
  assert.deepEqual(notificationRuleEventTypes("STOCK_MINIMUM"), ["INVENTORY_LOW", "STOCK_MINIMUM"]);
  assert.deepEqual(notificationRuleEventTypes("QA_AUDITORIA"), ["QA_AUDITORIA"]);
  const service = read("src/lib/notification-rules-service.ts");
  assert.match(service, /inArray\(notificationRules.eventType, notificationRuleEventTypes\(eventType\)\)/);
  const ui = read("src/components/admin/NotificationAdminControls.tsx");
  for (const event of ["INVENTORY_CRITICAL", "INVENTORY_LOW", "PAYMENT_FAILED", "TRANSFER_UPDATED"]) assert.ok(ui.includes(`["${event}",`));
});

const root = process.cwd();
const read = (file: string) => readFileSync(`${root}/${file}`, "utf8");

test("notificaciones: creación programada serializa la clave antes de consultar replay", () => {
  const create = read("src/lib/notification-rules-service.ts").split("export async function createNotificationSchedule")[1].split("export async function createManualNotification")[0];
  assert.match(create, /pg_advisory_xact_lock/);
  assert.ok(create.indexOf("pg_advisory_xact_lock") < create.indexOf("const [existing]"));
});

test("notificaciones: filtros, estados y paginación", () => {
  const filters = parseNotificationFilters(new URLSearchParams("state=UNREAD&type=QUOTE_CREATED&query=quote&page=2&pageSize=50&dateFrom=2026-01-01&dateTo=2026-01-31"));
  assert.equal(filters.state, "UNREAD"); assert.equal(filters.type, "QUOTE_CREATED"); assert.equal(filters.page, 2); assert.equal(filters.pageSize, 50);
  assert.throws(() => parseNotificationFilters(new URLSearchParams("state=INVALID")));
  assert.throws(() => parseNotificationFilters(new URLSearchParams("dateFrom=2026-02-02&dateTo=2026-02-01")));
});

test("notificaciones: deduplicación transaccional, sanitización y ownership", () => {
  const service = read("src/lib/notifications-service.ts");
  assert.match(service, /onConflictDoNothing/);
  assert.match(service, /recipientDedupeUnique|recipientId, notifications\.dedupeKey/);
  assert.match(service, /sanitizeAuditValue/);
  assert.match(service, /safeLink/);
  assert.match(service, /users\.status/);
  assert.match(service, /notificationPermissionForType/);
  assert.match(service, /notificationPreferences/);
  assert.match(service, /startsWith\("\/\/"\)/);
});

test("notificaciones: contratos API, bulk, preferencias, métricas y RBAC", () => {
  for (const file of ["src/app/api/admin/notificaciones/route.ts", "src/app/api/admin/notificaciones/[id]/route.ts", "src/app/api/admin/notificaciones/bulk/route.ts", "src/app/api/admin/notificaciones/preferencias/route.ts", "drizzle/0029_cp046_notifications.sql"]) assert.equal(existsSync(`${root}/${file}`), true, file);
  assert.match(read("src/app/api/admin/notificaciones/route.ts"), /notifications\.view/);
  assert.match(read("src/app/api/admin/notificaciones/route.ts"), /getNotificationsPage/);
  assert.match(read("src/lib/notifications-service.ts"), /unreadCount/);
  assert.match(read("src/app/api/admin/notificaciones/bulk/route.ts"), /bulkUpdateNotificationState/);
  assert.match(read("src/app/api/admin/notificaciones/[id]/route.ts"), /params/);
  assert.match(read("src/lib/roles.ts"), /notifications\.manage/);
  assert.match(read("src/lib/roles.ts"), /notifications\.preferences/);
  assert.doesNotMatch(read("src/lib/notifications-service.ts"), /WhatsApp Business API/);
});
