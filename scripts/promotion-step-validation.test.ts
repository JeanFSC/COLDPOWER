import assert from "node:assert/strict";
import test from "node:test";
import { assertPromotionSteps } from "../src/lib/promotion-step-validation";

const step = { promotionId: "qa-a", baseUnitPrice: "11.00", discountAmount: "1.10", finalUnitPrice: "9.90" };
test("promotion snapshots preserve the full price chain", () => {
  assertPromotionSteps("11.00", [step, { promotionId: "qa-b", baseUnitPrice: "9.90", discountAmount: "0.90", finalUnitPrice: "9.00" }]);
  assertPromotionSteps(0, []);
  for (const base of ["12.00", "NaN", "-1", "11.001"]) assert.throws(() => assertPromotionSteps(base, [step]), /PROMOTION_STEPS_INVALID/);
  for (const changed of [{ discountAmount: "2.00" }, { finalUnitPrice: "12.00" }, { discountAmount: "NaN" }, { finalUnitPrice: "9.901" }]) assert.throws(() => assertPromotionSteps("11.00", [{ ...step, ...changed }]), /PROMOTION_STEPS_INVALID/);
  assert.throws(() => assertPromotionSteps("11.00", [step, step]), /PROMOTION_STEPS_INVALID/);
});
