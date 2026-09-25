import { GPU_ARGS } from "./gpu-args.mjs";
import { execFileSync } from "node:child_process";
import { mkdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const baseUrl = process.env.QA_BASE_URL || "http://localhost:3006";
const base = new URL(baseUrl);
if (base.protocol !== "http:" || base.host !== "localhost:3006") {
  throw new Error(`QA_BASE_URL inválida: ${baseUrl}. Este recorrido exige http://localhost:3006.`);
}

const phase = process.env.QA_PHASE || "after";
const artifactRoot = path.resolve(process.cwd(), process.env.QA_ARTIFACT_ROOT || "docs/goal/evidencia/m10/tienda-pulido");
mkdirSync(artifactRoot, { recursive: true });

const globalRoot = execFileSync(process.platform === "win32" ? "npm.cmd" : "npm", ["root", "-g"], {
  encoding: "utf8",
  shell: process.platform === "win32",
}).trim();
const playwrightCandidates = [
  path.join(globalRoot, "openclaw", "node_modules", "playwright-core", "index.mjs"),
  path.join(globalRoot, "playwright", "index.mjs"),
];
const playwrightPath = playwrightCandidates.find((candidate) => {
  try {
    return Boolean(statSync(candidate));
  } catch {
    return false;
  }
});
if (!playwrightPath) throw new Error("No se encontró playwright-core en los módulos globales disponibles.");

const { chromium } = await import(pathToFileURL(playwrightPath).href);
const executablePath = process.env.QA_CHROMIUM_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const browser = await chromium.launch({ headless: true, executablePath, args: GPU_ARGS });
const events = [];
const axeResults = [];
const routeResults = [];
const networkResults = [];
const journeyResults = [];

function observe(page, label) {
  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type())) events.push({ label, type: `console:${message.type()}`, text: message.text() });
  });
  page.on("pageerror", (error) => events.push({ label, type: "pageerror", text: error.message }));
  page.on("requestfailed", (request) => events.push({ label, type: "requestfailed", text: `${request.method()} ${request.url()} :: ${request.failure()?.errorText || "unknown"}` }));
  page.on("response", (response) => {
    const url = new URL(response.url());
    if (url.origin !== base.origin || (!url.pathname.startsWith("/api/cotizacion") && url.pathname !== "/api/carrito")) return;
    networkResults.push({ label, method: response.request().method(), route: url.pathname, status: response.status() });
  });
}

async function settle(page) {
  await page.waitForLoadState("networkidle", { timeout: 2500 }).catch(() => {});
  await page.waitForTimeout(300);
}

async function visit(page, route, name, screenshot = true) {
  const url = new URL(route, base);
  let response = null;
  let navigationError = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      response = await page.goto(url.href, { waitUntil: "domcontentloaded", timeout: 90_000 });
      navigationError = null;
      break;
    } catch (error) {
      navigationError = error;
      const message = String(error?.message || error);
      const retriable = message.includes("ERR_ABORTED") || error?.name === "TimeoutError";
      if (!retriable || attempt === 2) throw error;
      await page.waitForTimeout(1_500);
    }
  }
  if (navigationError) throw navigationError;
  await settle(page);
  const result = { name, route: url.pathname + url.search, status: response?.status() ?? null, title: await page.title() };
  if (screenshot) {
    const viewport = await page.evaluate(() => ({ width: window.innerWidth, height: window.innerHeight }));
    const fileName = `${phase}-${name}-${viewport.width}x${viewport.height}.png`;
    const filePath = path.join(artifactRoot, fileName);
    await page.screenshot({ path: filePath, fullPage: false });
    result.screenshot = filePath;
  }
  routeResults.push(result);
  return result;
}

let axeSourcePromise;
async function getAxeSource() {
  if (!axeSourcePromise) {
    axeSourcePromise = fetch("https://cdn.jsdelivr.net/npm/axe-core@4.10.2/axe.min.js", {
      signal: AbortSignal.timeout(15_000),
    }).then((response) => {
      if (!response.ok) throw new Error(`axe download failed: ${response.status}`);
      return response.text();
    });
  }
  return axeSourcePromise;
}

