import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync("src/components/admin/AdminCategoryViews.tsx", "utf8");

test("catalog explains missing media, stock and unavailable row actions", () => {
  assert.match(source, /Imagen pendiente/);
  assert.match(source, /Dato no disponible/);
  assert.match(source, /Acciones disponibles al abrir el registro/);
  assert.match(source, /Stock pendiente de sincronización/);
});
