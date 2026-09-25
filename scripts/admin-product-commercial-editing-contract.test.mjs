import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = join(import.meta.dirname, "..");
const read = (path) => readFileSync(join(root, path), "utf8");

test("la ficha admin expone edición comercial del producto", () => {
  const page = read("src/app/admin/catalogo/[id]/page.tsx");
  const workspace = read("src/components/admin/ProductDetailWorkspace.tsx");
  const roles = read("src/lib/roles.ts");

  assert.match(page, /ProductDetailWorkspace/);
  assert.match(workspace, /\/api\/admin\/precios\/reemplazar/);
  assert.match(workspace, /\/api\/admin\/inventario\/ajustes/);
  assert.match(roles, /ADMIN[\s\S]*pricing\.edit/);
  assert.match(roles, /ADMIN[\s\S]*inventory\.adjust/);
  assert.match(roles, /ADMIN[\s\S]*inventory:adjust/);
});