async function runAxe(page, name) {
  try {
    const source = await getAxeSource();
    await page.addScriptTag({ content: source });
    const result = await page.evaluate(async () => window.axe.run(document, { resultTypes: ["violations"] }));
    axeResults.push({ name, violations: result.violations.map((item) => ({ id: item.id, impact: item.impact, nodes: item.nodes.length })) });
  } catch (error) {
    axeResults.push({ name, error: error instanceof Error ? error.message : String(error) });
  }
}

async function createContext(options, label) {
  const context = await browser.newContext({ ...options, deviceScaleFactor: 1, locale: "es-PE" });
  const page = await context.newPage();
  observe(page, label);
  return { context, page };
}

async function snapshot(page, name) {
  const viewport = await page.evaluate(() => ({ width: window.innerWidth, height: window.innerHeight }));
  const fileName = `${phase}-${name}-${viewport.width}x${viewport.height}.png`;
  const filePath = path.join(artifactRoot, fileName);
  await page.screenshot({ path: filePath, fullPage: false });
  return filePath;
}

async function waitForResponseOrNull(page, predicate) {
  try {
    return await page.waitForResponse(predicate, { timeout: 60_000 });
  } catch {
    return null;
  }
}

async function runUiJourney(productHref) {
  const journey = await createContext({ viewport: { width: 1920, height: 1080 } }, "journey");
  const page = journey.page;
  await visit(page, "/buscar", "journey-search-page", false);
  const searchInput = page.locator("#search-page-query");
  await searchInput.fill("capacitor");
  await searchInput.press("Enter");
  await page.waitForURL((url) => url.pathname === "/buscar" && url.searchParams.get("q") === "capacitor", { timeout: 15_000 }).catch(() => {});
  await settle(page);
  const resultLink = page.locator('a[href^="/producto/"]').first();
  const resultCount = await page.locator('a[href^="/producto/"]').count();
  if (!resultCount) throw new Error("La búsqueda interactiva de capacitor no devolvió una ficha pública.");
  journeyResults.push({ step: "buscar-capacitor", route: new URL(page.url()).pathname + new URL(page.url()).search, resultCount, screenshot: await snapshot(page, "journey-search") });

  await resultLink.click();
  await page.waitForURL((url) => url.pathname.startsWith("/producto/"), { timeout: 15_000 });
  await settle(page);
  journeyResults.push({ step: "abrir-ficha", route: new URL(page.url()).pathname, matchesResolvedProduct: decodeURIComponent(new URL(page.url()).pathname) === decodeURIComponent(productHref), screenshot: await snapshot(page, "journey-product") });

  const quoteButton = page.getByRole("button", { name: /Solicitar cotización|Cotizar/ }).first();
  const cartResponse = waitForResponseOrNull(page, (response) => response.request().method() === "POST" && new URL(response.url()).pathname === "/api/cotizacion/cart");
  await quoteButton.click();
  await cartResponse;
  await page.waitForTimeout(500);
  journeyResults.push({ step: "agregar-a-cotizacion", buttonFeedback: await page.getByRole("button", { name: "En cotización" }).count(), screenshot: await snapshot(page, "journey-quote-added") });

  const quoteLink = page.locator('a[href="/cotizacion"]').first();
  await Promise.all([
    page.waitForURL((url) => url.pathname === "/cotizacion", { timeout: 15_000 }),
    quoteLink.click(),
  ]);
  await settle(page);
  journeyResults.push({ step: "abrir-cotizacion", route: new URL(page.url()).pathname, screenshot: await snapshot(page, "journey-cotizar") });

  await page.locator("#quote-name").fill("Jean QA M10-03");
  await page.locator("#quote-phone").fill("999999999");
  const quoteResponse = waitForResponseOrNull(page, (response) => response.request().method() === "POST" && new URL(response.url()).pathname === "/api/cotizacion");
  await page.locator("#quote-name").locator("xpath=ancestor::form").locator('button[type="submit"]').click();
  await quoteResponse;
  await page.getByText("Solicitud registrada", { exact: true }).waitFor({ state: "visible", timeout: 60_000 });
  const quoteId = (await page.locator('section[aria-live="polite"] h2').first().textContent())?.trim() ?? null;
  journeyResults.push({ step: "enviar-cotizacion-minima", route: new URL(page.url()).pathname, quoteId, screenshot: await snapshot(page, "journey-confirmation") });
  await runAxe(page, "journey-confirmation");
  await journey.context.close();
}

