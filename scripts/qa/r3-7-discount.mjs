import {
  artifactPath,
  capture,
  captureSql,
  clickButton,
  runScenario,
  runSql,
  visit,
  writeJson,
} from "./b-helpers.mjs";

const phase = process.env.R3_DISCOUNT_PHASE || "setup";
const scenario = `r3-7-${phase}`;
const productSku = "CP-REF-MCP-0103";
const ruleName = `QA R3.7 ${Date.now()}`;
const quoteName = `QA R3.7 ${Date.now()}`;
const quoteEmail = `r37.${Date.now()}@example.test`;
const quotePhone = `999${String(Date.now()).slice(-6)}`;
const discountReason = "Margen comercial autorizado para recuperar una oportunidad estratégica.";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function firstField(output) {
  return output.split(/\r?\n/).map((line) => line.trim()).find(Boolean)?.split("\t") ?? [];
}

async function createRule(page) {
  await visit(page, "/admin/precios");
  await clickButton(page, "Descuentos");
  await capture(scenario, "01-discount-rules-before", page);
  await clickButton(page, "Nueva regla");
  await page.locator('input[name="name"]').fill(ruleName);
  await page.locator('input[name="maxPercentage"]').fill("20");
  await page.locator('input[name="approvalAbovePercentage"]').fill("12");
  await page.locator('textarea[name="reason"]').fill("QA R3.7: 15% requiere aprobación; el máximo permitido es 20%.");
  await capture(scenario, "02-discount-rule-form", page);
  await clickButton(page, "Crear regla");
  await page.getByText(ruleName, { exact: false }).waitFor({ state: "visible", timeout: 20_000 });
  await capture(scenario, "03-discount-rule-created", page);
  const after = captureSql(
    scenario,
    "rule-after",
    `SELECT id,name,max_percentage,approval_above_percentage,status,created_by FROM discount_rules WHERE name='${ruleName}';`,
  );
  assert(after.includes(`${ruleName}\t20.00\t12.00\tACTIVE`), `La regla QA no quedó activa: ${after}`);
  return { ruleName, ruleSql: after };
}

async function submitPublicQuote(page) {
  await visit(page, "/cotizacion");
  await page.locator("#quote-product-search").fill(productSku);
  const suggestion = page.locator("#quote-product-suggestions button").filter({ hasText: productSku }).first();
  await suggestion.waitFor({ state: "visible", timeout: 20_000 });
  const selectedProduct = await suggestion.innerText();
  await suggestion.click();
  await page.locator("#quote-name").fill(quoteName);
  await page.locator("#quote-phone").fill(quotePhone);
  await page.locator("#quote-email").fill(quoteEmail);
  await page.locator("#quote-department").fill("Lima");
  await page.locator("#quote-province").fill("Lima");
  await page.locator("#quote-district").fill("San Isidro");
  await page.locator("#quote-message").fill("QA R3.7: solicitud comercial para validar descuento sujeto a aprobación.");
  await page.locator("#quote-consent").check();
  await capture(scenario, "04-public-quote-filled", page);
  const responsePromise = page.waitForResponse(
    (response) => response.url().endsWith("/api/cotizacion") && response.status() === 201,
    { timeout: 30_000 },
  );
  await clickButton(page, "Solicitar cotización");
  await responsePromise;
  await page.getByText("Solicitud registrada", { exact: false }).first().waitFor({ state: "visible", timeout: 30_000 });
  await capture(scenario, "05-public-quote-created", page);
  const quoteSql = captureSql(
    scenario,
    "quote-created",
    `SELECT id,tracking_code,name,phone,email,workflow_status,status FROM quotes WHERE email='${quoteEmail}' ORDER BY created_at DESC LIMIT 1;`,
  );
  const quoteRow = firstField(quoteSql);
  assert(quoteRow[0] && quoteRow[2] === quoteName, `La solicitud pública no quedó persistida: ${quoteSql}`);
  return { quoteId: quoteRow[0], trackingCode: quoteRow[1], selectedProduct, quoteSql };
}

