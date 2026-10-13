import assert from "node:assert/strict";
import test from "node:test";
import { assertPromotionConflict } from "../src/lib/promotion-service";
import { validatePromotionInput } from "../src/lib/operations-validation";

function executor(rows: unknown[][]) {
  return { execute: async () => undefined, select: () => ({ from: () => ({ where: () => Promise.resolve(rows.shift() ?? []) }) }) };
}
const input = validatePromotionInput({ name: "QA conflict", type: "AMOUNT", discountValue: 1, startsAt: "2035-01-01T00:00:00Z", endsAt: "2035-02-01T00:00:00Z", status: "ACTIVE", policy: "EXCLUSIVE", priority: 0 });
test("global exclusive campaign conflicts with scoped exclusive campaign", async () => {
  await assert.rejects(assertPromotionConflict(executor([[{ id: "qa-existing", name: "QA", policy: "EXCLUSIVE" }], [{ productId: "qa-product" }], []]), input), /conflicto/);
});
test("category and product scopes intersect in either direction", async () => {
  const existing = [{ id: "qa-existing", name: "QA", policy: "EXCLUSIVE" }];
  await assert.rejects(assertPromotionConflict(executor([existing, [], [{ categoryId: "qa-category" }], [{ id: "qa-product", categoryId: "qa-category" }]]), { ...input, productIds: ["qa-product"] }), /conflicto/);
  await assert.rejects(assertPromotionConflict(executor([existing, [{ productId: "qa-product" }], [], [{ id: "qa-product", categoryId: "qa-category" }]]), { ...input, categoryIds: ["qa-category"] }), /conflicto/);
});
test("unrelated scopes and stackable policies remain allowed", async () => {
  const existing = [{ id: "qa-existing", name: "QA", policy: "EXCLUSIVE" }];
  await assertPromotionConflict(executor([existing, [{ productId: "qa-other" }], [], [{ id: "qa-other", categoryId: "qa-other-category" }]]), { ...input, categoryIds: ["qa-category"] });
  await assertPromotionConflict(executor([existing]), { ...input, policy: "STACKABLE" });
  await assert.rejects(assertPromotionConflict(executor([existing, [], []]), { ...input, productIds: ["qa-product"] }), /conflicto/);
});
