import { GPU_ARGS } from "./gpu-args.mjs";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const playwrightPath = path.resolve(process.cwd(), ".qa-runtime", "node_modules", "playwright", "index.mjs");
const { chromium } = await import(pathToFileURL(playwrightPath).href);
const axePath = path.resolve(process.cwd(), ".qa-runtime", "node_modules", "@axe-core", "playwright", "dist", "index.mjs");
const { default: AxeBuilder } = await import(pathToFileURL(axePath).href);

const BASE_URL = process.env.QA_BASE_URL || "http://localhost:3003";
if (BASE_URL !== "http://localhost:3003") {
  throw new Error(`La QA M10-02 solo permite ${BASE_URL}`);
}

const phase = process.env.QA_PHASE || "before";
const qaSet = process.env.QA_SET || "all";
const settleMs = Number(process.env.QA_SETTLE_MS || 900);
const outputRoot = path.resolve(
  process.cwd(),
  "docs",
  "goal",
  "evidencia",
  "m10",
  "admin-pulido",
  phase,
);
const executablePath = process.env.QA_CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const productId = process.env.QA_PRODUCT_ID || "product-cp-ref-mcp-0103";

const routes = [
  ["inicio", "/admin/inicio"],
  ["cotizaciones", "/admin/cotizaciones"],
  ["ventas", "/admin/ventas"],
  ["pagos", "/admin/pagos"],
  ["notificaciones", "/admin/notificaciones"],
  ["clientes", "/admin/clientes"],
  ["precios", "/admin/precios"],
  ["auditoria", "/admin/auditoria"],
  ["usuarios", "/admin/usuarios"],
  ["compras", "/admin/compras"],
  ["inventario", "/admin/inventario"],
  ["catalogo", "/admin/catalogo"],
  ["promociones", "/admin/promociones"],
  ["detalle-producto", `/admin/catalogo/${productId}`],
  ["detalle-carbon", "/admin/catalogo/product-cp-amo-car-1027"],
  ["configuracion", "/admin/configuracion"],
  ["dashboard", "/admin/dashboard"],
  ["operaciones", "/admin/operaciones"],
  ["reportes", "/admin/reportes"],
];
const requestedRoutes = process.env.QA_ROUTES?.split(",").map((value) => value.trim()).filter(Boolean) ?? [];
const selectedRoutes = requestedRoutes.length ? routes.filter(([name]) => requestedRoutes.includes(name)) : routes;
const skipActionRoutes = new Set(process.env.QA_SKIP_ACTION_ROUTES?.split(",").map((value) => value.trim()).filter(Boolean) ?? []);
if (requestedRoutes.length && selectedRoutes.length !== requestedRoutes.length) {
  throw new Error(`Rutas QA desconocidas: ${requestedRoutes.filter((name) => !routes.some(([routeName]) => routeName === name)).join(", ")}`);
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeJson(name, value) {
  ensureDir(outputRoot);
  fs.writeFileSync(path.join(outputRoot, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function captureViewport(page, name, width, height) {
  await page.setViewportSize({ width, height });
  await page.waitForTimeout(350);
  const suffix = `${width}x${height}`;
  const screenshotPath = path.join(outputRoot, `${name}-${suffix}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: false });
  const bodyTextPath = path.join(outputRoot, `${name}-${suffix}.txt`);
  fs.writeFileSync(bodyTextPath, `${await page.locator("body").innerText()}\n`, "utf8");
  return { screenshotPath, bodyTextPath };
}

const safeActionPatterns = [
  /más filtros/i,
  /abrir detalle/i,
  /ver detalle/i,
  /ver pago/i,
  /ver venta/i,
  /ver pedido/i,
  /expandir/i,
  /contraer/i,
];

async function runSafeAction(page) {
  for (const pattern of safeActionPatterns) {
    const button = page.getByRole("button", { name: pattern }).first();
    if (await button.count()) {
      await button.click({ timeout: 4_000 });
      return { type: "button", label: pattern.source };
    }
  }

  const filterControl = page.locator('[aria-expanded="false"]:visible').first();
  if (await filterControl.count()) {
    await filterControl.click({ timeout: 4_000 });
    return { type: "toggle", label: "aria-expanded=false" };
  }

  const input = page.locator("input:visible, textarea:visible").first();
  if (await input.count()) {
    await input.focus();
    return { type: "focus", label: "first visible input" };
  }

  await page.keyboard.press("Tab");
  return { type: "keyboard", label: "Tab" };
}

async function runAxe(page, name, suffix) {
  const result = await new AxeBuilder({ page }).analyze();
  const fileName = `axe-${name}-${suffix}.json`;
  fs.writeFileSync(path.join(outputRoot, fileName), `${JSON.stringify(result, null, 2)}\n`, "utf8");
  return {
    fileName,
    violations: result.violations.length,
    incomplete: result.incomplete.length,
    passes: result.passes.length,
    violationIds: result.violations.map((violation) => violation.id),
  };
}

const browser = await chromium.launch({ headless: true, executablePath, args: GPU_ARGS });
const events = { consoleErrors: [], pageErrors: [], requestFailures: [] };

const results = [];
for (const [name, route] of selectedRoutes) {
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    locale: "es-PE",
    timezoneId: "America/Lima",
  });
  const page = await context.newPage();
  page.on("console", (message) => {
    if (message.type() === "error") events.consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => events.pageErrors.push(String(error)));
  page.on("requestfailed", (request) => {
    events.requestFailures.push(`${request.method()} ${request.url()} :: ${request.failure()?.errorText || "unknown"}`);
  });
  const startedAt = new Date().toISOString();
  const url = new URL(route, BASE_URL);
  if (url.host !== "localhost:3003") throw new Error(`Ruta fuera del host permitido: ${url.href}`);
  let status = null;
  let error = null;
  try {
    const response = await page.goto(url.href, { waitUntil: "domcontentloaded", timeout: 45_000 });
    status = response?.status() ?? null;
    await page.waitForSelector("body", { timeout: 15_000 });
    await page.waitForTimeout(settleMs);
    const action = skipActionRoutes.has(name)
      ? { type: "skipped", label: "QA_SKIP_ACTION_ROUTES" }
      : await runSafeAction(page);
    if (name === "pagos" && !url.searchParams.has("paymentId")) {
      const drawer = page.getByRole("dialog", { name: /Detalle y conciliación/i });
      if (await drawer.count() && await drawer.first().isVisible()) {
        throw new Error("El drawer de pagos se abrió sin paymentId en la URL.");
      }
    }
    const desktop = await captureViewport(page, name, 1920, 1080);
    const desktopAxe = await runAxe(page, name, "1920x1080");
    const mobile = await captureViewport(page, name, 390, 844);
    const mobileAxe = await runAxe(page, name, "390x844");
    results.push({ name, route, status, startedAt, action, desktop, mobile, axe: { desktop: desktopAxe, mobile: mobileAxe }, title: await page.title() });
  } catch (caught) {
    error = caught instanceof Error ? caught.message : String(caught);
    results.push({ name, route, status, startedAt, error });
  } finally {
    await context.close();
  }
}

writeJson(qaSet === "all" ? "manifest.json" : `manifest-${phase}-${qaSet}.json`, {
  phase,
  qaSet,
  baseUrl: BASE_URL,
  generatedAt: new Date().toISOString(),
  viewport: { desktop: "1920x1080", mobile: "390x844", deviceScaleFactor: 1 },
  routes: results,
  events,
});
await browser.close();
console.log(JSON.stringify({ phase, outputRoot, routes: results.length, errors: results.filter((result) => result.error).length, events }, null, 2));
