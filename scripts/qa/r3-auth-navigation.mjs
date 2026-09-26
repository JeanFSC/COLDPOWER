import {
  BASE_URL,
  capture,
  captureSql,
  closeQaBrowser,
  compactError,
  createQaBrowser,
  fillLabel,
  resultRecord,
  saveBody,
  visit,
  writeJson,
} from "./b-helpers.mjs";

const scenario = "r3-auth-navigation";
const fixtureId = process.env.CP_DEV_AUTH_USER_ID || null;

async function main() {
  const session = await createQaBrowser(scenario);
  const { page } = session;
  const evidence = { scenario, baseUrl: BASE_URL, fixtureId, storageState: Boolean(process.env.QA_STORAGE_STATE), stages: [] };
  let outcome = "COMPLETED";
  try {
    await visit(page, "/");
    await capture(scenario, "01-home-auth-state", page);
    const accountAction = page.locator(".home-header-actions .home-account-action").first();
    await accountAction.waitFor({ state: "visible", timeout: 15_000 });
    const accountText = await accountAction.innerText();
    const signedInHeader = /Mi cuenta[\s\S]*Ver cuenta/i.test(accountText) && !/Ingresar/i.test(accountText);
    evidence.stages.push({ stage: "home_auth_state", accountText, signedInHeader });
    await saveBody(scenario, "01-home-body", page);

    const documentRequests = [];
    const onRequest = (request) => { if (request.resourceType() === "document") documentRequests.push(request.url()); };
    page.on("request", onRequest);
    const accountLink = signedInHeader
      ? page.locator('.home-header-actions a[href="/cuenta"]').first()
      : page.locator('.home-mobile-actions a[href="/cuenta"]').first();
    if (signedInHeader) {
      await accountLink.click();
    } else {
      await accountLink.evaluate((element) => element.click());
    }
    await page.waitForURL(/\/cuenta(?:\/)?(?:\?|$)/, { timeout: 30_000 });
    await page.waitForTimeout(900);
    page.off("request", onRequest);
    await capture(scenario, "02-account-after-client-navigation", page);
    const accountBody = await page.locator("body").innerText();
    const accountNavigationWorked = page.url().startsWith(`${BASE_URL}/cuenta`) && /Mi cuenta|Hola/i.test(accountBody);
    evidence.stages.push({ stage: "account_navigation", url: page.url(), accountNavigationWorked, documentRequestsAfterClick: documentRequests });
    await saveBody(scenario, "02-account-body", page);

    await visit(page, "/cotizacion");
    await fillLabel(page, "Nombre o razón social", "QA R3B sesión persistente");
    await fillLabel(page, "Teléfono", "999777666");
    await fillLabel(page, "Correo opcional", "qa-r3b-session@example.test");
    const before = await page.locator("input, textarea").evaluateAll((elements) => Object.fromEntries(elements.filter((element) => element.value).map((element) => [element.id || element.getAttribute("name") || element.getAttribute("aria-label") || "field", element.value])));
    await capture(scenario, "03-quote-half-filled-before-hover", page);
    await page.locator(".home-header").hover();
    await page.waitForTimeout(500);
    const after = await page.locator("input, textarea").evaluateAll((elements) => Object.fromEntries(elements.filter((element) => element.value).map((element) => [element.id || element.getAttribute("name") || element.getAttribute("aria-label") || "field", element.value])));
    await capture(scenario, "04-quote-half-filled-after-hover", page);
    const formPreserved = Object.entries(before).every(([key, value]) => after[key] === value);
    evidence.stages.push({ stage: "quote_hover_preserves_form", before, after, formPreserved });
    await saveBody(scenario, "04-quote-body", page);

    captureSql(scenario, "auth-fixture", fixtureId
      ? `SELECT id,email,role,role_code,status FROM users WHERE id='${fixtureId}'; SELECT id,user_id,name,email FROM customers WHERE user_id='${fixtureId}';`
      : "SELECT current_database() AS database, current_user AS user;");

    if (!signedInHeader) {
      outcome = "BLOCKED_AUTH_SESSION";
      evidence.blocker = "El bypass CP_DEV_AUTH_* autoriza el servidor, pero este contexto headless no contiene una sesión Clerk; el header muestra Ingresar. Se conservaron las capturas y se validaron navegación/formulario por separado.";
    } else if (!accountNavigationWorked || !formPreserved) {
      throw new Error(`Falló la navegación o la preservación del formulario: ${JSON.stringify(evidence.stages)}`);
    }
    resultRecord(scenario, { outcome, ...evidence });
    console.log(JSON.stringify({ outcome, ...evidence }, null, 2));
    if (outcome !== "COMPLETED") process.exitCode = 1;
  } catch (error) {
    await capture(scenario, "error", page).catch(() => undefined);
    writeJson(`${process.cwd()}/docs/goal/evidencia/17r3/${scenario}/error.json`, { error: compactError(error), evidence });
    resultRecord(scenario, { outcome: "BLOCKED", error: compactError(error), ...evidence });
    console.log(JSON.stringify({ outcome: "BLOCKED", error: compactError(error), ...evidence }, null, 2));
    process.exitCode = 1;
  } finally {
    await closeQaBrowser(session);
  }
}

await main();
