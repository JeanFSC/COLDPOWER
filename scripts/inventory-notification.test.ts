import assert from "node:assert/strict";
import test from "node:test";
import { inventoryNotification } from "../src/lib/inventory-notification";

const base = { productId: "qa/product", productName: "Producto QA", locationId: "qa local", locationName: "Sucursal Piura", available: 0, minimumStock: null };
test("stock agotado identifica el local y conserva destino y deduplicación", () => {
  const notice = inventoryNotification(base)!;
  assert.match(notice.body, /en Sucursal Piura/);
  const url = new URL(notice.link, "http://localhost");
  assert.equal(url.searchParams.get("productId"), base.productId);
  assert.equal(url.searchParams.get("locationId"), base.locationId);
  assert.equal(notice.dedupeKey, "stock:qa/product:qa local:out");
  assert.equal(notice.metadata.available, 0);
});
test("stock mínimo conserva umbral y no avisa por encima o sin mínimo", () => {
  const notice = inventoryNotification({ ...base, available: 2, minimumStock: 2 })!;
  assert.equal(notice.type, "STOCK_MINIMUM");
  assert.match(notice.body, /en Sucursal Piura/);
  assert.equal(notice.dedupeKey, "stock:qa/product:qa local:minimum:2");
  assert.equal(inventoryNotification({ ...base, available: 3, minimumStock: 2 }), null);
  assert.equal(inventoryNotification({ ...base, available: 1 }), null);
  assert.match(inventoryNotification({ ...base, locationName: null })!.body, /en qa local/);
});
