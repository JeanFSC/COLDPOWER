import {
  artifactPath,
  capture,
  captureSql,
  closeQaBrowser,
  compactError,
  createQaBrowser,
  readJsonIfExists,
  resultRecord,
  runSql,
  visit,
  writeJson,
  uniqueEmail,
} from "./b-helpers.mjs";

const scenario = "B4.1-purchase-flow";
const phase = process.env.QA_STAGE || "request";
const statePath = artifactPath(scenario, "state.json");
const productId = "product-cp-fit-otr-0313";
const sku = "CP-FIT-OTR-0313";
const locationId = "cp-dashboard-v5-location-lima";

function firstRow(query) {
  const line = runSql(query).split(/\r?\n/)[0]?.trim();
  if (!line) throw new Error("No se encontró el registro esperado en PostgreSQL local.");
  return line.split("\t");
}

async function selectAdminOption(page, label, optionPattern) {
  await page.getByRole("button", { name: label, exact: true }).click();
  await page.getByRole("listbox").last().getByRole("option", { name: optionPattern }).click();
}

async function openRequest(page, requestId) {
  await visit(page, `/admin/compras?requestId=${encodeURIComponent(requestId)}`);
  await page.getByText(/Solicitud\s+SOL-/, { exact: false }).first().waitFor({ state: "visible", timeout: 15_000 });
}

const session = await createQaBrowser(scenario);
const { page } = session;
const evidence = { scenario, phase, productId, sku, locationId, stages: [] };

