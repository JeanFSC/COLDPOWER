import { GPU_ARGS } from "./gpu-args.mjs";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

async function loadPlaywright() {
  const candidates = [
    process.env.QA_PLAYWRIGHT_MODULE,
    "playwright",
    path.resolve(process.cwd(), ".qa-runtime", "node_modules", "playwright", "index.mjs"),
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      const specifier = path.isAbsolute(candidate) ? pathToFileURL(candidate).href : candidate;
      return await import(specifier);
    } catch {
      // Try the next local resolution path. The scripts intentionally remain
      // independent from the application's package manifest.
    }
  }

  throw new Error("No se pudo resolver Playwright. Instala playwright en node_modules o en .qa-runtime.");
}

const playwright = await loadPlaywright();
export const { chromium } = playwright;

export const BASE_URL = process.env.QA_BASE_URL || "http://localhost:3003";
if (new URL(BASE_URL).host !== "localhost:3003" || new URL(BASE_URL).protocol !== "http:") {
  throw new Error(`QA_BASE_URL inválida: ${BASE_URL}. El recorrido exige http://localhost:3003.`);
}

export const ARTIFACT_ROOT = path.resolve(process.cwd(), process.env.QA_ARTIFACT_ROOT || "output/playwright/staff-r2");
const PSQL = "C:\\PostgreSQL\\18\\bin\\psql.exe";

function ensureDir(directory) {
  fs.mkdirSync(directory, { recursive: true });
  return directory;
}

export function scenarioDir(name) {
  return ensureDir(path.join(ARTIFACT_ROOT, name));
}

export function artifactPath(name, fileName) {
  return path.join(scenarioDir(name), fileName);
}

