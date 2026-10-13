import assert from "node:assert/strict";
import test from "node:test";
import { eq } from "drizzle-orm";
import { closeDb, getDb } from "../src/db";
import { products } from "../src/db/schema";
import { promotions, promotionProducts, promotionCategories } from "../src/db/operations-schema";
import { assertPromotionConflict, PromotionDomainError } from "../src/lib/promotion-service";
import { validatePromotionInput } from "../src/lib/operations-validation";

test("QA: alcances exclusivos reales y rollback de fixture", { skip: process.env.QA_PROMOTION_CONFLICT !== "1", timeout: 60_000 }, async () => {
  assert.notEqual(process.env.NODE_ENV, "production");
  const db = getDb();
  const id = `qa-promotion-scope-${crypto.randomUUID()}`;
  const rollback = new Error("QA_SCOPE_ROLLBACK");
  try {
    const [product] = await db.select().from(products).where(eq(products.id, "product-ea613220-8707-42c0-abdb-80b6c2d639d3"));
    assert.equal(product.sku, "QA-AUD-20261006");
    assert.ok(product.categoryId);
    const input = validatePromotionInput({ name: id, type: "AMOUNT", discountValue: 1, startsAt: "2090-01-01T00:00:00Z", endsAt: "2090-02-01T00:00:00Z", status: "ACTIVE", policy: "EXCLUSIVE", priority: 0 });
    const conflict = (error: unknown) => error instanceof PromotionDomainError && error.code === "PROMOTION_CONFLICT";
    await assert.rejects(db.transaction(async tx => {
      assert.equal((await tx.select().from(promotions).where(eq(promotions.status, "ACTIVE"))).filter(row => row.startsAt < new Date(input.endsAt) && row.endsAt > new Date(input.startsAt)).length, 0, "QA interval must be isolated");
      await tx.insert(promotions).values({ id, name: id, type: input.type, discountValue: input.discountValue, startsAt: new Date(input.startsAt), endsAt: new Date(input.endsAt), status: "ACTIVE", policy: "EXCLUSIVE" });
      await tx.insert(promotionProducts).values({ id: `${id}-product`, promotionId: id, productId: product.id });
      await assert.rejects(assertPromotionConflict(tx, input), conflict);
      await assert.rejects(assertPromotionConflict(tx, { ...input, categoryIds: [product.categoryId!] }), conflict);
      await assertPromotionConflict(tx, input, id);
      await assertPromotionConflict(tx, { ...input, policy: "STACKABLE" });
      await tx.delete(promotionProducts).where(eq(promotionProducts.promotionId, id));
      await tx.insert(promotionCategories).values({ id: `${id}-category`, promotionId: id, categoryId: product.categoryId! });
      await assert.rejects(assertPromotionConflict(tx, { ...input, productIds: [product.id] }), conflict);
      await tx.delete(promotionCategories).where(eq(promotionCategories.promotionId, id));
      await assert.rejects(assertPromotionConflict(tx, { ...input, productIds: [product.id] }), conflict);
      await assertPromotionConflict(tx, { ...input, startsAt: input.endsAt, endsAt: "2090-03-01T00:00:00Z" });
      throw rollback;
    }), error => error === rollback);
    assert.equal((await db.select().from(promotions).where(eq(promotions.id, id))).length, 0);
    console.log(JSON.stringify({ fixture: id, retainedCampaigns: 0, originalCampaignChanged: false }));
  } finally { await closeDb(); }
});
