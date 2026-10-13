import assert from "node:assert/strict";
import test from "node:test";
import { parsePurchasesFilters, PurchasesInvalidFilterError } from "../src/lib/purchases-contract";

test("filtros de compras rechazan fechas inexistentes y aceptan días válidos", () => {
  for (const field of ["createdFrom", "createdTo", "expectedFrom", "expectedTo"]) {
    for (const day of ["2026-02-30", "2026-99-99", "2026-02-29", "2026-04-31"]) assert.throws(() => parsePurchasesFilters(new URLSearchParams({ [field]: day })), PurchasesInvalidFilterError);
    for (const day of ["2024-02-29", "2026-04-30"]) assert.equal(parsePurchasesFilters(new URLSearchParams({ [field]: day }))[field as "createdFrom"], day);
  }
});