export function writeJson(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function writeText(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${value.endsWith("\n") ? value : `${value}\n`}`, "utf8");
}

export function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

export function readLocalDatabaseUrl() {
  const envPath = path.resolve(process.cwd(), ".env.localdb");
  const line = fs.readFileSync(envPath, "utf8").split(/\r?\n/).find((row) => row.startsWith("DATABASE_URL="));
  if (!line) throw new Error(".env.localdb no contiene DATABASE_URL.");
  const databaseUrl = line.slice("DATABASE_URL=".length).trim();
  const parsed = new URL(databaseUrl);
  if (parsed.hostname !== "127.0.0.1" || parsed.port !== "5433" || /neon/i.test(databaseUrl)) {
    throw new Error(`La verificación QA exige PostgreSQL local 127.0.0.1:5433; se encontró ${parsed.hostname}:${parsed.port}.`);
  }
  return databaseUrl;
}

export function runSql(query) {
  const databaseUrl = readLocalDatabaseUrl();
  const parsed = new URL(databaseUrl);
  const password = decodeURIComponent(parsed.password);
  const result = spawnSync(PSQL, ["-X", "-A", "-t", "-F", "\t", "-P", "pager=off", "-h", "127.0.0.1", "-p", "5433", "-U", "coldpower", "-d", "coldpower", "-c", query], {
    cwd: process.cwd(),
    encoding: "utf8",
    windowsHide: true,
    env: { ...process.env, PGPASSWORD: password },
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`psql falló (${result.status}): ${result.stderr || result.stdout}`);
  return result.stdout.trim();
}

export function captureSql(scenario, label, query) {
  const output = runSql(query);
  writeText(artifactPath(scenario, `sql-${label}.tsv`), `-- ${query}\n${output}`);
  return output;
}

export async function createQaBrowser(scenario) {
  const browser = await chromium.launch({ headless: true, args: GPU_ARGS });
  const contextOptions = {
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    locale: "es-PE",
    timezoneId: "America/Lima",
  };
  if (process.env.QA_STORAGE_STATE) contextOptions.storageState = path.resolve(process.cwd(), process.env.QA_STORAGE_STATE);
  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();
  const events = { consoleErrors: [], pageErrors: [], requestFailures: [] };
  page.on("console", (message) => {
    if (message.type() === "error") events.consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => events.pageErrors.push(String(error)));
  page.on("requestfailed", (request) => events.requestFailures.push(`${request.method()} ${request.url()} :: ${request.failure()?.errorText || "unknown"}`));
  return { browser, context, page, events, scenario };
}

export async function closeQaBrowser(session) {
  const eventsPath = artifactPath(session.scenario, "browser-events.json");
  writeJson(eventsPath, session.events);
  await session.context.close();
  await session.browser.close();
}

export async function visit(page, route, { screenshot, scenario } = {}) {
  const url = new URL(route, BASE_URL);
  if (url.host !== "localhost:3003") throw new Error(`Navegación fuera del host permitido: ${url.href}`);
  const response = await page.goto(url.href, { waitUntil: "domcontentloaded", timeout: 45_000 });
  await page.waitForSelector("body", { timeout: 15_000 });
  await page.waitForTimeout(900);
  if (screenshot && scenario) await capture(scenario, screenshot, page);
  return response;
}

export async function capture(scenario, label, page, options = {}) {
  const filePath = artifactPath(scenario, `${label}.png`);
  await page.screenshot({ path: filePath, fullPage: options.fullPage ?? true });
  return filePath;
}

export async function saveBody(scenario, label, page) {
  const filePath = artifactPath(scenario, `${label}.txt`);
  writeText(filePath, await page.locator("body").innerText());
  return filePath;
}

export async function waitForText(page, text, timeout = 15_000) {
  await page.getByText(text, { exact: false }).first().waitFor({ state: "visible", timeout });
}

export async function fillLabel(page, label, value, options = {}) {
  const locator = page.getByLabel(label, { exact: options.exact ?? true }).first();
  await locator.waitFor({ state: "visible", timeout: options.timeout ?? 15_000 });
  await locator.fill(String(value));
  return locator;
}

export async function fillPlaceholder(page, placeholder, value, options = {}) {
  const locator = page.getByPlaceholder(placeholder, { exact: options.exact ?? true }).first();
  await locator.waitFor({ state: "visible", timeout: options.timeout ?? 15_000 });
  await locator.fill(String(value));
  return locator;
}

export async function clickButton(page, name, options = {}) {
  const locator = page.getByRole("button", { name, exact: options.exact ?? true }).first();
  await locator.waitFor({ state: "visible", timeout: options.timeout ?? 15_000 });
  await locator.click({ timeout: options.timeout ?? 15_000 });
  return locator;
}

export async function clickLink(page, name, options = {}) {
  const locator = page.getByRole("link", { name, exact: options.exact ?? true }).first();
  await locator.waitFor({ state: "visible", timeout: options.timeout ?? 15_000 });
  await locator.click({ timeout: options.timeout ?? 15_000 });
  return locator;
}

export async function chooseSelect(page, label, valueOrLabel, options = {}) {
  const locator = page.getByLabel(label, { exact: options.exact ?? true }).first();
  await locator.waitFor({ state: "visible", timeout: options.timeout ?? 15_000 });
  await locator.selectOption(valueOrLabel);
  return locator;
}

export async function chooseAdminSelect(page, label, optionName, options = {}) {
  const control = page.getByRole("combobox", { name: label, exact: options.exact ?? true }).first();
  await control.waitFor({ state: "visible", timeout: options.timeout ?? 15_000 });
  await control.click();
  const option = page.getByRole("option", { name: optionName, exact: options.optionExact ?? true }).first();
  await option.waitFor({ state: "visible", timeout: options.timeout ?? 15_000 });
  await option.click();
  return option;
}

export async function probeApi(page, route, init = {}) {
  const url = new URL(route, BASE_URL);
  if (url.host !== "localhost:3003") throw new Error(`API probe fuera del host permitido: ${url.href}`);
  const response = await page.request.fetch(url.href, init);
  const body = await response.text();
  return { status: response.status(), headers: response.headers(), body };
}

export function resultRecord(scenario, data) {
  const filePath = artifactPath(scenario, "result.json");
  writeJson(filePath, { scenario, generatedAt: new Date().toISOString(), baseUrl: BASE_URL, ...data });
  return filePath;
}

export function compactError(error) {
  return error instanceof Error ? error.message : String(error);
}

export async function runScenario(scenario, fn) {
  const session = await createQaBrowser(scenario);
  let result;
  try {
    result = await fn(session);
  } catch (error) {
    result = { outcome: "ERROR", error: compactError(error) };
  } finally {
    await closeQaBrowser(session);
  }
  resultRecord(scenario, result || { outcome: "ERROR", error: "Sin resultado" });
  console.log(JSON.stringify({ scenario, ...result }, null, 2));
  if (result?.outcome === "ERROR") process.exitCode = 1;
}

export function uniqueEmail(prefix) {
  return `${prefix}.${Date.now()}@example.test`;
}

export function uniqueToken(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}
