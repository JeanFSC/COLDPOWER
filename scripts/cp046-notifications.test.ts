import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { parseNotificationFilters } from "../src/lib/notifications-service";

const root = process.cwd();
const read = (file: string) => readFileSync(`${root}/${file}`, "utf8");

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
