import {
  artifactPath,
  capture,
  captureSql,
  closeQaBrowser,
  compactError,
  createQaBrowser,
  probeApi,
  resultRecord,
  runSql,
  visit,
  waitForText,
  writeJson,
} from "./b-helpers.mjs";

const scenario = "r3-3-tax";
const phase = process.env.R3_PHASE || "superadmin";
const productId = "product-cp-ref-mcp-0103";

function rows(query) {
  return runSql(query)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split("\t"));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function openTaxSettings(page) {
  const taxSection = page.locator("#company-tax");
  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await visit(page, "/admin/configuracion");
      await taxSection.waitFor({ state: "attached", timeout: 15_000 });
      lastError = undefined;
      break;
    } catch (error) {
      lastError = error;
      if (attempt === 2) throw error;
      await page.reload({ waitUntil: "domcontentloaded", timeout: 45_000 });
      await page.waitForTimeout(1500);
    }
  }
  if (lastError) throw lastError;
  if (!(await taxSection.isVisible())) {
    const summary = page.locator("summary").last();
    await summary.waitFor({ state: "visible", timeout: 15_000 });
    await summary.click();
  }
  await taxSection.waitFor({ state: "visible", timeout: 15_000 });
}

async function saveTaxSettings(page, rate, mode) {
  await openTaxSettings(page);
  const rateInput = page.getByLabel("Tasa de IGV", { exact: true });
  const modeInput = page.getByLabel("Modalidad del IGV", { exact: true });
  await rateInput.fill(rate);
  await modeInput.selectOption(mode);
  const saveButton = page.locator('#company-settings-form button[type="submit"]');
  await saveButton.waitFor({ state: "visible", timeout: 15_000 });
  await saveButton.click();
  await waitForText(page, "Configuración guardada y auditada.");
}

async function visitCartAndWaitForApi(page) {
  await visit(page, "/carrito");
  // The shopping-cart provider is mounted from the root layout. A second full
  // document load prevents an earlier provider refresh from winning a race
  // against the QA cart mutation.
  await page.reload({ waitUntil: "domcontentloaded", timeout: 45_000 });
  await page.waitForTimeout(2500);
}

function includedBreakdown(amount, rate = 18) {
  const total = Number(amount);
  const taxable = total / (1 + rate / 100);
  return { total: total.toFixed(2), taxable: taxable.toFixed(2), igv: (total - taxable).toFixed(2) };
}

const session = await createQaBrowser(scenario);
const { page } = session;
const evidence = { scenario, phase, productId, checks: [] };
let configurationWasSaved = false;
let configurationWasRestored = false;

