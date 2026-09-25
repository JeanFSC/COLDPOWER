import {
  artifactPath,
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

const scenario = "B1.4-B2.1-discount-approval";
const email = uniqueEmail("b14");
const ruleName = `QA B1.4 ${Date.now()}`;

async function quoteIdForEmail() {
  const output = runSql(`SELECT id FROM quotes WHERE email='${email}' ORDER BY created_at DESC LIMIT 1;`);
  if (!output) throw new Error(`No se encontró la cotización UI para ${email}.`);
  return output.split(/\r?\n/)[0].trim();
}

async function selectPublicProduct(page) {
  await page.locator("#quote-product-search").fill("CP-REF-MCP-0103");
  const productSuggestion = page.locator("#quote-product-suggestions button").filter({ hasText: "CP-REF-MCP-0103" }).first();
  try {
    await productSuggestion.waitFor({ state: "visible", timeout: 20_000 });
    return { recoveredAfterReload: false };
  } catch (firstError) {
    await capture(scenario, "00-public-search-retry", page);
    await page.reload({ waitUntil: "domcontentloaded", timeout: 45_000 });
    await page.waitForSelector("body", { timeout: 15_000 });
    await page.waitForTimeout(900);
    await page.locator("#quote-product-search").fill("CP-REF-MCP-0103");
    await page.locator("#quote-product-suggestions button").filter({ hasText: "CP-REF-MCP-0103" }).first().waitFor({ state: "visible", timeout: 20_000 });
    return { recoveredAfterReload: true, firstAttemptError: compactError(firstError) };
  }
}

async function submitPublicQuote(page) {
  await visit(page, "/cotizacion");
  const searchResult = await selectPublicProduct(page);
  const productSuggestion = page.locator("#quote-product-suggestions button").filter({ hasText: "CP-REF-MCP-0103" }).first();
  await productSuggestion.click();
  await fillLabel(page, "Nombre o razon social", `QA B1.4 ${Date.now()}`);
  await fillLabel(page, "DNI", "77889922");
  await fillLabel(page, "Telefono", "999888778");
  await fillLabel(page, "Correo opcional", email);
  await fillLabel(page, "Departamento", "Lima");
  await fillLabel(page, "Provincia", "Lima");
  await fillLabel(page, "Distrito", "San Isidro");
  await page.locator("#quote-message").fill("Recorrido QA B1.4: intento real de solicitud con descuento sujeto a aprobación.");
  await page.locator("#quote-consent").check();
  await capture(scenario, "01-public-filled", page);
  const responsePromise = page.waitForResponse(
    (response) => response.url().endsWith("/api/cotizacion") && response.status() === 201,
    { timeout: 30_000 },
  );
  await clickButton(page, "Solicitar cotización");
  await responsePromise;
  await page.getByText("Solicitud registrada", { exact: false }).first().waitFor({ state: "visible", timeout: 30_000 });
  await capture(scenario, "02-public-created", page);
  return searchResult;
}

async function main() {
  const session = await createQaBrowser(scenario);
  const { page } = session;
  const evidence = { scenario, email, ruleName, stages: [], rootCause: null };
  try {
    captureSql(scenario, "before", "SELECT count(*) AS active_discount_rules_before FROM discount_rules WHERE status='ACTIVE';");
    await visit(page, "/admin/precios");
    await clickButton(page, "Descuentos");
    await capture(scenario, "03-discount-rules-empty-or-existing", page);
    await clickButton(page, "Nueva regla");
    await page.locator('input[name="name"]').fill(ruleName);
    await page.locator('input[name="maxPercentage"]').fill("10");
    await page.locator('input[name="approvalAbovePercentage"]').fill("10");
    await page.locator('textarea[name="reason"]').fill("Regla QA: descuento máximo y umbral igual para validar el gobierno comercial.");
    await capture(scenario, "04-rule-dialog", page);
    await clickButton(page, "Crear regla");
    await page.waitForTimeout(900);
    await capture(scenario, "05-rule-created", page);
    evidence.stages.push({ stage: "discount_rule_ui_mutation", saved: (await page.locator("body").innerText()).includes(ruleName) });
    captureSql(scenario, "after-rule", `SELECT id,name,max_percentage,approval_above_percentage,status,created_by FROM discount_rules WHERE name='${ruleName}'; SELECT action,entity_type,entity_id,actor_id,actor_role FROM audit_logs WHERE action ILIKE '%discount%' OR entity_type ILIKE '%discount%' ORDER BY created_at DESC LIMIT 10;`);

    evidence.publicSearch = await submitPublicQuote(page);
    const quoteId = await quoteIdForEmail();
    evidence.quoteId = quoteId;
    await visit(page, `/admin/cotizaciones?quoteId=${encodeURIComponent(quoteId)}`);
    await capture(scenario, "06-quote-detail", page);
    const edit = page.getByRole("button", { name: "Editar", exact: true }).first();
    await edit.waitFor({ state: "visible", timeout: 30_000 });
    await edit.click();
    await page.waitForTimeout(300);
    const controls = await page.locator("input, textarea, select").evaluateAll((elements) => elements.map((element) => ({ tag: element.tagName, name: element.getAttribute("name"), aria: element.getAttribute("aria-label"), placeholder: element.getAttribute("placeholder"), type: element.getAttribute("type") })));
    writeJson(artifactPath(scenario, "07-edit-controls.json"), controls);
    await capture(scenario, "07-edit-drawer-no-discount-control", page);
    const discountControls = controls.filter((control) => `${control.name || ""} ${control.aria || ""} ${control.placeholder || ""}`.toLowerCase().includes("discount") || `${control.name || ""} ${control.aria || ""} ${control.placeholder || ""}`.toLowerCase().includes("descuento"));
    evidence.stages.push({ stage: "quote_ui_discount_attempt", discountControlsFound: discountControls.length, controls: controls.length });
    if (!discountControls.length) {
      evidence.rootCause = "El editor de cotizaciones visible por UI solo expone producto, cantidad, vigencia, impuestos y nota; no existe un control para discountPercentage/discountReason. La regla activa no puede producir una solicitud de aprobación desde la UI.";
    }
    captureSql(scenario, "quote-after-ui-attempt", `SELECT q.id,q.tracking_code,q.workflow_status,q.discount_approval_status,qi.discount_percentage,qi.discount_status,qi.discount_reason FROM quotes q LEFT JOIN quote_items qi ON qi.quote_id=q.id WHERE q.id='${quoteId}';`);
    writeText(artifactPath(scenario, "08-root-cause.txt"), `${evidence.rootCause || "No se confirmó la causa raíz."}\n`);
    await page.keyboard.press("Escape").catch(() => undefined);
    resultRecord(scenario, { outcome: evidence.rootCause ? "BLOCKED_UI_CONTRACT" : "COMPLETED", ...evidence });
    console.log(JSON.stringify({ outcome: evidence.rootCause ? "BLOCKED_UI_CONTRACT" : "COMPLETED", ...evidence }, null, 2));
    if (evidence.rootCause) process.exitCode = 1;
  } catch (error) {
    await capture(scenario, "error", page).catch(() => undefined);
    resultRecord(scenario, { outcome: "BLOCKED", error: compactError(error), ...evidence });
    console.log(JSON.stringify({ outcome: "BLOCKED", error: compactError(error), ...evidence }, null, 2));
    process.exitCode = 1;
  } finally {
    await closeQaBrowser(session);
  }
}

await main();
