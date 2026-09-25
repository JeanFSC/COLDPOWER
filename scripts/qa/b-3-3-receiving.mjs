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

const scenario = "B3.3-partial-receiving";
const purchaseId = "cp-dashboard-v5-cp-compras-dev-purchase-8";
const purchaseCode = "OC-DEV-008";
const receiptQuantity = 1;

function sqlRow(query) {
  const line = runSql(query).split(/\r?\n/)[0]?.trim();
  if (!line) throw new Error("No se encontró el registro esperado en PostgreSQL local.");
  return line.split("\t");
}

async function openReceipt(page) {
  const search = page.getByLabel("Buscar orden pendiente de recepción", { exact: true });
  await search.waitFor({ state: "visible", timeout: 15_000 });
  await search.fill(purchaseCode);
  await page.waitForTimeout(900);
  const selector = page.getByRole("button", { name: "Orden pendiente de recepción", exact: true });
  await selector.click();
  await page.getByRole("option", { name: new RegExp(purchaseCode) }).click();
  await page.waitForTimeout(600);
  const quantity = page.getByLabel("Cantidad recibida de CP-FIT-OTR-0313", { exact: true });
  await quantity.waitFor({ state: "visible", timeout: 15_000 });
  await quantity.fill(String(receiptQuantity));
  return quantity;
}

async function openKardex(page) {
  await visit(page, "/admin/inventario");
  const search = page.getByPlaceholder("SKU, modelo, refrigerante, voltaje…", { exact: true });
  await search.fill("CP-FIT-OTR-0313");
  await page.waitForTimeout(900);
  const row = page.locator("tr").filter({ hasText: "CP-FIT-OTR-0313" }).first();
  await row.waitFor({ state: "visible", timeout: 15_000 });
  await row.getByRole("button", { name: "Más acciones", exact: true }).click();
  await page.locator('button:visible').filter({ hasText: "Ver Kardex" }).click();
  await page.getByRole("heading", { name: /Kardex de/ }).waitFor({ state: "visible", timeout: 15_000 });
}

const session = await createQaBrowser(scenario);
const { page } = session;
const evidence = { scenario, purchaseId, purchaseCode, receiptQuantity, stages: [] };

try {
  const before = sqlRow(`
    SELECT po.id,po.code,po.status,poi.id,poi.product_id,poi.quantity_ordered,poi.quantity_received,
           ib.on_hand,ib.reserved
    FROM purchases po
    JOIN purchase_items poi ON poi.purchase_id=po.id
    LEFT JOIN inventory_balances ib ON ib.product_id=poi.product_id AND ib.location_id=po.location_id
    WHERE po.id='${purchaseId}'
    ORDER BY poi.id LIMIT 1;
  `);
  evidence.before = { purchaseStatus: before[2], itemId: before[3], productId: before[4], ordered: before[5], received: before[6], onHand: before[7], reserved: before[8] };
  captureSql(scenario, "before", `
    SELECT po.id,po.code,po.status,po.location_id,poi.id AS item_id,poi.product_id,poi.quantity_ordered,poi.quantity_received
    FROM purchases po JOIN purchase_items poi ON poi.purchase_id=po.id WHERE po.id='${purchaseId}';
    SELECT id,on_hand,reserved,updated_at FROM inventory_balances WHERE product_id='${before[4]}' AND location_id=(SELECT location_id FROM purchases WHERE id='${purchaseId}');
  `);
  await visit(page, "/admin/compras");
  await capture(scenario, "01-receiving-form", page);
  await openReceipt(page);
  await capture(scenario, "02-line-filled", page);
  const receiveButton = page.getByRole("button", { name: "Registrar recepción", exact: true }).last();
  await receiveButton.waitFor({ state: "visible", timeout: 15_000 });
  await receiveButton.dblclick({ delay: 90 });
  await page.waitForTimeout(1_500);
  await capture(scenario, "03-receipt-double-click", page);
  evidence.stages.push({ stage: "partial_receipt_ui", completed: true, doubleClick: true });

  const after = sqlRow(`
    SELECT po.status,poi.quantity_ordered,poi.quantity_received,
           (SELECT count(*) FROM purchase_receipts pr WHERE pr.purchase_id=po.id),
           (SELECT count(*) FROM purchase_receipt_items pri JOIN purchase_receipts pr ON pr.id=pri.receipt_id WHERE pr.purchase_id=po.id),
           (SELECT count(*) FROM inventory_movements im WHERE im.reference_type='purchase_receipt' AND im.reference_id IN (SELECT id FROM purchase_receipts WHERE purchase_id=po.id))
    FROM purchases po JOIN purchase_items poi ON poi.purchase_id=po.id
    WHERE po.id='${purchaseId}' ORDER BY poi.id LIMIT 1;
  `);
  evidence.after = { purchaseStatus: after[0], ordered: after[1], received: after[2], receipts: after[3], receiptItems: after[4], kardexMovements: after[5] };
  captureSql(scenario, "after-receipt", `
    SELECT po.id,po.code,po.status,poi.id AS item_id,poi.product_id,poi.quantity_ordered,poi.quantity_received,
           pr.id AS receipt_id,pr.code AS receipt_code,pr.status AS receipt_status,pri.quantity AS received_quantity,
           im.id AS movement_id,im.type,im.quantity,im.previous_on_hand,im.resulting_on_hand,im.reference_type,im.reference_id,im.idempotency_key
    FROM purchases po
    JOIN purchase_items poi ON poi.purchase_id=po.id
    LEFT JOIN purchase_receipts pr ON pr.purchase_id=po.id
    LEFT JOIN purchase_receipt_items pri ON pri.receipt_id=pr.id AND pri.purchase_item_id=poi.id
    LEFT JOIN inventory_movements im ON im.reference_type='purchase_receipt' AND im.reference_id=pr.id
    WHERE po.id='${purchaseId}' ORDER BY pr.created_at DESC,im.created_at DESC;
    SELECT id,on_hand,reserved,updated_at FROM inventory_balances WHERE product_id='${before[4]}' AND location_id=(SELECT location_id FROM purchases WHERE id='${purchaseId}');
  `);
  if (after[0] !== "PARTIAL_RECEIVED" || after[2] !== String(Number(before[6]) + receiptQuantity) || after[3] !== "1" || after[4] !== "1" || after[5] !== "1") {
    throw new Error(`La recepción parcial no dejó el estado esperado: ${after.join(" | ")}`);
  }

  await openKardex(page);
  await capture(scenario, "04-kardex-after-receipt", page);
  evidence.stages.push({ stage: "kardex_ui", completed: true });
  resultRecord(scenario, { outcome: "COMPLETED", ...evidence });
  console.log(JSON.stringify({ outcome: "COMPLETED", ...evidence }, null, 2));
} catch (error) {
  await capture(scenario, "error", page).catch(() => undefined);
  writeJson(artifactPath(scenario, "error.json"), { error: compactError(error), evidence });
  resultRecord(scenario, { outcome: "BLOCKED", error: compactError(error), ...evidence });
  console.log(JSON.stringify({ outcome: "BLOCKED", error: compactError(error), ...evidence }, null, 2));
  process.exitCode = 1;
} finally {
  await closeQaBrowser(session);
}