try {
  if (phase === "role") {
    captureSql(scenario, "role-before", "SELECT id,tax_rate,tax_mode,version FROM company_settings WHERE id='default';");
    await visit(page, "/admin/configuracion");
    await capture(scenario, "role-jefatura-settings", page);
    assert((await page.locator("#company-tax").count()) === 0, "El control tributario está visible para un rol distinto de SUPERADMIN.");
    const version = rows("SELECT version FROM company_settings WHERE id='default';")[0]?.[0];
    const denied = await probeApi(page, "/api/admin/configuracion", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      data: JSON.stringify({ version: Number(version), taxRate: "18.00", taxMode: "INCLUDED" }),
    });
    assert(denied.status === 403, `La API no rechazó la configuración tributaria para JEFATURA: ${denied.status} ${denied.body}`);
    assert(denied.body.includes("COMPANY_SETTINGS_TAX_FORBIDDEN"), `La API devolvió un error distinto al contrato de permisos: ${denied.body}`);
    captureSql(scenario, "role-after", "SELECT id,tax_rate,tax_mode,version FROM company_settings WHERE id='default'; SELECT action,actor_role,entity_type,entity_id,created_at FROM audit_logs WHERE entity_type='company_settings' ORDER BY created_at DESC LIMIT 5;");
    evidence.checks.push({ name: "superadmin-only", outcome: "passed", apiStatus: denied.status });
  } else if (phase === "superadmin") {
    const initialSettings = rows("SELECT id,tax_rate,tax_mode,version FROM company_settings WHERE id='default';")[0];
    assert(initialSettings, "No existe company_settings.default para probar la configuración tributaria.");
    assert(!initialSettings[1] && !initialSettings[2], `El entorno QA no está inicialmente desconfigurado: ${initialSettings.join(" | ")}`);
    captureSql(scenario, "01-before", "SELECT id,tax_rate,tax_mode,version FROM company_settings WHERE id='default'; SELECT p.id,p.sku,p.tax_type,pp.amount,pp.currency FROM products p JOIN product_prices pp ON pp.product_id=p.id WHERE p.id='product-cp-ref-mcp-0103' AND pp.price_type='RETAIL' AND pp.status='ACTIVE' AND pp.active=true AND pp.valid_from <= now() AND (pp.valid_until IS NULL OR pp.valid_until > now()) ORDER BY pp.valid_from DESC NULLS LAST LIMIT 1;");

    await openTaxSettings(page);
    await capture(scenario, "01-settings-unconfigured", page);
    const initialRate = await page.getByLabel("Tasa de IGV", { exact: true }).inputValue();
    const initialMode = await page.getByLabel("Modalidad del IGV", { exact: true }).inputValue();
    assert(initialRate === "" && initialMode === "", `El formulario no muestra el estado inicial vacío: tasa=${initialRate}, modalidad=${initialMode}`);
    assert((await page.locator("body").innerText()).includes("Sugerencia: 18%"), "La sugerencia de 18% no está visible.");
    evidence.checks.push({ name: "settings-unconfigured", outcome: "passed", rate: initialRate, mode: initialMode });

    await saveTaxSettings(page, "18", "INCLUDED");
    configurationWasSaved = true;
    await capture(scenario, "02-settings-configured", page);
    const configured = rows("SELECT id,tax_rate,tax_mode,version FROM company_settings WHERE id='default';")[0];
    assert(configured?.[1] === "18.00" && configured?.[2] === "INCLUDED", `La configuración no persistió como 18% incluido: ${configured?.join(" | ")}`);
    captureSql(scenario, "02-after-configure", "SELECT id,tax_rate,tax_mode,version FROM company_settings WHERE id='default'; SELECT id,version,actor_role,after,created_at FROM company_settings_history WHERE settings_id='default' ORDER BY created_at DESC LIMIT 3; SELECT action,actor_role,entity_type,entity_id,after,created_at FROM audit_logs WHERE entity_type='company_settings' ORDER BY created_at DESC LIMIT 3;");
    evidence.checks.push({ name: "settings-configured", outcome: "passed", rate: configured[1], mode: configured[2] });

    const product = rows("SELECT pp.amount,pp.currency,p.tax_type FROM products p JOIN product_prices pp ON pp.product_id=p.id WHERE p.id='product-cp-ref-mcp-0103' AND pp.price_type='RETAIL' AND pp.status='ACTIVE' AND pp.active=true AND pp.valid_from <= now() AND (pp.valid_until IS NULL OR pp.valid_until > now()) ORDER BY pp.valid_from DESC NULLS LAST LIMIT 1;")[0];
    assert(product, "No existe precio minorista activo para el producto de prueba.");
    const cleared = await probeApi(page, "/api/carrito", { method: "DELETE" });
    assert(cleared.status === 200, `No se pudo limpiar el carrito de QA: ${cleared.status} ${cleared.body}`);
    const added = await probeApi(page, "/api/carrito", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      data: JSON.stringify({ productId, quantity: 1 }),
    });
    assert(added.status === 200, `No se pudo agregar el producto de prueba: ${added.status} ${added.body}`);
    const addedBody = JSON.parse(added.body);
    const cartTax = addedBody.cart?.tax;
    const chargedAmount = addedBody.cart?.items?.[0]?.lineTotal;
    assert(chargedAmount, `El carrito no devolvió el importe cobrado de la línea: ${added.body}`);
    const expected = includedBreakdown(chargedAmount);
    assert(cartTax?.status === "CONFIGURED", `El carrito no calculó IGV configurado: ${JSON.stringify(cartTax)}`);
    assert(cartTax.total === expected.total && cartTax.taxableOperation === expected.taxable && cartTax.igv === expected.igv, `Desglose incorrecto. Esperado ${JSON.stringify(expected)}, recibido ${JSON.stringify(cartTax)}`);
    captureSql(scenario, "03-cart-configured", "SELECT c.id,c.user_id,c.status,ci.product_id,ci.quantity FROM shopping_carts c JOIN shopping_cart_items ci ON ci.cart_id=c.id WHERE c.status='ACTIVE' ORDER BY c.updated_at DESC LIMIT 5;");
    await visitCartAndWaitForApi(page);
    await waitForText(page, "IGV 18.00%", 45_000);
    await capture(scenario, "03-cart-configured", page);
    let body = await page.locator("body").innerText();
    const formattedTotal = Number(expected.total).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    assert(body.includes("Op. gravada") && body.includes("IGV 18.00%") && body.includes(expected.taxable) && body.includes(expected.igv) && body.includes(formattedTotal), `El resumen del carrito no muestra el desglose esperado: ${body.slice(-1200)}`);
    assert(!body.includes("Por configurar"), "El carrito configurado todavía muestra Por configurar.");
    evidence.checks.push({ name: "cart-configured", outcome: "passed", expected, received: cartTax });

    await visit(page, "/checkout");
    await waitForText(page, "IGV 18.00%");
    await capture(scenario, "04-checkout-configured", page);
    body = await page.locator("body").innerText();
    assert(body.includes("Op. gravada") && body.includes("IGV 18.00%"), "El checkout configurado no muestra el desglose tributario.");
    assert(!body.includes("Por configurar"), "El checkout configurado todavía muestra Por configurar.");
    evidence.checks.push({ name: "checkout-configured", outcome: "passed", expected });

    const historicalOrder = rows("SELECT id,code,total,tax_amount,tax_rate,tax_mode FROM orders WHERE tax_mode='UNCONFIGURED' ORDER BY created_at DESC LIMIT 1;")[0];
    assert(historicalOrder, "No existe un pedido histórico sin configuración tributaria para probar el aviso administrativo.");
    evidence.historicalOrderId = historicalOrder[0];
    evidence.historicalOrderCode = historicalOrder[1];
    await visit(page, `/admin/pedidos?orderId=${encodeURIComponent(historicalOrder[0])}`);
    await waitForText(page, "Configura el IGV en Configuración");
    await capture(scenario, "05-admin-historical-unconfigured", page);
    body = await page.locator("body").innerText();
    assert(body.includes("Configura el IGV en Configuración") && !body.includes("IGV 18.00%"), "El admin no conserva el aviso del snapshot histórico sin IGV.");
    captureSql(scenario, "04-admin-historical-unconfigured", `SELECT id,code,total,tax_amount,tax_rate,tax_mode FROM orders WHERE id='${historicalOrder[0]}'; SELECT id,action,entity_type,entity_id,created_at FROM audit_logs WHERE entity_id='${historicalOrder[0]}' ORDER BY created_at DESC LIMIT 10;`);
    evidence.checks.push({ name: "admin-historical-unconfigured", outcome: "passed", orderId: historicalOrder[0], taxMode: historicalOrder[5] });

    await saveTaxSettings(page, "", "");
    configurationWasRestored = true;
    await capture(scenario, "06-settings-restored", page);
    const restored = rows("SELECT id,tax_rate,tax_mode,version FROM company_settings WHERE id='default';")[0];
    assert(!restored[1] && !restored[2], `La configuración temporal no fue restaurada: ${restored.join(" | ")}`);
    captureSql(scenario, "05-after-restore", "SELECT id,tax_rate,tax_mode,version FROM company_settings WHERE id='default'; SELECT id,version,actor_role,after,created_at FROM company_settings_history WHERE settings_id='default' ORDER BY created_at DESC LIMIT 5; SELECT action,actor_role,entity_type,entity_id,after,created_at FROM audit_logs WHERE entity_type='company_settings' ORDER BY created_at DESC LIMIT 5;");

    await visitCartAndWaitForApi(page);
    await waitForText(page, "Total", 45_000);
    await capture(scenario, "07-cart-unconfigured", page);
    body = await page.locator("body").innerText();
    assert(body.includes("Total") && !body.includes("Op. gravada") && !body.includes("IGV ") && !body.includes("Por configurar"), `El carrito sin configurar todavía muestra filas tributarias: ${body.slice(-1200)}`);
    evidence.checks.push({ name: "cart-unconfigured", outcome: "passed" });

    await visit(page, "/checkout");
    await waitForText(page, "Total", 45_000);
    await capture(scenario, "08-checkout-unconfigured", page);
    body = await page.locator("body").innerText();
    assert(!body.includes("Op. gravada") && !body.includes("IGV ") && !body.includes("Por configurar"), "El checkout sin configurar muestra un desglose tributario inexistente.");
    evidence.checks.push({ name: "checkout-unconfigured", outcome: "passed" });
  } else {
    throw new Error(`R3_PHASE inválida: ${phase}`);
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
  if (phase === "superadmin" && configurationWasSaved && !configurationWasRestored) {
    try {
      await saveTaxSettings(page, "", "");
      configurationWasRestored = true;
      captureSql(scenario, "cleanup-after-error", "SELECT id,tax_rate,tax_mode,version FROM company_settings WHERE id='default';");
    } catch (cleanupError) {
      writeJson(artifactPath(scenario, "cleanup-error.json"), { error: compactError(cleanupError), browserEvents: session.events });
      process.exitCode = 1;
    }
  }
  await closeQaBrowser(session);
}
