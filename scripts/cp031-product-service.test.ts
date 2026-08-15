import assert from "node:assert/strict";
import test from "node:test";
import { buildManualProductInsert } from "@/lib/catalog-product-service";

test("manual product starts as DRAFT and preserves imported identity", () => {
  const values = buildManualProductInsert({ sku: "MAN-001", commercialName: "Producto manual", categoryId: "cat", familyId: "fam", brandId: "brand" }, "actor-1");
  assert.equal(values.status, "MANUAL");
  assert.equal(values.publicationStatus, "draft");
  assert.equal(values.sku, "MAN-001");
  assert.equal(values.sourcePage, null);
  assert.equal(values.sourceRow, null);
});
