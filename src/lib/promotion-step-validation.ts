import type { PromotionPriceStep } from "./retail-price";

function cents(value: string | number) {
  const amount = Number(value);
  const rounded = Math.round(amount * 100);
  if (!Number.isFinite(amount) || amount < 0 || !Number.isSafeInteger(rounded) || Math.abs(amount * 100 - rounded) > 0.000001) throw new Error("PROMOTION_STEPS_INVALID");
  return rounded;
}

export function assertPromotionSteps(baseUnitPrice: string | number, steps: PromotionPriceStep[]) {
  let current = cents(baseUnitPrice);
  const ids = new Set<string>();
  for (const step of steps) {
    const base = cents(step.baseUnitPrice);
    const discount = cents(step.discountAmount);
    const final = cents(step.finalUnitPrice);
    if (!step.promotionId.trim() || ids.has(step.promotionId) || base !== current || final > base || discount !== base - final) throw new Error("PROMOTION_STEPS_INVALID");
    ids.add(step.promotionId);
    current = final;
  }
}
