import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (file) => readFileSync(join(root, file), "utf8");

test("CP-030 declara un contrato uniforme de error para APIs operativas", () => {
  assert.match(read("src/lib/api-errors.ts"), /error:\s*\{\s*code/);
  for (const file of [
    "src/app/api/admin/dashboard/route.ts", "src/app/api/admin/configuracion/route.ts", "src/app/api/admin/precios/route.ts",
    "src/app/api/admin/inventario/ajustes/route.ts", "src/app/api/admin/pagos/manual/route.ts", "src/app/api/admin/clientes/route.ts",
    "src/app/api/admin/clientes/[id]/route.ts", "src/app/api/admin/oportunidades/route.ts", "src/app/api/admin/oportunidades/[id]/route.ts",
    "src/app/api/admin/cotizaciones/[id]/route.ts", "src/app/api/admin/pedidos/route.ts", "src/app/api/admin/pedidos/[id]/route.ts",
    "src/app/api/admin/inventario/reservas/route.ts",
  ]) {
    assert.match(read(file), /apiError/);
  }
});
