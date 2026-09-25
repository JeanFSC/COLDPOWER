import {
  artifactPath,
  BASE_URL,
  capture,
  captureSql,
  clickButton,
  closeQaBrowser,
  compactError,
  createQaBrowser,
  fillLabel,
  resultRecord,
  runSql,
  uniqueEmail,
  visit,
  writeJson,
  writeText,
} from "./b-helpers.mjs";

const scenario = "B1.1-quote-to-sale";
const email = uniqueEmail("b11");
const quoteName = `QA B1.1 ${Date.now()}`;

async function getQuoteId() {
  const value = runSql(`SELECT id FROM quotes WHERE email='${email}' ORDER BY created_at DESC LIMIT 1;`);
  if (!value) throw new Error(`No se encontró la cotización UI para ${email}.`);
  return value.split(/\r?\n/)[0].trim();
}

async function main() {
  const session = await createQaBrowser(scenario);
  const { page } = session;
  const evidence = { scenario, email, quoteName, stages: [], apiProbes: [] };
  try {
    captureSql(scenario, "before", "SELECT count(*) AS quotes_before FROM quotes;");

    await visit(page, "/cotizacion");
    await capture(scenario, "01-public-form", page);
    // CP-ROT-8284 was removed from the local published catalog; use the
    // published compressor fixture shared by the current quote QA flows.
    const productSuggestion = page.locator("#quote-product-suggestions button").first();
    let productSelected = false;
    for (let attempt = 0; attempt < 3 && !productSelected; attempt += 1) {
      await page.locator("#quote-product-search").fill("CP-REF-MCP-0103");
      try {
        await productSuggestion.waitFor({ state: "visible", timeout: 10_000 });
        await productSuggestion.click();
        productSelected = true;
      } catch (error) {
        if (attempt === 2) throw error;
        await page.reload({ waitUntil: "domcontentloaded", timeout: 45_000 });
        await page.waitForTimeout(1_000);
      }
    }
    await fillLabel(page, "Nombre o razon social", quoteName);
    await fillLabel(page, "DNI", "77889911");
    await fillLabel(page, "Telefono", "999888777");
    await fillLabel(page, "Correo opcional", email);
    await fillLabel(page, "Departamento", "Lima");
    await fillLabel(page, "Provincia", "Lima");
    await fillLabel(page, "Distrito", "Miraflores");
    await page.locator("#quote-message").fill("Recorrido QA B1.1: solicitud web real para convertirla en venta.");
    await page.locator("#quote-consent").check();
    await capture(scenario, "02-public-form-filled", page);
    await clickButton(page, "Solicitar cotización");
    await page.getByText("Solicitud registrada", { exact: false }).first().waitFor({ state: "visible", timeout: 30_000 });
    await capture(scenario, "03-public-submitted", page);
    await writeText(artifactPath(scenario, "03-public-body.txt"), await page.locator("body").innerText());
    evidence.stages.push({ stage: "public_request", bodyContainsSuccess: /registrada|enviada|seguimiento/i.test(await page.locator("body").innerText()) });

    const quoteId = await getQuoteId();
    evidence.quoteId = quoteId;
    captureSql(scenario, "after-public", `SELECT q.id,q.tracking_code,q.workflow_status,q.status,q.discount_approval_status,q.email,qi.sku_snapshot,qi.quantity,n.type,n.title FROM quotes q LEFT JOIN quote_items qi ON qi.quote_id=q.id LEFT JOIN notifications n ON n.link LIKE '%' || q.id || '%' WHERE q.id='${quoteId}' ORDER BY n.created_at DESC;`);

    await visit(page, `/admin/cotizaciones?quoteId=${encodeURIComponent(quoteId)}`);
    await capture(scenario, "04-staff-detail", page);
    await writeText(artifactPath(scenario, "04-staff-body.txt"), await page.locator("body").innerText());

    const editButton = page.getByRole("button", { name: "Editar", exact: true }).first();
    for (let attempt = 0; attempt < 3 && !(await editButton.isVisible().catch(() => false)); attempt += 1) {
      await editButton.waitFor({ state: "visible", timeout: 10_000 }).catch(() => undefined);
      if (await editButton.isVisible().catch(() => false)) break;
      if (attempt < 2) {
        await page.reload({ waitUntil: "domcontentloaded", timeout: 45_000 });
        await page.waitForTimeout(2_000);
      }
    }
    if (await editButton.isVisible().catch(() => false)) {
      await editButton.click();
      await page.locator('input[type="date"]').last().fill("2026-12-31");
      await page.locator("select").last().selectOption("EXCLUDED");
      await page.locator("textarea").last().fill("Respuesta comercial QA B1.1 con precio y vigencia definidos.");
      await capture(scenario, "05-edit-before-save", page);
      await clickButton(page, "Guardar borrador");
      await page.waitForTimeout(1000);
      evidence.stages.push({ stage: "staff_pricing", saved: true });
    } else {
      evidence.stages.push({ stage: "staff_pricing", saved: false, reason: "El botón Editar no quedó visible." });
    }

    await capture(scenario, "06-ready-to-send", page);
    const sendButton = page.getByRole("button", { name: "Enviar", exact: true }).first();
    if (!(await sendButton.isVisible().catch(() => false))) throw new Error("La cotización no quedó enviable después de editarla.");
    await sendButton.click();
    await page.locator("select").last().selectOption("EMAIL");
    await page.locator("textarea").last().fill(email);
    await capture(scenario, "07-send-dialog", page);
    const sendResponse = page.waitForResponse(
      (response) => response.url().endsWith("/api/admin/cotizaciones/send") && response.status() === 200,
      { timeout: 30_000 },
    );
    await clickButton(page, "Guardar");
    await sendResponse;
    await capture(scenario, "08-sent", page);
    evidence.stages.push({ stage: "staff_send", saved: true });

    const responseButton = page.getByRole("button", { name: "Registrar respuesta", exact: true }).first();
    await responseButton.waitFor({ state: "visible", timeout: 30_000 }).catch(() => undefined);
    if (!(await responseButton.isVisible().catch(() => false))) throw new Error("No apareció Registrar respuesta después del envío.");
    await responseButton.click();
    const selects = page.locator("select");
    const selectCount = await selects.count();
    await selects.nth(selectCount - 2).selectOption("ACCEPTED");
    await selects.nth(selectCount - 1).selectOption("PORTAL");
    await page.locator("textarea").last().fill("Cliente acepta la propuesta durante el recorrido QA.");
    await capture(scenario, "09-response-dialog", page);
    await clickButton(page, "Guardar");
    await page.waitForTimeout(1000);
    await capture(scenario, "10-accepted", page);
    evidence.stages.push({ stage: "customer_response", saved: true });

    const convertButton = page.getByRole("button", { name: "Convertir en venta", exact: true }).first();
    if (!(await convertButton.isVisible().catch(() => false))) throw new Error("No apareció Convertir en venta después de aceptar la cotización.");
    await convertButton.click();
    await page.waitForTimeout(700);
    const conversionSelects = page.locator("select");
    const conversionCount = await conversionSelects.count();
    if (conversionCount < 2) throw new Error("El drawer de conversión no mostró local y método de entrega.");
    await conversionSelects.nth(conversionCount - 2).selectOption({ index: 1 });
    await capture(scenario, "11-conversion-dialog", page);
    await clickButton(page, "Confirmar venta");
    await page.waitForTimeout(1300);
    await capture(scenario, "12-sale-created", page);
    const finalBody = await page.locator("body").innerText();
    evidence.stages.push({ stage: "sale_conversion", saved: /Ver pedido|venta .*registrada|Venta creada/i.test(finalBody) });

    captureSql(scenario, "after-sale", `SELECT q.id,q.tracking_code,q.workflow_status,q.status,q.accepted_version_id,s.id AS sale_id,s.code AS sale_code,s.status AS sale_status,o.id AS order_id,o.code AS order_code,o.status AS order_status FROM quotes q LEFT JOIN sales s ON s.quote_id=q.id LEFT JOIN orders o ON o.sale_id=s.id WHERE q.id='${quoteId}'; SELECT action,entity_type,entity_id,actor_id,actor_role FROM audit_logs WHERE entity_id IN ('${quoteId}') ORDER BY created_at;`);

    const prohibitedPage = await session.context.newPage();
    const forbiddenResponse = await prohibitedPage.goto(`${new URL("/admin/configuracion", BASE_URL).href}`, { waitUntil: "domcontentloaded" });
    await prohibitedPage.waitForTimeout(500);
    await capture(scenario, "13-prohibited-url", prohibitedPage);
    evidence.apiProbes.push({ name: "ventas_url_company_settings", status: forbiddenResponse?.status() ?? null, url: prohibitedPage.url(), body: (await prohibitedPage.locator("body").innerText()).slice(0, 1200) });
    const apiProbe = await session.page.request.fetch(new URL("/api/admin/configuracion", BASE_URL).href, { method: "POST", headers: { "Content-Type": "application/json" }, data: { tradeName: "forbidden-qa" } });
    evidence.apiProbes.push({ name: "ventas_api_company_settings_mutation", status: apiProbe.status(), body: (await apiProbe.text()).slice(0, 1200) });
    await prohibitedPage.close();
    resultRecord(scenario, { outcome: "COMPLETED", ...evidence });
    console.log(JSON.stringify({ outcome: "COMPLETED", ...evidence }, null, 2));
  } catch (error) {
    await capture(scenario, "error", page).catch(() => undefined);
    writeJson(artifactPath(scenario, "error.json"), { error: compactError(error), evidence });
    captureSql(scenario, "error-state", `SELECT q.id,q.tracking_code,q.workflow_status,q.status,q.discount_approval_status,q.email FROM quotes q WHERE q.email='${email}' ORDER BY q.created_at DESC;`);
    resultRecord(scenario, { outcome: "BLOCKED", error: compactError(error), ...evidence });
    console.log(JSON.stringify({ outcome: "BLOCKED", error: compactError(error), ...evidence }, null, 2));
    process.exitCode = 1;
  } finally {
    await closeQaBrowser(session);
  }
}

await main();
