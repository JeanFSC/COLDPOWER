import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => readFile(path.join(root, file), "utf8");

test("pagos: el centro vigente consulta proveedor, confirma y solicita reembolso", async () => {
  const page = await read("src/app/admin/pagos/page.tsx");
  const workspace = await read("src/components/admin/PaymentsControlCenter.tsx");
  const manual = await read("src/components/admin/ManualPaymentControl.tsx");

  assert.match(page, /PaymentsControlCenter/);
  assert.match(workspace, /ManualPaymentControl/);
  assert.match(workspace, /\/api\/admin\/pagos\/" \+ encodeURIComponent\(paymentId\) \+ "\/status/);
  assert.match(workspace, /\/api\/admin\/pagos\/" \+ encodeURIComponent\(paymentId\) \+ "\/refund/);
  assert.match(workspace, /Idempotency-Key/);
  assert.match(workspace, /role="alert"/);
  assert.match(manual, /\/api\/admin\/pagos\/manual/);
});
