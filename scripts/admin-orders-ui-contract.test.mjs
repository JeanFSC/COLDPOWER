import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => readFile(path.join(root, file), "utf8");

test("pedidos: la acción principal abre operaciones y los errores son visibles", async () => {
  const views = await read("src/components/admin/AdminCategoryViews.tsx");
  const status = await read("src/components/admin/OrderStatusControl.tsx");
  const payment = await read("src/components/admin/ManualPaymentControl.tsx");

  assert.match(views, /href="#order-controls"/);
  assert.match(views, /id="order-controls"/);
  assert.match(status, /role="alert"|role=\{[^}]*"alert"/);
  assert.match(payment, /role="alert"|role=\{[^}]*"alert"/);
});
