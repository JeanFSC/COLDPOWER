import {
  artifactPath,
  capture,
  captureSql,
  clickButton,
  fillLabel,
  runScenario,
  visit,
  writeText,
} from "./b-helpers.mjs";

const phase = process.env.R3_SESSION_PHASE || "warehouse";
const scenario = `r3-6-${phase}`;
const quoteName = `QA R3.6 ${Date.now()}`;
const quotePhone = `999${String(Date.now()).slice(-6)}`;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

await runScenario(scenario, async ({ page, events }) => {
  if (phase === "warehouse" || phase === "sales") {
    const ordersSql = captureSql(
      scenario,
      "orders-before",
      "SELECT count(*) AS orders_total FROM orders; SELECT id,code,total,currency,status FROM orders ORDER BY created_at DESC LIMIT 5;",
    );
    assert(!/^0\s*$/m.test(ordersSql), "La base local no tiene pedidos para validar el control de montos.");
    await visit(page, "/admin/pedidos");
    const tableHeader = await page.locator("table thead").innerText();
    const body = await page.locator("body").innerText();
    await capture(scenario, "orders", page);
    await writeText(artifactPath(scenario, "orders-body.txt"), body);

    if (phase === "warehouse") {
      assert(!/\bTotal\b/.test(tableHeader), "ALMACEN no debe recibir la columna Total.");
      assert(!/(?:S\/|US\$|PEN|USD)\s?[\d,.]+/.test(body), "ALMACEN no debe ver montos en pedidos.");
    } else {
      assert(/\bTotal\b/i.test(tableHeader), "VENTAS debe recibir la columna Total.");
      assert(/(?:S\/|US\$|PEN|USD)\s?[\d,.]+/.test(body), "VENTAS debe ver al menos un monto de pedido.");
    }

    captureSql(
      scenario,
      "orders-after",
      "SELECT id,code,total,currency,status FROM orders ORDER BY created_at DESC LIMIT 5;",
    );
    return {
      outcome: "COMPLETED",
      phase,
      behavior: phase === "warehouse" ? "orders_without_amounts" : "orders_with_amounts",
      tableHeader,
      browserEvents: events,
    };
  }

  if (phase === "quote") {
    captureSql(scenario, "quote-before", "SELECT count(*) AS quotes_before FROM quotes;");
    await visit(page, "/cotizacion");
    await page.locator("#quote-product-search").fill("CP-REF-MCP-0103");
    const productSuggestion = page.locator("#quote-product-suggestions button").first();
    await productSuggestion.waitFor({ state: "visible", timeout: 20_000 });
    const selectedProductText = await productSuggestion.innerText();
    await productSuggestion.click();
    await fillLabel(page, "Nombre o razon social", quoteName);
    await fillLabel(page, "Telefono", quotePhone);
    await capture(scenario, "quote-minimal-filled", page);
    const quoteResponse = page.waitForResponse(
      (response) => response.url().endsWith("/api/cotizacion") && response.status() === 201,
      { timeout: 30_000 },
    );
    await clickButton(page, "Solicitar cotización");
    await quoteResponse;
    await page.getByText("Solicitud registrada", { exact: false }).first().waitFor({ state: "visible", timeout: 30_000 });
    const body = await page.locator("body").innerText();
    await capture(scenario, "quote-minimal-success", page);
    await writeText(artifactPath(scenario, "quote-success-body.txt"), body);
    assert(body.includes(quoteName) && body.includes(quotePhone), "La cotización mínima no mostró sus datos en la confirmación.");
    const quoteSql = captureSql(
      scenario,
      "quote-after",
      `SELECT id,tracking_code,name,phone,email,workflow_status,status,origin FROM quotes WHERE name='${quoteName}' AND phone='${quotePhone}' ORDER BY created_at DESC LIMIT 1;`,
    );
    assert(quoteSql.includes(quoteName), "La cotización mínima no quedó persistida en PostgreSQL local.");
    return { outcome: "COMPLETED", phase, behavior: "minimal_quote_submitted", quoteName, quotePhone, selectedProductText, browserEvents: events };
  }

  if (phase === "whatsapp") {
    const settingsSql = captureSql(
      scenario,
      "whatsapp-before",
      "SELECT id,whatsapp,phone,CASE WHEN NULLIF(TRIM(COALESCE(whatsapp,'')),'') IS NULL THEN false ELSE true END AS whatsapp_configured FROM company_settings;",
    );
    assert(/\t\t/.test(settingsSql) || /\tnull\t/.test(settingsSql), "La fixture de QA ya tiene WhatsApp configurado; no se puede afirmar oculto sin modificar datos comerciales.");
    await visit(page, "/");
    await page.waitForTimeout(1200);
    const visibleWhatsApp = await page.locator("body").evaluate((root) =>
      [...root.querySelectorAll("*")]
        .filter((element) => {
          const style = window.getComputedStyle(element);
          return element.children.length === 0 && style.display !== "none" && style.visibility !== "hidden" && element.textContent?.toLowerCase().includes("whatsapp");
        })
        .map((element) => element.textContent?.trim())
        .filter(Boolean),
    );
    const whatsappLinks = await page.locator('a[href*="wa.me"]').count();
    await capture(scenario, "whatsapp-hidden", page);
    await writeText(artifactPath(scenario, "whatsapp-body.txt"), await page.locator("body").innerText());
    assert(visibleWhatsApp.length === 0 && whatsappLinks === 0, `WhatsApp quedó visible sin número: ${JSON.stringify({ visibleWhatsApp, whatsappLinks })}`);
    captureSql(scenario, "whatsapp-after", "SELECT id,whatsapp,phone FROM company_settings;");
    return { outcome: "COMPLETED", phase, behavior: "whatsapp_hidden_without_number", visibleWhatsApp, whatsappLinks, browserEvents: events };
  }

  throw new Error(`Fase R3.6 desconocida: ${phase}`);
});
