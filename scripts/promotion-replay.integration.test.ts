import assert from "node:assert/strict";
import test from "node:test";
import { eq } from "drizzle-orm";
import { closeDb, getDb } from "../src/db";
import { auditLogs, products } from "../src/db/schema";
import { promotionApplications, promotions } from "../src/db/operations-schema";
import { applyPromotion, recordPromotionalApplicationsInTransaction } from "../src/lib/promotion-service";

test("QA: fallo de auditoría revierte la aplicación individual", { skip: process.env.QA_PROMOTION_REPLAY !== "1", timeout: 60_000 }, async () => {
  assert.notEqual(process.env.NODE_ENV, "production");
  const db = getDb();
  const id = `qa-promotion-rollback-${crypto.randomUUID()}`;
  const productId = "product-ea613220-8707-42c0-abdb-80b6c2d639d3";
  const originalTransaction = db.transaction;
  let applicationSeen = false;
  try {
    const [product] = await db.select().from(products).where(eq(products.id, productId));
    assert.equal(product.sku, "QA-AUD-20261006");
    // The temporary campaign exists only inside the transaction that must roll back.
    db.transaction = (async (callback: Parameters<typeof originalTransaction>[0]) => originalTransaction.call(db, async tx => {
      await tx.insert(promotions).values({ id, name: `QA AUDITORÍA rollback ${id}`, type: "AMOUNT", discountValue: "1.00", startsAt: new Date(Date.now() - 60_000), endsAt: new Date(Date.now() + 60_000), status: "ACTIVE", policy: "EXCLUSIVE" });
      const wrapped = new Proxy(tx, { get(target, property) {
        if (property === "insert") return (table: unknown) => table === auditLogs ? { values: async () => {
          const rows = await tx.select().from(promotionApplications).where(eq(promotionApplications.idempotencyKey, id));
          assert.equal(rows.length, 1);
          applicationSeen = true;
          throw new Error("QA_FORCED_AUDIT_FAILURE");
        } } : target.insert(table as Parameters<typeof target.insert>[0]);
        const value = Reflect.get(target, property);
        return typeof value === "function" ? value.bind(target) : value;
      } });
      return callback(wrapped);
    })) as typeof originalTransaction;
    await assert.rejects(applyPromotion({ promotionId: id, productId, contextType: "QA_AUDITORIA", contextId: id, idempotencyKey: id, baseUnitPrice: "11.00" }), /QA_FORCED_AUDIT_FAILURE/);
    assert.equal(applicationSeen, true);
    assert.equal((await db.select().from(promotionApplications).where(eq(promotionApplications.idempotencyKey, id))).length, 0);
    assert.equal((await db.select().from(promotions).where(eq(promotions.id, id))).length, 0);
    console.log(JSON.stringify({ rollbackFixture: id, applicationSeenInsideTransaction: applicationSeen, persistedApplications: 0 }));
  } finally { db.transaction = originalTransaction; await closeDb(); }
});

