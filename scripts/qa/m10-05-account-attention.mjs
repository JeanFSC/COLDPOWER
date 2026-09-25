import { execFileSync } from "node:child_process";
import { mkdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const base = new URL("http://localhost:3006");
const artifactRoot = path.resolve(process.cwd(), "docs/goal/evidencia/m10/mi-cuenta");
const GPU_ARGS = process.env.QA_GPU === "0" ? [] : ["--enable-gpu", "--use-angle=d3d11", "--ignore-gpu-blocklist"];
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
const viewports = [
  { name: "desktop", width: 1920, height: 1080 },
  { name: "mobile", width: 390, height: 844 },
];
const results = [];
const axeSource = await fetch("https://cdn.jsdelivr.net/npm/axe-core@4.10.2/axe.min.js").then((response) => {
  if (!response.ok) throw new Error(`axe download failed: ${response.status}`);
  return response.text();
});

for (const viewport of viewports) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
    locale: "es-PE",
    isMobile: viewport.width < 600,
    hasTouch: viewport.width < 600,
  });
  const page = await context.newPage();
  const consoleIssues = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleIssues.push({ type: "console:error", text: message.text() });
  });
  page.on("pageerror", (error) => consoleIssues.push({ type: "pageerror", text: error.message }));
  page.on("requestfailed", (request) => consoleIssues.push({ type: "requestfailed", text: `${request.method()} ${request.url()} :: ${request.failure()?.errorText || "unknown"}` }));
  const response = await page.goto(new URL("/cuenta", base).href, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => {});
  await page.waitForTimeout(1_000);
  await page.addScriptTag({ content: axeSource });
  const axe = await page.evaluate(() => window.axe.run(document, { resultTypes: ["violations"] }));
  const state = await page.evaluate(() => {
    const attentionCards = [...document.querySelectorAll(".account-attention-card")].map((node) => node.textContent?.trim() || "");
    const quoteNav = document.querySelector('a.account-nav-item[href="/cuenta/cotizaciones"]');
    const adminHeaderLinks = [...document.querySelectorAll(".account-header-action")];
    const adminMenuLinks = [...document.querySelectorAll(".account-sidebar-action")].filter((node) => node.textContent?.includes("Ir al panel administrativo"));
    return {
      attentionCards,
      quoteBadge: quoteNav?.textContent?.trim() || null,
      adminHeaderCount: adminHeaderLinks.length,
      adminMenuCount: adminMenuLinks.length,
      hasLegacyQuoteInAttention: attentionCards.some((text) => /COT-2026-019|COT-2026-040/.test(text)),
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    };
  });
  const screenshot = path.join(artifactRoot, `hub-revision-${viewport.width}x${viewport.height}.png`);
  await page.screenshot({ path: screenshot, fullPage: false });
  results.push({
    viewport,
    responseStatus: response?.status() ?? null,
    screenshot,
    state,
    axeViolations: axe.violations.length,
    consoleIssues,
  });
  await context.close();
}

await browser.close();
const report = { generatedAt: new Date().toISOString(), baseUrl: base.href, gpuArgs: GPU_ARGS, results };
writeFileSync(path.join(artifactRoot, "revalidation.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
