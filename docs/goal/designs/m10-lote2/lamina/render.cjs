/* eslint-disable no-console */
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { chromium } = require("playwright");

const root = path.resolve(__dirname, "..");
const source = pathToFileURL(path.join(__dirname, "m10-lote2.html")).href;
const views = [
  { screen: "taxonomia", name: "taxonomia-desktop-1920x1080.png", width: 1920, height: 1080 },
  { screen: "taxonomia", name: "taxonomia-mobile-390x844.png", width: 390, height: 844 },
  { screen: "producto", name: "detalle-producto-desktop-1920x1080.png", width: 1920, height: 1080 },
  { screen: "producto", name: "detalle-producto-mobile-390x844.png", width: 390, height: 844 },
  { screen: "proveedor", name: "detalle-proveedor-desktop-1920x1080.png", width: 1920, height: 1080 },
  { screen: "proveedor", name: "detalle-proveedor-mobile-390x844.png", width: 390, height: 844 },
  { screen: "configuracion", name: "configuracion-desktop-1920x1080.png", width: 1920, height: 1080 },
  { screen: "configuracion", name: "configuracion-mobile-390x844.png", width: 390, height: 844 },
];

function readPngDimensions(filePath) {
  const header = fs.readFileSync(filePath).subarray(0, 24);
  const signature = "89504e470d0a1a0a";
  if (header.subarray(0, 8).toString("hex") !== signature) throw new Error(`PNG inválido: ${filePath}`);
  return { width: header.readUInt32BE(16), height: header.readUInt32BE(20) };
}

async function main() {
  const executablePath = process.env.M10_CHROMIUM_PATH;
  const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
  const reports = [];
  try {
    for (const view of views) {
      const context = await browser.newContext({
        viewport: { width: view.width, height: view.height },
        deviceScaleFactor: 1,
        locale: "es-PE",
        timezoneId: "America/Lima",
        colorScheme: "light",
      });
      const page = await context.newPage();
      const consoleErrors = [];
      const pageErrors = [];
      const failedRequests = [];
      page.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push(message.text());
      });
      page.on("pageerror", (error) => pageErrors.push(error.message));
      page.on("requestfailed", (request) => failedRequests.push(`${request.url()} · ${request.failure()?.errorText ?? "failed"}`));
      await page.goto(`${source}?screen=${view.screen}`, { waitUntil: "load" });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(350);
      const metrics = await page.evaluate(() => ({
        viewport: [window.innerWidth, window.innerHeight],
        devicePixelRatio: window.devicePixelRatio,
        scrollWidth: document.documentElement.scrollWidth,
        scrollHeight: document.documentElement.scrollHeight,
        screen: document.body.dataset.screen,
        ready: document.body.dataset.ready,
        visibleScreens: [...document.querySelectorAll(".screen")].filter((node) => getComputedStyle(node).display !== "none").length,
        bodyFont: getComputedStyle(document.body).fontFamily,
      }));
      const output = path.join(root, view.name);
      await page.screenshot({ path: output, fullPage: false });
      const pixels = readPngDimensions(output);
      if (pixels.width !== view.width || pixels.height !== view.height) {
        throw new Error(`${view.name}: PNG ${pixels.width}x${pixels.height}, esperado ${view.width}x${view.height}`);
      }
      reports.push({ ...view, output, pixels, metrics, consoleErrors, pageErrors, failedRequests });
      await context.close();
    }
  } finally {
    await browser.close();
  }
  console.log(JSON.stringify(reports, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
