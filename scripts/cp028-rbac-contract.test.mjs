import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = join(import.meta.dirname, "..");
const read = (file) => readFileSync(join(root, file), "utf8");

test("CP-028 declara los roles empresariales y separa a Bryan del control ejecutivo", () => {
  const roles = read("src/lib/roles.ts");
  assert.match(roles, /GERENCIA/);
  assert.match(roles, /OPERACIONES_VENTAS/);
  assert.match(roles, /dashboard\.view/);
  assert.match(roles, /catalog\.product\.view/);
  assert.match(roles, /media\.view/);
  assert.match(roles, /users\.view/);
  assert.match(roles, /pricing\.margin\.view/);
  const operations = roles.match(/const businessCore = \[([\s\S]*?)\];/)?.[1] ?? "";
  assert.match(operations, /catalog\.product\.publish/);
  assert.match(operations, /inventory\.kardex\.view/);
  assert.doesNotMatch(operations, /dashboard\.view|reports\.view|audit\.view|pricing\.cost\.view|users\.manage/);
});

test("CP-028 filtra navegación y ofrece landing operativa", () => {
  const layout = read("src/app/admin/layout.tsx");
  const landing = read("src/lib/admin-landing.ts");
  assert.match(layout, /can\(|hasPermission|permission/);
  assert.match(layout, /admin\/operaciones/);
  assert.match(layout, /reports\.view/);
  assert.match(layout, /users\.view/);
  assert.match(read("src/app/admin/operaciones/page.tsx"), /requirePermission/);
  assert.match(landing, /can\(role, "dashboard\.view"\)[\s\S]*\/admin\/inicio/);
  for (const [role, href] of [
    ["OPERACIONES_VENTAS", "/admin/operaciones"],
    ["ADMIN", "/admin/operaciones"],
    ["VENTAS", "/admin/crm"],
    ["ALMACEN", "/admin/inventario"],
    ["COMPRAS", "/admin/compras"],
    ["REPORTES", "/admin/reportes"],
    ["admin", "/admin/operaciones"],
  ]) {
    assert.match(landing, new RegExp(`${role}:\\s*"${href.replaceAll("/", "\\/")}"`));
  }
  assert.match(landing, /\/admin\/sin-acceso/);
});
