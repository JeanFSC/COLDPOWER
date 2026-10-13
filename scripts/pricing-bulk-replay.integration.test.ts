import assert from "node:assert/strict";
import test from "node:test";
import { and, eq } from "drizzle-orm";
import { closeDb, getDb } from "../src/db";
import { productPrices, products, users } from "../src/db/schema";
import { reportSchedules } from "../src/db/reporting-schema";
import { applyBulkPrice, previewBulkPrice } from "../src/lib/pricing-bulk-service";
import { archivePrice, type PricingActor } from "../src/lib/pricing-service";

test("QA: reintento masivo anterior no revierte un cambio posterior", { skip: process.env.QA_PRICING_BULK !== "1", timeout: 60_000 }, async () => {
  assert.notEqual(process.env.NODE_ENV, "production");
  const db = getDb();
  const productId = "product-000-qa-stock-3e69efbb-cd55-411f-aeb5-e42f4c253ae6";
  let actor: PricingActor | undefined;
  try {
    const [product] = await db.select().from(products).where(eq(products.id, productId));
    assert.equal(product.sku, "qa-stock-3e69efbb-cd55-411f-aeb5-e42f4c253ae6");
    assert.equal((await db.select().from(productPrices).where(and(eq(productPrices.productId, productId), eq(productPrices.active, true)))).length, 0);
    const [reference] = await db.select().from(reportSchedules).where(eq(reportSchedules.id, "report-schedule-e0115752-abcf-47af-a8e9-81716c52ce49"));
    assert.match(reference.name, /^QA AUDITORÍA/);
    const [owner] = await db.select().from(users).where(eq(users.id, reference.createdBy));
    assert.equal(owner.status, "ACTIVE");
    actor = { userId: owner.id, role: (owner.roleCode ?? owner.role) as PricingActor["role"] };
    const input = { productIds: [productId], priceType: "RETAIL", operation: "SET", amount: "12.00", currency: "PEN", reason: "QA AUDITORÍA — reintento masivo", idempotencyKey: `qa-bulk-${crypto.randomUUID()}` };
    assert.equal((await previewBulkPrice({ ...input, productIds: [`qa-missing-${crypto.randomUUID()}`] }, actor)).blocked, 1);
    const concurrent = await Promise.all([applyBulkPrice(input, actor), applyBulkPrice(input, actor)]);
    assert.equal(concurrent.filter(result => result.idempotent).length, 1);
    const first = concurrent.find(result => !result.idempotent)!;
    const reviewed = await previewBulkPrice({ ...input, operation: "INCREASE_PERCENT", percentage: "10" }, actor);
    await applyBulkPrice({ ...input, amount: "13.00", idempotencyKey: `qa-bulk-${crypto.randomUUID()}` }, actor);
    await assert.rejects(applyBulkPrice({ ...input, operation: "INCREASE_PERCENT", percentage: "10", preflightFingerprint: reviewed.fingerprint, idempotencyKey: `qa-bulk-stale-${crypto.randomUUID()}` }, actor), /BULK_STALE_PREFLIGHT/);
    const replay = await applyBulkPrice(input, actor);
    const [current] = await db.select().from(productPrices).where(and(eq(productPrices.productId, productId), eq(productPrices.active, true)));
    console.log(JSON.stringify({ firstIdempotent: first.idempotent, replayIdempotent: replay.idempotent, amountAfterReplay: current.amount }));
    assert.equal(first.idempotent, false);
    assert.equal(replay.idempotent, true);
    assert.equal(current.amount, "13.00");
    const freshReview = await previewBulkPrice({ ...input, amount: "13.00" }, actor);
    const approved = { ...input, amount: "13.00", preflightFingerprint: freshReview.fingerprint, idempotencyKey: `qa-bulk-reviewed-${crypto.randomUUID()}` };
    assert.equal((await applyBulkPrice(approved, actor)).idempotent, false);
    assert.equal((await applyBulkPrice(approved, actor)).idempotent, true);
    await assert.rejects(applyBulkPrice({ ...input, amount: "14.00" }, actor), /BULK_IDEMPOTENCY_CONFLICT/);
    const archive = { ...input, operation: "ARCHIVE", idempotencyKey: `qa-bulk-archive-${crypto.randomUUID()}` };
    assert.equal((await applyBulkPrice(archive, actor)).idempotent, false);
    assert.equal((await applyBulkPrice(archive, actor)).idempotent, true);
  } finally {
    try {
      if (actor) for (const row of await db.select().from(productPrices).where(and(eq(productPrices.productId, productId), eq(productPrices.active, true)))) {
        await archivePrice(row.id, "QA AUDITORÍA — finalizar reproducción masiva", actor, `qa-bulk-cleanup-${crypto.randomUUID()}`);
      }
    } finally { await closeDb(); }
  }
});
