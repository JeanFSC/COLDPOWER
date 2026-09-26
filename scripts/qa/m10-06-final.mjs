import { GPU_ARGS } from "./gpu-args.mjs";
import { execFileSync } from "node:child_process";
import { mkdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const baseUrl = process.env.QA_BASE_URL || "http://localhost:3006";
const base = new URL(baseUrl);
if (base.protocol !== "http:" || base.host !== "localhost:3006") {
  throw new Error(`QA_BASE_URL must be http://localhost:3006, received ${baseUrl}`);
}

const artifactRoot = path.resolve(process.cwd(), "docs/goal/evidencia/m10/final");
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
if (!playwrightPath) throw new Error("playwright-core was not found in the global runtime.");

const { chromium } = await import(pathToFileURL(playwrightPath).href);
const executablePath = process.env.QA_CHROMIUM_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const browser = await chromium.launch({ headless: true, executablePath, args: GPU_ARGS });

const viewports = [
  { key: "desktop", width: 1920, height: 1080 },
  { key: "mobile", width: 390, height: 844 },
];

const events = [];
const routeResults = [];
const axeResults = [];
let axeSourcePromise;

function observe(page, label) {
  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type())) {
      events.push({ label, type: `console:${message.type()}`, text: message.text() });
    }
  });
  page.on("pageerror", (error) => events.push({ label, type: "pageerror", text: error.message }));
  page.on("requestfailed", (request) => {
    events.push({
      label,
      type: "requestfailed",
      text: `${request.method()} ${request.url()} :: ${request.failure()?.errorText || "unknown"}`,
    });
  });
}

async function settle(page) {
  await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => {});
  await page.waitForTimeout(500);
}

async function getAxeSource() {
  if (!axeSourcePromise) {
    axeSourcePromise = fetch("https://cdn.jsdelivr.net/npm/axe-core@4.10.2/axe.min.js", {
      signal: AbortSignal.timeout(20_000),
    }).then((response) => {
      if (!response.ok) throw new Error(`axe download failed: ${response.status}`);
      return response.text();
    });
  }
  return axeSourcePromise;
}

async function runAxe(page, label) {
  try {
    const source = await getAxeSource();
    await page.addScriptTag({ content: source });
    const result = await page.evaluate(async () => window.axe.run(document, { resultTypes: ["violations"] }));
    const normalized = {
      label,
      violations: result.violations.map((item) => ({
        id: item.id,
        impact: item.impact,
        nodes: item.nodes.length,
      })),
      incomplete: result.incomplete.length,
      passes: result.passes.length,
    };
    axeResults.push(normalized);
    return normalized;
  } catch (error) {
    const result = { label, error: error instanceof Error ? error.message : String(error) };
    axeResults.push(result);
    return result;
  }
}

async function navigate(page, route) {
  const url = new URL(route, base);
  let response = null;
  let lastError = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      response = await page.goto(url.href, { waitUntil: "domcontentloaded", timeout: 90_000 });
      lastError = null;
      break;
    } catch (error) {
      lastError = error;
      if (attempt === 2) throw error;
      await page.waitForTimeout(1_000);
    }
  }
  if (lastError) throw lastError;
  await page.waitForSelector("body", { timeout: 15_000 });
  await settle(page);
  return response?.status() ?? null;
}

async function screenshot(page, name, viewport) {
  const filePath = path.join(artifactRoot, `after-${name}-${viewport.width}x${viewport.height}.png`);
  await page.screenshot({ path: filePath, fullPage: false });
  writeFileSync(
    path.join(artifactRoot, `after-${name}-${viewport.width}x${viewport.height}.txt`),
    `${await page.locator("body").innerText()}\n`,
    "utf8",
  );
  return filePath;
}

async function firstVisible(page, selectors) {
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    if (await locator.count() && await locator.isVisible().catch(() => false)) return locator;
  }
  return null;
}

