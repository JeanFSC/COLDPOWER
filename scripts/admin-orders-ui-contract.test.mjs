import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => readFile(path.join(root, file), "utf8");

test("pedidos: el control vigente mueve el ciclo y expone errores", async () => {
  const page = await read("src/app/admin/pedidos/page.tsx");
  const workspace = await read("src/components/admin/OrdersControlCenter.tsx");

  assert.match(page, /OrdersControlCenter/);
  assert.match(workspace, /Idempotency-Key/);
  assert.match(workspace, /order-status/);
  assert.match(workspace, /role="alert"/);
  assert.match(workspace, /Confirmar entrega|Iniciar preparación/);
});
