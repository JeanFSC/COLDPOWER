import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

test("CP-025 expone decisiones de duplicado reversibles y canónico acotado al grupo", () => {
  const schema = read("src/db/schema.ts");
  const service = read("src/lib/duplicate-service.ts");
  const route = read("src/app/api/admin/catalogo/[id]/duplicate/route.ts");
  const page = read("src/app/admin/catalogo/page.tsx");
  for (const decision of ["pending", "different", "confirmed", "keep_both"]) assert.match(schema + service + page, new RegExp(decision));
  assert.match(service, /same group|mismo grupo/i);
  assert.match(service, /massOperation: false/);
  assert.doesNotMatch(service, /delete\(|DELETE|merge/i);
  assert.match(route, /require(?:Api)?Permission\("(?:catalog:review|catalog\.product\.review)"\)/);
  assert.match(page, /Duplicados pendientes|Duplicados agrupados/i);
});

test("CP-025 inventario expone locales, ajustes, traslados, reservas y acciones protegidas", () => {
  const page = read("src/app/admin/inventario/page.tsx");
  const files = ["src/app/api/admin/inventario/locales/route.ts", "src/app/api/admin/inventario/ajustes/route.ts", "src/app/api/admin/inventario/transferencias/route.ts", "src/app/api/admin/inventario/transferencias/[id]/recibir/route.ts", "src/app/api/admin/inventario/reservas/route.ts", "src/app/api/admin/inventario/reservas/[id]/liberar/route.ts", "src/app/api/admin/inventario/reservas/[id]/consumir/route.ts"];
  for (const file of files) assert.equal(fs.existsSync(path.join(root, file)), true, file);
  assert.match(page, /Kardex|Traslados|Reservas|Importación de stock/);
  for (const file of files) assert.match(read(file), /requireApiPermission/);
  assert.match(read("src/lib/inventory.ts"), /inventory\.movement_created/);
  assert.match(read("src/lib/inventory.ts"), /reservation_(created|released|consumed)/);
});