async function runInteraction(page, name) {
  if (name === "pagos") {
    const button = await firstVisible(page, ['button:has-text("Ver pago")', 'button:has-text("Abrir")']);
    if (button) {
      await button.click({ timeout: 5_000 });
      await page.waitForTimeout(350);
      return { type: "open-payment-detail", success: await page.getByRole("dialog").count() > 0 };
    }
  }
  if (name === "ventas") {
    const button = await firstVisible(page, ['button:has-text("Ver venta")', 'button:has-text("Abrir")']);
    if (button) {
      await button.click({ timeout: 5_000 });
      await page.waitForTimeout(350);
      return { type: "open-sale-detail", success: await page.getByRole("dialog").count() > 0 };
    }
  }
  if (name === "notificaciones") {
    const detail = page.getByText(/Detalle de notificación/i).first();
    return { type: "default-notification-selection", success: await detail.count() > 0 };
  }
  if (name === "producto-detalle") {
    const tab = page.getByRole("button", { name: "Precios", exact: true }).first();
    if (await tab.count() && await tab.isVisible().catch(() => false)) {
      await tab.click({ timeout: 5_000 });
      await page.waitForTimeout(350);
      const ficha = page.getByRole("button", { name: "Ficha", exact: true }).first();
      if (await ficha.count() && await ficha.isVisible().catch(() => false)) {
        await ficha.click({ timeout: 5_000 });
        await page.waitForTimeout(350);
      }
      return { type: "open-pricing-tab-and-return", success: true };
    }
  }
  if (name === "auditoria") {
    const button = await firstVisible(page, ['button:has-text("Ver detalle")', 'button:has-text("Detalle")']);
    if (button) {
      await button.click({ timeout: 5_000 });
      await page.waitForTimeout(350);
      return { type: "open-audit-detail", success: true };
    }
  }
  await page.keyboard.press("Tab");
  return { type: "keyboard-tab", success: true };
}

async function collectChecks(page, name, route, status, interaction) {
  return page.evaluate(({ name, route, status, interaction }) => {
    const text = document.body.innerText;
    const visualViewport = window.visualViewport;
    const viewport = {
      width: Math.round(visualViewport?.width ?? document.documentElement.clientWidth),
      height: Math.round(visualViewport?.height ?? document.documentElement.clientHeight),
    };
    const documentViewport = { width: document.documentElement.clientWidth, height: document.documentElement.clientHeight };
    const scrollWidth = document.body.scrollWidth;
    const visibleInputs = [...document.querySelectorAll("input")].filter((input) => {
      const box = input.getBoundingClientRect();
      return box.width > 0 && box.height > 0;
    });
    const dateInputs = visibleInputs.filter((input) => input.type === "date");
    const paymentCodes = [...text.matchAll(/PAGO-[A-Z0-9-]+/g)].map((match) => match[0]);
    const englishAuditLabels = ["Approved", "Rejected", "Inventory Reservation", "Inventory Movement"].filter((value) => text.includes(value));
    const paymentRefs = [...document.querySelectorAll("[title]")]
      .map((node) => node.getAttribute("title"))
      .filter((value) => value && value.length > 34);
    const pricingTimestampHeaders = [...document.querySelectorAll("th")].map((node) => node.textContent?.trim() || "");
    const priceNodes = [...document.querySelectorAll("[class*='bg-[#eaf2ff]'] p")].map((node) => ({
      text: node.textContent?.trim() || "",
      whiteSpace: getComputedStyle(node).whiteSpace,
      overflowWrap: getComputedStyle(node).overflowWrap,
    }));
    const productGrid = document.querySelector("[class*='lg:grid-cols-[minmax(0,1fr)_150px]']");
    return {
      name,
      route,
      status,
      viewport,
      interaction,
      title: document.title,
      bodyTextLength: text.length,
      horizontalOverflow: scrollWidth > documentViewport.width,
      documentViewport,
      documentScrollWidth: scrollWidth,
      paymentCodeSample: paymentCodes.slice(0, 10),
      hasPendingPaymentCode: text.includes("PAGO-PENDING"),
      englishAuditLabels,
      hasUnregisteredChannel: text.includes("N/D"),
      hasNotificationDetail: /Detalle de notificación/i.test(text),
      hasDateHelp: text.includes("DD/MM/AAAA"),
      dateInputCount: dateInputs.length,
      dateInputsHaveHelp: dateInputs.every((input) => input.title?.includes("DD/MM/AAAA") || input.getAttribute("aria-label")?.includes("DD/MM/AAAA")),
      hasStandaloneMissingValidity: text.includes("Sin fecha de vigencia registrada"),
      hasConcatenatedMissingValidity: text.includes("Vigente desde Sin fecha"),
      longTitles: paymentRefs.length,
      pricingTimestampHeaders,
      priceNodes,
      productGridColumns: productGrid ? getComputedStyle(productGrid).gridTemplateColumns : null,
      hasPaymentMethodWords: ["Transferencia", "Tarjeta", "Pasarela de prueba", "Por configurar", "Otro"].filter((value) => text.includes(value)),
      hasSalesMethodSummary: /método de pago|medio de pago/i.test(text),
      hasSalesChannelSummary: /canal|Tienda online|Venta directa|WhatsApp/i.test(text),
      hasFooterHelp: text.includes("¿Necesitas ayuda?"),
    };
  }, { name, route, status, interaction });
}

