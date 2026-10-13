import assert from "node:assert/strict";
import test from "node:test";
import { and, eq } from "drizzle-orm";
import { closeDb, getDb } from "../src/db";
import { priceHistory, productPrices, products, users } from "../src/db/schema";
import { reportSchedules } from "../src/db/reporting-schema";
import { archivePrice, createPrice, updatePrice, type PricingActor } from "../src/lib/pricing-service";

test("QA: creación concurrente y edición idempotente de precios", { skip: process.env.QA_PRICING_WORKFLOW !== "1", timeout: 60_000 }, async () => {
  assert.notEqual(process.env.NODE_ENV, "production");
  const db = getDb();
  const productId = "product-ea613220-8707-42c0-abdb-80b6c2d639d3";
  const fixtureIds: string[] = [];
  let actor: PricingActor | undefined;
  try {
    const [product] = await db.select().from(products).where(eq(products.id, productId));
    assert.equal(product.sku, "QA-AUD-20261006");
    const [reference] = await db.select().from(reportSchedules).where(eq(reportSchedules.id, "report-schedule-e0115752-abcf-47af-a8e9-81716c52ce49"));
    assert.match(reference?.name ?? "", /^QA AUDITORÍA/);
    const [owner] = await db.select().from(users).where(eq(users.id, reference.createdBy));
    assert.equal(owner.status, "ACTIVE");
    actor = { userId: owner.id, role: (owner.roleCode ?? owner.role) as PricingActor["role"] };
    assert.equal((await db.select().from(productPrices).where(and(eq(productPrices.productId, productId), eq(productPrices.priceType, "SPECIAL"), eq(productPrices.active, true)))).length, 0, "no interferir con un precio especial activo existente");
    const retailBefore = await db.select().from(productPrices).where(and(eq(productPrices.productId, productId), eq(productPrices.priceType, "RETAIL")));
    const tag = crypto.randomUUID();
    const input = { productId, amount: "21.00", currency: "PEN", priceType: "SPECIAL", status: "INACTIVE", validFrom: "2035-01-01T00:00:00.000Z", validUntil: "2035-01-02T00:00:00.000Z", reason: "QA AUDITORÍA — precio sintético inactivo", idempotencyKey: `qa-price-${tag}` };
    await assert.rejects(createPrice({ ...input, reason: " " }, actor), /PRICE_REASON_REQUIRED/);
    await assert.rejects(createPrice({ ...input, amount: "1.001" }, actor), /decimales/);
    await assert.rejects(createPrice({ ...input, minimumAllowed: "22.00" }, actor), /superar/);
    const creates = await Promise.allSettled([createPrice(input, actor), createPrice(input, actor)]);
    for (const result of creates) if (result.status === "fulfilled" && !fixtureIds.includes(result.value.price.id)) fixtureIds.push(result.value.price.id);
    const first = creates.find(result => result.status === "fulfilled");
    assert.ok(first?.status === "fulfilled");
    await assert.rejects(archivePrice(first.value.price.id, "QA AUDITORÍA — clave de alta no es archivo", actor, input.idempotencyKey), /PRICE_IDEMPOTENCY_CONFLICT/);
    const edits = { ...input, amount: "22.00", minimumAllowed: "1.00", idempotencyKey: `qa-price-edit-${tag}` };
    const concurrentEdits = await Promise.all([updatePrice(first.value.price.id, edits, actor), updatePrice(first.value.price.id, edits, actor)]);
    assert.equal(concurrentEdits.filter(result => result.idempotent).length, 1);
    const edited = concurrentEdits[0];
    assert.equal(edited.price.amount, "22.00");
    assert.equal((await updatePrice(first.value.price.id, edits, actor)).idempotent, true);
    let changedAmountRejected = false, changedMinimumRejected = false, changedQuantityRejected = false;
    try { await updatePrice(first.value.price.id, { ...edits, amount: "23.00" }, actor); }
    catch (error) { changedAmountRejected = error instanceof Error && error.message === "PRICE_IDEMPOTENCY_CONFLICT"; }
    try { await updatePrice(first.value.price.id, { ...edits, minimumAllowed: "2.00" }, actor); }
    catch (error) { changedMinimumRejected = error instanceof Error && error.message === "PRICE_IDEMPOTENCY_CONFLICT"; }
    try { await updatePrice(first.value.price.id, { ...edits, wholesaleMinQty: 2 }, actor); }
    catch (error) { changedQuantityRejected = error instanceof Error && error.message === "PRICE_IDEMPOTENCY_CONFLICT"; }
    console.log(JSON.stringify({ productId, fixtureIds, concurrentCreates: creates.map(result => result.status), concurrentEdits: concurrentEdits.map(result => result.idempotent), changedAmountRejected, changedMinimumRejected, changedQuantityRejected }));
    assert.equal(creates.filter(result => result.status === "fulfilled").length, 2);
    assert.equal(creates.filter(result => result.status === "fulfilled" && result.value.idempotent).length, 1);
    assert.equal(fixtureIds.length, 1);
    assert.equal(changedAmountRejected, true);
    assert.equal(changedMinimumRejected, true);
    assert.equal(changedQuantityRejected, true);
    const implicitWindow = { ...edits, amount: "23.00", validFrom: undefined, validUntil: undefined, idempotencyKey: `qa-price-implicit-${tag}` };
    const implicitFirst = await updatePrice(first.value.price.id, implicitWindow, actor);
    const historyBeforeReplay = await db.select().from(priceHistory).where(eq(priceHistory.priceId, first.value.price.id));
    const implicitReplay = await updatePrice(first.value.price.id, implicitWindow, actor);
    assert.equal(implicitReplay.idempotent, true);
    assert.equal(implicitReplay.price.validFrom.getTime(), implicitFirst.price.validFrom.getTime());
    assert.deepEqual(await db.select().from(priceHistory).where(eq(priceHistory.priceId, first.value.price.id)), historyBeforeReplay);
    await assert.rejects(updatePrice(first.value.price.id, { ...implicitWindow, validFrom: "2036-01-01T00:00:00.000Z" }, actor), /PRICE_IDEMPOTENCY_CONFLICT/);
    assert.deepEqual(await db.select().from(productPrices).where(and(eq(productPrices.productId, productId), eq(productPrices.priceType, "RETAIL"))), retailBefore);
  } finally {
    try {
      if (actor) for (const id of fixtureIds) {
        const [row] = await db.select().from(productPrices).where(eq(productPrices.id, id));
        await updatePrice(id, { amount: row.amount, currency: row.currency, priceType: row.priceType, wholesaleMinQty: row.wholesaleMinQty, minimumAllowed: row.minimumAllowed, status: "ARCHIVED", validFrom: row.validFrom.toISOString(), validUntil: row.validUntil?.toISOString(), reason: "QA AUDITORÍA — archivar precio sintético inactivo", idempotencyKey: `qa-price-cleanup-${crypto.randomUUID()}` }, actor);
      }
    } finally { await closeDb(); }
  }
});
