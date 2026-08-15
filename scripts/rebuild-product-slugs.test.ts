import test from "node:test";
import assert from "node:assert/strict";

import { planSlugRebuild } from "./rebuild-product-slugs";

test("plans a deterministic slug rebuild without changing SKU identity", () => {
  const plan = planSlugRebuild([
    { id: "product-2", sku: "CP-002", normalizedName: "Bomba de agua 220 V", slug: "bomba-de-agua-220-v-cp-002" },
    { id: "product-1", sku: "CP-001", normalizedName: "Bomba de agua 220 V", slug: "bomba-de-agua-220-v-cp-001" },
    { id: "product-3", sku: "CP-003", normalizedName: "Capacitor 40UF", slug: "capacitor-40uf-cp-003" },
  ]);

  assert.equal(plan.totalProducts, 3);
  assert.equal(plan.unchanged, 1);
  assert.deepEqual(plan.changes, [
    { id: "product-1", sku: "CP-001", oldSlug: "bomba-de-agua-220-v-cp-001", newSlug: "bomba-de-agua-220-v" },
    { id: "product-3", sku: "CP-003", oldSlug: "capacitor-40uf-cp-003", newSlug: "capacitor-40uf" },
  ]);
});
