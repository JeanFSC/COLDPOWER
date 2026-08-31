import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const routes = [
  "src/app/api/cuenta/cotizaciones/route.ts",
  "src/app/api/cuenta/historial/route.ts",
  "src/app/api/cuenta/pagos/route.ts",
  "src/app/api/cuenta/pedidos/route.ts",
  "src/app/api/cuenta/perfil/route.ts",
  "src/app/api/pagos/create/route.ts",
  "src/app/api/pagos/[id]/status/route.ts",
];

test("account APIs return JSON auth errors instead of page redirects", () => {
  for (const relativePath of routes) {
    const source = fs.readFileSync(path.join(root, relativePath), "utf8");
    assert.match(source, /requireApiUser/);
    assert.match(source, /AUTH_REQUIRED/);
    assert.doesNotMatch(source, /requireUser/);
  }
});
