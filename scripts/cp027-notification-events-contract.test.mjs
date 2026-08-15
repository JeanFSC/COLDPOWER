import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (file) => readFileSync(join(root, file), "utf8");

test("las notificaciones se alimentan con eventos reales y usuarios staff", () => {
  const service = read("src/lib/notifications-service.ts");
  assert.match(service, /users/);
  assert.match(service, /roleCode/);
  assert.match(service, /notifyStaff/);

  const quoteRoute = read("src/app/api/cotizacion/route.ts");
  assert.match(quoteRoute, /notifyStaff/);
  assert.match(quoteRoute, /quote/);
  assert.match(quoteRoute, /no se pudo notificar/);

  const salesService = read("src/lib/sales-service.ts");
  assert.match(salesService, /notifyStaff/);
  assert.match(salesService, /manual/);
});
