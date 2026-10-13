import assert from "node:assert/strict";
import test from "node:test";
import { resolvePricingPageFilters } from "../src/lib/pricing-page-filters";
import { parsePricingFilters, parsePricingHistoryFilters, PricingInvalidFilterError } from "../src/lib/pricing-contract";

test("invalid pricing filters announce reset and export the actual unfiltered scope", () => {
  const result = resolvePricingPageFilters({ query: "QA", effectiveStatus: "QA_INVALID" });
  assert.deepEqual(result.filters, {});
  assert.match(result.filterNotice ?? "", /restablecieron/);
  assert.equal(result.exportHref, "/api/admin/precios/export");
});
test("valid pricing export preserves normalized filters including false and repeated first value", () => {
  const result = resolvePricingPageFilters({ query: [" QA ", "other"], hasPromotion: "false", priceType: "RETAIL", page: "2", unrelated: "ignored" });
  const params = new URL(result.exportHref, "http://localhost").searchParams;
  assert.equal(params.get("query"), "QA");
  assert.equal(params.get("hasPromotion"), "false");
  assert.equal(params.has("unrelated"), false);
  assert.deepEqual(parsePricingFilters(params), result.filters);
  assert.equal(result.filterNotice, undefined);
});

test("pricing and history filters reject impossible calendar dates", () => {
  for (const date of ["2026-02-30", "2026-99-99", "2026-02-29", "2026-04-31"]) {
    for (const key of ["validFrom", "validUntil", "updatedFrom", "updatedUntil"]) {
      assert.throws(() => parsePricingFilters(new URLSearchParams({ [key]: date })), PricingInvalidFilterError);
    }
    for (const key of ["from", "to"]) assert.throws(() => parsePricingHistoryFilters(new URLSearchParams({ [key]: date })), PricingInvalidFilterError);
    assert.ok(resolvePricingPageFilters({ updatedFrom: date }).filterNotice);
  }
  assert.equal(parsePricingFilters(new URLSearchParams({ updatedFrom: "2024-02-29" })).updatedFrom, "2024-02-29");
  assert.equal(parsePricingHistoryFilters(new URLSearchParams({ from: "2026-04-30" })).from, "2026-04-30");
});
