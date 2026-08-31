import assert from "node:assert/strict";
import test from "node:test";
import { notificationStates, promotionTypes, validatePromotionInput } from "../src/lib/operations-validation";

test("promoción valida tipo, descuento y fechas", () => {
  assert.deepEqual(validatePromotionInput({ name: "Campaña real", type: "PERCENTAGE", discountValue: "10", startsAt: "2026-08-12T00:00:00.000Z", endsAt: "2026-09-12T00:00:00.000Z" }), { name: "Campaña real", description: null, type: "PERCENTAGE", discountValue: "10.00", startsAt: "2026-08-12T00:00:00.000Z", endsAt: "2026-09-12T00:00:00.000Z", status: "DRAFT", bannerAssetId: null, productIds: [], categoryIds: [], priority: 0, policy: "EXCLUSIVE" });
  assert.throws(() => validatePromotionInput({ name: "Campaña", type: "PERCENTAGE", discountValue: "110", startsAt: "2026-08-12", endsAt: "2026-09-12" }), /descuento/i);
  assert.ok(promotionTypes.includes("SPECIAL_PRICE"));
});

test("notificaciones solo tienen estados controlados", () => {
  assert.deepEqual(notificationStates, ["UNREAD", "READ", "DISMISSED"]);
});
