export type PromotionalPriceInput = {
  id: string;
  type: "PERCENTAGE" | "AMOUNT" | "SPECIAL_PRICE";
  discountValue: string;
};

export function calculatePromotionalUnitPrice(
  promotion: PromotionalPriceInput,
  baseUnitPrice: string | number,
) {
  const base = Number(baseUnitPrice);
  const value = Number(promotion.discountValue);
  if (!Number.isFinite(base) || base < 0) throw new Error("PROMOTION_BASE_PRICE_INVALID");
  if (!Number.isFinite(value)) throw new Error("PROMOTION_VALUE_INVALID");
  let final = promotion.type === "PERCENTAGE"
    ? base * (1 - value / 100)
    : promotion.type === "AMOUNT"
      ? base - value
      : Math.min(value, base);
  final = Math.max(0, Math.round(final * 100) / 100);
  return {
    baseUnitPrice: base.toFixed(2),
    discountAmount: Math.max(0, Math.round((base - final) * 100) / 100).toFixed(2),
    finalUnitPrice: final.toFixed(2),
  };
}