test("QA: replay de promoción conserva producto, campaña, contexto e importe base", { skip: process.env.QA_PROMOTION_REPLAY !== "1", timeout: 60_000 }, async () => {
  assert.notEqual(process.env.NODE_ENV, "production");
  const db = getDb();
  const id = `qa-promotion-replay-${crypto.randomUUID()}`;
  try {
    const [product] = await db.select().from(products).where(eq(products.id, "product-ea613220-8707-42c0-abdb-80b6c2d639d3"));
    assert.equal(product.sku, "QA-AUD-20261006");
    const [promotion] = await db.select().from(promotions).where(eq(promotions.id, "promotion-429e0d29-be29-4fd8-89b1-72c2bd511f35"));
    assert.equal(promotion.status, "INACTIVE");
    const input = { promotionId: promotion.id, productId: product.id, contextType: "QA_AUDITORIA", contextId: id, baseUnitPrice: "11.00", idempotencyKey: id };
    await db.transaction(async tx => {
      await tx.insert(promotionApplications).values({ id, ...input, discountAmount: "1.10", finalUnitPrice: "9.90" });
      await tx.insert(auditLogs).values({ id: `audit-${crypto.randomUUID()}`, actorId: null, actorRole: "SYSTEM", action: "qa.promotion_replay_fixture", entityType: "promotion_application", entityId: id, before: null, after: { synthetic: true, contextType: input.contextType }, metadata: { reason: "QA AUDITORÍA — probar replay sin activar campaña" } });
    });
    assert.equal((await applyPromotion(input)).idempotent, true);
    for (const changed of [{ contextId: `${id}-other` }, { contextType: "QA_OTHER" }, { productId: "qa-missing-product" }, { promotionId: "qa-missing-promotion" }, { baseUnitPrice: "12.00" }]) await assert.rejects(applyPromotion({ ...input, ...changed }), error => error instanceof Error && "code" in error && error.code === "PROMOTION_IDEMPOTENCY_CONFLICT");
    const context = { productId: product.id, contextType: "QA_AUDITORIA", contextId: id, baseUnitPrice: "11.00", idempotencyKey: `${id}-snapshot` };
    const step = { promotionId: promotion.id, baseUnitPrice: "11.00", discountAmount: "1.10", finalUnitPrice: "9.90" };
    const recorded = await db.transaction(tx => recordPromotionalApplicationsInTransaction(tx, context, [step]));
    assert.equal(recorded.applications.length, 1);
    const repeated = await db.transaction(tx => recordPromotionalApplicationsInTransaction(tx, context, [step]));
    assert.equal(repeated.applications[0].id, recorded.applications[0].id);
    const zeroPromotionId = `qa-zero-step-${crypto.randomUUID()}`;
    await assert.rejects(db.transaction(async tx => {
      await tx.insert(promotions).values({ id: zeroPromotionId, name: "QA AUDITORÍA — paso con base cero", type: "PERCENTAGE", discountValue: "10", startsAt: new Date(), endsAt: new Date(Date.now() + 60_000), status: "INACTIVE", policy: "STACKABLE" });
      const zeroContext = { ...context, idempotencyKey: `${id}-zero`, contextId: `${id}-zero` };
      const zeroSteps = [
        { promotionId: promotion.id, baseUnitPrice: "11.00", discountAmount: "11.00", finalUnitPrice: "0.00" },
        { promotionId: zeroPromotionId, baseUnitPrice: "0.00", discountAmount: "0.00", finalUnitPrice: "0.00" },
      ];
      const saved = await recordPromotionalApplicationsInTransaction(tx, zeroContext, zeroSteps);
      assert.equal(saved.finalUnitPrice, "0.00");
      const replay = await recordPromotionalApplicationsInTransaction(tx, zeroContext, zeroSteps);
      assert.deepEqual(replay.applications.map(row => row.id), saved.applications.map(row => row.id));
      throw new Error("QA_ZERO_STEP_ROLLBACK");
    }), /QA_ZERO_STEP_ROLLBACK/);
    assert.equal((await db.select().from(promotions).where(eq(promotions.id, zeroPromotionId))).length, 0);
    const rejectConflict = (error: unknown) => error instanceof Error && "code" in error && error.code === "PROMOTION_IDEMPOTENCY_CONFLICT";
    for (const changed of [{ contextId: `${id}-other` }, { contextType: "QA_OTHER" }, { productId: "qa-missing-product" }]) await assert.rejects(db.transaction(tx => recordPromotionalApplicationsInTransaction(tx, { ...context, ...changed }, [step])), rejectConflict);
    for (const changed of [{ baseUnitPrice: "12.00" }, { discountAmount: "2.10" }, { finalUnitPrice: "8.90" }]) await assert.rejects(db.transaction(tx => recordPromotionalApplicationsInTransaction(tx, context, [{ ...step, ...changed }])), error => error instanceof Error && "code" in error && error.code === "PROMOTION_STEPS_INVALID");
    const raceContext = { ...context, idempotencyKey: `${id}-race` };
    const race = await Promise.allSettled([
      db.transaction(tx => recordPromotionalApplicationsInTransaction(tx, raceContext, [step])),
      db.transaction(tx => recordPromotionalApplicationsInTransaction(tx, raceContext, [{ ...step, discountAmount: "2.10", finalUnitPrice: "8.90" }])),
    ]);
    assert.equal(race.filter(result => result.status === "fulfilled").length, 1);
    const rejected = race.find(result => result.status === "rejected");
    assert.ok(rejected?.status === "rejected" && rejectConflict(rejected.reason));
    const raceRows = await db.select().from(promotionApplications).where(eq(promotionApplications.idempotencyKey, `${raceContext.idempotencyKey}:${promotion.id}`));
    assert.equal(raceRows.length, 1);
    console.log(JSON.stringify({ fixtureId: id, snapshotId: recorded.applications[0].id, raceApplicationId: raceRows[0].id, raceResults: race.map(result => result.status) }));
  } finally { await closeDb(); }
});
