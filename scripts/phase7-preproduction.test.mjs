import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();

function read(relativePath) {
  return readFileSync(join(root, relativePath), "utf8");
}

for (const file of [
  ".env.example",
  "src/lib/env.ts",
  "src/app/robots.ts",
  "src/app/sitemap.ts",
  "docs/deployment.md",
  "docs/production-checklist.md",
]) {
  assert.equal(existsSync(join(root, file)), true, `${file} should exist`);
}

const envExample = read(".env.example");
for (const variable of [
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_COMPANY_NAME",
  "NEXT_PUBLIC_WHATSAPP_NUMBER",
  "NEXT_PUBLIC_CONTACT_EMAIL",
  "NEXT_PUBLIC_CONTACT_PHONE",
  "NEXT_PUBLIC_RUC",
  "QUOTE_RATE_LIMIT_MAX",
  "QUOTE_RATE_LIMIT_WINDOW_MS",
  "QUOTE_ENABLE_API_LOG",
]) {
  assert.match(
    envExample,
    new RegExp(`^${variable}=`, "m"),
    `.env.example should include ${variable}`,
  );
}

const envLib = read("src/lib/env.ts");
assert.match(envLib, /siteUrl/, "env config should expose siteUrl");
assert.match(envLib, /quoteRateLimit/, "env config should expose quote rate limit");
assert.match(envLib, /parseBoolean/, "env config should parse booleans safely");

const quoteLib = read("src/lib/quote.ts");
for (const symbol of [
  "sanitizeText",
  "normalizePhone",
  "maxLengths",
  "checkQuoteRateLimit",
  "resetQuoteRateLimitForTests",
]) {
  assert.match(quoteLib, new RegExp(symbol), `quote lib should include ${symbol}`);
}

const apiRoute = read("src/app/api/cotizacion/route.ts");
assert.match(apiRoute, /checkQuoteRateLimit/, "API should enforce rate limiting");
assert.match(apiRoute, /413/, "API should limit payload size");
assert.match(apiRoute, /export async function GET/, "API should handle GET explicitly");
assert.match(apiRoute, /429/, "API should return 429 for rate limit");
assert.doesNotMatch(
  apiRoute,
  /console\.log\(.*validation\.data/s,
  "API should not log personal quote data",
);

const nextConfig = read("next.config.ts");
for (const header of [
  "X-Content-Type-Options",
  "Referrer-Policy",
  "X-Frame-Options",
  "Permissions-Policy",
]) {
  assert.match(nextConfig, new RegExp(header), `next.config.ts should include ${header}`);
}

const robots = read("src/app/robots.ts");
const sitemap = read("src/app/sitemap.ts");
assert.match(robots, /sitemap/, "robots should expose sitemap");
assert.match(sitemap, /products/, "sitemap should include product routes");
assert.match(sitemap, /categories/, "sitemap should include category routes");

const routeModule = await import(
  pathToFileURL(join(root, ".next/server/app/api/cotizacion/route.js")).href
).catch(() => null);

if (routeModule?.POST) {
  const validRequest = new Request("http://localhost/api/cotizacion", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": "phase7-valid",
    },
    body: JSON.stringify({
      name: "Juan Perez",
      phone: "+51 999 888 777",
      email: "juan@example.com",
      productName: "Compresor Danfoss NL11FT 1/4 HP",
      sku: "CP-COM-DAN-NL11FT",
      message: "Necesito confirmar disponibilidad y compatibilidad.",
    }),
  });
  const validResponse = await routeModule.POST(validRequest);
  assert.equal(validResponse.status, 201, "API should accept valid payload");

  const invalidRequest = new Request("http://localhost/api/cotizacion", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": "phase7-invalid",
    },
    body: JSON.stringify({ name: "", phone: "", email: "bad", message: "short" }),
  });
  const invalidResponse = await routeModule.POST(invalidRequest);
  assert.equal(invalidResponse.status, 400, "API should reject invalid payload");
}

const sourceFiles = [
  "src/app/page.tsx",
  "src/components/home/Hero.tsx",
  "src/components/home/PromoBanner.tsx",
  "src/components/layout/MobileMenu.tsx",
  "src/components/shared/WhatsAppCTA.tsx",
  "src/components/catalog/ProductCard.tsx",
  "src/components/product/ProductDetail.tsx",
  "src/components/quote/QuoteForm.tsx",
  "src/app/contacto/page.tsx",
  "src/app/nosotros/page.tsx",
  "src/app/not-found.tsx",
];

for (const file of sourceFiles) {
  assert.doesNotMatch(read(file), /51900000000/, `${file} should not hardcode old WhatsApp number`);
}