async function editDiscount(page, quoteId) {
  await visit(page, `/admin/cotizaciones?quoteId=${encodeURIComponent(quoteId)}`);
  await page.getByRole("button", { name: "Editar", exact: true }).first().click();
  const discountInput = page.getByLabel(`Descuento ${productSku}`, { exact: true });
  await discountInput.waitFor({ state: "visible", timeout: 20_000 });
  const reasonInput = page.getByLabel(`Motivo descuento ${productSku}`, { exact: true });
  await discountInput.fill("15");
  await page.getByTestId(`discount-approval-warning-${productSku}`).waitFor({ state: "visible", timeout: 15_000 });
  await capture(scenario, "06-ventas-15-percent-warning", page);

  await page.getByRole("button", { name: "Guardar borrador", exact: true }).click();
  const validationError = page.getByRole("alert").filter({ hasText: /Indica el motivo del descuento/ }).first();
  await validationError.waitFor({ state: "visible", timeout: 10_000 });
  await capture(scenario, "07-ventas-reason-required", page);

  await reasonInput.fill(discountReason);
  const saveResponse = page.waitForResponse(
    (response) => response.url().includes(`/api/admin/cotizaciones/${quoteId}`) && response.request().method() === "PATCH",
    { timeout: 30_000 },
  );
  await page.getByRole("button", { name: "Guardar borrador", exact: true }).click();
  const response = await saveResponse;
  assert(response.status() === 200, `Guardar descuento devolvió ${response.status()}.`);
  await page.getByRole("button", { name: "Precios", exact: true }).waitFor({ state: "visible", timeout: 20_000 });
  await page.getByRole("button", { name: "Precios", exact: true }).click();
  await page.getByText("Aprobaciones de descuento", { exact: true }).waitFor({ state: "visible", timeout: 20_000 });
  await capture(scenario, "08-ventas-discount-pending", page);

  await page.getByRole("button", { name: "Enviar", exact: true }).click();
  const sendDialog = page.getByText("Registrar envío", { exact: true });
  await sendDialog.waitFor({ state: "visible", timeout: 10_000 });
  const sendChannel = page.locator("select").last();
  await sendChannel.selectOption("EMAIL");
  const sendResponse = page.waitForResponse(
    (candidate) => candidate.url().endsWith("/api/admin/cotizaciones/send") && candidate.request().method() === "POST",
    { timeout: 30_000 },
  );
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  const blockedResponse = await sendResponse;
  assert(blockedResponse.status() === 400, `El envío con aprobación pendiente devolvió ${blockedResponse.status()}.`);
  await page.getByRole("alert").filter({ hasText: /Aprobar descuento/ }).first().waitFor({ state: "visible", timeout: 15_000 });
  await capture(scenario, "09-ventas-send-blocked", page);

  const pendingSql = captureSql(
    scenario,
    "pending-after-ventas",
    `SELECT q.id,q.tracking_code,q.workflow_status,q.discount_approval_status,qi.sku_snapshot,qi.discount_percentage,qi.discount_status,qi.discount_reason,a.id,a.status,a.requested_by,n.recipient_id,n.type,n.state,u.role_code FROM quotes q JOIN quote_items qi ON qi.quote_id=q.id LEFT JOIN quote_discount_approvals a ON a.quote_id=q.id LEFT JOIN notifications n ON n.type='QUOTE_DISCOUNT_PENDING' AND n.metadata->>'quoteId'=q.id LEFT JOIN users u ON u.id=n.recipient_id WHERE q.id='${quoteId}' ORDER BY n.created_at DESC;`,
  );
  assert(pendingSql.includes("\tPENDING\t"), `La aprobación no quedó pendiente: ${pendingSql}`);
  assert(pendingSql.includes("\t15.00\t"), `El 15% no quedó persistido: ${pendingSql}`);
  assert(pendingSql.includes("QUOTE_DISCOUNT_PENDING") && pendingSql.includes("\tGERENCIA"), `No se notificó a GERENCIA: ${pendingSql}`);
  return { quoteId, quoteName, quoteEmail, quotePhone, discountReason, pendingSql };
}

