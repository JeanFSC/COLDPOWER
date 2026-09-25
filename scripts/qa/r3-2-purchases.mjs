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

const scenario = "r3-2-purchases";
const phase = process.env.R3_PHASE || "request";
const productId = "product-cp-fit-otr-0313";
const locationId = "cp-dashboard-v5-location-lima";

function rows(query) {
  return runSql(query)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split("\t"));
}

async function waitForRow(query, predicate = (row) => row.length > 0, timeout = 15_000) {
  const deadline = Date.now() + timeout;
  let last = [];
  while (Date.now() < deadline) {
    last = rows(query);
    if (last.some(predicate)) return last;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`La consulta no alcanzó el estado esperado: ${query}\nÚltimo resultado: ${JSON.stringify(last)}`);
}

async function openRequest(page, requestId) {
  await visit(page, `/admin/compras?requestId=${encodeURIComponent(requestId)}`);
  await page.getByText(/Solicitud\s+SOL-/, { exact: false }).first().waitFor({ state: "visible", timeout: 15_000 });
}

const session = await createQaBrowser(scenario);
const { page } = session;
const evidence = { scenario, phase, productId, locationId, phases: [] };

try {
  const request = rows("SELECT id,code,status,location_id,requester_id,notes FROM purchase_requests WHERE notes LIKE 'QA B4.1 solicitud %' ORDER BY created_at DESC LIMIT 1;")[0];
  if (!request) throw new Error("No existe la solicitud B4.1 creada por la UI.");
  const supplier = rows("SELECT id,name,status,currency FROM suppliers WHERE name LIKE 'QA B4.1 Proveedor %' ORDER BY created_at DESC LIMIT 1;")[0];
  if (!supplier) throw new Error("No existe el proveedor B4.1 creado por la UI.");
  const [requestId, requestCode, initialStatus, , , requestNotes] = request;
  const [supplierId, supplierName] = supplier;
  evidence.requestId = requestId;
  evidence.requestCode = requestCode;
  evidence.supplierId = supplierId;
  evidence.supplierName = supplierName;
  evidence.requestNotes = requestNotes;
  captureSql(scenario, "01-before-continuation", `SELECT pr.id,pr.code,pr.status,pr.location_id,pr.requester_id,pr.notes,pri.product_id,pri.quantity_requested,pri.notes FROM purchase_requests pr JOIN purchase_request_items pri ON pri.request_id=pr.id WHERE pr.id='${requestId}'; SELECT id,name,identification,status,currency FROM suppliers WHERE id='${supplierId}';`);
  if (!["request", "approve", "convert"].includes(phase)) throw new Error(`R3_PHASE inválida: ${phase}`);

  if (phase === "request") {
    if (initialStatus !== "DRAFT") throw new Error(`La solicitud encontrada no está en DRAFT: ${initialStatus}`);
    await openRequest(page, requestId);
    await capture(scenario, "02-request-draft", page);
    await page.getByRole("button", { name: /Enviar a aprobaci.n/, exact: true }).click();
    await waitForRow(`SELECT status FROM purchase_requests WHERE id='${requestId}';`, (row) => row[0] === "SUBMITTED");
    await capture(scenario, "03-request-submitted", page);
    captureSql(scenario, "02-after-submit", `SELECT id,code,status,requester_id,approved_by,approved_at FROM purchase_requests WHERE id='${requestId}'; SELECT id,action,entity_type,entity_id,actor_role,created_at FROM audit_logs WHERE entity_id='${requestId}' ORDER BY created_at DESC LIMIT 10;`);
    evidence.phases.push({ phase: "request", status: "SUBMITTED", uiMutation: true });
  }

  if (phase === "approve") {
    await openRequest(page, requestId);
    await capture(scenario, "04-request-for-approval", page);
    const approvedBefore = rows(`SELECT status FROM purchase_requests WHERE id='${requestId}';`)[0]?.[0];
    if (approvedBefore !== "SUBMITTED") throw new Error(`La solicitud no está lista para aprobación: ${approvedBefore}`);
    await page.getByRole("button", { name: "Aprobar", exact: true }).click();
    await waitForRow(`SELECT status FROM purchase_requests WHERE id='${requestId}';`, (row) => row[0] === "APPROVED");
    await capture(scenario, "05-request-approved", page);
    captureSql(scenario, "03-after-approval", `SELECT id,code,status,approved_by,approved_at,converted_purchase_id FROM purchase_requests WHERE id='${requestId}'; SELECT id,action,entity_type,entity_id,actor_role,created_at FROM audit_logs WHERE entity_id='${requestId}' ORDER BY created_at DESC LIMIT 10;`);
    evidence.phases.push({ phase: "approve", status: "APPROVED", uiMutation: true });
  }

  if (phase === "convert") {
    await openRequest(page, requestId);
    await capture(scenario, "06-approved-request-for-conversion", page);
    await page.getByLabel("Proveedor para convertir solicitud", { exact: true }).selectOption(supplierId);
    await page.getByLabel(`Costo unitario para ${productId}`, { exact: true }).fill("120");
    await page.locator('input[type="datetime-local"]').last().fill("2026-10-04T12:00");
    await capture(scenario, "07-conversion-filled", page);
    await page.getByRole("button", { name: "Convertir en OC", exact: true }).click();
    const purchase = await waitForRow(`SELECT p.id,p.code,p.status,p.supplier_id,p.location_id,p.request_id,pi.product_id,pi.quantity_ordered,pi.unit_cost,pi.currency FROM purchases p JOIN purchase_items pi ON pi.purchase_id=p.id WHERE p.request_id='${requestId}' ORDER BY p.created_at DESC LIMIT 1;`, (row) => row[0] && row[2] === "PENDING");
    await capture(scenario, "08-purchase-order-created", page);
    const purchaseRow = purchase[0];
    evidence.purchaseId = purchaseRow[0];
    evidence.purchaseCode = purchaseRow[1];
    evidence.phases.push({ phase: "convert", status: purchaseRow[2], supplierId: purchaseRow[3], productId: purchaseRow[6], quantity: purchaseRow[7], unitCost: purchaseRow[8], uiMutation: true });
    captureSql(scenario, "04-after-conversion", `SELECT pr.id,pr.code,pr.status,pr.approved_by,pr.converted_purchase_id,p.id AS purchase_id,p.code AS purchase_code,p.status AS purchase_status,p.supplier_id,p.location_id,pi.product_id,pi.quantity_ordered,pi.quantity_received,pi.unit_cost,pi.currency FROM purchase_requests pr LEFT JOIN purchases p ON p.id=pr.converted_purchase_id LEFT JOIN purchase_items pi ON pi.purchase_id=p.id WHERE pr.id='${requestId}'; SELECT id,action,entity_type,entity_id,actor_role,created_at FROM audit_logs WHERE entity_id IN ('${requestId}','${purchaseRow[0]}') ORDER BY created_at DESC LIMIT 20;`);
    if (purchaseRow[3] !== supplierId || purchaseRow[6] !== productId || purchaseRow[7] !== "2") throw new Error(`La OC no conserva proveedor/producto/cantidad: ${purchaseRow.join(" | ")}`);
  }

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