async function productPathFromSearch(page) {
  await visit(page, "/buscar?q=capacitor", "buscar-capacitor");
  const hrefs = await page.locator('a[href^="/producto/"]').evaluateAll((links) => links.map((link) => link.getAttribute("href")).filter(Boolean));
  const href = hrefs[0];
  if (!href) throw new Error("La búsqueda de capacitor no devolvió una ficha de producto pública.");
  return href;
}

const desktop = await createContext({ viewport: { width: 1920, height: 1080 } }, "desktop");
const mobile = await createContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }, "mobile");
const productHref = await productPathFromSearch(desktop.page);
const productName = `producto-${productHref.split("/").filter(Boolean).at(-1)}`;

const publicRoutes = [
  ["catalogo", "/catalogo"],
  ["carrito", "/carrito"],
  ["cotizacion", "/cotizacion"],
  ["contacto", "/contacto"],
  ["faq", "/faq"],
  ["nosotros", "/nosotros"],
  ["libro-reclamaciones", "/libro-de-reclamaciones"],
  ["not-found", "/m10-03-ruta-inexistente"],
];

if (process.env.QA_SKIP_ROUTES !== "1") {
  for (const [name, route] of publicRoutes) {
    await visit(desktop.page, route, name);
    await runAxe(desktop.page, name);
    await visit(mobile.page, route, name);
    await runAxe(mobile.page, name);
  }
}

if (process.env.QA_SKIP_ROUTES !== "1") {
  await visit(desktop.page, productHref, productName);
  await runAxe(desktop.page, productName);
  await visit(mobile.page, productHref, productName);
  await runAxe(mobile.page, productName);
}

if (phase === "after") {
  const productCheck = await createContext({ viewport: { width: 1920, height: 1080 } }, "product-check");
  await visit(productCheck.page, productHref, `${productName}-check`);
  const checks = await productCheck.page.evaluate(() => {
    const transaction = document.querySelector('[aria-label="Producto solo cotizable"], [aria-label="Comprar o cotizar"]');
    const mobileBar = document.querySelector('[aria-label="Acciones rápidas del producto"]');
    const text = document.body.innerText;
    const transactionBox = transaction?.getBoundingClientRect();
    const mobileBarBox = mobileBar?.getBoundingClientRect();
    return {
      hasSourceStatusChip: text.includes("Estado fuente:"),
      hasFallbackFamilyDescription: text.includes("Referencia de catálogo de la familia"),
      sourceStatusCount: (text.match(/Estado fuente:/g) || []).length,
      quoteStateCount: (text.match(/Bajo consulta/gi) || []).length,
      transactionAboveFold: Boolean(transactionBox && transactionBox.top >= 0 && transactionBox.bottom <= window.innerHeight),
      transactionBox: transactionBox ? { top: transactionBox.top, bottom: transactionBox.bottom } : null,
      mobileBar: mobileBarBox ? { top: mobileBarBox.top, bottom: mobileBarBox.bottom } : null,
    };
  });
  routeResults.push({ name: "product-behavior-check", checks });
  await productCheck.context.close();
  if (process.env.QA_SKIP_JOURNEY !== "1") await runUiJourney(productHref);
}

await desktop.context.close();
await mobile.context.close();
await browser.close();

const report = { phase, baseUrl, productHref, routeResults, journeyResults, axeResults, events, networkResults, generatedAt: new Date().toISOString() };
writeFileSync(path.join(artifactRoot, `${phase}-browser-events.json`), JSON.stringify({ events, routeResults, journeyResults, axeResults, networkResults }, null, 2));
writeFileSync(path.join(artifactRoot, `${phase}-route-report.json`), JSON.stringify(report, null, 2));

console.log(JSON.stringify(report, null, 2));
