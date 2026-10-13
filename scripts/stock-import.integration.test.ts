import { strict as assert } from "node:assert";
import test from "node:test";
import { and, eq } from "drizzle-orm";
import { closeDb, getDb } from "../src/db";
import { auditLogs, inventoryBalances, inventoryImportBatches, inventoryMovements, products, users } from "../src/db/schema";
import { reportSchedules } from "../src/db/reporting-schema";
import { adjustInventory } from "../src/lib/inventory";
import { applyStockImport, previewStockImport } from "../src/lib/stock-import-service";
import { can, type AppRole } from "../src/lib/roles";

const bytes = (text: string) => new TextEncoder().encode(text).buffer;
test("QA stock import: atomic rejection, concurrent replay, trace and restoration", { skip: process.env.QA_STOCK_IMPORT !== "1", timeout: 60_000 }, async () => {
  assert.notEqual(process.env.NODE_ENV, "production");
  const db = getDb();
  const tag = `qa-stock-${crypto.randomUUID()}`;
  const productId = `product-000-${tag}`;
  let applied = false;
  let actor: { userId: string; role: AppRole } | undefined;
  try {
    const [base] = await db.select().from(products).where(eq(products.id,"product-ea613220-8707-42c0-abdb-80b6c2d639d3"));
    assert.equal(base.sku,"QA-AUD-20261006");
    const [schedule] = await db.select().from(reportSchedules).where(eq(reportSchedules.id,"report-schedule-e0115752-abcf-47af-a8e9-81716c52ce49"));
    assert.match(schedule.name,/^QA AUDITORÍA/);
    const [owner] = await db.select().from(users).where(eq(users.id,schedule.createdBy));
    assert.equal(owner.status,"ACTIVE");
    actor = { userId:owner.id, role:(owner.roleCode ?? owner.role) as AppRole };
    assert.ok(can(actor.role,"inventory.adjust"));
    await db.insert(products).values({ ...base, id:productId, sku:tag, slug:tag, originalName:`QA AUDITORÍA — ${tag}`, normalizedName:`QA AUDITORÍA — ${tag}`, commercialName:`QA AUDITORÍA — ${tag}`, status:"DRAFT", publicationStatus:"draft", createdAt:new Date(), updatedAt:new Date() });
    const balanceRows = () => db.select().from(inventoryBalances).where(eq(inventoryBalances.productId,productId));
    const original = await db.select().from(inventoryBalances).where(eq(inventoryBalances.productId,base.id));
    const mixed = bytes(`sku,local,cantidad\n${tag},CP-TRU-DEV,2\n${base.sku},CP-CUS-DEV,1`);
    const mixedPreview = await previewStockImport(mixed);
    assert.equal(mixedPreview.canApply,false);
    await assert.rejects(applyStockImport(mixed,"QA AUDITORÍA mixed.csv",mixedPreview.fingerprint,actor),/existencias o reservas/);
    assert.equal((await balanceRows()).length,0,"first row must be rolled back");
    assert.equal((await db.select().from(inventoryImportBatches).where(eq(inventoryImportBatches.id,`stock-import-${mixedPreview.fingerprint}`))).length,0);
    assert.deepEqual(await db.select().from(inventoryBalances).where(eq(inventoryBalances.productId,base.id)),original);
    const file = bytes(`sku,local,cantidad\n${tag},CP-TRU-DEV,2`);
    const preview = await previewStockImport(file);
    assert.equal(preview.canApply,true);
    await assert.rejects(applyStockImport(file,"QA.csv",preview.fingerprint,{...actor,role:"REPORTES"}),/permiso/);
    await assert.rejects(applyStockImport(bytes(`sku,local,cantidad\n${tag},CP-TRU-DEV,3`),"QA.csv",preview.fingerprint,actor),/cambió/);
    const results = await Promise.all([applyStockImport(file,"QA AUDITORÍA.csv",preview.fingerprint,actor),applyStockImport(file,"QA AUDITORÍA.csv",preview.fingerprint,actor)]);
    applied = true;
    assert.deepEqual(results.map(row=>row.replayed).sort(),[false,true]);
    const [balance] = await balanceRows();
    assert.equal(balance.onHand,2); assert.equal(balance.reserved,0);
    const movements = await db.select().from(inventoryMovements).where(eq(inventoryMovements.productId,productId));
    assert.equal(movements.length,1); assert.equal(movements[0].type,"OPENING_BALANCE");
    assert.equal(movements[0].referenceId,results[0].batchId); assert.equal(movements[0].performedBy,actor.userId);
    assert.equal((await db.select().from(auditLogs).where(and(eq(auditLogs.entityId,results[0].batchId),eq(auditLogs.action,"inventory.import_applied")))).length,1);
    const renamed = await applyStockImport(file,"renamed-QA.csv",preview.fingerprint,actor);
    assert.equal(renamed.replayed,true); assert.equal((await balanceRows())[0].onHand,2);
    console.log(`QA fixture retained as draft: ${tag}`);
  } finally {
    try {
      if (applied && actor) {
        const [balance] = await db.select().from(inventoryBalances).where(eq(inventoryBalances.productId,productId));
        await adjustInventory({productId,locationId:balance.locationId,quantity:2,type:"ADJUSTMENT_OUT",reason:"QA AUDITORÍA — restauración",notes:"Cierre de prueba de importación inicial",performedBy:actor.userId,performedByRole:actor.role,idempotencyKey:`${tag}-restore`});
        assert.equal((await db.select().from(inventoryBalances).where(eq(inventoryBalances.productId,productId)))[0].onHand,0);
      }
    } finally { await closeDb(); }
  }
});
