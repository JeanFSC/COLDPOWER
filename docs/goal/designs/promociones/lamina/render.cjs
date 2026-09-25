/* eslint-disable @typescript-eslint/no-require-imports */
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { chromium } = require("playwright");

const root = path.resolve(__dirname, "..");
const source = pathToFileURL(path.join(__dirname, "promociones.html")).href;
const views = [
  { name: "desktop", width: 1920, height: 1080, output: "promociones-desktop-1920x1080.png" },
  { name: "form", width: 1920, height: 1080, output: "promociones-form-desktop-1920x1080.png" },
  { name: "mobile", width: 390, height: 844, output: "promociones-mobile-390x844.png" },
];

async function main() {
  const executablePath = process.env.PROMO_CHROMIUM_PATH;
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
      page.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push(message.text());
      });
      page.on("pageerror", (error) => pageErrors.push(error.message));
      await page.goto(`${source}?view=${view.name}`, { waitUntil: "load" });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(800);
      const metrics = await page.evaluate(() => ({
        viewport: [window.innerWidth, window.innerHeight],
        devicePixelRatio: window.devicePixelRatio,
        scrollWidth: document.documentElement.scrollWidth,
        scrollHeight: document.documentElement.scrollHeight,
        fontFamily: getComputedStyle(document.body).fontFamily,
        view: document.body.dataset.view,
      }));
      const output = path.join(root, view.output);
      await page.screenshot({ path: output, fullPage: false });
      reports.push({ ...view, output, metrics, consoleErrors, pageErrors });
      await context.close();
    }
  } finally {
    await browser.close();
  }
  process.stdout.write(`${JSON.stringify(reports, null, 2)}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
