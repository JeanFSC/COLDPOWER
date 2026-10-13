import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { parsePricingFilters, parsePricingHistoryFilters } from "@/lib/pricing-contract";
import { isPriceWindowOverlapping, validateDiscountRuleStatus } from "@/lib/pricing-service";
import { toPricingCsv } from "@/lib/pricing-export";

test("precios bloquean la clave antes del replay y comparan el contenido editado", () => {
  const source = readFileSync("src/lib/pricing-service.ts", "utf8");
  for (const name of ["createPrice", "updatePrice", "schedulePriceReplacement", "archivePrice"]) {
    const body = source.split(`export async function ${name}`)[1].split("export async function")[0];
    assert.ok(body.indexOf("await lockPriceRequest(tx, requestKey)") < body.indexOf("if (requestKey)"));
  }
  assert.match(source, /previousRequest.id === id && samePriceRequest/);
  assert.match(source, /row.wholesaleMinQty === values.wholesaleMinQty/);
  assert.match(source, /row.minimumAllowed === values.minimumAllowed/);
});

test("CP-033 parses combined server filters and pagination", () => {
  const filters = parsePricingFilters(new URLSearchParams("query=compresor&sku=CP-1&productId=p1&categoryId=c1&familyId=f1&brandId=b1&priceType=RETAIL&status=ACTIVE&active=true&page=2&pageSize=25"));
  assert.deepEqual(filters, { query: "compresor", sku: "CP-1", productId: "p1", categoryId: "c1", familyId: "f1", brandId: "b1", priceType: "RETAIL", status: "ACTIVE", active: true, page: 2, pageSize: 25 });
});

test("CP-033 rejects invalid pricing filters and history ranges", () => {
  assert.throws(() => parsePricingFilters(new URLSearchParams("priceType=NOPE")), /PRICING_INVALID_FILTER/);
  assert.throws(() => parsePricingFilters(new URLSearchParams("active=maybe")), /PRICING_INVALID_FILTER/);
  assert.throws(() => parsePricingHistoryFilters(new URLSearchParams("from=2026-08-14&to=2026-08-01")), /PRICING_INVALID_FILTER/);
});

test("CP-033 rejects overlapping price windows for the same product and type", () => {
  const existing = { validFrom: new Date("2026-08-01T00:00:00Z"), validUntil: new Date("2026-09-01T00:00:00Z") };
  assert.equal(isPriceWindowOverlapping(existing, { validFrom: new Date("2026-08-15T00:00:00Z"), validUntil: null }), true);
  assert.equal(isPriceWindowOverlapping(existing, { validFrom: new Date("2026-09-01T00:00:00Z"), validUntil: null }), false);
});

test("CP-033 discount status changes are controlled and idempotent", () => {
  assert.equal(validateDiscountRuleStatus("ACTIVE"), "ACTIVE");
  assert.equal(validateDiscountRuleStatus("INACTIVE"), "INACTIVE");
  assert.throws(() => validateDiscountRuleStatus("DELETED"), /DISCOUNT_INVALID_STATUS/);
});

test("CP-033 pricing CSV omits COST for actors without cost permission", () => {
  const csv = toPricingCsv({ items: [{ id: "p1", productId: "p1", sku: "CP-1", productName: "Compresor", categoryId: null, categoryName: null, familyId: null, familyName: null, brandId: null, brandName: null, price: null, priceType: "RETAIL", amount: "50.00", currency: "PEN" }], page: 1, pageSize: 10, totalItems: 1, totalPages: 1, metrics: { totalWithPrice: 1, totalWithoutPrice: 0, activePrices: 1, promotions: 0, expiredPrices: 0 }, facets: { categories: [], families: [], brands: [], statuses: [] } }, false);
  assert.match(csv, /CP-1/);
  assert.doesNotMatch(csv, /COST|costo/i);
});
