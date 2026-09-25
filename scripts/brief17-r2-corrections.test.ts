import assert from "node:assert/strict";
import test from "node:test";
import { calculateTaxBreakdown, unconfiguredTaxBreakdown } from "../src/lib/tax";
import { startOfLimaDay, startOfNextLimaDay } from "../src/lib/lima-datetime";
import { isValidPeruvianDni, isValidPeruvianRuc } from "../src/lib/peru-documents";
import { validateQuotePayload } from "../src/lib/quote";

test("R2 valida DNI y RUC peruano con prefijo y módulo 11", () => {
  assert.equal(isValidPeruvianDni("12345678"), true);
  assert.equal(isValidPeruvianDni("1234567"), false);
  assert.equal(isValidPeruvianDni("123456789"), false);
  assert.equal(isValidPeruvianRuc("20123456786"), true);
  assert.equal(isValidPeruvianRuc("20123456787"), false);
  assert.equal(isValidPeruvianRuc("21123456786"), false);
  assert.equal(isValidPeruvianRuc("2012345678"), false);
});

test("R2 conserva el límite real de cotización", () => {
  const valid = validateQuotePayload(
    { name: "Ana", email: "ana@example.com", itemCount: 1 },
    { requireItems: true },
  );
  assert.equal(valid.ok, true);
  const withoutContact = validateQuotePayload({ name: "Ana", itemCount: 1 }, { requireItems: true });
  assert.equal(withoutContact.ok, false);
  const withoutItems = validateQuotePayload({ name: "Ana", email: "ana@example.com" }, { requireItems: true });
  assert.equal(withoutItems.ok, false);
  if (!withoutItems.ok) assert.match(withoutItems.errors.items ?? "", /referencia/i);
});

test("R2 calcula IGV únicamente cuando existe configuración explícita", () => {
  const included = calculateTaxBreakdown({ amount: "118.00", taxType: "GRAVADO", rate: 18, mode: "INCLUDED" });
  assert.deepEqual(
    { status: included.status, taxableOperation: included.taxableOperation, igv: included.igv, total: included.total },
    { status: "CONFIGURED", taxableOperation: "100.00", igv: "18.00", total: "118.00" },
  );
  const excluded = calculateTaxBreakdown({ amount: "100.00", taxType: "GRAVADO", rate: 18, mode: "EXCLUDED" });
  assert.equal(excluded.total, "118.00");
  const exempt = calculateTaxBreakdown({ amount: "100.00", taxType: "EXONERADO", rate: 18, mode: "EXCLUDED" });
  assert.deepEqual({ taxableOperation: exempt.taxableOperation, igv: exempt.igv, total: exempt.total }, { taxableOperation: "0.00", igv: "0.00", total: "100.00" });
  assert.equal(unconfiguredTaxBreakdown().status, "UNCONFIGURED");
  assert.equal(calculateTaxBreakdown({ amount: "118.00", taxType: "GRAVADO", rate: null, mode: "INCLUDED" }).status, "UNCONFIGURED");
});

test("R2 interpreta filtros de fecha como días calendario de Lima", () => {
  const start = startOfLimaDay("2026-09-24");
  const next = startOfNextLimaDay("2026-09-24");
  assert.equal(start.toISOString(), "2026-09-24T05:00:00.000Z");
  assert.equal(next.toISOString(), "2026-09-25T05:00:00.000Z");
  const orderAt2330 = new Date("2026-09-25T04:30:00.000Z");
  const nextDayAt0000 = new Date("2026-09-25T05:00:00.000Z");
  assert.equal(orderAt2330 >= start && orderAt2330 < next, true);
  assert.equal(nextDayAt0000 >= start && nextDayAt0000 < next, false);
});
