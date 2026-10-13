import assert from "node:assert/strict";
import test from "node:test";
import { and, eq } from "drizzle-orm";
import { closeDb, getDb } from "../src/db";
import { priceHistory, productPrices, products, users } from "../src/db/schema";
import { reportSchedules } from "../src/db/reporting-schema";
import { archivePrice, type PricingActor } from "../src/lib/pricing-service";
import { applyPricingImport, previewPricingImport } from "../src/lib/pricing-import-service";

const data = (csv: string) => new TextEncoder().encode(csv).buffer;

test("QA: vista previa, rechazo atómico e importaciones concurrentes de precios", { skip: process.env.QA_PRICING_IMPORT !== "1", timeout: 60_000 }, async () => {
  assert.notEqual(process.env.NODE_ENV, "production");
  const db = getDb();
  const productId = "product-ea613220-8707-42c0-abdb-80b6c2d639d3";
  const reason = `QA AUDITORÍA — import ${crypto.randomUUID()}`;
  let actor: PricingActor | undefined;
  try {
    const [product] = await db.select().from(products).where(eq(products.id, productId));
    assert.equal(product.sku, "QA-AUD-20261006");
    const [reference] = await db.select().from(reportSchedules).where(eq(reportSchedules.id, "report-schedule-e0115752-abcf-47af-a8e9-81716c52ce49"));
    assert.match(reference?.name ?? "", /^QA AUDITORÍA/);
    const [owner] = await db.select().from(users).where(eq(users.id, reference.createdBy));
    assert.equal(owner.status, "ACTIVE");
    actor = { userId: owner.id, role: (owner.roleCode ?? owner.role) as PricingActor["role"] };
    const before = await db.select().from(productPrices).where(eq(productPrices.productId, productId));
    assert.equal(before.filter(row => row.priceType === "SPECIAL" && row.active).length, 0);
    const filename = `qa-import-${crypto.randomUUID()}`;
    const header = "SKU,Moneda,Especial,Válido desde,Válido hasta\n";
    const row = (sku: string, amount: string, from = "2026-01-01") => `${sku},PEN,${amount},${from},2030-01-01\n`;
    const invalid = data(header + row(product.sku, "24.00") + row(`QA-MISSING-${crypto.randomUUID()}`, "10.00"));
    assert.equal((await previewPricingImport(invalid, `${filename}-invalid.csv`, actor, reason)).errors, 1);
    await assert.rejects(applyPricingImport(invalid, `${filename}-invalid.csv`, actor, reason), /PRICING_IMPORT_PREFLIGHT_FAILED/);
    assert.deepEqual(await db.select().from(productPrices).where(eq(productPrices.productId, productId)), before);
    for (const [suffix, contents] of [
      ["duplicate", header + row(product.sku, "24.00") + row(product.sku, "25.00")],
      ["precision", header + row(product.sku, "1.001")],
      ["future", header + row(product.sku, "24.00", "2029-01-01")],
      ["invalid-day", header + row(product.sku, "24.00", "2026-02-30")],
      ["invalid-leap", header + row(product.sku, "24.00", "2025-02-29")],
    ]) {
      const preview = await previewPricingImport(data(contents), `${filename}-${suffix}.csv`, actor, reason);
      console.log(JSON.stringify({ suffix, errors: preview.errors, messages: preview.rows.map(row => row.message) }));
      assert.ok(preview.errors > 0, suffix);
    }
    const blockedCost = await previewPricingImport(data(`SKU,Moneda,Costo\n${product.sku},PEN,1.00\n`), `${filename}-cost.csv`, { ...actor, role: "ADMIN" }, reason);
    assert.equal((await previewPricingImport(data(header + row(product.sku, "24.00", "2024-02-29")), `${filename}-leap.csv`, actor, reason)).errors, 0);
    assert.ok(blockedCost.errors > 0);
    const firstData = data(header + row(product.sku, "24.00"));
    const secondData = data(header + row(product.sku, "25.00"));
    assert.equal((await previewPricingImport(firstData, `${filename}-a.csv`, actor, reason)).newPrices, 1);
    const imports = await Promise.allSettled([applyPricingImport(firstData, `${filename}-a.csv`, actor, reason), applyPricingImport(secondData, `${filename}-b.csv`, actor, reason)]);
    const active = await db.select().from(productPrices).where(and(eq(productPrices.productId, productId), eq(productPrices.priceType, "SPECIAL"), eq(productPrices.active, true)));
    console.log(JSON.stringify({ productId, importResults: imports.map(result => result.status), activePriceIds: active.map(row => row.id), activeSpecialPrices: active.length }));
    assert.equal(active.length, 1);
    assert.equal(imports.filter(result => result.status === "fulfilled").length, 1);
    const winner = imports[0].status === "fulfilled" ? { contents: firstData, name: `${filename}-a.csv` } : { contents: secondData, name: `${filename}-b.csv` };
    const historyBefore = await db.select().from(priceHistory).where(eq(priceHistory.reason, reason));
    const replay = await applyPricingImport(winner.contents, winner.name, actor, reason);
    assert.equal(replay.newPrices, 0);
    assert.equal(replay.changes, 0);
    const historyAfter = await db.select().from(priceHistory).where(eq(priceHistory.reason, reason));
    assert.equal(historyAfter.length, historyBefore.length);
    const editedData = data(header + row(product.sku, "26.00"));
    assert.equal((await previewPricingImport(editedData, winner.name, actor, reason)).changes, 1);
    await applyPricingImport(editedData, winner.name, actor, reason);
    const [edited] = await db.select().from(productPrices).where(eq(productPrices.id, active[0].id));
    assert.equal(Number(edited.amount), 26);
    const editHistory = await db.select().from(priceHistory).where(eq(priceHistory.reason, reason));
    assert.equal(editHistory.length, historyAfter.length + 1);
    const oldReplay = await applyPricingImport(winner.contents, winner.name, actor, reason);
    assert.equal(oldReplay.newPrices, 0);
    assert.equal(oldReplay.changes, 0);
    const [preserved] = await db.select().from(productPrices).where(eq(productPrices.id, active[0].id));
    assert.equal(Number(preserved.amount), 26);
    assert.equal((await db.select().from(priceHistory).where(eq(priceHistory.reason, reason))).length, editHistory.length);
    console.log(JSON.stringify({ editedPriceId: edited.id, amountAfterOldReplay: preserved.amount, historyRows: editHistory.length }));
    assert.deepEqual(await db.select().from(productPrices).where(and(eq(productPrices.productId, productId), eq(productPrices.priceType, "RETAIL"))), before.filter(row => row.priceType === "RETAIL"));
  } finally {
    try {
      if (actor) {
        const ownHistory = await db.select({ priceId: priceHistory.priceId }).from(priceHistory).where(and(eq(priceHistory.productId, productId), eq(priceHistory.reason, reason)));
        for (const id of new Set(ownHistory.map(row => row.priceId))) {
          if (!id) continue;
          const [row] = await db.select().from(productPrices).where(eq(productPrices.id, id));
          if (row?.active) await archivePrice(id, "QA AUDITORÍA — retirar precio especial de importación", actor, `qa-import-cleanup-${crypto.randomUUID()}`);
        }
      }
    } finally { await closeDb(); }
  }
});
