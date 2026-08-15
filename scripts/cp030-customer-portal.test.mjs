import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (file) => readFileSync(join(root, file), "utf8");

test("CP-030 mantiene el portal de cliente limitado al usuario autenticado", () => {
  for (const file of ["src/app/api/cuenta/cotizaciones/route.ts", "src/app/api/cuenta/pedidos/route.ts", "src/app/api/cuenta/pagos/route.ts", "src/app/api/cuenta/historial/route.ts"]) {
    const source = read(file);
    assert.match(source, /requireApiUser/);
    assert.match(source, /ApiAuthorizationError/);
    assert.match(source, /userId/);
    assert.doesNotMatch(source, /searchParams\.get\(["'](?:userId|customerId|id)["']\)/);
  }
  assert.match(read("src/lib/sales-service.ts"), /eq\(customers\.userId, userId\)/);
  assert.match(read("src/lib/customer-history.ts"), /eq\(customers\.userId, userId\)/);
});