async function approveFromNotification(page) {
  const quoteRow = firstField(runSql("SELECT q.id,q.tracking_code FROM quotes q JOIN quote_discount_approvals a ON a.quote_id=q.id WHERE q.name LIKE 'QA R3.7 %' AND a.status='PENDING' ORDER BY a.created_at DESC LIMIT 1;"));
  assert(quoteRow[0], "No se encontró una aprobación QA pendiente para GERENCIA.");
  const quoteId = quoteRow[0];
  const notificationRow = firstField(runSql(`SELECT id,recipient_id,link FROM notifications WHERE type='QUOTE_DISCOUNT_PENDING' AND metadata->>'quoteId'='${quoteId}' AND recipient_id='cp-dashboard-v5-user-gerencia' ORDER BY created_at DESC LIMIT 1;`));
  assert(notificationRow[0], "No se encontró la notificación QA para GERENCIA.");
  captureSql(scenario, "before-gerencia", `SELECT id,recipient_id,type,title,state,link FROM notifications WHERE id='${notificationRow[0]}'; SELECT id,quote_id,percentage,status,requested_by,approved_by FROM quote_discount_approvals WHERE quote_id='${quoteId}';`);
  await visit(page, `/admin/notificaciones?notificationId=${encodeURIComponent(notificationRow[0])}`);
  await page.getByRole("complementary").getByText("Descuento pendiente de aprobación", { exact: true }).waitFor({ state: "visible", timeout: 20_000 });
  await capture(scenario, "10-gerencia-notification", page);
  await page.getByRole("link", { name: "Ver origen", exact: true }).click();
  await page.waitForURL((url) => url.host === "localhost:3003" && url.pathname === "/admin/cotizaciones", { timeout: 20_000 });
  await page.getByRole("button", { name: "Precios", exact: true }).click();
  const approveButton = page.getByRole("button", { name: "Aprobar", exact: true }).first();
  await approveButton.waitFor({ state: "visible", timeout: 20_000 });
  await capture(scenario, "11-gerencia-approval-drawer", page);
  const approvalResponse = page.waitForResponse(
    (response) => response.url().endsWith("/api/admin/cotizaciones/discount") && response.request().method() === "PATCH",
    { timeout: 30_000 },
  );
  await approveButton.click();
  const response = await approvalResponse;
  assert(response.status() === 200, `La aprobación de GERENCIA devolvió ${response.status()}.`);
  await page.getByRole("button", { name: "Precios", exact: true }).click();
  await page.getByText("Estado: APPROVED", { exact: false }).waitFor({ state: "visible", timeout: 20_000 });
  await capture(scenario, "12-gerencia-approved", page);
  const afterSql = captureSql(
    scenario,
    "after-gerencia",
    `SELECT q.id,q.tracking_code,q.discount_approval_status,q.workflow_status FROM quotes q WHERE q.id='${quoteId}'; SELECT id,quote_id,percentage,amount,reason,status,requested_by,approved_by,approved_at FROM quote_discount_approvals WHERE quote_id='${quoteId}'; SELECT id,recipient_id,type,state,link FROM notifications WHERE type='QUOTE_DISCOUNT_PENDING' AND metadata->>'quoteId'='${quoteId}' ORDER BY created_at DESC; SELECT action,entity_type,entity_id,actor_id,actor_role FROM audit_logs WHERE entity_type='quote_discount_approval' AND entity_id IN (SELECT id FROM quote_discount_approvals WHERE quote_id='${quoteId}') ORDER BY created_at DESC;`,
  );
  assert(afterSql.includes("\tAPPROVED\t"), `La aprobación no quedó APPROVED: ${afterSql}`);
  assert(afterSql.includes("cp-dashboard-v5-user-gerencia"), `La aprobación no registra a GERENCIA: ${afterSql}`);
  return { quoteId, notificationId: notificationRow[0], notificationRecipient: notificationRow[1], afterSql };
}

await runScenario(scenario, async ({ page, events }) => {
  if (phase === "setup") {
    const before = captureSql(scenario, "rule-before", "SELECT id,name,max_percentage,approval_above_percentage,status FROM discount_rules ORDER BY created_at DESC LIMIT 10;");
    const rule = await createRule(page);
    return { outcome: "COMPLETED", phase, behavior: "discount_rule_ready", before, ...rule, browserEvents: events };
  }
  if (phase === "ventas") {
    const rule = firstField(runSql("SELECT id,name,max_percentage,approval_above_percentage,status FROM discount_rules WHERE status='ACTIVE' AND max_percentage >= 15 AND approval_above_percentage < 15 ORDER BY approval_above_percentage DESC LIMIT 1;"));
    assert(rule[0], "No hay una regla activa que permita 15% con aprobación.");
    const quote = await submitPublicQuote(page);
    const edited = await editDiscount(page, quote.quoteId);
    writeJson(artifactPath(scenario, "quote-context.json"), { ...quote, ...edited, rule });
    return { outcome: "COMPLETED", phase, behavior: "ventas_discount_pending_and_send_blocked", ...quote, ...edited, rule, browserEvents: events };
  }
  if (phase === "gerencia") {
    const approved = await approveFromNotification(page);
    return { outcome: "COMPLETED", phase, behavior: "gerencia_approved_from_notification_and_drawer", ...approved, browserEvents: events };
  }
  throw new Error(`Fase R3.7 desconocida: ${phase}`);
});
