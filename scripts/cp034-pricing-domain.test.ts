import assert from "node:assert/strict";
import test from "node:test";
import { getPriceEffectiveStatus, isPriceEffectiveAt, resolvePricingStates } from "@/lib/pricing-domain";
import { normalizePriceDetails, validateDiscountInput } from "@/lib/pricing-validation";

const at = new Date("2026-08-31T15:00:00Z");
const price = (overrides: Partial<{ id: string; priceType: "RETAIL" | "SPECIAL" | "WHOLESALE"; amount: string; validFrom: Date; validUntil: Date | null; active: boolean; status: string; wholesaleMinQty: number | null }>) => ({ id: "p", priceType: "RETAIL" as const, amount: "100.00", currency: "PEN", wholesaleMinQty: null, minimumAllowed: null, status: "ACTIVE", active: true, validFrom: new Date("2026-08-01T00:00:00Z"), validUntil: null, ...overrides });

test("CP-034 calcula vigencia efectiva con estados actuales, futuros, vencidos y archivados", () => {
  assert.equal(isPriceEffectiveAt(price({}), at), true);
  assert.equal(getPriceEffectiveStatus(price({ validFrom: new Date("2026-09-01T00:00:00Z") }), at), "SCHEDULED");
  assert.equal(getPriceEffectiveStatus(price({ validUntil: new Date("2026-08-30T00:00:00Z") }), at), "EXPIRED");
  assert.equal(getPriceEffectiveStatus(price({ status: "ARCHIVED", active: false }), at), "ARCHIVED");
  assert.equal(getPriceEffectiveStatus(null, at), "MISSING");
});

test("CP-034 resuelve por tipo canónico y no usa COST como cobertura minorista", () => {
  const states = resolvePricingStates([price({ id: "retail", amount: "90.00" }), price({ id: "special", priceType: "SPECIAL", amount: "80.00" }), price({ id: "cost", priceType: "RETAIL", status: "ARCHIVED", active: false, amount: "40.00" })], false, at);
  assert.equal(states.retail?.id, "retail");
  assert.equal(states.special?.priceType, "SPECIAL");
  assert.equal("cost" in states, false);
});

test("CP-034 obliga cantidad mayorista y conserva umbral de aprobación dentro del máximo", () => {
  assert.throws(() => normalizePriceDetails({ amount: "100", currency: "PEN", priceType: "WHOLESALE" }), /mayorista/);
  assert.deepEqual(validateDiscountInput({ name: "Comercial", maxPercentage: "20", approvalAbovePercentage: "15" }), { name: "Comercial", maxPercentage: "20.00", approvalAbovePercentage: "15.00" });
  assert.throws(() => validateDiscountInput({ name: "Comercial", maxPercentage: "15", approvalAbovePercentage: "20" }), /aprobación/);
});
