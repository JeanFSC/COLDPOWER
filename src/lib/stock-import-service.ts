import { createHash } from "node:crypto";
import { and, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { auditLogs, inventoryBalances, inventoryImportBatches, inventoryMovements, locations, products } from "@/db/schema";
import { importOpeningBalanceInTransaction } from "@/lib/inventory";
import { can, type AppRole } from "@/lib/roles";
import { planStockImport } from "@/lib/stock-import";
import { readStockImportRows } from "@/lib/stock-import-file";

async function prepare(data: ArrayBuffer) {
  const sourceRows = readStockImportRows(data);
  const db = getDb();
  const [catalog, localRows] = await Promise.all([
    db.select({ sku: products.sku, productId: products.id }).from(products).where(inArray(products.sku, sourceRows.map(row => String(row.sku)))),
    db.select({ id: locations.id, code: locations.code }).from(locations).where(eq(locations.active, true)),
  ]);
  const report = planStockImport(sourceRows, catalog);
  const rows = report.rows.map(row => ({ ...row, locationId: localRows.find(local => local.code === row.locationCode)?.id }));
  for (const row of rows) if (!row.locationId) report.errors.push(`Local inexistente o inactivo: ${row.locationCode}.`);
  report.canApply = report.errors.length === 0;
  const fingerprint = createHash("sha256").update(JSON.stringify(sourceRows.map(row => [row.sku, row.locationCode, Number(row.quantity)]).sort((a,b) => JSON.stringify(a).localeCompare(JSON.stringify(b))))).digest("hex");
  return { report, rows, fingerprint };
}

export async function previewStockImport(data: ArrayBuffer) {
  const prepared = await prepare(data);
  const ids = [...new Set(prepared.rows.map(row => row.productId))];
  const [balances, openings] = ids.length ? await Promise.all([
    getDb().select().from(inventoryBalances).where(inArray(inventoryBalances.productId, ids)),
    getDb().select({ productId: inventoryMovements.productId, locationId: inventoryMovements.locationId }).from(inventoryMovements).where(and(inArray(inventoryMovements.productId, ids), eq(inventoryMovements.type, "OPENING_BALANCE"))),
  ]) : [[], []];
  for (const row of prepared.rows) {
    if (!row.locationId) continue;
    const balance = balances.find(item => item.productId === row.productId && item.locationId === row.locationId);
    const opening = openings.some(item => item.productId === row.productId && item.locationId === row.locationId);
    if (opening || (balance && (balance.onHand !== 0 || balance.reserved !== 0))) prepared.report.errors.push(`${row.sku} · ${row.locationCode}: ya existe stock, reservas o saldo inicial.`);
  }
  return { ...prepared.report, canApply: prepared.report.errors.length === 0, fingerprint: prepared.fingerprint };
}

export async function applyStockImport(data: ArrayBuffer, filename: string, fingerprint: string, actor: { userId: string; role: AppRole }) {
  if (!can(actor.role, "inventory.adjust")) throw new Error("No tienes permiso para importar stock.");
  const prepared = await prepare(data);
  if (!prepared.report.canApply || prepared.fingerprint !== fingerprint) throw new Error("El archivo cambió o contiene errores. Valida nuevamente.");
  const batchId = `stock-import-${fingerprint}`;
  return getDb().transaction(async tx => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${batchId}))`);
    const [existing] = await tx.select().from(inventoryImportBatches).where(eq(inventoryImportBatches.id, batchId)).limit(1);
    if (existing?.status === "APPLIED") return { batchId, applied: true, replayed: true, rows: existing.matched };
    if (existing) throw new Error("El lote ya existe con otro estado; revisa su historial.");
    await tx.insert(inventoryImportBatches).values({ id: batchId, source: "ADMIN_INITIAL_STOCK_IMPORT", status: "APPLIED", filename: filename.slice(0,240), rowsRead: prepared.rows.length, matched: prepared.rows.length, quantities: prepared.rows.length, locations: new Set(prepared.rows.map(row=>row.locationId)).size, appliedBy: actor.userId, startedAt: new Date(), completedAt: new Date() });
    for (const row of [...prepared.rows].sort((a,b)=>`${a.productId}:${a.locationId}`.localeCompare(`${b.productId}:${b.locationId}`))) {
      if (!row.locationId) throw new Error("El local ya no está disponible.");
      const [local] = await tx.select({ active: locations.active }).from(locations).where(eq(locations.id,row.locationId)).for("share").limit(1);
      if (!local?.active) throw new Error("El local se desactivó; valida nuevamente.");
      await importOpeningBalanceInTransaction(tx,{ productId: row.productId, locationId: row.locationId, quantity: row.quantity, performedBy: actor.userId, performedByRole: actor.role, referenceType: "stock_import", referenceId: batchId, reason: "Importación inicial de stock", notes: filename.slice(0,240), idempotencyKey: `${batchId}:${row.productId}:${row.locationId}` });
    }
    await tx.insert(auditLogs).values({ id: `audit-${crypto.randomUUID()}`, actorId: actor.userId, actorRole: actor.role, action: "inventory.import_applied", entityType: "inventory_import_batch", entityId: batchId, after: { rows: prepared.rows.length }, metadata: { filename: filename.slice(0,240) } });
    return { batchId, applied: true, replayed: false, rows: prepared.rows.length };
  });
}
