import {
  artifactPath,
  capture,
  captureSql,
  compactError,
  runScenario,
  saveBody,
  visit,
  writeJson,
} from "./b-helpers.mjs";

const scenario = "r3-4-ruc";
const customerId = "cp-dashboard-v5-customer-001";
const saleId = "cp-dashboard-v5-sale-001";
const originalRuc = "20501010101";
const invalidReplacementRuc = "20123456787";
const originalName = "Restaurante Costa Azul";
const editedName = `${originalName} QA RUC`;

function firstRow(output) {
  return output.split(/\r?\n/).map((line) => line.trim()).find(Boolean)?.split("\t") ?? [];
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function waitForPatch(page, action) {
  const [response] = await Promise.all([
    page.waitForResponse(
      (candidate) => candidate.url().includes(`/api/admin/clientes/${customerId}`) && candidate.request().method() === "PATCH",
      { timeout: 30_000 },
    ),
    action(),
  ]);
  const payload = await response.json().catch(() => null);
  return { response, payload };
}

async function openCustomerRow(page) {
  const row = page.getByRole("row").filter({ hasText: originalName }).first();
  await row.waitFor({ state: "visible", timeout: 30_000 });
  return row;
}

async function openEditDrawer(page, row) {
  await row.locator('button[aria-label^="Acciones de "]').click();
  await page.getByRole("button", { name: /Editar cliente/i }).click();
  const drawer = page.getByRole("dialog").filter({ hasText: /Editar cliente/i }).last();
  await drawer.getByRole("button", { name: /Guardar cambios/i }).waitFor({ state: "visible", timeout: 15_000 });
  return drawer;
}

function field(drawer, pattern) {
  return drawer.locator("label").filter({ hasText: pattern }).locator("input").first();
}

async function fillAndSave(page, drawer, { name, ruc, reason }) {
  await field(drawer, /Nombre.*razón social/i).fill(name);
  await field(drawer, /^RUC$/i).fill(ruc);
  await drawer.getByPlaceholder("Deja trazabilidad del cambio.").fill(reason);
  return waitForPatch(page, () => drawer.getByRole("button", { name: /Guardar cambios/i }).click());
}

await runScenario(scenario, async ({ page, events }) => {
  const beforeCustomer = firstRow(captureSql(scenario, "before", `SELECT id,name,ruc,customer_type,updated_at FROM customers WHERE id='${customerId}'; SELECT id,code,status,invoice_status,version,customer_id FROM sales WHERE id='${saleId}';`));
  assert(beforeCustomer[0] === customerId, `No se encontró el cliente fixture: ${beforeCustomer.join("|")}`);
  assert(beforeCustomer[2] === originalRuc, `El fixture no conserva el RUC histórico esperado: ${beforeCustomer[2]}`);

  await visit(page, `/admin/clientes?query=${encodeURIComponent(originalName)}`);
  const row = await openCustomerRow(page);

  await row.getByRole("button", { name: /Acciones de Restaurante Costa Azul/i }).click();
  await page.getByRole("button", { name: /Ver cliente 360/i }).click();
  await page.getByTestId("ruc-needs-verification").waitFor({ state: "visible", timeout: 30_000 });
  await capture(scenario, "customer-360-invalid-ruc", page, { fullPage: true });
  await saveBody(scenario, "customer-360-invalid-ruc", page);

  await visit(page, `/admin/clientes?query=${encodeURIComponent(originalName)}`);
  const editDrawer = await openEditDrawer(page, await openCustomerRow(page));
  const unchanged = await fillAndSave(page, editDrawer, {
    name: editedName,
    ruc: originalRuc,
    reason: "QA R3.4: actualizar nombre sin alterar RUC histórico pendiente de verificación.",
  });
  assert(unchanged.response.status() === 200, `Editar nombre con RUC histórico falló: ${unchanged.response.status()}`);
  await page.waitForTimeout(700);
  const afterUnchanged = firstRow(captureSql(scenario, "after-unchanged-ruc", `SELECT id,name,ruc,updated_at FROM customers WHERE id='${customerId}';`));
  assert(afterUnchanged[1] === editedName && afterUnchanged[2] === originalRuc, `El cambio no preservó el RUC histórico: ${afterUnchanged.join("|")}`);
  await capture(scenario, "edit-unchanged-ruc", page, { fullPage: true });

  const invalidEditDrawer = await openEditDrawer(page, page.getByRole("row").filter({ hasText: editedName }).first());
  const invalid = await fillAndSave(page, invalidEditDrawer, {
    name: editedName,
    ruc: invalidReplacementRuc,
    reason: "QA R3.4: comprobar rechazo de RUC nuevo con dígito verificador inválido.",
  });
  assert(invalid.response.status() === 400, `RUC nuevo inválido no fue rechazado: ${invalid.response.status()}`);
  assert(JSON.stringify(invalid.payload).includes("El RUC no es válido"), `Respuesta sin mensaje de validación RUC: ${JSON.stringify(invalid.payload)}`);
  writeJson(artifactPath(scenario, "invalid-ruc-response.json"), { status: invalid.response.status(), payload: invalid.payload });
  await capture(scenario, "edit-invalid-ruc", page, { fullPage: true });
  const afterInvalid = firstRow(captureSql(scenario, "after-invalid-ruc", `SELECT id,name,ruc,updated_at FROM customers WHERE id='${customerId}';`));
  assert(afterInvalid[1] === editedName && afterInvalid[2] === originalRuc, `El RUC inválido alteró la base: ${afterInvalid.join("|")}`);

  const restored = await fillAndSave(page, invalidEditDrawer, {
    name: originalName,
    ruc: originalRuc,
    reason: "QA R3.4: restaurar nombre original y conservar RUC histórico para la fixture.",
  });
  assert(restored.response.status() === 200, `No se pudo restaurar la fixture con RUC histórico: ${restored.response.status()}`);
  await page.waitForTimeout(700);
  const afterRestore = firstRow(captureSql(scenario, "after-restore", `SELECT id,name,ruc,updated_at FROM customers WHERE id='${customerId}';`));
  assert(afterRestore[1] === originalName && afterRestore[2] === originalRuc, `La fixture no quedó restaurada: ${afterRestore.join("|")}`);

  const invoiceBefore = firstRow(captureSql(scenario, "invoice-before", `SELECT id,invoice_status,external_invoice_reference,version,customer_id FROM sales WHERE id='${saleId}';`));
  const invoiceResponse = await page.request.fetch(`http://localhost:3003/api/admin/ventas/${saleId}/facturacion`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    data: {
      invoiceStatus: "ISSUED",
      externalInvoiceReference: `QA-RUC-${Date.now()}`,
    },
  });
  const invoicePayload = await invoiceResponse.json().catch(() => null);
  writeJson(artifactPath(scenario, "invoice-blocked-response.json"), { status: invoiceResponse.status(), payload: invoicePayload });
  assert(invoiceResponse.status() === 422, `Emitir comprobante con RUC inválido respondió ${invoiceResponse.status()}`);
  assert(invoicePayload?.error?.code === "CUSTOMER_RUC_REQUIRED_FOR_INVOICE", `Código inesperado de emisión: ${JSON.stringify(invoicePayload)}`);
  const invoiceAfter = firstRow(captureSql(scenario, "invoice-after", `SELECT id,invoice_status,external_invoice_reference,version,customer_id FROM sales WHERE id='${saleId}';`));
  assert(invoiceAfter[1] === invoiceBefore[1] && invoiceAfter[2] === invoiceBefore[2] && invoiceAfter[3] === invoiceBefore[3], `La emisión inválida mutó la venta: antes=${invoiceBefore.join("|")} después=${invoiceAfter.join("|")}`);

  await visit(page, `/admin/ventas?customerId=${encodeURIComponent(customerId)}`);
  await capture(scenario, "sale-invoice-blocked", page, { fullPage: true });
  await saveBody(scenario, "sale-invoice-blocked", page);
  captureSql(scenario, "final", `SELECT id,name,ruc FROM customers WHERE id='${customerId}'; SELECT id,code,invoice_status,external_invoice_reference,version,customer_id FROM sales WHERE id='${saleId}';`);

  return {
    outcome: "COMPLETED",
    checks: {
      invalidRucBadge: "RUC por verificar",
      unchangedHistoricalRucEdit: "HTTP 200 y nombre actualizado sin cambiar RUC",
      changedInvalidRuc: "HTTP 400 y RUC persistido intacto",
      invoiceWithInvalidRuc: { status: invoiceResponse.status(), code: invoicePayload?.error?.code, saleUnchanged: true },
      fixtureRestored: afterRestore[1] === originalName && afterRestore[2] === originalRuc,
    },
    browserEvents: events,
  };
}).catch((error) => {
  console.error(compactError(error));
  process.exitCode = 1;
});
