import {
  artifactPath,
  capture,
  captureSql,
  closeQaBrowser,
  compactError,
  createQaBrowser,
  resultRecord,
  runSql,
  visit,
  writeJson,
} from "./b-helpers.mjs";

const scenario = "B3.4-inventory-count";
const productId = "prod-new-aud_1790289867163";
const sku = "CP-ROT-8284";
const locationId = "cp-dashboard-v5-location-lima";
const countDelta = 2;
let reason = `QA B3.4 conteo ciclico ${Date.now()}`;
const notes = "Conteo físico QA B3.4; diferencia documentada para auditoría.";

function firstRow(query) {
  const line = runSql(query).split(/\r?\n/)[0]?.trim();
  if (!line) throw new Error("No se encontró el saldo esperado en PostgreSQL local.");
  return line.split("\t");
}

async function openProductKardex(page) {
  const search = page.locator('input[placeholder*="SKU"]').last();
  await search.fill(sku);
  await page.waitForTimeout(900);
  const row = page.locator("tr").filter({ hasText: sku }).first();
  await row.waitFor({ state: "visible", timeout: 15_000 });
  await row.getByRole("button", { name: "Más acciones", exact: true }).click();
  await page.getByRole("button", { name: "Ver Kardex", exact: true }).click();
  await page.getByRole("heading", { name: /Kardex de/ }).waitFor({ state: "visible", timeout: 15_000 });
}

const session = await createQaBrowser(scenario);
const { page } = session;
const evidence = { scenario, productId, sku, locationId, countDelta, reason, notes, stages: [] };

try {
  const previousReason = runSql(`SELECT reason FROM inventory_movements WHERE product_id='${productId}' AND location_id='${locationId}' AND reason LIKE 'QA B3.4 conteo ciclico%' ORDER BY created_at DESC LIMIT 1;`).trim();
  const replay = Boolean(previousReason);
  if (replay) reason = previousReason;
  evidence.reason = reason;
  evidence.reusedPriorMutation = replay;
  const before = firstRow(`SELECT id,on_hand,reserved,minimum_stock FROM inventory_balances WHERE product_id='${productId}' AND location_id='${locationId}';`);
  evidence.before = { balanceId: before[0], onHand: before[1], reserved: before[2], minimum: before[3] };
  captureSql(scenario, "before", `
    SELECT ib.id,ib.product_id,ib.location_id,ib.on_hand,ib.reserved,ib.minimum_stock,ib.updated_at,
           p.sku,coalesce(p.commercial_name,p.original_name)
    FROM inventory_balances ib JOIN products p ON p.id=ib.product_id
    WHERE ib.product_id='${productId}' AND ib.location_id='${locationId}';
    SELECT id,type,quantity,previous_on_hand,resulting_on_hand,reason,notes,performed_by,reference_type,reference_id,created_at
    FROM inventory_movements WHERE product_id='${productId}' AND location_id='${locationId}' ORDER BY created_at DESC LIMIT 8;
  `);

  await visit(page, "/admin/inventario");
  await capture(scenario, replay ? "01-inventory-after-prior-adjustment" : "01-inventory-before", page);
  if (!replay) {
    await page.getByRole("button", { name: "Ajustar inventario", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await dialog.waitFor({ state: "visible", timeout: 15_000 });
    const selects = dialog.locator("select");
    await selects.nth(0).selectOption(locationId);
    await selects.nth(1).selectOption({ label: "Ajuste de entrada" });
    const productSearch = dialog.getByLabel("Buscar producto de inventario", { exact: true });
    await productSearch.fill(sku);
    await page.waitForTimeout(900);
    await page.getByRole("option", { name: new RegExp(`${sku}.*Compresor`, "i") }).click();
    await dialog.locator('input[type="number"]').fill(String(countDelta));
    await dialog.getByPlaceholder("Ej. Conteo cíclico", { exact: true }).fill(reason);
    await dialog.getByPlaceholder("Detalle para auditoría", { exact: true }).fill(notes);
    await capture(scenario, "02-adjustment-filled", page);
    await dialog.getByRole("button", { name: "Confirmar movimiento", exact: true }).click();
    await page.waitForTimeout(1_300);
    await capture(scenario, "03-adjustment-confirmed", page);
    evidence.stages.push({ stage: "inventory_adjustment_ui", completed: true, reason, notes });
  } else {
    evidence.stages.push({ stage: "inventory_adjustment_ui", completed: true, replayedFromExistingQaMutation: true, reason });
  }

  const after = firstRow(`
    SELECT ib.on_hand,ib.reserved,
      (SELECT count(*) FROM inventory_movements im WHERE im.product_id='${productId}' AND im.location_id='${locationId}' AND im.reason='${reason}'),
      (SELECT count(*) FROM inventory_movements im WHERE im.product_id='${productId}' AND im.location_id='${locationId}' AND im.reason='${reason}' AND im.notes IS NOT NULL)
    FROM inventory_balances ib WHERE ib.product_id='${productId}' AND ib.location_id='${locationId}';
  `);
  evidence.after = { onHand: after[0], reserved: after[1], matchingMovements: after[2], matchingNotes: after[3] };
  captureSql(scenario, "after-adjustment", `
    SELECT ib.id,ib.product_id,ib.location_id,ib.on_hand,ib.reserved,ib.updated_at
    FROM inventory_balances ib WHERE ib.product_id='${productId}' AND ib.location_id='${locationId}';
    SELECT id,type,quantity,previous_on_hand,resulting_on_hand,reason,notes,performed_by,reference_type,reference_id,idempotency_key,created_at
    FROM inventory_movements WHERE product_id='${productId}' AND location_id='${locationId}' AND reason='${reason}' ORDER BY created_at DESC;
    SELECT id,action,entity_type,entity_id,actor_id,actor_role,before,after,metadata,created_at
    FROM audit_logs WHERE action ILIKE '%invent%' AND (entity_id='${productId}' OR metadata::text ILIKE '%${productId}%')
    ORDER BY created_at DESC LIMIT 20;
  `);
  const expectedOnHand = replay ? before[1] : String(Number(before[1]) + countDelta);
  if (after[0] !== expectedOnHand || after[2] !== "1" || after[3] !== "1") {
    throw new Error(`El ajuste no dejó el saldo/auditoría esperados: ${after.join(" | ")}`);
  }

  await openProductKardex(page);
  await capture(scenario, "04-kardex-after-adjustment", page);
  evidence.stages.push({ stage: "kardex_ui", completed: true });
  resultRecord(scenario, { outcome: "COMPLETED", ...evidence });
  console.log(JSON.stringify({ outcome: "COMPLETED", ...evidence }, null, 2));
} catch (error) {
  await capture(scenario, "error", page).catch(() => undefined);
  writeJson(artifactPath(scenario, "error.json"), { error: compactError(error), evidence, browserEvents: session.events });
  resultRecord(scenario, { outcome: "BLOCKED", error: compactError(error), ...evidence });
  console.log(JSON.stringify({ outcome: "BLOCKED", error: compactError(error), ...evidence }, null, 2));
  process.exitCode = 1;
} finally {
  await closeQaBrowser(session);
}
