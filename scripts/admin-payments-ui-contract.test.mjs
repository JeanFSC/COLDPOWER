import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => readFile(path.join(root, file), "utf8");

test("pagos: las acciones consultan proveedor y solicitan reembolso con confirmación", async () => {
  const views = await read("src/components/admin/AdminCategoryViews.tsx");
  const page = await read("src/app/admin/pagos/page.tsx");
  const actions = await read("src/components/admin/PaymentActions.tsx");

  assert.match(views, /href="#payment-controls"/);
  assert.match(views, /id="payment-controls"/);
  assert.match(page, /PaymentActions/);
  assert.match(actions, /\/api\/admin\/pagos\/\$\{paymentId\}\/status/);
  assert.match(actions, /\/api\/admin\/pagos\/\$\{paymentId\}\/refund/);
  assert.match(actions, /role=\{[^}]*"alert"/);
  assert.match(actions, /Idempotency-Key/);
});
