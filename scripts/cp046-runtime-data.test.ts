import assert from "node:assert/strict";
import test from "node:test";
import { getNotificationsPage } from "../src/lib/notifications-service";

test("notificaciones: usuario sin notificaciones conserva contrato vacío", async () => {
  const result = await getNotificationsPage("__cp046_user_that_should_not_exist__", { page: 1, pageSize: 10 });
  assert.equal(result.page, 1);
  assert.equal(result.pageSize, 10);
  assert.equal(result.totalItems, 0);
  assert.equal(result.unreadCount, 0);
  assert.deepEqual(result.metrics, { unread: 0, read: 0, dismissed: 0 });
});