const productRoute = process.env.QA_PRODUCT_ROUTE || "/admin/catalogo/product-cp-ref-ven-0844";
const routes = [
  ["home", "/"],
  ["dashboard", "/admin/dashboard"],
  ["pagos", "/admin/pagos"],
  ["ventas", "/admin/ventas"],
  ["precios", "/admin/precios"],
  ["auditoria", "/admin/auditoria"],
  ["notificaciones", "/admin/notificaciones"],
  ["reportes", "/admin/reportes"],
  ["producto-detalle", productRoute],
  ["cuenta-pagos", "/cuenta/pagos"],
];

for (const [name, route] of routes) {
  for (const viewport of viewports) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: 1,
      locale: "es-PE",
      timezoneId: "America/Lima",
      isMobile: viewport.key === "mobile",
      hasTouch: viewport.key === "mobile",
    });
    const page = await context.newPage();
    const label = `${name}-${viewport.key}`;
    observe(page, label);
    let status = null;
    let error = null;
    let checks = null;
    let axe = null;
    let screenshotPath = null;
    try {
      status = await navigate(page, route);
      const interaction = await runInteraction(page, name);
      checks = await collectChecks(page, name, route, status, interaction);
      screenshotPath = await screenshot(page, name, viewport);
      axe = await runAxe(page, label);
      routeResults.push({ name, route, viewport, status, screenshot: screenshotPath, checks, axe });
    } catch (caught) {
      error = caught instanceof Error ? caught.message : String(caught);
      routeResults.push({ name, route, viewport, status, error });
    } finally {
      await context.close();
    }
  }
}

await browser.close();

const report = {
  generatedAt: new Date().toISOString(),
  baseUrl: base.href,
  gpuArgs: GPU_ARGS,
  browser: { executablePath, headless: true },
  productRoute,
  viewports,
  routeResults,
  axeResults,
  events,
};
writeFileSync(path.join(artifactRoot, "m10-06-final-qa.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
writeFileSync(path.join(artifactRoot, "m10-06-final-console.json"), `${JSON.stringify(events, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));

const failures = [];
for (const result of routeResults) {
  if (result.error) failures.push(`${result.name}/${result.viewport.key}: ${result.error}`);
  if (result.status !== 200) failures.push(`${result.name}/${result.viewport.key}: HTTP ${result.status}`);
  if (result.checks?.horizontalOverflow) failures.push(`${result.name}/${result.viewport.key}: horizontal overflow`);
  if (result.checks?.hasPendingPaymentCode) failures.push(`${result.name}/${result.viewport.key}: PAGO-PENDING remains visible`);
  if ((result.checks?.englishAuditLabels || []).length) failures.push(`${result.name}/${result.viewport.key}: English audit labels remain`);
  if (result.name === "notificaciones" && !result.checks?.hasNotificationDetail) failures.push(`${result.name}/${result.viewport.key}: notification detail was not selected`);
  if (["pagos", "ventas", "auditoria", "notificaciones", "reportes"].includes(result.name) && result.checks?.dateInputCount && !result.checks?.dateInputsHaveHelp) failures.push(`${result.name}/${result.viewport.key}: date input lacks DD/MM/AAAA help`);
  if (result.name === "producto-detalle" && result.checks?.hasConcatenatedMissingValidity) failures.push(`${result.name}/${result.viewport.key}: missing validity date is concatenated with Vigente desde`);
  if ((result.axe?.violations || []).length) failures.push(`${result.name}/${result.viewport.key}: axe violations ${result.axe.violations.map((item) => item.id).join(", ")}`);
  if (result.axe?.error) failures.push(`${result.name}/${result.viewport.key}: axe error ${result.axe.error}`);
}
const hardEvents = events.filter((event) => event.type === "console:error" || event.type === "pageerror" || event.type === "requestfailed");
if (hardEvents.length) failures.push(`browser events: ${hardEvents.length} errors/failures`);
if (failures.length) throw new Error(`M10-06 final QA failed:\n${failures.join("\n")}`);
