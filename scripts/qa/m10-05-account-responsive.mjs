import { execFileSync } from "node:child_process";
import { mkdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const base = new URL("http://localhost:3006");
const artifactRoot = path.resolve(process.cwd(), "docs/goal/evidencia/m10/mi-cuenta");
const GPU_ARGS = process.env.QA_GPU === "0" ? [] : ["--enable-gpu", "--use-angle=d3d11", "--ignore-gpu-blocklist"];
const state = process.env.QA_STATE || "data";
const viewports = [360, 390, 430].map((width) => ({ width, height: 844 }));
const routes = [
  { name: "hub-data", path: "/cuenta" },
  { name: "pedidos", path: "/cuenta/pedidos" },
  { name: "cotizaciones", path: "/cuenta/cotizaciones" },
  { name: "pagos", path: "/cuenta/pagos" },
  { name: "historial", path: "/cuenta/historial" },
];
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
  try { return Boolean(statSync(candidate)); } catch { return false; }
});
if (!playwrightPath) throw new Error("No se encontró playwright-core.");

const { chromium } = await import(pathToFileURL(playwrightPath).href);
const executablePath = process.env.QA_CHROMIUM_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const browser = await chromium.launch({ headless: true, executablePath, args: GPU_ARGS });
const results = [];

for (const viewport of viewports) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1, locale: "es-PE", isMobile: true, hasTouch: true });
  for (const route of routes) {
    const page = await context.newPage();
    const consoleIssues = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleIssues.push({ type: "console:error", text: message.text() });
    });
    page.on("pageerror", (error) => consoleIssues.push({ type: "pageerror", text: error.message }));
    page.on("requestfailed", (request) => consoleIssues.push({ type: "requestfailed", text: `${request.method()} ${request.url()} :: ${request.failure()?.errorText || "unknown"}` }));
    const response = await page.goto(new URL(route.path, base).href, { waitUntil: "domcontentloaded", timeout: 90_000 });
    await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => {});
    await page.waitForTimeout(350);
    const metrics = await page.evaluate(() => {
      const viewportWidth = window.innerWidth;
      const overflowers = [...document.querySelectorAll("*")]
        .map((element) => {
          const rect = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          return {
            tag: element.tagName.toLowerCase(),
            id: element.id,
            className: typeof element.className === "string" ? element.className.slice(0, 180) : "",
            scrollWidth: element.scrollWidth,
            clientWidth: element.clientWidth,
            rectLeft: Math.round(rect.left * 10) / 10,
            rectRight: Math.round(rect.right * 10) / 10,
            overflowX: style.overflowX,
          };
        })
        .filter((element) => element.scrollWidth > element.clientWidth + 1 || element.rectRight > viewportWidth + 1 || element.rectLeft < -1)
        .sort((left, right) => (right.scrollWidth - right.clientWidth) - (left.scrollWidth - left.clientWidth))
        .slice(0, 12);
      return {
        documentScrollWidth: document.documentElement.scrollWidth,
        documentClientWidth: document.documentElement.clientWidth,
        bodyScrollWidth: document.body.scrollWidth,
        bodyClientWidth: document.body.clientWidth,
        overflowers,
      };
    });
    if (route.path === "/cuenta") {
      await page.screenshot({ path: path.join(artifactRoot, `hub-responsive-${state}-${viewport.width}.png`), fullPage: false });
    }
    results.push({ state, viewport, route, responseStatus: response?.status() ?? null, metrics, consoleIssues });
    await page.close();
  }
  await context.close();
}

await browser.close();
const report = { generatedAt: new Date().toISOString(), state, baseUrl: base.href, gpuArgs: GPU_ARGS, viewports, routes, results };
writeFileSync(path.join(artifactRoot, `responsive-overflow-${state}.json`), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
