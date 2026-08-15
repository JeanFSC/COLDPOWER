import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (file) => readFileSync(join(root, file), "utf8");
const required = [
  "src/app/admin/pedidos/page.tsx",
  "src/app/admin/inventario/page.tsx",
  "src/app/admin/compras/page.tsx",
  "src/app/admin/reportes/page.tsx",
  "src/app/cuenta/pedidos/page.tsx",
  "src/app/cuenta/carrito/page.tsx",
];

for (const file of required) assert.equal(existsSync(join(root, file)), true, `${file} should exist`);

const layout = read("src/app/admin/layout.tsx");
for (const href of ["admin/pedidos", "admin/inventario", "admin/compras", "admin/reportes"]) {
  assert.match(layout, new RegExp(href));
}
assert.match(read("src/app/admin/reportes/page.tsx"), /quotes|funnel|embudo|status/i);
assert.match(read("src/app/admin/inventario/page.tsx"), /getPublishedProducts|products|stock/i);
assert.match(read("src/app/admin/compras/page.tsx"), /supplier|proveedor|purchase|compra/i);
assert.match(read("src/app/cuenta/page.tsx"), /cuenta\/pedidos|cuenta\/carrito/);
assert.match(read("src/app/cuenta/carrito/page.tsx"), /useCart/);

console.log("Phase 29 client and ERP modules contract: PASS");
