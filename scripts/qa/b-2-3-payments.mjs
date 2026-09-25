import {
  artifactPath,
  capture,
  captureSql,
  clickButton,
  closeQaBrowser,
  compactError,
  createQaBrowser,
  fillPlaceholder,
  fillLabel,
  resultRecord,
  runSql,
  uniqueEmail,
  visit,
  waitForText,
  writeJson,
} from "./b-helpers.mjs";

const scenario = "B2.3-B5.1-payments";
function rowFromSql(query) {
  const row = runSql(query).split(/\r?\n/)[0]?.trim();
  if (!row) throw new Error("No se encontró el registro de preparación en la base local.");
  return row.split("\t");
}

async function createRejectedCheckout(page) {
  const email = uniqueEmail("b23-payment");
  page.on("dialog", (dialog) => void dialog.accept());
  await visit(page, "/carrito");
  const clearButton = page.getByRole("button", { name: "Vaciar carrito", exact: true });
  if (await clearButton.isVisible().catch(() => false)) {
    await clearButton.click();
    await page.waitForTimeout(400);
  }
  await visit(page, "/producto/compresor-rotativo-gemini-aud_1790289867163");
  await clickButton(page, "Agregar al carrito");
  await page.waitForTimeout(1200);
  await visit(page, "/checkout");
  await capture("B2.3-B5.1-payments", "00-checkout-delivery", page);
  await clickButton(page, "Continuar");
  await fillLabel(page, "Nombre completo", `QA B2.3 ${Date.now()}`);
  await fillLabel(page, "Teléfono / WhatsApp", "999888771");
  await fillLabel(page, "Correo", email);
  await capture("B2.3-B5.1-payments", "00-checkout-contact", page);
  await clickButton(page, "Continuar");
  await capture("B2.3-B5.1-payments", "00-checkout-review", page);
  await page.getByRole("button", { name: /^Pagar/ }).click();
  await page.waitForURL(/\/pago\/prueba\//, { timeout: 30_000 }).catch(() => undefined);
  await page.waitForTimeout(1200);
  await capture("B2.3-B5.1-payments", "00-checkout-created", page);
  const paymentPage = page.url();
  if (!paymentPage.includes("/pago/prueba/")) throw new Error(`El checkout no abrió la pasarela de prueba: ${paymentPage}`);
  await clickButton(page, "Rechazar pago");
  await page.waitForTimeout(1200);
  await capture("B2.3-B5.1-payments", "00-provider-rejected", page);
  const row = rowFromSql(`SELECT o.id,p.id,p.amount FROM orders o JOIN payments p ON p.order_id=o.id WHERE o.customer_email_snapshot='${email}' ORDER BY o.created_at DESC LIMIT 1;`);
  return { email, orderId: row[0], providerPaymentId: row[1], amount: row[2] };
}

async function main() {
  const session = await createQaBrowser(scenario);
  const { page } = session;
  const evidence = { scenario, stages: [], apiProbes: [] };
  try {
    const created = await createRejectedCheckout(page);
    const manualOrderId = created.orderId;
    const rejectedPaymentId = created.providerPaymentId;
    const manualAmount = created.amount;
    evidence.checkoutEmail = created.email;
    evidence.manualOrderId = manualOrderId;
    evidence.rejectedPaymentId = rejectedPaymentId;
    const manualRow = rowFromSql(`SELECT p.id,p.amount FROM payments p WHERE p.order_id='${manualOrderId}' ORDER BY p.created_at LIMIT 1;`);
    const manualPaymentId = manualRow[0];
    const orderAmount = manualRow[1];
    evidence.manualOrderId = manualOrderId;
    evidence.manualPaymentId = manualPaymentId;
    captureSql(scenario, "before-manual", `SELECT o.id,o.code,o.status,o.version,p.id AS payment_id,p.method_type,p.status AS payment_status,p.amount FROM orders o JOIN payments p ON p.order_id=o.id WHERE o.id='${manualOrderId}';`);

    await visit(page, `/admin/pagos?paymentId=${encodeURIComponent(rejectedPaymentId)}`);
    await waitForText(page, "Confirmar pago manual");
    await capture(scenario, "01-manual-payment-drawer", page);
    await page.locator('[aria-label="Monto del pago manual"]').fill(orderAmount || manualAmount);
    await page.locator('[aria-label*="pago manual"]').last().selectOption("TRANSFER");
    await page.locator('[aria-label="Referencia del pago"]').fill(`QA-MANUAL-${Date.now()}`);
    await page.locator('[aria-label*="Motivo de confirmación manual"], [aria-label*="Motivo de confirmaciÃ³n manual"]').fill("Conciliación manual QA B2.3 con comprobante verificado.");
    await capture(scenario, "02-manual-payment-filled", page);
    await page.getByRole("button", { name: "Confirmar", exact: true }).last().click();
    await page.waitForTimeout(1600);
    await capture(scenario, "03-manual-payment-confirmed", page);
    const confirmedManualRow = rowFromSql(`SELECT p.id,p.amount FROM payments p WHERE p.order_id='${manualOrderId}' AND p.method_type='MANUAL' ORDER BY p.created_at DESC LIMIT 1;`);
    const confirmedManualPaymentId = confirmedManualRow[0];
    evidence.stages.push({ stage: "manual_payment", saved: Boolean(confirmedManualPaymentId) });
    evidence.manualPaymentId = confirmedManualPaymentId;
    captureSql(scenario, "after-manual", `SELECT o.id,o.status,o.version,p.id AS payment_id,p.status AS payment_status,p.method_type,p.method,p.amount,psh.from_status,psh.to_status,psh.actor_role FROM orders o JOIN payments p ON p.order_id=o.id LEFT JOIN payment_status_history psh ON psh.payment_id=p.id WHERE o.id='${manualOrderId}' ORDER BY psh.created_at;`);

    await visit(page, `/admin/pagos?paymentId=${encodeURIComponent(confirmedManualPaymentId)}`);
    await page.getByText(/Devoluci.n manual/).first().waitFor({ state: "visible", timeout: 15_000 });
    const refundReason = `QA B2.3 devolución ${Date.now()}`;
    await fillPlaceholder(page, "Motivo obligatorio", refundReason);
    const refundButton = page.getByRole("button", { name: /Solicitar devoluci.n/, exact: true });
    if (!(await refundButton.isVisible().catch(() => false))) throw new Error("Después del pago manual no apareció el control de devolución.");
    await capture(scenario, "04-refund-before-double-click", page);
    await refundButton.dblclick({ delay: 80 }).catch(async () => { await refundButton.click(); });
    await page.waitForTimeout(1200);
    await capture(scenario, "05-refund-after-double-click", page);
    evidence.stages.push({ stage: "refund_double_click", saved: true });
    captureSql(scenario, "after-refund", `SELECT p.id,p.status,p.amount,pr.id AS refund_id,pr.status AS refund_status,pr.idempotency_key,pr.amount AS refund_amount,pr.reason,count(*) OVER (PARTITION BY pr.payment_id) AS refund_rows FROM payments p LEFT JOIN payment_refunds pr ON pr.payment_id=p.id WHERE p.id='${confirmedManualPaymentId}';`);

    const providerRow = rowFromSql("SELECT o.id,p.id FROM orders o JOIN payments p ON p.order_id=o.id WHERE o.status='PAYMENT_PENDING' AND p.status='PENDING' AND p.provider='mock' ORDER BY o.created_at ASC LIMIT 1;");
    const [providerOrderId, providerPaymentId] = providerRow;
    evidence.providerOrderId = providerOrderId;
    evidence.providerPaymentId = providerPaymentId;
    await visit(page, `/admin/pedidos?orderId=${encodeURIComponent(providerOrderId)}`);
    await page.getByText("Cargando pedido...").waitFor({ state: "detached", timeout: 20_000 }).catch(() => undefined);
    await page.waitForTimeout(300);
    await capture(scenario, "06-provider-order-before-cancel", page);
    const cancel = page.getByRole("button", { name: "Cancelar pedido", exact: true });
    if (!(await cancel.isVisible().catch(() => false))) throw new Error("El pedido provider pendiente no mostró Cancelar pedido.");
    await fillPlaceholder(page, "Obligatorio para cancelar y liberar reservas", "Cancelación QA antes de aprobación tardía del proveedor.");
    await cancel.click();
    await page.waitForTimeout(900);
    await capture(scenario, "07-provider-order-cancelled", page);
    evidence.stages.push({ stage: "provider_order_cancel", saved: true });
    captureSql(scenario, "after-cancel-before-late-approval", `SELECT id,code,status,version,cancellation_reason FROM orders WHERE id='${providerOrderId}'; SELECT id,status,provider,provider_reference FROM payments WHERE id='${providerPaymentId}';`);

    await visit(page, `/admin/pagos?paymentId=${encodeURIComponent(providerPaymentId)}`);
    await waitForText(page, "Actualizar estado");
    await capture(scenario, "08-provider-payment-pending", page);
    await clickButton(page, "Actualizar estado");
    await page.waitForTimeout(1200);
    await capture(scenario, "09-provider-late-approval", page);
    const lateBody = await page.locator("body").innerText();
    evidence.stages.push({ stage: "provider_late_approval", refundQueueVisible: /reembolsar|reembolso/i.test(lateBody) });
    captureSql(scenario, "after-late-approval", `SELECT o.id,o.status,p.id AS payment_id,p.status AS payment_status,pr.status AS refund_status FROM orders o JOIN payments p ON p.order_id=o.id LEFT JOIN payment_refunds pr ON pr.payment_id=p.id WHERE o.id='${providerOrderId}';`);

    const queueBody = await page.locator("body").innerText();
    if (/Procesar reembolso/i.test(queueBody)) {
      const processRefund = page.getByRole("button", { name: "Procesar reembolso", exact: true }).first();
      if (await processRefund.isVisible().catch(() => false)) {
        await processRefund.click().catch(() => undefined);
        await page.waitForTimeout(300);
      }
    }
    const lateRefundReason = `QA B5.1 reembolso por aprobar ${Date.now()}`;
    const lateRefundInput = page.getByPlaceholder("Motivo obligatorio");
    if (await lateRefundInput.isVisible().catch(() => false)) {
      await lateRefundInput.fill(lateRefundReason);
      const lateRefundButton = page.getByRole("button", { name: /Solicitar devoluci.n/, exact: true });
      if (await lateRefundButton.isVisible().catch(() => false)) {
        await lateRefundButton.dblclick({ delay: 80 }).catch(async () => { await lateRefundButton.click(); });
        await page.waitForTimeout(1100);
      }
    }
    await capture(scenario, "10-refund-required-processed", page);
    captureSql(scenario, "after-refund-queue", `SELECT o.id,o.status,p.id AS payment_id,p.status AS payment_status,pr.id AS refund_id,pr.status AS refund_status,pr.idempotency_key,count(*) OVER (PARTITION BY pr.payment_id) AS refund_rows FROM orders o JOIN payments p ON p.order_id=o.id LEFT JOIN payment_refunds pr ON pr.payment_id=p.id WHERE o.id='${providerOrderId}';`);
    evidence.stages.push({ stage: "refund_required_queue", inspected: true });

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
}

await main();
