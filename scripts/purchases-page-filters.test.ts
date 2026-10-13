import assert from "node:assert/strict";
import test from "node:test";
import { resolvePurchasesPageFilters } from "../src/lib/purchases-page-filters";
import { parsePurchasesFilters } from "../src/lib/purchases-contract";

test("filtros inválidos se restablecen para lista, exportación y navegación", () => {
  const result = resolvePurchasesPageFilters(new URLSearchParams({ query: "QA", createdFrom: "2026-02-30", purchaseId: "qa-order", requestPage: "2" }));
  assert.deepEqual(result.filters, {});
  assert.match(result.filterNotice!, /lista y la exportación/);
  assert.equal(result.exportHref, "/api/admin/compras/export");
  assert.equal(new URLSearchParams(result.queryString).get("purchaseId"), "qa-order");
  assert.equal(new URLSearchParams(result.queryString).get("requestPage"), "2");
  assert.equal(new URLSearchParams(result.queryString).has("createdFrom"), false);
});
test("filtros válidos usan exportación canónica sin IDs de detalle", () => {
  const result = resolvePurchasesPageFilters(new URLSearchParams({ q: " QA ", status: "DRAFT", supplierId: "qa-provider", receiptId: "qa-receipt" }));
  assert.equal(result.filterNotice, undefined);
  const exported = new URL(result.exportHref, "http://localhost").searchParams;
  assert.deepEqual(parsePurchasesFilters(exported), result.filters);
  assert.equal(exported.has("receiptId"), false);
  assert.equal(exported.get("query"), "QA");
});
