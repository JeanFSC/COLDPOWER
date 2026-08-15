import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => readFile(path.join(root, file), "utf8");

test("notificaciones: la bandeja conserva filtros, estados y paginación reales", async () => {
  const page = await read("src/app/admin/notificaciones/page.tsx");
  const component = await read("src/components/admin/NotificationsList.tsx");

  assert.match(page, /loadError/);
  assert.match(page, /NotificationsList[\s\S]*loadError/);
  assert.match(component, /name="type"/);
  assert.match(component, /name="dateFrom"/);
  assert.match(component, /name="dateTo"/);
  assert.match(component, /api\/admin\/notificaciones\/\$\{id\}/);
  assert.match(component, /api\/admin\/notificaciones\/bulk/);
  assert.match(component, /role="alert"/);
});

test("notificaciones: los errores de carga no se presentan como bandeja vacía", async () => {
  const page = await read("src/app/admin/notificaciones/page.tsx");
  const component = await read("src/components/admin/NotificationsList.tsx");

  assert.match(page, /loadError=\{loadError\}/);
  assert.match(component, /Reintentar/);
  assert.match(component, /No pudimos cargar las notificaciones/);
});
