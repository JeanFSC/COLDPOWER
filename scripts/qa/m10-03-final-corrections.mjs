import { GPU_ARGS } from "./gpu-args.mjs";
import { execFileSync } from "node:child_process";
import { mkdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const baseUrl = process.env.QA_BASE_URL || "http://localhost:3006";
const base = new URL(baseUrl);
if (base.protocol !== "http:" || base.host !== "localhost:3006") {
  throw new Error(`QA_BASE_URL inválida: ${baseUrl}. Esta validación exige http://localhost:3006.`);
}

const artifactRoot = path.resolve(process.cwd(), "docs/goal/evidencia/m10/tienda-pulido/final-corrections");
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
const cases = [
  {
    key: "capacitor-quote-only",
    href: "/producto/capacitor-25-%C2%B5f-450-v-coldpower",
    expected: "quote-only",
  },
  {
    key: "carbon-priced",
    href: "/producto/carbon-amoladora-bosch",
    expected: "priced",
  },
];
const viewports = [
  { name: "desktop", width: 1920, height: 1080 },
  { name: "mobile", width: 390, height: 844 },
];
const results = [];
const consoleIssues = [];

for (const product of cases) {
  for (const viewport of viewports) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: 1,
      locale: "es-PE",
      isMobile: viewport.width < 600,
      hasTouch: viewport.width < 600,
    });
    const page = await context.newPage();
    const label = `${product.key}-${viewport.name}`;
    page.on("console", (message) => {
      if (["error", "warning"].includes(message.type())) consoleIssues.push({ label, type: `console:${message.type()}`, text: message.text() });
    });
    page.on("pageerror", (error) => consoleIssues.push({ label, type: "pageerror", text: error.message }));
    const response = await page.goto(new URL(product.href, base).href, { waitUntil: "domcontentloaded", timeout: 90_000 });
    await page.waitForLoadState("networkidle", { timeout: 3_000 }).catch(() => {});
    await page.waitForTimeout(250);
    const check = await page.evaluate((expected) => {
      const bodyText = document.body.innerText;
      const buttons = [...document.querySelectorAll("button")].map((button) => ({ text: button.textContent?.trim() ?? "", disabled: button.disabled }));
      const hasPrice = /S\/\s*[\d,.]+/.test(bodyText) && bodyText.includes("Precio publicado en el catálogo.");
      const hasQuoteState = bodyText.includes("Precio por cotización") && bodyText.includes("Precio y disponibilidad se confirman al cotizar.");
      const transaction = document.querySelector('[aria-label="Producto solo cotizable"], [aria-label="Comprar o cotizar"]');
      const transactionBox = transaction?.getBoundingClientRect();
      return {
        expected,
        viewport: { width: window.innerWidth, height: window.innerHeight },
        responseStatus: null,
        title: document.title,
        fillerCount: (bodyText.match(/Referencia de catálogo de la familia/gi) || []).length,
        soloCotizableButtons: buttons.filter((button) => button.text.includes("Solo cotizable")).length,
        hasInformationalQuoteNote: bodyText.includes("Disponible únicamente por cotización."),
        hasQuoteState,
        hasPrice,
        hasAddToCart: buttons.some((button) => button.text.includes("Agregar al carrito")),
        hasQuoteCta: buttons.some((button) => button.text.includes("Cotizar")),
        disabledButtons: buttons.filter((button) => button.disabled).map((button) => button.text),
        metaDescription: document.querySelector('meta[name="description"]')?.getAttribute("content") ?? null,
        documentScrollWidth: document.documentElement.scrollWidth,
        transactionAboveFold: Boolean(transactionBox && transactionBox.top >= 0 && transactionBox.bottom <= window.innerHeight),
      };
    }, product.expected);
    check.responseStatus = response?.status() ?? null;
    const filePath = path.join(artifactRoot, `${product.key}-${viewport.width}x${viewport.height}.png`);
    await page.screenshot({ path: filePath, fullPage: false });
    results.push({ label, route: product.href, screenshot: filePath, check });
    await context.close();
  }
}

await browser.close();
const report = { baseUrl, results, consoleIssues, generatedAt: new Date().toISOString() };
writeFileSync(path.join(artifactRoot, "report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));

const failures = results.flatMap(({ label, check }) => {
  const expectedQuote = check.expected === "quote-only";
  const expectedPrice = check.expected === "priced";
  const errors = [];
  if (check.responseStatus !== 200) errors.push(`HTTP ${check.responseStatus}`);
  if (check.fillerCount !== 0) errors.push("generated family description visible");
  if (check.soloCotizableButtons !== 0) errors.push("Solo cotizable button visible");
  if (check.documentScrollWidth > check.viewport.width) errors.push("horizontal overflow");
  if (expectedQuote && (!check.hasQuoteState || !check.hasInformationalQuoteNote || check.hasAddToCart)) errors.push("quote-only state mismatch");
  if (expectedPrice && (!check.hasPrice || !check.hasAddToCart || !check.hasQuoteCta)) errors.push("priced state mismatch");
  return errors.map((error) => `${label}: ${error}`);
});
if (failures.length) throw new Error(`Final correction QA failed:\n${failures.join("\n")}`);
