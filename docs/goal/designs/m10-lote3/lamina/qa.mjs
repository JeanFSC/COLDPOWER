import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright";

const laminaDir = fileURLToPath(new URL(".", import.meta.url));
const outputDir = resolve(laminaDir, "..");
const reference = resolve(laminaDir, "..", "..", "home-espejo", "referencia.png");
const imageData = async (path) => `data:image/png;base64,${(await readFile(path)).toString("base64")}`;
const errors = [];

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  page.on("console", (message) => { if (message.type() === "error") errors.push(`console: ${message.text()}`); });
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  await page.goto(`${pathToFileURL(resolve(laminaDir, "index.html")).href}?screen=pedidos`, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.locator('[data-filter="pending"]').click();
  const visibleRows = await page.locator(".order-list-card:not([hidden])").count();
  if (visibleRows !== 1) throw new Error(`Expected one pending order after filter, got ${visibleRows}`);
  const activeFilter = await page.locator('[data-filter="pending"]').getAttribute("aria-pressed");
  if (activeFilter !== "true") throw new Error(`Pending filter aria-pressed is ${activeFilter}`);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${pathToFileURL(resolve(laminaDir, "index.html")).href}?screen=hub-mobile`, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  const mobileMetrics = await page.evaluate(() => ({ width: innerWidth, height: innerHeight, scrollWidth: document.documentElement.scrollWidth }));
  if (mobileMetrics.width !== 390 || mobileMetrics.height !== 844 || mobileMetrics.scrollWidth !== 390) throw new Error(`Unexpected mobile validation viewport: ${JSON.stringify(mobileMetrics)}`);

  const comparisonPage = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
  await comparisonPage.setContent(`<!doctype html><html><head><style>body{margin:0;background:#102f51;color:white;font:600 18px Arial,sans-serif}main{display:grid;grid-template-columns:1fr 1fr;gap:24px;padding:24px}figure{margin:0;background:#fff;padding:12px;color:#102f51}img{display:block;width:100%;height:740px;object-fit:contain;background:#f4f7f9}figcaption{padding:12px 0 2px}</style></head><body><main><figure><img src="${await imageData(reference)}"><figcaption>Fuente visual: tienda / home-espejo</figcaption></figure><figure><img src="${await imageData(resolve(outputDir, "cuenta-hub-desktop-1920x1080.png"))}"><figcaption>Implementación: hub de Mi cuenta</figcaption></figure></main></body></html>`, { waitUntil: "load" });
  await comparisonPage.screenshot({ path: resolve(laminaDir, "design-qa-source-vs-hub.png"), fullPage: false });
  await comparisonPage.close();
  console.log(`filterRows=${visibleRows}, filterAria=${activeFilter}, mobileValidationViewport=${mobileMetrics.width}x${mobileMetrics.height}, consoleErrors=${errors.length}`);
  if (errors.length) throw new Error(errors.join("\n"));
} finally {
  await browser.close();
}