try {
  if (phase === "request") {
    const token = Date.now();
    const supplierName = `QA B4.1 Proveedor ${token}`;
    const identification = `QA-B41-${token}`;
    const requestNotes = `QA B4.1 solicitud ${token}`;
    const email = uniqueEmail("b41-supplier");
    evidence.supplierName = supplierName;
    evidence.requestNotes = requestNotes;

    await visit(page, "/admin/compras");
    await capture(scenario, "01-purchase-tools", page);
    await page.getByLabel("Nombre comercial del proveedor", { exact: true }).fill(supplierName);
    await page.getByLabel("RUC o identificación del proveedor", { exact: true }).fill(identification);
    await page.getByLabel("País del proveedor", { exact: true }).fill("PE");
    await page.getByLabel("Moneda del proveedor", { exact: true }).fill("PEN");
    await page.getByLabel("Contacto del proveedor", { exact: true }).fill("QA Compras");
    await page.getByLabel("WhatsApp del proveedor", { exact: true }).fill("999888770");
    await page.getByLabel("Correo del proveedor", { exact: true }).fill(email);
    await page.getByLabel("Dirección del proveedor", { exact: true }).fill("Av. QA 410");
    await capture(scenario, "02-supplier-filled", page);
    await page.getByRole("button", { name: "Guardar proveedor", exact: true }).click();
    await page.getByText(/Proveedor guardado/i).waitFor({ state: "visible", timeout: 15_000 });
    const supplier = firstRow(`SELECT id,name,status,currency FROM suppliers WHERE name='${supplierName}' ORDER BY created_at DESC LIMIT 1;`);
    evidence.supplierId = supplier[0];
    evidence.stages.push({ stage: "supplier_ui_mutation", completed: true, supplierId: supplier[0] });
    captureSql(scenario, "after-supplier", `SELECT id,name,identification,status,currency,created_at FROM suppliers WHERE id='${supplier[0]}';`);

    await selectAdminOption(page, "Local de recepción de la solicitud", /Almacén Lima/);
    const requestProductSearch = page.getByLabel("Buscar producto para la solicitud", { exact: true });
    await requestProductSearch.fill(sku);
    await page.waitForTimeout(800);
    await selectAdminOption(page, "Producto solicitado", new RegExp(sku));
    await page.getByLabel("Cantidad solicitada", { exact: true }).fill("2");
    await page.getByLabel("Nota de la línea de solicitud", { exact: true }).fill("QA B4.1 costo y recepción trazable");
    await page.getByLabel("Nota general de la solicitud", { exact: true }).fill(requestNotes);
    await capture(scenario, "03-request-filled", page);
    await page.getByRole("button", { name: "Guardar solicitud", exact: true }).click();
    await page.waitForTimeout(1_000);
    const request = firstRow(`SELECT id,code,status,location_id,requester_id FROM purchase_requests WHERE notes='${requestNotes}' ORDER BY created_at DESC LIMIT 1;`);
    evidence.requestId = request[0];
    evidence.requestCode = request[1];
    captureSql(scenario, "after-request", `SELECT pr.id,pr.code,pr.status,pr.location_id,pr.requester_id,pr.notes,pri.product_id,pri.quantity_requested,pri.notes FROM purchase_requests pr JOIN purchase_request_items pri ON pri.request_id=pr.id WHERE pr.id='${request[0]}';`);
    await openRequest(page, request[0]);
    await capture(scenario, "04-request-draft", page);
    await page.getByRole("button", { name: /Enviar a aprobaci.n/, exact: true }).click();
    await page.waitForTimeout(2_000);
    await capture(scenario, "05-request-submitted", page);
    const submitted = firstRow(`SELECT status,approved_by,approved_at FROM purchase_requests WHERE id='${request[0]}';`);
    evidence.stages.push({ stage: "request_ui_mutation", completed: true, status: submitted[0] });
    if (submitted[0] !== "SUBMITTED") throw new Error(`La solicitud no pasó a SUBMITTED: ${submitted.join(" | ")}`);
    writeJson(statePath, { supplierId: supplier[0], supplierName, requestId: request[0], requestCode: request[1], productId, sku, locationId, requestNotes });
    resultRecord(scenario, { outcome: "PHASE_COMPLETED", nextPhase: "approve", ...evidence });
    console.log(JSON.stringify({ outcome: "PHASE_COMPLETED", nextPhase: "approve", ...evidence }, null, 2));
  } else if (phase === "approve") {
    const state = readJsonIfExists(statePath);
    if (!state?.requestId) throw new Error(`Falta ${statePath}; ejecuta primero QA_STAGE=request.`);
    evidence.requestId = state.requestId;
    evidence.requestCode = state.requestCode;
    await openRequest(page, state.requestId);
    await capture(scenario, "06-request-for-approval", page);
    const currentStatus = firstRow(`SELECT status FROM purchase_requests WHERE id='${state.requestId}';`)[0];
    if (currentStatus === "SUBMITTED") {
      await page.getByRole("button", { name: "Aprobar", exact: true }).click();
      await page.waitForTimeout(2_000);
      await capture(scenario, "07-request-approved", page);
    } else {
      await capture(scenario, "07-request-already-approved", page);
      evidence.replayedExistingApproval = true;
    }
    const approved = firstRow(`SELECT status,approved_by,approved_at FROM purchase_requests WHERE id='${state.requestId}';`);
    evidence.stages.push({ stage: "request_approval_ui_mutation", completed: true, status: approved[0], approvedBy: approved[1] });
    captureSql(scenario, "after-approval", `SELECT id,code,status,approved_by,approved_at,converted_purchase_id FROM purchase_requests WHERE id='${state.requestId}'; SELECT id,action,entity_type,entity_id,actor_role,created_at FROM audit_logs WHERE entity_id='${state.requestId}' ORDER BY created_at DESC LIMIT 10;`);
    if (approved[0] !== "APPROVED") throw new Error(`La solicitud no pasó a APPROVED: ${approved.join(" | ")}`);
    writeJson(statePath, { ...state, approvedBy: approved[1], approvedAt: approved[2] });
    resultRecord(scenario, { outcome: "PHASE_COMPLETED", nextPhase: "convert", ...evidence });
    console.log(JSON.stringify({ outcome: "PHASE_COMPLETED", nextPhase: "convert", ...evidence }, null, 2));
  } else if (phase === "convert") {
    const state = readJsonIfExists(statePath);
    if (!state?.requestId || !state?.supplierId) throw new Error(`Falta ${statePath}; ejecuta request y approve primero.`);
    evidence.requestId = state.requestId;
    evidence.requestCode = state.requestCode;
    evidence.supplierId = state.supplierId;
    await openRequest(page, state.requestId);
    await capture(scenario, "08-approved-request-for-conversion", page);
    await page.getByLabel("Proveedor para convertir solicitud", { exact: true }).selectOption(state.supplierId);
    await page.getByLabel(`Costo unitario para ${state.productId}`, { exact: true }).fill("120");
    await page.locator('input[type="datetime-local"]').last().fill("2026-10-04T12:00");
    await capture(scenario, "09-conversion-filled", page);
    await page.getByRole("button", { name: "Convertir en OC", exact: true }).click();
    await page.waitForTimeout(1_000);
    await capture(scenario, "10-purchase-order-created", page);
    const purchase = firstRow(`SELECT p.id,p.code,p.status,p.supplier_id,p.location_id,p.request_id,pi.product_id,pi.quantity_ordered,pi.unit_cost,pi.currency FROM purchases p JOIN purchase_items pi ON pi.purchase_id=p.id WHERE p.request_id='${state.requestId}' ORDER BY p.created_at DESC LIMIT 1;`);
    evidence.purchaseId = purchase[0];
    evidence.purchaseCode = purchase[1];
    evidence.stages.push({ stage: "purchase_order_ui_mutation", completed: true, status: purchase[2], supplierId: purchase[3], lineProductId: purchase[6], quantity: purchase[7], unitCost: purchase[8] });
    captureSql(scenario, "after-conversion", `SELECT pr.id,pr.code,pr.status,pr.approved_by,pr.converted_purchase_id,p.id AS purchase_id,p.code AS purchase_code,p.status AS purchase_status,p.supplier_id,p.location_id,pi.product_id,pi.quantity_ordered,pi.quantity_received,pi.unit_cost,pi.currency FROM purchase_requests pr LEFT JOIN purchases p ON p.id=pr.converted_purchase_id LEFT JOIN purchase_items pi ON pi.purchase_id=p.id WHERE pr.id='${state.requestId}'; SELECT id,action,entity_type,entity_id,actor_role,created_at FROM audit_logs WHERE entity_id IN ('${state.requestId}','${purchase[0]}') ORDER BY created_at DESC LIMIT 20;`);
    if (purchase[2] !== "PENDING" || purchase[3] !== state.supplierId || purchase[6] !== productId || purchase[7] !== "2") throw new Error(`La conversión no dejó una OC PENDING válida: ${purchase.join(" | ")}`);
    writeJson(statePath, { ...state, purchaseId: purchase[0], purchaseCode: purchase[1], completedAt: new Date().toISOString() });
    resultRecord(scenario, { outcome: "COMPLETED", ...evidence });
    console.log(JSON.stringify({ outcome: "COMPLETED", ...evidence }, null, 2));
  } else {
    throw new Error(`QA_STAGE desconocido: ${phase}. Usa request, approve o convert.`);
  }
} catch (error) {
  await capture(scenario, `error-${phase}`, page).catch(() => undefined);
  writeJson(artifactPath(scenario, `error-${phase}.json`), { error: compactError(error), evidence, browserEvents: session.events });
  resultRecord(scenario, { outcome: "BLOCKED", error: compactError(error), ...evidence });
  console.log(JSON.stringify({ outcome: "BLOCKED", error: compactError(error), ...evidence }, null, 2));
  process.exitCode = 1;
} finally {
  await closeQaBrowser(session);
}
