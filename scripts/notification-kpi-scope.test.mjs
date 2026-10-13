import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("notification cards disclose personal rolling window and avoid invented snapshot deltas", () => {
  const source = readFileSync("src/components/admin/AdminNotificationsModule.tsx", "utf8");
  assert.match(source, /No leídas · últimas 24 h/);
  assert.match(source, /La campana incluye todas tus no leídas/);
  assert.match(source, /key === "activeRules" \|\| key === "scheduled"/);
  assert.match(source, /text: "Estado actual"/);
});

test("notification detail changes read state only on explicit action", () => {
  const source = readFileSync("src/components/admin/NotificationDetailActions.tsx", "utf8");
  assert.doesNotMatch(source, /useEffect|autoMarked/);
  assert.match(source, /onClick=\{\(\) => \{ void run\(\);/);
  assert.match(source, /publishNotificationConfirmation\(result\)/);
  assert.match(source, /disabled=\{busy\}/);
  const route = readFileSync("src/app/api/admin/notificaciones/[id]/route.ts", "utf8");
  assert.match(route, /requireApiPermission\("notifications.view"\)/);
  assert.match(route, /getNotificationReadSummary\(actor.userId\)/);
  assert.ok(route.indexOf('revalidatePath("/admin/notificaciones")') > route.indexOf("await updateNotificationState"));
});

test("notification overview keeps overlapping counts and schedules independent", () => {
  const source = readFileSync("src/components/admin/AdminNotificationsModule.tsx", "utf8");
  assert.doesNotMatch(source, /deliveryTotal|donutSegments|strokeDasharray/);
  assert.match(source, /Avisos creados · últimos 30 días/);
  assert.match(source, /Programaciones fallidas · últimos 30 días/);
  assert.match(source, /Todo el equipo · indicadores independientes/);
  assert.match(source, /Cada destinatario cuenta como un aviso/);
});
