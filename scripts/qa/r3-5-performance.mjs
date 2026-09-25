import { capture, captureSql, saveBody, runScenario, visit } from "./b-helpers.mjs";

const phase = process.env.R3_PERF_PHASE === "after" ? "after" : "baseline";
const scenario = phase;
const routes = [
  ["home", "/"],
  ["catalogo", "/catalogo"],
  ["producto", "/producto/motocompresor-tecumseh-thg1346ygs-r134-220-v-1-6"],
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

await runScenario(scenario, async ({ page, events }) => {
  const catalogRow = captureSql(scenario, "catalog-fixture", "SELECT id,sku,slug,publication_status,status FROM products WHERE slug='motocompresor-tecumseh-thg1346ygs-r134-220-v-1-6'; SELECT COUNT(*) AS published_products FROM products WHERE publication_status='published' AND status='Activo';");
  assert(catalogRow.includes("motocompresor-tecumseh-thg1346ygs-r134-220-v-1-6"), "La ficha de producto real no existe en PostgreSQL local.");

  const routesResult = {};
  for (const [name, route] of routes) {
    await visit(page, route);
    await page.waitForTimeout(1600);
    await capture(scenario, `${name}-mobile-390`, page, { fullPage: false });
    await saveBody(scenario, `${name}-mobile-390`, page);
    routesResult[name] = await page.evaluate(() => {
      const navigation = performance.getEntriesByType("navigation")[0];
      return {
        title: document.title,
        lcpCandidate: document.querySelector("h1")?.textContent?.trim() ?? null,
        navigationMs: navigation ? Math.round(navigation.duration) : null,
        domContentLoadedMs: navigation ? Math.round(navigation.domContentLoadedEventEnd - navigation.startTime) : null,
        imageCount: document.images.length,
        clerkScriptPresentAtCapture: Boolean(document.querySelector('script[data-clerk-js-script]')),
        clerkResourceCountAtCapture: performance.getEntriesByType("resource").filter((entry) => entry.name.includes("clerk.browser.js")).length,
      };
    });
  }

  captureSql(scenario, "final", "SELECT id,sku,slug,publication_status,status FROM products WHERE slug='motocompresor-tecumseh-thg1346ygs-r134-220-v-1-6'; SELECT COUNT(*) AS published_products FROM products WHERE publication_status='published' AND status='Activo';");
  return { outcome: "COMPLETED", phase, viewport: "390x844", routes: routesResult, browserEvents: events };
});
